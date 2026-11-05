package expo.modules.tvremote

import org.junit.Assert.*
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.math.BigInteger
import java.security.KeyFactory
import java.security.interfaces.RSAPublicKey
import java.security.spec.RSAPublicKeySpec
import remote.Remotemessage

class ProtocolTest {
  @Test fun acceptsOnlyLocalNumericAddressesWithoutDnsResolution() {
    for (host in listOf("10.0.0.2", "172.16.0.2", "192.168.1.2", "fd00::1", "fe80::1")) {
      assertNotNull(Transport.localAddress(host))
    }
    for (host in listOf("8.8.8.8", "127.0.0.1", "example.com", "10.1.example.0.1", "10..0.0.1", "10.+0.0.1", "192.168.1.999")) {
      assertThrows(TVFailure::class.java) { Transport.localAddress(host) }
    }
  }
  @Test fun readsFragmentedStreamsAndCoalescedMessages() {
    val source = byteArrayOf(3, 8, 2, 16, 2, 8, 3)
    val input = object : ByteArrayInputStream(source) {
      override fun read(bytes: ByteArray, offset: Int, length: Int): Int = super.read(bytes, offset, minOf(1, length))
    }
    assertArrayEquals(byteArrayOf(8, 2, 16), Framing.read(input))
    assertArrayEquals(byteArrayOf(8, 3), Framing.read(input))
  }
  @Test fun rejectsCorruptOrTruncatedFrames() {
    for (bytes in listOf(byteArrayOf(0), byteArrayOf(-1, -1, 127), byteArrayOf(-128, -128, -128, -128, -128), byteArrayOf(3, 8))) {
      assertThrows(TVFailure::class.java) { Framing.read(ByteArrayInputStream(bytes)) }
    }
  }
  @Test fun matchesVerifiedNavigationWireFixture() {
    val message = Remotemessage.RemoteMessage.newBuilder().setRemoteKeyInject(Remotemessage.RemoteKeyInject.newBuilder()
      .setKeyCode(Remotemessage.RemoteKeyCode.KEYCODE_DPAD_UP).setDirection(Remotemessage.RemoteDirection.SHORT)).build()
    val stream = ByteArrayOutputStream(); Framing.write(stream, message)
    assertArrayEquals(byteArrayOf(6, 0x52, 4, 8, 19, 16, 3), stream.toByteArray())
  }
  @Test fun pairingMatchesIndependentPythonFixture() {
    // Extract strings without Android's JSON implementation: JVM unit tests use Android stubs.
    val json = javaClass.getResourceAsStream("/pairing.json")!!.bufferedReader().readText()
    val moduli = Regex("\"modulus\": \"([0-9a-f]+)\"").findAll(json).map { it.groupValues[1] }.toList()
    fun key(index: Int): RSAPublicKey = KeyFactory.getInstance("RSA").generatePublic(RSAPublicKeySpec(BigInteger(moduli[index], 16), BigInteger.valueOf(65537))) as RSAPublicKey
    val code = Regex("\"code\": \"([0-9A-F]+)\"").find(json)!!.groupValues[1]
    val expected = Regex("\"secret\": \"([0-9a-f]+)\"").find(json)!!.groupValues[1]
    assertEquals(expected, PairingSecret.compute(key(0), key(1), code).joinToString("") { "%02x".format(it) })
    assertThrows(TVFailure::class.java) { PairingSecret.compute(key(0), key(1), "GGGGGG") }
    assertThrows(TVFailure::class.java) { PairingSecret.compute(key(0), key(1), "12345") }
    val incorrect = (if (code.startsWith("00")) "01" else "00") + code.drop(2)
    assertThrows(TVFailure::class.java) { PairingSecret.compute(key(0), key(1), incorrect) }
  }
}
