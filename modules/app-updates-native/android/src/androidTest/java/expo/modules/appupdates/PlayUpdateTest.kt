package expo.modules.appupdates

import android.app.Activity
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.TaskCompletionSource
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.appupdate.testing.FakeAppUpdateManager
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallErrorCode
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PlayUpdateTest {
  private val instrument get() = InstrumentationRegistry.getInstrumentation()
  private fun main(block: () -> Unit) = instrument.runOnMainSync(block)
  private fun await(latch: CountDownLatch) = assertTrue("Native callback timed out", latch.await(5, TimeUnit.SECONDS))
  private class Result<T> {
    val ready = CountDownLatch(1)
    val value = AtomicReference<T>()
    var failed = false
    fun success(result: T) { value.set(result); ready.countDown() }
    fun failure() { failed = true; ready.countDown() }
  }
  // Google's 2.1.0 fake returns RESULT_OK immediately from the Task API.
  // Hold only that result to exercise real consent timing/cancellation; all
  // availability, download and install behavior still comes from Google's fake.
  private class PendingConsentManager(private val fake: FakeAppUpdateManager) : AppUpdateManager by fake {
    lateinit var consent: TaskCompletionSource<Int>
    override fun startUpdateFlow(info: AppUpdateInfo, activity: Activity, options: AppUpdateOptions): Task<Int> {
      fake.startUpdateFlow(info, activity, options)
      consent = TaskCompletionSource()
      return consent.task
    }
  }
  private fun confirmation(fake: FakeAppUpdateManager) {
    val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5)
    while (System.nanoTime() < deadline) {
      instrument.waitForIdleSync()
      val visible = AtomicReference(false)
      main { visible.set(fake.isConfirmationDialogVisible) }
      if (visible.get()) return
      Thread.sleep(10)
    }
    fail("Flexible consent was not requested")
  }
  private fun fixture(installed: Long = 1, manager: (FakeAppUpdateManager) -> AppUpdateManager = { it }): Triple<FakeAppUpdateManager, PlayUpdateClient, CopyOnWriteArrayList<Map<String, Any>>> {
    val context = instrument.targetContext
    assertEquals("expo.modules.appupdates.test", context.packageName)
    val fake = FakeAppUpdateManager(context)
    val events = CopyOnWriteArrayList<Map<String, Any>>()
    lateinit var client: PlayUpdateClient
    main { fake.setUpdateAvailable(20); client = PlayUpdateClient(manager(fake), installed) { events.add(it) } }
    return Triple(fake, client, events)
  }
  private fun check(client: PlayUpdateClient): Map<String, Any> {
    val result = Result<Map<String, Any>>()
    main { client.check(result::success, result::failure) }
    await(result.ready); assertFalse(result.failed)
    return result.value.get()
  }
  private fun start(fake: FakeAppUpdateManager, client: PlayUpdateClient): Result<String> {
    val result = Result<String>()
    main { client.start(Activity(), result::success, result::failure) }
    confirmation(fake)
    return result
  }
  @Test fun availabilityUsesBuildCodeAndNeverStartsAnImmediateFlow() {
    val (fake, client) = fixture()
    try {
      assertEquals("available", check(client)["status"])
      assertEquals(20, check(client)["versionCode"])
      main { fake.setUpdateAvailable(21, AppUpdateType.IMMEDIATE) }
      val result = Result<String>()
      main { client.start(Activity(), result::success, result::failure) }
      await(result.ready)
      assertEquals("store", result.value.get())
      assertFalse(fake.isImmediateFlowVisible)
      assertFalse(fake.isConfirmationDialogVisible)
      main { fake.setUpdateNotAvailable() }
      assertEquals("upToDate", check(client)["status"])
    } finally { main { client.close() } }
    val (_, current) = fixture(20)
    try { assertEquals("upToDate", check(current)["status"]) }
    finally { main { current.close() } }
  }
  @Test fun flexibleDownloadNeedsSeparateExplicitCompletion() {
    val (fake, client, events) = fixture()
    try {
      val accepted = start(fake, client)
      main { fake.userAcceptsUpdate() }
      await(accepted.ready); assertEquals("accepted", accepted.value.get())
      main { fake.downloadStarts(); fake.setTotalBytesToDownload(100); fake.setBytesDownloaded(50) }
      instrument.waitForIdleSync()
      assertTrue(events.any { it["status"] == "downloading" && it["bytesDownloaded"] == 50L })
      main { fake.downloadCompletes() }
      instrument.waitForIdleSync()
      assertEquals("downloaded", check(client)["status"])
      assertFalse(fake.isInstallSplashScreenVisible)
      val completed = Result<Unit>()
      main { client.complete({ completed.success(Unit) }, completed::failure) }
      instrument.waitForIdleSync()
      assertTrue(fake.isInstallSplashScreenVisible)
      main { fake.installCompletes() }
      await(completed.ready); assertFalse(completed.failed)
    } finally { main { client.close() } }
  }
  @Test fun cancellationAllowsFreshConsentAndBlocksOverlappingFlows() {
    lateinit var manager: PendingConsentManager
    val (fake, client) = fixture(manager = { PendingConsentManager(it).also { manager = it } })
    try {
      val first = start(fake, client)
      val duplicate = Result<String>()
      main { client.start(Activity(), duplicate::success, duplicate::failure) }
      await(duplicate.ready); assertTrue(duplicate.failed)
      main { fake.userRejectsUpdate(); manager.consent.setResult(Activity.RESULT_CANCELED) }
      await(first.ready); assertEquals("cancelled", first.value.get())
      val second = start(fake, client)
      main { fake.userAcceptsUpdate(); manager.consent.setResult(Activity.RESULT_OK) }
      await(second.ready); assertEquals("accepted", second.value.get())
    } finally { main { client.close() } }
  }
  @Test fun notOwnedAndPrematureInstallFailWithoutAnInstall() {
    val (fake, client) = fixture()
    try {
      val premature = Result<Unit>()
      main { client.complete({ premature.success(Unit) }, premature::failure) }
      await(premature.ready); assertTrue(premature.failed)
      assertFalse(fake.isInstallSplashScreenVisible)
      main { fake.setInstallErrorCode(InstallErrorCode.ERROR_APP_NOT_OWNED) }
      val check = Result<Map<String, Any>>()
      main { client.check(check::success, check::failure) }
      await(check.ready); assertTrue(check.failed)
    } finally { main { client.close() } }
  }
  @Test fun disposalRejectsPendingConsentAndDetachesListener() {
    lateinit var manager: PendingConsentManager
    val (fake, client, events) = fixture(manager = { PendingConsentManager(it).also { manager = it } })
    val result = start(fake, client)
    main { client.close() }
    await(result.ready); assertTrue(result.failed)
    main { fake.userAcceptsUpdate(); manager.consent.setResult(Activity.RESULT_OK); fake.downloadStarts(); fake.downloadCompletes() }
    instrument.waitForIdleSync()
    assertTrue(events.isEmpty())
    val afterClose = Result<Map<String, Any>>()
    main { client.check(afterClose::success, afterClose::failure); client.close() }
    await(afterClose.ready); assertTrue(afterClose.failed)
  }
}
