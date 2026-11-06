package expo.modules.tvremote

import android.content.Context
import com.google.polo.wire.protobuf.PoloProto
import com.google.protobuf.ByteString
import java.net.Socket
import java.security.cert.X509Certificate
import java.security.interfaces.RSAPublicKey
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import javax.net.ssl.SSLSocket

internal data class Pairing(val id: String, val target: Target, val identity: Identity, val socket: SSLSocket, val expiresAt: Long)

internal class TVClient(context: Context, emit: (Map<String, Any>) -> Unit) {
  private val debug = context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0
  private fun trace(stage: String) { if (debug) android.util.Log.d("TVRemoteNative", "Pairing stage: $stage") }
  val discovery = Discovery(context, emit)
  private val credentials = Credentials(context)
  private val events = emit
  private val sockets = ConcurrentHashMap<String, Socket>()
  private val cancelled = ConcurrentHashMap.newKeySet<String>()
  private val generation = java.util.concurrent.atomic.AtomicLong()
  @Volatile private var foreground = true
  private val pairing = java.util.concurrent.atomic.AtomicReference<Pairing?>()
  private val session = java.util.concurrent.atomic.AtomicReference<RemoteSession?>()
  fun startDiscovery() {
    if (!foreground) throw TVFailure("cancelled")
    discovery.start()
    if (!foreground) discovery.stop()
  }

  private fun register(operationId: String, socket: Socket, expected: Long) {
    sockets[operationId] = socket
    if (!foreground || generation.get() != expected || cancelled.contains(operationId)) { sockets.remove(operationId); socket.close(); throw TVFailure("cancelled") }
  }
  @Synchronized fun beginPairing(operationId: String, original: Target): Map<String, Any> {
    if (!foreground) throw TVFailure("cancelled")
    val epoch = generation.incrementAndGet()
    cancelPairing(pairing.get()?.id ?: "")
    session.getAndSet(null)?.close()
    val identity = credentials.create()
    try {
      trace("resolve")
      val target = discovery.refresh(original)
      trace("TLS handshake")
      val socket = Transport.open(discovery.wifi(), target.host, target.pairingPort, identity, null) { register(operationId, it, epoch) }
      val input = socket.inputStream
      val output = socket.outputStream
      fun exchange(message: PoloProto.OuterMessage): PoloProto.OuterMessage {
        Framing.write(output, message)
        val response = PoloProto.OuterMessage.parseFrom(Framing.read(input))
        if (response.status != PoloProto.OuterMessage.Status.STATUS_OK) throw TVFailure("pairingRejected")
        return response
      }
      trace("request")
      var response = exchange(pairingMessage().setPairingRequest(PoloProto.PairingRequest.newBuilder().setServiceName("atvremote").setClientName("Universal TV Remote")).build())
      if (!response.hasPairingRequestAck()) throw TVFailure("protocolFailure")
      val encoding = PoloProto.Options.Encoding.newBuilder().setType(PoloProto.Options.Encoding.EncodingType.ENCODING_TYPE_HEXADECIMAL).setSymbolLength(6).build()
      trace("options")
      response = exchange(pairingMessage().setOptions(PoloProto.Options.newBuilder().setPreferredRole(PoloProto.Options.RoleType.ROLE_TYPE_INPUT).addInputEncodings(encoding)).build())
      if (!response.hasOptions()) throw TVFailure("protocolFailure")
      trace("configuration")
      response = exchange(pairingMessage().setConfiguration(PoloProto.Configuration.newBuilder().setClientRole(PoloProto.Options.RoleType.ROLE_TYPE_INPUT).setEncoding(encoding)).build())
      if (!response.hasConfigurationAck()) throw TVFailure("protocolFailure")
      val expires = System.currentTimeMillis() + 120000
      if (!foreground || generation.get() != epoch || cancelled.contains(operationId)) throw TVFailure("cancelled")
      val pending = Pairing(operationId, target, identity, socket, expires)
      pairing.set(pending)
      if (!foreground || generation.get() != epoch || cancelled.contains(operationId)) {
        pairing.compareAndSet(pending, null)
        throw TVFailure("cancelled")
      }
      trace("awaiting displayed code")
      return mapOf("pairingId" to operationId, "encoding" to "hex", "length" to 6, "expiresAt" to expires.toDouble())
    } catch (error: Exception) {
      if (debug) android.util.Log.w("TVRemoteNative", "Pairing failed: " + generateSequence(error as Throwable?) { it.cause }.take(5).joinToString(" -> ") { it.javaClass.simpleName })
      sockets.remove(operationId)?.close(); credentials.discard(identity.reference); throw error
    }
  }
  @Synchronized fun submitPairingCode(id: String, code: String): Map<String, String> {
    val current = pairing.get()?.takeIf { it.id == id } ?: throw TVFailure("pairingTimeout")
    if (System.currentTimeMillis() > current.expiresAt) { cancelPairing(id); throw TVFailure("pairingTimeout") }
    val certificate = current.socket.session.peerCertificates.first() as? X509Certificate ?: throw TVFailure("authenticationFailed")
    val clientKey = current.identity.certificate.publicKey as? RSAPublicKey ?: throw TVFailure("authenticationFailed")
    val serverKey = certificate.publicKey as? RSAPublicKey ?: throw TVFailure("authenticationFailed")
    val secret = PairingSecret.compute(clientKey, serverKey, code)
    try {
      Framing.write(current.socket.outputStream, pairingMessage().setSecret(PoloProto.Secret.newBuilder().setSecret(ByteString.copyFrom(secret))).build())
      val response = PoloProto.OuterMessage.parseFrom(Framing.read(current.socket.inputStream))
      if (response.status != PoloProto.OuterMessage.Status.STATUS_OK || !response.hasSecretAck()) throw TVFailure("pairingRejected")
      val pin = Credentials.pin(certificate)
      val deviceId = "androidtv:" + pin.replace('+', '-').replace('/', '_').trimEnd('=')
      if (!foreground || cancelled.contains(id) || pairing.get()?.id != id) throw TVFailure("cancelled")
      credentials.commit(deviceId, current.identity, pin)
      current.socket.close(); sockets.remove(id); pairing.compareAndSet(current, null)
      return mapOf("credentialRef" to current.identity.reference, "deviceId" to deviceId)
    } catch (error: Exception) { cancelPairing(id); throw error }
    finally { secret.fill(0) }
  }
  fun cancelPairing(id: String) {
    // Interrupt a blocking pairing read before acquiring the operation lock.
    sockets.remove(id)?.close()
    synchronized(this) {
      val current = pairing.get()?.takeIf { it.id == id } ?: return
      if (pairing.compareAndSet(current, null)) { current.socket.close(); credentials.discard(current.identity.reference) }
    }
  }
  @Synchronized fun connect(operationId: String, original: Target, reference: String): Map<String, Any> {
    if (!foreground) throw TVFailure("cancelled")
    val epoch = generation.incrementAndGet()
    session.getAndSet(null)?.close()
    val saved = credentials.load(original.id, reference)
    val target = try { discovery.refresh(original) }
      catch (error: TVFailure) {
        if (error.kind != "notFound") throw error
        // NSD can time out when browsing is stopped. The last endpoint is only a hint:
        // the saved public-key pin must still authenticate it before any command is sent.
        if (debug) android.util.Log.d("TVRemoteNative", "Control resolve fallback: cached endpoint")
        original
      }
    val socket = Transport.open(discovery.wifi(), target.host, target.port, saved.identity, saved.pin) { register(operationId, it, epoch) }
    val next = RemoteSession(UUID.randomUUID().toString(), target.id, socket, events, debug)
    try { next.start(); session.set(next)
      if (!foreground || generation.get() != epoch || cancelled.contains(operationId)) { session.compareAndSet(next, null); throw TVFailure("cancelled") }
      sockets.remove(operationId); return next.payload() }
    catch (error: Exception) { next.close(); sockets.remove(operationId); throw error }
  }
  fun cancelOperation(id: String) { cancelled.add(id); sockets.remove(id)?.close(); if (pairing.get()?.id == id) cancelPairing(id); if (cancelled.size > 256) cancelled.clear() }
  fun send(id: String, command: String) { if (!foreground) throw TVFailure("cancelled"); val current = session.get()?.takeIf { it.id == id } ?: throw TVFailure("connectionLost"); current.send(command) }
  fun releaseKeys(id: String) { session.get()?.takeIf { it.id == id }?.releaseKeys() }
  @Synchronized fun disconnect(id: String) { val current = session.get()?.takeIf { it.id == id } ?: return; if (session.compareAndSet(current, null)) current.close() }
  @Synchronized fun forget(id: String) { val current = session.get()?.takeIf { it.deviceId == id }; if (current != null && session.compareAndSet(current, null)) current.close(); credentials.forget(id) }
  fun resume() { foreground = true }
  fun close() {
    foreground = false
    generation.incrementAndGet()
    discovery.stop()
    val oldSockets = sockets.entries.toList().mapNotNull { (id, socket) -> if (sockets.remove(id, socket)) socket else null }
    val oldPairing = pairing.getAndSet(null)
    val oldSession = session.getAndSet(null)
    oldSession?.close()
    // Detach synchronously so a quick resume cannot attach to or close an obsolete session.
    // TLS close may write close_notify; lifecycle callbacks run on Android's UI thread.
    ResourceCleanup.run {
      oldSockets.forEach { try { it.close() } catch (_: java.io.IOException) {} }
      oldPairing?.let {
        try { it.socket.close() } catch (_: java.io.IOException) {}
        try { credentials.discardPending(it.identity.reference) }
        catch (_: Exception) { events(mapOf("type" to "error", "error" to mapOf("code" to "storageFailure"))) }
      }
    }
  }
  fun destroy() { close(); discovery.destroy() }
}
