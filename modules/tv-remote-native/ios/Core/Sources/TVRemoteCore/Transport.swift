import Foundation
import Network
import Security
import X509

final class TLSPipe {
  private let condition = NSCondition()
  private let queue = DispatchQueue(label: "tv-remote.network")
  private var connection: NWConnection?
  private var decoder = FrameDecoder()
  private var frames: [Data] = []
  private var ready = false
  private var problem: Error?
  private var certificate: SecCertificate?

  init(target: TVTarget, pairing: Bool, identity: Identity, pin: Data?) throws {
    guard pairing || pin != nil else { throw TVFailure("authenticationFailed") }
    let tls = NWProtocolTLS.Options()
    guard let localIdentity = sec_identity_create(identity.tlsIdentity) else {
      throw TVFailure("authenticationFailed")
    }
    sec_protocol_options_set_local_identity(tls.securityProtocolOptions, localIdentity)
    sec_protocol_options_set_min_tls_protocol_version(tls.securityProtocolOptions, .TLSv12)
    let parameters = NWParameters(tls: tls, tcp: NWProtocolTCP.Options())
    parameters.requiredInterfaceType = .wifi
    let endpoint: NWEndpoint
    if !pairing && !target.serviceName.isEmpty {
      endpoint = .service(
        name: target.serviceName, type: "_androidtvremote2._tcp", domain: "local.", interface: nil)
    } else {
      guard Self.isLocalAddress(target.host),
        let port = NWEndpoint.Port(rawValue: UInt16(pairing ? target.pairingPort : target.port))
      else { throw TVFailure("networkUnavailable") }
      endpoint = .hostPort(host: NWEndpoint.Host(target.host), port: port)
    }
    sec_protocol_options_set_verify_block(
      tls.securityProtocolOptions,
      { [weak self] _, trust, complete in
        guard let self else {
          complete(false)
          return
        }
        let reference = sec_trust_copy_ref(trust).takeRetainedValue()
        guard let chain = SecTrustCopyCertificateChain(reference) as? [SecCertificate],
          let certificate = chain.first
        else {
          complete(false)
          return
        }
        do {
          _ = try Credentials.publicKey(certificate)
          let parsed = try Certificate(
            derEncoded: Array(SecCertificateCopyData(certificate) as Data))
          guard parsed.notValidBefore <= Date(), parsed.notValidAfter >= Date() else {
            throw TVFailure("authenticationFailed")
          }
          if let pin {
            let actual = try Credentials.pin(certificate)
            guard pin.count == actual.count,
              zip(pin, actual).reduce(UInt8(0), { $0 | ($1.0 ^ $1.1) }) == 0
            else { throw TVFailure("identityChanged") }
          }
          // A provisional peer can exchange pairing messages only. It is never a control session.
          self.condition.lock()
          self.certificate = certificate
          self.condition.unlock()
          complete(true)
        } catch {
          self.fail(error)
          complete(false)
        }
      }, queue)
    let connection = NWConnection(to: endpoint, using: parameters)
    self.connection = connection
    connection.stateUpdateHandler = { [weak self] state in
      guard let self else { return }
      switch state {
      case .ready:
        self.condition.lock()
        self.ready = true
        self.condition.broadcast()
        self.condition.unlock()
        self.receive()
      case .failed(let error): self.fail(Self.map(error))
      case .cancelled: self.fail(TVFailure("connectionLost"))
      default: break
      }
    }
  }

  static func isLocalAddress(_ host: String) -> Bool {
    if host.lowercased().hasPrefix("fe80:") || host.lowercased().hasPrefix("fd")
      || host.lowercased().hasPrefix("fc")
    {
      return IPv6Address(String(host.split(separator: "%")[0])) != nil
    }
    let components = host.split(separator: ".", omittingEmptySubsequences: false)
    guard components.count == 4,
      components.allSatisfy({ !$0.isEmpty && $0.utf8.allSatisfy({ (48...57).contains($0) }) })
    else { return false }
    let parts = components.compactMap { UInt8($0) }
    guard parts.count == 4 else { return false }
    return parts[0] == 10 || (parts[0] == 172 && (16...31).contains(parts[1]))
      || (parts[0] == 192 && parts[1] == 168) || (parts[0] == 169 && parts[1] == 254)
  }
  static func map(_ error: NWError) -> TVFailure {
    // DNS-SD's kDNSServiceErr_PolicyDenied identifies local network privacy denial.
    if case .dns(let code) = error, code == -65570 { return TVFailure("permissionDenied") }
    if case .posix(let code) = error, code == .EACCES || code == .EPERM {
      return TVFailure("permissionDenied")
    }
    return TVFailure("connectionLost")
  }
  func open() throws {
    guard let connection else { throw TVFailure("nativeUnavailable") }
    connection.start(queue: queue)
    condition.lock()
    defer { condition.unlock() }
    let deadline = Date().addingTimeInterval(10)
    while !ready && problem == nil {
      if !condition.wait(until: deadline) {
        problem = TVFailure("connectionTimeout")
        connection.cancel()
        break
      }
    }
    if let problem { throw problem }
  }
  func peerCertificate() throws -> SecCertificate {
    condition.lock()
    defer { condition.unlock() }
    guard let certificate else { throw TVFailure("authenticationFailed") }
    return certificate
  }
  private func fail(_ error: Error) {
    condition.lock()
    if problem == nil { problem = error }
    condition.broadcast()
    condition.unlock()
  }
  private func receive() {
    guard let connection else { return }
    connection.receive(minimumIncompleteLength: 1, maximumLength: 16384) {
      [weak self] data, _, finished, error in
      guard let self else { return }
      do {
        if let data, !data.isEmpty {
          let messages = try self.decoder.append(data)
          self.condition.lock()
          self.frames.append(contentsOf: messages)
          let overflow = self.frames.count > 64
          self.condition.broadcast()
          self.condition.unlock()
          if overflow { throw TVFailure("protocolFailure") }
        }
        if let error { throw Self.map(error) }
        if finished { throw TVFailure("connectionLost") }
        self.receive()
      } catch {
        self.fail(error)
        self.connection?.cancel()
      }
    }
  }
  func read(timeout: TimeInterval = 10) throws -> Data {
    condition.lock()
    defer { condition.unlock() }
    let deadline = Date().addingTimeInterval(timeout)
    while frames.isEmpty && problem == nil {
      if !condition.wait(until: deadline) { throw TVFailure("connectionTimeout") }
    }
    if let problem { throw problem }
    return frames.removeFirst()
  }
  func write(_ data: Data) throws {
    guard let connection else { throw TVFailure("nativeUnavailable") }
    let semaphore = DispatchSemaphore(value: 0)
    let result = WriteResult()
    connection.send(
      content: try FrameDecoder.encode(data),
      completion: .contentProcessed { error in
        result.error = error.map(Self.map)
        semaphore.signal()
      })
    guard semaphore.wait(timeout: .now() + 1) == .success else {
      close()
      throw TVFailure("commandTimeout")
    }
    if let error = result.error { throw error }
  }
  func close() {
    fail(TVFailure("connectionLost"))
    connection?.cancel()
  }
}

private final class WriteResult: @unchecked Sendable { var error: Error? }
