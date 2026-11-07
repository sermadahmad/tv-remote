# Optional Google Play updates

Production Android uses the owned Android-only Expo module `app-updates-native`
and Google's `com.google.android.play:app-update:2.1.0`. There is no OTA JavaScript
service, remote-version backend, store-page scraping, forced update, or iOS update
prompt. Play's available version code determines availability, independently of
the user-facing version string. Existing remote EAS version-code increments remain
unchanged. Google chooses availability for the account, device and release track;
uploading an AAB alone does not mean all users can receive it.

The application coordinator lives above navigation. A small top notice reserves
layout space and waits until onboarding/pairing has finished. Later hides that
notice for the current visit. A genuine background/foreground visit clears the
dismissal; tab switches, inactive interruptions and returns from the Google Play
confirmation do not. Downloads continue through Play while the app is usable.
Completion produces a separate Restart to update / Later notice. The application
calls completeUpdate only after Restart is selected, after existing TV connection
cleanup. If installation fails while foregrounded, the existing connection
coordinator resumes. Background recovery stays with its normal lifecycle policy.
No saved-device or credential record is deleted by this feature.

Settings provides manual checking, download status and a fixed Play Store link
with HTTPS fallback. Manual checking overrides the current-visit dismissal.
Automatic failures are quiet. Internet or Play availability cannot block TV
control. Update messages are separate from TV transport errors. Native events
are validated and Google Play objects/Intents never cross into persisted JS state.

The native client refreshes AppUpdateInfo before every consent attempt, uses the
Task-returning startUpdateFlow API without editing generated activities, owns its
install-state listener, bounds availability queries and releases resources on
module destruction. Only FLEXIBLE is requested. The native bridge also gates on
the production package and a non-debuggable build. JS gates additionally exclude
development and simulated-TV variants. Normal sideloaded debug-signed QA builds
are not proof of real Play update eligibility.

## Testing

JavaScript tests cover visit/dismissal behavior, setup deferral, consent ordering,
duplicate calls, stale status, offline/timeout recovery, explicit installation,
cleanup/recovery and payload validation. Coverage includes the update coordinator
and adapter with the existing application coverage gates.

Google's FakeAppUpdateManager runs in an isolated Android library test APK. It
does not display actual Play consent or install a package.

The 2.1.0 fake completes its Task-based consent result immediately. Cancellation,
overlap and destruction tests wrap that one result in a controllable Task while
delegating availability, downloads, listeners and installation to Google's fake.
This tests native lifecycle behavior without claiming to reproduce Play UI.

Build and run it on an Android emulator with sufficient free storage:

```sh
APP_VARIANT=production npx expo prebuild --platform android --no-install --no-clean
./android/gradlew -p android :app-updates-native:assembleDebugAndroidTest -PreactNativeArchitectures=x86_64 --max-workers=2
adb -s <emulator-serial> install -r modules/app-updates-native/android/build/outputs/apk/androidTest/debug/app-updates-native-debug-androidTest.apk
adb -s <emulator-serial> shell am instrument -w -r expo.modules.appupdates.test/androidx.test.runner.AndroidJUnitRunner
```

Use the emulator's architecture. CI compiles these instrumentation tests; actual
execution requires an emulator. CI continues to run the native TV JVM tests.

The optional visual fixture requires the `.uitest` application identity and both
`uiTest: true` and `appUpdateFixture: true`. Start the UI-test Metro server with
`APP_VARIANT=ui-test APP_UPDATE_FIXTURE=1`. Its persistent banner says SIMULATED
UPDATES. This fixture simulates download completion and installation failure; it
never connects to Play, installs a package or restarts the app. Production config
always has appUpdateFixture false, even if that environment variable is set.

## Real Play acceptance gate

The first Play release must contain the update client. Install it through Play
with an eligible tester account, then make a higher version code available on the
same track. Verify consent, decline/reopening, background download, postponed and
accepted restart, app/version replacement, and retained TV credentials/preferences.
Matching application ID, Play signing identity and account ownership matter.
Internal app sharing is another documented testing route, not the same thing as
the internal testing track. See [Google's test guide](https://developer.android.com/guide/playcore/in-app-updates/test).

No cloud build, submission, Play Console change, push or deployment is authorized
by this implementation. Real Play installation remains pending until separately
authorized eligible releases are available. Record actual local results in
TESTING.md. Review SDK data handling in PRIVACY.md before public release.
