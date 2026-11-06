# Development milestones

The implementation follows the accepted architecture and prioritizes transport correctness. This file records scope and acceptance gates; TESTING.md records execution evidence.

| Milestone               | Implementation                                                             | Acceptance gate                                               |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Research                | Pinned protocol source, Expo 58 compatibility, platform APIs, trust policy | Document assumptions and licenses                             |
| Foundation              | Strict TypeScript, Expo Router, state/storage, design system, Jest         | Type/lint/format/tests and native builds                      |
| Native proof of concept | Discovery, RSA identities, pinned TLS, pairing, framing, startup, keys     | Native fixtures plus physical TV pairing/reconnect/navigation |
| Discovery/pairing UI    | States, refresh, IP entry, hexadecimal code, retry/cancel                  | Automated component/integration and simulator tests           |
| Remote UI               | Capability-gated navigation, volume, media, power, touchpad                | Automated interactions; physical control results              |
| Reliability/devices     | Bounded recovery, stale attempt cancellation, rename/forget                | Failure and lifecycle tests; hardware interruptions           |
| Polish                  | Themes, accessible controls, consistent layout                             | Simulator inspection and accessibility review                 |
| Release                 | CI, release builds, signing, assets, store/privacy forms                   | All acceptance criteria and documented hardware matrix        |

## Hardware update

Initially no TV or physical phone was available, so the user authorized emulator/simulator validation. On 2026-11-06 an Android 14 phone and Dawlance TV became available on the same Wi-Fi network. Discovery and displayed-code pairing now work after correcting Android Keystore TLS signing authorizations. The user confirmed that Home, Back and volume work on the TV. The full hardware matrix, exact TV version details, physical iPhone testing and security review remain open. No UI automation or fake adapter result may be presented as real TV communication.

The original phase 3 exit criterion requires both phone platforms and is not yet met. The explicitly identified fixture build remains available for deterministic UI tests. TV text input remains disabled while application-specific IME behavior is unverified; the user's current keyboard report concerns phone input fields and is addressed separately with keyboard avoidance and explicit submission.

## Local commits

The user requested local milestone commits with passing type, lint, test, and build checks before committing, and no push. Build failures must be fixed or reported as blockers; incomplete milestones must not be called production-ready.

| Phase | Local commit | Validation and remaining scope                                                                                 |
| ----- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| 1     | `c566f17`    | Architecture, protocol provenance, licensing, risk and hardware gates recorded                                 |
| 2     | `681c986`    | Foundation checks and native dependency builds passed                                                          |
| 3     | `77723ae`    | Native builds, 5 JUnit, 7 Swift core and 3 hosted Keychain tests passed; TV TLS/pairing/control unverified     |
| 4     | `0f85be5`    | Discovery/pairing UI, operation-scoped event validation and cancellation tests passed                          |
| 5     | `96b5362`    | Capability-gated remote, tap/hold and touchpad tests passed; actual TV execution unverified                    |
| 6     | `ad90b60`    | Staged type/lint/format, 86 tests and both mobile bundle builds passed; deletion/switching race tests included |
| 7     | `9b27f7c`    | Appearance, haptics and settings; type/lint/format, 86 tests and production Hermes exports passed              |

QA follow-up commits are `703c7d3` (phase 7, narrow remote labels) and `96bfd46` (phase 6, selecting an existing name for replacement). The final phase 8 commit adds the separate UI-test launcher configuration, two passing Android Maestro flows, reproducible run instructions, privacy/store drafts, and the validation record. Both production Hermes bundles and all 86 JavaScript tests pass; Android/iOS native build and native test evidence is recorded in TESTING.md.

These are development deliverables. Android upload signing and a signed cloud build are now verified. Distribution assets, full iOS UI automation, simulator accessibility review, minimum-OS coverage, keyboard support, and physical-device testing remain open release gates in TESTING.md. No phase 3 hardware or phase 8 production-release acceptance gate is marked passed.

## Persistent tabs and deployment revision

`b6eaba6` adds the persistent Remote, Devices, Saved and Settings tabs, pairing returns, focus-scoped discovery and session-guarded key release. `e55c206` applies the SDK 58 route anchor and card onboarding configuration after emulator verification. Types, lint, formatting, 91 Jest tests, both Hermes bundles, Android/iOS native builds and both Android Maestro flows passed with the permanent application identifiers.

`f2c00f2` links the existing Expo project, isolates the simulated package and scheme, manages Android version codes remotely, and configures a checks → signed AAB → exact-build internal submission workflow. Cloud runs upload a local source archive; they do not push commits. The owner resolved the account grants. A complete workflow from that commit passed and automatically submitted the inspected version-code-4 AAB. The intended account's internal-test invitation is verified; physical installation and TV validation remain open. Full results are maintained in DEPLOYMENT.md.

## First Android hardware revision

The diagnostic build has a separate `.dev` application ID and always uses the real adapter. Android Keystore TLS signing, phone keyboard avoidance, foreground keep-awake, persistent authentication errors and reversed touchpad axes are implemented. Hardware diagnosis also identified an inbound-only idle timer and TLS cleanup on Android's main thread; the fixes count traffic in both directions and detach stale resources before asynchronous cleanup. Check TESTING.md for actual build/test and hardware results. The existing internal store release does not yet include this revision.
