/**
 * Scroll reveals, soft click ripples and a restrained card tilt.
 * Everything degrades to plain content when motion is reduced.
 */

let revealObserver = null;
let revealSetup = false;

export function initInteractions({ ripples = true, tilt = true, reduced = false, coarse = false } = {}) {
  setupReveals(reduced);

  if (ripples && !reduced) setupRipples();
  if (tilt && !coarse && !reduced) setupTilt();
}

export function refreshReveals() {
  if (!revealSetup) {
    setupReveals(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    return;
  }
  const nodes = [...document.querySelectorAll('[data-reveal]:not([data-reveal-seen])')];
  if (!revealObserver) {
    nodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }
  nodes.forEach((node) => revealObserver.observe(node));
}

function setupReveals(reduced) {
  if (revealSetup) return;
  revealSetup = true;
  const nodes = [...document.querySelectorAll('[data-reveal]')];
  const supported = 'IntersectionObserver' in window;

  if (reduced || !supported) {
    nodes.forEach((node) => {
      node.dataset.revealSeen = 'true';
      node.classList.add('is-visible');
    });
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const node = entry.target;
        node.classList.add('is-visible');
        node.dataset.revealSeen = 'true';
        revealObserver.unobserve(node);
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -7% 0px' }
  );

  nodes.forEach((node) => revealObserver.observe(node));
}

function setupRipples() {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    const host = event.target.closest('[data-ripple], .social-card, .btn, .theme-toggle, .footer__socials a');
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    host.append(ripple);
    window.setTimeout(() => ripple.remove(), 700);
  });
}

function setupTilt() {
  const cards = [...document.querySelectorAll('[data-tilt]')];
  for (const card of cards) {
    let frame = 0;
    let rx = 0;
    let ry = 0;
    const apply = () => {
      card.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
      frame = 0;
    };
    card.addEventListener(
      'pointermove',
      (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        ry = x * 2.4;
        rx = -y * 2.0;
        card.style.willChange = 'transform';
        if (!frame) frame = requestAnimationFrame(apply);
      },
      { passive: true }
    );
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
      card.style.willChange = '';
    });
  }
}
