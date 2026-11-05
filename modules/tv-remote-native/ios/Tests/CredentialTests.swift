#if os(iOS)
  import Security
  import XCTest

  @testable import TVRemoteCore

  final class CredentialTests: XCTestCase {
    func testKeychainHostAccess() throws {
      let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "dev.universaltv.remote.test-host",
        kSecAttrAccount as String: UUID().uuidString,
        kSecValueData as String: Data("public test value".utf8),
      ]
      defer { SecItemDelete(query as CFDictionary) }
      let status = SecItemAdd(query as CFDictionary, nil)
      guard status == errSecSuccess else {
        throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
      }
    }
    func testIdentityCanSignPersistReloadAndForget() throws {
      let credentials = Credentials()
      let identity = try credentials.create()
      defer { try? credentials.discard(identity.reference) }
      var identityKey: SecKey?
      XCTAssertEqual(SecIdentityCopyPrivateKey(identity.tlsIdentity, &identityKey), errSecSuccess)
      let key = try XCTUnwrap(identityKey)
      let challenge = Data("public credential lifecycle test".utf8)
      let signature = try XCTUnwrap(
        SecKeyCreateSignature(
          key, .rsaSignatureMessagePKCS1v15SHA256, challenge as CFData, nil))
      XCTAssertTrue(
        SecKeyVerifySignature(
          try Credentials.publicKey(identity.certificate), .rsaSignatureMessagePKCS1v15SHA256,
          challenge as CFData, signature, nil))
      let deviceId = "test-" + UUID().uuidString
      let pin = try Credentials.pin(identity.certificate)
      try credentials.commit(deviceId: deviceId, identity: identity, pin: pin)
      defer { try? credentials.forget(deviceId) }
      let loaded = try Credentials().load(deviceId: deviceId, expectedReference: identity.reference)
      XCTAssertEqual(loaded.0.reference, identity.reference)
      XCTAssertEqual(loaded.1, pin)
      XCTAssertThrowsError(try credentials.load(deviceId: deviceId, expectedReference: "wrong"))
      try credentials.forget(deviceId)
      XCTAssertThrowsError(try credentials.load(deviceId: deviceId, expectedReference: nil))
      XCTAssertEqual(
        SecItemCopyMatching(
          [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: Data(identity.reference.utf8),
          ] as CFDictionary, nil), errSecItemNotFound)
    }

    func testInterruptedPairingIdentityIsRemovedOnNextLaunch() throws {
      let first = Credentials()
      let abandoned = try first.create()
      defer { try? first.discard(abandoned.reference) }
      let next = Credentials()
      let fresh = try next.create()
      defer { try? next.discard(fresh.reference) }
      XCTAssertEqual(
        SecItemCopyMatching(
          [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: Data(abandoned.reference.utf8),
          ] as CFDictionary, nil), errSecItemNotFound)
    }
  }
#endif
