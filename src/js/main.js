import { PROFILE, GITHUB } from './profile-data.js';
import { initCursor } from './cursor.js';
import { initParticles } from './particles.js';
import { initMorphing } from './morphing.js';
import { initInteractions, refreshReveals } from './interactions.js';
import { renderStats, renderActivity, updateProjectStars, loadGithubData } from './github-api.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarseQuery = window.matchMedia('(pointer: coarse)');

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const assetUrl = (pathname) => new URL(pathname, document.baseURI).href;
const icon = (id, className = '') =>
  `<span class="icon ${className}" aria-hidden="true" style="--icon:url('${assetUrl(`assets/icons/${id}.svg`)}')"></span>`;

const config = PROFILE;
const animations = config.animations || {};

function hydrateStaticIcons() {
  $$('[data-icon]').forEach((node) => {
    node.style.setProperty('--icon', `url('${assetUrl(`assets/icons/${node.dataset.icon}.svg`)}')`);
  });
}

function renderHero() {
  const { identity, links } = config;
  const name = $('#hero-name');
  if (name) {
    name.setAttribute('aria-label', identity.name);
    name.innerHTML = [...identity.displayName]
      .map((char, index) => `<span class="letter" style="--i:${index}" aria-hidden="true">${char === ' ' ? '&nbsp;' : escapeHtml(char)}</span>`)
      .join('');
  }
  const greeting = $('#hero-greeting');
  if (greeting) greeting.textContent = identity.greeting;
  const role = $('#hero-role');
  if (role) role.textContent = identity.role;
  const subrole = $('#hero-subrole');
  if (subrole) subrole.textContent = identity.subrole;
  const lede = $('#hero-lede');
  if (lede) lede.textContent = identity.description;
  const chips = $('#hero-chips');
  if (chips) {
    chips.innerHTML = identity.chips.map((label) => `<li class="chip"><i aria-hidden="true"></i>${escapeHtml(label)}</li>`).join('');
  }
  const avatar = $('#hero-avatar');
  if (avatar) {
    avatar.src = identity.avatar;
    avatar.alt = identity.avatarAlt;
  }
  const handle = $('#hero-handle');
  if (handle) {
    handle.href = links.github;
    const label = handle.querySelector('span:last-child');
    if (label) label.textContent = `github.com/${identity.handle}`;
  }
}

function applySections() {
  const host = $('#sections');
  if (!host) return;
  const order = config.sections?.order || [];
  const visible = config.sections?.visible || {};
  const sections = new Map($$('[data-section]', host).map((node) => [node.dataset.section, node]));
  for (const id of order) {
    const node = sections.get(id);
    if (!node) continue;
    node.hidden = visible[id] === false;
    host.append(node);
  }
  const footer = $('.footer');
  if (footer) footer.hidden = visible.footer === false;
  $$('.nav__links a').forEach((link) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target && target.hidden) link.hidden = true;
  });
}

function renderSectionHeads() {
  const specs = [
    ['connect', config.socialsSection],
    ['about', config.about],
    ['stack', config.stack],
    ['work', config.projects],
    ['signals', config.stats],
    ['activity', config.activity]
  ];
  for (const [id, data] of specs) {
    if (!data) continue;
    const set = (suffix, value) => {
      const node = $(`#${id}-${suffix}`);
      if (node && value) node.textContent = value;
    };
    set('eyebrow', data.eyebrow);
    set('title', data.title);
    set('note', data.note);
  }
}

function renderSocials() {
  const grid = $('#socials-grid');
  if (grid) {
    grid.innerHTML = config.socials
      .map(
        (social) => `<a class="social-card" href="${escapeHtml(social.url)}" target="_blank" rel="noopener noreferrer" data-ripple>
  <span class="social-card__icon">${icon(social.icon)}</span>
  <span class="social-card__body"><strong>${escapeHtml(social.label)}</strong><small>${escapeHtml(social.handle)}</small></span>
  <span class="social-card__arrow">${icon('ui-arrow')}</span>
</a>`
      )
      .join('');
  }

  const footer = $('#footer-socials');
  if (footer) {
    footer.innerHTML = config.socials
      .map(
        (social) => `<a href="${escapeHtml(social.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(social.label)} — ${escapeHtml(social.handle)}" data-ripple>${icon(social.icon)}</a>`
      )
      .join('');
  }
}

function renderAbout() {
  const grid = $('#about-grid');
  if (!grid) return;
  grid.innerHTML = config.about.cards
    .map((card, index) => {
      const indexLabel = String(index + 1).padStart(2, '0');
      const top = `<div class="bento__top"><span class="bento__icon">${icon(card.icon)}</span><span class="bento__index">${indexLabel}</span></div>`;
      if (card.size === 'wide') {
        return `<article class="bento__card bento__card--wide" data-spotlight>
  <div class="bento__content">
    ${top}
    <h3 class="bento__title">${escapeHtml(card.title)}</h3>
    <p class="bento__text">${escapeHtml(card.text)}</p>
  </div>
  <div class="mini-window" aria-hidden="true">
    <div class="mini-window__bar"><i></i><i></i><i></i></div>
    <div class="mini-window__lines"><i></i><i></i><i></i><span class="mini-window__pill"></span></div>
  </div>
</article>`;
      }
      if (card.size === 'feature') {
        const bars = [32, 52, 72, 42, 86, 58, 36]
          .map((height, i) => `<i style="--h:${height}%;--delay:${(-0.22 * i).toFixed(2)}s"></i>`)
          .join('');
        return `<article class="bento__card bento__card--feature" data-spotlight>
  ${top}
  <h3 class="bento__title">${escapeHtml(card.title)}</h3>
  <p class="bento__accent">${escapeHtml(card.text)}</p>
  <div class="equalizer" aria-hidden="true">${bars}</div>
</article>`;
      }
      return `<article class="bento__card bento__card--normal" data-spotlight>
  ${top}
  <h3 class="bento__title">${escapeHtml(card.title)}</h3>
  <p class="bento__text">${escapeHtml(card.text)}</p>
</article>`;
    })
    .join('');
}

function renderStack() {
  const host = $('#stack-grid');
  if (!host) return;
  host.innerHTML = config.stack.groups
    .map((group) => {
      const chips = group.items
        .map(
          (item) => `<li class="tech">${icon(item.id)}<span>${escapeHtml(item.label)}</span></li>`
        )
        .join('');
      const isTools = group.id === 'tools';
      return `<section class="stack__panel" data-spotlight aria-labelledby="stack-${group.id}-label">
  <div class="stack__head">
    <p class="micro-label" id="stack-${group.id}-label">${escapeHtml(group.label)}</p>
    <span class="stack__count">${String(group.items.length).padStart(2, '0')}</span>
  </div>
  <ul class="stack__chips${isTools ? ' stack__chips--tools' : ''}">${chips}</ul>
</section>`;
    })
    .join('');
}

function renderProjects() {
  const host = $('#projects-list');
  if (!host) return;
  const metaList = GITHUB.projects || [];
  host.innerHTML = config.projects.items
    .map((project, index) => {
      const meta = metaList.find((item) => item.id === project.id);
      const stars = meta && Number.isFinite(meta.stars) ? meta.stars : null;
      const tags = project.tech.map((tag) => `<li class="tag">${escapeHtml(tag)}</li>`).join('');
      const starChip =
        stars === null
          ? ''
          : `<span class="project__stars">${icon('ui-star')}<strong data-project-stars="${escapeHtml(project.id)}">${stars}</strong> stars</span>`;
      return `<article class="project" data-tilt data-project="${escapeHtml(project.id)}">
  <div class="project__art">
    ${projectArt(project)}
    <span class="art-label">${String(index + 1).padStart(2, '0')} / FEATURED</span>
    <span class="art-footer">SQWER / 2026</span>
  </div>
  <div class="project__body">
    <div class="project__top">
      <span class="project__category"><i aria-hidden="true"></i>${escapeHtml(project.category)}</span>
      <span class="project__index">${String(index + 1).padStart(2, '0')} / ${String(config.projects.items.length).padStart(2, '0')}</span>
    </div>
    <h3 class="project__title">${escapeHtml(project.name)}</h3>
    <p class="project__desc">${escapeHtml(project.description)}</p>
    <ul class="project__tags">${tags}</ul>
    <div class="project__actions">
      ${starChip}
      <div class="project__links">
        <a class="btn btn--primary" href="${escapeHtml(project.repo)}" target="_blank" rel="noopener noreferrer" data-ripple>Repository ${icon('ui-arrow')}</a>
        ${project.live ? `<a class="btn" href="${escapeHtml(project.live)}" target="_blank" rel="noopener noreferrer" data-ripple>Live ${icon('ui-link')}</a>` : ''}
      </div>
    </div>
  </div>
</article>`;
    })
    .join('');
}

function projectArt(project) {
  const gradientId = `grad-${project.id}`;
  const maskId = `mask-${project.id}`;
  const gradient = `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--accent-bright)"/><stop offset="1" stop-color="var(--accent-deep)"/></linearGradient></defs>`;

  if (project.glyph === 'orb') {
    return `<svg class="project__svg" viewBox="0 0 300 300" aria-hidden="true" focusable="false">
  ${gradient}
  <circle class="art-ring" cx="150" cy="150" r="112"/>
  <circle class="art-ring art-ring--dash" cx="150" cy="150" r="88"/>
  <circle class="art-spark" cx="238" cy="150" r="2.2"/>
  <path class="art-bubble" d="M122 104H178A26 26 0 0 1 204 130V170A26 26 0 0 1 178 196H140L110 218L118 196H122A26 26 0 0 1 96 170V130A26 26 0 0 1 122 104Z"/>
  <text class="art-letter" x="150" y="174" font-size="62" text-anchor="middle" fill="url(#${gradientId})">A</text>
  <circle class="art-spark" cx="206" cy="92" r="3"/>
  <circle class="art-spark" cx="220" cy="80" r="2.2" opacity="0.55"/>
  <circle class="art-spark" cx="231" cy="70" r="1.5" opacity="0.35"/>
  <path class="art-spark" d="M96 240l2 5.6 5.6 2-5.6 2-2 5.6-2-5.6-5.6-2 5.6-2z" opacity="0.7"/>
  <path class="art-spark" d="M210 228l1.5 4.2 4.2 1.5-4.2 1.5-1.5 4.2-1.5-4.2-4.2-1.5 4.2-1.5z" opacity="0.45"/>
</svg>`;
  }

  const bars = [12, 24, 40, 28, 52, 34, 20, 14]
    .map((height, index) => {
      const x = 104 + index * 12;
      return `<rect class="art-wave-bar" x="${x}" y="${246 - height}" width="4" height="${height}" rx="2" fill="var(--accent)" opacity="${0.5 + (index % 3) * 0.16}" style="animation-delay:${(-0.18 * index).toFixed(2)}s"/>`;
    })
    .join('');
  return `<svg class="project__svg" viewBox="0 0 300 300" aria-hidden="true" focusable="false">
  ${gradient}
  <defs><mask id="${maskId}"><circle cx="150" cy="150" r="46" fill="#fff"/><circle cx="169" cy="135" r="43" fill="#000"/></mask></defs>
  <circle class="art-ring" cx="150" cy="150" r="112"/>
  <circle class="art-ring art-ring--dash" cx="150" cy="150" r="86"/>
  <circle class="art-spark" cx="150" cy="38" r="2.4"/>
  <circle cx="150" cy="150" r="46" fill="url(#${gradientId})" mask="url(#${maskId})"/>
  <circle cx="150" cy="150" r="64" fill="none" stroke="var(--accent)" stroke-opacity="0.12"/>
  <path class="art-spark" d="M198 104l1.7 4.7 4.7 1.7-4.7 1.7-1.7 4.7-1.7-4.7-4.7-1.7 4.7-1.7z" opacity="0.8"/>
  <circle class="art-dot" cx="104" cy="188" r="2"/>
  <g>${bars}</g>
</svg>`;
}

function setupTheme() {
  const button = $('#theme-toggle');
  const meta = $('meta[name="theme-color"]');
  if (!config.theme?.allowToggle && button) button.hidden = true;

  const sync = () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    if (button) {
      button.setAttribute('aria-pressed', String(theme === 'light'));
      button.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    }
    if (meta) meta.setAttribute('content', theme === 'light' ? config.palette.light.background : config.palette.dark.background);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  };

  button?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    if (config.theme?.rememberChoice !== false) {
      try {
        localStorage.setItem('sqwer-theme', next);
      } catch (error) {
        /* storage can be unavailable in private mode */
      }
    }
    sync();
  });

  sync();
}

function setupNav() {
  const nav = $('#nav');
  const bar = $('#scroll-progress-bar');
  const links = $$('.nav__links a');
  const targets = links
    .map((link) => ({ link, node: document.querySelector(link.getAttribute('href')) }))
    .filter((item) => item.node);
  let lastY = -1;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    if (y !== lastY) {
      lastY = y;
      nav?.classList.toggle('is-scrolled', y > 10);
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
      const marker = y + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 78) + 140;
      let current = null;
      for (const item of targets) {
        if (item.node.offsetTop <= marker) current = item;
      }
      links.forEach((link) => link.removeAttribute('aria-current'));
      if (current && y > 40) current.link.setAttribute('aria-current', 'true');
    }
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

function setupSpotlight() {
  const nodes = $$('[data-spotlight]');
  for (const node of nodes) {
    node.addEventListener(
      'pointermove',
      (event) => {
        const rect = node.getBoundingClientRect();
        node.style.setProperty('--px', `${((event.clientX - rect.left) / rect.width) * 100}%`);
        node.style.setProperty('--py', `${((event.clientY - rect.top) / rect.height) * 100}%`);
      },
      { passive: true }
    );
  }
}

function setupHeroParallax() {
  const scene = $('#hero-card');
  if (!scene || coarseQuery.matches || motionQuery.matches || animations.heroParallax === false) return;
  let raf = 0;
  let targetX = 0;
  let targetY = 0;
  const apply = () => {
    scene.style.setProperty('--px', targetX.toFixed(3));
    scene.style.setProperty('--py', targetY.toFixed(3));
    raf = 0;
  };
  scene.addEventListener(
    'pointermove',
    (event) => {
      const rect = scene.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      scene.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      scene.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
      if (!raf) raf = requestAnimationFrame(apply);
    },
    { passive: true }
  );
  scene.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
    if (!raf) raf = requestAnimationFrame(apply);
  });
}

function initBackgroundLayers() {
  const allowed = motionQuery.matches === false && animations.enabled !== false;
  if (allowed && animations.particles?.enabled !== false) {
    initParticles($('#atmosphere'), { density: animations.particles?.density ?? 0.65, speed: animations.speed ?? 1 });
  }
  if (allowed && animations.morphing?.enabled !== false) {
    initMorphing($('#morph-field'), { intensity: animations.morphing?.intensity ?? 0.7, speed: animations.speed ?? 1 });
  }
}

function boot() {
  hydrateStaticIcons();
  renderHero();
  applySections();
  renderSectionHeads();
  renderSocials();
  renderAbout();
  renderStack();
  renderProjects();
  setupTheme();
  setupNav();
  setupSpotlight();
  setupHeroParallax();
  initBackgroundLayers();
  initCursor({ enabled: animations.customCursor !== false, coarse: coarseQuery.matches, reduced: motionQuery.matches });
  initInteractions({ ripples: animations.ripples !== false, tilt: animations.enabled !== false, reduced: motionQuery.matches, coarse: coarseQuery.matches });
  document.documentElement.classList.add('reveal-ready');

  renderStats(GITHUB);
  renderActivity(GITHUB);
  updateProjectStars(GITHUB);

  // Mark grids for a subtle stagger after content exists.
  for (const grid of $$('.socials-grid, .bento, .stack, .projects, .stat-grid')) {
    grid.setAttribute('data-stagger', '');
    if (!grid.hasAttribute('data-reveal')) grid.setAttribute('data-reveal', '');
    [...grid.children].forEach((child, index) => {
      child.setAttribute('data-stagger-child', '');
      child.style.setProperty('--i', String(index));
    });
  }

  refreshReveals();

  loadGithubData()
    .then((data) => {
      if (!data) return;
      renderStats(data);
      renderActivity(data);
      updateProjectStars(data);
      refreshReveals();
    })
    .catch(() => {
      /* The snapshot rendered above is the fallback. */
    });

  const footerCopy = $('#footer-copy');
  if (footerCopy) footerCopy.textContent = String(config.footer.copyright || '© {year} Sqwer').replace('{year}', String(new Date().getFullYear()));

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
