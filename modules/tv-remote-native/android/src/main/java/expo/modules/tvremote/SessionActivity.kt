package expo.modules.tvremote

import java.io.InputStream
import java.net.SocketTimeoutException
import java.util.concurrent.atomic.AtomicLong

/** The TV suppresses idle pings while commands are being sent. Both directions count. */
internal class SessionActivity(private val clock: () -> Long = { System.nanoTime() / 1_000_000L }) {
  private val lastActivity = AtomicLong(clock())
  fun record() { lastActivity.set(clock()) }
  fun idleMillis(): Long = (clock() - lastActivity.get()).coerceAtLeast(0)
  fun expired(): Boolean = idleMillis() >= 16_000L
}

/** Retry a socket polling timeout inside a frame without losing its prefix or partial payload. */
internal class ActivityInputStream(private val input: InputStream, private val activity: SessionActivity) : InputStream() {
  private fun <T> readActive(read: () -> T): T {
    while (true) {
      try { return read() }
      catch (error: SocketTimeoutException) { if (activity.expired()) throw error }
    }
  }
  override fun read(): Int = readActive { input.read() }
  override fun read(bytes: ByteArray, offset: Int, length: Int): Int = readActive { input.read(bytes, offset, length) }
}
