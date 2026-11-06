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
  return `<g fill="none" stroke="${p.accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
  <rect x="30" y="39" width="196" height="140" rx="26"/>
  <path d="M128 180v25m-34 0h68"/>
</g>
<g fill="${p.accent}">
  <rect x="120" y="65" width="16" height="25" rx="5"/>
  <rect x="120" y="128" width="16" height="25" rx="5"/>
  <rect x="84" y="101" width="25" height="16" rx="5"/>
  <rect x="147" y="101" width="25" height="16" rx="5"/>
</g>
<circle cx="128" cy="109" r="10" fill="${p.mint}"/>`;
}
export function svg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${body}\n</svg>\n`;
}
export function illustration(kind, p) {
  const tv = `<rect x="100" y="42" width="184" height="124" rx="16" fill="${p.panel}"/><path d="M174 187h36m-18-21v21"/>`;
  const phone = `<rect x="28" y="104" width="64" height="108" rx="12" fill="${p.panel}"/><path d="M51 116h18m-13 84h8"/>`;
  const frame = `<g fill="none" stroke="${p.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${tv}${phone}</g>`;
  const details = {
    discovering: `<path d="M123 91q69-55 138 0m-116 21q47-36 94 0m-69 21q22-17 44 0"/><circle cx="192" cy="144" r="3" fill="${p.accent}"/><path d="M53 157q7-7 14 0m-20-10q13-13 26 0"/><circle cx="60" cy="168" r="3" fill="${p.accent}"/><path d="M105 190h30m-10-10 10 10-10 10"/>`,
    pairing: `<rect x="127" y="84" width="130" height="42" rx="10"/><path d="M145 100v10m19-10v10m19-10v10m19-10v10m19-10v10m19-10v10"/><rect x="43" y="140" width="34" height="20" rx="4"/><path d="m48 178 8 8 16-17m33 1 25-25"/>`,
    'no-tv': `<circle cx="192" cy="102" r="27"/><path d="m211 123 17 17m-46-42h20M49 154h22m-22 12h14"/><path d="M111 202h51" stroke-dasharray="3 9"/>`,
    'connection-lost': `<path d="M138 102h30m48 0h30m-78-11v22m48-22v22m-37-31-8 20 22 8-8 20M49 149l22 22m0-22-22 22"/><path d="m112 193 14-14m15-14 14-14" stroke-dasharray="3 9"/>`,
  };
  return svg(
    320,
    240,
    `${frame}\n<g fill="none" stroke="${p.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${details[kind]}</g>`,
  );
}
