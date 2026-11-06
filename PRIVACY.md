# Privacy information — development draft

Updated 2026-11-06 for the unreleased application. Review this document against the signed release binary before publication.

Universal TV Remote communicates with compatible TVs on the phone's local network. The application has no account system, custom backend, advertising, or analytics. It does not request location, Bluetooth, microphone, or contact access.

Discovery receives TV service names and network endpoints. The application stores saved TV names, endpoints, public identity fingerprints, and preferences locally. Native Android Keystore or iOS Keychain storage protects pairing keys and trust records; JavaScript stores opaque credential references rather than private keys. Credentials are excluded from application backup and migration. The security and backup behavior still requires physical-device validation.

The app uses local-network access to discover and connect to a TV. Internet access is not required for TV control. Development builds separately connect to the developer's Metro server to load application code; they are not distribution builds.

Use **Forget TV** to delete the selected TV's local credentials and saved metadata. This does not revoke the remote's authorization on the TV. Remove that authorization through the TV's own settings when needed. Optional haptics and appearance preferences remain on the phone.

No remote telemetry or crash-reporting service is configured in application code. Android/iOS and distribution services may provide their own diagnostics under the user's platform settings. This repository's UI-test variant uses simulated devices and must not be distributed as the production application.

The approved support contact is fixemj@gmail.com. Before public release, confirm the publisher's legal identity, privacy contact handling, and a public policy URL; review platform privacy forms, dependency behavior, and the final signed binaries. No privacy-policy website has been published by this project.
