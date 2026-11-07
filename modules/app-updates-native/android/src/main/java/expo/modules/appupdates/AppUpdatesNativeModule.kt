package expo.modules.appupdates

import android.content.pm.ApplicationInfo
import android.os.Build
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AppUpdatesNativeModule : Module() {
  private var client: PlayUpdateClient? = null
  private fun enabled(): Boolean {
    val context = appContext.reactContext ?: return false
    return context.packageName == "com.sermadahmad.tvremote" && context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE == 0
  }
  @Suppress("DEPRECATION")
  private fun client(): PlayUpdateClient {
    client?.let { return it }
    val context = requireNotNull(appContext.reactContext)
    val info = context.packageManager.getPackageInfo(context.packageName, 0)
    val version = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
    return PlayUpdateClient(AppUpdateManagerFactory.create(context), version) { sendEvent("onUpdateState", it) }.also { client = it }
  }
  private fun reject(promise: Promise) = promise.reject("updateUnavailable", "Google Play update operation is unavailable", null)
  override fun definition() = ModuleDefinition {
    Name("AppUpdatesNative")
    Events("onUpdateState")
    AsyncFunction("check") { promise: Promise ->
      if (!enabled()) promise.resolve(mapOf("status" to "unsupported", "versionCode" to 0, "flexibleAllowed" to false, "bytesDownloaded" to 0, "totalBytes" to 0))
      else try { client().check({ promise.resolve(it) }, { reject(promise) }) } catch (_: Exception) { reject(promise) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("start") { promise: Promise ->
      val activity = appContext.currentActivity
      if (!enabled() || activity == null) reject(promise)
      else try { client().start(activity, { promise.resolve(it) }, { reject(promise) }) } catch (_: Exception) { reject(promise) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("complete") { promise: Promise ->
      if (!enabled()) reject(promise)
      else try { client().complete({ promise.resolve(null) }, { reject(promise) }) } catch (_: Exception) { reject(promise) }
    }.runOnQueue(Queues.MAIN)
    OnDestroy { client?.close(); client = null }
  }
}
