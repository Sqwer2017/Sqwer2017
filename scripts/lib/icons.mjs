import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ICONS_DIR = path.join(ROOT, 'assets', 'icons');
const cache = new Map();
const PRESENTATION = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];

function load(id) {
  if (cache.has(id)) return cache.get(id);
  const file = path.join(ICONS_DIR, `${id}.svg`);
  const source = fs.readFileSync(file, 'utf8');
  const root = source.match(/<svg([^>]*)>/)?.[1] || '';
  const viewBox = root.match(/viewBox="([^"]+)"/)?.[1] || '0 0 24 24';
  const attrs = PRESENTATION.map((name) => {
    const value = root.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
    return value ? `${name}="${value}"` : '';
  })
    .filter(Boolean)
    .join(' ');
  const inner = source
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .trim();
  const icon = { viewBox, attrs, inner };
  cache.set(id, icon);
  return icon;
}

/**
 * Embeds an icon as a nested SVG. All icons use currentColor so a single
 * `color` attribute is enough to tint filled and stroked icons alike.
 */
export function icon(id, { x = 0, y = 0, size = 18, color = '#ffffff', opacity = 1 } = {}) {
  const data = load(id);
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${data.viewBox}" color="${color}"${data.attrs ? ` ${data.attrs}` : ''}${opacity < 1 ? ` opacity="${opacity}"` : ''}>${data.inner}</svg>`;
}

export function listIconIds() {
  return fs
    .readdirSync(ICONS_DIR)
    .filter((file) => file.endsWith('.svg'))
    .map((file) => file.replace(/\.svg$/, ''))
    .sort();
}
