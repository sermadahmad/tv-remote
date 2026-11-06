import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getConfig } = require('expo/config');
const palette = JSON.parse(
  readFileSync(new URL('../src/shared/theme/palette.json', import.meta.url)),
);
const luminance = (hex) =>
  hex
    .match(/[\da-f]{2}/gi)
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) /
  (Math.min(luminance(a), luminance(b)) + 0.05);
for (const [mode, p] of Object.entries(palette)) {
  for (const surface of ['background', 'surface', 'raised']) {
    for (const ink of ['text', 'muted', 'accentText', 'error'])
      assert(
        contrast(p[ink], p[surface]) >= 4.5,
        `${mode} ${ink}/${surface} text contrast`,
      );
    assert(
      contrast(p.line, p[surface]) >= 3,
      `${mode} control outline/${surface} contrast`,
    );
  }
  assert(
    contrast(p.onAccent, p.accent) >= 4.5,
    `${mode} primary button contrast`,
  );
  assert(
    contrast(p.onAccent, p.accentPressed) >= 4.5,
    `${mode} pressed button contrast`,
  );
  assert(
    contrast(p.onAccent, p.accentText) >= 3,
    `${mode} switch thumb contrast`,
  );
}
const manifest = JSON.parse(
  readFileSync(new URL('../assets/brand/manifest.json', import.meta.url)),
);
for (const entry of manifest.assets) {
  const png = readFileSync(
    new URL(`../assets/brand/${entry.path}`, import.meta.url),
  );
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), entry.width);
  assert.equal(png.readUInt32BE(20), entry.height);
  if (entry.opaque)
    assert.equal(png[25], 2, `${entry.path} must be RGB without alpha`);
}
for (const variant of ['production', 'development', 'ui-test']) {
  process.env.APP_VARIANT = variant;
  const { exp } = getConfig(process.cwd());
  const splash = exp.plugins.find(
    (p) => Array.isArray(p) && p[0] === 'expo-splash-screen',
  )[1];
  for (const path of [
    exp.icon,
    exp.web.favicon,
    exp.android.adaptiveIcon.foregroundImage,
    exp.android.adaptiveIcon.backgroundImage,
    exp.android.adaptiveIcon.monochromeImage,
    splash.image,
    splash.dark.image,
  ])
    assert(readFileSync(path).length > 0, path);
  assert.equal(splash.backgroundColor, '#101827');
  assert.equal(splash.dark.backgroundColor, '#101827');
  assert.equal(splash.imageWidth, 160);
  assert.equal(splash.resizeMode, 'contain');
}
console.log(
  `Verified ${manifest.assets.length} PNG headers, three Expo variants, text/control contrast and splash references.`,
);
