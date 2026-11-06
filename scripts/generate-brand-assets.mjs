import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import {
  appearances,
  brand,
  illustration,
  svg,
  symbol,
} from './brand-artwork.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('assets/brand/', root);
const font = fileURLToPath(new URL('fonts/Inter-SemiBold.ttf', output));
const options = {
  font: {
    fontFiles: [font],
    loadSystemFonts: false,
    defaultFontFamily: 'Inter',
  },
};
const check = process.argv.includes('--check');
const files = new Map();
const manifest = [];
const registry = { symbols: {}, logos: {}, illustrations: {} };
// RGB exports deliberately omit an alpha channel, including the App Store icon.
function opaquePng(rendered) {
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
      const to = y * stride + 1 + x * 3;
      pixels.copy(rows, to, from, from + 3);
    }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function add(path, data) {
  files.set(path, Buffer.from(data));
}
function artwork(
  path,
  source,
  pngWidth,
  { opaque = false, safe = false } = {},
) {
  add(`${path}.svg`, source);
  const renderer = new Resvg(source, {
    ...options,
    fitTo: { mode: 'width', value: pngWidth },
  });
  const bounds = renderer.getBBox();
  if (
    !bounds ||
    bounds.x < 0 ||
    bounds.y < 0 ||
    bounds.x + bounds.width > renderer.width + 0.01 ||
    bounds.y + bounds.height > renderer.height + 0.01
  )
    throw new Error(`${path}: artwork is clipped or empty`);
  const rendered = renderer.render();
  add(`${path}.png`, opaque ? opaquePng(rendered) : rendered.asPng());
  const pixels = rendered.pixels;
  let visible = 0;
  let transparent = 0;
  let colors = new Set();
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 255) transparent++;
    if (!alpha) continue;
    visible++;
    colors.add(pixels.subarray(i, i + 4).toString('hex'));
    if (safe && alpha > 2) {
      const x = ((i / 4) % rendered.width) + 0.5 - rendered.width / 2;
      const y = Math.floor(i / 4 / rendered.width) + 0.5 - rendered.height / 2;
      if (Math.hypot(x, y) > (rendered.width * 33) / 108)
        throw new Error(
          `${path}: adaptive artwork exceeds the 66dp safe circle`,
        );
    }
  }
  if (!visible || (opaque && transparent) || (!opaque && !transparent))
    throw new Error(`${path}: incorrect alpha or empty artwork`);
  manifest.push({
    path: `${path}.png`,
    width: rendered.width,
    height: rendered.height,
    opaque,
    safe,
    colors: colors.size,
  });
  return renderer;
}
for (const [name, p] of Object.entries(appearances)) {
  const mark = svg(256, 256, symbol(p));
  registry.symbols[name] = mark;
  artwork(`logos/symbol-${name}`, mark, 512);
  const wordmark = svg(
    1024,
    128,
    `<text x="8" y="88" font-family="Inter" font-size="88" font-weight="600" letter-spacing="-3" fill="${p.ink}">Universal TV Remote</text>`,
  );
  add(`logos/wordmark-${name}.source.svg`, wordmark);
  const outlined = new Resvg(wordmark, options).toString();
  if (outlined.includes('<text')) throw new Error('Wordmark must be outlined');
  artwork(`logos/wordmark-${name}`, outlined, 2048);
  const lockup = svg(
    1280,
    256,
    `${symbol(p)}<g transform="translate(264 64)">${outlined.replace(/<\/?svg[^>]*>/g, '')}</g>`,
  );
  registry.logos[name] = lockup;
  artwork(`logos/primary-${name}`, lockup, 2560);
}
artwork(
  'icons/icon',
  svg(
    1024,
    1024,
    `<path fill="${brand.navy}" d="M0 0h1024v1024H0z"/><g transform="translate(44.8 64) scale(3.65)">${symbol()}</g>`,
  ),
  1024,
  { opaque: true },
);
for (const [name, p] of [
  ['android-foreground', appearances.dark],
  ['android-monochrome', appearances.mono],
]) {
  artwork(
    `icons/${name}`,
    svg(
      1024,
      1024,
      `<g transform="translate(211.2 211.2) scale(2.35)">${symbol(p)}</g>`,
    ),
    1024,
    { safe: true },
  );
}
artwork(
  'icons/android-background',
  svg(1024, 1024, `<path fill="${brand.navy}" d="M0 0h1024v1024H0z"/>`),
  1024,
  { opaque: true },
);
artwork(
  'icons/favicon',
  svg(256, 256, `<path fill="${brand.navy}" d="M0 0h256v256H0z"/>${symbol()}`),
  48,
  { opaque: true },
);
artwork(
  'splash/splash',
  svg(1024, 1024, `<g transform="scale(4)">${symbol()}</g>`),
  1024,
);
for (const kind of ['discovering', 'pairing', 'no-tv', 'connection-lost']) {
  registry.illustrations[kind] = {};
  for (const mode of ['dark', 'light']) {
    const source = illustration(kind, appearances[mode]);
    registry.illustrations[kind][mode] = source;
    artwork(`illustrations/${kind}-${mode}`, source, 640);
  }
}
// Self-contained SVG review board; PNG companion can be opened in any image viewer.
const nested = (source, x, y, width, height) =>
  source
    .replace('<svg ', `<svg x="${x}" y="${y}" `)
    .replace(
      /width="[^"]+" height="[^"]+"/,
      `width="${width}" height="${height}"`,
    );
let board = `<rect width="1600" height="1380" fill="${brand.light}"/><rect width="800" height="1380" fill="${brand.navy}"/>`;
for (const [column, mode] of ['dark', 'light'].entries()) {
  const x = column * 800;
  board += nested(registry.logos[mode], x + 32, 24, 736, 147);
  board += `<text x="${x + 40}" y="220" fill="${appearances[mode].ink}" font-family="Inter" font-size="24">Launcher masks · monochrome · small sizes</text>`;
  const foreground = files.get('icons/android-foreground.svg').toString();
  for (let i = 0; i < 3; i++) {
    const id = `${mode}-${i}`;
    const squircle =
      Array.from({ length: 128 }, (_, point) => {
        const angle = (point / 128) * Math.PI * 2;
        const axis = (value) =>
          (80 + 80 * Math.sign(value) * Math.sqrt(Math.abs(value))).toFixed(3);
        return `${point ? 'L' : 'M'}${axis(Math.cos(angle))} ${axis(Math.sin(angle))}`;
      }).join(' ') + 'Z';
    const mask =
      i === 0
        ? '<circle cx="80" cy="80" r="80"/>'
        : i === 1
          ? '<rect width="160" height="160" rx="35"/>'
          : `<path d="${squircle}"/>`;
    board += `<svg x="${x + 40 + i * 180}" y="250" width="160" height="160" viewBox="0 0 160 160"><defs><clipPath id="${id}">${mask}</clipPath></defs><g clip-path="url(#${id})"><rect width="160" height="160" fill="${brand.navy}"/>${nested(foreground, -40, -40, 240, 240)}</g></svg>`;
  }
  board += `<rect x="${x + 590}" y="250" width="148" height="160" rx="24" fill="#101827"/>`;
  board += nested(registry.symbols.mono, x + 600, 260, 128, 128);
  for (const [i, size] of [24, 32, 48, 64].entries())
    board += nested(
      files.get('icons/icon.svg').toString(),
      x + 40 + i * 95,
      440,
      size,
      size,
    );
  for (const [i, kind] of Object.keys(registry.illustrations).entries())
    board += nested(
      registry.illustrations[kind][mode],
      x + 30 + (i % 2) * 380,
      560 + Math.floor(i / 2) * 270,
      360,
      270,
    );
  board += `<text x="${x + 40}" y="1180" fill="${appearances[mode].ink}" font-family="Inter" font-size="30">${mode === 'dark' ? 'Midnight navy' : 'Light background'}</text><rect x="${x + 40}" y="1220" width="300" height="64" rx="16" fill="${brand.teal}"/><text x="${x + 90}" y="1262" fill="${brand.navy}" font-family="Inter" font-size="24" font-weight="600">Find my TV</text>`;
}
artwork('review/brand-review', svg(1600, 1380, board), 1600, { opaque: true });
add(
  'manifest.json',
  JSON.stringify(
    {
      fontRevision: 'e3a3d4c57d5ecc01453a575621882a384c1995a3',
      fontSha256: createHash('sha256')
        .update(await readFile(font))
        .digest('hex'),
      assets: manifest,
    },
    null,
    2,
  ) + '\n',
);
const ts = `// Generated by npm run assets:generate. Edit scripts/brand-artwork.mjs instead.\nexport const brandArtwork = ${JSON.stringify(registry, null, 2)} as const;\n`;
// Formatter-independent generated registry: Prettier is intentionally disabled for this data file.
files.set('../../../src/shared/branding/artwork.ts', Buffer.from(ts));
for (const [relative, contents] of files) {
  const path = relative.startsWith('../')
    ? new URL('src/shared/branding/artwork.ts', root)
    : new URL(relative, output);
  if (check) {
    if (!(await readFile(path)).equals(contents))
      throw new Error(`Stale asset: ${relative}. Run npm run assets:generate.`);
  } else {
    await mkdir(new URL('.', path), { recursive: true });
    await writeFile(path, contents);
  }
}
console.log(
  `${check ? 'Verified' : 'Generated'} ${files.size} brand files; geometry, alpha and adaptive safe-circle checks passed.`,
);
