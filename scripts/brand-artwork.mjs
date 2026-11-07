// Editable geometric masters. Coordinates use a 256-unit symbol / 320×240 illustration grid.
export const brand = {
  navy: '#101827',
  teal: '#19B8A6',
  mint: '#63D7C1',
  light: '#F5F7FA',
};
export const appearances = {
  dark: {
    ink: '#F5F7FA',
    accent: brand.teal,
    mint: brand.mint,
    panel: '#1D2E44',
    muted: '#AAB8CC',
  },
  light: {
    ink: brand.navy,
    accent: '#087F73',
    mint: '#087F73',
    panel: '#E6EFEE',
    muted: '#5A697D',
  },
  mono: {
    ink: '#FFFFFF',
    accent: '#FFFFFF',
    mint: '#FFFFFF',
    panel: 'none',
    muted: '#FFFFFF',
  },
};
export function symbol(p = appearances.dark) {
  // The remote's controls are real transparent cutouts, including in monochrome.
  // Even-odd paths avoid masks and keep the same geometry in native SVG and PNG.
  return `<g fill="none" stroke="${p.accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
  <path d="M140 70H47a22 22 0 0 0-22 22v72a22 22 0 0 0 22 22h41m143-57v35a22 22 0 0 1-22 22h-49m8 20h20"/>
  <path d="M151 30c47 0 83 36 83 81m-81-61c35 0 61 26 61 61m-59-41c23 0 39 18 39 41" stroke-width="9"/>
</g>
<path fill="${p.ink}" fill-rule="evenodd" d="M110 87h28a26 26 0 0 1 26 26v91a26 26 0 0 1-26 26h-28a26 26 0 0 1-26-26v-91a26 26 0 0 1 26-26Z
M98 166a26 26 0 1 0 52 0 26 26 0 1 0-52 0Z
M118 207a6 6 0 1 0 12 0 6 6 0 1 0-12 0Z
M124 108a3 3 0 0 1 3 3v11a3 3 0 0 1-6 0v-11a3 3 0 0 1 3-3Z
M116 117a12 12 0 1 0 16 0l-4 4a6.5 6.5 0 1 1-8 0Z"/>
<g fill="${p.ink}" stroke-linejoin="round">
  <path d="m124 145-5 6h10Zm0 42-5-6h10Zm-21-21 6-5v10Zm42 0-6-5v10Z"/>
</g>
<circle cx="124" cy="166" r="10" fill="${p.mint}"/>`;
}
export function svg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${body}\n</svg>\n`;
}
function phone(p) {
  return `<g fill="none" stroke="${p.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <rect x="24" y="84" width="64" height="128" rx="14" fill="${p.panel}"/>
  <path d="M47 96h18m-13 104h8"/>
</g>`;
}
function television(p, ghost = false) {
  return `<g fill="none" stroke="${ghost ? p.muted : p.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"${ghost ? ' stroke-dasharray="7 9"' : ''}>
  <rect x="134" y="42" width="162" height="106" rx="15" fill="${ghost ? 'none' : p.panel}"/>
  <path d="M215 149v25m-20 0h40"/>
</g>`;
}
function phoneRemote(p, muted = false) {
  const ink = muted ? p.muted : p.accent;
  return `<g fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round">
  <rect x="38" y="117" width="36" height="25" rx="5"/>
  <path d="M56 154v5m0 18v5m-14-14h5m18 0h5"/>
</g><circle cx="56" cy="168" r="4" fill="${ink}"/>`;
}
function wireless(p) {
  return `<path d="M178 86q37-30 74 0m-62 15q25-20 50 0m-37 13q12-10 24 0"/><circle cx="215" cy="124" r="3" fill="${p.accent}" stroke="none"/>`;
}
export function illustration(kind, p) {
  const frame = `${television(p, kind === 'no-tv')}${phone(p)}`;
  const details = {
    discovering: `${phoneRemote(p)}
      <g fill="none" stroke="${p.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        ${wireless(p)}
        <path d="M95 121q8 9 0 18m9-28q17 19 0 38m9-48q26 29 0 58"/>
      </g>`,
    pairing: `<g fill="none" stroke="${p.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        ${Array.from({ length: 6 }, (_, i) => `<rect x="${151 + i * 22}" y="82" width="12" height="20" rx="3"/>`).join('')}
        <rect x="34" y="121" width="44" height="25" rx="5"/>
        <path d="m153 163-43 24m3-12-3 12 12 3"/>
      </g>
      <g fill="${p.muted}">${[158, 174].map((y) => [43, 56, 69].map((x) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')).join('')}</g>
      <g fill="${p.accent}">${Array.from({ length: 6 }, (_, i) => `<circle cx="${39 + i * 7}" cy="133" r="1.6"/>`).join('')}<circle cx="69" cy="174" r="4"/></g>`,
    'no-tv': `${phoneRemote(p)}
      <path d="M96 157h30" fill="none" stroke="${p.muted}" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 8"/>
      <g transform="translate(-16 4)" stroke="${p.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="170" cy="143" r="30" fill="${p.panel}"/>
        <path d="m192 165 23 23" fill="none"/>
        <path d="M162 135a8 8 0 0 1 16 0c0 6-8 6-8 12" fill="none"/>
        <circle cx="170" cy="155" r="2.5" fill="${p.accent}" stroke="none"/>
      </g>`,
    'connection-lost': `${phoneRemote(p, true)}
      <g fill="none" stroke="${p.muted}" stroke-width="4" stroke-linecap="round" stroke-dasharray="3 8">
        <path d="M89 157h20m34-9 18-18"/>
      </g>
      <g fill="none" stroke="${p.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        ${wireless(p)}
        <path d="m187 73 57 58" stroke="${p.panel}" stroke-width="11"/>
        <path d="m187 73 57 58"/>
        <circle cx="126" cy="157" r="19" fill="${p.panel}"/>
        <path d="m119 150 14 14m0-14-14 14"/>
      </g>`,
  };
  if (!Object.hasOwn(details, kind))
    throw new Error(`Unknown illustration: ${kind}`);
  return svg(320, 240, `${frame}\n${details[kind]}`);
}
