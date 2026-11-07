# Google Play listing — Universal TV Remote 1.0.0

This is the approved release-preparation copy for `com.sermadahmad.tvremote`.
Uploading these files is separate from Play review, closed-test eligibility and
public availability. Record actual Console/release results in DEPLOYMENT.md.

## Listing fields

| Field                | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| App name             | Universal TV Remote                                                |
| Short description    | Wi-Fi remote for compatible Android TV and Google TV devices.      |
| Default language     | English (United States), en-US                                     |
| Application category | Tools                                                              |
| Pricing              | Free                                                               |
| Contact email        | fixemj@gmail.com                                                   |
| Intended audience    | Ages 13–15, 16–17, and 18+; not child-directed                     |
| Distribution         | All countries permitted by Play and the verified publisher account |
| Trader declaration   | Apply the account's existing trader status                         |

The app name is 19 characters and the short description is 61 characters. Keep
pricing, “Free”, “No Ads”, rankings and year keywords out of the title and short
description. No advertising is a factual statement in the full description,
separate from the app's Free price and its **No ads** policy declaration.

## Full description

Use your Android phone as a Wi-Fi remote for a compatible Android TV or Google TV.
Keep your phone and TV on the same home Wi-Fi network, find your TV, and enter the
six-character pairing code shown on its screen.

FAMILIAR TV CONTROLS

Navigate with direction buttons and OK, return with Home and Back, and use volume
and mute controls when supported by your TV. Switch to a directional touchpad to
navigate with swipes.

YOUR SAVED CONNECTIONS

Save and rename your paired TVs so you can choose them again. Choose a light or
dark appearance and turn haptic feedback on or off.

No advertising. No app account required. TV commands stay on your local network.
Optional app update checks and downloads use Google Play and require internet
access.

COMPATIBILITY AND SETUP

Requires a compatible Android TV or Google TV with the Android TV Remote Service
available. Your TV must be set up, powered on and reachable from the phone's local
Wi-Fi network. This app is not an infrared remote and does not support every smart
TV platform.

Available volume, media and power controls depend on your TV, firmware and active
TV app. Standby and wake behavior varies; waking a TV is not guaranteed. TV keyboard
input is currently unavailable.

Universal TV Remote is an independent app and is not affiliated with Google or TV
manufacturers.

## Graphics and screenshots

Editable sources, exact PNG exports, alt text and capture provenance live in
`assets/store/`. See its README for commands and the six required capture names.

- Play icon: `assets/store/play-icon.png`, 512 × 512, 32-bit RGBA PNG, opaque navy
  pixels and no baked-in rounded corners.
- Feature graphic: `assets/store/feature-graphic.png`, 1024 × 500, 24-bit RGB PNG.
- Six phone screenshot compositions: 1080 × 1920, 24-bit RGB PNG, generated only
  from genuine release captures reviewed for secrets and test overlays.
- Alt text: each export's `alt` field in `assets/store/manifest.json`.

The screenshot gate stays open until genuine captures are imported. Never upload
fixture UI, pretend screenshots, build-review sheets or app-icon mask previews as
production screenshots. Both themes must be represented by the actual captures.

## Review notes

The main app has no app-account sign-in. Remote commands require a compatible TV
on the same local network and its displayed pairing code. Provide these hardware
and pairing instructions in App access; do not invent a reviewer account or a
permanent test code. Reviewer instructions and Data safety declarations must match
the actual signed release and SDK inventory, including Play In-App Updates.

Complete the content-rating questionnaire from the app's actual contents; the
rating assigned by Google is independent of the selected 13+ intended audience.
Publish and verify the privacy and support URLs before entering them in Console,
and include the policy link inside the release app. Do not submit `.dev` or
`.uitest` variants.

The current supported Android baseline is minimum API 24, target API 36 and
compile API 37. Preserve signing identities and increment remote version codes.
Real phone/TV results, remaining compatibility limits and release acceptance are
maintained in TESTING.md. Initial public availability remains gated on the actual
closed-test results, production access and Google's review.

References: [Google listing guidance](https://support.google.com/googleplay/android-developer/answer/13393723?hl=en),
[Metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842?hl=en),
[Preview asset specifications](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en),
[App review preparation](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).
