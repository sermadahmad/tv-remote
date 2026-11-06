package expo.modules.tvremote

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.cert.X509Certificate
import java.util.Date
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.security.auth.x500.X500Principal

internal data class Identity(val reference: String, val key: PrivateKey, val certificate: X509Certificate)
internal data class PairedIdentity(val identity: Identity, val pin: String)

internal class Credentials(context: Context) {
  private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
  private val preferences = context.getSharedPreferences("tv-identities-v1", Context.MODE_PRIVATE)
  private val wrappingAlias = "tv-remote-metadata-v1"
  private fun pending(): Set<String> = preferences.getStringSet("pending-identities", emptySet())?.toSet() ?: emptySet()
  init {
    // A terminated pairing must not leave an unreferenced private key indefinitely.
    pending().forEach { reference -> if (Regex("^tv-remote-[0-9a-fA-F-]{36}$").matches(reference)) keyStore.deleteEntry(reference) }
    if (!preferences.edit().remove("pending-identities").commit()) throw TVFailure("storageFailure")
  }
  private fun deviceKey(deviceId: String) = MessageDigest.getInstance("SHA-256").digest(deviceId.toByteArray()).joinToString("") { "%02x".format(it) }

  @Synchronized fun create(): Identity {
    val reference = "tv-remote-" + UUID.randomUUID().toString()
    if (!preferences.edit().putStringSet("pending-identities", pending() + reference).commit()) throw TVFailure("storageFailure")
    val spec = KeyGenParameterSpec.Builder(reference, KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY)
      // Conscrypt signs TLS's already-hashed CertificateVerify through the Keystore.
      // DIGEST_NONE authorizes that operation; TLS still selects and hashes its signature algorithm.
      .setKeySize(2048).setDigests(KeyProperties.DIGEST_NONE, KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA384, KeyProperties.DIGEST_SHA512)
      .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1, KeyProperties.SIGNATURE_PADDING_RSA_PSS)
      // Conscrypt also applies PSS padding itself and delegates the final raw RSA signature.
      // Android maps private-key ENCRYPT_MODE to PURPOSE_SIGN; no decryption purpose is granted.
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setCertificateSubject(X500Principal("CN=Universal TV Remote"))
      .setCertificateSerialNumber(BigInteger(128, java.security.SecureRandom()))
      .setCertificateNotBefore(Date(System.currentTimeMillis() - 60000))
      .setCertificateNotAfter(Date(System.currentTimeMillis() + 3650L * 86400000L)).build()
    KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore").apply { initialize(spec) }.generateKeyPair()
    return identity(reference)
  }

  private fun identity(reference: String): Identity {
    if (!reference.startsWith("tv-remote-") || !keyStore.containsAlias(reference)) throw TVFailure("authenticationFailed")
    val key = keyStore.getKey(reference, null) as? PrivateKey ?: throw TVFailure("authenticationFailed")
    val certificate = keyStore.getCertificate(reference) as? X509Certificate ?: throw TVFailure("authenticationFailed")
    return Identity(reference, key, certificate)
  }

  private fun wrappingKey(): SecretKey {
    if (!keyStore.containsAlias(wrappingAlias)) {
      KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
        init(KeyGenParameterSpec.Builder(wrappingAlias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
      }.generateKey()
    }
    return keyStore.getKey(wrappingAlias, null) as SecretKey
  }

  @Synchronized fun commit(deviceId: String, identity: Identity, pin: String) {
    val old = if (preferences.contains(deviceKey(deviceId))) load(deviceId, null).identity.reference else null
    val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, wrappingKey()) }
    cipher.updateAAD(deviceId.toByteArray())
    val payload = JSONObject().put("reference", identity.reference).put("pin", pin).toString().toByteArray()
    val encrypted = cipher.doFinal(payload)
    val encoded = Base64.encodeToString(cipher.iv + encrypted, Base64.NO_WRAP)
    if (!preferences.edit().putString(deviceKey(deviceId), encoded).putStringSet("pending-identities", pending() - identity.reference).commit()) throw TVFailure("storageFailure")
    if (old != null && old != identity.reference) discard(old)
  }

  @Synchronized fun load(deviceId: String, expectedReference: String?): PairedIdentity {
    try {
      val encoded = preferences.getString(deviceKey(deviceId), null) ?: throw TVFailure("authenticationFailed")
      val bytes = Base64.decode(encoded, Base64.NO_WRAP)
      if (bytes.size < 29) throw TVFailure("authenticationFailed")
      val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, wrappingKey(), GCMParameterSpec(128, bytes.copyOfRange(0, 12))) }
      cipher.updateAAD(deviceId.toByteArray())
      val metadata = JSONObject(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size))))
      val reference = metadata.getString("reference")
      if (expectedReference != null && reference != expectedReference) throw TVFailure("authenticationFailed")
      return PairedIdentity(identity(reference), metadata.getString("pin"))
    } catch (error: TVFailure) { throw error }
    catch (_: Exception) { throw TVFailure("authenticationFailed") }
  }
  @Synchronized fun discard(reference: String) {
    if (Regex("^tv-remote-[0-9a-fA-F-]{36}$").matches(reference)) keyStore.deleteEntry(reference)
    if (!preferences.edit().putStringSet("pending-identities", pending() - reference).commit()) throw TVFailure("storageFailure")
  }
  @Synchronized fun discardPending(reference: String) {
    // Background cleanup can race a successful secret acknowledgment/commit.
    if (reference in pending()) discard(reference)
  }
  @Synchronized fun forget(deviceId: String) {
    val reference = if (preferences.contains(deviceKey(deviceId))) load(deviceId, null).identity.reference else null
    if (reference != null) discard(reference)
    if (!preferences.edit().remove(deviceKey(deviceId)).commit()) throw TVFailure("storageFailure")
  }
  companion object {
    fun pin(certificate: X509Certificate): String = Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(certificate.publicKey.encoded), Base64.NO_WRAP)
  }
}
