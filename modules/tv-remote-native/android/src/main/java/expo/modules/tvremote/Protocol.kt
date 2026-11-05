package expo.modules.tvremote

import com.google.protobuf.MessageLite
import com.google.polo.wire.protobuf.PoloProto
import java.io.InputStream
import java.io.OutputStream
import java.security.MessageDigest
import java.security.interfaces.RSAPublicKey

internal class TVFailure(val kind: String) : Exception(kind)

internal object Framing {
  const val MAX_FRAME = 65536
  fun read(input: InputStream): ByteArray {
    var size = 0L
    for (index in 0..4) {
      val byte = input.read()
      if (byte < 0) throw TVFailure("connectionLost")
      size = size or ((byte and 127).toLong() shl (index * 7))
      if (size > MAX_FRAME) throw TVFailure("protocolFailure")
      if (byte and 128 == 0) {
        if (size == 0L) throw TVFailure("protocolFailure")
        val result = ByteArray(size.toInt())
        var offset = 0
        while (offset < result.size) {
          val count = input.read(result, offset, result.size - offset)
          if (count <= 0) throw TVFailure("connectionLost")
          offset += count
        }
        return result
      }
    }
    throw TVFailure("protocolFailure")
  }
  fun write(output: OutputStream, message: MessageLite) {
    val bytes = message.toByteArray()
    if (bytes.isEmpty() || bytes.size > MAX_FRAME) throw TVFailure("protocolFailure")
    var size = bytes.size
    while (size > 127) { output.write((size and 127) or 128); size = size ushr 7 }
    output.write(size)
    output.write(bytes)
    output.flush()
  }
}

internal object PairingSecret {
  private fun unsigned(bytes: ByteArray): ByteArray = if (bytes.size > 1 && bytes[0] == 0.toByte()) bytes.copyOfRange(1, bytes.size) else bytes
  fun compute(client: RSAPublicKey, server: RSAPublicKey, code: String): ByteArray {
    if (!Regex("^[0-9A-Fa-f]{6}$").matches(code)) throw TVFailure("invalidCode")
    val hash = MessageDigest.getInstance("SHA-256")
    hash.update(unsigned(client.modulus.toByteArray()))
    hash.update(unsigned(client.publicExponent.toByteArray()))
    hash.update(unsigned(server.modulus.toByteArray()))
    hash.update(unsigned(server.publicExponent.toByteArray()))
    hash.update(byteArrayOf(code.substring(2, 4).toInt(16).toByte(), code.substring(4, 6).toInt(16).toByte()))
    val result = hash.digest()
    if ((result[0].toInt() and 255) != code.substring(0, 2).toInt(16)) throw TVFailure("invalidCode")
    return result
  }
}

internal fun pairingMessage(): PoloProto.OuterMessage.Builder = PoloProto.OuterMessage.newBuilder()
  .setProtocolVersion(2).setStatus(PoloProto.OuterMessage.Status.STATUS_OK)
