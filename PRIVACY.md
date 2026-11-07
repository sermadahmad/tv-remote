# Privacy information — development draft

Updated 2026-11-07 for the unreleased application. Review this document against the signed release binary before publication.

Universal TV Remote communicates with compatible TVs on the phone's local network. The application has no account system, custom backend, advertising, or analytics. It does not request location, Bluetooth, microphone, or contact access.

Discovery receives TV service names and network endpoints. The application stores saved TV names, endpoints, public identity fingerprints, and preferences locally. Native Android Keystore or iOS Keychain storage protects pairing keys and trust records; JavaScript stores opaque credential references rather than private keys. Credentials are excluded from application backup and migration. The security and backup behavior still requires physical-device validation.

The app uses local-network access to discover and connect to a TV. Internet access is not required for TV control. Development builds separately connect to the developer's Metro server to load application code; they are not distribution builds.

Use **Forget TV** to delete the selected TV's local credentials and saved metadata. This does not revoke the remote's authorization on the TV. Remove that authorization through the TV's own settings when needed. Optional haptics and appearance preferences remain on the phone.

No remote telemetry or crash-reporting service is configured in application code. Android/iOS and distribution services may provide their own diagnostics under the user's platform settings. This repository's UI-test variant uses simulated devices and must not be distributed as the production application.

The approved support contact is fixemj@gmail.com. Before public release, confirm the publisher's legal identity, privacy contact handling, and a public policy URL; review platform privacy forms, dependency behavior, and the final signed binaries. No privacy-policy website has been published by this project.

## Optional Android application updates

Production Android installations check Google Play for a newer application version
when the app opens or returns from the background. The check uses Google's
Play In-App Updates SDK (app-update 2.1.0). It does not send TV names, TV network
addresses, pairing codes, credentials, or remote commands to our servers; the app
has no custom update backend.

Google Play runs its own processes under its terms. Google's SDK disclosure lists
device metadata, application version, and installed modules/asset packs as data
used to determine update availability and download size. Google states that this
data is encrypted, is not transferred to third parties, and is deleted after a
fixed retention period. See the [Google Play update SDK disclosure](https://developer.android.com/guide/playcore/in-app-updates#data-safety).
Review the final Play Data safety declaration against this SDK and the signed
release; this draft does not declare that every platform service collects no data.

Internet access is needed for update checks and downloads. Offline checks do not
prevent local TV control. The user may postpone the notice, accept Google Play's
confirmation to download, and separately choose when to restart for installation.
There are no application-triggered mandatory updates. Saved TVs, preferences and
pairing credentials are retained by a normal package update. iOS does not use this
Android update feature. No advertising or application analytics SDK is added.
