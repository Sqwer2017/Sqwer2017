import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeXml, rgba } from './util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const FONT = "'Segoe UI Variable Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
export const DISPLAY = "'Segoe UI Variable Display', 'Segoe UI Variable Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
export const MONO = "'Cascadia Code', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";

export function tokens(palette, mode) {
  const p = palette[mode];
  const dark = mode === 'dark';
  return {
    ...p,
    mode,
    dark,
    card1: dark ? '#1B1527' : '#FFFFFF',
    card2: dark ? '#120D1B' : '#EFE6FA',
    art1: dark ? '#241B36' : '#EEE4FB',
    art2: dark ? '#120D1B' : '#FFFFFF',
    border: rgba(p.accent, dark ? 0.17 : 0.21),
    borderStrong: rgba(p.accent, dark ? 0.32 : 0.32),
    hairline: rgba(p.accent, dark ? 0.12 : 0.16),
    sheen: dark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.95)',
    chipBg: dark ? rgba(p.accent, 0.065) : rgba(p.accent, 0.06),
    chipBorder: rgba(p.accent, dark ? 0.16 : 0.2),
    glow: rgba(p.accentDeep, dark ? 0.38 : 0.22),
    glowSoft: rgba(p.accent, dark ? 0.16 : 0.11),
    shadow: dark ? 'rgba(0,0,0,0.4)' : 'rgba(95,53,184,0.12)',
    gridDot: rgba(p.accent, dark ? 0.16 : 0.18),
    heat: dark
      ? ['#241C33', '#3A2A55', '#5E3F96', '#8D5CF6', '#C6A6FF']
      : ['#EDE6F8', '#D2C2EE', '#AE93E4', '#7C53CF', '#512A9C'],
    languageColors: dark
      ? ['#C6A6FF', '#9B75EE', '#7954CB', '#5A3F9C', '#3F2D6D', '#2A2045']
      : ['#6F42C1', '#9067D8', '#B396E6', '#CDBCEE', '#DFD3F4', '#EDE5F9']
  };
}

export const BASE_CSS = `
  text { font-family: ${FONT}; }
  .mono { font-family: ${MONO}; }
  .display { font-family: ${DISPLAY}; }
  .enter { animation: enter 0.8s cubic-bezier(0.22, 0.68, 0, 1) backwards; }
  .fade { animation: fade 1s ease backwards; }
  .float { animation: float 8s ease-in-out infinite; }
  .float-slow { animation: float 12s ease-in-out infinite; }
  .breathe { transform-box: fill-box; transform-origin: center; animation: breathe 11s ease-in-out infinite; }
  .spin { transform-box: view-box; transform-origin: 215px 224px; animation: spin 52s linear infinite; }
  .pulse { animation: pulse 7s ease-in-out infinite; }
  .eq { transform-box: fill-box; transform-origin: bottom; animation: eq 1.6s ease-in-out infinite; }
  @keyframes enter {
    from { opacity: 0; transform: translateY(14px); filter: blur(6px); }
    to { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
  @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.018); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.85; } }
  @keyframes eq { 0%, 100% { transform: scaleY(0.32); } 50% { transform: scaleY(1); } }
  @media (prefers-reduced-motion: reduce) {
    .enter, .fade, .float, .float-slow, .breathe, .spin, .pulse, .eq { animation: none !important; }
  }
`;

export function svgDoc({ width, height, label, body, defs = '', style = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="${escapeXml(label)}">
<defs>${defs}</defs>
<style>${BASE_CSS}${style}</style>
${body}
</svg>
`;
}

export function linearGradient(id, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1, units = 'objectBoundingBox' } = {}) {
  const list = stops
    .map(([offset, color, opacity = 1]) => `<stop offset="${offset}" stop-color="${color}"${opacity < 1 ? ` stop-opacity="${opacity}"` : ''}/>`)
    .join('');
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="${units}">${list}</linearGradient>`;
}

export function radialGradient(id, stops, { cx = 0.5, cy = 0.5, r = 0.5, units = 'objectBoundingBox' } = {}) {
  const list = stops
    .map(([offset, color, opacity = 1]) => `<stop offset="${offset}" stop-color="${color}"${opacity < 1 ? ` stop-opacity="${opacity}"` : ''}/>`)
    .join('');
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="${units}">${list}</radialGradient>`;
}

/** A soft background light, positioned in user units. */
export function glowEllipse(id, cx, cy, rx, ry, color, opacity, userSpace = false) {
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${Math.max(rx, ry)}">
  <stop stop-color="${color}" stop-opacity="${opacity}"/>
  <stop offset="0.55" stop-color="${color}" stop-opacity="${opacity * 0.38}"/>
  <stop offset="1" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`;
}

export function dotPattern(id, color, spacing = 26, radius = 1) {
  return `<pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
  <circle cx="${radius}" cy="${radius}" r="${radius}" fill="${color}"/>
</pattern>`;
}

export function sectionHeader(t, { eyebrow, title, note, x = 44, y = 40, width = 792, titleSize = 31 }) {
  return `<text x="${x}" y="${y}" class="mono" font-size="10.5" font-weight="600" letter-spacing="2.2" fill="${t.accent}">${escapeXml(eyebrow)}</text>
<text x="${x}" y="${y + 40}" class="display" font-size="${titleSize}" font-weight="700" letter-spacing="-0.6" fill="${t.text}">${escapeXml(title)}</text>
<text x="${x + width}" y="${y + 36}" text-anchor="end" font-size="12" fill="${t.textFaint}">${escapeXml(note)}</text>
<path d="M${x} ${y + 58}H${x + width}" stroke="${t.hairline}" stroke-width="1"/>`;
}

let avatarCache = null;
export function avatarDataUri() {
  if (avatarCache) return avatarCache;
  const file = path.join(ROOT, 'assets', 'images', 'avatar.jpg');
  avatarCache = `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`;
  return avatarCache;
}
