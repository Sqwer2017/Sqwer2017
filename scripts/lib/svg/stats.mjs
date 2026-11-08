import { escapeXml, formatNumber, formatDate, plural } from '../util.mjs';
import { linearGradient, sectionHeader, svgDoc } from '../theme.mjs';
import { icon } from '../icons.mjs';

const W = 880;
const H = 284;

export function renderStats(t, config, data) {
  const stats = data?.stats || {};
  const counts = data?.repoCounts || {};
  const tiles = [];

  if (config.show?.stars !== false) {
    tiles.push({
      id: 'stars',
      icon: 'ui-star',
      label: 'TOTAL STARS',
      value: stats.stars,
      sub: 'across original repos'
    });
  }
  if (config.show?.repos !== false) {
    tiles.push({
      id: 'repos',
      icon: 'ui-repo',
      label: 'PUBLIC REPOSITORIES',
      value: stats.repos,
      sub: `${counts.original ?? 0} original · ${counts.forks ?? 0} ${plural(counts.forks ?? 0, 'fork')}`
    });
  }
  if (config.show?.followers !== false) {
    tiles.push({
      id: 'followers',
      icon: 'ui-users',
      label: 'FOLLOWERS',
      value: stats.followers,
      sub: 'on GitHub'
    });
  }
  if (config.show?.contributions !== false) {
    tiles.push({
      id: 'contributions',
      icon: 'ui-grid',
      label: 'CONTRIBUTIONS',
      value: stats.contributions,
      sub: 'in the last year'
    });
  }

  const visible = tiles.filter((tile) => tile.value !== null && tile.value !== undefined);
  const gap = 12;
  const tileW = (792 - gap * (visible.length - 1)) / Math.max(visible.length, 1);
  const updated = data?.generatedAt ? `Updated ${formatDate(data.generatedAt)}` : config.note;

  const defs = [
    linearGradient('stats-tile', [[0, t.card1], [1, t.card2]], { x1: 0, y1: 0, x2: 0.7, y2: 1 }),
  ].join('\n');

  const body = `
${sectionHeader(t, {
    eyebrow: config.eyebrow,
    title: config.title,
    note: updated,
    x: 44,
    width: 792,
    titleSize: 31
  })}

${visible.map((tile, i) => {
    const x = 44 + i * (tileW + gap);
    return `<g>
  <rect x="${x}" y="116" width="${tileW.toFixed(2)}" height="132" rx="22" fill="url(#stats-tile)" stroke="${t.border}"/>
  <path d="M${x + 22} 117H${x + tileW - 22}" stroke="${t.sheen}" stroke-opacity="${t.dark ? 0.07 : 0.8}"/>
  ${icon(tile.icon, { x: x + 22, y: 138, size: 18, color: t.accent })}
  <text x="${x + tileW - 20}" y="150" text-anchor="end" class="mono" font-size="8" letter-spacing="1.2" fill="${t.textFaint}" opacity="0.6">${String(i + 1).padStart(2, '0')}</text>
  <text x="${x + 22}" y="196" class="display" font-size="42" font-weight="700" letter-spacing="-1" fill="${t.text}">${escapeXml(formatNumber(tile.value))}</text>
  <text x="${x + 22}" y="216" class="mono" font-size="8.6" letter-spacing="1.5" fill="${t.textMuted}">${escapeXml(tile.label)}</text>
  <text x="${x + 22}" y="233" font-size="10.2" fill="${t.textFaint}">${escapeXml(tile.sub)}</text>
</g>`;
  }).join('\n')}
`;

  return svgDoc({
    width: W,
    height: H,
    label: `GitHub statistics for ${config.username}: ${visible.map((tile) => `${tile.label} ${tile.value}`).join(', ')}.`,
    defs,
    body
  });
}
