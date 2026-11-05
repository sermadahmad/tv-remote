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

## Local commits

The user requested local milestone commits with passing type, lint, test, and build checks before committing, and no push. Build failures must be fixed or reported as blockers; incomplete milestones must not be called production-ready.
