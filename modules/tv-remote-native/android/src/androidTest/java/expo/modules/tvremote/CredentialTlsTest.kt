package expo.modules.tvremote

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.security.MessageDigest
import java.security.Signature
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import javax.crypto.Cipher
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CredentialTlsTest {
  @Test fun lifecycleCleanupLeavesTheMainThread() {
    val completed = CountDownLatch(1)
    val mainThread = AtomicBoolean(true)
    InstrumentationRegistry.getInstrumentation().runOnMainSync {
      ResourceCleanup.run {
        mainThread.set(android.os.Looper.myLooper() == android.os.Looper.getMainLooper())
        completed.countDown()
      }
    }
    assertTrue(completed.await(5, TimeUnit.SECONDS))
    assertFalse(mainThread.get())
  }
  @Test fun nonExportableIdentitySupportsTlsPrehashedSigningAndPersistentDeletion() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    // Library instrumentation has its own UID and cannot disturb the remote app's credentials.
    assertEquals("expo.modules.tvremote.test", context.packageName)
    val credentials = Credentials(context)
    val identity = credentials.create()
    val deviceId = "androidtv:instrumentation-tls-regression"
    try {
      assertNull(identity.key.encoded)
      identity.certificate.verify(identity.certificate.publicKey)
      val payload = "Synthetic TLS CertificateVerify regression".toByteArray(Charsets.UTF_8)
      val sha256DigestInfo = byteArrayOf(0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86.toByte(), 0x48,
        0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20) + MessageDigest.getInstance("SHA-256").digest(payload)
      // Conscrypt's CryptoUpcalls performs this private-key operation after hashing TLS data.
      // Before DIGEST_NONE was authorized, Android Keystore rejected it as INCOMPATIBLE_DIGEST.
      val signer = Cipher.getInstance("RSA/ECB/PKCS1Padding").apply { init(Cipher.ENCRYPT_MODE, identity.key) }
      val signed = signer.doFinal(sha256DigestInfo)
      val verifier = Signature.getInstance("SHA256withRSA").apply {
        initVerify(identity.certificate.publicKey)
        update(payload)
      }
      assertTrue(verifier.verify(signed))
      // TLS 1.3 PSS signing can delegate an already-encoded block through NoPadding.
      // Check the same raw private-key path and its public-key inverse, without exporting the key.
      val encodedBlock = ByteArray(256).apply { this[255] = 0x42 }
      val rawSigner = Cipher.getInstance("RSA/ECB/NoPadding").apply { init(Cipher.ENCRYPT_MODE, identity.key) }
      val rawSignature = rawSigner.doFinal(encodedBlock)
      val rawVerifier = Cipher.getInstance("RSA/ECB/NoPadding").apply { init(Cipher.DECRYPT_MODE, identity.certificate.publicKey) }
      assertArrayEquals(encodedBlock, rawVerifier.doFinal(rawSignature))
      credentials.commit(deviceId, identity, Credentials.pin(identity.certificate))
      credentials.discardPending(identity.reference)
      val reopened = Credentials(context)
      assertEquals(identity.reference, reopened.load(deviceId, identity.reference).identity.reference)
      reopened.forget(deviceId)
      assertThrows(TVFailure::class.java) { reopened.load(deviceId, identity.reference) }
    } finally {
      try { credentials.forget(deviceId) } finally { credentials.discard(identity.reference) }
    }
  }
}
