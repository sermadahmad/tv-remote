import XCTest
@testable import TVRemoteCore

final class SessionActivityTests: XCTestCase {
  func testCommandsExtendIdleDeadlineWithoutInboundPings() {
    var now: TimeInterval = 0
    let activity = SessionActivity(clock: { now })
    for _ in 0..<10 {
      now += 5
      activity.record()
      XCTAssertEqual(activity.remaining(), 16)
    }
    now += 15
    XCTAssertEqual(activity.remaining(), 1)
    now += 1
    XCTAssertEqual(activity.remaining(), 0)
  }

  func testResumingAnOldReadDeadlineChecksMostRecentTraffic() {
    var now: TimeInterval = 0
    let activity = SessionActivity(clock: { now })
    now = 15
    activity.record()
    now = 16 // The original blocking read deadline has elapsed.
    XCTAssertEqual(activity.remaining(), 15)
    now = 31
    XCTAssertEqual(activity.remaining(), 0)
  }
}
