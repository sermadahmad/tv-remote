import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';

import { brand, svg, symbol } from './brand-artwork.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('assets/store/', root);
const incoming = new URL('artifacts/qa/play-listing/raw/', root);
const check = process.argv.includes('--check');
const importing = process.argv.includes('--import-captures');
const required = process.argv.includes('--require-screenshots');
assert(!(check && importing), 'Import captures before checking exports.');
const font = fileURLToPath(
  new URL('assets/brand/fonts/Inter-SemiBold.ttf', root),
);
const options = {
  font: {
    fontFiles: [font],
    loadSystemFonts: false,
    defaultFontFamily: 'Inter',
  },
};
const files = new Map();
const exports = [];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const escape = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;');
const captures = [
  {
    id: '01-introduction',
    headline: ['Let’s connect', 'your TV.'],
    caption: 'A simple start on your home Wi-Fi.',
    alt: 'Introduction explaining how to connect a compatible TV over home Wi-Fi.',
    light: false,
  },
  {
    id: '02-discovery',
    headline: ['Find your TV', 'on home Wi-Fi.'],
    caption: 'Choose a compatible TV nearby.',
    alt: 'Devices screen listing a compatible TV discovered on the local Wi-Fi network.',
    light: true,
  },
  {
    id: '03-remote',
    headline: ['Familiar controls.', 'Ready to use.'],
    caption: 'Direction buttons, Home, Back and volume.',
    alt: 'Connected remote with direction buttons, Home, Back and supported volume controls.',
    light: false,
  },
  {
    id: '04-touchpad',
    headline: ['Swipe to', 'move around.'],
    caption: 'Choose directional touchpad mode.',
    alt: 'Connected remote in directional touchpad mode.',
    light: false,
  },
  {
    id: '05-saved',
    headline: ['Save your TV.', 'Reconnect simply.'],
    caption: 'Keep and rename your saved connections.',
    alt: 'Saved TVs screen with a paired television and its connection and management actions.',
    light: true,
  },
  {
    id: '06-settings',
    headline: ['Make it', 'feel like yours.'],
    caption: 'Light and dark themes. Optional haptics.',
    alt: 'Settings screen with appearance and haptic feedback preferences.',
    light: false,
  },
];

// Keep alpha out of feature graphics and screenshot exports. The Play icon
// deliberately uses resvg's RGBA encoder to meet its separate 32-bit PNG spec.
function rgbPng(rendered) {
  const chunk = (type, data) => {
    const payload = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of payload) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, payload, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(rendered.width, 0);
  header.writeUInt32BE(rendered.height, 4);
  header[8] = 8;
  header[9] = 2;
  const stride = rendered.width * 3 + 1;
  const rows = Buffer.alloc(stride * rendered.height);
  const pixels = rendered.pixels;
  for (let y = 0; y < rendered.height; y++)
    for (let x = 0; x < rendered.width; x++) {
      const from = (y * rendered.width + x) * 4;
      assert.equal(pixels[from + 3], 255, 'RGB exports must be opaque');
      pixels.copy(rows, y * stride + 1 + x * 3, from, from + 3);
    }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function add(path, value) {
  files.set(path, Buffer.from(value));
}
function artwork(path, source, width, height, { rgba = false, alt } = {}) {
  add(`${path}.source.svg`, source);
  const outlined = new Resvg(source, options).toString();
  assert(!outlined.includes('<text'), `${path}: export must outline text`);
  add(`${path}.svg`, outlined);
  const renderer = new Resvg(outlined, options);
  assert.equal(renderer.width, width);
  assert.equal(renderer.height, height);
  const rendered = renderer.render();
  const pixels = rendered.pixels;
  let visible = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    assert.equal(pixels[i], 255, `${path}: opaque background required`);
    visible++;
  }
  assert(visible > 0, `${path}: empty artwork`);
  const png = rgba ? rendered.asPng() : rgbPng(rendered);
  assert.equal(png[25], rgba ? 6 : 2, `${path}: wrong PNG color type`);
  add(`${path}.png`, png);
  exports.push({
    path: `${path}.png`,
    width,
    height,
    colorType: png[25],
    sha256: sha256(png),
    alt,
  });
}

artwork(
  'play-icon',
  svg(
    512,
    512,
    `<rect width="512" height="512" fill="${brand.navy}"/><g transform="translate(22.4 22.4) scale(1.825)">${symbol()}</g>`,
  ),
  512,
  512,
  {
    rgba: true,
    alt: 'Universal TV Remote symbol: a remote in front of a television with wireless arcs.',
  },
);

const feature = svg(
  1024,
  500,
  `
<rect width="1024" height="500" fill="${brand.navy}"/>
<path d="M56 78h40" stroke="${brand.teal}" stroke-width="7" stroke-linecap="round"/>
<text x="56" y="190" font-family="Inter" font-size="67" font-weight="600" letter-spacing="-2" fill="${brand.light}">Universal</text>
<text x="56" y="270" font-family="Inter" font-size="67" font-weight="600" letter-spacing="-2" fill="${brand.light}">TV Remote</text>
<text x="58" y="331" font-family="Inter" font-size="25" font-weight="600" fill="${brand.mint}">Your phone. Your TV.</text>
<text x="58" y="406" font-family="Inter" font-size="19" font-weight="600" fill="#AAB8CC">Control a compatible TV over home Wi-Fi.</text>
<g transform="translate(636 86)">
  <rect width="320" height="328" rx="48" fill="#16263A"/>
  <g fill="${brand.navy}" stroke="#4E7581" stroke-width="2">
    <rect x="113" y="34" width="94" height="74" rx="26"/>
    <rect x="113" y="220" width="94" height="74" rx="26"/>
    <rect x="30" y="117" width="74" height="94" rx="26"/>
    <rect x="216" y="117" width="74" height="94" rx="26"/>
  </g>
  <g fill="none" stroke="${brand.mint}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <path d="m145 76 15-15 15 15m-30 177 15 15 15-15m-102-104-15 15 15 15m174-30 15 15-15 15"/>
  </g>
  <circle cx="160" cy="164" r="46" fill="${brand.teal}"/>
  <circle cx="160" cy="164" r="12" fill="${brand.navy}"/>
</g>
`,
);
artwork('feature-graphic', feature, 1024, 500, {
  alt: 'Universal TV Remote wordmark beside a teal and mint directional control on midnight navy.',
});

// The reviewed Markdown remains the editing source for the full listing copy.
const listingDocument = await readFile(
  new URL('docs/STORE_METADATA.md', root),
  'utf8',
);
const descriptionSection = listingDocument
  .split('## Full description\n')[1]
  ?.split('\n## Graphics and screenshots')[0];
assert(descriptionSection, 'The approved full description is missing');
const listing = {
  locale: 'en-US',
  title: 'Universal TV Remote',
  shortDescription:
    'Wi-Fi remote for compatible Android TV and Google TV devices.',
  fullDescription: descriptionSection
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replaceAll('\n', ' '))
    .join('\n\n'),
  category: 'TOOLS',
  contactEmail: 'fixemj@gmail.com',
};
assert(listing.title.length <= 30 && listing.shortDescription.length <= 80);
assert(listing.fullDescription.length <= 4000);
add('listing.en-US.json', JSON.stringify(listing, null, 2) + '\n');

const provenancePath = 'sources/capture-provenance.json';
let provenance = null;
try {
  provenance = JSON.parse(
    await readFile(
      new URL(
        importing ? 'capture-provenance.json' : provenancePath,
        importing ? incoming : output,
      ),
      'utf8',
    ),
  );
} catch (error) {
  if (importing || error.code !== 'ENOENT') throw error;
}
if (provenance) {
  assert.equal(provenance.applicationId, 'com.sermadahmad.tvremote');
  assert.equal(provenance.appVersion, '1.0.0');
  assert(
    Number.isSafeInteger(provenance.versionCode) && provenance.versionCode > 9,
  );
  assert.match(provenance.sourceCommit, /^[a-f0-9]{40}$/);
  assert.equal(provenance.buildKind, 'release');
  assert.equal(provenance.adapter, 'real');
  assert.equal(provenance.fixture, false);
  assert(
    !Number.isNaN(Date.parse(provenance.capturedAt)),
    'Capture date is required',
  );
  assert.equal(provenance.captures.length, captures.length);
  for (const capture of captures) {
    const proof = provenance.captures.find((entry) => entry.id === capture.id);
    assert(proof, `Missing capture evidence: ${capture.id}`);
    assert.equal(
      proof.reviewedForSecrets,
      true,
      `${capture.id}: review for private information first`,
    );
    assert.equal(
      proof.containsTestOverlay,
      false,
      `${capture.id}: fixture/test overlays are not store screenshots`,
    );
    const raw = await readFile(
      new URL(
        importing ? `${capture.id}.png` : `sources/${capture.id}.png`,
        importing ? incoming : output,
      ),
    );
    assert.equal(
      sha256(raw),
      proof.sha256,
      `${capture.id}: capture hash mismatch`,
    );
    assert.equal(raw.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert(raw.readUInt32BE(16) >= 320 && raw.readUInt32BE(20) >= 320);
    add(`sources/${capture.id}.png`, raw);
    const background = capture.light ? brand.light : brand.navy;
    const ink = capture.light ? brand.navy : brand.light;
    const muted = capture.light ? '#5A697D' : '#AAB8CC';
    const accent = capture.light ? '#087F73' : brand.mint;
    const image = `data:image/png;base64,${raw.toString('base64')}`;
    const preview = new Resvg(
      svg(64, 64, `<image href="${image}" width="64" height="64"/>`),
    ).render().pixels;
    const imageColors = new Set();
    for (let offset = 0; offset < preview.length; offset += 4)
      imageColors.add(preview.subarray(offset, offset + 4).toString('hex'));
    assert(
      imageColors.size > 8,
      `${capture.id}: capture is blank or cannot be opened`,
    );
    const source = svg(
      1080,
      1920,
      `
<rect width="1080" height="1920" fill="${background}"/>
<text x="90" y="81" font-family="Inter" font-size="25" font-weight="600" letter-spacing="1" fill="${accent}">UNIVERSAL TV REMOTE</text>
${capture.headline.map((line, i) => `<text x="86" y="${181 + i * 82}" font-family="Inter" font-size="72" font-weight="600" letter-spacing="-2" fill="${ink}">${escape(line)}</text>`).join('\n')}
<text x="90" y="335" font-family="Inter" font-size="30" font-weight="600" fill="${muted}">${escape(capture.caption)}</text>
<image href="${image}" x="90" y="410" width="900" height="1410" preserveAspectRatio="xMidYMid meet"/>
`,
    );
    artwork(`screenshots/${capture.id}`, source, 1080, 1920, {
      alt: capture.alt,
    });
  }
  add(provenancePath, JSON.stringify(provenance, null, 2) + '\n');
}

add(
  'manifest.json',
  JSON.stringify(
    {
      applicationId: 'com.sermadahmad.tvremote',
      targetVersion: '1.0.0',
      font: {
        path: '../brand/fonts/Inter-SemiBold.ttf',
        license: '../brand/fonts/OFL.txt',
        sha256: sha256(await readFile(font)),
      },
      exports,
      screenshotStatus: provenance
        ? 'complete'
        : 'pending-genuine-release-captures',
      captures: captures.map(({ id, alt }) => ({ id, file: `${id}.png`, alt })),
    },
    null,
    2,
  ) + '\n',
);

for (const [relative, bytes] of files) {
  const target = new URL(relative, output);
  if (check) {
    assert(
      (await readFile(target)).equals(bytes),
      `Stale Play asset: ${relative}. Regenerate exports.`,
    );
  } else {
    await mkdir(new URL('.', target), { recursive: true });
    await writeFile(target, bytes);
  }
}
console.log(
  `${check ? 'Verified' : 'Generated'} ${exports.length} Play PNG exports with editable and outlined SVG sources.`,
);
if (!provenance) {
  console.log(
    'Six genuine release screenshots are pending. No placeholder screenshots were generated.',
  );
  if (required) process.exitCode = 1;
}
