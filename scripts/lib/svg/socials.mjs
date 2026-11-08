import { escapeXml } from '../util.mjs';
import { glowEllipse, linearGradient, sectionHeader, svgDoc } from '../theme.mjs';
import { icon } from '../icons.mjs';

export function renderSocialsHeader(t, config) {
  const defs = [];

  const body = `
${sectionHeader(t, {
    eyebrow: config.eyebrow,
    title: config.title,
    note: config.note,
    titleSize: 31
  })}
`;

  return svgDoc({
    width: 880,
    height: 112,
    label: `${config.title}. ${config.note}`,
    defs,
    body
  });
}

export function renderSocialCard(t, social, index) {
  const W = 284;
  const H = 100;
  const defs = [
    linearGradient('social-card', [[0, t.card1], [1, t.card2]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    glowEllipse('social-icon-glow', 42, 50, 46, 40, t.accentDeep, t.dark ? 0.34 : 0.18, true)
  ].join('\n');

  const body = `
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="url(#social-card)" stroke="${t.border}"/>
<path d="M22 1H262" stroke="${t.sheen}" stroke-opacity="${t.dark ? 0.07 : 0.8}"/>
<ellipse cx="42" cy="50" rx="46" ry="40" fill="url(#social-icon-glow)"/>
<rect x="20" y="28" width="44" height="44" rx="14" fill="${t.chipBg}" stroke="${t.chipBorder}"/>
${icon(social.icon, { x: 31, y: 39, size: 22, color: t.accentBright })}
<text x="78" y="47" font-size="14.5" font-weight="600" fill="${t.text}">${escapeXml(social.label)}</text>
<text x="78" y="65" class="mono" font-size="10" fill="${t.textFaint}">${escapeXml(social.handle)}</text>
${icon('ui-arrow', { x: 248, y: 20, size: 14, color: t.textFaint, opacity: 0.75 })}
<text x="264" y="88" text-anchor="end" class="mono" font-size="8" letter-spacing="1.2" fill="${t.textFaint}" opacity="0.6">${String(index + 1).padStart(2, '0')}</text>
`;

  return svgDoc({
    width: W,
    height: H,
    label: `${social.label}: ${social.handle}`,
    defs,
    body
  });
}
