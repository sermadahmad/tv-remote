import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';

const output = new URL('../assets/store/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', output)));
const listing = JSON.parse(readFileSync(new URL('listing.en-US.json', output)));
assert.equal(listing.locale, 'en-US');
assert.equal(listing.title, 'Universal TV Remote');
assert.equal(
  listing.shortDescription,
  'Wi-Fi remote for compatible Android TV and Google TV devices.',
);
assert(listing.title.length <= 30 && listing.shortDescription.length <= 80);
assert(
  listing.fullDescription.length > 0 && listing.fullDescription.length <= 4000,
);
assert(
  listing.fullDescription.includes('No advertising. No app account required.'),
);
assert(listing.fullDescription.includes('TV keyboard'));
assert.equal(listing.category, 'TOOLS');
assert.equal(listing.contactEmail, 'fixemj@gmail.com');
assert.equal(manifest.applicationId, 'com.sermadahmad.tvremote');
assert.equal(manifest.targetVersion, '1.0.0');
assert.equal(manifest.captures.length, 6);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = new Map(manifest.exports.map((entry) => [entry.path, entry]));
for (const [path, width, height, color] of [
  ['play-icon.png', 512, 512, 6],
  ['feature-graphic.png', 1024, 500, 2],
]) {
  const entry = files.get(path);
  assert(entry, path);
  assert.equal(entry.width, width);
  assert.equal(entry.height, height);
  assert.equal(entry.colorType, color);
}
for (const entry of manifest.exports) {
  const bytes = readFileSync(new URL(entry.path, output));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), entry.width);
  assert.equal(bytes.readUInt32BE(20), entry.height);
  assert.equal(bytes[24], 8);
  assert.equal(bytes[25], entry.colorType);
  assert.equal(
    sha256(bytes),
    entry.sha256,
    `${entry.path}: integrity mismatch`,
  );
  assert(
    entry.alt && entry.alt.length <= 140,
    `${entry.path}: descriptive alt text required`,
  );
  const chunks = [];
  let ended = false;
  for (let cursor = 8; cursor < bytes.length;) {
    const size = bytes.readUInt32BE(cursor);
    assert(cursor + size + 12 <= bytes.length, `${entry.path}: truncated PNG`);
    const type = bytes.toString('ascii', cursor + 4, cursor + 8);
    if (type === 'IDAT')
      chunks.push(bytes.subarray(cursor + 8, cursor + 8 + size));
    cursor += size + 12;
    if (type === 'IEND') {
      ended = true;
      assert.equal(cursor, bytes.length);
    }
  }
  assert(ended && chunks.length, `${entry.path}: missing PNG data`);
  assert.equal(
    inflateSync(Buffer.concat(chunks)).length,
    (entry.width * (entry.colorType === 6 ? 4 : 3) + 1) * entry.height,
  );
  const image = `data:image/png;base64,${bytes.toString('base64')}`;
  const decoded = new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><image href="${image}" width="64" height="64" preserveAspectRatio="xMidYMid meet"/></svg>`,
  ).render();
  assert(
    decoded.pixels.some((byte) => byte !== 0),
    `${entry.path}: PNG could not be opened`,
  );
  const vector = readFileSync(
    new URL(entry.path.replace(/\.png$/, '.svg'), output),
    'utf8',
  );
  assert(
    !vector.includes('<text'),
    `${entry.path}: SVG export must outline typography`,
  );
  const source = readFileSync(
    new URL(entry.path.replace(/\.png$/, '.source.svg'), output),
    'utf8',
  );
  assert(source.length > 0);
  if (entry.path === 'play-icon.png')
    assert(bytes.length <= 1024 * 1024, 'Play icon exceeds 1024 KB');
  if (entry.path.startsWith('screenshots/')) {
    assert.equal(entry.width, 1080);
    assert.equal(entry.height, 1920);
    assert.equal(entry.colorType, 2);
    assert.equal(vector.match(/<image\b/g)?.length, 1);
    // resvg omits SVG's default xMidYMid meet in the outlined export.
    assert(source.includes('preserveAspectRatio="xMidYMid meet"'));
    assert(
      !vector.includes('preserveAspectRatio="none"'),
      'Do not stretch genuine captures',
    );
  }
}
assert.equal(
  sha256(readFileSync(new URL(manifest.font.path, output))),
  manifest.font.sha256,
);
assert(
  readFileSync(new URL(manifest.font.license, output)).includes(
    'SIL OPEN FONT LICENSE',
  ),
);
if (manifest.screenshotStatus === 'complete') {
  assert.equal(
    manifest.exports.filter((entry) => entry.path.startsWith('screenshots/'))
      .length,
    6,
  );
  const proof = JSON.parse(
    readFileSync(new URL('sources/capture-provenance.json', output)),
  );
  assert.equal(proof.applicationId, manifest.applicationId);
  assert.equal(proof.appVersion, manifest.targetVersion);
  assert(proof.versionCode > 9 && Number.isSafeInteger(proof.versionCode));
  assert.equal(proof.buildKind, 'release');
  assert.equal(proof.adapter, 'real');
  assert.equal(proof.fixture, false);
  assert.match(proof.sourceCommit, /^[a-f0-9]{40}$/);
  for (const capture of manifest.captures) {
    const entry = proof.captures.find((item) => item.id === capture.id);
    assert.equal(entry?.reviewedForSecrets, true);
    assert.equal(entry?.containsTestOverlay, false);
    assert.equal(
      sha256(readFileSync(new URL(`sources/${capture.file}`, output))),
      entry.sha256,
    );
  }
} else {
  assert.equal(manifest.screenshotStatus, 'pending-genuine-release-captures');
  console.log(
    'Screenshot gate remains OPEN: genuine release captures have not been imported.',
  );
  if (process.argv.includes('--require-screenshots')) process.exitCode = 1;
}
console.log(
  `Verified ${manifest.exports.length} Play PNGs: valid encoding, dimensions, typography sources, integrity and alt text.`,
);
