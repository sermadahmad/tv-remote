package expo.modules.tvremote

import android.os.Looper
import java.util.concurrent.Executors

internal object ResourceCleanup {
  private val worker = Executors.newSingleThreadExecutor { job -> Thread(job, "tv-remote-cleanup").apply { isDaemon = true } }
  fun run(close: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) worker.execute(close)
    else close()
  }
}
