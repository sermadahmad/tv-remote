# Google Play assets

These files extend the existing midnight navy / teal / mint brand for the
Universal TV Remote **1.0.0** release. They do not replace launcher/adaptive assets
or change app behavior. Google Play review and publication are separate actions.

| File                                                        | Dimensions  | Encoding                                                      |
| ----------------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| `play-icon.png`                                             | 512 × 512   | 8-bit RGBA, 32-bit PNG; all pixels opaque; no rounded corners |
| `feature-graphic.png`                                       | 1024 × 500  | 8-bit RGB, 24-bit PNG; no alpha                               |
| `screenshots/01-introduction.png` through `06-settings.png` | 1080 × 1920 | 8-bit RGB, 24-bit PNG; no alpha                               |

The icon uses the approved remote + television + wireless symbol. The feature
graphic uses the same palette and Inter SemiBold typography with a directional
control motif; it carries no manufacturer logo, ranking, pricing or year claim.
`*.source.svg` files retain editable text, and `*.svg` files outline typography.
Font source/license and revision remain in `assets/brand/fonts/` and the brand
manifest. No runtime dependency or network font is introduced.

## Regeneration and checking

After installing the existing locked dependencies, these commands work offline:

```sh
node scripts/generate-play-assets.mjs
node scripts/generate-play-assets.mjs --check
node scripts/verify-play-assets.mjs
```

The generator uses the existing `@resvg/resvg-js` development dependency and
bundled Inter font. Exports are deterministic; the manifest records dimensions,
PNG color types, hashes, font integrity, alt text and screenshot readiness.
Checks open/decode every PNG, verify its payload/dimensions, source files, hashes,
icon file-size limit and screenshot aspect preservation. For release acceptance,
both scripts can enforce the genuine-screenshot gate:

```sh
node scripts/generate-play-assets.mjs --check --require-screenshots
node scripts/verify-play-assets.mjs --require-screenshots
```

Without imported captures the two static graphics are usable and validated, but
the screenshot status remains **pending-genuine-release-captures**. No placeholder
screenshots are emitted. Normal checks report that state; strict checks fail it.

## Capture the actual release app

Use the real-adapter production package `com.sermadahmad.tvremote`, version 1.0.0,
with a version code above 9. Capture the verified release, not a development or
fixture app. Use a connected phone and compatible TV for the connected controls.
Keep at least one light and one dark app screen in the set.

Put the original PNG captures under `artifacts/qa/play-listing/raw/`:

| File                  | Actual app state                                         |
| --------------------- | -------------------------------------------------------- |
| `01-introduction.png` | First-launch/introduction instructions                   |
| `02-discovery.png`    | Devices screen with a genuinely discovered compatible TV |
| `03-remote.png`       | Connected D-pad and supported controls                   |
| `04-touchpad.png`     | Connected directional touchpad mode                      |
| `05-saved.png`        | Saved paired TV and management actions                   |
| `06-settings.png`     | Appearance/haptic preferences                            |

Review the originals before import: no pairing code, personal/private TV names,
network address, notifications, test overlays or simulated connection claims.
Use the actual device UI to choose a neutral TV display name or capture state;
do not paint over or invent app controls. Screenshot compositions embed each
complete original with `preserveAspectRatio="xMidYMid meet"`; they never stretch
or crop the app image. Marketing headings sit outside the original app content.

Alongside those files, write `capture-provenance.json` with the actual release
values and each original's SHA-256:

```json
{
  "applicationId": "com.sermadahmad.tvremote",
  "appVersion": "1.0.0",
  "versionCode": 10,
  "sourceCommit": "<actual 40-character source commit hash>",
  "buildKind": "release",
  "adapter": "real",
  "fixture": false,
  "capturedAt": "<actual ISO capture timestamp>",
  "captures": [
    {
      "id": "01-introduction",
      "sha256": "<actual SHA-256 of 01-introduction.png>",
      "reviewedForSecrets": true,
      "containsTestOverlay": false
    }
  ]
}
```

The example version code is not an instruction to reset remote versioning. Use
the actual inspected build code and include all six capture entries. These
metadata checks document human review; they do not automatically recognize a TV
or detect private information inside pixels.

```sh
node scripts/generate-play-assets.mjs --import-captures
node scripts/generate-play-assets.mjs --check --require-screenshots
node scripts/verify-play-assets.mjs --require-screenshots
```

Import retains the reviewed originals and provenance in `sources/`, making later
regeneration independent of temporary QA folders. Only `play-icon.png`,
`feature-graphic.png`, and the six exported `screenshots/*.png` are uploaded as
listing graphics. Source SVGs, originals and manifests are authoring records.

Use the exact alt text in `manifest.json` when entering graphics in Play Console.
`listing.en-US.json` provides the exact title, short description and full
description for Console entry. Its full description comes from the reviewed
Markdown, and generation/checking enforces Google's 30/80/4000-character limits.
Current specifications are linked in [the listing copy](../../docs/STORE_METADATA.md).
