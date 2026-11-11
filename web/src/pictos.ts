// Built-in pictographs: simple, concrete line drawings (KB §7 rule 13: no emoji, no decorative clip art).
// Each returns an inline SVG string; colour comes from CSS (currentColor + --accent).

const svg = (body: string, label: string) =>
  `<svg viewBox="0 0 96 96" role="img" aria-label="${label}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const face = (mouth: string) => `<circle cx="48" cy="48" r="36"/><circle cx="35" cy="40" r="3" fill="currentColor"/><circle cx="61" cy="40" r="3" fill="currentColor"/>${mouth}`;
const personShape = `<circle cx="40" cy="30" r="13"/><path d="M16 84c0-16 11-27 24-27s24 11 24 27"/>`;
const bars = (n: number) =>
  [0, 1, 2, 3].map((i) => `<rect x="${14 + i * 18}" y="${70 - i * 14}" width="12" height="${14 + i * 14}" rx="2" ${i < n ? 'fill="currentColor"' : ''}/>`).join('');

const BODY_OUTLINE = `<circle cx="48" cy="14" r="9"/><path d="M34 28h28l4 36H30z"/><path d="M34 30l-12 28M62 30l12 28"/><path d="M38 64l-4 26M58 64l4 26"/>`;
const BODY_HIGHLIGHT: Record<string, string> = {
  head: '<circle cx="48" cy="14" r="9" fill="var(--accent)" stroke="none"/>',
  face: '<circle cx="48" cy="14" r="9" fill="var(--accent)" stroke="none"/>',
  eyes: '<path d="M43 12h3M50 12h3" stroke="var(--accent)" stroke-width="4"/>',
  mouth: '<path d="M44 18h8" stroke="var(--accent)" stroke-width="4"/>',
  'top of head': '<path d="M40 10a9 9 0 0116 0" stroke="var(--accent)" stroke-width="5"/>',
  ears: '<path d="M38 14v2M58 14v2" stroke="var(--accent)" stroke-width="5"/>',
  neck: '<rect x="44" y="22" width="8" height="6" fill="var(--accent)" stroke="none"/>',
  'left side': '<path d="M50 30h11l1 14H50z" fill="var(--accent)" stroke="none"/>',
  'right side': '<path d="M35 30h11v14H34z" fill="var(--accent)" stroke="none"/>',
  middle: '<path d="M44 30h8v14h-8z" fill="var(--accent)" stroke="none"/>',
  'upper stomach': '<path d="M34 44h28l1 9H33z" fill="var(--accent)" stroke="none"/>',
  'lower stomach': '<path d="M33 53h30l1 9H32z" fill="var(--accent)" stroke="none"/>',
  chest: '<path d="M35 30h26l1 14H34z" fill="var(--accent)" stroke="none"/>',
  stomach: '<path d="M34 44h28l2 18H32z" fill="var(--accent)" stroke="none"/>',
  side: '<path d="M58 34h4l3 26h-5z" fill="var(--accent)" stroke="none"/>',
  back: '<path d="M35 30h26l3 32H32z" fill="var(--accent)" stroke="none" opacity=".55"/><path d="M48 30v32" stroke="var(--accent)"/>',
  'upper back': '<path d="M35 30h26l1 16H34z" fill="var(--accent)" stroke="none" opacity=".6"/>',
  'lower back': '<path d="M34 46h28l2 16H32z" fill="var(--accent)" stroke="none" opacity=".6"/>',
  arms: '<path d="M34 30l-12 28M62 30l12 28" stroke="var(--accent)" stroke-width="7"/>',
  legs: '<path d="M38 64l-4 26M58 64l4 26" stroke="var(--accent)" stroke-width="7"/>',
  hands: '<circle cx="22" cy="60" r="5" fill="var(--accent)" stroke="none"/><circle cx="74" cy="60" r="5" fill="var(--accent)" stroke="none"/>',
  feet: '<path d="M28 90h8M60 90h8" stroke="var(--accent)" stroke-width="7"/>',
  'left arm': '<path d="M62 30l12 28" stroke="var(--accent)" stroke-width="8"/>',
  'right arm': '<path d="M34 30l-12 28" stroke="var(--accent)" stroke-width="8"/>',
  'left leg': '<path d="M58 64l4 26" stroke="var(--accent)" stroke-width="8"/>',
  'right leg': '<path d="M38 64l-4 26" stroke="var(--accent)" stroke-width="8"/>',
};

const P: Record<string, string> = {
  yes: '<path d="M20 50l18 18 38-40" stroke="var(--yes)" stroke-width="9"/>',
  no: '<path d="M24 24l48 48M72 24L24 72" stroke="var(--no)" stroke-width="9"/>',
  'not sure': '<path d="M34 34c0-9 6-15 14-15s14 6 14 14c0 10-14 12-14 24"/><circle cx="48" cy="74" r="3.5" fill="currentColor"/>',
  'something else': '<rect x="14" y="22" width="68" height="52" rx="10" stroke-dasharray="8 7"/><circle cx="34" cy="48" r="4" fill="currentColor"/><circle cx="48" cy="48" r="4" fill="currentColor"/><circle cx="62" cy="48" r="4" fill="currentColor"/>',
  'someone else': `${personShape}<path d="M70 26c0-5 4-9 9-9s9 4 9 9c0 6-9 7-9 14" stroke-width="4"/><circle cx="79" cy="50" r="2.5" fill="currentColor"/>`,
  'somewhere else': '<path d="M48 86s-24-26-24-44a24 24 0 0148 0c0 18-24 44-24 44z"/><path d="M42 36c0-4 3-7 6-7s7 3 7 7c0 5-7 6-7 11" stroke-width="4"/><circle cx="48" cy="54" r="2.5" fill="currentColor"/>',
  good: face('<path d="M32 58c9 10 23 10 32 0"/>'),
  okay: face('<path d="M33 62h30"/>'),
  bad: face('<path d="M32 68c9-10 23-10 32 0"/>'),
  tasty: '<path d="M14 50h68c0 18-15 30-34 30S14 68 14 50z"/><path d="M36 38c-4-6 4-10 0-16M48 38c-4-6 4-10 0-16M60 38c-4-6 4-10 0-16" stroke-width="4"/>',
  plain: '<ellipse cx="48" cy="56" rx="36" ry="20"/><ellipse cx="48" cy="54" rx="20" ry="9"/>',
  'too salty': '<path d="M34 34h28l-4 50H38z"/><path d="M36 34c0-10 5-16 12-16s12 6 12 16"/><circle cx="44" cy="26" r="2" fill="currentColor"/><circle cx="52" cy="26" r="2" fill="currentColor"/><path d="M74 20l4 6M82 30l6 2M72 36l6 6" stroke-width="3"/>',
  'good idea': '<path d="M48 14a24 24 0 0114 43c-3 3-4 6-4 10H38c0-4-1-7-4-10a24 24 0 0114-43z"/><path d="M38 76h20M41 84h14"/>',
  'leave it': '<path d="M34 84V46m0 0V24a5 5 0 0110 0v20m0-2V18a5 5 0 0110 0v24m0-2V22a5 5 0 0110 0v26m0-4v-8a5 5 0 0110 0v18c0 18-10 30-26 30-8 0-14-4-18-10L18 58a5 5 0 018-6l8 8"/>',
  'like them': `${personShape}<path d="M78 34c-4-6-14-3-12 5 1 5 12 12 12 12s11-7 12-12c2-8-8-11-12-5z" fill="var(--accent)" stroke="none"/>`,
  unhappy: `${personShape}<path d="M70 44c4-4 12-4 16 0" stroke-width="4"/>`,
  'this one': '<rect x="10" y="40" width="34" height="40" rx="6"/><path d="M84 30L54 56M54 56h14M54 56V42" stroke-width="6"/>',
  'that one': '<rect x="52" y="40" width="34" height="40" rx="6"/><path d="M12 30l30 26M42 56H28M42 56V42" stroke-width="6"/>',
  // drawn 11 Nov 2026 (in the submission period)
  listen: '<path d="M30 40a20 20 0 0140 0c0 12-8 16-12 22-3 5-3 12-10 14-6 2-11-2-11-7"/><path d="M40 42a10 10 0 0120 0c0 6-6 8-6 14" stroke-width="4"/>',
  tea: '<path d="M18 40h48v16c0 14-11 24-24 24S18 70 18 56z"/><path d="M66 46h6a8 8 0 010 16h-8"/><path d="M14 86h60"/><path d="M42 40V22h10v10h-10" stroke-width="3"/>',
  coffee: '<path d="M22 36h44l-5 44H27z"/><path d="M66 46h5a8 8 0 010 16h-7"/><path d="M36 26c-3-5 3-8 0-13M48 26c-3-5 3-8 0-13" stroke-width="4"/>',
  'a little': bars(1),
  some: bars(2),
  'a lot': bars(4),
};

export function builtinPicto(id: string): string {
  if (id.startsWith('body:')) {
    const part = id.slice(5);
    return svg(BODY_OUTLINE + (BODY_HIGHLIGHT[part] ?? ''), part);
  }
  return svg(P[id] ?? P['something else'], id);
}

export function monogram(initial: string): string {
  return `<svg viewBox="0 0 96 96" role="img" aria-label="${initial}"><circle cx="48" cy="48" r="42" fill="var(--accent-soft)"/><text x="48" y="62" text-anchor="middle" font-size="42" font-family="Verdana, sans-serif" fill="currentColor">${initial}</text></svg>`;
}

/** Shown while a cloud picture is loading or unavailable: a plain empty frame, no text. */
export const PICTURE_PENDING = svg('<rect x="16" y="20" width="64" height="56" rx="8" stroke-dasharray="6 6" opacity=".45"/>', 'picture not available');

export const TICK = svg(P.yes, 'yes');
export const CROSS = svg(P.no, 'no');
