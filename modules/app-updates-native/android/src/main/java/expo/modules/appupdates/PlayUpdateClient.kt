package expo.modules.appupdates

import android.app.Activity
import android.os.Handler
import android.os.Looper
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

/** Owns only Play update resources. It never touches TV sessions or credentials. */
internal class PlayUpdateClient(
  private val manager: AppUpdateManager,
  private val installedVersion: Long,
  private val emit: (Map<String, Any>) -> Unit
) {
  private val handler = Handler(Looper.getMainLooper())
  private var closed = false
  private var busy = false
  private var version = 0
  private var flexible = false
  private val queries = mutableSetOf<() -> Unit>()
  private var cancelAction: (() -> Unit)? = null
  private val listener = InstallStateUpdatedListener { state ->
    if (!closed && version > installedVersion) {
      val status = when (state.installStatus()) {
        InstallStatus.PENDING -> "pending"
        InstallStatus.DOWNLOADING -> "downloading"
        InstallStatus.DOWNLOADED -> "downloaded"
        InstallStatus.INSTALLING -> "installing"
        InstallStatus.INSTALLED -> "upToDate"
        InstallStatus.FAILED -> "failed"
        InstallStatus.CANCELED -> "cancelled"
        else -> null
      }
      if (status != null) emit(data(status, state.bytesDownloaded(), state.totalBytesToDownload()))
    }
  }
  init { manager.registerListener(listener) }
  private fun data(status: String, bytes: Long = 0, total: Long = 0): Map<String, Any> = mapOf(
    "status" to status, "versionCode" to version,
    "flexibleAllowed" to flexible, "bytesDownloaded" to bytes.coerceAtLeast(0),
    "totalBytes" to total.coerceAtLeast(0)
  )
  private fun query(success: (AppUpdateInfo) -> Unit, failure: () -> Unit) {
    if (closed) { failure(); return }
    var done = false
    lateinit var cancel: () -> Unit
    lateinit var timeout: Runnable
    fun finish(block: () -> Unit) {
      if (done) return
      done = true
      queries.remove(cancel)
      handler.removeCallbacks(timeout)
      block()
    }
    cancel = { finish(failure) }
    timeout = Runnable { cancel() }
    queries.add(cancel)
    handler.postDelayed(timeout, 10000)
    try {
      manager.appUpdateInfo.addOnSuccessListener { info ->
        finish {
          try {
            version = info.availableVersionCode().coerceAtLeast(0)
            flexible = info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
            success(info)
          } catch (_: Exception) { failure() }
        }
      }.addOnFailureListener { cancel() }
    } catch (_: Exception) { cancel() }
  }
  fun check(success: (Map<String, Any>) -> Unit, failure: () -> Unit) {
    query({ info ->
      val status = when (info.installStatus()) {
        InstallStatus.PENDING -> "pending"
        InstallStatus.DOWNLOADING -> "downloading"
        InstallStatus.DOWNLOADED -> "downloaded"
        InstallStatus.INSTALLING -> "installing"
        else -> when {
          info.updateAvailability() == UpdateAvailability.UNKNOWN -> "unsupported"
          info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE && version > installedVersion -> "available"
          else -> "upToDate"
        }
      }
      success(data(status, info.bytesDownloaded(), info.totalBytesToDownload()))
    }, failure)
  }
  fun start(activity: Activity, success: (String) -> Unit, failure: () -> Unit) {
    if (busy || closed) { failure(); return }
    busy = true
    cancelAction = { busy = false; failure() }
    query({ info ->
      if (info.installStatus() == InstallStatus.DOWNLOADED) {
        busy = false; cancelAction = null; success("downloaded")
      } else if (info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE || version <= installedVersion || !flexible) {
        busy = false; cancelAction = null; success("store")
      } else {
        // This Task API owns its result Activity; no generated MainActivity edits.
        manager.startUpdateFlow(info, activity, AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build())
          .addOnSuccessListener { result ->
            if (!closed) {
              busy = false; cancelAction = null
              when (result) {
                Activity.RESULT_OK -> success("accepted")
                Activity.RESULT_CANCELED -> success("cancelled")
                else -> failure()
              }
            }
          }.addOnFailureListener { if (!closed) { busy = false; cancelAction = null; failure() } }
      }
    }, { busy = false; cancelAction = null; failure() })
  }
  fun complete(success: () -> Unit, failure: () -> Unit) {
    if (busy || closed) { failure(); return }
    busy = true
    cancelAction = { busy = false; failure() }
    query({ info ->
      if (info.installStatus() != InstallStatus.DOWNLOADED) {
        busy = false; cancelAction = null; failure()
      } else manager.completeUpdate().addOnSuccessListener {
        if (!closed) { busy = false; cancelAction = null; success() }
      }.addOnFailureListener {
        if (!closed) { busy = false; cancelAction = null; failure() }
      }
    }, { busy = false; cancelAction = null; failure() })
  }
  fun close() {
    if (Looper.myLooper() != Looper.getMainLooper()) { handler.post { close() }; return }
    if (closed) return
    closed = true
    manager.unregisterListener(listener)
    queries.toList().forEach { it() }
    cancelAction?.invoke()
    cancelAction = null
  }
}
