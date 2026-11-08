/**
 * Ambient canvas: a small field of soft, slowly rising light. Deliberately
 * sparse, pre-rendered to a sprite and paused when the tab is hidden.
 */
export function initParticles(canvas, { density = 0.65, speed = 1 } = {}) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let sprites = [];
  let frame = 0;
  let running = true;
  let start = performance.now();

  const readColors = () => {
    const styles = getComputedStyle(document.documentElement);
    return {
      accent: styles.getPropertyValue('--accent').trim() || '#A987E8',
      bright: styles.getPropertyValue('--accent-bright').trim() || '#C6A6FF',
      light: document.documentElement.dataset.theme === 'light'
    };
  };

  let colors = readColors();

  function makeSprite(color) {
    const sprite = document.createElement('canvas');
    sprite.width = 64;
    sprite.height = 64;
    const ctx = sprite.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, hexToRgba(color, 0.9));
    gradient.addColorStop(0.28, hexToRgba(color, 0.45));
    gradient.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return sprite;
  }

  function rebuildSprites() {
    sprites = [makeSprite(colors.accent), makeSprite(colors.bright)];
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const base = Math.min(width, height) < 720 ? 24 : 48;
    const count = Math.max(14, Math.min(74, Math.round((base + (width * height) / 52000) * density)));
    particles = Array.from({ length: count }, () => spawn(true));
  }

  function spawn(initial = false) {
    return {
      x: Math.random() * width,
      y: initial ? Math.random() * height : height + 20 + Math.random() * 80,
      radius: 0.7 + Math.random() * 1.9,
      alpha: 0.1 + Math.random() * (colors.light ? 0.22 : 0.34),
      speed: (0.05 + Math.random() * 0.13) * speed,
      phase: Math.random() * Math.PI * 2,
      sway: 6 + Math.random() * 16,
      sprite: Math.random() > 0.72 ? 1 : 0
    };
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    const seconds = (time - start) / 1000;
    for (const particle of particles) {
      particle.y -= particle.speed;
      if (particle.y < -40) {
        Object.assign(particle, spawn(false));
      }
      const px = particle.x + Math.sin(seconds * 0.12 + particle.phase) * particle.sway;
      const fade = 0.72 + Math.sin(seconds * 0.5 + particle.phase) * 0.28;
      const size = particle.radius * 12;
      context.globalAlpha = particle.alpha * fade;
      context.drawImage(sprites[particle.sprite], px - size / 2, particle.y - size / 2, size, size);
    }
    context.globalAlpha = 1;
  }

  function loop(time) {
    if (!running) return;
    draw(time);
    frame = requestAnimationFrame(loop);
  }

  function play() {
    if (!running) return;
    cancelAnimationFrame(frame);
    start = performance.now();
    frame = requestAnimationFrame(loop);
  }

  function pause() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  rebuildSprites();
  resize();
  play();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      rebuildSprites();
      draw(performance.now());
    }, 180);
  });

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) play();
    else pause();
  });

  window.addEventListener('themechange', () => {
    colors = readColors();
    rebuildSprites();
  });

  motion.addEventListener('change', (event) => {
    if (event.matches) {
      running = false;
      pause();
      canvas.style.display = 'none';
    } else {
      canvas.style.display = '';
      running = true;
      resize();
      rebuildSprites();
      play();
    }
  });
}

function hexToRgba(hex, alpha = 1) {
  const value = String(hex).replace('#', '');
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const numeric = Number.parseInt(full, 16);
  if (Number.isNaN(numeric)) return `rgba(169,135,232,${alpha})`;
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
