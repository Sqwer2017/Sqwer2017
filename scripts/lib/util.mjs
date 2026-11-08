export function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

const WIDTHS = {
  a: 0.556, b: 0.556, c: 0.5, d: 0.556, e: 0.556, f: 0.278, g: 0.556, h: 0.556,
  i: 0.222, j: 0.222, k: 0.5, l: 0.222, m: 0.833, n: 0.556, o: 0.556, p: 0.556,
  q: 0.556, r: 0.333, s: 0.5, t: 0.278, u: 0.556, v: 0.5, w: 0.722, x: 0.5,
  y: 0.5, z: 0.5,
  A: 0.667, B: 0.667, C: 0.722, D: 0.722, E: 0.667, F: 0.611, G: 0.778, H: 0.722,
  I: 0.278, J: 0.5, K: 0.667, L: 0.556, M: 0.833, N: 0.722, O: 0.778, P: 0.667,
  Q: 0.778, R: 0.722, S: 0.667, T: 0.611, U: 0.722, V: 0.667, W: 0.944, X: 0.667,
  Y: 0.667, Z: 0.611,
  0: 0.556, 1: 0.556, 2: 0.556, 3: 0.556, 4: 0.556, 5: 0.556, 6: 0.556, 7: 0.556,
  8: 0.556, 9: 0.556,
  ' ': 0.278, '.': 0.278, ',': 0.278, '/': 0.278, '-': 0.333, '—': 0.8, '&': 0.667,
  '·': 0.32, '@': 0.9, '+': 0.584, ':': 0.278, ';': 0.278, "'": 0.191, '"': 0.355,
  '(': 0.333, ')': 0.333, '#': 0.556, '%': 0.889, '!': 0.278, '?': 0.556,
  '©': 0.74, '★': 0.78, '→': 0.9, '↗': 0.85, '*': 0.389, '=': 0.584, '_': 0.556
};

export function measureText(text, size, { weight = 400, tracking = 0, mono = false } = {}) {
  const value = String(text);
  if (mono) return value.length * size * 0.6 + Math.max(0, value.length - 1) * tracking;
  let em = 0;
  for (const ch of value) {
    em += WIDTHS[ch] ?? (/[A-Z]/.test(ch) ? 0.7 : 0.55);
  }
  const weightFactor = weight >= 700 ? 1.04 : weight >= 600 ? 1.02 : 1;
  return em * size * weightFactor + Math.max(0, value.length - 1) * tracking;
}

export function wrapText(text, maxWidth, size, options = {}) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || measureText(candidate, size, options) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function formatNumber(n) {
  const value = Number(n) || 0;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value);
}

export function formatDate(iso, { month = 'short', day = true, year = true } = {}) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const m = date.toLocaleString('en-US', { month, timeZone: 'UTC' });
  return [day ? `${m} ${date.getUTCDate()}` : m, year ? date.getUTCFullYear() : null]
    .filter(Boolean)
    .join(', ');
}

export function rgba(hex, alpha = 1) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${Number(alpha.toFixed(3))})`;
}

export function hashString(value) {
  let hash = 2166136261;
  for (const ch of String(value)) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Closed organic blob, smoothed through a Catmull-Rom to cubic conversion. */
export function blobPath(cx, cy, radius, { points = 9, irregularity = 0.06, seed = 7, ry = radius } = {}) {
  const rand = seeded(seed);
  const pts = [];
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2 + (rand() - 0.5) * 0.12;
    const factor = 1 + (rand() - 0.5) * 2 * irregularity;
    pts.push([cx + Math.cos(angle) * radius * factor, cy + Math.sin(angle) * ry * factor]);
  }
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d}Z`;
}

export function plural(n, singular, pluralForm = `${singular}s`) {
  return Number(n) === 1 ? singular : pluralForm;
}
