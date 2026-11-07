# Store preparation — unpublished draft

Confirmed app: **Universal TV Remote**, free, English-first, Android package `com.sermadahmad.tvremote`, public support contact `fixemj@gmail.com`. Expo owner/project: `sermadahmad/tv-remote`. The Android upload key is managed in Expo Credentials. Play Console app creation and the first internal release are tracked in DEPLOYMENT.md. Final publisher verification, privacy-policy URL, release icons, and store screenshots remain outstanding. No public release has been published.

## Proposed listing fields

- **Title:** Universal TV Remote (19 characters).
- **Short description:** Wi-Fi remote for compatible Android TV and Google TV devices. (61 characters).
- **Pricing:** retain the existing Free setting.
- **Ads declaration draft:** No; the app currently contains no advertising. Verify against the signed release and bundled SDKs before submitting the declaration.

Keep “Free” and “No Ads” out of the title/developer name, and pricing promotions
out of the short description. “Latest 2027” is not a relevant edition of this app
and should not be used as a marketing keyword. Years are not universally banned;
claims must be relevant and accurate. See [Google's listing guidance](https://support.google.com/googleplay/android-developer/answer/13393723?hl=en)
and [Metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842?hl=en).

These are local drafts. This change does not edit Play Console or publish a release.

## Proposed full description

Control a compatible Android TV or Google TV over your local Wi-Fi network. Find your TV, enter the pairing code shown on its screen, and use familiar navigation buttons or a directional touchpad. Save and rename your TVs, choose a light or dark appearance, and adjust haptic feedback.

No advertising. No app account required. TV commands stay on your local network. Available volume, media, and power controls depend on the TV's advertised support and firmware. Standby wake behavior varies. Keyboard input is not available in this development version.

## Release review

This draft is not approved store copy. Limited Android hardware results and remaining compatibility checks are recorded in TESTING.md. Replace broad compatibility statements with the model, firmware, Remote Service version, and phone OS actually tested. Record validation in TESTING.md before making functional claims in listings. Optional Android application updates use Google Play and internet access; TV control remains local. Review the Play update SDK disclosure when finalizing the Data safety form.

The current app uses Android API 24+ and iOS 16.4+, Android compile API 37 and target API 36. The optional target-37 local-network permission path requires a device test. Review current store target-SDK requirements at submission time.

Review [PRIVACY.md](../PRIVACY.md) against signed release binaries. Complete Google Play Data safety and App Store privacy forms based on actual data handling and bundled dependencies. Supply a support URL and monitored privacy contact. Do not submit the separately identified simulated-TV build.

Release acceptance still requires hardware trust-continuity/pairing/control tests on both phone platforms, complete UI/accessibility and minimum-OS coverage, dependency-advisory remediation, publisher-approved branding, and store assets. The complete EAS workflow, signed version-code-4 AAB inspection and automatic internal submission passed; the intended account's tester invitation is verified. The GitHub repository is connected; future pushes will include the local workflow. Results and the working test link are recorded in DEPLOYMENT.md. No code has been pushed.
