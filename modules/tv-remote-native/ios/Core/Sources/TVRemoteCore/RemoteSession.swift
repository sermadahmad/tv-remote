import Foundation
import SwiftProtobuf

final class RemoteSession {
  let id = UUID().uuidString
  let deviceId: String
  private let pipe: TLSPipe
  private let emit: ([String: Any]) -> Void
  private let lock = NSLock()
  private let writer = DispatchQueue(label: "tv-remote.writer")
  private var pending = 0
  private var held = Set<String>()
  private var active = true
  private var negotiatedFeatures: Int32 = 0
  private var features: Int32 {
    get {
      lock.lock()
      defer { lock.unlock() }
      return negotiatedFeatures
    }
    set {
      lock.lock()
      negotiatedFeatures = newValue
      lock.unlock()
    }
  }

  init(deviceId: String, pipe: TLSPipe, emit: @escaping ([String: Any]) -> Void) {
    self.deviceId = deviceId
    self.pipe = pipe
    self.emit = emit
  }
  var payload: [String: Any] {
    ["sessionId": id, "deviceId": deviceId, "capabilities": capabilities]
  }
  private var capabilities: [String: Any] {
    var keys: [String: String] = [:]
    for key in Self.keyCodes.keys {
      if features & 2 == 0 {
        keys[key] = "unsupported"
      } else if ["volumeUp", "volumeDown", "mute"].contains(key) && features & 64 == 0 {
        keys[key] = "unverified"
      } else if key == "power" && features & 32 == 0 {
        keys[key] = "unverified"
      } else {
        keys[key] = "supported"
      }
    }
    return [
      "keys": keys, "text": "unverified",
      "longPress": features & 2 != 0 ? "supported" : "unsupported",
    ]
  }
  func start() throws {
    var started = false
    let deadline = Date().addingTimeInterval(10)
    while !started {
      guard Date() < deadline else { throw TVFailure("connectionTimeout") }
      let message = try Remote_RemoteMessage(
        serializedBytes: pipe.read(timeout: max(0.1, deadline.timeIntervalSinceNow)))
      started = try handle(message)
    }
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self else { return }
      do {
        while self.isActive {
          _ = try self.handle(Remote_RemoteMessage(serializedBytes: self.pipe.read(timeout: 16)))
        }
      } catch {
        if self.isActive {
          self.close()
          self.emit(["type": "disconnected", "sessionId": self.id])
        }
      }
    }
  }
  private var isActive: Bool {
    lock.lock()
    defer { lock.unlock() }
    return active
  }
  private func handle(_ message: Remote_RemoteMessage) throws -> Bool {
    var response = Remote_RemoteMessage()
    if message.hasRemoteConfigure {
      features = message.remoteConfigure.code1 & (1 | 2 | 32 | 64)
      response.remoteConfigure.code1 = features
      response.remoteConfigure.deviceInfo.unknown1 = 1
      response.remoteConfigure.deviceInfo.unknown2 = "1"
      response.remoteConfigure.deviceInfo.packageName = "atvremote"
      response.remoteConfigure.deviceInfo.appVersion = "0.1.0"
    } else if message.hasRemoteSetActive {
      response.remoteSetActive.active = features
    } else if message.hasRemotePingRequest {
      response.remotePingResponse.val1 = message.remotePingRequest.val1
    } else if message.hasRemoteError {
      throw TVFailure("protocolFailure")
    } else if message.hasRemoteSetVolumeLevel {
      let volume = message.remoteSetVolumeLevel
      if volume.volumeMax > 0 {
        emit([
          "type": "volume", "sessionId": id, "level": volume.volumeLevel, "max": volume.volumeMax,
          "muted": volume.volumeMuted,
        ])
      }
    }
    let data = try response.serializedData()
    if !data.isEmpty { try pipe.write(data) }
    return message.hasRemoteStart
  }
  func send(_ command: String) throws {
    guard let bytes = command.data(using: .utf8),
      let data = try JSONSerialization.jsonObject(with: bytes) as? [String: String],
      data["type"] == "key",
      let key = data["key"], let code = Self.keyCodes[key], let action = data["action"],
      features & 2 != 0
    else { throw TVFailure("unsupportedCommand") }
    let direction: Remote_RemoteDirection
    switch action {
    case "tap": direction = .short
    case "press": direction = .startLong
    case "release": direction = .endLong
    default: throw TVFailure("unsupportedCommand")
    }
    lock.lock()
    guard active, pending < (action == "release" ? 32 : 28) else {
      lock.unlock()
      throw TVFailure("queueFull")
    }
    pending += 1
    lock.unlock()
    let submitted = ProcessInfo.processInfo.systemUptime
    let result = CommandResult()
    let done = DispatchSemaphore(value: 0)
    writer.async { [self] in
      defer {
        lock.lock()
        pending -= 1
        lock.unlock()
        done.signal()
      }
      do {
        guard isActive else { throw TVFailure("connectionLost") }
        if action != "release" && ProcessInfo.processInfo.systemUptime - submitted > 0.25 {
          throw TVFailure("commandTimeout")
        }
        if action == "press" && held.contains(key) { throw TVFailure("unsupportedCommand") }
        if action == "release" && !held.contains(key) { return }
        var message = Remote_RemoteMessage()
        guard let keyCode = Remote_RemoteKeyCode(rawValue: code) else {
          throw TVFailure("unsupportedCommand")
        }
        message.remoteKeyInject.keyCode = keyCode
        message.remoteKeyInject.direction = direction
        try pipe.write(message.serializedData())
        if action == "press" { held.insert(key) }
        if action == "release" { held.remove(key) }
      } catch { result.error = error }
    }
    guard done.wait(timeout: .now() + 1) == .success else {
      close()
      throw TVFailure("commandTimeout")
    }
    if let error = result.error { throw error }
  }
  func releaseKeys() throws {
    let result = CommandResult()
    let done = DispatchSemaphore(value: 0)
    writer.async { [self] in
      defer { done.signal() }
      do {
        guard isActive else { return }
        // Include presses already queued before this release barrier.
        for key in Array(held) {
          guard let code = Self.keyCodes[key], let keyCode = Remote_RemoteKeyCode(rawValue: code)
          else {
            throw TVFailure("unsupportedCommand")
          }
          var message = Remote_RemoteMessage()
          message.remoteKeyInject.keyCode = keyCode
          message.remoteKeyInject.direction = .endLong
          try pipe.write(message.serializedData())
          held.remove(key)
        }
      } catch { result.error = error }
    }
    guard done.wait(timeout: .now() + 1) == .success else {
      close()
      throw TVFailure("commandTimeout")
    }
    if let error = result.error {
      close()
      throw error
    }
  }
  func close() {
    lock.lock()
    active = false
    lock.unlock()
    pipe.close()
  }
  static let keyCodes: [String: Int] = [
    "up": 19, "down": 20, "left": 21, "right": 22, "select": 23, "back": 4, "home": 3,
    "volumeUp": 24, "volumeDown": 25, "mute": 164, "power": 26, "playPause": 85, "play": 126,
    "pause": 127, "next": 87, "previous": 88, "fastForward": 90, "rewind": 89,
  ]
}

private final class CommandResult: @unchecked Sendable { var error: Error? }
