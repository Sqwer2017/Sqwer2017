import { escapeXml, measureText, wrapText, formatNumber, rgba } from '../util.mjs';
import { dotPattern, glowEllipse, linearGradient, sectionHeader, svgDoc } from '../theme.mjs';
import { icon } from '../icons.mjs';

const W = 880;

export function renderProjectsHeader(t, config) {
  const defs = [];
  return svgDoc({
    width: W,
    height: 112,
    label: `${config.title}. ${config.note}`,
    defs,
    body: `${sectionHeader(t, {
      eyebrow: config.eyebrow,
      title: config.title,
      note: config.note,
      x: 44,
      width: 792,
      titleSize: 31
    })}`
  });
}

export function renderProject(t, project, meta, index, total) {
  const H = 300;
  const stars = meta && Number.isFinite(meta.stars) ? meta.stars : null;
  const descriptionLines = wrapText(project.description, 470, 13.4, {}).slice(0, 3);
  const techChips = layoutTech(project.tech, 340, 208, t);
  const art = project.glyph === 'orb' ? orbArt(t, project, index) : moonArt(t, project, index);

  const defs = [
    linearGradient('project-card', [[0, t.card1], [1, t.card2]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    linearGradient('project-art', [[0, t.art1], [0.6, t.art2], [1, t.art2]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    linearGradient('project-glyph', [[0, t.accentBright], [1, t.accentDeep]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    linearGradient('project-rim', [[0, rgba(t.accentBright, 0.55)], [1, rgba(t.accentDeep, 0.15)]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    glowEllipse('project-glow', 150, 150, 126, 126, t.accentDeep, t.dark ? 0.42 : 0.2, true),
    dotPattern('project-dots', t.gridDot, 18, 1),
    `<linearGradient id="project-dot-fade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity="0.8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
    `<mask id="project-dot-mask"><rect width="300" height="300" fill="url(#project-dot-fade)"/></mask>`,
    `<clipPath id="project-art-clip"><path d="M28 0H300V300H28A28 28 0 0 1 0 272V28A28 28 0 0 1 28 0Z"/></clipPath>`,
    `<mask id="moon-cut"><circle cx="150" cy="150" r="46" fill="#fff"/><circle cx="169" cy="135" r="43" fill="#000"/></mask>`
  ].join('\n');

  const body = `
<rect x="0.5" y="0.5" width="879" height="${H - 1}" rx="28" fill="url(#project-card)" stroke="${t.border}"/>
<path d="M28 1H852" stroke="${t.sheen}" stroke-opacity="${t.dark ? 0.07 : 0.8}"/>
<g clip-path="url(#project-art-clip)">
  <rect width="300" height="300" fill="url(#project-art)"/>
  <rect width="300" height="300" fill="url(#project-dots)" mask="url(#project-dot-mask)" opacity="${t.dark ? 0.55 : 0.4}"/>
  <rect width="300" height="300" fill="url(#project-glow)"/>
  ${art}
</g>
<path d="M300 0V300" stroke="${t.hairline}"/>

<circle cx="340" cy="46" r="2.8" fill="${t.accent}"/>
<text x="352" y="50" class="mono" font-size="9.5" font-weight="600" letter-spacing="1.8" fill="${t.accent}">${escapeXml(project.category)}</text>
<text x="836" y="50" text-anchor="end" class="mono" font-size="8.5" letter-spacing="1.2" fill="${t.textFaint}" opacity="0.65">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</text>

<text x="338" y="112" class="display" font-size="40" font-weight="700" letter-spacing="-0.5" fill="${t.text}">${escapeXml(project.name)}</text>
<g>
  <circle cx="812" cy="108" r="22" fill="${t.chipBg}" stroke="${t.borderStrong}"/>
  ${icon('github', { x: 803, y: 99, size: 18, color: t.accent })}
</g>

${descriptionLines.map((line, i) => `<text x="340" y="${148 + i * 21}" font-size="13.4" fill="${t.textMuted}">${escapeXml(line)}</text>`).join('\n')}

${techChips}

${stars === null ? '' : `<g>
  <rect x="340" y="250" width="${starPillWidth(stars)}" height="32" rx="16" fill="${t.chipBg}" stroke="${t.chipBorder}"/>
  ${icon('ui-star', { x: 352, y: 259, size: 14, color: t.accentBright })}
  <text x="372" y="270.5" font-size="11.2" fill="${t.textMuted}"><tspan font-weight="600" fill="${t.text}">${escapeXml(formatNumber(stars))}</tspan> stars</text>
</g>`}

${repoButton(t, 836, 248)}

<rect x="0.5" y="0.5" width="879" height="${H - 1}" rx="28" stroke="${t.border}"/>
`;

  return svgDoc({
    width: W,
    height: H,
    label: `${project.name} — ${project.category}. ${project.description} Technologies: ${project.tech.join(', ')}.`,
    defs,
    body
  });
}

function repoButton(t, right, y) {
  const label = 'View repository';
  const textW = measureText(label, 11.5, { weight: 500 });
  const w = 16 + textW + 8 + 14 + 16;
  const x = right - w;
  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="36" rx="18" fill="${rgba(t.accent, 0.12)}" stroke="${rgba(t.accent, 0.3)}"/>
  <text x="${x + 16}" y="${y + 22.5}" font-size="11.5" font-weight="500" fill="${t.accent}">${label}</text>
  ${icon('ui-arrow', { x: x + w - 30, y: y + 11, size: 14, color: t.accent })}
</g>`;
}

function starPillWidth(stars) {
  const textW = measureText(`${formatNumber(stars)} stars`, 11.2, { weight: 500 });
  return 32 + textW + 16;
}

function layoutTech(items, startX, y, t) {
  let x = startX;
  const parts = items.map((label) => {
    const textW = measureText(label, 10.5, { weight: 500 });
    const w = textW + 20;
    const part = `<rect x="${x}" y="${y}" width="${w}" height="25" rx="12.5" fill="${t.chipBg}" stroke="${t.chipBorder}"/>
<text x="${x + 10}" y="${y + 16.5}" font-size="10.5" fill="${t.textMuted}">${escapeXml(label)}</text>`;
    x += w + 7;
    return part;
  });
  return `<g>${parts.join('\n')}</g>`;
}

function moonArt(t, project, index) {
  const bars = [12, 24, 40, 28, 52, 34, 20, 14];
  return `<g>
  <text x="24" y="32" class="mono" font-size="8.5" letter-spacing="1.6" fill="${t.textFaint}" opacity="0.8">${String(index + 1).padStart(2, '0')} / FEATURED</text>
  <g class="spin" style="transform-origin: 150px 150px; animation-duration: 64s">
    <circle cx="150" cy="150" r="112" stroke="${rgba(t.accent, 0.22)}" stroke-width="1"/>
    <circle cx="150" cy="150" r="86" stroke="${rgba(t.accent, 0.4)}" stroke-width="1" stroke-dasharray="2 7"/>
    <circle cx="150" cy="38" r="2.4" fill="${t.accentBright}"/>
  </g>
  <circle cx="150" cy="150" r="46" fill="url(#project-glyph)" mask="url(#moon-cut)"/>
  <circle cx="150" cy="150" r="64" stroke="${rgba(t.accentBright, 0.12)}" stroke-width="1"/>
  <path d="M198 104l1.7 4.7 4.7 1.7-4.7 1.7-1.7 4.7-1.7-4.7-4.7-1.7 4.7-1.7z" fill="${t.accentBright}" opacity="0.8"/>
  <circle cx="104" cy="188" r="2" fill="${t.accent}" opacity="0.7"/>
  <g>
    ${bars.map((height, i) => {
      const x = 104 + i * 12;
      return `<rect class="eq" style="animation-delay: ${(-0.18 * i).toFixed(2)}s; animation-duration: 2.4s" x="${x}" y="${246 - height}" width="4" height="${height}" rx="2" fill="${i % 3 === 0 ? t.accentBright : t.accent}" opacity="${0.55 + (i % 3) * 0.15}"/>`;
    }).join('')}
  </g>
  <text x="24" y="280" class="mono" font-size="8" letter-spacing="1.4" fill="${t.textFaint}" opacity="0.6">SQWER / 2026</text>
</g>`;
}

function orbArt(t, project, index) {
  const bubble = 'M122 104H178A26 26 0 0 1 204 130V170A26 26 0 0 1 178 196H140L110 218L118 196H122A26 26 0 0 1 96 170V130A26 26 0 0 1 122 104Z';
  return `<g>
  <text x="24" y="32" class="mono" font-size="8.5" letter-spacing="1.6" fill="${t.textFaint}" opacity="0.8">${String(index + 1).padStart(2, '0')} / FEATURED</text>
  <g class="spin" style="transform-origin: 150px 150px; animation-duration: 72s">
    <circle cx="150" cy="150" r="112" stroke="${rgba(t.accent, 0.22)}" stroke-width="1"/>
    <circle cx="150" cy="150" r="88" stroke="${rgba(t.accent, 0.32)}" stroke-width="1" stroke-dasharray="2 9"/>
    <circle cx="238" cy="150" r="2.2" fill="${t.accentBright}"/>
  </g>
  <path d="${bubble}" fill="${t.dark ? '#1B1527' : '#FFFFFF'}" stroke="url(#project-rim)" stroke-width="1.4"/>
  <text x="150" y="174" text-anchor="middle" class="display" font-size="62" font-weight="800" letter-spacing="-1" fill="url(#project-glyph)">A</text>
  <circle cx="206" cy="92" r="3" fill="${t.accentBright}" opacity="0.85"/>
  <circle cx="220" cy="80" r="2.2" fill="${t.accentBright}" opacity="0.5"/>
  <circle cx="231" cy="70" r="1.5" fill="${t.accentBright}" opacity="0.3"/>
  <path d="M96 240l2 5.6 5.6 2-5.6 2-2 5.6-2-5.6-5.6-2 5.6-2z" fill="${t.accent}" opacity="0.8"/>
  <path d="M210 228l1.5 4.2 4.2 1.5-4.2 1.5-1.5 4.2-1.5-4.2-4.2-1.5 4.2-1.5z" fill="${t.accentBright}" opacity="0.55"/>
  <text x="24" y="280" class="mono" font-size="8" letter-spacing="1.4" fill="${t.textFaint}" opacity="0.6">SQWER / 2026</text>
</g>`;
}
