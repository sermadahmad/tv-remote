# Store preparation — unpublished draft

Confirmed app: **Universal TV Remote**, free, English-first, Android package `com.sermadahmad.tvremote`, public support contact `fixemj@gmail.com`. Expo owner/project: `sermadahmad/tv-remote`. The Android upload key is managed in Expo Credentials. Play Console app creation and the first internal release are tracked in DEPLOYMENT.md. Final publisher verification, privacy-policy URL, release icons, and store screenshots remain outstanding. No public release has been published.

## Proposed description

Control a compatible Android TV or Google TV over your local Wi-Fi network. Find your TV, enter the pairing code shown on its screen, and use familiar navigation buttons or a directional touchpad. Save and rename your TVs, choose a light or dark appearance, and adjust haptic feedback.

No account is required. TV commands stay on your local network. Available volume, media, and power controls depend on the TV's advertised support and firmware. Standby wake behavior varies. Keyboard input is not available in this development version.

## Release review

This draft is not approved store copy: no TV model has been physically validated. Replace broad compatibility statements with the model, firmware, Remote Service version, and phone OS actually tested. Record validation in TESTING.md before making functional claims in listings.

The current app uses Android API 24+ and iOS 16.4+, Android compile API 37 and target API 36. The optional target-37 local-network permission path requires a device test. Review current store target-SDK requirements at submission time.

Review [PRIVACY.md](../PRIVACY.md) against signed release binaries. Complete Google Play Data safety and App Store privacy forms based on actual data handling and bundled dependencies. Supply a support URL and monitored privacy contact. Do not submit the separately identified simulated-TV build.

Release acceptance still requires hardware trust-continuity/pairing/control tests on both phone platforms, complete UI/accessibility and minimum-OS coverage, dependency-advisory remediation, publisher-approved branding, and store assets. The complete EAS workflow, signed version-code-4 AAB inspection and automatic internal submission passed; the intended account's tester invitation is verified. The GitHub repository is connected; future pushes will include the local workflow. Results and the working test link are recorded in DEPLOYMENT.md. No code has been pushed.
