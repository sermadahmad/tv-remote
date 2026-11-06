# Local UI automation

Flows target a development client and Metro on port 8081. Maestro 2.12.1 was used locally. No cloud service is required. Disable Maestro analytics with both environment variables below. An emulator cannot establish compatibility with a real TV.

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

The test-only development-client configuration opens `http://localhost:8081` directly and disables first-run developer overlays. These options apply only to `APP_VARIANT=ui-test`; they follow the [Expo SDK 58 development-client configuration](https://docs.expo.dev/versions/v58.0.0/sdk/dev-client/).

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

Expo SDK 58 accepts reserved `__expo_*` launcher parameters. If the deep link leaves the launcher visible, the production flow enters `http://localhost:8081` in its address field and closes the first-run developer menu. The UI-test flow uses its configured direct launch. Port forwarding must be configured first. Production and UI-test clients use distinct identifiers and generated `exp+` schemes. A flag alone cannot activate the fixture adapter in the production application.

Both Android flows passed unattended locally on 2026-11-06. The rename flow asserts the field value before saving and the saved name afterward. Avoid an unconditional `hideKeyboard` command: when the emulator's software keyboard is already hidden, it can navigate away from the screen.

## iOS and limitations

The iOS native simulator build and hosted Keychain tests passed. Full Maestro iOS execution remains unverified after driver/accessibility startup failures and development-launcher interruptions on iOS 26.4. The YAML flows are checked in for further simulator validation; do not count them as passing iOS coverage.

Fixture credentials live in memory. The fixture flow validates application behavior during one run, not restart persistence, native TLS, discovery permissions, or TV command execution. Final run results are maintained in [TESTING.md](../TESTING.md).
