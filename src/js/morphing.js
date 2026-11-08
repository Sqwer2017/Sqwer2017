/**
 * Organic shapes that breathe between blob / rounded star / flower / circle.
 * Rendered small (≈0.55×) and blurred with CSS so it stays cheap and soft.
 */
export function initMorphing(canvas, { intensity = 0.7, speed = 1 } = {}) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const targets = [
    { a3: 0.13, a6: 0.0, a8: 0.02 },
    { a3: 0.0, a6: 0.17, a8: 0.0 },
    { a3: 0.0, a6: 0.0, a8: 0.16 },
    { a3: 0.0, a6: 0.0, a8: 0.0 }
  ];
  const shapes = [
    { cx: 0.79, cy: 0.2, r: 0.36, phase: 0.4, offset: 0 },
    { cx: 0.13, cy: 0.83, r: 0.29, phase: 2.6, offset: 4.5 }
  ];
  const cycle = 10;
  const blendTime = 5.6;
  const strength = Math.max(0.2, Math.min(1.4, intensity));

  let width = 0;
  let height = 0;
  let frame = 0;
  let lastDraw = 0;
  let start = performance.now();
  let onScreen = true;
  let running = true;
  let resizeTimer = 0;
  let palette = readPalette();

  function readPalette() {
    const styles = getComputedStyle(document.documentElement);
    return {
      accent: hexToRgb(styles.getPropertyValue('--accent').trim() || '#A987E8'),
      deep: hexToRgb(styles.getPropertyValue('--accent-deep').trim() || '#8D5CF6'),
      light: document.documentElement.dataset.theme === 'light'
    };
  }

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    width = Math.max(220, Math.round(rect.width * 0.55));
    height = Math.max(160, Math.round(rect.height * 0.55));
    canvas.width = width;
    canvas.height = height;
  }

  function coefsAt(shape, timeSeconds) {
    const t = Math.max(0, timeSeconds);
    const local = ((t + shape.offset) % cycle) / blendTime;
    const raw = Math.floor((t + shape.offset) / cycle);
    const index = ((raw % targets.length) + targets.length) % targets.length;
    const next = (index + 1) % targets.length;
    const blend = easeInOut(clamp(local, 0, 1));
    const from = targets[index];
    const to = targets[next];
    return {
      a3: lerp(from.a3, to.a3, blend) + Math.sin(t * 0.22 + shape.phase) * 0.012,
      a6: lerp(from.a6, to.a6, blend),
      a8: lerp(from.a8, to.a8, blend)
    };
  }

  function drawShape(shape, time, index) {
    const coefs = coefsAt(shape, time);
    const cx = shape.cx * width + Math.sin(time * 0.11 + shape.phase) * width * 0.012;
    const cy = shape.cy * height + Math.cos(time * 0.09 + shape.phase) * height * 0.014;
    const radius = shape.r * Math.min(width, height);
    const rotation = time * 0.07 + shape.phase;

    context.beginPath();
    const points = 110;
    for (let i = 0; i <= points; i += 1) {
      const angle = (i / points) * Math.PI * 2;
      const wave =
        1 +
        coefs.a3 * Math.cos(3 * angle + rotation) +
        coefs.a6 * Math.cos(6 * angle - rotation * 0.65) +
        coefs.a8 * Math.cos(5 * angle + rotation * 0.4);
      const r = radius * wave;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();

    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.65);
    const alpha = (palette.light ? 0.2 : 0.34) * strength;
    gradient.addColorStop(0, `rgba(${palette.deep},${alpha})`);
    gradient.addColorStop(0.55, `rgba(${palette.accent},${alpha * 0.4})`);
    gradient.addColorStop(1, `rgba(${palette.accent},0)`);
    context.fillStyle = gradient;
    context.fill();

    if (index === 0) {
      context.strokeStyle = `rgba(${palette.accent},${(palette.light ? 0.08 : 0.13) * strength})`;
      context.lineWidth = 1;
      context.stroke();
    }
  }

  function render(time) {
    context.clearRect(0, 0, width, height);
    shapes.forEach((shape, index) => drawShape(shape, time, index));
  }

  function loop(now) {
    if (!running) return;
    if (now - lastDraw >= 33) {
      lastDraw = now;
      render((now - start) / 1000 * speed);
    }
    frame = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (!running || frame) return;
    start = performance.now();
    frame = requestAnimationFrame(loop);
  }

  function stopLoop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function drawStatic() {
    resize();
    palette = readPalette();
    context.clearRect(0, 0, width, height);
    shapes.forEach((shape, index) => drawShape(shape, 1.5, index));
  }

  function updateRunning() {
    const shouldRun = onScreen && !document.hidden && !motion.matches;
    running = shouldRun;
    if (shouldRun) startLoop();
    else stopLoop();
  }

  resize();
  render(1.2);

  const resizeObserver = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      render((performance.now() - start) / 1000 * speed);
    }, 160);
  });
  if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        for (const entry of entries) onScreen = entry.isIntersecting;
        updateRunning();
      },
      { rootMargin: '120px' }
    ).observe(canvas);
  }

  document.addEventListener('visibilitychange', updateRunning);

  window.addEventListener('themechange', () => {
    palette = readPalette();
  });

  motion.addEventListener('change', () => {
    updateRunning();
    if (motion.matches) {
      stopLoop();
      drawStatic();
    }
  });

  updateRunning();
}

function hexToRgb(hex) {
  const value = String(hex).replace('#', '');
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const numeric = Number.parseInt(full, 16);
  if (Number.isNaN(numeric)) return '169,135,232';
  return `${(numeric >> 16) & 255},${(numeric >> 8) & 255},${numeric & 255}`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
