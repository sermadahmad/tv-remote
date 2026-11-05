import Foundation
import Network

public struct TVTarget {
  public let id: String
  public let name: String
  public let host: String
  public let port: Int
  public let pairingPort: Int
  public let serviceName: String
  public init(
    id: String, name: String, host: String, port: Int, pairingPort: Int, serviceName: String
  ) throws {
    guard !id.isEmpty, (1...65535).contains(port), (1...65535).contains(pairingPort),
      name.count <= 4096
    else { throw TVFailure("protocolFailure") }
    self.id = id
    self.name = name
    self.host = host
    self.port = port
    self.pairingPort = pairingPort
    self.serviceName = serviceName
  }
  var payload: [String: Any] {
    [
      "id": id, "name": name, "host": host, "port": port, "pairingPort": pairingPort,
      "serviceName": serviceName, "protocol": "android-tv-v2",
    ]
  }
}

final class Discovery {
  private let queue = DispatchQueue(label: "tv-remote.discovery")
  private let emit: ([String: Any]) -> Void
  private var browser: NWBrowser?
  private var connections: [String: NWConnection] = [:]
  private var generation = 0
  init(emit: @escaping ([String: Any]) -> Void) { self.emit = emit }
  func start() {
    queue.sync {
      stopOnQueue()
      generation += 1
      let current = generation
      let parameters = NWParameters.tcp
      parameters.requiredInterfaceType = .wifi
      let next = NWBrowser(
        for: .bonjour(type: "_androidtvremote2._tcp", domain: "local."), using: parameters)
      next.stateUpdateHandler = { [weak self] state in
        guard let self, current == self.generation else { return }
        if case .ready = state { self.emit(["type": "discoveryReady"]) }
        if case .waiting(let error) = state {
          self.emit(["type": "error", "error": ["code": TLSPipe.map(error).code]])
        }
        if case .failed(let error) = state {
          self.emit(["type": "error", "error": ["code": TLSPipe.map(error).code]])
        }
      }
      next.browseResultsChangedHandler = { [weak self] _, changes in
        guard let self, current == self.generation else { return }
        for change in changes {
          switch change {
          case .added(let result): self.resolve(result, generation: current)
          case .removed(let result):
            if case .service(let name, _, _, _) = result.endpoint {
              self.connections.removeValue(forKey: name)?.cancel()
              self.emit(["type": "deviceLost", "deviceId": "dns:\(name)"])
            }
          default: break
          }
        }
      }
      browser = next
      next.start(queue: queue)
    }
  }
  private func resolve(_ result: NWBrowser.Result, generation: Int) {
    guard case .service(let name, _, _, _) = result.endpoint else { return }
    let parameters = NWParameters.tcp
    parameters.requiredInterfaceType = .wifi
    let probe = NWConnection(to: result.endpoint, using: parameters)
    connections[name]?.cancel()
    connections[name] = probe
    probe.stateUpdateHandler = { [weak self, weak probe] state in
      guard let self, let probe, generation == self.generation else { return }
      if case .ready = state {
        if let path = probe.currentPath, case .hostPort(let host, let port) = path.remoteEndpoint,
          let target = try? TVTarget(
            id: "dns:\(name)", name: name, host: "\(host)", port: Int(port.rawValue),
            pairingPort: 6467, serviceName: name)
        {
          self.emit(["type": "deviceFound", "target": target.payload])
        }
        probe.cancel()
        self.connections.removeValue(forKey: name)
      }
      if case .failed = state {
        probe.cancel()
        self.connections.removeValue(forKey: name)
      }
    }
    probe.start(queue: queue)
    queue.asyncAfter(deadline: .now() + 5) { [weak self, weak probe] in
      guard let self, let probe, self.connections[name] === probe else { return }
      probe.cancel()
      self.connections.removeValue(forKey: name)
    }
  }
  private func stopOnQueue() {
    generation += 1
    browser?.cancel()
    browser = nil
    connections.values.forEach { $0.cancel() }
    connections.removeAll()
  }
  func stop() { queue.sync { stopOnQueue() } }
}
