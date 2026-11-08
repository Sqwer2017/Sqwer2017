import { escapeXml, measureText, wrapText, blobPath, rgba } from '../util.mjs';
import { avatarDataUri, glowEllipse, dotPattern, linearGradient, radialGradient, svgDoc } from '../theme.mjs';
import { icon } from '../icons.mjs';

const W = 880;
const H = 448;

export function renderHero(t, profile) {
  const { identity } = profile;
  const avatar = avatarDataUri();
  const blob = blobPath(215, 224, 147, { points: 9, irregularity: 0.086, seed: 23, ry: 144 });
  const name = identity.displayName;

  const defs = [
    linearGradient('hero-card', [
      [0, t.card1],
      [0.55, t.dark ? '#161020' : '#FCF9FF'],
      [1, t.card2]
    ], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    linearGradient('hero-name', [[0, t.text], [0.65, t.text], [1, t.dark ? t.accentBright : t.accentDeep]], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    glowEllipse('hero-glow-a', 742, 54, 300, 250, t.accentDeep, t.dark ? 0.5 : 0.22, true),
    glowEllipse('hero-glow-b', 98, 436, 280, 230, t.accent, t.dark ? 0.2 : 0.14, true),
    glowEllipse('hero-portrait-glow', 215, 226, 190, 184, t.accentDeep, t.dark ? 0.55 : 0.25, true),
    linearGradient('hero-photo-tint', [[0, t.accentBright, 0.16], [0.55, t.accentDeep, 0.05], [1, '#0D0A13', 0.28]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    radialGradient('hero-vignette', [
      [0, '#0D0A13', 0],
      [0.68, '#0D0A13', 0.08],
      [1, '#0D0A13', 0.62]
    ], { cx: 0.5, cy: 0.42, r: 0.72 }),
    linearGradient('hero-rim', [[0, 'rgba(255,255,255,0.55)'], [0.45, rgba(t.accentBright, 0.45)], [1, rgba(t.accentDeep, 0.12)]], { x1: 0, y1: 0, x2: 0.8, y2: 1 }),
    dotPattern('hero-dots', t.gridDot, 26, 1),
    linearGradient('hero-dot-fade', [[0, '#fff', 0.85], [0.52, '#fff', 0.25], [1, '#fff', 0]], { x1: 0, y1: 0, x2: 0.8, y2: 1 }),
    linearGradient('hero-divider', [[0, t.accent, 0], [0.45, t.accent, 0.4], [1, t.accent, 0]]),
    linearGradient('hero-chip-sheen', [[0, t.accentBright, 0.9], [1, t.accent, 0.4]], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    `<mask id="hero-dot-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#hero-dot-fade)"/></mask>`,
    `<clipPath id="hero-avatar-clip"><path d="${blob}"/></clipPath>`
  ].join('\n');

  const chips = layoutChips(identity.chips, 456, 338, t);

  const body = `
<rect x="0" y="0" width="${W}" height="${H}" rx="32" fill="url(#hero-card)"/>
<rect width="${W}" height="${H}" rx="32" fill="url(#hero-dots)" mask="url(#hero-dot-mask)" opacity="${t.dark ? 0.55 : 0.45}"/>
<g class="pulse" style="animation-duration: 16s">
  <rect width="${W}" height="${H}" fill="url(#hero-glow-a)"/>
  <rect width="${W}" height="${H}" fill="url(#hero-glow-b)"/>
</g>
<path d="M880 296c-36 74-108 132-196 152" stroke="${rgba(t.accent, 0.16)}" stroke-width="1"/>
<path d="M880 262c-52 94-140 164-252 186" stroke="${rgba(t.accent, 0.09)}" stroke-width="1"/>

<text x="836" y="72" text-anchor="end" class="mono" font-size="9.5" letter-spacing="1.5" fill="${t.textFaint}" opacity="0.85">PROFILE / 2026</text>

<g class="float">
  <rect x="${215 - 172}" y="${224 - 168}" width="344" height="336" fill="url(#hero-portrait-glow)"/>
  <g class="spin">
    <circle cx="215" cy="224" r="169" stroke="${rgba(t.accent, t.dark ? 0.42 : 0.34)}" stroke-width="1.2" stroke-dasharray="2 8"/>
    <circle cx="215" cy="55" r="7" fill="${rgba(t.accentBright, 0.16)}"/>
    <circle cx="215" cy="55" r="2.7" fill="${t.accentBright}"/>
    <circle cx="351" cy="322" r="2" fill="${rgba(t.accent, 0.75)}"/>
  </g>
  <path d="${blob}" fill="${t.dark ? '#0D0A13' : '#EFE8F8'}" opacity="0.9"/>
  <image href="${avatar}" x="68" y="77" width="294" height="294" preserveAspectRatio="xMidYMid slice" clip-path="url(#hero-avatar-clip)"/>
  <path d="${blob}" fill="url(#hero-photo-tint)" opacity="0.6"/>
  <path d="${blob}" fill="#0D0A13" opacity="0.13"/>
  <path d="${blob}" fill="url(#hero-vignette)"/>
  <path d="${blob}" stroke="url(#hero-rim)" stroke-width="1.3"/>
  <g>
    <rect x="82" y="342" width="78" height="26" rx="13" fill="${t.dark ? '#15101F' : '#FFFFFF'}" fill-opacity="0.9" stroke="${t.chipBorder}"/>
    <circle cx="96" cy="355" r="2.6" fill="${t.accentBright}"/>
    <text x="105" y="358.5" class="mono" font-size="8.5" letter-spacing="1.4" fill="${t.accent}">SQWER</text>
  </g>
  <path class="float-slow" d="M330 91l2.5 7.1 7.1 2.5-7.1 2.5-2.5 7.1-2.5-7.1-7.1-2.5 7.1-2.5z" fill="${t.accentBright}" opacity="0.85"/>
</g>

<path d="M414 96V352" stroke="url(#hero-divider)" stroke-width="1"/>

<g class="fade" style="animation-delay: 0.15s">
  <path d="M456 128h22" stroke="${t.accent}" stroke-width="1.2"/>
  <text x="488" y="132" class="mono" font-size="10.5" font-weight="600" letter-spacing="3" fill="${t.accent}">${escapeXml(identity.greeting)}</text>
  <text x="836" y="403" text-anchor="end" class="mono" font-size="9" letter-spacing="1.8" fill="${t.textFaint}" opacity="0.7">DIGITAL ATMOSPHERE</text>
</g>

<g class="enter" style="animation-delay: 0.28s; filter: drop-shadow(0 10px 34px ${rgba(t.accentDeep, t.dark ? 0.28 : 0.16)})">
  <text x="455" y="216" class="display" font-size="88" font-weight="800" letter-spacing="-2" fill="url(#hero-name)">${[...name].map((ch, i) => `<tspan opacity="1" style="animation: fade 0.5s ease ${0.22 + i * 0.06}s backwards">${escapeXml(ch)}</tspan>`).join('')}</text>
</g>

<text x="456" y="252" font-size="17" font-weight="500" letter-spacing="0.1" fill="${t.textMuted}" class="enter" style="animation-delay: 0.6s"><tspan fill="${t.text}">${escapeXml(identity.role)}</tspan><tspan fill="${t.accent}"> / </tspan>${escapeXml(identity.subrole)}</text>

${wrapText(identity.description, 374, 13.5, {})
    .slice(0, 2)
    .map(
      (line, i) =>
        `<text x="456" y="${286 + i * 21}" font-size="13.5" fill="${t.textMuted}" class="enter" style="animation-delay: ${0.7 + i * 0.06}s">${escapeXml(line)}</text>`
    )
    .join('\n')}

${chips.markup}

<g class="fade" style="animation-delay: 1.05s">
  ${icon('github', { x: 456, y: 391, size: 14, color: t.textFaint })}
  <text x="478" y="402" class="mono" font-size="10.5" fill="${t.textFaint}">github.com/${escapeXml(identity.handle)}</text>
</g>

<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="32" stroke="${t.border}"/>
<path d="M54 1H826" stroke="${t.sheen}" stroke-opacity="${t.dark ? 0.07 : 0.75}"/>
`;

  return svgDoc({
    width: W,
    height: H,
    label: `${identity.name}, ${identity.role} and ${identity.subrole}. ${identity.description}`,
    defs,
    body
  });
}

function layoutChips(labels, startX, y, t) {
  let x = startX;
  const parts = [];
  labels.forEach((label, index) => {
    const size = 11.5;
    const textWidth = measureText(label, size, { weight: 500 });
    const width = 23 + textWidth + 13;
    parts.push(`<g class="enter" style="animation-delay: ${0.85 + index * 0.08}s">
  <rect x="${x.toFixed(1)}" y="${y}" width="${width.toFixed(1)}" height="30" rx="15" fill="${t.chipBg}" stroke="${t.chipBorder}"/>
  <circle cx="${(x + 13).toFixed(1)}" cy="${y + 15}" r="2.5" fill="${t.accent}"/>
  <text x="${(x + 23).toFixed(1)}" y="${y + 19}" font-size="${size}" font-weight="500" fill="${t.text}">${escapeXml(label)}</text>
</g>`);
    x += width + 8;
  });
  return { markup: parts.join('\n'), width: x - startX - 8 };
}
