# Local UI automation

The beginner flows use **Find your TV**, **Need help?**, and **Advanced connection
options**. Manual address entry stays inside the advanced disclosure. The full
fixture journey also exercises inline pairing help, power-button guidance and
visiting Help while a TV is connected.

`large-text.yaml` runs on the isolated `.uitest` application. Set the emulator's
system font scale to 1.3 before running it, and restore the previous value after
the run. It covers the introductory action and keyboard-visible manual validation.
`ios-brand-smoke.yaml` uses the real-adapter `.dev` simulator Release build and
covers enlarged-text setup, help return and themes without selecting a TV.
iOS tab selectors include the platform's accessible tab-position suffix.

Wait for Android's `sys.boot_completed=1` and the boot animation to stop before
starting Maestro. Run one driver per device. A System UI error dialog or a driver
startup timeout is an environment failure, not a passing application test. Set
`MAESTRO_DRIVER_STARTUP_TIMEOUT=180000` for slow local driver startup, and run
native compilation and emulator journeys sequentially on constrained machines.

The development-client flows use Metro on port 8081. The release flow below uses the application's embedded bundle. Maestro 2.12.1 was used locally; no Maestro cloud service is required. Disable Maestro analytics with both environment variables below. An emulator cannot establish compatibility with a real TV.

## Android

Start an Android emulator, then build the normal app for the real-adapter smoke test:

```sh
npm ci
npx expo prebuild --platform android --no-install
cd android
./gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=4
cd ..
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081
TVREMOTE_DISABLE_WATCHMAN=1 npm start -- --localhost
```

In another terminal:

```sh
MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
  maestro test e2e/production-smoke.yaml --debug-output artifacts/production
```

Stop Metro before changing variants. Generate and build the separate simulated-TV application, preserving native caches on subsequent builds:

The development and test-only development-client configurations open `http://localhost:8081` directly and disables first-run developer overlays. These options apply to `APP_VARIANT=ui-test` and `APP_VARIANT=development`; they follow the [Expo SDK 58 development-client configuration](https://docs.expo.dev/versions/v58.0.0/sdk/dev-client/).

```sh
APP_VARIANT=ui-test npx expo prebuild --platform android --no-install --no-clean
# When switching package IDs in an existing generated project, invalidate
# the package-name cache (do not delete native compilation caches):
rm -f android/build/generated/autolinking/autolinking.json \
  android/build/generated/autolinking/package.json.sha \
  android/build/generated/autolinking/package-lock.json.sha
cd android
APP_VARIANT=ui-test ./gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=4
cd ..
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
APP_VARIANT=ui-test TVREMOTE_DISABLE_WATCHMAN=1 npm start -- --localhost
```

```sh
MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
  maestro test e2e/ui-test.yaml --debug-output artifacts/ui-test
```

Use the emulator's actual ABI instead of x86_64 on Apple Silicon. Add `--device <id>` before `test` when multiple devices are present. `launchApp.clearState` resets only the selected test application's local data. The UI-test flow asserts the persistent simulated-TV banner, cancels pairing, rejects an incorrect code, pairs with `A1B2C3`, exercises navigation and touchpad mode, changes themes, renames, reconnects, and forgets the fixture TV.

Expo SDK 58 accepts reserved `__expo_*` launcher parameters. If the deep link leaves the launcher visible, the production flow enters `http://localhost:8081` in its address field and closes the first-run developer menu. The UI-test flow opens its explicit development-client URL after clearing fixture state. Port forwarding must be configured first. Production and UI-test clients use distinct identifiers and explicit schemes (`universaltvremote` and `universaltvremote-uitest`). Generated schemes are disabled because both variants share the Expo project slug `tv-remote`. A flag alone cannot activate the fixture adapter in the production application.

Both Android flows passed unattended locally on 2026-11-06. The rename flow asserts the field value before saving and the saved name afterward. Avoid an unconditional `hideKeyboard` command: when the emulator's software keyboard is already hidden, it can navigate away from the screen.

## Embedded production bundle

`production-release-smoke.yaml` targets an installed release APK and does not use Metro or the development launcher. It passed on the API 35 emulator with the embedded bundle from the inspected production version-code-3 AAB, covering onboarding, real discovery's empty state, all four tabs, and Android Back.

For emulator QA, derive a universal APK with Google's bundletool. The following uses the generated application's public debug key only to sign this local QA derivative; the original AAB retains its verified Expo upload signature. A Play installation uses Google's separate app-signing key.

```sh
java -jar /path/to/bundletool.jar build-apks \
  --bundle=artifacts/qa/production-v3.aab \
  --output=/private/tmp/tvremote-release-qa.apks --mode=universal \
  --ks=android/app/debug.keystore --ks-key-alias=androiddebugkey \
  --ks-pass=pass:android --key-pass=pass:android --overwrite
unzip -p /private/tmp/tvremote-release-qa.apks universal.apk > /private/tmp/tvremote-release-qa.apk
adb install -r /private/tmp/tvremote-release-qa.apk
MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
  maestro test e2e/production-release-smoke.yaml --debug-output artifacts/release-qa
```

Adjust the source AAB filename for later version codes. Debug-signed QA and Play-signed installations cannot replace each other in place. Emulator QA cannot verify Play download eligibility, phone Keystore/Keychain behavior, or real TV compatibility.

## iOS and limitations

The iOS native simulator build and hosted Keychain tests passed. For the branding revision, `ios-brand-smoke.yaml` passed against an unsigned simulator Release build on iOS 26.4 at extra-extra-extra-large text: onboarding, physical-power-button help, return to Devices, dark/light settings and Remote. This real-adapter smoke does not exercise TV pairing or the complete connected fixture journey on iOS. Earlier development-launcher/driver failures are retained in the historical validation record.

Fixture credentials live in memory. The fixture flow validates application behavior during one run, not restart persistence, native TLS, discovery permissions, or TV command execution. Final run results are maintained in [TESTING.md](../TESTING.md).

The hardware-fix revision also tests submit controls with the software keyboard enabled: pairing and rename in the fixture flow, plus manual-address validation in the real-adapter flow. Run one UI automation session per device; do not run `uiautomator dump` against that device concurrently. Cold builds and an overloaded emulator caused startup timeouts during diagnosis; the full fixture journey subsequently passed with exclusive automation after native compilation finished.

When real TVs are on the LAN, the production smoke accepts searching, discovery advertisements, empty results or actionable network/permission states; an empty-scan-only assertion would be incorrect. The branding revision waits for the initial scan to settle before scrolling to the advanced form, so the searching-to-empty layout change cannot move a button between lookup and tap. Deterministic service tests also cover scan deadlines. The hardware-fix rerun observed the Dawlance advertisement from the API 35 emulator after macOS local-network access was enabled.
