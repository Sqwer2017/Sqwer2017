# Setup & documentation

A config-driven GitHub profile system: a generated README, 26 custom SVG components
(dark/light), an interactive static page, and a daily data refresh.

Everything is built from one file — **`profile.json`**. No framework, no runtime
dependencies, no external fonts or scripts.

```bash
node -v            # Node 20+ (developed on Node 26)
npm run dev        # http://127.0.0.1:4173
npm run refresh    # fetch data → build generated files → validate
```

There is nothing to `npm install`. The QA screenshots in this workspace were made
with Playwright, which is intentionally **not** a project dependency.

---

## 1. What is generated

`node scripts/build.mjs` writes:

| Path | Contents |
| --- | --- |
| `README.md` | Markdown + `<picture>` blocks, social cards and project links |
| `assets/svg/*.svg` | Hero, socials, about, stack, projects, stats, activity, footer × dark/light |
| `assets/svg/social-*.svg` | Three clickable social cards × dark/light |
| `assets/svg/project-*.svg` | Two project cards × dark/light |
| `src/css/tokens.generated.css` | Palette and heatmap/language colours for the page |
| `src/js/profile-data.js` | Config + last GitHub snapshot for the page |
| `assets/icons/favicon.svg` | Monogram favicon |

Hand-authored files: `index.html`, `src/css/*.css` (except tokens), `src/js/*.js`
(except `profile-data.js`), `scripts/**`, `assets/images/**`, `assets/icons/**`,
`.github/workflows/update-profile.yml`.

Do not edit generated files by hand. Edit `profile.json` (or the source data) and
rebuild.

---

## 2. Customising the profile

### Identity and text

Edit `profile.json`:

- `identity` — name, display name, role, tagline, chips, avatar path.
- `about.cards` — five bento cards; `size` can be `wide` (one), `feature` (one)
  and `normal` (the rest).
- `stack.groups` — `main` and `tools` groups. Each item's `id` maps to a local
  icon in `assets/icons/<id>.svg`.
- `projects.items` — project name, category, honest description, tech tags, repo
  and live URLs.
- `socials` — Telegram / Steam / GitHub links.
- `footer` — closing line and note.

### Palette

`palette.dark` and `palette.light` drive the SVGs, the generated CSS tokens, the
page and the favicon. Keep body text above 4.5:1 contrast; `npm run validate`
checks the main pairs automatically.

### Order and visibility

`profile.sections.order` and `profile.sections.visible` control both the README
and the page. The page reorders its sections at runtime; the README is generated
in the configured order.

### Animations

`profile.animations` switches particles, morphing, the custom cursor, ripples,
scroll reveals, hero parallax and speed. `prefers-reduced-motion` always wins.

### Icons

Drop a monochrome 24×24 SVG into `assets/icons/` (use `currentColor`), then
reference its filename as the icon `id`. Brand icons in this repo come from
[Simple Icons](https://simpleicons.org/) (CC0); the small UI set is custom.

### Images

- `assets/images/avatar.jpg` — embedded into the hero SVGs at build time and used
  by the page. Replace it, keep the path in `identity.avatar`.
- `assets/images/background.jpg` — used by the page hero. Replace it, keep the
  path in `identity.background`.
- Source images provided for this build: the Pinterest avatar and background
  links from the brief. They are stored locally so nothing breaks if the remote
  URLs disappear. Check that you have the right to publish them.

### Sections

The page sections use fixed containers; the content inside socials, about, stack,
projects and stats is rendered from config. To add a sixth about card you also
need to adjust the bento spans; the design is tuned for five.

---

## 3. Data: what is real and what is curated

`scripts/fetch-github.mjs` writes `data/github.json` with:

- **Total stars** across the original public repositories.
- **Public repositories** and the original/fork split.
- **Followers**.
- **Contributions** for the last 12 months.
- **Top languages** by bytes across original repositories.
- **Project stars** and repository metadata.

Contributions are read from the public contributions calendar
(`github.com/users/<login>/contributions`). If a `PROFILE_TOKEN` secret is
available, the script first tries the GraphQL contribution calendar, which is more
reliable. If a fetch fails, the previous snapshot is kept — the build never invents
numbers. A stale snapshot is noted in the logs; the page shows the last update
date.

**Project descriptions are curated.** GitHub returns `null` for both project
descriptions, so the cards describe what the repositories actually contain:

- NOCTRA — built from its source tree, manifest and live shell: React 19, Vite,
  TypeScript, Tailwind, Supabase profiles, Capacitor/Android, YouTube/Audius/Telegram
  sources, listening stats.
- AniThink — built from its README and live meta description: a Shikimori-powered
  Next.js anime platform with cyberpunk themes and a Live2D companion.

Update these descriptions in `profile.json` when the projects change. The star
counts are live.

The visible numbers at the time of this build are intentionally unembellished:
**0 stars, 4 public repositories (3 original + 1 fork), 0 followers and 7
contributions**. The design is built to look intentional with sparse data.

---

## 4. Publishing to GitHub

1. Put these files in your profile repository, named exactly like your username
   (`Sqwer2017/Sqwer2017`) so GitHub treats `README.md` as your profile README.
2. Push to `main`.
3. **Enable Pages:** repository → *Settings* → *Pages* → *Build and deployment* →
   *Deploy from a branch* → `main` / `/ (root)` → *Save*. The page will live at
   `https://sqwer2017.github.io/Sqwer2017/` for a project repository.
4. If the URL is different, update `meta.siteUrl` in `profile.json` and rebuild.
   The canonical/OG tags and the README footer link use this value.
5. Open the profile: the README images use relative paths and GitHub's
   `prefers-color-scheme` switching. The page is the interactive experience.

The README live-page link is **inactive until Pages is enabled** — that is the one
link that depends on deployment rather than the repository.

### Actions

`.github/workflows/update-profile.yml` runs daily at 04:17 UTC, on manual dispatch,
and when the config/scripts/icons change. It fetches public data, rebuilds the
SVGs/README, validates, and commits the refreshed snapshot with the workflow token
(`contents: write`).

- Default `GITHUB_TOKEN` is enough for the REST API and the commit.
- Optional **`PROFILE_TOKEN`** repository secret: a classic PAT with `read:user`
  improves contribution accuracy and raises API limits. Without it, the public
  calendar is scraped.
- If `main` is protected, allow the bot to push or switch the workflow to a PR.
- The snapshot updates daily, so expect one bot commit per day. Pages redeploys
  automatically from the branch.

---

## 5. Architecture

```
profile.json                 single source of truth
README.md                    generated
index.html                   interactive page
assets/
  images/                    avatar + hero background
  icons/                     monochrome brand + UI icons
  svg/                       generated dark/light components
data/github.json             generated public snapshot
scripts/
  fetch-github.mjs           API + contributions calendar → data
  build.mjs                  config + data → SVGs, README, CSS, JS
  validate.mjs               offline quality gate (--links for URLs)
  serve.mjs                  zero-dependency preview server
  lib/                       SVG primitives + section renderers
src/css/                     tokens, base, components, animations, responsive
src/js/                      orchestration + cursor, particles, morphing,
                             interactions, github rendering
.github/workflows/           daily refresh
```

### How the effects are split

- **README SVG:** no JavaScript. Motion is CSS keyframes / gradients inside the
  SVG, with a `prefers-reduced-motion` block. The avatar is embedded as a data URI
  because an SVG loaded via `<img>` cannot load external images.
- **Interactive page:** Canvas particles + a second canvas of morphing organic
  shapes inside the hero, a custom two-part cursor, click ripples, scroll reveals,
  hero parallax, light/dark toggle, live counters and GitHub data rendering.
- **Charts:** the contribution heatmap is 365 CSS grid cells with native tooltips;
  the monthly rhythm chart is 13 bars. Languages use a stacked bar with a legend.

### Performance notes

- No external network requests at runtime except `data/github.json` (local).
- One 50 KB background, one 79 KB avatar (also embedded in the two hero SVGs).
- Canvas work is low-resolution and paused when hidden/offscreen; the morph canvas
  is intentionally blurred.
- All CSS/JS is loaded locally; fonts are the system UI stack.

---

## 6. Testing

```bash
npm run validate               # config, assets, SVG, README, HTML, contrast
node scripts/validate.mjs --links   # also checks external URLs (network)
npm run dev                    # manual desktop/mobile + theme pass
```

The visual QA pass for this build covered 1440×1000 and 390×844, dark and light,
no console errors, no horizontal overflow, reduced motion, keyboard focus and the
theme toggle. Known limitation: a README image cannot have different layouts per
device; at 880 px it scales down on phones. The interactive page is the
mobile-first experience.

Browser support: current Chrome, Edge, Firefox and Safari. `color-mix()`,
`backdrop-filter`, CSS `scale` and `mask-image` are used with graceful fallbacks.

---

## 7. Troubleshooting

- **Modules do not load from `file://`** — use `npm run dev` or Pages; ES modules
  and `fetch` need HTTP(S).
- **Icons are blank** — run `npm run build`; icons are resolved against the page
  URL so sub-path Pages deployments work.
- **Data did not refresh** — inspect the Action logs; API limits and the public
  calendar markup are the usual suspects. Add `PROFILE_TOKEN` and rerun.
- **Contribution numbers look old** — the last good snapshot is preserved on
  purpose; check the `updated` date on the page.
- **The README animated letters are missing in a screenshot tool** — the SVGs use
  entrance animations; wait for them, or capture with reduced motion. In normal
  browsers and on GitHub they run.
- **Pages 404s** — check branch/root settings, `.nojekyll`, and `meta.siteUrl`.
- **Theme looks stuck** — the page remembers the toggle in
  `localStorage['sqwer-theme']`; clear it to return to the default dark theme.

---

## 8. Notes & credits

- Architecture inspiration: the idea of config-driven, componentised profile SVGs
  from `rootscripts/rootscripts`; the layout, palette, components and code here are
  custom.
- Brand icons: Simple Icons (CC0). UI icons and all SVG composition: original.
- Avatar and background: supplied by the profile owner.
- No tracking, no cookies, no external CDNs.
