# Architecture

Universal TV Remote is a local-network Android/iOS application. The sole production adapter is Android TV Remote v2. There is no account, server, analytics, advertising, or cloud control path.

## Boundaries

`src/app` contains Expo Router screens. Feature hooks coordinate presentation; application services own discovery and connection use cases. `src/core/tv` defines protocol-neutral types, capability validation, safe errors, repository behavior, and the connection coordinator. Infrastructure implements persistence and the native adapter. `modules/tv-remote-native` owns platform networking, TLS, keys, Protobuf framing, pairing, and command writes.

Dependencies point from presentation through application services into domain contracts. Infrastructure implements those contracts. Screens never create sockets or inspect credentials. Kotlin and Swift share pinned schemas and independent protocol fixtures, not handwritten wire formats.

## Ownership and cancellation

One `ConnectionCoordinator` owns the selected TV, operation generation, AbortController, retry schedule, and connection state. Every replacement invalidates previous work. Late results are disconnected or cancelled rather than attached to the current UI. Authentication and identity changes require re-pairing; transient failures receive at most five retries with jitter. Native code never initiates a second retry loop.

Discovery has a separate lifecycle. A focused device screen starts a 15-second browse. Refresh replaces the old browse; leaving the screen or backgrounding stops it. Native service identities deduplicate discovered entries, and service resolution refreshes saved addresses before connecting.

The adapter translates AbortSignal into native operation cancellation. Events contain session identifiers so old disconnects and capability updates cannot mutate the selected session.

## State and storage

Zustand contains serializable device, connection, discovery, preference, and UI state. MMKV persists nonsensitive device metadata, local names, onboarding, and preferences. SecureStore persists opaque native credential references using device-only accessibility on iOS.

Android generates non-exportable RSA keys in Android Keystore. Native trust metadata is AES-GCM encrypted with a separate Keystore key. iOS generates RSA keys and certificates through Security and Apple swift-certificates and stores identity and pin metadata in Keychain. RSA storage is not represented as Secure Enclave backed.

Keys, certificates, TLS sessions, and transport objects stay native. Pairing codes remain transient. Forgetting deletes credentials before metadata; deletion errors are surfaced. TV-side revocation is not claimed.

## Interactive commands

The domain checks capabilities before dispatch. Native writers preserve order, cap pending work at 32 entries, reserve release capacity, expire stale interactive events after 250 ms, and close stalled sessions. Commands are not replayed or retried after reconnection. A write receipt means transport dispatch, not confirmed TV-side execution.

Tap and held-key gestures are separate. Long press emits start/end messages without an extra tap. Touchpad swipes become directional key commands; there is no pointer protocol.

## Current validation boundary

Protocol implementations are source based. Automated tests do not establish physical TV compatibility. With no TV or physical phones currently available, the real discovery/pairing/authentication gate remains open. Keyboard/IME is deliberately unverified and unavailable in the remote UI. Release readiness also requires signed release builds, store assets, privacy forms, and a hardware compatibility matrix.
