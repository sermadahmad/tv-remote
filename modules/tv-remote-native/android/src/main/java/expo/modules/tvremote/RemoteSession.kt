package expo.modules.tvremote

import org.json.JSONObject
import remote.Remotemessage
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.CompletableFuture
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import javax.net.ssl.SSLSocket

internal class RemoteSession(val id: String, val deviceId: String, private val socket: SSLSocket, private val emit: (Map<String, Any>) -> Unit, private val debug: Boolean = false) {
  private val active = AtomicBoolean(true)
  private val output = socket.outputStream
  private val activity = SessionActivity()
  private val input = ActivityInputStream(socket.inputStream, activity)
  private val writer = ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, ArrayBlockingQueue(32))
  private val held = mutableSetOf<String>()
  private val enqueueLock = Any()
  @Volatile var features = 0
    private set
  @Volatile private var started = false
  private val ready = CompletableFuture<Unit>()

  fun capabilities(): Map<String, Any> {
    val keys = keyCodes.mapValues { (key, _) ->
      when {
        features and 2 == 0 -> "unsupported"
        key in listOf("volumeUp", "volumeDown", "mute") && features and 64 == 0 -> "unverified"
        key == "power" && features and 32 == 0 -> "unverified"
        else -> "supported"
      }
    }
    // IME remains gated until Unicode/index and focus behavior are validated on hardware.
    return mapOf("keys" to keys, "text" to "unverified", "longPress" to if (features and 2 != 0) "supported" else "unsupported")
  }
  fun payload(): Map<String, Any> = mapOf("sessionId" to id, "deviceId" to deviceId, "capabilities" to capabilities())

  fun start() {
    socket.soTimeout = 1000
    Thread({
      try {
        while (active.get()) {
          val message = Remotemessage.RemoteMessage.parseFrom(Framing.read(input))
          activity.record()
          val response = Remotemessage.RemoteMessage.newBuilder()
          when {
            message.hasRemoteConfigure() -> {
              features = message.remoteConfigure.code1 and (1 or 2 or 32 or 64)
              response.remoteConfigure = Remotemessage.RemoteConfigure.newBuilder().setCode1(features).setDeviceInfo(
                Remotemessage.RemoteDeviceInfo.newBuilder().setUnknown1(1).setUnknown2("1").setPackageName("atvremote").setAppVersion("0.1.0")
              ).build()
            }
            message.hasRemoteSetActive() -> response.remoteSetActive = Remotemessage.RemoteSetActive.newBuilder().setActive(features).build()
            message.hasRemotePingRequest() -> {
              if (debug) android.util.Log.d("TVRemoteNative", "Control ping received")
              response.remotePingResponse = Remotemessage.RemotePingResponse.newBuilder().setVal1(message.remotePingRequest.val1).build()
            }
            message.hasRemoteStart() -> { started = true; ready.complete(Unit); if (debug) android.util.Log.d("TVRemoteNative", "Control started") }
            message.hasRemoteSetVolumeLevel() -> {
              val volume = message.remoteSetVolumeLevel
              if (volume.volumeMax > 0) emit(mapOf("type" to "volume", "sessionId" to id, "level" to volume.volumeLevel, "max" to volume.volumeMax, "muted" to volume.volumeMuted))
            }
            message.hasRemoteError() -> throw TVFailure("protocolFailure")
          }
          if (response.build().serializedSize > 0) write(response.build())
        }
      } catch (error: Exception) {
        if (debug && active.get()) android.util.Log.d("TVRemoteNative", "Control reader stopped: ${error.javaClass.simpleName}; idleMs=${activity.idleMillis()}")
        ready.completeExceptionally(TVFailure("connectionLost"))
        if (active.get()) { close(); emit(mapOf("type" to "disconnected", "sessionId" to id)) }
      }
    }, "tv-remote-reader").start()
    try { ready.get(10, TimeUnit.SECONDS) } catch (_: Exception) { close(); throw TVFailure("connectionTimeout") }
  }
  @Synchronized private fun write(message: Remotemessage.RemoteMessage) { Framing.write(output, message); activity.record() }

  fun send(command: String) {
    val data = JSONObject(command)
    if (data.optString("type") != "key") throw TVFailure("unsupportedCommand")
    val key = data.optString("key")
    val code = keyCodes[key] ?: throw TVFailure("unsupportedCommand")
    if (features and 2 == 0 || !started) throw TVFailure("unsupportedCommand")
    val action = data.optString("action")
    val direction = when (action) {
      "tap" -> Remotemessage.RemoteDirection.SHORT
      "press" -> Remotemessage.RemoteDirection.START_LONG
      "release" -> Remotemessage.RemoteDirection.END_LONG
      else -> throw TVFailure("unsupportedCommand")
    }
    if (!active.get()) throw TVFailure("connectionLost")
    val submitted = android.os.SystemClock.elapsedRealtime()
    val result = CompletableFuture<Unit>()
    try {
      synchronized(enqueueLock) {
        // Check and enqueue atomically so concurrent calls preserve release capacity.
        if (writer.queue.size >= 28 && action != "release") throw TVFailure("queueFull")
        writer.execute {
          try {
            if (!active.get()) throw TVFailure("connectionLost")
            if (action != "release" && android.os.SystemClock.elapsedRealtime() - submitted > 250) throw TVFailure("commandTimeout")
            if (action == "press" && key in held) throw TVFailure("unsupportedCommand")
            if (action == "release" && key !in held) { result.complete(Unit); return@execute }
            write(Remotemessage.RemoteMessage.newBuilder().setRemoteKeyInject(Remotemessage.RemoteKeyInject.newBuilder().setKeyCodeValue(code).setDirection(direction)).build())
            if (action == "press") held.add(key)
            if (action == "release") held.remove(key)
            result.complete(Unit)
          } catch (error: Exception) { result.completeExceptionally(error) }
        }
      }
    } catch (_: RejectedExecutionException) { throw TVFailure("queueFull") }
    try { result.get(1, TimeUnit.SECONDS) }
    catch (error: java.util.concurrent.ExecutionException) { throw error.cause ?: TVFailure("protocolFailure") }
    catch (_: java.util.concurrent.TimeoutException) { close(); throw TVFailure("commandTimeout") }
  }
  fun releaseKeys() {
    if (!active.get()) return
    val result = CompletableFuture<Unit>()
    try {
      // A writer barrier includes presses queued before this call. Only the writer owns held.
      writer.execute {
        try {
          if (active.get()) {
            for (key in held.toList()) {
              write(Remotemessage.RemoteMessage.newBuilder().setRemoteKeyInject(
                Remotemessage.RemoteKeyInject.newBuilder().setKeyCodeValue(keyCodes.getValue(key))
                  .setDirection(Remotemessage.RemoteDirection.END_LONG)).build())
              held.remove(key)
            }
          }
          result.complete(Unit)
        } catch (error: Exception) { result.completeExceptionally(error) }
      }
      result.get(1, TimeUnit.SECONDS)
    } catch (error: Exception) {
      close()
      if (error is java.util.concurrent.ExecutionException) throw error.cause ?: TVFailure("connectionLost")
      throw TVFailure("connectionLost")
    }
  }
  fun close() { if (active.compareAndSet(true, false)) { writer.shutdownNow(); ResourceCleanup.run { try { socket.close() } catch (_: java.io.IOException) {} } } }
  companion object {
    val keyCodes = mapOf("up" to 19, "down" to 20, "left" to 21, "right" to 22, "select" to 23, "back" to 4, "home" to 3,
      "volumeUp" to 24, "volumeDown" to 25, "mute" to 164, "power" to 26, "playPause" to 85, "play" to 126,
      "pause" to 127, "next" to 87, "previous" to 88, "fastForward" to 90, "rewind" to 89)
  }
}
