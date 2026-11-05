import Security
import XCTest

@testable import TVRemoteCore

final class ProtocolTests: XCTestCase {
  func testBackgroundClientRejectsQueuedOperationsBeforeNetworkOrCredentials() throws {
    let client = TVClient { _ in }
    client.close()
    let target = try TVTarget(
      id: "test", name: "Test", host: "192.168.1.2", port: 6466, pairingPort: 6467, serviceName: "")
    for operation in [
      { try client.startDiscovery() },
      { _ = try client.beginPairing(operationId: "pair", target: target) },
      { _ = try client.connect(operationId: "connect", target: target, reference: "missing") },
    ] {
      XCTAssertThrowsError(try operation()) { error in
        XCTAssertEqual((error as? TVFailure)?.code, "cancelled")
      }
    }
  }
  func testPairingAgainstIndependentPythonFixture() throws {
    let url = try XCTUnwrap(
      Bundle.module.url(forResource: "pairing", withExtension: "json", subdirectory: "Fixtures"))
    let fixture = try XCTUnwrap(
      JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    func key(_ label: String) throws -> SecKey {
      let value = try XCTUnwrap(fixture[label] as? [String: String])
      let encoded = try XCTUnwrap(value["publicKey"])
      let data = try XCTUnwrap(Data(base64Encoded: encoded))
      let attributes: [String: Any] = [
        kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
        kSecAttrKeyClass as String: kSecAttrKeyClassPublic, kSecAttrKeySizeInBits as String: 2048,
      ]
      return try XCTUnwrap(SecKeyCreateWithData(data as CFData, attributes as CFDictionary, nil))
    }
    let client = try key("client")
    let server = try key("server")
    let code = try XCTUnwrap(fixture["code"] as? String)
    let actual = try PairingSecret.compute(client: client, server: server, code: code)
    XCTAssertEqual(actual.map { String(format: "%02x", $0) }.joined(), fixture["secret"] as? String)
    XCTAssertThrowsError(try PairingSecret.compute(client: client, server: server, code: "GGGGGG"))
    XCTAssertThrowsError(try PairingSecret.compute(client: client, server: server, code: "12345"))
    let wrong = (code.hasPrefix("00") ? "01" : "00") + code.dropFirst(2)
    XCTAssertThrowsError(try PairingSecret.compute(client: client, server: server, code: wrong))
  }
  func testFragmentedVarintAndPayload() throws {
    let body = Data(repeating: 42, count: 300)
    let encoded = try FrameDecoder.encode(body)
    var decoder = FrameDecoder()
    XCTAssertTrue(try decoder.append(encoded.prefix(1)).isEmpty)
    XCTAssertTrue(try decoder.append(encoded.dropFirst().prefix(3)).isEmpty)
    XCTAssertEqual(try decoder.append(encoded.dropFirst(4)), [body])
  }
  func testCoalescedFrames() throws {
    var decoder = FrameDecoder()
    let first = Data([8, 2])
    let second = Data([16, 200, 1])
    XCTAssertEqual(
      try decoder.append(FrameDecoder.encode(first) + FrameDecoder.encode(second)), [first, second])
  }
  func testMalformedAndOversizedLengths() {
    var decoder = FrameDecoder()
    XCTAssertThrowsError(try decoder.append(Data([128, 128, 128, 128, 128])))
    var other = FrameDecoder()
    XCTAssertThrowsError(try other.append(Data([255, 255, 127])))
    XCTAssertThrowsError(try FrameDecoder.encode(Data()))
  }
  func testLocalAddressRestrictions() {
    for address in ["192.168.1.2", "10.0.0.2", "172.16.0.3", "fe80::1%en0"] {
      XCTAssertTrue(TLSPipe.isLocalAddress(address))
    }
    for address in [
      "127.0.0.1", "8.8.8.8", "example.com", "172.32.0.1", "192.168.1.999", "10.1.example.0.1",
      "10..0.0.1", "10.+0.0.1",
    ] {
      XCTAssertFalse(TLSPipe.isLocalAddress(address))
    }
  }
  func testVerifiedNavigationWireFixture() throws {
    var message = Remote_RemoteMessage()
    message.remoteKeyInject.keyCode = .keycodeDpadUp
    message.remoteKeyInject.direction = .short
    XCTAssertEqual(try message.serializedData(), Data([0x52, 0x04, 0x08, 0x13, 0x10, 0x03]))
  }
}
