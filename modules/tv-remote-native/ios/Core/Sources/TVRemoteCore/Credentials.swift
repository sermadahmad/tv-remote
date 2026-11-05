import CryptoKit
import Foundation
import Security
import SwiftASN1
import X509

struct Identity {
  let reference: String
  let key: SecKey
  let certificate: SecCertificate
  let tlsIdentity: SecIdentity
}

final class Credentials {
  private let service = "dev.universaltv.remote.credentials.v1"
  private let cleanupLock = NSLock()
  private var cleaned = false
  private func tag(_ reference: String) -> Data { Data(reference.utf8) }
  private func check(_ status: OSStatus) throws {
    if status != errSecSuccess { throw TVFailure("storageFailure") }
  }
  private func metadataQuery(_ id: String) -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
      kSecAttrAccount as String: id,
    ]
  }

  private func cleanupUncommittedIdentities() throws {
    cleanupLock.lock()
    defer { cleanupLock.unlock() }
    guard !cleaned else { return }
    var metadataResult: CFTypeRef?
    let metadataStatus = SecItemCopyMatching(
      [
        kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
        kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitAll,
      ] as CFDictionary, &metadataResult)
    if metadataStatus != errSecItemNotFound { try check(metadataStatus) }
    var committed = Set<String>()
    if metadataStatus == errSecSuccess {
      guard let values = metadataResult as? [Data] else { throw TVFailure("storageFailure") }
      for bytes in values {
        guard let data = try JSONSerialization.jsonObject(with: bytes) as? [String: String],
          let reference = data["reference"]
        else { throw TVFailure("storageFailure") }
        committed.insert(reference)
      }
    }
    var keyResult: CFTypeRef?
    let keyStatus = SecItemCopyMatching(
      [
        kSecClass as String: kSecClassKey, kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
        kSecAttrKeyType as String: kSecAttrKeyTypeRSA, kSecReturnAttributes as String: true,
        kSecMatchLimit as String: kSecMatchLimitAll,
      ] as CFDictionary, &keyResult)
    if keyStatus != errSecItemNotFound { try check(keyStatus) }
    if keyStatus == errSecSuccess {
      guard let attributes = keyResult as? [[String: Any]] else {
        throw TVFailure("storageFailure")
      }
      for entry in attributes {
        if let bytes = entry[kSecAttrApplicationTag as String] as? Data,
          let reference = String(data: bytes, encoding: .utf8), reference.hasPrefix("tv-remote-"),
          UUID(uuidString: String(reference.dropFirst(10))) != nil, !committed.contains(reference)
        {
          try discard(reference)
        }
      }
    }
    cleaned = true
  }

  func create() throws -> Identity {
    try cleanupUncommittedIdentities()
    let reference = "tv-remote-" + UUID().uuidString
    let attributes: [String: Any] = [
      kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
      kSecAttrKeySizeInBits as String: 2048,
      kSecPrivateKeyAttrs as String: [
        kSecAttrIsPermanent as String: true,
        kSecAttrApplicationTag as String: tag(reference),
        kSecAttrLabel as String: reference,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        kSecAttrSynchronizable as String: false,
      ],
    ]
    var error: Unmanaged<CFError>?
    guard let key = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
      throw TVFailure("storageFailure")
    }
    do {
      let privateKey = try Certificate.PrivateKey(key)
      let name = try DistinguishedName { CommonName("Universal TV Remote") }
      let certificate = try Certificate(
        version: .v3, serialNumber: Certificate.SerialNumber(), publicKey: privateKey.publicKey,
        notValidBefore: Date().addingTimeInterval(-60),
        notValidAfter: Date().addingTimeInterval(3650 * 86400),
        issuer: name, subject: name, signatureAlgorithm: .sha256WithRSAEncryption,
        extensions: Certificate.Extensions(), issuerPrivateKey: privateKey)
      var serializer = DER.Serializer()
      try certificate.serialize(into: &serializer)
      guard
        let secCertificate = SecCertificateCreateWithData(
          nil, Data(serializer.serializedBytes) as CFData)
      else { throw TVFailure("storageFailure") }
      try check(
        SecItemAdd(
          [
            kSecClass as String: kSecClassCertificate, kSecValueRef as String: secCertificate,
            kSecAttrLabel as String: reference,
          ] as CFDictionary, nil))
      return try identity(reference)
    } catch {
      try? discard(reference)
      throw error
    }
  }

  private func identity(_ reference: String) throws -> Identity {
    guard reference.hasPrefix("tv-remote-") else { throw TVFailure("authenticationFailed") }
    var result: CFTypeRef?
    let keyQuery: [String: Any] = [
      kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: tag(reference),
      kSecAttrKeyType as String: kSecAttrKeyTypeRSA, kSecReturnRef as String: true,
    ]
    guard SecItemCopyMatching(keyQuery as CFDictionary, &result) == errSecSuccess, let result,
      CFGetTypeID(result) == SecKeyGetTypeID()
    else { throw TVFailure("authenticationFailed") }
    let key = result as! SecKey  // SecKey's CF type was checked immediately above.
    var certificateResult: CFTypeRef?
    let certQuery: [String: Any] = [
      kSecClass as String: kSecClassCertificate, kSecAttrLabel as String: reference,
      kSecReturnRef as String: true,
    ]
    guard SecItemCopyMatching(certQuery as CFDictionary, &certificateResult) == errSecSuccess,
      let certificateResult, CFGetTypeID(certificateResult) == SecCertificateGetTypeID()
    else { throw TVFailure("authenticationFailed") }
    let certificate = certificateResult as! SecCertificate
    #if os(macOS)
      var identity: SecIdentity?
      guard SecIdentityCreateWithCertificate(nil, certificate, &identity) == errSecSuccess,
        let identity
      else { throw TVFailure("authenticationFailed") }
      return Identity(
        reference: reference, key: key, certificate: certificate, tlsIdentity: identity)
    #else
      var identityResult: CFTypeRef?
      let identityQuery: [String: Any] = [
        kSecClass as String: kSecClassIdentity, kSecAttrLabel as String: reference,
        kSecReturnRef as String: true,
      ]
      guard SecItemCopyMatching(identityQuery as CFDictionary, &identityResult) == errSecSuccess,
        let identityResult, CFGetTypeID(identityResult) == SecIdentityGetTypeID()
      else { throw TVFailure("authenticationFailed") }
      return Identity(
        reference: reference, key: key, certificate: certificate,
        tlsIdentity: identityResult as! SecIdentity)
    #endif
  }

  func commit(deviceId: String, identity: Identity, pin: Data) throws {
    let previous = try metadataExists(deviceId) ? readMetadata(deviceId).0 : nil
    let bytes = try JSONSerialization.data(withJSONObject: [
      "reference": identity.reference, "pin": pin.base64EncodedString(),
    ])
    let query = metadataQuery(deviceId)
    let attributes: [String: Any] = [
      kSecValueData as String: bytes,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
      kSecAttrSynchronizable as String: false,
    ]
    let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    if status == errSecItemNotFound {
      try check(SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil))
    } else {
      try check(status)
    }
    if let previous, previous != identity.reference { try discard(previous) }
  }
  private func metadataExists(_ deviceId: String) throws -> Bool {
    let status = SecItemCopyMatching(metadataQuery(deviceId) as CFDictionary, nil)
    if status == errSecItemNotFound { return false }
    try check(status)
    return true
  }
  private func readMetadata(_ deviceId: String) throws -> (String, Data) {
    var query = metadataQuery(deviceId)
    query[kSecReturnData as String] = true
    var result: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
      let bytes = result as? Data,
      let metadata = try JSONSerialization.jsonObject(with: bytes) as? [String: String],
      let reference = metadata["reference"], let encoded = metadata["pin"],
      let pin = Data(base64Encoded: encoded), pin.count == 32
    else { throw TVFailure("authenticationFailed") }
    return (reference, pin)
  }
  func load(deviceId: String, expectedReference: String?) throws -> (Identity, Data) {
    try cleanupUncommittedIdentities()
    let (reference, pin) = try readMetadata(deviceId)
    guard expectedReference == nil || reference == expectedReference else {
      throw TVFailure("authenticationFailed")
    }
    return (try identity(reference), pin)
  }
  func discard(_ reference: String) throws {
    guard reference.hasPrefix("tv-remote-") else { throw TVFailure("authenticationFailed") }
    for query: [String: Any] in [
      [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: tag(reference)],
      [kSecClass as String: kSecClassCertificate, kSecAttrLabel as String: reference],
    ] {
      let status = SecItemDelete(query as CFDictionary)
      if status != errSecItemNotFound { try check(status) }
    }
  }
  func forget(_ deviceId: String) throws {
    try cleanupUncommittedIdentities()
    if try metadataExists(deviceId) { try discard(readMetadata(deviceId).0) }
    let status = SecItemDelete(metadataQuery(deviceId) as CFDictionary)
    if status != errSecItemNotFound { try check(status) }
  }
  static func publicKey(_ certificate: SecCertificate) throws -> SecKey {
    guard let key = SecCertificateCopyKey(certificate) else {
      throw TVFailure("authenticationFailed")
    }
    _ = try PairingSecret.components(key)
    return key
  }
  static func pin(_ certificate: SecCertificate) throws -> Data {
    // Hash the complete DER SubjectPublicKeyInfo on both platforms, not the PKCS#1 blob.
    let certificate = try Certificate(
      derEncoded: Array(SecCertificateCopyData(certificate) as Data))
    var serializer = DER.Serializer()
    try certificate.publicKey.serialize(into: &serializer)
    return Data(SHA256.hash(data: Data(serializer.serializedBytes)))
  }
}
