package expo.modules.tvremote

import java.io.InputStream
import java.net.SocketTimeoutException
import org.junit.Assert.*
import org.junit.Test

class SessionActivityTest {
  @Test fun outboundTrafficExtendsTheSessionWithoutAnInboundPing() {
    var now = 0L
    val activity = SessionActivity { now }
    repeat(10) {
      now += 5000
      activity.record()
      assertFalse(activity.expired())
    }
    now += 15999
    assertFalse(activity.expired())
    now += 1
    assertTrue(activity.expired())
  }

  @Test fun pollingTimeoutsPreserveFragmentedPrefixesAndPayloads() {
    var now = 0L
    val activity = SessionActivity { now }
    val frame = byteArrayOf(0x82.toByte(), 0x01) + ByteArray(130) { it.toByte() }
    var offset = 0
    var timedOut = false
    val input = object : InputStream() {
      override fun read(): Int {
        if (!timedOut) {
          timedOut = true
          now += 1000
          if (now % 5000 == 0L) activity.record() // Commands suppress TV idle pings.
          throw SocketTimeoutException()
        }
        timedOut = false
        return if (offset < frame.size) frame[offset++].toInt() and 255 else -1
      }
      override fun read(bytes: ByteArray, start: Int, length: Int): Int {
        val next = read()
        if (next < 0) return -1
        bytes[start] = next.toByte()
        return 1
      }
    }
    assertArrayEquals(ByteArray(130) { it.toByte() }, Framing.read(ActivityInputStream(input, activity)))
    assertTrue(now > 16000)
    now += 16000
    assertThrows(SocketTimeoutException::class.java) { ActivityInputStream(input, activity).read() }
  }
}
