/**
 * A soft two-part cursor: the dot tracks the pointer, the ring follows with a
 * little weight. Pointer-only; skipped on touch and reduced-motion setups.
 */
export function initCursor({ enabled = true, coarse = false, reduced = false } = {}) {
  if (!enabled || coarse || reduced) return;
  const root = document.getElementById('cursor');
  if (!root) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let ringX = x;
  let ringY = y;
  let active = false;
  let frame = 0;
  let last = 0;

  const paint = () => {
    root.style.setProperty('--cx', `${x.toFixed(1)}px`);
    root.style.setProperty('--cy', `${y.toFixed(1)}px`);
    root.style.setProperty('--rx', `${ringX.toFixed(1)}px`);
    root.style.setProperty('--ry', `${ringY.toFixed(1)}px`);
  };

  const tick = (time) => {
    const delta = Math.min(48, time - last || 16);
    last = time;
    const ease = 1 - Math.pow(0.82, delta / 16.67);
    ringX += (x - ringX) * ease;
    ringY += (y - ringY) * ease;
    paint();
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      const interactive = event.target.closest('a, button, [role="button"], input, textarea, select');
      root.classList.toggle('is-hovering', Boolean(interactive));
      if (!active) {
        active = true;
        ringX = x;
        ringY = y;
        paint();
        root.classList.add('is-active');
        document.documentElement.classList.add('has-cursor');
        start();
      }
    },
    { passive: true }
  );

  window.addEventListener('pointerdown', () => root.classList.add('is-down'));
  window.addEventListener('pointerup', () => root.classList.remove('is-down'));

  document.addEventListener('mouseleave', () => {
    root.classList.remove('is-active');
    document.documentElement.classList.remove('has-cursor');
    active = false;
    stop();
  });

  document.addEventListener('mouseenter', () => {
    if (!active && window.matchMedia('(pointer: fine)').matches) {
      root.classList.add('is-active');
      document.documentElement.classList.add('has-cursor');
      active = true;
      start();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (active) start();
  });
}
