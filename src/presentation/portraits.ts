import type { CadetAppearance } from '../contracts';
import {
  speakerPortraits,
  type SpeakerPortrait,
  type SpeakerPortraitId,
} from '../app/catalogue';
import { defaultCadetAppearance } from '../app/save';

export const PORTRAIT_IDS: readonly SpeakerPortraitId[] = [
  'reyes',
  'lia',
  'elena',
  'cadet',
  'pip',
  'scout',
  'cometa',
] as const;

export interface CadetPalette {
  skinTone: string;
  skinFill: string;
  skinShadow: string;
  suitAccent: string;
  accentFill: string;
  accentDark: string;
  visorTone: string;
  visorTint: string;
  visorHighlight: string;
}

export interface PortraitRenderOptions {
  size?: 'sm' | 'md' | 'lg';
  appearance?: Partial<CadetAppearance>;
  status?: 'active' | 'warning' | 'offline';
  decorative?: boolean;
  className?: string;
}

const SKIN_PALETTE: Record<string, { fill: string; shadow: string }> = {
  fair: { fill: '#f3cbb4', shadow: '#d7a68c' },
  light: { fill: '#e5b28e', shadow: '#c58f6c' },
  medium: { fill: '#c68961', shadow: '#a46944' },
  tan: { fill: '#9d623f', shadow: '#7d4a2b' },
  deep: { fill: '#653b26', shadow: '#4a2919' },
};

const SUIT_ACCENT_PALETTE: Record<string, { fill: string; dark: string }> = {
  orange: { fill: '#f08c3a', dark: '#bd5c18' },
  cyan: { fill: '#57cee0', dark: '#2791a4' },
  emerald: { fill: '#4eb984', dark: '#298759' },
  cobalt: { fill: '#578ff0', dark: '#2f60ba' },
};

const VISOR_PALETTE: Record<string, { tint: string; highlight: string }> = {
  gold: { tint: '#f6c868', highlight: '#ffe29c' },
  cyan: { tint: '#6ae3f2', highlight: '#a9f4ff' },
  slate: { tint: '#9fb5c4', highlight: '#d3e1eb' },
};

let svgUid = 0;

export function getCadetPalette(appearance?: Partial<CadetAppearance>): CadetPalette {
  const skinKey =
    appearance?.skinTone && SKIN_PALETTE[appearance.skinTone]
      ? appearance.skinTone
      : defaultCadetAppearance.skinTone;
  const accentKey =
    appearance?.suitAccent && SUIT_ACCENT_PALETTE[appearance.suitAccent]
      ? appearance.suitAccent
      : defaultCadetAppearance.suitAccent;
  const visorKey =
    appearance?.visorTone && VISOR_PALETTE[appearance.visorTone]
      ? appearance.visorTone
      : defaultCadetAppearance.visorTone;

  return {
    skinTone: skinKey,
    skinFill: SKIN_PALETTE[skinKey].fill,
    skinShadow: SKIN_PALETTE[skinKey].shadow,
    suitAccent: accentKey,
    accentFill: SUIT_ACCENT_PALETTE[accentKey].fill,
    accentDark: SUIT_ACCENT_PALETTE[accentKey].dark,
    visorTone: visorKey,
    visorTint: VISOR_PALETTE[visorKey].tint,
    visorHighlight: VISOR_PALETTE[visorKey].highlight,
  };
}

export function getSpeakerMeta(id: SpeakerPortraitId): SpeakerPortrait {
  return speakerPortraits[id];
}

function escapeAttr(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  );
}

function sizePixels(size: PortraitRenderOptions['size']): number {
  if (size === 'sm') return 56;
  if (size === 'lg') return 116;
  return 88;
}

export function renderPortraitSvg(
  id: SpeakerPortraitId,
  options: PortraitRenderOptions = {},
): string {
  const uid = `p${++svgUid}`;
  const meta = speakerPortraits[id];
  const px = sizePixels(options.size);
  const status = options.status ?? 'active';
  const palette = getCadetPalette(options.appearance);
  const classes = ['astra-portrait', `portrait-${options.size ?? 'md'}`, options.className ?? '']
    .filter(Boolean)
    .join(' ');
  const ariaAttrs = options.decorative
    ? 'aria-hidden="true"'
    : `role="img" aria-label="${escapeAttr(`${meta.name} — ${meta.role}: ${meta.visualSummary}`)}"`;

  const extraDataAttrs =
    id === 'cadet'
      ? ` data-suit-accent="${escapeAttr(palette.suitAccent)}" data-visor-tone="${escapeAttr(palette.visorTone)}" data-skin-tone="${escapeAttr(palette.skinTone)}" data-helmet="closed"`
      : id === 'cometa'
        ? ' data-helmet="closed"'
        : '';

  const ringColor =
    id === 'cadet'
      ? palette.accentFill
      : id === 'elena'
        ? '#52ba84'
        : id === 'pip'
          ? '#65d9e8'
          : status === 'offline'
            ? '#8fa5b5'
            : '#f09446';

  let inner = '';
  if (id === 'reyes') {
    inner = `
      <!-- Command jacket & orange collar -->
      <path d="M18 114c4-22 20-30 42-30s38 8 42 30z" fill="#e4e8ea" stroke="#2c4152" stroke-width="2"/>
      <path d="M36 85l24 22 24-22" fill="none" stroke="#ea8635" stroke-width="4" stroke-linejoin="round"/>
      <path d="M40 84h40l-8 10H48z" fill="#ea8635"/>
      <rect x="74" y="96" width="14" height="8" rx="2" fill="#2c4152"/>
      <circle cx="81" cy="100" r="2" fill="#65d9e8"/>
      <!-- Neck & dark skin head -->
      <rect x="51" y="72" width="18" height="14" rx="6" fill="#5b3623"/>
      <ellipse cx="60" cy="52" rx="21" ry="24" fill="#6d422b"/>
      <circle cx="38" cy="54" r="4.5" fill="#5f3723"/>
      <circle cx="82" cy="54" r="4.5" fill="#5f3723"/>
      <!-- Salt-and-pepper hair & rounded greying beard -->
      <path d="M39 46c0-16 10-24 21-24s21 8 21 24c-3-8-10-12-21-12s-18 4-21 12z" fill="#3a3d42"/>
      <path d="M42 40c5-11 31-11 36 0" fill="none" stroke="#c8d1d8" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M40 56c1 14 9 23 20 23s19-9 20-23c-4 6-10 8-20 8s-16-2-20-8z" fill="#9ea8b0"/>
      <path d="M43 59c3 11 9 16 17 16s14-5 17-16" fill="#cfd6db" opacity="0.85"/>
      <!-- Eyes & warm expression -->
      <path d="M46 46q5-3 9 0" fill="none" stroke="#2a1d17" stroke-width="2.3" stroke-linecap="round"/>
      <path d="M65 46q5-3 9 0" fill="none" stroke="#2a1d17" stroke-width="2.3" stroke-linecap="round"/>
      <circle cx="50.5" cy="51.5" r="2.6" fill="#1e1512"/>
      <circle cx="69.5" cy="51.5" r="2.6" fill="#1e1512"/>
      <circle cx="51.3" cy="50.7" r="0.8" fill="#ffffff"/>
      <circle cx="70.3" cy="50.7" r="0.8" fill="#ffffff"/>
      <path d="M56 57q4 3 8 0" fill="none" stroke="#472819" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M51 64q9 6 18 0" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
    `;
  } else if (id === 'lia') {
    inner = `
      <!-- Orange utility vest over ivory lab shirt -->
      <path d="M18 114c4-21 19-29 42-29s38 8 42 29z" fill="#e5eaec" stroke="#2a3f50" stroke-width="2"/>
      <path d="M31 87l12 27h-19l4-24zm58 0l-12 27h19l-4-24z" fill="#ec8332"/>
      <rect x="46" y="88" width="28" height="26" fill="#233748"/>
      <rect x="57" y="88" width="6" height="20" fill="#f09446"/>
      <!-- Hair bun behind head -->
      <circle cx="60" cy="24" r="11" fill="#2f2422"/>
      <circle cx="60" cy="24" r="9" fill="#3c2f2c"/>
      <!-- Neck & head -->
      <rect x="52" y="71" width="16" height="15" rx="6" fill="#c98e6b"/>
      <ellipse cx="60" cy="53" rx="19" ry="22" fill="#dc9f7a"/>
      <!-- Hair frame -->
      <path d="M40 49c0-15 9-23 20-23s20 8 20 23c-3-9-9-13-20-13s-17 4-20 13z" fill="#2f2422"/>
      <path d="M40 44c-3 6-2 13 2 17m36-17c3 6 2 13-2 17" fill="none" stroke="#2f2422" stroke-width="4" stroke-linecap="round"/>
      <!-- Protective orange-framed glasses -->
      <rect x="42" y="46" width="15" height="11" rx="4" fill="#65d9e826" stroke="#f08c3a" stroke-width="2.6"/>
      <rect x="63" y="46" width="15" height="11" rx="4" fill="#65d9e826" stroke="#f08c3a" stroke-width="2.6"/>
      <line x1="57" y1="51" x2="63" y2="51" stroke="#f08c3a" stroke-width="2.4"/>
      <circle cx="49.5" cy="51.5" r="2.4" fill="#1e1714"/>
      <circle cx="70.5" cy="51.5" r="2.4" fill="#1e1714"/>
      <circle cx="50.3" cy="50.7" r="0.8" fill="#ffffff"/>
      <circle cx="71.3" cy="50.7" r="0.8" fill="#ffffff"/>
      <path d="M45 43q5-2.5 9 0M66 43q5-2.5 9 0" fill="none" stroke="#2f2422" stroke-width="1.9" stroke-linecap="round"/>
      <path d="M53 64q7 4.5 14 0" fill="none" stroke="#8b4e38" stroke-width="2.2" stroke-linecap="round"/>
    `;
  } else if (id === 'elena') {
    inner = `
      <!-- Lab coat & green greenhouse lapel -->
      <path d="M18 114c4-21 19-29 42-29s38 8 42 29z" fill="#eef3f0" stroke="#315249" stroke-width="2"/>
      <path d="M42 86l18 22 18-22" fill="#46765d"/>
      <circle cx="78" cy="100" r="5" fill="#4eb984"/>
      <path d="M76 100q2-4 5-2q-1 4-5 2z" fill="#e8f9ee"/>
      <!-- Neck & dark skin face -->
      <rect x="52" y="72" width="16" height="14" rx="6" fill="#4d2c1c"/>
      <ellipse cx="60" cy="54" rx="19" ry="21.5" fill="#5e3623"/>
      <!-- Short curls & green headband -->
      <g fill="#231917">
        <circle cx="42" cy="40" r="8"/><circle cx="50" cy="31" r="9"/><circle cx="60" cy="29" r="9.5"/>
        <circle cx="70" cy="31" r="9"/><circle cx="78" cy="40" r="8"/><circle cx="39" cy="50" r="6.5"/>
        <circle cx="81" cy="50" r="6.5"/>
      </g>
      <path d="M40 43c6-9 34-9 40 0" fill="none" stroke="#4fb984" stroke-width="5.5" stroke-linecap="round"/>
      <!-- Warm facial features -->
      <path d="M46 48q4-2.5 8 0M66 48q4-2.5 8 0" fill="none" stroke="#22140e" stroke-width="2" stroke-linecap="round"/>
      <circle cx="50" cy="53" r="2.6" fill="#180e0a"/>
      <circle cx="70" cy="53" r="2.6" fill="#180e0a"/>
      <circle cx="50.8" cy="52.2" r="0.9" fill="#ffffff"/>
      <circle cx="70.8" cy="52.2" r="0.9" fill="#ffffff"/>
      <path d="M53 64q7 5 14 0" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round"/>
    `;
  } else if (id === 'cadet') {
    inner = `
      <!-- White astronaut pressure suit with customizable accent -->
      <path d="M16 114c5-21 20-29 44-29s39 8 44 29z" fill="#e7ecee" stroke="#2b4254" stroke-width="2"/>
      <path d="M32 90l10 24h-13zm56 0l-10 24h13z" fill="${palette.accentFill}"/>
      <rect x="48" y="96" width="24" height="13" rx="4" fill="#1e3244" stroke="${palette.accentFill}" stroke-width="1.6"/>
      <circle cx="55" cy="102.5" r="2.2" fill="#65d9e8"/>
      <rect x="61" y="100.5" width="7" height="4" rx="1.5" fill="${palette.accentFill}"/>
      <!-- Pressure collar ring -->
      <ellipse cx="60" cy="83" rx="22" ry="5.5" fill="${palette.accentDark}" stroke="#e7ecee" stroke-width="2"/>
      <!-- Gender-neutral young cadet inside closed glass helmet -->
      <rect x="53" y="69" width="14" height="13" rx="5" fill="${palette.skinShadow}"/>
      <ellipse cx="60" cy="53" rx="17.5" ry="20" fill="${palette.skinFill}"/>
      <!-- Soft neutral short hair -->
      <path d="M42.5 50c0-13 8-20 17.5-20s17.5 7 17.5 20c-2-7-7-10-12-10-4 0-6 2-11 2-5 0-9 3-12 8z" fill="#3a2c27"/>
      <path d="M46 47q4-2.5 8 0M66 47q4-2.5 8 0" fill="none" stroke="#271b16" stroke-width="1.9" stroke-linecap="round"/>
      <circle cx="50" cy="52.5" r="2.5" fill="#1c1411"/>
      <circle cx="70" cy="52.5" r="2.5" fill="#1c1411"/>
      <circle cx="50.8" cy="51.7" r="0.85" fill="#ffffff"/>
      <circle cx="70.8" cy="51.7" r="0.85" fill="#ffffff"/>
      <path d="M54 62q6 4 12 0" fill="none" stroke="#7d4736" stroke-width="2" stroke-linecap="round"/>
      <!-- Closed spherical glass helmet with customizable visor tint -->
      <circle cx="60" cy="53" r="30.5" fill="${palette.visorTint}" fill-opacity="0.16" stroke="#d9e7ec" stroke-width="2.5"/>
      <path d="M37 42a26 26 0 0 1 28-17" fill="none" stroke="${palette.visorHighlight}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
      <path d="M40 73a25 25 0 0 0 40 0" fill="none" stroke="${palette.accentFill}" stroke-width="2.5" stroke-linecap="round"/>
    `;
  } else if (id === 'pip') {
    inner = `
      <!-- Top sensor antenna -->
      <line x1="60" y1="22" x2="60" y2="11" stroke="#9eb5c4" stroke-width="3" stroke-linecap="round"/>
      <circle cx="60" cy="10" r="4" fill="#f08c3a"/>
      <!-- Side cyan thruster ears -->
      <circle cx="24" cy="60" r="10" fill="#2c4355" stroke="#e4ebed" stroke-width="2.5"/>
      <circle cx="24" cy="60" r="5" fill="#65e3f2"/>
      <circle cx="96" cy="60" r="10" fill="#2c4355" stroke="#e4ebed" stroke-width="2.5"/>
      <circle cx="96" cy="60" r="5" fill="#65e3f2"/>
      <!-- Spherical white-ivory chassis + orange safety band -->
      <ellipse cx="60" cy="60" rx="35" ry="33" fill="#e7eeef" stroke="#30485b" stroke-width="2.2"/>
      <path d="M26 62c11 6 57 6 68 0" fill="none" stroke="#f08c3a" stroke-width="4.5" stroke-linecap="round"/>
      <rect x="44" y="90" width="32" height="12" rx="5" fill="#273a4b" stroke="#f08c3a" stroke-width="1.8"/>
      <!-- Glossy dark face screen with glowing cyan eyes -->
      <rect x="33" y="39" width="54" height="36" rx="16" fill="#081421" stroke="#9bb7c7" stroke-width="2"/>
      <path d="M43 56q5-7 10 0" fill="none" stroke="#66e8f6" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M67 56q5-7 10 0" fill="none" stroke="#66e8f6" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M53 64q7 4 14 0" fill="none" stroke="#66e8f6" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>
    `;
  } else if (id === 'scout') {
    const opticColor = status === 'offline' ? '#e7a350' : '#66e8f6';
    inner = `
      <!-- Twin rear telemetry antennas -->
      <line x1="42" y1="36" x2="42" y2="15" stroke="#b5c7d3" stroke-width="3" stroke-linecap="round"/>
      <circle cx="42" cy="14" r="3.8" fill="#f08c3a"/>
      <line x1="78" y1="36" x2="78" y2="15" stroke="#b5c7d3" stroke-width="3" stroke-linecap="round"/>
      <circle cx="78" cy="14" r="3.8" fill="#f08c3a"/>
      <!-- 4 rugged wheels -->
      <rect x="16" y="74" width="15" height="24" rx="5" fill="#243340" stroke="#7d95a6" stroke-width="2"/>
      <rect x="89" y="74" width="15" height="24" rx="5" fill="#243340" stroke="#7d95a6" stroke-width="2"/>
      <circle cx="23.5" cy="86" r="3.5" fill="#f08c3a"/>
      <circle cx="96.5" cy="86" r="3.5" fill="#f08c3a"/>
      <!-- Boxy ivory & orange rover chassis -->
      <rect x="27" y="34" width="66" height="48" rx="11" fill="#e5ecee" stroke="#2c4152" stroke-width="2.2"/>
      <rect x="27" y="64" width="66" height="9" fill="#f08c3a"/>
      <!-- Sensor visor & dual optical cameras -->
      <rect x="35" y="42" width="50" height="18" rx="6" fill="#091522" stroke="#7592a6" stroke-width="1.8"/>
      <circle cx="48" cy="51" r="5" fill="#173347" stroke="${opticColor}" stroke-width="2.2"/>
      <circle cx="48" cy="51" r="2" fill="${opticColor}"/>
      <circle cx="72" cy="51" r="5" fill="#173347" stroke="${opticColor}" stroke-width="2.2"/>
      <circle cx="72" cy="51" r="2" fill="${opticColor}"/>
      <!-- S-02 badge -->
      <rect x="44" y="85" width="32" height="14" rx="4" fill="#1c2f40" stroke="#f08c3a" stroke-width="1.6"/>
      <text x="60" y="95" text-anchor="middle" font-size="8.5" font-weight="700" fill="#f4f7f8" font-family="system-ui,sans-serif">S-02</text>
    `;
  } else {
    // Cometa: brown & tan dachshund inside clear spherical pressure helmet with floppy ears & cyan collar LED
    inner = `
      <!-- Ivory & orange four-legged pressure suit shoulders -->
      <path d="M20 114c5-20 18-28 40-28s35 8 40 28z" fill="#e8e6dd" stroke="#314658" stroke-width="2"/>
      <path d="M31 92l8 22h-11zm58 0l-8 22h11z" fill="#ef8b38"/>
      <!-- Pressure collar with glowing cyan LED -->
      <ellipse cx="60" cy="84" rx="22" ry="6" fill="#ef8b38" stroke="#e8e6dd" stroke-width="2"/>
      <circle cx="60" cy="87" r="4.5" fill="#173347" stroke="#66e8f6" stroke-width="1.8"/>
      <circle cx="60" cy="87" r="2" fill="#66e8f6"/>
      <!-- Dachshund head & floppy ears safely inside clear helmet -->
      <path d="M36 47c-4 9-3 22 3 26 4 2 7-2 7-10 0-8-2-15-5-18z" fill="#5e331c"/>
      <path d="M84 47c4 9 3 22-3 26-4 2-7-2-7-10 0-8 2-15 5-18z" fill="#5e331c"/>
      <ellipse cx="60" cy="52" rx="16.5" ry="18.5" fill="#703e22"/>
      <!-- Tan brows, cheeks & muzzle -->
      <ellipse cx="52" cy="43" rx="3.8" ry="2.2" fill="#d58f51"/>
      <ellipse cx="68" cy="43" rx="3.8" ry="2.2" fill="#d58f51"/>
      <ellipse cx="60" cy="60" rx="11.5" ry="9.5" fill="#d58f51"/>
      <ellipse cx="60" cy="57" rx="4.2" ry="3" fill="#231612"/>
      <circle cx="52" cy="49" r="3" fill="#1b120f"/>
      <circle cx="68" cy="49" r="3" fill="#1b120f"/>
      <circle cx="52.8" cy="48" r="1" fill="#ffffff"/>
      <circle cx="68.8" cy="48" r="1" fill="#ffffff"/>
      <path d="M55 64q5 4 10 0" fill="none" stroke="#4a2617" stroke-width="2" stroke-linecap="round"/>
      <path d="M57.5 66q2.5 4.5 5 0z" fill="#e97f8a"/>
      <!-- Closed clear spherical glass helmet -->
      <circle cx="60" cy="53" r="31" fill="#9ee8f5" fill-opacity="0.14" stroke="#dce8ee" stroke-width="2.5"/>
      <path d="M36 43a27 27 0 0 1 28-18" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${px}" height="${px}" class="${classes}" data-portrait="${id}"${extraDataAttrs} ${ariaAttrs}><defs><radialGradient id="${uid}-bg" cx="45%" cy="35%" r="70%"><stop offset="0%" stop-color="#193b56"/><stop offset="100%" stop-color="#091624"/></radialGradient><clipPath id="${uid}-clip"><circle cx="60" cy="60" r="55"/></clipPath></defs><circle cx="60" cy="60" r="56" fill="url(#${uid}-bg)" stroke="${ringColor}" stroke-width="3"/><g clip-path="url(#${uid}-clip)">${inner}</g></svg>`;
}
