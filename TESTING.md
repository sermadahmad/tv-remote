# Validation record

Updated on 2026-11-07. Historical cloud runs and the latest local checks are identified below. No push, deployment or cloud monitoring was performed during the branding and beginner-setup task.

## Environment and completed checks

macOS Intel, Node 24.19.0, Java 17, Swift 6.3, Xcode 26.4, CocoaPods 1.16.2, Android compile API 37 / target 36. Android emulator: Pixel 9a, API 35, x86_64. iOS simulators: iPhone 17 Pro and iPhone SE (3rd generation), iOS 26.4. Native builds include the owned Expo module, MMKV/Nitro, SwiftProtobuf, and swift-certificates.

| Check                             | Recorded result                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Android debug application         | Initial all-ABI build passed; hardware fixes built for arm64 phone and x86_64 fixture                        |
| Android native JUnit              | 7 tests passed                                                                                               |
| iOS debug simulator application   | Initial arm64/x86_64 build passed; hardware fixes and KeepAwake linked in x86_64 simulator                   |
| Swift package tests on macOS      | 9 tests passed                                                                                               |
| Hosted iOS Keychain XCTest        | 3 tests passed with a signed simulator host                                                                  |
| Expo Doctor                       | 20/20 checks passed                                                                                          |
| Expo dependency compatibility     | Up to date                                                                                                   |
| Production JavaScript export      | iOS and Android Hermes bytecode exports passed                                                               |
| TypeScript                        | Passed                                                                                                       |
| Jest                              | 110 tests passed; 93.70% statements, 91.03% branches in the gated core/application scope                     |
| Lint and formatting               | Passed on the staged implementation snapshots                                                                |
| Android real-adapter Maestro      | Production smoke passed unattended on API 35: onboarding, discovery/empty state, no fixture                  |
| Android simulated-TV Maestro      | Full journey passed unattended: cancel/wrong code, pair, remote, themes, rename/reconnect/forget             |
| Embedded release bundle / Maestro | Version-code-3 AAB derivative passed normal and 360 × 640 dp / 130% text checks                              |
| Final EAS workflow                | Quality/native, signed version-code-4 build and automatic internal submission all passed                     |
| Signed version-code-4 AAB         | Package, upload signature, real adapter, backup, SDK and cleaned permissions verified                        |
| Play internal tester availability | Active internal release; intended account's invitation verified; phone installation not performed            |
| iOS simulator / Maestro           | Brand/setup Release smoke passed at enlarged text; full connected journey pending                            |
| Physical Android phone / TV       | Android 14 CPH2363: discovery/pairing, pinned control, sustained input, lifecycle and keyboard checks passed |
| Android Keystore instrumentation  | 2 physical-phone tests passed: non-exportable TLS signing/persistence/deletion and off-main-thread cleanup   |
| Physical iPhone / TV              | Unavailable; not tested                                                                                      |

## Android hardware fixes — 2026-11-06

Phone: CPH2363 (OP533FL1), Android 14 / API 34, arm64. TV advertises `DAWLANCE GSMART 4KTV`; exact model, firmware and Android TV Remote Service version are pending. Both devices use the same Wi-Fi LAN. Tests use the isolated **Universal TV Remote Dev** package `com.sermadahmad.tvremote.dev` and the real native adapter. The existing Play version-code-4 release does not contain these fixes.

The original pairing failure reproduced before any protocol request: Android's Conscrypt client-certificate operation failed with Keystore `INCOMPATIBLE_DIGEST`. Authorizing prehashed signing exposed its second raw-signature requirement (`INCOMPATIBLE_PADDING_MODE`). Both required authorizations are now present without exporting keys or changing TLS trust. The updated app reached request/options/configuration and the TV code exchange. The user entered the displayed code directly on the phone and confirmed connection; the app received TV volume events, establishing that the pinned control endpoint also connected. No pairing code is retained in logs or this record.

Both isolated library instrumentation tests passed on the physical phone (Android 14). The signing/persistence test also passed on the API 35 emulator; the additional cleanup test was then added and passed on the phone. It exercises both PKCS#1 prehashed and raw RSA private-key paths used by Conscrypt, validates public-key verification, asserts that the private key has no exported encoding, reopens committed metadata and verifies credential deletion. JVM-only protocol tests did not exercise Android Keystore and therefore could not catch the original bug.

New JavaScript tests verify phone-keyboard dismissal/Done submission and that authentication, identity and permission failures survive lifecycle resume until explicit retry. Default-route network callbacks no longer restart the connection coordinator. Shared forms now use a keyboard-avoiding scroll container for SDK 58 edge-to-edge windows. Expo keep-awake applies while the app is visible; the temporary USB stay-awake preference used during diagnosis was restored to its original value, `0`.

The user confirmed Home, Back and volume effects on the TV. TV-originated feedback verified volume 9 → 10 → 9. With the TV on and reachable, 40 alternating navigation commands over 165.6 seconds stayed connected; live native logs showed the same control session and heartbeat gaps longer than 16 seconds during input. This exercises the corrected bidirectional idle policy. An earlier run lost TV reachability and exhausted the bounded retries; after the user confirmed the TV was on, explicit reconnect succeeded without another code. Background/foreground recovery also passed with the same Android process ID and no repeat of the main-thread TLS crash; the app reconnected using saved credentials. A later app restart also reconnected without entering another code. Phone keyboard inspection verified the full field, inline private-address validation message and submit button above the keyboard, including after discovery changes the content height. All four touchpad gestures were exercised without disconnecting; component tests assert the requested reversed key mapping. Settings/Remote tab switching preserved the connection and touchpad mode. Media playback, standby/wake, network loss while using USB, phone restart, multiple-TV switching and physical forgetting/re-pairing remain unverified. The physical iPhone and full model/version matrix remain open.

The final hardware-fix source passed type checking, lint, formatting, all 100 Jest tests and the 90%/85% coverage gates, Expo Doctor 20/20, SDK-matrix dependency checks, fixture/native registration checks, Android arm64 development and x86_64 production builds, and an iOS x86_64 simulator build. Both final production Hermes exports passed. Both Android Maestro flows passed: the fixture journey asserts Pair and Save Name are visible with the software keyboard open; the production flow exercises real discovery, manual-IP validation with the keyboard open, and all four tabs. Its scan assertion accepts searching, actual advertisements, empty results or an actionable permission/network state. Scan deadlines are covered by deterministic service tests. Early emulator runs timed out during cold startup or used an incorrect empty-only scan expectation; those failures are not counted as passes.

## Deployment revision — 2026-11-06

The permanent production identifier is `com.sermadahmad.tvremote`; the simulated build uses `.uitest`. Both new application identities were built locally for Android x86_64 and iOS x86_64 simulator. The final Android permission cleanup rebuilt successfully with all 5 native JUnit tests. Both final Hermes bundle exports, 91 Jest tests and coverage gates, types, lint and formatting passed. Both updated Android Maestro flows passed with the permanent identifiers, including the SDK 58 route-anchor refinement.

EAS workflow runs were triggered from local source archives without pushing Git. Cloud quality jobs passed, including locked installation, compatibility checks and Android native tests. The first signed production AAB (version code 2) built successfully and its package, production adapter flag, SDK levels and non-debug upload signature were inspected with bundletool, jarsigner and keytool. Its permission review led to blocking unused storage, overlay, biometric and install-referrer permissions. The final full pipeline passed all three jobs and automatically submitted the inspected version-code-4 AAB to internal testing; see [DEPLOYMENT.md](DEPLOYMENT.md).

The new Play app record, support email and initial internal tester list were created. The owner connected the Expo repository and granted the publisher service account access. Its managed key successfully submitted the app; Play Console reports the internal track Active. The Console's exact internal-test invitation URL opens for `fixemj@gmail.com` and confirms eligibility. An earlier check used the general testing URL; it did not establish internal-test availability. Phone enrollment/installation is unverified. See DEPLOYMENT.md for the complete pipeline run and delivery record.

An additional release smoke passed using a universal APK derived from the exact inspected version-code-3 AAB. This ran the embedded production bundle without Metro: onboarding, real-adapter empty discovery, Remote/Devices/Saved/Settings and Android Back. The derivative was signed locally with the public debug key for emulator installation; the original store AAB and its upload signature were unchanged. Reproduce with `e2e/production-release-smoke.yaml` and e2e/README.md.

A second release inspection used a 360 × 640 dp emulator viewport and 130% system text. Settings, discovery, saved devices, returning to Remote with Android Back, and the persistent tab bar passed. Remote and Settings screenshots were inspected for clipping and spacing. The emulator's original size, density and text scale were restored. This covers those disconnected states; it does not establish screen-reader support or connected-control accessibility on hardware.

## Automated scope

### Persistent navigation revision — 2026-11-06

The persistent Remote/Devices/Saved/Settings tab navigator passed type checking, lint, formatting, 91 Jest tests, and both production Hermes bundle exports. Router integration tests verify preserved tab state, focus-scoped discovery, pairing cancellation to the originating tab, success into the existing Remote tab, and rejection of gestures from an earlier focus. Coordinator tests verify session-scoped key release without disconnecting and rejection of obsolete-session input.

The updated Android simulated-TV Maestro journey passed, including returning to the same touchpad mode after visiting Settings, Android Back returning to Remote, rename/reconnect/forget, and the disconnected Remote state. After the emulator restart, the real-adapter production smoke passed with the permanent package `com.sermadahmad.tvremote`. These results do not establish physical TV compatibility.

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

Android Keystore regression (separate library test UID; requires an emulator or phone):

```sh
./android/gradlew -p android :tv-remote-native:assembleDebugAndroidTest
adb -s <serial> install -r modules/tv-remote-native/android/build/outputs/apk/androidTest/debug/tv-remote-native-debug-androidTest.apk
adb -s <serial> shell am instrument -w -r \
  -e class expo.modules.tvremote.CredentialTlsTest \
  expo.modules.tvremote.test/androidx.test.runner.AndroidJUnitRunner
```

This test cannot establish TV interoperability. Do not clear a user's app data for testing; use the isolated development application described in README.

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

| Scenario                                                        | Android phone                                                                | iPhone          |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------- |
| Discovery and permission denial/recovery                        | Discovery passed; denial pending                                             | Not tested      |
| Pairing, wrong code, timeout, cancellation                      | Pairing passed; negative paths tested with fixtures                          | Not tested      |
| Pairing/control identity continuity; changed identity rejection | Continuity passed; physical rejection pending                                | Not tested      |
| Reconnect after app and phone restart                           | App restart passed; phone reboot pending                                     | Not tested      |
| Navigation, hold/release and rapid input                        | Home/Back and 40 sustained navigation taps passed; holds/rapid input pending | Not tested      |
| Volume/mute and media across TV apps                            | TV volume/mute feedback observed; media pending                              | Not tested      |
| Connected power and standby/wake                                | Not tested                                                                   | Not tested      |
| Phone keyboard avoidance and submission                         | Field, validation and submit button passed on CPH2363                        | Not tested      |
| TV keyboard counters, Unicode, deletion and focus               | Not implemented                                                              | Not implemented |
| Network changes and Wi-Fi without internet                      | TV-unreachable recovery observed; remaining cases pending                    | Not tested      |
| Background, foreground, switching and forgetting                | Lifecycle passed; switching/forgetting tested with fixtures                  | Not tested      |
| Small/large phones, screen reader, dynamic text, reduced motion | Partial simulator review; full device review pending                         | Not tested      |

## Branding and beginner setup validation

The Screen + D-pad identity is implemented in `assets/brand/`; see `BRAND.md`
for dimensions, color roles, font provenance, and offline regeneration. The
beginner setup and troubleshooting contract is documented in `UX.md`.

| Check                                   | Actual result                                                                                                                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Asset generation and repeatability      | 53 generated outputs verified, including 24 PNGs, editable/outlined SVGs and the typed runtime registry                                                                                                                                                      |
| Launcher images                         | 1024 × 1024; main/background RGB without alpha; adaptive foreground/monochrome and splash have transparency                                                                                                                                                  |
| Adaptive geometry                       | Visible foreground/monochrome pixels fit the central 66dp safe circle; circle, rounded-square and squircle previews reviewed                                                                                                                                 |
| Contrast                                | Normal/pressed button text, both theme palettes and switch/control graphics meet the scripted 4.5:1 text / 3:1 graphics checks                                                                                                                               |
| Type, lint, format and JavaScript tests | Passed; 110 tests across 12 suites                                                                                                                                                                                                                           |
| Domain/application coverage             | 93.70% statements, 91.03% branches; configured gates passed                                                                                                                                                                                                  |
| Expo                                    | Doctor 20/20; dependency compatibility, all three config variants, asset paths, fixture isolation and native registration passed                                                                                                                             |
| Production Hermes exports               | Android and iOS passed from the final UI source                                                                                                                                                                                                              |
| Android native                          | x86_64 local Release build passed; 7 native protocol/activity tests passed                                                                                                                                                                                   |
| Android release identity                | `com.sermadahmad.tvremote`, version code 1, min API 24, target 36, compile 37; embedded `uiTest: false`; local QA signature verified                                                                                                                         |
| iOS native                              | Unsigned x86_64 simulator Release build passed using `com.sermadahmad.tvremote.dev`                                                                                                                                                                          |
| Android launcher and splash             | Actual circular launcher icon and centered symbol on navy reviewed from the Release cold-start capture; no clipping or stretching observed                                                                                                                   |
| iOS launcher and splash                 | Actual launcher icon and centered teal/mint symbol on navy captured from the release; no stretching or clipping observed                                                                                                                                     |
| iOS enlarged-text journey               | Maestro passed onboarding, power-button help, return to Devices, dark/light settings and Remote on a 375 × 667 simulator at extra-extra-extra-large text                                                                                                     |
| Android small-phone fixture journey     | Maestro passed on a 360 × 640 layout: onboarding/help, pairing cancellation, incorrect code, keyboard-visible pairing and rename, navigation/touchpad, connected Help return, themes, rename/reconnect, forget and the primary setup action after forgetting |

Both Android production smoke flows passed against the final embedded Release APK,
covering first launch, real-adapter discovery, the advanced disclosure, private-IP
validation with the keyboard open, all four tabs and Android Back. The flows wait
for the first scan to settle before entering the form so a layout change cannot
move a button between lookup and tap. Two legacy `dev.universaltv.remote*` QA apps
initially caused an Android URL chooser; they were temporarily disabled for the
development-client URL flow and restored to their original default states.

Android large-text automation also passed at 360 × 640 and 130% system text,
including rereading the introduction, the advanced manual-address disclosure,
and wrapped validation plus the submit button above the open software keyboard.
The test restores the original font scale after the run. A persisted development-
client relaunch initially created duplicate routing roots; the fixture test now
clears its isolated app state before opening the test server, as the full journey
already does.

Release evidence is under the ignored `artifacts/qa/brand-ux/` directory, including
`android-launcher-verified.png`, `android-splash-verified.png`,
`ios-launcher-verified.png`, `ios-splash-verified.png`, large-text screenshots and
the Maestro run directories. The tracked visual overview is
`assets/brand/review/brand-review.png`. The
Android APK is signed with the generated **local debug key for emulator QA**;
it is not an EAS upload-key-signed store artifact. Its final SHA-256 is
`8a8244c2c93a318e77e7f3b57486c05b69070f8bc62521ce99e7297f4d2981c4`.
The packaged adaptive-icon XML references background, foreground and monochrome
layers. Permissions remain internet, network/Wi-Fi state, vibration and the
application-scoped internal receiver permission. No new cloud build, submission,
push or promotion was performed for this task. App IDs, credentials, onboarding
preferences, transport behavior and capability restrictions were preserved.

Initial concurrent-build Android automation attempts were obstructed by emulator
System UI dialogs and driver startup timeouts. Those attempts do not count as
passing UI results. VoiceOver/TalkBack on physical devices, minimum-OS hardware,
and a complete accessibility audit remain pending; enlarged-text automation is
not a substitute for them. No new real-TV compatibility claim is made.

## Remaining release gates

The initial displayed-code trust policy is proposed and requires hardware and security review. The control endpoint must present the same pinned public key learned during pairing; a mismatch fails closed. Keystore/Keychain credential lifecycle, backup exclusions, and interrupted native operations require on-device validation. Transport success is not TV-side execution confirmation. There is no certified compatibility list yet.

Debug builds and JavaScript exports do not replace signed release inspection. Android signing, permanent distribution identities, signed-AAB inspection, full EAS pipeline and internal tester invitation are verified. Production phone installation, store listing screenshots, metadata/privacy forms, and minimum-OS device tests remain pending; see DEPLOYMENT.md for current account and cloud results.

The dependency audit reports 31 advisories (30 moderate, 1 low), with no high/critical advisories. These include tooling advisories for glob/minimatch and a deepmerge advisory without a published fix. Do not force Expo/Jest downgrades to silence the audit. Dependency remediation remains a release gate; rerun compatibility/native checks after dependency changes.
