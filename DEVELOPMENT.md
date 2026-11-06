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

The user clarified that no TV or physical phone is currently available and authorized emulator/simulator validation. Hardware gates therefore remain unverified. No UI automation or fake adapter result may be presented as real TV communication.

The original phase 3 hardware exit criterion cannot be met in this environment. Subsequent UI work proceeds against the explicitly identified fixture build under the user's simulator authorization. This is a development-scope adjustment, not a pass of the transport, security, or release hardware gates. The final app disables keyboard input while application-specific IME behavior is unverified.

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

These are local development deliverables. Signing, distribution assets, full iOS UI automation, simulator accessibility review, minimum-OS coverage, keyboard support, and physical-device testing remain open release gates in TESTING.md. No phase 3 hardware or phase 8 production-release acceptance gate is marked passed.
