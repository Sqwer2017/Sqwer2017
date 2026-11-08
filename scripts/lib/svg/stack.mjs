import { escapeXml } from '../util.mjs';
import { dotPattern, glowEllipse, linearGradient, sectionHeader, svgDoc } from '../theme.mjs';
import { icon } from '../icons.mjs';

const W = 880;
const H = 400;

export function renderStack(t, config) {
  const main = config.groups.find((g) => g.id === 'main');
  const tools = config.groups.find((g) => g.id === 'tools');

  const defs = [
    linearGradient('stack-panel', [[0, t.card1], [1, t.card2]], { x1: 0, y1: 0, x2: 0.8, y2: 1 }),
    linearGradient('stack-panel-alt', [[0, t.card2], [1, t.card1]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    dotPattern('stack-dots', t.gridDot, 20, 1),
    `<linearGradient id="stack-dot-fade" x1="0" y1="0" x2="0.6" y2="1"><stop stop-color="#fff" stop-opacity="0.7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
    `<mask id="stack-dot-mask"><rect x="380" y="116" width="204" height="140" fill="url(#stack-dot-fade)"/></mask>`,
    glowEllipse('stack-glow', 700, 330, 180, 140, t.accentDeep, t.dark ? 0.2 : 0.1, true)
  ].join('\n');

  const body = `
${sectionHeader(t, {
    eyebrow: config.eyebrow,
    title: config.title,
    note: config.note,
    x: 44,
    width: 792,
    titleSize: 31
  })}

<rect x="44" y="116" width="540" height="252" rx="24" fill="url(#stack-panel)" stroke="${t.border}"/>
<rect x="384" y="116" width="200" height="140" fill="url(#stack-dots)" mask="url(#stack-dot-mask)" opacity="${t.dark ? 0.45 : 0.3}"/>
${panelLabel('MAIN', main.items.length, 68, 146, 560, t)}

${main.items.map((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    return chip(item, 68 + col * 166, 162 + row * 64, 156, 54, 18, 12.2, t);
  }).join('\n')}

<rect x="596" y="116" width="240" height="252" rx="24" fill="url(#stack-panel-alt)" stroke="${t.border}"/>
<rect x="596" y="116" width="240" height="252" rx="24" fill="url(#stack-glow)"/>
${panelLabel('TOOLS', tools.items.length, 620, 146, 812, t)}

${tools.items.map((item, i) => chip(item, 620, 162 + i * 50, 192, 43, 16, 11.8, t)).join('\n')}

`;

  return svgDoc({
    width: W,
    height: H,
    label: `${config.title}: ${config.groups.map((g) => `${g.label}: ${g.items.map((i) => i.label).join(', ')}`).join('. ')}`,
    defs,
    body
  });
}

function panelLabel(label, count, x, y, right, t) {
  return `<text x="${x}" y="${y}" class="mono" font-size="10" font-weight="600" letter-spacing="2.2" fill="${t.accent}">${escapeXml(label)}</text>
<text x="${right}" y="${y}" text-anchor="end" class="mono" font-size="8.5" letter-spacing="1.2" fill="${t.textFaint}" opacity="0.65">${String(count).padStart(2, '0')}</text>`;
}

function chip(item, x, y, w, h, iconSize, fontSize, t) {
  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${t.chipBg}" stroke="${t.chipBorder}"/>
  ${icon(item.id, { x: x + 16, y: y + (h - iconSize) / 2, size: iconSize, color: t.accent })}
  <text x="${x + 16 + iconSize + 10}" y="${y + h / 2 + 4.2}" font-size="${fontSize}" font-weight="500" fill="${t.text}">${escapeXml(item.label)}</text>
</g>`;
}
