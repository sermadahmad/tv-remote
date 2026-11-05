import ExpoModulesCore
import TVRemoteCore

struct TVTargetRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var host: String = ""
  @Field var port: Int = 6466
  @Field var pairingPort: Int = 6467
  @Field var serviceName: String = ""
  func target() throws -> TVTarget {
    try TVTarget(
      id: id, name: name, host: host, port: port, pairingPort: pairingPort, serviceName: serviceName
    )
  }
}

public final class TVRemoteNativeModule: Module {
  private let clientLock = NSLock()
  private var storedClient: TVClient?
  private var foreground = true
  private var client: TVClient {
    clientLock.lock()
    defer { clientLock.unlock() }
    if let storedClient { return storedClient }
    let next = TVClient { [weak self] event in self?.sendEvent("onTVEvent", event) }
    if !foreground { next.close() }
    storedClient = next
    return next
  }
  private func work(_ promise: Promise, _ block: @escaping () throws -> Any?) {
    DispatchQueue.global(qos: .userInitiated).async {
      do { promise.resolve(try block()) } catch let error as TVFailure {
        promise.reject(error.code, error.code)
      } catch { promise.reject("protocolFailure", "protocolFailure") }
    }
  }
  private func setForeground(_ active: Bool) {
    clientLock.lock()
    foreground = active
    let existing = storedClient
    clientLock.unlock()
    if active { existing?.resume() } else { existing?.close() }
  }
  public func definition() -> ModuleDefinition {
    Name("TVRemoteNative")
    Events("onTVEvent")
    AsyncFunction("ensureLocalNetworkPermission") { () -> Void in
      // Bonjour access triggers Apple's system prompt; there is no standalone permission request API.
    }
    AsyncFunction("startDiscovery") { (_: String, promise: Promise) in
      self.work(promise) {
        try self.client.startDiscovery()
        return nil
      }
    }
    AsyncFunction("stopDiscovery") { (promise: Promise) in
      self.work(promise) {
        self.client.stopDiscovery()
        return nil
      }
    }
    AsyncFunction("beginPairing") { (id: String, target: TVTargetRecord, promise: Promise) in
      self.work(promise) { try self.client.beginPairing(operationId: id, target: target.target()) }
    }
    AsyncFunction("submitPairingCode") { (id: String, code: String, promise: Promise) in
      self.work(promise) { try self.client.submitPairingCode(id, code: code) }
    }
    AsyncFunction("cancelPairing") { (id: String, promise: Promise) in
      self.work(promise) {
        try self.client.cancelPairing(id)
        return nil
      }
    }
    AsyncFunction("connect") {
      (id: String, target: TVTargetRecord, reference: String, promise: Promise) in
      self.work(promise) {
        try self.client.connect(operationId: id, target: target.target(), reference: reference)
      }
    }
    AsyncFunction("cancelOperation") { (id: String, promise: Promise) in
      self.work(promise) {
        try self.client.cancelOperation(id)
        return nil
      }
    }
    AsyncFunction("send") { (id: String, _: String, command: String, promise: Promise) in
      self.work(promise) {
        try self.client.send(id, command: command)
        return nil
      }
    }
    AsyncFunction("releaseKeys") { (id: String, promise: Promise) in
      self.work(promise) {
        try self.client.releaseKeys(id)
        return nil
      }
    }
    AsyncFunction("disconnect") { (id: String, promise: Promise) in
      self.work(promise) {
        self.client.disconnect(id)
        return nil
      }
    }
    AsyncFunction("forgetCredentials") { (id: String, promise: Promise) in
      self.work(promise) {
        try self.client.forgetCredentials(id)
        return nil
      }
    }
    OnAppEntersForeground { self.setForeground(true) }
    OnAppEntersBackground { self.setForeground(false) }
    OnDestroy { self.setForeground(false) }
  }
}
