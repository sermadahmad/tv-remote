package expo.modules.tvremote

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.Promise
import expo.modules.interfaces.permissions.PermissionsStatus

class TargetRecord : Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var host: String = ""
  @Field var port: Int = 6466
  @Field var pairingPort: Int = 6467
  @Field var serviceName: String = ""
  internal fun target(): Target {
    if (id.isEmpty() || host.isEmpty() || port !in 1..65535 || pairingPort !in 1..65535) throw TVFailure("protocolFailure")
    return Target(id, name.take(120), host, port, pairingPort, serviceName)
  }
}

class TVRemoteNativeModule : Module() {
  @Volatile private var client: TVClient? = null
  private var foreground = true
  @Synchronized private fun client(): TVClient = client ?: TVClient(appContext.reactContext ?: throw CodedException("nativeUnavailable", "Native context is unavailable", null)) { sendEvent("onTVEvent", it) }.also { if (!foreground) it.close(); client = it }
  @Synchronized private fun setForeground(active: Boolean) { foreground = active; if (active) client?.resume() else client?.close() }
  private fun <T> safely(block: () -> T): T {
    try { return block() }
    catch (error: Exception) {
      val kind = when (error) {
        is TVFailure -> error.kind
        is java.net.SocketTimeoutException -> "connectionTimeout"
        is javax.net.ssl.SSLException -> if (error.cause is TVFailure) (error.cause as TVFailure).kind else "authenticationFailed"
        is java.io.IOException -> "connectionLost"
        else -> "protocolFailure"
      }
      // Do not expose underlying exception strings: they can include sensitive protocol input.
      throw CodedException(kind, kind, null)
    }
  }
  override fun definition() = ModuleDefinition {
    Name("TVRemoteNative")
    Events("onTVEvent")
    AsyncFunction("ensureLocalNetworkPermission") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null) promise.reject("nativeUnavailable", "nativeUnavailable", null)
      else if (android.os.Build.VERSION.SDK_INT < 37 || context.applicationInfo.targetSdkVersion < 37) promise.resolve(null)
      else {
        val permissions = appContext.permissions
        if (permissions == null) promise.reject("permissionDenied", "permissionDenied", null)
        else permissions.askForPermissions({ result ->
          if (result["android.permission.ACCESS_LOCAL_NETWORK"]?.status == PermissionsStatus.GRANTED) promise.resolve(null)
          else promise.reject("permissionDenied", "permissionDenied", null)
        }, "android.permission.ACCESS_LOCAL_NETWORK")
      }
    }
    AsyncFunction("startDiscovery") { _: String -> safely { client().startDiscovery() } }
    AsyncFunction("stopDiscovery") { safely { client().discovery.stop() } }
    AsyncFunction("beginPairing") { id: String, target: TargetRecord -> safely { client().beginPairing(id, target.target()) } }
    AsyncFunction("submitPairingCode") { id: String, code: String -> safely { client().submitPairingCode(id, code) } }
    AsyncFunction("cancelPairing") { id: String -> safely { client().cancelPairing(id) } }
    AsyncFunction("connect") { id: String, target: TargetRecord, reference: String -> safely { client().connect(id, target.target(), reference) } }
    AsyncFunction("cancelOperation") { id: String -> safely { client().cancelOperation(id) } }
    AsyncFunction("send") { id: String, _: String, command: String -> safely { client().send(id, command) } }
    AsyncFunction("releaseKeys") { id: String -> safely { client().releaseKeys(id) } }
    AsyncFunction("disconnect") { id: String -> safely { client().disconnect(id) } }
    AsyncFunction("forgetCredentials") { id: String -> safely { client().forget(id) } }
    OnActivityEntersForeground { setForeground(true) }
    OnActivityEntersBackground { setForeground(false) }
    OnDestroy { setForeground(false); client?.destroy(); client = null }
  }
}
