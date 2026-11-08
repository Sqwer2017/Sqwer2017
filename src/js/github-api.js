import { PROFILE } from './profile-data.js';

const $ = (selector, root = document) => root.querySelector(selector);
const DAY = 86_400_000;
const MONTHS_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const FULL_MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const DATES_LONG = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const NUMBER = new Intl.NumberFormat('en-US');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const assetUrl = (pathname) => new URL(pathname, document.baseURI).href;
const icon = (id) =>
  `<span class="icon" aria-hidden="true" style="--icon:url('${assetUrl(`assets/icons/${id}.svg`)}')"></span>`;

const prettyDate = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : DATES_LONG.format(date);
};

const shortDate = (iso) => {
  const date = new Date(`${iso}T00:00:00Z`);
  return `${MONTHS_SHORT.format(date)} ${date.getUTCDate()}`;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export async function loadGithubData() {
  try {
    const response = await fetch('data/github.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    return null;
  }
}

export function renderStats(data) {
  const grid = $('#stat-grid');
  if (!grid || !data) return;
  const show = PROFILE.stats?.show || {};
  const counts = data.repoCounts || {};
  const items = [];

  if (show.stars !== false) {
    items.push({
      id: 'stars',
      icon: 'ui-star',
      label: 'TOTAL STARS',
      value: data.stats?.stars,
      sub: 'across original repos'
    });
  }
  if (show.repos !== false) {
    items.push({
      id: 'repos',
      icon: 'ui-repo',
      label: 'PUBLIC REPOSITORIES',
      value: data.stats?.repos,
      sub: `${counts.original ?? 0} original · ${counts.forks ?? 0} ${counts.forks === 1 ? 'fork' : 'forks'}`
    });
  }
  if (show.followers !== false) {
    items.push({
      id: 'followers',
      icon: 'ui-users',
      label: 'FOLLOWERS',
      value: data.stats?.followers,
      sub: 'on GitHub'
    });
  }
  if (show.contributions !== false) {
    items.push({
      id: 'contributions',
      icon: 'ui-grid',
      label: 'CONTRIBUTIONS',
      value: data.stats?.contributions,
      sub: 'in the last year'
    });
  }

  const visible = items.filter((item) => item.value !== null && item.value !== undefined);
  grid.innerHTML = visible
    .map(
      (item, index) => `<article class="stat">
  <div class="stat__head">${icon(item.icon)}<span class="stat__index">${String(index + 1).padStart(2, '0')}</span></div>
  <p class="stat__value" data-count="${Number(item.value) || 0}">${NUMBER.format(Number(item.value) || 0)}</p>
  <p class="stat__label">${escapeHtml(item.label)}</p>
  <p class="stat__sub">${escapeHtml(item.sub)}</p>
</article>`
    )
    .join('');
  animateCounters(grid);

  const updated = $('#signals-updated');
  if (updated) updated.textContent = data.generatedAt ? `Updated ${prettyDate(data.generatedAt)}` : 'Live snapshot';

  const total = Number(data.stats?.contributions);
  const totalNode = $('#contrib-total');
  if (totalNode) totalNode.textContent = Number.isFinite(total) ? NUMBER.format(total) : '—';
  const caption = $('#contrib-caption');
  if (caption) caption.textContent = Number(total) === 1 ? 'contribution in the last year' : 'contributions in the last year';

  renderHeatmap(data);
  renderLanguages(data);
}

function animateCounters(scope) {
  const values = [...scope.querySelectorAll('[data-count]')];
  if (!values.length) return;
  if (reducedMotion.matches) {
    values.forEach((el) => {
      el.textContent = NUMBER.format(Number(el.dataset.count) || 0);
    });
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        observer.unobserve(el);
        runCount(el);
      }
    },
    { threshold: 0.45 }
  );
  values.forEach((el) => observer.observe(el));
}

function runCount(el) {
  const target = Number(el.dataset.count) || 0;
  if (!target) {
    el.textContent = '0';
    return;
  }
  const duration = 950;
  let start = null;
  const step = (timestamp) => {
    if (start === null) start = timestamp;
    const progress = Math.min(1, (timestamp - start) / duration);
    const eased = 1 - (1 - progress) ** 3;
    el.textContent = NUMBER.format(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderHeatmap(data) {
  const host = $('#heatmap');
  if (!host) return;
  const contributions = data.contributions || {};
  const days = Array.isArray(contributions.days) ? contributions.days : [];
  if (!days.length) {
    host.innerHTML = '<p class="languages-note">Contribution data is not available yet. The daily workflow fills this in.</p>';
    return;
  }

  const parsed = days
    .map((day) => {
      const date = new Date(`${day.date}T00:00:00Z`);
      return { ...day, date, ms: date.getTime(), row: date.getUTCDay() };
    })
    .sort((a, b) => a.ms - b.ms);
  const first = parsed[0];
  const start = new Date(first.ms - first.row * DAY);
  const last = parsed[parsed.length - 1];
  const cols = Math.max(53, Math.ceil((last.ms - start.getTime() + DAY) / (7 * DAY)));

  let cells = '';
  for (const day of parsed) {
    const col = Math.floor((day.ms - start.getTime()) / (7 * DAY)) + 1;
    const level = day.count <= 0 ? 0 : Math.min(4, day.count);
    const title = `${day.count === 0 ? 'No contributions' : plural(day.count, 'contribution')} on ${DATES_LONG.format(day.date)}`;
    cells += `<span class="heat-cell" style="--cell:var(--heat-${level});grid-column:${col};grid-row:${day.row + 1}" title="${escapeHtml(title)}"></span>`;
  }

  const monthLabels = [];
  let lastMonth = -1;
  for (let col = 0; col < cols; col += 1) {
    const date = new Date(start.getTime() + col * 7 * DAY);
    const month = date.getUTCMonth();
    if (month === lastMonth) continue;
    if (monthLabels.length && col - monthLabels[monthLabels.length - 1].col < 4) {
      lastMonth = month;
      continue;
    }
    monthLabels.push({ col, label: MONTHS_SHORT.format(date) });
    lastMonth = month;
  }

  const monthMarkup = monthLabels
    .map((month) => `<span style="grid-column:${month.col + 1};grid-row:1">${escapeHtml(month.label)}</span>`)
    .join('');

  const total = Number(contributions.total) || 0;
  host.setAttribute(
    'aria-label',
    `Contribution heatmap for the last year: ${plural(total, 'contribution')} across ${plural(contributions.daysWithActivity || parsed.filter((d) => d.count > 0).length, 'active day')}.`
  );
  host.innerHTML = `<div class="heatmap__days" aria-hidden="true">
  <span style="grid-row:2">Mon</span>
  <span style="grid-row:4">Wed</span>
  <span style="grid-row:6">Fri</span>
</div>
<div class="heatmap__main">
  <div class="heatmap__months" aria-hidden="true" style="--cols:${cols}">${monthMarkup}</div>
  <div class="heatmap__grid" style="--cols:${cols}">${cells}</div>
</div>`;
}

function renderLanguages(data) {
  const bar = $('#language-bar');
  const legend = $('#language-legend');
  const panel = bar?.closest('.languages-panel');
  const note = panel?.querySelector('.languages-note');
  if (!bar || !legend) return;
  const languages = Array.isArray(data.languages) ? data.languages : [];
  if (!languages.length) {
    bar.innerHTML = '';
    legend.innerHTML = '';
    if (note) note.textContent = 'Language data is not available yet.';
    return;
  }

  const top = languages.slice(0, 4);
  const rest = languages.slice(4);
  const segments = [...top];
  if (rest.length) {
    const percent = Math.round(rest.reduce((sum, language) => sum + language.percent, 0) * 10) / 10;
    segments.push({ name: 'Other', percent });
  }

  bar.innerHTML = segments
    .map(
      (segment, index) =>
        `<span style="--w:${segment.percent}%;--c:var(--lang-${index % 6})" aria-hidden="true"></span>`
    )
    .join('');
  legend.innerHTML = segments
    .map(
      (segment, index) => `<li><i style="--c:var(--lang-${index % 6})" aria-hidden="true"></i><span>${escapeHtml(segment.name)}</span><b>${segment.percent.toFixed(1).replace(/\.0$/, '')}%</b></li>`
    )
    .join('');
  if (note) note.textContent = 'By bytes across original repositories.';
}

export function renderActivity(data) {
  const chart = $('#rhythm-chart');
  if (!chart || !data) return;
  const contributions = data.contributions || {};
  const days = Array.isArray(contributions.days) ? contributions.days : [];
  const total = Number(contributions.total) || 0;
  const active = Number(contributions.daysWithActivity) || days.filter((day) => day.count > 0).length;
  const peak = days.reduce((best, day) => (!best || day.count > best.count ? day : best), null);

  $('#rhythm-total').textContent = NUMBER.format(total);
  $('#rhythm-days').textContent = NUMBER.format(active);
  $('#rhythm-peak').textContent = peak && peak.count > 0 ? shortDate(peak.date) : '—';

  if (!days.length) {
    chart.innerHTML = '<p class="languages-note">Monthly activity will appear after the first data refresh.</p>';
    chart.setAttribute('aria-label', 'Monthly activity data is not available yet.');
    return;
  }

  const parsed = days
    .map((day) => {
      const date = new Date(`${day.date}T00:00:00Z`);
      return { ...day, date, ms: date.getTime() };
    })
    .sort((a, b) => a.ms - b.ms);
  const firstDate = parsed[0].date;
  const lastDate = parsed[parsed.length - 1].date;
  const startMonth = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), 1));
  const months = [];
  for (const cursor = new Date(startMonth); cursor <= endMonth; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    months.push(new Date(cursor));
  }
  const totals = new Array(months.length).fill(0);
  for (const day of parsed) {
    const index = (day.date.getUTCFullYear() - startMonth.getUTCFullYear()) * 12 + (day.date.getUTCMonth() - startMonth.getUTCMonth());
    if (index >= 0 && index < totals.length) totals[index] += day.count;
  }
  const max = Math.max(1, ...totals);
  const axis = $('#rhythm-axis');
  const range = $('#rhythm-range');
  if (range) {
    range.textContent = `${MONTHS_SHORT.format(months[0])} ${months[0].getUTCFullYear()} — ${MONTHS_SHORT.format(months[months.length - 1])} ${months[months.length - 1].getUTCFullYear()}`;
  }
  chart.style.setProperty('--cols', String(months.length));
  axis?.style.setProperty('--cols', String(months.length));
  chart.innerHTML = totals
    .map((count, index) => {
      const height = count === 0 ? 2 : Math.max(10, (count / max) * 100);
      const label = `${FULL_MONTH.format(months[index])}: ${plural(count, 'contribution')}`;
      return `<span class="rhythm-bar${count === 0 ? ' is-empty' : ''}" style="--h:${height}%;--i:${index}" title="${escapeHtml(label)}"></span>`;
    })
    .join('');
  if (axis) {
    axis.innerHTML = months
      .map((month) => `<span>${escapeHtml(MONTHS_SHORT.format(month))}</span>`)
      .join('');
  }
  chart.setAttribute(
    'aria-label',
    `Monthly contribution rhythm for the last year: ${plural(total, 'contribution')} across ${plural(active, 'active day')}. Peak day ${peak && peak.count > 0 ? DATES_LONG.format(new Date(`${peak.date}T00:00:00Z`)) : 'not available'}.`
  );
}

export function updateProjectStars(data) {
  if (!data?.projects) return;
  for (const project of data.projects) {
    const node = document.querySelector(`[data-project-stars="${project.id}"]`);
    if (node && Number.isFinite(project.stars)) node.textContent = NUMBER.format(project.stars);
  }
}
