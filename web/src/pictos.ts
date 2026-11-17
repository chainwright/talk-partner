// Built-in pictographs: simple, concrete line drawings (KB §7 rule 13: no emoji, no decorative clip art).
// Hand-drawn SVG on a 96 × 96 grid, stroke 5, round caps and joins, `currentColor` plus one accent (build spec §3.2).
// Each returns an inline SVG string; colour comes from CSS (currentColor + --accent).
// Provenance and licence per pictogram: PICTOGRAMS.md (all drawn by us, Apache-2.0, dated).

const svg = (body: string, label: string) =>
  `<svg viewBox="0 0 96 96" role="img" aria-label="${label}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const face = (mouth: string, eyes = '<circle cx="35" cy="40" r="3" fill="currentColor"/><circle cx="61" cy="40" r="3" fill="currentColor"/>') =>
  `<circle cx="48" cy="48" r="36"/>${eyes}${mouth}`;
const personShape = `<circle cx="40" cy="30" r="13"/><path d="M16 84c0-16 11-27 24-27s24 11 24 27"/>`;
const bars = (n: number) =>
  [0, 1, 2, 3].map((i) => `<rect x="${14 + i * 18}" y="${70 - i * 14}" width="12" height="${14 + i * 14}" rx="2" ${i < n ? 'fill="currentColor"' : ''}/>`).join('');

// Neutral figures (rule 6: roles differ by one attribute, never by stereotype). Head + shoulders, three sizes.
const big = (cx: number) => `<circle cx="${cx}" cy="30" r="12"/><path d="M${cx - 26} 84c0-16 12-28 26-28s26 12 26 28"/>`;
const mid = (cx: number) => `<circle cx="${cx}" cy="36" r="10"/><path d="M${cx - 19} 82c0-13 8-22 19-22s19 9 19 22"/>`;
const small = (cx: number) => `<circle cx="${cx}" cy="54" r="8"/><path d="M${cx - 14} 84c0-9 6-16 14-16s14 7 14 16"/>`;
const low = (cx: number) => `<circle cx="${cx}" cy="40" r="9"/><path d="M${cx - 15} 84c0-11 7-19 15-19s15 8 15 19"/>`;

const BODY_OUTLINE = `<circle cx="48" cy="14" r="9"/><path d="M34 28h28l4 36H30z"/><path d="M34 30l-12 28M62 30l12 28"/><path d="M38 64l-4 26M58 64l4 26"/>`;
// The figure faces the viewer, so the person's LEFT is on the viewer's right (x > 48). Labels say "your left arm".
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
export const BODY_PARTS = Object.keys(BODY_HIGHLIGHT);

const P: Record<string, string> = {
  yes: '<path d="M20 50l18 18 38-40" stroke="var(--yes)" stroke-width="9"/>',
  no: '<path d="M24 24l48 48M72 24L24 72" stroke="var(--no)" stroke-width="9"/>',
  'not sure': '<path d="M34 34c0-9 6-15 14-15s14 6 14 14c0 10-14 12-14 24"/><circle cx="48" cy="74" r="3.5" fill="currentColor"/>',
  // the only dashed shape in the set (rule 4)
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

  // batch 1, drawn 11 Nov 2026 (evening): fixed / meta
  change: '<path d="M70 40a24 24 0 00-42-8"/><path d="M26 20v14h14"/><path d="M26 56a24 24 0 0042 8"/><path d="M70 76V62H56"/>',
  wait: '<circle cx="48" cy="50" r="32"/><path d="M48 30v20l13 9"/><path d="M40 12h16"/>',
  stop: '<path d="M34 12h28l22 22v28L62 84H34L12 62V34z"/><path d="M32 48h32" stroke="var(--accent)" stroke-width="7"/>',
  'write it': '<path d="M18 78l6-20 36-36 14 14-36 36z"/><path d="M60 22l14 14"/><path d="M24 58l14 14"/><path d="M18 88h60"/>',
  more: '<circle cx="48" cy="48" r="34"/><path d="M48 30v36M30 48h36" stroke-width="7"/>',

  // day 5, drawn 11 Nov 2026 (late): the "we're stuck" repair card
  // show me: a hand pointing at a small object
  'show me': '<path d="M28 86V54a6 6 0 0112 0v8"/><path d="M40 60V30a6 6 0 0112 0v30"/><path d="M52 62V44a6 6 0 0112 0v22"/><path d="M64 66v-8a6 6 0 0112 0v16c0 10-8 18-18 18H46c-8 0-14-5-18-12l-8-14" stroke-width="5"/><rect x="10" y="14" width="22" height="16" rx="3" stroke="var(--accent)"/>',
  // draw: a pencil leaving a wavy line
  draw: '<path d="M62 14l20 20-36 36H26V50z"/><path d="M56 20l20 20"/><path d="M14 86c8-10 14-10 22 0s14 10 22 0 14-10 22 0" stroke="var(--accent)" stroke-width="4"/>',
  // later: a clock face with an arrow coming back round
  later: '<circle cx="48" cy="52" r="30"/><path d="M48 34v18l10 7"/><path d="M78 30a34 34 0 00-10-10" stroke="var(--accent)" stroke-width="6"/><path d="M66 12l4 10-10 2" stroke="var(--accent)" stroke-width="5"/>',
  // change topic: two speech bubbles, the second one taking over
  'change topic': '<path d="M12 18h40a6 6 0 016 6v20a6 6 0 01-6 6H32l-10 8v-8h-10a6 6 0 01-6-6V24a6 6 0 016-6z"/><path d="M44 48h34a6 6 0 016 6v18a6 6 0 01-6 6h-8v8l-10-8H44a6 6 0 01-6-6V54a6 6 0 016-6z" stroke="var(--accent)"/>',

  // batch 1: feelings (faces only on the feelings scale; no gender, no skin tone)
  tired: face('<path d="M36 64h24"/>', '<path d="M28 42c4-5 10-5 14 0M54 42c4-5 10-5 14 0" stroke-width="4"/>'),
  worried: face('<path d="M33 66c5-5 10 5 15 0s10 5 15 0"/>', '<circle cx="35" cy="44" r="3" fill="currentColor"/><circle cx="61" cy="44" r="3" fill="currentColor"/><path d="M27 32l12 5M69 32l-12 5" stroke-width="4"/>'),
  pain: '<path d="M56 10L28 52h18l-6 34 28-44H52z" stroke="var(--accent)"/>',

  // batch 1: people roles (one attribute each)
  spouse: `${mid(30)}${mid(66)}<circle cx="48" cy="18" r="7" stroke="var(--accent)"/>`,
  child: `${big(30)}${low(72)}`,
  sibling: `${mid(30)}${mid(66)}`,
  grandchild: `${big(30)}${small(72)}`,
  friend: `${mid(30)}${mid(66)}<path d="M84 62l8-18" stroke="var(--accent)" stroke-width="6"/>`,
  neighbour: `${mid(28)}<path d="M54 54l18-16 18 16v28H54z"/><path d="M68 82V68h8v14"/>`,
  carer: `${big(48)}<path d="M48 80c-6-6-12-9-12-15a6 6 0 0112 0 6 6 0 0112 0c0 6-6 9-12 15z" fill="var(--accent)" stroke="none"/>`,
  nurse: `${big(48)}<path d="M48 60v20M38 70h20" stroke="var(--accent)" stroke-width="7"/>`,
  doctor: `${big(48)}<path d="M36 46v12a12 12 0 0024 0V46M48 70v4a9 9 0 0018 0"/><circle cx="66" cy="78" r="5" fill="var(--accent)" stroke="none"/>`,
  'speech therapist': `${big(40)}<path d="M62 10h24a4 4 0 014 4v16a4 4 0 01-4 4h-8l-8 8v-8h-8a4 4 0 01-4-4V14a4 4 0 014-4z" stroke="var(--accent)"/><path d="M68 22h12" stroke="var(--accent)" stroke-width="4"/>`,
  physio: `${big(44)}<path d="M66 60l14-22" stroke="var(--accent)" stroke-width="6"/><path d="M74 32l12 8" stroke="var(--accent)" stroke-width="6"/>`,
  priest: `${big(48)}<rect x="42" y="42" width="12" height="9" rx="2" fill="var(--bg)" stroke="var(--accent)"/>`,
  family: `${low(20)}${low(48)}${low(76)}`,
  visitor: `${mid(48)}<path d="M18 90V10h60v80"/>`,

  // the quick-needs board, drawn 17 Nov 2026 ('pain', 'tired' and 'something else' are above)
  // toilet: seen from the side, cistern behind, bowl and foot
  toilet: '<path d="M20 12h22v36H20z"/><path d="M20 48h58c0 15-10 26-24 26H40c-11 0-20-9-20-20z"/><path d="M38 74l-3 12h30l-3-12"/><path d="M27 24h8" stroke="var(--accent)"/>',
  // drink: a glass of water with a straw
  drink: '<path d="M26 26h44l-6 60H32z"/><path d="M29 48h38" stroke="var(--accent)"/><path d="M50 74l10-64h14" stroke-width="4"/>',
  // food: a plate between a fork and a knife
  food: '<circle cx="50" cy="50" r="22"/><circle cx="50" cy="50" r="10"/><path d="M8 16v16a6 6 0 0012 0V16M14 16v66"/><path d="M88 82V14c-6 6-8 26-4 36h4"/>',
  // too hot / too cold: the same thermometer, full with a sun or low with a snowflake
  'too hot': '<path d="M26 18a9 9 0 0118 0v38a16 16 0 11-18 0z"/><circle cx="35" cy="69" r="8" fill="var(--accent)" stroke="none"/><path d="M35 66V22" stroke="var(--accent)" stroke-width="6"/><circle cx="72" cy="34" r="8"/><path d="M72 16v4M72 48v4M54 34h4M86 34h4M59 21l3 3M82 44l3 3M85 21l-3 3M62 44l-3 3" stroke-width="4"/>',
  'too cold': '<path d="M26 18a9 9 0 0118 0v38a16 16 0 11-18 0z"/><circle cx="35" cy="69" r="8" fill="var(--accent)" stroke="none"/><path d="M35 66V56" stroke="var(--accent)" stroke-width="6"/><path d="M72 14v40M55 24l34 20M89 24L55 44" stroke-width="4"/><path d="M66 17l6 5 6-5M66 51l6-5 6 5" stroke-width="3"/>',
  // call someone: a telephone handset with two sound arcs
  'call someone': '<path d="M24 14l12-2 8 20-10 8c4 10 12 18 22 22l8-10 20 8-2 12c-1 6-6 10-12 10C40 80 16 56 14 26c0-6 4-11 10-12z"/><path d="M58 30a12 12 0 0110 10M60 16a26 26 0 0122 22" stroke="var(--accent)" stroke-width="4"/>',
};

/** The microphone on the partner's "speak your question" button. A control, not a choice picture: it is never on a card. */
export const MIC = svg('<rect x="36" y="10" width="24" height="44" rx="12"/><path d="M22 44a26 26 0 0052 0M48 70v16M34 86h28"/>', 'microphone');

/** Every bundled pictogram id (for the provenance check in tests and PICTOGRAMS.md). */
export const PICTO_IDS = [...Object.keys(P), ...BODY_PARTS.map((b) => `body:${b}`), 'monogram'];

export function builtinPicto(id: string): string {
  if (id.startsWith('body:')) {
    const part = id.slice(5);
    return svg(BODY_OUTLINE + (BODY_HIGHLIGHT[part] ?? ''), part);
  }
  return svg(P[id] ?? P['something else'], id);
}

/** A named person without a photo: their initial in a soft circle (the one place letters are allowed, rule 5). */
export function monogram(initial: string): string {
  return `<svg viewBox="0 0 96 96" role="img" aria-label="${initial}"><circle cx="48" cy="48" r="42" fill="var(--accent-soft)"/><text x="48" y="62" text-anchor="middle" font-size="42" font-family="Verdana, sans-serif" fill="currentColor">${initial}</text></svg>`;
}

/** A named person's own photo (a local data URL): round, same size as a pictogram. */
export function photoTile(dataUrl: string, name: string): string {
  return `<img class="photo" src="${dataUrl}" alt="${name}">`;
}

export const TICK = svg(P.yes, 'yes');
export const CROSS = svg(P.no, 'no');
