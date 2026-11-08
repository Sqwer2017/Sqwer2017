import { escapeXml, wrapText } from '../util.mjs';
import { linearGradient, radialGradient, sectionHeader, svgDoc } from '../theme.mjs';
import { icon } from '../icons.mjs';

const W = 880;
const H = 480;
const X = 44;
const CONTENT_W = 792;

export function renderAbout(t, config) {
  const cards = config.cards;
  const wide = cards.find((c) => c.size === 'wide');
  const feature = cards.find((c) => c.size === 'feature');
  const normal = cards.filter((c) => c.size === 'normal').slice(0, 3);

  const defs = [
    linearGradient('about-card', [[0, t.card1], [1, t.card2]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    linearGradient('about-feature', [[0, t.art1], [0.7, t.card1], [1, t.card2]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    radialGradient('about-wash', [[0, t.accentDeep, 0.22], [1, t.accentDeep, 0]]),
    linearGradient('about-eq', [[0, t.accentBright], [1, t.accentDeep]], { x1: 0, y1: 1, x2: 1, y2: 0 })
  ].join('\n');

  const body = `
${sectionHeader(t, {
    eyebrow: config.eyebrow,
    title: config.title,
    note: config.note,
    x: X,
    width: CONTENT_W,
    titleSize: 31
  })}

${cardShell('about-card', X, 116, 456, 168, t)}
${wide ? renderWide(t, wide, X, 116) : ''}

${cardShell('about-feature', X + 468, 116, 324, 168, t, true)}
${feature ? renderFeature(t, feature, X + 468, 116) : ''}

${normal.map((item, i) => {
    const x = X + i * (256 + 12);
    return `${cardShell('about-card', x, 296, 256, 152, t)}
${renderNormal(t, item, x, 296, i + 3)}`;
  }).join('\n')}
`;

  return svgDoc({
    width: W,
    height: H,
    label: `${config.title}. ${cards.map((c) => `${c.title}: ${c.text}`).join(' ')}`,
    defs,
    body
  });
}

function cardShell(gradientId, x, y, w, h, t, feature = false) {
  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="url(#${gradientId})" stroke="${feature ? t.borderStrong : t.border}"/>
  <path d="M${x + 24} ${y + 1}H${x + w - 24}" stroke="${t.sheen}" stroke-opacity="${t.dark ? 0.07 : 0.8}"/>
  ${feature ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="url(#about-wash)" opacity="0.5"/>` : ''}
</g>`;
}

function iconTile(id, x, y, size, t) {
  const pad = Math.round(size * 0.22);
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${Math.round(size * 0.34)}" fill="${t.chipBg}" stroke="${t.chipBorder}"/>
${icon(id, { x: x + pad, y: y + pad, size: size - pad * 2, color: t.accentBright })}`;
}

function indexLabel(index, x, y, t) {
  return `<text x="${x}" y="${y}" text-anchor="end" class="mono" font-size="8.5" letter-spacing="1.2" fill="${t.textFaint}" opacity="0.6">${String(index).padStart(2, '0')}</text>`;
}

function renderWide(t, card, x, y) {
  const lines = wrapText(card.text, 260, 13, {}).slice(0, 3);
  const cx = x + 24;
  const mockX = x + 304;
  const mockY = y + 34;

  return `<g>
  <rect x="${cx}" y="${y + 24}" width="40" height="40" rx="14" fill="${t.chipBg}" stroke="${t.chipBorder}"/>
  ${icon(card.icon, { x: cx + 10, y: y + 34, size: 20, color: t.accentBright })}
  <text x="${cx}" y="${y + 76}" font-size="17" font-weight="600" fill="${t.text}" letter-spacing="-0.2">${escapeXml(card.title)}</text>
  ${lines.map((line, i) => `<text x="${cx}" y="${y + 100 + i * 19}" font-size="13" fill="${t.textMuted}">${escapeXml(line)}</text>`).join('')}

  <g>
    <rect x="${mockX}" y="${mockY}" width="128" height="100" rx="14" fill="${t.dark ? '#14101E' : '#F7F2FD'}" stroke="${t.border}"/>
    <circle cx="${mockX + 16}" cy="${mockY + 15}" r="2" fill="${t.accent}" opacity="0.7"/>
    <circle cx="${mockX + 24}" cy="${mockY + 15}" r="2" fill="${t.accent}" opacity="0.4"/>
    <circle cx="${mockX + 32}" cy="${mockY + 15}" r="2" fill="${t.accent}" opacity="0.22"/>
    <path d="M${mockX} ${mockY + 27}H${mockX + 128}" stroke="${t.border}"/>
    <rect x="${mockX + 14}" y="${mockY + 42}" width="76" height="6" rx="3" fill="${t.accent}" opacity="0.38"/>
    <rect x="${mockX + 14}" y="${mockY + 55}" width="52" height="6" rx="3" fill="${t.accent}" opacity="0.2"/>
    <rect x="${mockX + 14}" y="${mockY + 68}" width="64" height="6" rx="3" fill="${t.accent}" opacity="0.12"/>
    <rect x="${mockX + 14}" y="${mockY + 83}" width="38" height="10" rx="5" fill="${t.accentDeep}" opacity="0.55"/>
  </g>
  ${indexLabel(1, x + 432, y + 30, t)}
</g>`;
}

function renderFeature(t, card, x, y) {
  const bars = [16, 30, 44, 24, 50, 34, 20];
  return `<g>
  <rect x="${x + 24}" y="${y + 24}" width="40" height="40" rx="14" fill="${t.chipBg}" stroke="${t.chipBorder}"/>
  ${icon(card.icon, { x: x + 34, y: y + 34, size: 20, color: t.accentBright })}
  <text x="${x + 24}" y="${y + 76}" font-size="17" font-weight="600" fill="${t.text}" letter-spacing="-0.2">${escapeXml(card.title)}</text>
  <text x="${x + 24}" y="${y + 118}" font-size="21" font-weight="600" fill="${t.accentBright}" letter-spacing="-0.3">${escapeXml(card.text)}</text>
  <g>
    ${bars.map((height, i) => `<rect class="eq" style="animation-delay: ${(-0.22 * i).toFixed(2)}s" x="${x + 228 + i * 12}" y="${y + 148 - height}" width="4" height="${height}" rx="2" fill="url(#about-eq)" opacity="${0.55 + (i % 3) * 0.15}"/>`).join('')}
  </g>
  ${indexLabel(2, x + 300, y + 30, t)}
</g>`;
}

function renderNormal(t, card, x, y, index) {
  const lines = wrapText(card.text, 212, 12.3, {}).slice(0, 3);
  return `<g>
  <rect x="${x + 22}" y="${y + 22}" width="34" height="34" rx="12" fill="${t.chipBg}" stroke="${t.chipBorder}"/>
  ${icon(card.icon, { x: x + 30, y: y + 30, size: 18, color: t.accentBright })}
  <text x="${x + 22}" y="${y + 76}" font-size="15.5" font-weight="600" fill="${t.text}" letter-spacing="-0.2">${escapeXml(card.title)}</text>
  ${lines.map((line, i) => `<text x="${x + 22}" y="${y + 100 + i * 17}" font-size="12.3" fill="${t.textMuted}">${escapeXml(line)}</text>`).join('')}
  ${indexLabel(index, x + 234, y + 30, t)}
</g>`;
}
