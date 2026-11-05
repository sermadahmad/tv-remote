import CryptoKit
import Foundation
import Security
import SwiftASN1

public struct TVFailure: Error, LocalizedError {
  public let code: String
  public init(_ code: String) { self.code = code }
  public var errorDescription: String? { code }
}

public struct FrameDecoder {
  private var buffer = Data()
  public static let maximumFrame = 65536
  public init() {}
  public mutating func append(_ data: Data) throws -> [Data] {
    // Bound an incomplete frame even if its peer never finishes the payload.
    guard buffer.count + data.count <= Self.maximumFrame * 2 + 10 else {
      throw TVFailure("protocolFailure")
    }
    buffer.append(data)
    var frames: [Data] = []
    while !buffer.isEmpty {
      var length = 0
      var prefix = 0
      var complete = false
      for byte in buffer.prefix(5) {
        length |= Int(byte & 127) << (prefix * 7)
        prefix += 1
        guard length <= Self.maximumFrame else { throw TVFailure("protocolFailure") }
        if byte & 128 == 0 {
          complete = true
          break
        }
      }
      if !complete {
        if prefix == 5 { throw TVFailure("protocolFailure") }
        break
      }
      guard length > 0 else { throw TVFailure("protocolFailure") }
      guard buffer.count >= prefix + length else { break }
      frames.append(Data(buffer.dropFirst(prefix).prefix(length)))
      buffer = Data(buffer.dropFirst(prefix + length))
    }
    return frames
  }
  public static func encode(_ payload: Data) throws -> Data {
    guard !payload.isEmpty, payload.count <= maximumFrame else {
      throw TVFailure("protocolFailure")
    }
    var length = payload.count
    var result = Data()
    while length > 127 {
      result.append(UInt8(length & 127) | 128)
      length >>= 7
    }
    result.append(UInt8(length))
    result.append(payload)
    return result
  }
}

public enum PairingSecret {
  public static func components(_ key: SecKey) throws -> (Data, Data) {
    var error: Unmanaged<CFError>?
    guard let encoded = SecKeyCopyExternalRepresentation(key, &error) as Data? else {
      throw TVFailure("authenticationFailed")
    }
    let root = try DER.parse(Array(encoded))
    guard root.identifier == .sequence, case .constructed(let nodes) = root.content else {
      throw TVFailure("authenticationFailed")
    }
    var iterator = nodes.makeIterator()
    guard let modulus = iterator.next(), let exponent = iterator.next(), iterator.next() == nil
    else { throw TVFailure("authenticationFailed") }
    let n = try ArraySlice<UInt8>(derEncoded: modulus)
    let e = try ArraySlice<UInt8>(derEncoded: exponent)
    guard n.count >= 256, !e.isEmpty else { throw TVFailure("authenticationFailed") }
    return (Data(n), Data(e))
  }
  public static func compute(client: SecKey, server: SecKey, code: String) throws -> Data {
    let input = code.uppercased()
    guard input.range(of: "^[0-9A-F]{6}$", options: .regularExpression) != nil else {
      throw TVFailure("invalidCode")
    }
    let characters = Array(input)
    guard let checksum = UInt8(String(characters[0...1]), radix: 16),
      let first = UInt8(String(characters[2...3]), radix: 16),
      let second = UInt8(String(characters[4...5]), radix: 16)
    else { throw TVFailure("invalidCode") }
    let (clientN, clientE) = try components(client)
    let (serverN, serverE) = try components(server)
    var bytes = clientN + clientE + serverN + serverE
    bytes.append(contentsOf: [first, second])
    let result = Data(SHA256.hash(data: bytes))
    guard result.first == checksum else { throw TVFailure("invalidCode") }
    return result
  }
}
