# Store preparation — unpublished draft

Working name: **Universal TV Remote**. Development identifier: `dev.universaltv.remote`. Final publisher, signing team/keystore, store identifiers, support contact, privacy-policy URL, icons, and screenshots are not supplied. Nothing has been submitted or published.

## Proposed description

Control a compatible Android TV or Google TV over your local Wi-Fi network. Find your TV, enter the pairing code shown on its screen, and use familiar navigation buttons or a directional touchpad. Save and rename your TVs, choose a light or dark appearance, and adjust haptic feedback.

No account is required. TV commands stay on your local network. Available volume, media, and power controls depend on the TV's advertised support and firmware. Standby wake behavior varies. Keyboard input is not available in this development version.

## Release review

This draft is not approved store copy: no TV model has been physically validated. Replace broad compatibility statements with the model, firmware, Remote Service version, and phone OS actually tested. Record validation in TESTING.md before making functional claims in listings.

The current app uses Android API 24+ and iOS 16.4+, Android compile API 37 and target API 36. The optional target-37 local-network permission path requires a device test. Review current store target-SDK requirements at submission time.

Review [PRIVACY.md](../PRIVACY.md) against signed release binaries. Complete Google Play Data safety and App Store privacy forms based on actual data handling and bundled dependencies. Supply a support URL and monitored privacy contact. Do not submit the separately identified simulated-TV build.

Release acceptance still requires hardware trust-continuity/pairing/control tests on both phone platforms, complete UI/accessibility and minimum-OS coverage, dependency-advisory remediation, signed release inspection, publisher-approved branding, and store assets. CI is configured but has not run remotely because no code has been pushed.
