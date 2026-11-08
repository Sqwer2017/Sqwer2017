import { escapeXml, formatNumber, measureText, plural } from '../util.mjs';
import { glowEllipse, linearGradient, sectionHeader, svgDoc } from '../theme.mjs';

const W = 880;
const H = 388;
const DAY = 86_400_000;
const CELL = 11;
const STEP = 13.5;
const GRID_X = 83;
const GRID_Y = 178;

export function renderActivity(t, config, data) {
  const contributions = data?.contributions || { total: 0, days: [] };
  const days = Array.isArray(contributions.days) ? contributions.days : [];
  const languages = Array.isArray(data?.languages) ? data.languages : [];
  const activeDays = contributions.daysWithActivity ?? days.filter((d) => d.count > 0).length;
  const headerNote = days.length
    ? `Last 12 months · ${activeDays} active ${plural(activeDays, 'day')}`
    : 'Last 12 months';

  const defs = [
    linearGradient('activity-panel', [[0, t.card1], [1, t.card2]], { x1: 0, y1: 0, x2: 0.85, y2: 1 }),
    glowEllipse('activity-glow', 760, 140, 260, 220, t.accentDeep, t.dark ? 0.2 : 0.1, true),

    `<clipPath id="lang-clip"><rect x="68" y="316" width="744" height="8" rx="4"/></clipPath>`
  ].join('\n');

  const grid = days.length ? heatmap(t, days, config.weeks || 53) : '';
  const languagesMarkup = config.showLanguages === false ? '' : languageBlock(t, languages);

  const body = `
${sectionHeader(t, {
    eyebrow: config.eyebrow,
    title: config.title,
    note: headerNote,
    x: 44,
    width: 792,
    titleSize: 31
  })}

<rect x="44" y="116" width="792" height="248" rx="24" fill="url(#activity-panel)" stroke="${t.border}"/>
<rect x="44" y="116" width="792" height="248" rx="24" fill="url(#activity-glow)"/>
<path d="M68 117H812" stroke="${t.sheen}" stroke-opacity="${t.dark ? 0.07 : 0.8}"/>

<text x="68" y="149" class="display" font-size="27" font-weight="700" letter-spacing="-0.5" fill="${t.text}">${escapeXml(formatNumber(contributions.total || 0))}</text>
<text x="${(68 + measureText(formatNumber(contributions.total || 0), 27, { weight: 700 }) + 9).toFixed(1)}" y="148" font-size="11.5" fill="${t.textMuted}">contributions in the last year</text>
${legend(t, 812, 147)}

${grid || `<text x="68" y="220" font-size="12" fill="${t.textFaint}">Contribution data is not available yet. It refreshes with the profile workflow.</text>`}

${languagesMarkup}

<rect x="44.5" y="116.5" width="791" height="247" rx="23.5" stroke="${t.border}"/>
`;

  return svgDoc({
    width: W,
    height: H,
    label: `Contribution activity for ${data?.user?.login || 'Sqwer'}: ${contributions.total || 0} contributions in the last year.`,
    defs,
    body
  });
}

function heatmap(t, days, weeks) {
  const parsed = days
    .map((d) => {
      const date = new Date(`${d.date}T00:00:00Z`);
      return { ...d, date, ms: date.getTime(), row: date.getUTCDay() };
    })
    .sort((a, b) => a.ms - b.ms);
  const first = parsed[0];
  const last = parsed[parsed.length - 1];
  const start = new Date(first.ms - first.row * DAY);
  const cols = Math.max(weeks, Math.ceil((last.ms - start.getTime() + DAY) / (7 * DAY)));

  const cells = parsed.map((day) => {
    const col = Math.floor((day.ms - start.getTime()) / (7 * DAY));
    const level = day.count <= 0 ? 0 : Math.min(4, day.count);
    return {
      x: GRID_X + col * STEP,
      y: GRID_Y + day.row * STEP,
      fill: t.heat[level],
      date: day.date,
      count: day.count
    };
  });

  const labels = [];
  let lastMonth = -1;
  for (let col = 0; col < cols; col += 1) {
    const columnDate = new Date(start.getTime() + col * 7 * DAY);
    if (columnDate.getTime() < first.ms - 3 * DAY) continue;
    const month = columnDate.getUTCMonth();
    if (month !== lastMonth) {
      const x = GRID_X + col * STEP;
      if (!labels.length || x - labels[labels.length - 1].x > 26) {
        labels.push({
          x,
          label: columnDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
        });
      }
      lastMonth = month;
    }
  }

  const weekdays = [
    { row: 1, label: 'Mon' },
    { row: 3, label: 'Wed' },
    { row: 5, label: 'Fri' }
  ];

  return `<g>
  ${labels.map((label) => `<text x="${label.x.toFixed(1)}" y="170" class="mono" font-size="8.5" fill="${t.textFaint}">${escapeXml(label.label)}</text>`).join('')}
  ${weekdays.map((d) => `<text x="${GRID_X - 8}" y="${(GRID_Y + d.row * STEP + 9.2).toFixed(1)}" text-anchor="end" class="mono" font-size="8" fill="${t.textFaint}">${d.label}</text>`).join('')}
  ${cells.map((cell) => `<rect x="${cell.x.toFixed(1)}" y="${cell.y.toFixed(1)}" width="${CELL}" height="${CELL}" rx="2.6" fill="${cell.fill}"/>`).join('')}
</g>`;
}

function legend(t, right, y) {
  const swatch = 9;
  const gap = 4;
  const total = 5 * swatch + 4 * gap;
  const moreW = measureText('MORE', 8, { mono: true });
  const lessW = measureText('LESS', 8, { mono: true });
  const start = right - (lessW + 8 + total + 8 + moreW);
  return `<g>
  <text x="${start.toFixed(1)}" y="${y}" class="mono" font-size="8" fill="${t.textFaint}">LESS</text>
  ${t.heat.map((color, i) => `<rect x="${(start + lessW + 8 + i * (swatch + gap)).toFixed(1)}" y="${y - 8}" width="${swatch}" height="${swatch}" rx="2" fill="${color}"/>`).join('')}
  <text x="${(start + lessW + 8 + total + 8).toFixed(1)}" y="${y}" class="mono" font-size="8" fill="${t.textFaint}">MORE</text>
</g>`;
}

function languageBlock(t, languages) {
  if (!languages.length) {
    return `<path d="M68 292H812" stroke="${t.hairline}"/>
<text x="68" y="308" class="mono" font-size="9.5" letter-spacing="1.8" fill="${t.accent}">TOP LANGUAGES</text>
<text x="68" y="326" font-size="11" fill="${t.textFaint}">Language data is not available yet.</text>`;
  }

  const top = languages.slice(0, 4);
  const rest = languages.slice(4);
  const segments = [...top];
  if (rest.length) {
    segments.push({
      name: 'Other',
      percent: Math.round(rest.reduce((n, l) => n + l.percent, 0) * 10) / 10
    });
  }
  let x = 68;
  const barParts = segments.map((segment, i) => {
    const width = (segment.percent / 100) * 744;
    const part = `<rect x="${x.toFixed(2)}" y="316" width="${Math.max(0, width - (i < segments.length - 1 ? 2 : 0)).toFixed(2)}" height="8" fill="${t.languageColors[i % t.languageColors.length]}"/>`;
    x += width;
    return part;
  });

  let lx = 68;
  const legendParts = segments.map((segment, i) => {
    const text = `${segment.name} ${segment.percent.toFixed(1).replace(/\.0$/, '')}%`;
    const width = measureText(text, 9.6, {});
    const part = `<g>
      <circle cx="${(lx + 3).toFixed(1)}" cy="338" r="3" fill="${t.languageColors[i % t.languageColors.length]}"/>
      <text x="${(lx + 11).toFixed(1)}" y="341.5" font-size="9.6" fill="${t.textMuted}">${escapeXml(segment.name)} <tspan fill="${t.textFaint}">${segment.percent.toFixed(1).replace(/\.0$/, '')}%</tspan></text>
    </g>`;
    lx += width + 11 + 18;
    return part;
  });

  return `<path d="M68 292H812" stroke="${t.hairline}"/>
<text x="68" y="308" class="mono" font-size="9.5" font-weight="600" letter-spacing="1.8" fill="${t.accent}">TOP LANGUAGES</text>
<text x="812" y="308" text-anchor="end" class="mono" font-size="8.5" fill="${t.textFaint}">BY BYTES · ORIGINAL REPOS</text>
<g clip-path="url(#lang-clip)">${barParts.join('')}</g>
${legendParts.join('')}`;
}
