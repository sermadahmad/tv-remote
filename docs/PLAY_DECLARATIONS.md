# Google Play declaration evidence — 1.0.0 preparation

Reviewed November 7, 2026 for Universal TV Remote (`com.sermadahmad.tvremote`),
publisher SERMAD AHMAD, contact `fixemj@gmail.com`. This record distinguishes
verified answers from submitted Console state. It is not a claim that Google
has approved a declaration or release.

## Declaration worksheet

| App content item   | Answer / content supported by current evidence                                                                | Submission condition                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Privacy policy     | `https://universal-tv-remote-support.sermadahmad024.chatgpt.site/privacy/`                                    | Confirm unauthenticated HTTPS access and final in-app Settings link before saving                                         |
| Ads                | No                                                                                                            | App code/dependency inventory has no advertising integration; Play update prompts are app functionality, not advertising  |
| App access         | Remote functions require compatible physical TV hardware and its local pairing authentication; no app account | Supply the English instructions below; do not invent credentials or mark hardware-dependent access as unrestricted        |
| Content rating     | General-purpose household utility                                                                             | Complete the factual questionnaire and retain Google's assigned ratings; the intended 13+ audience is not itself a rating |
| Target audience    | Ages 13–15, 16–17, and 18+; not child-directed                                                                | Confirmed by the publisher for this release                                                                               |
| Data safety        | **Unresolved Play update metadata category mapping**                                                          | Save draft only until the question below is resolved; no speculative blanket No-collection declaration                    |
| Advertising ID     | No                                                                                                            | No AdvertisingIdClient use, ad SDK, or requested AD_ID permission in app source/configuration; inspect final AAB          |
| Government apps    | Not a government app                                                                                          | Private developer's TV remote; no government service or affiliation                                                       |
| Financial features | No financial features                                                                                         | No purchases, banking, lending, investment, insurance, payments, or other financial functions                             |
| Health apps        | No health features                                                                                            | No health, medical, fitness, or health-data integration                                                                   |
| Trader status      | Existing account trader status applies to this app                                                            | Explicitly confirmed by the publisher; retain verified account details rather than inventing new identity/contact data    |

No app account is created. TV pairing establishes a device credential, not a
user account. Do not invent a sign-up/deletion website or enter a Google Account
as a reviewer login. Local deletion and support correspondence requests are
explained by the public privacy policy. Google's
[account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
apply their account-creation conditions separately.

## Reviewer access instructions

**Instruction name:** Local Wi-Fi TV setup — no app account

1. Use an Android phone and a compatible Android TV or Google TV with Android TV
   Remote Service available. This is a phone remote; it is not installed on the
   TV. The TV must be on, started, and reachable on the same local Wi-Fi network.
2. Open Universal TV Remote and choose Find my TV. Allow local-network access if
   the operating system requests it. No app username, password, paid subscription,
   or developer account is required.
3. In Devices, select the TV. Enter the six characters displayed on that TV using
   0–9 and A–F. The code is generated for that TV pairing attempt; there is no
   universal, reusable, or remotely supplied reviewer code.
4. After connection, test direction buttons/OK, Home, Back, volume/mute and the
   touchpad. Available controls depend on TV service support and firmware.
5. If discovery finds no TV, use Need help? or Advanced connection options →
   Connect using IP address with the TV's private IPv4 address. There is no cloud
   relay to a developer's TV. Without compatible hardware, introduction,
   Settings, help, and discovery states remain accessible, but actual TV control
   cannot be exercised.
6. Saved provides rename and Forget TV. TV text entry is unavailable in this
   release. Standby/wake is TV-specific and is not guaranteed.

If Google requests a demonstration, provide a genuine recording with the tested
phone/TV and these steps. Do not add a production simulation or fake credentials
to bypass the hardware requirement. Keep real pairing codes, keys, addresses,
and unrelated personal information out of submitted recordings.

## Data-handling inventory

| Component / source              | Verified behavior                                                                                                | Declaration consequence                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| TV native module / adapter      | Local discovery and TLS pairing/control with the user's chosen TV; no developer relay                            | Explain local TV processing and credentials; do not call it cloud analytics                                      |
| MMKV preferences                | TV names/endpoints/identity hints, selected TV, appearance/haptics/introduction flags remain on the phone        | No developer upload path identified                                                                              |
| Android credentials             | Non-exportable Android Keystore RSA keys; encrypted pin/reference metadata; app backup disabled                  | Forget removes per-TV credentials; final signed manifest still needs inspection                                  |
| iOS credentials / SecureStore   | Device-only, non-synchronizing Keychain data; explicit Forget deletion                                           | Do not promise uninstall removes Keychain items; see SDK 58 SecureStore behavior                                 |
| App update module               | `com.google.android.play:app-update:2.1.0`; production Android gate; Play owns check/download/install operations | Account for Google's update-service disclosure; update availability checks occur automatically                   |
| Runtime JavaScript dependencies | Expo/RN UI/platform modules, Zustand, MMKV/Nitro, animation, icons/SVG, native security/local network access     | No account, ad, analytics, remote crash-reporting, billing, or developer telemetry client configured in app code |
| Voluntary support               | External email correspondence sent by the user to `fixemj@gmail.com`                                             | Public policy describes received email/content and deletion requests; no in-app message/attachment upload form   |
| Public website                  | Static privacy/support/testing pages; no added analytics, ads, forms or sign-in                                  | Hosting providers necessarily process web requests; do not claim the website processes no information            |
| Tester group                    | Optional Google Group / Play test, separately operated through Google Accounts                                   | Group membership is not an app account and is not automatically a Play test opt-in                               |

Source references: `package.json`, `app.json`, `src/infrastructure/storage.ts`,
`src/core/tv/TVRepository.ts`, `src/features/app-updates/`, and both native modules.
Review the final AAB's effective dependency graph/manifest as well as source;
unused code and source configuration alone do not establish runtime behavior.

The production `releaseRuntimeClasspath` inspection passed on November 7. Its
Google chain is app-update 2.1.0 → core-common 2.0.3, play-services-basement
18.1.0 and play-services-tasks 18.0.2. No advertising, Firebase, Sentry,
Amplitude or analytics dependency was found in that graph. The full local
inspection log is `/private/tmp/tvremote-release-sdk-inventory.log`; preserve it
with the final release evidence. Google's base/tasks disclosure describes its
latest SDK versions, so it should not be treated as a version-specific audit of
every older transitive artifact.

### Google Play update metadata — explicit unresolved item

Google's [in-app update disclosure](https://developer.android.com/guide/playcore/in-app-updates#data-safety)
identifies device metadata, application version, and installed modules/asset
packs for update availability and download-size decisions. It states encryption,
no third-party transfer, and a fixed retention period without specifying its
length. It does not identify exact metadata fields or map them to Data safety
checkbox categories.

The app does not read advertising IDs, IMEI, MAC addresses, a Google Account, or
a list of other installed applications for this feature. It does not request
those permissions or send TV data to Google. Those facts do **not** prove which
information Google's own Play process uses.

Do not equate an app version with an individual device ID, an installed module
with the user's list of other apps, or compatibility metadata with performance
diagnostics without supporting evidence. Conversely, do not mark No data
collected merely because there is no custom backend. Google requires the form
to cover applicable SDK handling and provides a draft state for unresolved
answers. Its [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
and [data-type examples](https://developer.android.com/privacy-and-security/declare-data-use)
need to be applied to actual fields and uses.

Google's separate [base/basement/tasks SDK disclosure](https://developers.google.com/android/guides/play-data-disclosure)
says those listed libraries do not collect end-user data. That statement is not
an exemption for the different Play In-App Updates SDK. The
[Google Play SDK Index](https://developer.android.com/distribute/sdk-index)
was consulted; its public index is a client-rendered search interface and no
SDK-specific checkbox mapping was obtained in this review.

**Question requiring authoritative clarification before Data safety submission:**
For the app-update 2.1.0 flexible-update feature, which specific fields of
"device metadata, application version, and installed modules/asset packs" are
collected off-device, which required Play Data safety data types do they map to,
and what collection/optional/deletion answers apply when checks run
on launch/foreground? Establish whether processing wholly owned by the Play
Store changes the app developer's required form responses. Retain the cited
SDK guidance or Google support response with the final field-by-field answers.
Do not infer an exemption merely because Play is a system application.

No Data safety declaration has been submitted by this document-writing task.
If classification remains unresolved, completing other declarations does not
make the app ready for a closed-test review submission.

## Release evidence to append after execution

Record final AAB SHA-256, version code/name, source commit, expected upload
certificate, SDK graph, permissions, and actual Data safety form export. Then
record each declaration's saved/submitted state, review outcome, closed-track
URL, group URL, actual opted-in count, and hardware feedback. Do not claim that
an internal-test invitation or group member count satisfies the closed-test
production gate.

The public policy source is [PRIVACY.md](../PRIVACY.md). Platform-sensitive
retention details follow [Expo SDK 58 SecureStore documentation](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/)
and the owned native credential implementation. In-app privacy and listing
requirements are documented in [Google's review preparation guide](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).
