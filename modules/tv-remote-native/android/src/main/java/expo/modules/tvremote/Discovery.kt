package expo.modules.tvremote

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

internal data class Target(val id: String, val name: String, val host: String, val port: Int, val pairingPort: Int, val serviceName: String) {
  fun payload(): Map<String, Any> = mapOf("id" to id, "name" to name, "host" to host, "port" to port, "pairingPort" to pairingPort, "serviceName" to serviceName, "protocol" to "android-tv-v2")
}

internal class Discovery(private val context: Context, private val emit: (Map<String, Any>) -> Unit) {
  private val manager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
  private val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
  private val resolver = Executors.newSingleThreadExecutor()
  private val generation = AtomicInteger(0)
  private var listener: NsdManager.DiscoveryListener? = null

  fun wifi(): Network = connectivity.allNetworks.firstOrNull {
    connectivity.getNetworkCapabilities(it)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
  } ?: throw TVFailure("networkUnavailable")

  @Synchronized fun start() {
    wifi()
    if (context.applicationInfo.targetSdkVersion >= 37 && android.os.Build.VERSION.SDK_INT >= 37 && context.checkSelfPermission("android.permission.ACCESS_LOCAL_NETWORK") != android.content.pm.PackageManager.PERMISSION_GRANTED) throw TVFailure("permissionDenied")
    stop()
    val current = generation.incrementAndGet()
    val next = object : NsdManager.DiscoveryListener {
      override fun onDiscoveryStarted(type: String) { if (current == generation.get()) emit(mapOf("type" to "discoveryReady")) }
      override fun onDiscoveryStopped(type: String) {}
      override fun onStartDiscoveryFailed(type: String, code: Int) { if (current == generation.get()) emit(mapOf("type" to "error", "error" to mapOf("code" to "protocolFailure"))) }
      override fun onStopDiscoveryFailed(type: String, code: Int) {}
      override fun onServiceFound(service: NsdServiceInfo) {
        if (!service.serviceType.startsWith("_androidtvremote2._tcp")) return
        resolver.execute {
          try {
            val resolved = resolve(service)
            if (current == generation.get()) emit(mapOf("type" to "deviceFound", "target" to resolved.payload()))
          } catch (_: Exception) { /* Other advertisements can remain available after one resolution fails. */ }
        }
      }
      override fun onServiceLost(service: NsdServiceInfo) {
        if (current == generation.get()) emit(mapOf("type" to "deviceLost", "deviceId" to "dns:${service.serviceName}"))
      }
    }
    listener = next
    manager.discoverServices("_androidtvremote2._tcp.", NsdManager.PROTOCOL_DNS_SD, next)
  }

  @Suppress("DEPRECATION")
  private fun resolve(service: NsdServiceInfo): Target {
    val latch = CountDownLatch(1)
    var result: Target? = null
    manager.resolveService(service, object : NsdManager.ResolveListener {
      override fun onResolveFailed(info: NsdServiceInfo, code: Int) { latch.countDown() }
      override fun onServiceResolved(info: NsdServiceInfo) {
        val host = info.host?.hostAddress
        if (host != null && info.port in 1..65535) result = Target("dns:${info.serviceName}", info.serviceName.take(120), host, info.port, 6467, info.serviceName)
        latch.countDown()
      }
    })
    if (!latch.await(5, TimeUnit.SECONDS)) throw TVFailure("notFound")
    return result ?: throw TVFailure("notFound")
  }

  fun refresh(target: Target): Target {
    if (target.serviceName.isEmpty()) return target
    return resolve(NsdServiceInfo().apply { serviceName = target.serviceName; serviceType = "_androidtvremote2._tcp." }).copy(id = target.id, name = target.name)
  }

  @Synchronized fun stop() {
    generation.incrementAndGet()
    val previous = listener
    listener = null
    if (previous != null) try { manager.stopServiceDiscovery(previous) } catch (_: IllegalArgumentException) { /* Already stopped by the OS. */ }
  }
  fun destroy() { stop(); resolver.shutdownNow() }
}
