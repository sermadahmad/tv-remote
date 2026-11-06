import Foundation

/// Server pings stop during active input, so successful traffic in either direction resets idle time.
final class SessionActivity {
  private let lock = NSLock()
  private let clock: () -> TimeInterval
  private var lastActivity: TimeInterval

  init(clock: @escaping () -> TimeInterval = { ProcessInfo.processInfo.systemUptime }) {
    self.clock = clock
    lastActivity = clock()
  }

  func record() {
    lock.lock()
    lastActivity = max(lastActivity, clock())
    lock.unlock()
  }

  func remaining() -> TimeInterval {
    lock.lock()
    defer { lock.unlock() }
    return max(0, 16 - max(0, clock() - lastActivity))
  }
}
