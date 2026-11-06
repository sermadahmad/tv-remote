# EAS and Google Play internal testing

Updated 2026-11-06. Public release and over-the-air updates are not automated by this workflow. Implementation commits remain local; no Git push is authorized.

**Latest result:** the complete [cloud workflow](https://expo.dev/accounts/sermadahmad/projects/tv-remote/workflows/01a1b099-ea8c-7999-b4b5-fee5e051c048) passed all three jobs: quality/native checks, signed version-code-4 AAB, and automatic Google Play internal submission. Its source is local commit `f2c00f2`; nothing was pushed. The exact [version-code-4 build](https://expo.dev/accounts/sermadahmad/projects/tv-remote/builds/c4beb346-ed6f-489c-80e3-6c93c5202f7e) passed local signature, identity, adapter, backup, SDK and permission inspection.

The actual [internal-test invitation](https://play.google.com/apps/internaltest/4701176562883428509) opens for `fixemj@gmail.com` and confirms eligibility. Accept the invitation using that account to install on a compatible Android phone. Enrollment and Play installation were left to the tester; no physical phone or TV was available. Google currently displays the temporary name `com.sermadahmad.tvremote (unreviewed)` until app setup/review is complete. Public-release gates remain open.

## Confirmed identity

| Setting                           | Value                                  |
| --------------------------------- | -------------------------------------- |
| Expo owner/project                | `sermadahmad/tv-remote`                |
| Expo project ID                   | `5a67c905-432c-40df-a17c-cc9d12228fcb` |
| Production Android/iOS identifier | `com.sermadahmad.tvremote`             |
| Simulated-test identifier         | `com.sermadahmad.tvremote.uitest`      |
| Play app                          | Universal TV Remote · free · English   |
| Public support email              | `fixemj@gmail.com`                     |
| First release track               | Google Play internal testing           |

Both variants share the Expo project and slug, with distinct application IDs and explicit schemes. The fixture adapter requires both its configuration flag and the exact simulated-test identifier. Changing from the old `dev.universaltv.remote` package creates a separate installation; native pairing credentials are not migrated.

## Workflow

`.eas/workflows/android-internal.yml` runs on future pushes to `main`, or manually from the local source archive:

```sh
npx eas-cli@latest workflow:validate .eas/workflows/android-internal.yml --non-interactive
npx eas-cli@latest workflow:run .eas/workflows/android-internal.yml --wait
```

The quality job uses the SDK 58 image and Node 24.19.0. It installs the lockfile, runs type/lint/format checks, Jest coverage, protocol fixtures, native-module registration, Expo compatibility, deployment configuration guards, and Android native tests. Only a passing quality job enables the signed production AAB build. Only a successful build enables submission of that exact build ID through the `internal` submission profile. Runs are serialized to avoid overlapping store releases.

Production uses remote version-code management and automatic increments; the user-facing version remains explicit in app.json. Generated native app projects are excluded from the source archive and rebuilt through Expo configuration. Local Android variant switches may require deleting only the generated package-name cache, as documented in e2e/README.md.

Inspect the downloaded production AAB before promoting a release, using Google's bundletool (1.18.3 used locally):

```sh
node scripts/inspect-android-bundle.mjs artifacts/qa/production.aab /path/to/bundletool.jar
```

The inspector validates the bundle, production package and embedded configuration, version code, SDK levels, disabled application backup, non-debug signature, and absence of unused microphone, location, storage, overlay, biometric and install-referrer permissions. It reports all declared permissions for review. `EXPECTED_UPLOAD_CERT_SHA256` optionally pins the expected upload-certificate fingerprint; this certificate signs the store upload and is separate from TV pairing identities.

## Account and credential setup

EAS CLI was authenticated as `fixemj` and read access to the supplied project verified. Chrome authentication and EAS CLI authentication are separate. The Android production upload keystore was generated and stored in Expo Credentials; no signing secrets are stored in Git.

The Play app was created in developer account `8712504492627902500`, app ID `4973253414968264631`, with the confirmed package, free pricing and en-US default language. Its support email is `fixemj@gmail.com`. The internal track uses the selected `Universal TV Remote Internal QA` email list with that address as its first tester. Its working invitation link is provided above.

Play App Signing is active. The Console reports signing-certificate SHA-256 `AE:85:39:C4:D4:6A:A1:C2:4B:BC:BC:DB:B3:40:AD:30:82:B1:6D:70:62:2B:44:2C:93:29:76:C3:5A:A7:4E:94`. This is separate from Expo's upload-certificate SHA-256 `DC:64:0A:6C:92:E1:04:D8:6A:EC:F1:7D:A1:6D:BF:C0:63:4C:F0:C3:F6:38:81:93:90:A4:D1:5D:34:29:C3:45`. Changing Play's signing key requires an administrator; no key replacement was attempted.

A dedicated Google Cloud project `tv-remote-publishing` and service account `tv-remote-play-internal@tv-remote-publishing.iam.gserviceaccount.com` were created. Android Publisher API is enabled; no Cloud IAM roles or billing/trial setup were added. Its JSON key is assigned to the production package in Expo Credentials and was successfully used for submission. The temporary local key file was deleted after that verification. To manage this assignment later:

```sh
npx eas-cli@latest credentials -p android
```

Select the production profile and the Google Service Account option for Play Store submissions. Use the app-scoped publisher account, not a Firebase messaging key. The workflow reads the assigned managed key; it does not reference a credential file in the repository. `credentials.json`, keystores, and Google Play service-account key filenames are ignored.

The owner confirmed granting the service account app-scoped testing access. Its successful internal-track submission verifies publisher access. The initial `fixemj` Users and permissions page was restricted, so the owner performed the grant. No account-wide publishing permissions were added by this implementation.

The owner connected `sermadahmad/tv-remote` through the [Expo project's GitHub settings](https://expo.dev/accounts/sermadahmad/projects/tv-remote/github). The dashboard verifies that exact repository and reports Workflows configured. The initial owner-only restriction is resolved. The workflow file must be present on the pushed main branch for automatic runs. A manual local-source run does not push Git commits.

## Validation and rollout status

The first authenticated cloud pilot is [01a1b040-e376-77a4-9541-a784181fcb27](https://expo.dev/accounts/sermadahmad/projects/tv-remote/workflows/01a1b040-e376-77a4-9541-a784181fcb27). Its quality job passed, including 91 Jest tests, 20/20 Expo Doctor checks, and Android native tests. Its signed [Android build](https://expo.dev/accounts/sermadahmad/projects/tv-remote/builds/c6c9a8ce-ff6e-45a6-bcea-61aca3a53118), version code 2, passed signature and identity inspection. Submission failed during credential resolution. A local diagnostic confirmed **Google Service Account Keys cannot be set up in --non-interactive mode** because none is assigned to the production package. No Play release was created.

The permission-cleaned revision ran as [01a1b071-c51d-7215-b2fe-ea4e315ecd6d](https://expo.dev/accounts/sermadahmad/projects/tv-remote/workflows/01a1b071-c51d-7215-b2fe-ea4e315ecd6d). Its quality job and signed [version-code-3 build](https://expo.dev/accounts/sermadahmad/projects/tv-remote/builds/7acc53a2-a4b2-4985-bc4d-fcfbf278c2b6) passed. Bundle inspection confirmed compile 37 / target 36 / minimum 24, backup disabled, production adapter configuration, the expected non-debug upload signature, and only network, Wi-Fi, vibration and the application's private receiver permission. No unused storage, overlay, biometric, install-referrer, microphone or location permissions remain.

After managed credentials were assigned, [submission 815e2ddb-e5e0-413f-a01f-c1757c5eae37](https://expo.dev/accounts/sermadahmad/projects/tv-remote/submissions/815e2ddb-e5e0-413f-a01f-c1757c5eae37) finished successfully for that exact build. Play Console shows internal testing **Active**, release 0.1.0. The QA tester list is checked and saved. An initial eligibility check used Google's general `/apps/testing/` URL and returned App not available. The exact `/apps/internaltest/` URL from the Console's Copy link control was then verified to show the invitation for the intended Google account. Actual Play installation is unverified.

A failed-job recovery [01a1b094-a831-7d9c-8638-cdeaa1d1297b](https://expo.dev/accounts/sermadahmad/projects/tv-remote/workflows/01a1b094-a831-7d9c-8638-cdeaa1d1297b) verified cloud credential preparation, then Google rejected re-uploading already-published version code 3. The final fresh workflow automatically incremented to version code 4 and passed the complete chain. Do not retry a successful submission of the same uploaded AAB.

Both new production native builds passed locally (Android x86_64 and iOS x86_64 simulator). The production Android APK identifies as `com.sermadahmad.tvremote`, minimum API 24, target API 36, compile API 37. The real-adapter emulator smoke passed. These debug checks do not replace inspection of the signed cloud AAB or physical TV validation.

Internal testers should have compatible TVs to validate pairing identity continuity, reconnecting, and actual command execution. Public promotion requires the outstanding hardware/security/release gates in TESTING.md, final store assets, a public privacy-policy URL, and publisher-approved store declarations. For qualifying personal developer accounts created after November 13, 2023, Google additionally requires 12 testers opted into a closed test continuously for 14 days before applying for production access; internal testing does not satisfy that requirement.

References: [Expo Workflows](https://docs.expo.dev/eas/workflows/syntax/), [Expo Android submission](https://docs.expo.dev/submit/android/), [version management](https://docs.expo.dev/build-reference/app-versions/), [Google Play testing](https://support.google.com/googleplay/android-developer/answer/14151465), [testing setup and link propagation](https://support.google.com/googleplay/android-developer/answer/9845334).
