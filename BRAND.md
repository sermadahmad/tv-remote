# Universal TV Remote brand system

The Remote + TV + Wi-Fi mark combines a physical remote, a television outline
and three wireless arcs. A mint center button anchors the directional pad.
The supplied reference informed the composition; the artwork is redrawn as
editable geometry in the app’s navy, teal and mint palette. No manufacturer
logos or external image generator were used. Use the wordmark **Universal TV Remote**.

## Files and regeneration

`assets/brand/` contains editable SVGs, outlined wordmarks, PNG exports, the font
license, a dimension manifest, and a review sheet. `logos/` provides primary
lockups, separate symbols and wordmarks in dark-background, light-background and
white monochrome variants. `.source.svg` wordmarks retain editable text; exported
wordmarks have paths and need no installed font. `illustrations/` contains four
320 × 240 SVG scenes in both themes and 640 × 480 PNG exports. Their strokes are
4 units, with rounded ends and joins; instructions remain accessible app text.
Discovery shows signal waves between the phone and TV. Pairing shows six TV
code cells, matching phone entry and a keypad. No-TV uses a dashed, unconfirmed
TV silhouette and a search/question lens. Connection loss uses a crossed-out
wireless signal and a broken link between the phone and TV. Scenes contain no
instructional text; the review board labels each scene separately.

```sh
npm ci
npm run assets:generate
npm run assets:check
```

Generation is offline and uses the pinned development-only `@resvg/resvg-js`
renderer. Edit the geometric masters in `scripts/brand-artwork.mjs`; adjust layout
and export dimensions in `scripts/generate-brand-assets.mjs`. The generated typed
registry supplies existing `react-native-svg` components without a Metro SVG
transformer or a runtime font dependency. Do not edit the generated registry.

Use `BrandMark` with `size`, `BrandLogo` with `width`, and `BrandIllustration`
with `kind` (`discovering`, `pairing`, `no-tv`, `connection-lost`) and optional
`width`. Components follow the current theme; marks/logos also accept an explicit
`appearance` (`dark`, `light`, `mono`). Marks and illustrations are decorative
by default. Supplying a mark `label` exposes one image description; logos default
to the application name. Aspect ratios are preserved when the available width
shrinks.

Inter SemiBold comes from the official Inter v4.1 release, tag commit
`e3a3d4c57d5ecc01453a575621882a384c1995a3`, archive
<https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip>, entry
`extras/ttf/Inter-SemiBold.ttf`. The manifest records its SHA-256. The unmodified
font and SIL Open Font License are retained in `fonts/`. Application UI text uses
native system fonts, including system font scaling.

## Color and use

| Role                            | Color     |
| ------------------------------- | --------- |
| Midnight navy / dark background | `#101827` |
| Teal / primary action fill      | `#19B8A6` |
| Mint / dark-theme accents       | `#63D7C1` |
| Light background                | `#F5F7FA` |
| Light-theme text accents        | `#087F73` |

Use navy labels on teal, which has approximately 7.15:1 contrast. Teal is artwork
and a button fill, not small text on white. Darker teal links have at least 4.5:1
contrast against all light surfaces. Theme palettes include muted text, error
text, and 3:1 control outlines; the asset check verifies those combinations.

Keep the mark's aspect ratio, with clear space of at least one center-button
diameter on each side. Prefer a 32-unit or larger reusable mark in the UI. Use
the supplied launcher export at small OS-controlled sizes. Never stretch,
rotate, add shadows, or add text to the launcher icon. Background variants are
named for the background on which they belong. The white mono variant needs a
dark background; the OS supplies the color for Android themed icons.

## Native dimensions and configuration

The main icon is an opaque RGB 1024 × 1024 PNG without an alpha channel or
pre-rounded corners. All three adaptive layers use a 1024 × 1024 canvas. The
foreground and monochrome layers have transparent padding; their visible pixels
fit within the conservative central 66dp circle on Android's 108dp grid. The
background is opaque navy. `review/brand-review.png` shows circular, rounded-square
and squircle crops, small launcher sizes, both themes and illustrations.

The splash symbol is transparent 1024 × 1024 PNG, displayed at width 160 with
`contain` on navy in both themes through the Expo SDK 58 splash config plugin.
Android 12+ owns the native splash composition; no full-screen illustration,
wordmark, animation or artificial startup delay is added. The favicon is 48 × 48.
All exact PNG dimensions are in `manifest.json`.

App identities, URL schemes, permissions, onboarding preferences and credentials
are preserved. Native icon/splash changes require a new native installation or
update; a JavaScript reload cannot replace them. Verify splash behavior using
release builds, not Expo Go or the development client.

## Verification

`assets:check` re-renders all exports and compares bytes, validates PNG headers,
dimensions, opacity, adaptive safe geometry, text/control contrast and Expo asset
references in all three build variants. CI runs it before builds. Review the PNG
sheet and native launcher/cold-start captures as well; automatic checks do not
establish screen-reader usability or TV compatibility. Task-specific native and
UI results are recorded in `TESTING.md`.
