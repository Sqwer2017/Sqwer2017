#!/usr/bin/env node
/**
 * Collects the public data used by the SVG components and the live page.
 * Writes data/github.json. Safe to run with no token (60 requests/hour),
 * but a token raises the limit and unlocks the GraphQL contribution data.
 *
 *   GITHUB_TOKEN=... node scripts/fetch-github.mjs
 *   PROFILE_TOKEN=... node scripts/fetch-github.mjs   (PAT with read:user)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const PROFILE = JSON.parse(await fs.readFile(path.join(ROOT, 'profile.json'), 'utf8'));
const LOGIN = PROFILE.identity.handle;
const TOKEN = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const API = 'https://api.github.com';
const UA = 'sqwer-profile-builder';

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': UA,
  'X-GitHub-Api-Version': '2022-11-28',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
};

const log = (...a) => console.log('[data]', ...a);

async function getJSON(url, options = {}) {
  const res = await fetch(url, { headers, ...options });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function loadPrevious() {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, 'github.json'), 'utf8'));
  } catch {
    return null;
  }
}

async function fetchUser() {
  const user = await getJSON(`${API}/users/${LOGIN}`);
  return {
    login: user.login,
    name: user.name || user.login,
    followers: user.followers,
    publicRepos: user.public_repos,
    createdAt: user.created_at,
    avatarUrl: user.avatar_url
  };
}

async function fetchRepos() {
  const repos = await getJSON(`${API}/users/${LOGIN}/repos?per_page=100&sort=updated&type=owner`);
  return Array.isArray(repos) ? repos : [];
}

async function fetchLanguages(repos) {
  const candidates = repos.filter((r) => !r.fork && !r.archived && r.size > 0).slice(0, 12);
  const totals = new Map();
  for (const repo of candidates) {
    try {
      const langs = await getJSON(`${API}/repos/${LOGIN}/${repo.name}/languages`);
      for (const [name, bytes] of Object.entries(langs)) {
        totals.set(name, (totals.get(name) || 0) + bytes);
      }
    } catch (err) {
      log(`languages skipped for ${repo.name}: ${err.message}`);
    }
  }
  if (!totals.size) {
    for (const repo of repos) {
      if (!repo.fork && repo.language) totals.set(repo.language, (totals.get(repo.language) || 0) + repo.size * 1024);
    }
  }
  const all = [...totals.entries()].map(([name, bytes]) => ({ name, bytes }));
  const total = all.reduce((n, l) => n + l.bytes, 0);
  return all
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 6)
    .map((l) => ({ ...l, percent: total ? Math.round((l.bytes / total) * 1000) / 10 : 0 }));
}

function parseContributionHTML(html) {
  const cells = new Map();
  for (const match of html.matchAll(/<td([^>]*data-date="[^"]+"[^>]*)>/g)) {
    const attrs = match[1];
    const date = (attrs.match(/data-date="([^"]+)"/) || [])[1];
    const id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
    const level = Number((attrs.match(/data-level="([^"]+)"/) || [])[1] || 0);
    if (date) cells.set(id || date, { date, level, count: 0 });
  }
  for (const match of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g)) {
    const cell = cells.get(match[1]);
    if (!cell) continue;
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const count = text.match(/(\d+)\s+contribution/);
    cell.count = count ? Number(count[1]) : 0;
  }
  const byDate = new Map();
  for (const cell of cells.values()) byDate.set(cell.date, cell);
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

async function fetchContributionsFromHTML() {
  const res = await fetch(`https://github.com/users/${LOGIN}/contributions`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for contributions page`);
  const html = await res.text();
  const days = parseContributionHTML(html);
  if (days.length < 300) throw new Error(`contributions markup changed (${days.length} days found)`);
  const total = days.reduce((n, d) => n + d.count, 0);
  return { total, days, daysWithActivity: days.filter((d) => d.count > 0).length };
}

async function fetchContributionsFromGraphQL() {
  if (!TOKEN) throw new Error('no token for GraphQL');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays { date contributionCount contributionLevel }
              }
            }
          }
        }
      }`,
      variables: { login: LOGIN }
    })
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for GraphQL`);
  const payload = await res.json();
  if (payload.errors) throw new Error(payload.errors.map((e) => e.message).join('; '));
  const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error('no contribution calendar in response');
  const levelMap = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const days = calendar.weeks.flatMap((w) =>
    w.contributionDays.map((d) => ({
      date: d.date,
      count: d.contributionCount,
      level: levelMap[d.contributionLevel] ?? 0
    }))
  );
  return {
    total: calendar.totalContributions,
    days,
    daysWithActivity: days.filter((d) => d.count > 0).length
  };
}

async function fetchContributions(previous) {
  try {
    const data = await fetchContributionsFromGraphQL();
    log(`contributions via GraphQL: ${data.total}`);
    return { ...data, source: 'graphql', stale: false };
  } catch (err) {
    log(`GraphQL unavailable (${err.message}); falling back to public calendar`);
  }
  try {
    const data = await fetchContributionsFromHTML();
    log(`contributions via public calendar: ${data.total}`);
    return { ...data, source: 'calendar', stale: false };
  } catch (err) {
    log(`contributions fetch failed: ${err.message}`);
    if (previous?.contributions?.days?.length) {
      log('keeping the previous contribution snapshot');
      return { ...previous.contributions, stale: true, source: previous.contributions.source || 'cache' };
    }
    return { total: 0, days: [], daysWithActivity: 0, source: 'unavailable', stale: true };
  }
}

async function fetchProjectMeta(previous) {
  const items = [];
  for (const project of PROFILE.projects.items) {
    try {
      const repo = await getJSON(`${API}/repos/${LOGIN}/${project.id}`);
      items.push({
        id: project.id,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        description: repo.description || null,
        homepage: repo.homepage || null,
        topics: repo.topics || [],
        updatedAt: repo.pushed_at,
        language: repo.language
      });
    } catch (err) {
      log(`project ${project.id} skipped: ${err.message}`);
      const old = previous?.projects?.find((p) => p.id === project.id);
      if (old) items.push(old);
    }
  }
  return items;
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const previous = await loadPrevious();
  if (!TOKEN) log('running without a token (rate limit 60/hour)');

  const user = await fetchUser();
  const repos = await fetchRepos();
  const languages = await fetchLanguages(repos);
  const contributions = await fetchContributions(previous);
  const projects = await fetchProjectMeta(previous);

  const originals = repos.filter((r) => !r.fork);
  const data = {
    generatedAt: new Date().toISOString(),
    user,
    stats: {
      stars: originals.reduce((n, r) => n + r.stargazers_count, 0),
      repos: user.publicRepos,
      followers: user.followers,
      contributions: contributions.total
    },
    repoCounts: {
      original: originals.length,
      forks: repos.filter((r) => r.fork).length
    },
    languages,
    projects,
    contributions,
    sources: {
      api: TOKEN ? 'authenticated' : 'public',
      contributions: contributions.source
    }
  };

  await fs.writeFile(path.join(DATA_DIR, 'github.json'), JSON.stringify(data, null, 2) + '\n');
  log(`wrote data/github.json — stars ${data.stats.stars}, repos ${data.stats.repos}, followers ${data.stats.followers}, contributions ${data.stats.contributions}`);
}

main().catch(async (err) => {
  console.error('[data] failed:', err);
  const previous = await loadPrevious();
  if (previous) {
    console.error('[data] previous snapshot left untouched; the build can still run');
    process.exit(0);
  }
  process.exit(1);
});
