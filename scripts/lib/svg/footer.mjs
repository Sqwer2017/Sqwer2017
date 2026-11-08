import { escapeXml } from '../util.mjs';
import { glowEllipse, linearGradient, radialGradient, svgDoc } from '../theme.mjs';

const W = 880;
const H = 150;

export function renderFooter(t, config) {
  const year = new Date().getFullYear();
  const copyright = String(config.copyright || '© {year} Sqwer').replace('{year}', year);

  const defs = [
    linearGradient('footer-line', [[0, t.accent, 0], [0.5, t.accent, 0.35], [1, t.accent, 0]], { x1: 0, y1: 0, x2: 1, y2: 0 }),
    linearGradient('footer-mono', [[0, t.art1], [1, t.card2]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    glowEllipse('footer-glow', 440, 150, 300, 120, t.accentDeep, t.dark ? 0.18 : 0.08, true),
    radialGradient('footer-halo', [[0, t.accentBright, 0.14], [1, t.accentBright, 0]], { cx: 0.5, cy: 0.5, r: 0.5 })
  ].join('\n');

  const body = `
<path d="M44 1H836" stroke="url(#footer-line)"/>
<rect width="${W}" height="${H}" fill="url(#footer-glow)"/>
<circle cx="440" cy="44" r="46" fill="url(#footer-halo)"/>
<rect x="421" y="25" width="38" height="38" rx="13" fill="url(#footer-mono)" stroke="${t.border}"/>
<text x="440" y="51" text-anchor="middle" class="display" font-size="18" font-weight="700" fill="${t.accentBright}">S</text>
<text x="440" y="93" text-anchor="middle" class="display" font-size="22" font-weight="600" letter-spacing="-0.2" fill="${t.text}">${escapeXml(config.line)}</text>
<text x="440" y="115" text-anchor="middle" font-size="11" fill="${t.textMuted}">${escapeXml(config.note)}</text>
<text x="440" y="137" text-anchor="middle" class="mono" font-size="8.5" letter-spacing="1.2" fill="${t.textFaint}" opacity="0.8">${escapeXml(copyright.toUpperCase())}</text>
<circle cx="356" cy="94" r="1.6" fill="${t.accent}" opacity="0.45"/>
<circle cx="524" cy="94" r="1.6" fill="${t.accent}" opacity="0.45"/>
`;

  return svgDoc({
    width: W,
    height: H,
    label: `${config.line} ${config.note} ${copyright}`,
    defs,
    body
  });
}
