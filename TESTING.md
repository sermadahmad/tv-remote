# Validation record

Updated on 2026-11-06. Results below are local checks; configured GitHub Actions have not run remotely. No code has been pushed.

## Environment and completed checks

macOS Intel, Node 24.19.0, Java 17, Swift 6.3, Xcode 26.4, CocoaPods 1.16.2, Android compile API 37 / target 36. Android emulator: Pixel 9a, API 35, x86_64. iOS simulators: iPhone 17 Pro and iPhone SE (3rd generation), iOS 26.4. Native builds include the owned Expo module, MMKV/Nitro, SwiftProtobuf, and swift-certificates.

| Check                                | Recorded result                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Android debug application            | Initial build passed for all four ABIs; final native source rebuilt for x86_64                   |
| Android native JUnit                 | 5 tests passed                                                                                   |
| iOS debug simulator application      | Initial arm64/x86_64 build passed; final native source rebuilt for x86_64; linking passed        |
| Swift package tests on macOS         | 7 tests passed                                                                                   |
| Hosted iOS Keychain XCTest           | 3 tests passed with a signed simulator host                                                      |
| Expo Doctor                          | 20/20 checks passed                                                                              |
| Expo dependency compatibility        | Up to date                                                                                       |
| Production JavaScript export         | iOS and Android Hermes bytecode exports passed                                                   |
| TypeScript                           | Passed                                                                                           |
| Jest                                 | 86 tests passed; 93.51% statements, 90.38% branches in the gated core/application scope          |
| Lint and formatting                  | Passed on the staged implementation snapshots                                                    |
| Android real-adapter Maestro         | Production smoke passed unattended on API 35: onboarding, discovery/empty state, no fixture      |
| Android simulated-TV Maestro         | Full journey passed unattended: cancel/wrong code, pair, remote, themes, rename/reconnect/forget |
| iOS simulator / Maestro              | Full flow unverified: driver startup/accessibility and development-launcher problems             |
| Physical TV / Android phone / iPhone | Unavailable; not tested                                                                          |

## Automated scope

### Persistent navigation revision — 2026-11-06

The persistent Remote/Devices/Saved/Settings tab navigator passed type checking, lint, formatting, 91 Jest tests, and both production Hermes bundle exports. Router integration tests verify preserved tab state, focus-scoped discovery, pairing cancellation to the originating tab, success into the existing Remote tab, and rejection of gestures from an earlier focus. Coordinator tests verify session-scoped key release without disconnecting and rejection of obsolete-session input.

The updated Android simulated-TV Maestro journey passed, including returning to the same touchpad mode after visiting Settings, Android Back returning to Remote, rename/reconnect/forget, and the disconnected Remote state. The production smoke rerun was interrupted by the emulator disconnecting and is being repeated during deployment setup. These results do not establish physical TV compatibility.

Jest uses the actual Lucide CommonJS distribution, an in-memory adapter for deterministic application tests, and component-level rendering. It covers capability gates, hexadecimal entry including A–F, private IPv4 validation, redacted errors, corrupt storage, authenticated identity association, discovery lifecycle/permission recovery, cancellation, bounded retry, foreground/background behavior, switching, forgetting, stale events, D-pad taps/holds, and pairing form behavior. Core/application coverage gates are 90% statements and 85% branches; meaningful behavioral assertions are required.

Native tests use public synthetic RSA fixtures independently generated with Python/OpenSSL. They verify the pairing digest, invalid code rejection, fragmented/coalesced framing, malformed/oversized frames, and a known navigation wire message. Swift additionally tests local address restrictions. Fixture copies are checked by `node scripts/verify-fixtures.mjs`. Three hosted iOS tests validate real simulator Keychain creation, signing, persistence, deletion, and cleanup after interruption. The initial unhosted run failed with OSStatus -34018 (missing entitlement); a separate ad hoc signed app host resolves this requirement. These tests do not exercise a real TV, the system permission prompt, live TV TLS, or native network interruption.

Native tests also cover preventing queued native operations after suspension. Integration tests cover switching while credential deletion is pending, duplicate forget requests, selecting a TV during deletion, and retrying failed deletion. Transport writes never assert that the TV executed a command.

Both Android Maestro flows passed locally on 2026-11-06 with CLI 2.12.1. The full simulated-TV flow checks all six screens and asserts the permanent test banner. The production smoke uses the real adapter and expects discovery's empty state when no TV is available. These are separate application IDs and Metro configurations. The test-only native configuration opens local Metro directly without developer overlays.

UI inspection caught a narrow mode-button label and partial text replacement during rename; both were corrected and the complete simulated journey rerun successfully. Local screenshots and successful flow logs are retained under the ignored `artifacts/qa/` directory. Reproduce them using [e2e/README.md](e2e/README.md). The final production Hermes bundles were also checked for the completed screen labels and absence of milestone placeholder content.

## Reproduce native checks

```sh
npm ci
npx expo prebuild
cd android
./gradlew :tv-remote-native:testDebugUnitTest :app:assembleDebug --console=plain
```

From the repository root on macOS:

```sh
swift test --package-path modules/tv-remote-native/ios/Core
node scripts/test-ios-credentials.mjs
xcodebuild -workspace ios/UniversalTVRemote.xcworkspace \
  -scheme UniversalTVRemote -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /private/tmp/tvremote-ios-build CODE_SIGNING_ALLOWED=NO build
```

For simulator UI automation use the explicitly identified UI test variant described in README. The production bundle identifier must never be used with fixture configuration. Maestro telemetry can be disabled with `MAESTRO_CLI_NO_ANALYTICS=1`.

The credential script requires the `xcodeproj` Ruby gem supplied by CocoaPods. It generates a disposable simulator host and an isolated Keychain access group under the temporary directory; it never edits the app's generated Xcode project. Set `SIMULATOR_ID` to select a simulator and `TVREMOTE_TEST_DERIVED_DATA` to reuse a build cache. Run simulator tests sequentially; Maestro and XCTest share the simulator's test manager. The module registration check validates both Android and iOS descriptors, including the explicit iOS podspec path.

## Hardware matrix required before release

Record the actual TV manufacturer/model, firmware, Android TV Remote Service version, phone model/OS, app revision, network setup, date, and result for each row. An emulator is not a substitute for either physical phone platform.

| Scenario                                                        | Android phone         | iPhone                |
| --------------------------------------------------------------- | --------------------- | --------------------- |
| Discovery and permission denial/recovery                        | Not tested            | Not tested            |
| Six-character pairing, wrong code, timeout, cancellation        | Not tested            | Not tested            |
| Pairing/control certificate continuity; reject changed identity | Not tested            | Not tested            |
| Reconnect after app and phone restart                           | Not tested            | Not tested            |
| Navigation, tap/hold/release, rapid input                       | Not tested            | Not tested            |
| Volume/mute and media in multiple TV applications               | Not tested            | Not tested            |
| Connected power and standby/wake limitations                    | Not tested            | Not tested            |
| Keyboard counters, Unicode, deletion, focus, app behavior       | Not implemented       | Not implemented       |
| Network loss/change and Wi-Fi without internet                  | Not tested            | Not tested            |
| Background, foreground, switching, forgetting, credential reset | Not tested            | Not tested            |
| Small/large phones, screen reader, dynamic text, reduced motion | Pending device review | Pending device review |

## Remaining release gates

The initial displayed-code trust policy is proposed and requires hardware and security review. The control endpoint must present the same pinned public key learned during pairing; a mismatch fails closed. Keystore/Keychain credential lifecycle, backup exclusions, and interrupted native operations require on-device validation. Transport success is not TV-side execution confirmation. There is no certified compatibility list yet.

Debug builds and JavaScript exports do not replace signed release inspection. Signing, distribution identities, final icons/screenshots, store metadata/privacy forms, and minimum-OS device tests remain pending.

The dependency audit reports 31 advisories (30 moderate, 1 low), with no high/critical advisories. These include tooling advisories for glob/minimatch and a deepmerge advisory without a published fix. Do not force Expo/Jest downgrades to silence the audit. Dependency remediation remains a release gate; rerun compatibility/native checks after dependency changes.
