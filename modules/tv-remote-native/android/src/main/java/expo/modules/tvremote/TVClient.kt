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
  val discovery = Discovery(context, emit)
  private val credentials = Credentials(context)
  private val events = emit
  private val sockets = ConcurrentHashMap<String, Socket>()
  private val cancelled = ConcurrentHashMap.newKeySet<String>()
  private val generation = java.util.concurrent.atomic.AtomicLong()
  @Volatile private var foreground = true
  @Volatile private var pairing: Pairing? = null
  @Volatile private var session: RemoteSession? = null
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
    cancelPairing(pairing?.id ?: "")
    session?.close(); session = null
    val identity = credentials.create()
    try {
      val target = discovery.refresh(original)
      val socket = Transport.open(discovery.wifi(), target.host, target.pairingPort, identity, null) { register(operationId, it, epoch) }
      val input = socket.inputStream
      val output = socket.outputStream
      fun exchange(message: PoloProto.OuterMessage): PoloProto.OuterMessage {
        Framing.write(output, message)
        val response = PoloProto.OuterMessage.parseFrom(Framing.read(input))
        if (response.status != PoloProto.OuterMessage.Status.STATUS_OK) throw TVFailure("pairingRejected")
        return response
      }
      var response = exchange(pairingMessage().setPairingRequest(PoloProto.PairingRequest.newBuilder().setServiceName("atvremote").setClientName("Universal TV Remote")).build())
      if (!response.hasPairingRequestAck()) throw TVFailure("protocolFailure")
      val encoding = PoloProto.Options.Encoding.newBuilder().setType(PoloProto.Options.Encoding.EncodingType.ENCODING_TYPE_HEXADECIMAL).setSymbolLength(6).build()
      response = exchange(pairingMessage().setOptions(PoloProto.Options.newBuilder().setPreferredRole(PoloProto.Options.RoleType.ROLE_TYPE_INPUT).addInputEncodings(encoding)).build())
      if (!response.hasOptions()) throw TVFailure("protocolFailure")
      response = exchange(pairingMessage().setConfiguration(PoloProto.Configuration.newBuilder().setClientRole(PoloProto.Options.RoleType.ROLE_TYPE_INPUT).setEncoding(encoding)).build())
      if (!response.hasConfigurationAck()) throw TVFailure("protocolFailure")
      val expires = System.currentTimeMillis() + 120000
      if (!foreground || generation.get() != epoch || cancelled.contains(operationId)) throw TVFailure("cancelled")
      pairing = Pairing(operationId, target, identity, socket, expires)
      return mapOf("pairingId" to operationId, "encoding" to "hex", "length" to 6, "expiresAt" to expires.toDouble())
    } catch (error: Exception) { sockets.remove(operationId)?.close(); credentials.discard(identity.reference); throw error }
  }
  @Synchronized fun submitPairingCode(id: String, code: String): Map<String, String> {
    val current = pairing?.takeIf { it.id == id } ?: throw TVFailure("pairingTimeout")
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
      if (!foreground || cancelled.contains(id) || pairing?.id != id) throw TVFailure("cancelled")
      credentials.commit(deviceId, current.identity, pin)
      current.socket.close(); sockets.remove(id); pairing = null
      return mapOf("credentialRef" to current.identity.reference, "deviceId" to deviceId)
    } catch (error: Exception) { cancelPairing(id); throw error }
    finally { secret.fill(0) }
  }
  fun cancelPairing(id: String) {
    // Interrupt a blocking pairing read before acquiring the operation lock.
    sockets.remove(id)?.close()
    synchronized(this) {
      val current = pairing?.takeIf { it.id == id } ?: return
      pairing = null; current.socket.close(); credentials.discard(current.identity.reference)
    }
  }
  @Synchronized fun connect(operationId: String, original: Target, reference: String): Map<String, Any> {
    if (!foreground) throw TVFailure("cancelled")
    val epoch = generation.incrementAndGet()
    session?.close(); session = null
    val saved = credentials.load(original.id, reference)
    val target = discovery.refresh(original)
    val socket = Transport.open(discovery.wifi(), target.host, target.port, saved.identity, saved.pin) { register(operationId, it, epoch) }
    val next = RemoteSession(UUID.randomUUID().toString(), target.id, socket, events)
    try { next.start(); session = next
      if (!foreground || generation.get() != epoch || cancelled.contains(operationId)) { session = null; throw TVFailure("cancelled") }
      sockets.remove(operationId); return next.payload() }
    catch (error: Exception) { next.close(); sockets.remove(operationId); throw error }
  }
  fun cancelOperation(id: String) { cancelled.add(id); sockets.remove(id)?.close(); if (pairing?.id == id) cancelPairing(id); if (cancelled.size > 256) cancelled.clear() }
  fun send(id: String, command: String) { val current = session?.takeIf { it.id == id } ?: throw TVFailure("connectionLost"); current.send(command) }
  fun releaseKeys(id: String) { session?.takeIf { it.id == id }?.releaseKeys() }
  @Synchronized fun disconnect(id: String) { if (session?.id == id) { session?.close(); session = null } }
  @Synchronized fun forget(id: String) { if (session?.deviceId == id) { session?.close(); session = null }; credentials.forget(id) }
  fun resume() { foreground = true }
  fun close() { foreground = false; generation.incrementAndGet(); discovery.stop(); sockets.values.forEach { it.close() }; sockets.clear(); pairing?.let { cancelPairing(it.id) }; session?.close(); session = null }
  fun destroy() { close(); discovery.destroy() }
}
