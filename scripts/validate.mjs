#!/usr/bin/env node
/**
 * Offline quality gate: config, assets, generated SVGs, README, page refs,
 * palette contrast and data consistency. No network access.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const ok = [];

const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const pass = (message) => ok.push(message);
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');

function loadJson(relPath) {
  try {
    return JSON.parse(read(relPath));
  } catch (error) {
    fail(`${relPath}: invalid JSON (${error.message})`);
    return null;
  }
}

const profile = loadJson('profile.json');
const data = loadJson('data/github.json');
const readme = exists('README.md') ? read('README.md') : '';
const html = exists('index.html') ? read('index.html') : '';
const icons = exists('assets/icons')
  ? fs.readdirSync(path.join(ROOT, 'assets/icons')).filter((file) => file.endsWith('.svg')).map((file) => file.slice(0, -4))
  : [];

if (!profile || !data) {
  finish();
}

/* ---------- config ---------- */
const requiredIdentity = ['name', 'displayName', 'handle', 'role', 'description', 'avatar', 'avatarAlt'];
for (const key of requiredIdentity) {
  if (!profile.identity?.[key]) fail(`profile.identity.${key} is required`);
}
for (const mode of ['dark', 'light']) {
  for (const key of ['background', 'backgroundAlt', 'surface', 'surfaceAlt', 'accent', 'accentBright', 'accentDeep', 'text', 'textMuted', 'textFaint']) {
    if (!/^#[0-9a-f]{6}$/i.test(String(profile.palette?.[mode]?.[key] || ''))) {
      fail(`profile.palette.${mode}.${key} must be a 6-digit hex colour`);
    }
  }
}
const sectionIds = ['hero', 'socials', 'about', 'stack', 'projects', 'stats', 'activity', 'footer'];
if (!Array.isArray(profile.sections?.order) || profile.sections.order.length !== sectionIds.length) {
  fail('profile.sections.order must list all eight sections');
} else {
  for (const id of sectionIds) if (!profile.sections.order.includes(id)) fail(`profile.sections.order is missing "${id}"`);
}
if (profile.sections?.order?.length === new Set(profile.sections.order).size) pass('section order is complete and unique');

if (!Array.isArray(profile.socials) || profile.socials.length < 1) fail('at least one social link is required');
for (const social of profile.socials || []) {
  if (!social.id || !social.label || !social.url || !social.icon) fail(`social "${social.id || '?'}" is incomplete`);
  if (!/^https:\/\//.test(social.url || '')) fail(`social "${social.id}" URL must use https`);
  if (!icons.includes(social.icon)) fail(`social icon assets/icons/${social.icon}.svg is missing`);
}
for (const card of profile.about?.cards || []) {
  if (!icons.includes(card.icon)) fail(`about icon assets/icons/${card.icon}.svg is missing`);
}
for (const group of profile.stack?.groups || []) {
  for (const item of group.items || []) {
    if (!icons.includes(item.id)) fail(`tech icon assets/icons/${item.id}.svg is missing`);
  }
}
if ((profile.about?.cards || []).length !== 5) warn('about is designed for five cards; a different count may break the bento composition');
for (const project of profile.projects?.items || []) {
  if (!/^https:\/\/github\.com\//.test(project.repo || '')) fail(`project "${project.id}" repo must be a github.com URL`);
  if (!project.description || !project.tech?.length) fail(`project "${project.id}" needs a description and tech list`);
}
pass('configuration contract checked');

/* ---------- data ---------- */
const numeric = ['stars', 'repos', 'followers', 'contributions'];
for (const key of numeric) {
  if (!Number.isFinite(Number(data.stats?.[key]))) fail(`data.stats.${key} must be numeric`);
}
if (Number(data.stats?.repos) !== Number(data.user?.publicRepos)) {
  warn(`data.stats.repos (${data.stats?.repos}) differs from user.publicRepos (${data.user?.publicRepos})`);
}
if (Array.isArray(data.contributions?.days) && data.contributions.days.length) {
  const sum = data.contributions.days.reduce((n, day) => n + (Number(day.count) || 0), 0);
  if (sum !== Number(data.contributions.total)) {
    warn(`contribution total ${data.contributions.total} does not equal the sum of days (${sum})`);
  }
  const invalid = data.contributions.days.filter((day) => !/^\d{4}-\d{2}-\d{2}$/.test(day.date));
  if (invalid.length) fail(`data.contributions has ${invalid.length} invalid dates`);
}
for (const project of profile.projects?.items || []) {
  if (!data.projects?.some((entry) => entry.id === project.id)) fail(`live data for project "${project.id}" is missing`);
}
pass('data snapshot checked');

/* ---------- generated SVGs ---------- */
const expected = [];
for (const mode of ['dark', 'light']) {
  for (const name of ['hero', 'socials', 'about', 'stack', 'projects', 'stats', 'activity', 'footer']) {
    expected.push(`assets/svg/${name}-${mode}.svg`);
  }
  for (const social of profile.socials || []) expected.push(`assets/svg/social-${social.id}-${mode}.svg`);
  for (const project of profile.projects?.items || []) expected.push(`assets/svg/project-${project.id}-${mode}.svg`);
}

for (const file of expected) {
  if (!exists(file)) {
    fail(`${file} is missing`);
    continue;
  }
  const content = read(file);
  const size = Buffer.byteLength(content);
  if (!content.startsWith('<svg ')) fail(`${file} is not an SVG document`);
  if (!content.trimEnd().endsWith('</svg>')) fail(`${file} is truncated`);
  if (!/role="img"/.test(content) || !/aria-label="[^"]+"/.test(content)) fail(`${file} lacks an accessible role/label`);
  if (/<script|onload=|onclick=|foreignObject|javascript:/i.test(content)) fail(`${file} contains disallowed active content`);
  if (/<image[^>]+href="http/i.test(content) || /<use[^>]+href="http/i.test(content)) fail(`${file} loads a remote resource`);
  const inspect = content.replace(/data:[^"']+/g, 'data:...');
  if (/\$\{|undefined|NaN/.test(inspect)) fail(`${file} contains an unresolved placeholder`);
  if (!/prefers-reduced-motion/.test(content)) fail(`${file} does not respect reduced motion`);
  if (size > 260 * 1024) fail(`${file} is ${(size / 1024).toFixed(0)} KB (limit 260 KB)`);
  const vb = content.match(/viewBox="0 0 (\d+) (\d+)"/);
  const wh = content.match(/width="(\d+)" height="(\d+)"/);
  if (!vb || !wh) fail(`${file} lacks width/height or viewBox`);
  else if (vb[1] !== wh[1] || vb[2] !== wh[2]) fail(`${file} viewBox does not match its canvas`);
  const ids = [...content.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) fail(`${file} has duplicate ids: ${[...new Set(duplicates)].join(', ')}`);
}
if (expected.every(exists)) pass(`${expected.length} SVG components checked`);

/* ---------- README ---------- */
if (!readme) fail('README.md is missing');
if (!/Generated by scripts\/build\.mjs/.test(readme)) fail('README.md lacks the generated marker');
const localRefs = [...readme.matchAll(/(?:src|srcset|href)="((?:assets\/|SETUP\.md)[^"]+)"/g)].map((m) => m[1]);
for (const ref of new Set(localRefs)) {
  if (!exists(ref)) fail(`README references missing file ${ref}`);
}
const imgTags = [...readme.matchAll(/<img\s[^>]*>/g)].map((m) => m[0]);
for (const tag of imgTags) {
  if (!/alt="[^"]+"/.test(tag)) fail(`README image without alt text: ${tag.slice(0, 70)}…`);
}
const pictureCount = (readme.match(/<picture>/g) || []).length;
if (pictureCount < 12) warn(`README has only ${pictureCount} picture blocks`);
if (!readme.includes('prefers-color-scheme: dark') || !readme.includes('prefers-color-scheme: light')) {
  fail('README does not offer both colour schemes');
}
if (!readme.includes('Open the interactive profile') || !readme.includes('SETUP.md')) fail('README footer links are incomplete');
if (/\$\{|undefined|NaN/.test(readme)) fail('README contains an unresolved placeholder');
for (const social of profile.socials || []) {
  if (!readme.includes(social.url)) fail(`README is missing the ${social.label} link`);
}
for (const project of profile.projects?.items || []) {
  if (!readme.includes(project.repo)) fail(`README is missing the ${project.name} repository link`);
}
pass('README links, alt text and theme sources checked');

/* ---------- index.html ---------- */
if (!html) fail('index.html is missing');
const requiredIds = ['hero-name', 'sections', 'connect', 'about', 'stack', 'work', 'signals', 'activity', 'page-footer', 'stat-grid', 'heatmap', 'language-bar', 'language-legend', 'rhythm-chart', 'theme-toggle'];
for (const id of requiredIds) if (!html.includes(`id="${id}"`)) fail(`index.html is missing #${id}`);
const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const duplicateHtmlIds = htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index);
if (duplicateHtmlIds.length) fail(`index.html has duplicate ids: ${[...new Set(duplicateHtmlIds)].join(', ')}`);
const htmlRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((ref) => ref && !ref.startsWith('#') && !/^(https?:|mailto:|data:)/.test(ref));
for (const ref of new Set(htmlRefs)) {
  if (!exists(ref)) fail(`index.html references missing file ${ref}`);
}
for (const match of html.matchAll(/data-icon="([^"]+)"/g)) {
  if (!icons.includes(match[1])) fail(`index.html references missing icon ${match[1]}`);
}
if (/<script[^>]+src="https?:/.test(html)) fail('index.html loads a remote script');
const remoteStyles = [...html.matchAll(/<link[^>]*>/g)].map((m) => m[0]).filter((tag) => /rel="stylesheet"/.test(tag) && /href="https?:/.test(tag));
if (remoteStyles.length) fail('index.html loads a remote stylesheet');
if (!/reveal-ready|data-reveal/.test(html)) fail('index.html has no progressive reveal hooks');
pass('page references and structure checked');

/* ---------- stylesheet URLs + tokens ---------- */
const cssDir = path.join(ROOT, 'src/css');
for (const file of fs.readdirSync(cssDir).filter((name) => name.endsWith('.css'))) {
  const full = path.join(cssDir, file);
  const content = fs.readFileSync(full, 'utf8');
  for (const match of content.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
    const ref = match[2];
    if (/^(data:|https?:|#|%)/.test(ref)) continue;
    const target = path.resolve(path.dirname(full), ref);
    if (!fs.existsSync(target)) fail(`${rel(full)} references missing ${ref}`);
  }
}
const tokens = exists('src/css/tokens.generated.css') ? read('src/css/tokens.generated.css') : '';
if (!tokens.includes('[data-theme="light"]')) fail('generated light theme tokens are missing');
for (const varName of ['--bg', '--text', '--accent', '--heat-0', '--lang-0']) {
  if (!tokens.includes(`${varName}:`)) fail(`generated tokens are missing ${varName}`);
}
if (!read('src/css/base.css').includes('prefers-reduced-motion')) fail('base.css does not handle reduced motion');
pass('stylesheet references and tokens checked');

/* ---------- contrast ---------- */
function luminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
const surfaces = { dark: { bg: '#0D0A13', card1: '#1B1527', card2: '#120D1B' }, light: { bg: '#F7F4FC', card1: '#FFFFFF', card2: '#EFE6FA' } };
for (const mode of ['dark', 'light']) {
  const p = profile.palette[mode];
  const s = surfaces[mode];
  const pairs = [
    ['text', p.text, s.bg, 7],
    ['text on card', p.text, s.card1, 7],
    ['muted', p.textMuted, s.bg, 4.5],
    ['muted on card', p.textMuted, s.card2, 4.5],
    ['faint', p.textFaint, s.bg, 4.5],
    ['faint on card', p.textFaint, s.card2, 4.5],
    ['accent', p.accent, s.bg, 4.5],
    ['accent on card', p.accent, s.card2, 4.5]
  ];
  for (const [name, fg, bg, min] of pairs) {
    const ratio = contrast(fg, bg);
    if (ratio < min) fail(`${mode} contrast ${name}: ${ratio.toFixed(2)}:1 < ${min}:1`);
  }
}
pass('palette contrast checked (WCAG AA/AAA for body text)');

/* ---------- implementation surface ---------- */
for (const file of ['src/js/main.js', 'src/js/cursor.js', 'src/js/particles.js', 'src/js/morphing.js', 'src/js/interactions.js', 'src/js/github-api.js', 'src/js/profile-data.js', 'scripts/serve.mjs']) {
  if (!exists(file)) fail(`${file} is missing`);
}
if (!exists('src/js/profile-data.js')) fail('runtime profile data is missing');
const runtime = exists('src/js/profile-data.js') ? read('src/js/profile-data.js') : '';
if (!runtime.includes('export const PROFILE') || !runtime.includes('export const GITHUB')) fail('profile-data.js is incomplete');
if (!exists('.nojekyll')) warn('.nojekyll is missing (GitHub Pages best practice)');
if (!exists('.github/workflows/update-profile.yml')) warn('refresh workflow is missing');

/* ---------- external links (optional) ---------- */
if (process.argv.includes('--links')) {
  const urls = [
    ...(profile.socials || []).map((s) => s.url),
    ...(profile.projects?.items || []).flatMap((p) => [p.repo, p.live].filter(Boolean))
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'sqwer-profile-validator' } });
      if (response.status >= 400) warn(`link ${url} responded ${response.status}`);
      else pass(`link ok (${response.status}) ${url}`);
    } catch (error) {
      warn(`link ${url} could not be checked: ${error.message}`);
    }
  }
}

function finish() {
  for (const line of ok) console.log(`  ✓ ${line}`);
  for (const line of warnings) console.log(`  ! ${line}`);
  for (const line of errors) console.log(`  ✗ ${line}`);
  console.log(`\n[validate] ${ok.length} passed, ${warnings.length} warnings, ${errors.length} errors`);
  process.exit(errors.length ? 1 : 0);
}

finish();
