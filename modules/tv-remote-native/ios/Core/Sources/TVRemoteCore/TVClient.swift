import Foundation
import Security
import SwiftProtobuf

private struct Pairing {
  let id: String
  let target: TVTarget
  let identity: Identity
  let pipe: TLSPipe
  let expires: Date
}

public final class TVClient {
  private let credentials = Credentials()
  private let lock = NSLock()
  private let emit: ([String: Any]) -> Void
  private let discovery: Discovery
  private var pairing: Pairing?
  private var session: RemoteSession?
  private var operations: [String: TLSPipe] = [:]
  private var cancelled = Set<String>()
  private var generation = 0
  private var foreground = true

  public init(emit: @escaping ([String: Any]) -> Void) {
    self.emit = emit
    self.discovery = Discovery(emit: emit)
  }
  private func locked<T>(_ body: () throws -> T) rethrows -> T {
    lock.lock()
    defer { lock.unlock() }
    return try body()
  }
  public func startDiscovery() throws {
    try locked {
      guard foreground else { throw TVFailure("cancelled") }
      discovery.start()
    }
  }
  public func stopDiscovery() { discovery.stop() }
  private func beginOperation() throws -> Int {
    try locked {
      guard foreground else { throw TVFailure("cancelled") }
      generation += 1
      return generation
    }
  }
  public func resume() { locked { foreground = true } }
  private func register(_ id: String, _ pipe: TLSPipe, generation expected: Int) throws {
    try locked {
      if !foreground || generation != expected || cancelled.contains(id) {
        pipe.close()
        throw TVFailure("cancelled")
      }
      operations[id] = pipe
    }
  }
  private func message() -> Polo_Wire_Protobuf_OuterMessage {
    var message = Polo_Wire_Protobuf_OuterMessage()
    message.protocolVersion = 2
    message.status = .ok
    return message
  }
  private func exchange(_ pipe: TLSPipe, _ message: Polo_Wire_Protobuf_OuterMessage) throws
    -> Polo_Wire_Protobuf_OuterMessage
  {
    try pipe.write(message.serializedData())
    let response = try Polo_Wire_Protobuf_OuterMessage(serializedBytes: pipe.read())
    guard response.status == .ok else { throw TVFailure("pairingRejected") }
    return response
  }
  public func beginPairing(operationId: String, target: TVTarget) throws -> [String: Any] {
    let generation = try beginOperation()
    if let id = locked({ pairing?.id }) { try cancelPairing(id) }
    locked {
      session?.close()
      session = nil
    }
    let identity = try credentials.create()
    var candidate: TLSPipe?
    do {
      let pipe = try TLSPipe(target: target, pairing: true, identity: identity, pin: nil)
      candidate = pipe
      try register(operationId, pipe, generation: generation)
      try pipe.open()
      var request = message()
      request.pairingRequest.serviceName = "atvremote"
      request.pairingRequest.clientName = "Universal TV Remote"
      guard try exchange(pipe, request).hasPairingRequestAck else {
        throw TVFailure("protocolFailure")
      }
      var encoding = Polo_Wire_Protobuf_Options.Encoding()
      encoding.type = .hexadecimal
      encoding.symbolLength = 6
      request = message()
      request.options.preferredRole = .input
      request.options.inputEncodings = [encoding]
      guard try exchange(pipe, request).hasOptions else { throw TVFailure("protocolFailure") }
      request = message()
      request.configuration.clientRole = .input
      request.configuration.encoding = encoding
      guard try exchange(pipe, request).hasConfigurationAck else {
        throw TVFailure("protocolFailure")
      }
      let expires = Date().addingTimeInterval(120)
      try locked {
        if !foreground || self.generation != generation || cancelled.contains(operationId) {
          throw TVFailure("cancelled")
        }
        pairing = Pairing(
          id: operationId, target: target, identity: identity, pipe: pipe, expires: expires)
      }
      return [
        "pairingId": operationId, "encoding": "hex", "length": 6,
        "expiresAt": expires.timeIntervalSince1970 * 1000,
      ]
    } catch {
      candidate?.close()
      _ = locked { operations.removeValue(forKey: operationId) }
      try credentials.discard(identity.reference)
      throw error
    }
  }
  public func submitPairingCode(_ id: String, code: String) throws -> [String: String] {
    guard let current = locked({ pairing }), current.id == id else {
      throw TVFailure("pairingTimeout")
    }
    guard current.expires > Date() else {
      try cancelPairing(id)
      throw TVFailure("pairingTimeout")
    }
    let certificate = try current.pipe.peerCertificate()
    guard let clientKey = SecKeyCopyPublicKey(current.identity.key) else {
      throw TVFailure("authenticationFailed")
    }
    var secret = try PairingSecret.compute(
      client: clientKey, server: Credentials.publicKey(certificate), code: code)
    defer { secret.resetBytes(in: 0..<secret.count) }
    do {
      var request = message()
      request.secret.secret = secret
      guard try exchange(current.pipe, request).hasSecretAck else {
        throw TVFailure("pairingRejected")
      }
      let pin = try Credentials.pin(certificate)
      let deviceId =
        "androidtv:"
        + pin.base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
      try locked {
        guard foreground, pairing?.id == id, !cancelled.contains(id) else {
          throw TVFailure("cancelled")
        }
        try credentials.commit(deviceId: deviceId, identity: current.identity, pin: pin)
        current.pipe.close()
        pairing = nil
        operations.removeValue(forKey: id)
      }
      return ["credentialRef": current.identity.reference, "deviceId": deviceId]
    } catch {
      try cancelPairing(id)
      throw error
    }
  }
  public func cancelPairing(_ id: String) throws {
    let current = locked { () -> Pairing? in
      guard let current = pairing, current.id == id else { return nil }
      pairing = nil
      operations.removeValue(forKey: id)
      return current
    }
    if let current {
      current.pipe.close()
      try credentials.discard(current.identity.reference)
    }
  }
  public func connect(operationId: String, target: TVTarget, reference: String) throws -> [String:
    Any]
  {
    let generation = try beginOperation()
    locked {
      session?.close()
      session = nil
    }
    let (identity, pin) = try credentials.load(deviceId: target.id, expectedReference: reference)
    let pipe = try TLSPipe(target: target, pairing: false, identity: identity, pin: pin)
    try register(operationId, pipe, generation: generation)
    let next = RemoteSession(deviceId: target.id, pipe: pipe, emit: emit)
    do {
      try pipe.open()
      try next.start()
      try locked {
        if !foreground || self.generation != generation || cancelled.contains(operationId) {
          throw TVFailure("cancelled")
        }
        session = next
        operations.removeValue(forKey: operationId)
      }
      return next.payload
    } catch {
      next.close()
      _ = locked { operations.removeValue(forKey: operationId) }
      throw error
    }
  }
  public func cancelOperation(_ id: String) throws {
    let pipe = locked { () -> TLSPipe? in
      if cancelled.count > 256 { cancelled.removeAll() }
      cancelled.insert(id)
      return operations.removeValue(forKey: id)
    }
    pipe?.close()
    try cancelPairing(id)
  }
  public func send(_ id: String, command: String) throws {
    guard let current = locked({ session }), current.id == id else {
      throw TVFailure("connectionLost")
    }
    try current.send(command)
  }
  public func releaseKeys(_ id: String) throws {
    if let current = locked({ session }), current.id == id { try current.releaseKeys() }
  }
  public func disconnect(_ id: String) {
    locked {
      if session?.id == id {
        session?.close()
        session = nil
      }
    }
  }
  public func forgetCredentials(_ deviceId: String) throws {
    locked {
      if session?.deviceId == deviceId {
        session?.close()
        session = nil
      }
    }
    try credentials.forget(deviceId)
  }
  public func close() {
    let current = locked { () -> Pairing? in
      foreground = false
      generation += 1
      operations.values.forEach { $0.close() }
      operations.removeAll()
      session?.close()
      session = nil
      let current = pairing
      pairing = nil
      return current
    }
    discovery.stop()
    if let current {
      current.pipe.close()
      do { try credentials.discard(current.identity.reference) } catch {
        emit(["type": "error", "error": ["code": "storageFailure"]])
      }
    }
  }
}
