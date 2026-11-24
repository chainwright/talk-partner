// Built-in pictures: simple, realistic colour pictures (design/IMAGES_RESEARCH_2026-11-17.md: real-object colours,
// one object per picture, plain background, light shading, no scenes; no emoji, no clip art, no 3D, no animation).
// Since 20 Nov 2026 the set is mixed (PICTOGRAMS.md has the source of every picture):
// - 91 pictures were made with Google's Gemini (gemini-3.1-flash-image, in Google AI Studio, on 20 and 22 Nov 2026,
//   generated once and bundled: no model is asked for a picture at run time) and reviewed by a person: small WebP files in
//   web/public/pictures/ (256 x 256, white background), listed in `IMAGE_IDS`. The prompt of each is in
//   devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json. They are shown as an <img> with the word as its text.
// - The rest are drawn by us as SVG on a 96 x 96 grid, in one style: a dark outline of 3 (so every picture stands out
//   on the white card whatever its fill), flat real-object colours, one lighter or darker patch for shading, round
//   joins: yes, no, the amount scale, this one / that one, change topic, okay, someone else, morning,
//   just right, something else, the body map, the monogram, and the controls. Those stayed drawn because the drawing
//   is clearer (an abstract idea, a scale) or a hand sign could offend; "something else", the way out, keeps our
//   dashed frame on every card so it never looks like a choice (the Gemini "?" was too close to "not sure").
// Our SVG drawing of an id that now has a picture is kept below: it is what shows if the picture file cannot be
// loaded (`pictoFallback`), so a tile never has an empty frame.
// The colours are written into the drawing (they are the object's own colours, not the theme's). The person's card
// is a white sheet in the light and in the dark theme, so a picture always stands on white.
// "something else" keeps the only dashed shape of the set, on the card too; unknown ids fall back to that drawing.
// Letters are allowed in the monogram only.

/** The outline of every picture: 12.6:1 on the white card. */
export const OUTLINE = '#2b3440';
const C = {
  white: '#ffffff', paper: '#f4f1ea', cream: '#fbe9c6', skin: '#e8b98f', skinShade: '#d59f73', hair: '#6b5a4c',
  red: '#d9453c', redDark: '#b3322b', orange: '#f28c28', amber: '#f2b632', yellow: '#ffd84d', green: '#2f9e5b', greenDark: '#1f7a43', leaf: '#74c365',
  blue: '#3d7fd9', blueDark: '#2c5fae', sky: '#bfe3fb', water: '#7cc4f2', navy: '#2c4a7c', violet: '#8a6fd1',
  brown: '#6b4226', coffee: '#4a2c17', tea: '#c98a3c', wood: '#b57f4a', woodDark: '#8f5f33',
  steel: '#b9c2cc', grey: '#8b97a6', greyLight: '#dfe5ec', dark: '#3a4552', black: '#1f262e', gold: '#e5b93c', pink: '#f4a3b4',
};

const svg = (body: string, label: string) =>
  `<svg viewBox="0 0 96 96" role="img" aria-label="${label}" fill="none" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

// ---------------------------------------------------------------- shared pieces
/** A face for the feelings scale: one colour per feeling, the same round head (no gender, no age). */
const face = (fill: string, mouth: string, eyes = `<circle cx="36" cy="41" r="3.5" fill="${OUTLINE}" stroke="none"/><circle cx="60" cy="41" r="3.5" fill="${OUTLINE}" stroke="none"/>`) =>
  `<circle cx="48" cy="48" r="36" fill="${fill}"/><path d="M22 34a30 30 0 0116-16" stroke="${C.white}" stroke-width="4" opacity=".55"/>${eyes}${mouth}`;
/** A person, head and shoulders: neutral head, the top in one colour (roles differ by one attribute, never by stereotype). */
const bust = (cx: number, top: string, scale = 1, cy = 30) => {
  const r = 12 * scale;
  const w = 25 * scale;
  const y = cy + r + 3;
  return `<path d="M${cx - w} 86c0-${Math.round(17 * scale)} ${Math.round(11 * scale)}-${Math.round(86 - y)} ${w}-${Math.round(86 - y)}s${w} ${Math.round(86 - y - 17 * scale)} ${w} ${Math.round(86 - y)}z" fill="${top}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.skin}"/><path d="M${cx - r + 1} ${cy - 3}a${r - 1} ${r - 1} 0 01${2 * r - 2} 0c-${Math.round(r * 0.7)}-${Math.round(r * 0.5)}-${Math.round(r * 1.3)}-${Math.round(r * 0.5)}-${2 * r - 2} 0z" fill="${C.hair}" stroke="none"/><circle cx="${cx}" cy="${cy}" r="${r}"/>`;
};
const steam = (xs: number[], y = 30) => xs.map((x) => `<path d="M${x} ${y}c-4-5 4-8 0-14" stroke="${C.grey}" stroke-width="3"/>`).join('');
const glass = (liquid: string, level = 44) => `<path d="M28 20h40l-5 64H33z" fill="${C.white}"/><path d="M${29 + (level - 20) * 0.08} ${level}h${38 - (level - 20) * 0.16}l-${(84 - level) * 0.078 + 0.5} ${84 - level - 1.5}H33.5z" fill="${liquid}" stroke="none"/><path d="M28 20h40l-5 64H33z"/><path d="M36 30l2 44" stroke="${C.white}" stroke-width="3" opacity=".7"/>`;
const mug = (body: string, drink: string) => `<path d="M68 44h6a9 9 0 010 18h-8" /><path d="M20 34h48v32a14 14 0 01-14 14H34a14 14 0 01-14-14z" fill="${body}"/><ellipse cx="44" cy="34" rx="24" ry="6" fill="${drink}"/><path d="M26 44v20" stroke="${C.white}" stroke-width="3" opacity=".5"/>`;
const clock = (hands: string) => `<circle cx="48" cy="50" r="32" fill="${C.white}"/><circle cx="48" cy="50" r="32" stroke-width="5" stroke="${C.navy}"/><path d="M48 24v4M48 72v4M22 50h4M70 50h4" stroke="${C.grey}"/>${hands}<circle cx="48" cy="50" r="3" fill="${OUTLINE}" stroke="none"/>`;
const pencil = (d: string) => `<g transform="${d}"><path d="M0 0h44l12 8-12 8H0z" fill="${C.yellow}"/><path d="M44 0l12 8-12 8z" fill="${C.cream}"/><path d="M52 5.4l4 2.6-4 2.6z" fill="${OUTLINE}"/><path d="M0 0h8v16H0z" fill="${C.pink}"/></g>`;
const bars = (n: number) =>
  [0, 1, 2, 3].map((i) => `<rect x="${12 + i * 19}" y="${68 - i * 15}" width="15" height="${16 + i * 15}" rx="3" fill="${i < n ? C.blue : C.white}"/>`).join('');
const thermometer = (fill: string, top: number) => `<path d="M24 20a10 10 0 0120 0v36a17 17 0 11-20 0z" fill="${C.white}"/><circle cx="34" cy="70" r="10" fill="${fill}" stroke="none"/><path d="M34 68V${top}" stroke="${fill}" stroke-width="8"/><path d="M24 20a10 10 0 0120 0v36a17 17 0 11-20 0z"/>`;
const sun = (cx: number, cy: number, r: number) => `<path d="${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const x = Math.cos((a * Math.PI) / 180); const y = Math.sin((a * Math.PI) / 180); return `M${(cx + x * (r + 4)).toFixed(1)} ${(cy + y * (r + 4)).toFixed(1)}L${(cx + x * (r + 9)).toFixed(1)} ${(cy + y * (r + 9)).toFixed(1)}`; }).join('')}" stroke="${C.orange}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.yellow}"/>`;
const plate = (food: string) => `<ellipse cx="48" cy="54" rx="38" ry="24" fill="${C.white}"/><ellipse cx="48" cy="52" rx="25" ry="14" fill="${C.greyLight}" stroke="${C.steel}" stroke-width="2"/>${food}`;
const house = (x: number, y: number, s: number, wall: string) => `<path d="M${x} ${y + 18 * s}l${20 * s}-${18 * s} ${20 * s} ${18 * s}v${24 * s}H${x}z" fill="${wall}"/><path d="M${x - 4 * s} ${y + 20 * s}l${24 * s}-${22 * s} ${24 * s} ${22 * s}" stroke="${C.redDark}" stroke-width="5"/><rect x="${x + 15 * s}" y="${y + 26 * s}" width="${10 * s}" height="${16 * s}" fill="${C.wood}"/>`;
const note = (x: number, y: number, fill: string) => `<path d="M${x + 10} ${y + 30}V${y}l22-6v30" stroke-width="4"/><ellipse cx="${x + 4}" cy="${y + 31}" rx="7" ry="5" fill="${fill}"/><ellipse cx="${x + 26}" cy="${y + 25}" rx="7" ry="5" fill="${fill}"/>`;

// The body figure faces the viewer for the head, the face and the front of the trunk. Phase 18 (judge round 13, the
// nurse's seat, ADV-13b-4: "your left arm" was red on the viewer's right, and a person with aphasia points at the side
// that matches his own body): the arms, the hands, the legs and the feet are drawn from BEHIND, like the back, so the
// person's left is on the viewer's left (x < 48), as it is on the person's own body. Labels say "your left arm".
const HI = C.red;
const BODY_OUTLINE = `<path d="M34 30l-12 28M62 30l12 28" stroke="${C.skinShade}" stroke-width="7"/><path d="M38 64l-4 26M58 64l4 26" stroke="${C.navy}" stroke-width="8"/><path d="M34 28h28l4 36H30z" fill="${C.sky}"/><circle cx="48" cy="14" r="9" fill="${C.skin}"/>`;
/** Phase 17: the same figure seen from behind: the back of the head (hair, no face), the spine, a turn-round arrow. */
const BODY_BEHIND = `<path d="M34 30l-12 28M62 30l12 28" stroke="${C.skinShade}" stroke-width="7"/><path d="M38 64l-4 26M58 64l4 26" stroke="${C.navy}" stroke-width="8"/><path d="M34 28h28l4 36H30z" fill="${C.sky}"/><circle cx="48" cy="14" r="9" fill="${C.hair}"/><path d="M41 9c4-3 10-3 14 0" stroke="${C.black}" stroke-width="2"/><path d="M48 31v31" stroke="${C.navy}" stroke-width="2"/><path d="M45 36h6M45 44h6M45 52h6" stroke="${C.navy}" stroke-width="2"/><path d="M76 10a9 9 0 11-9-6" stroke="${OUTLINE}" stroke-width="3"/><path d="M64 1l4 4-5 3" stroke="${OUTLINE}" stroke-width="3"/>`;
const BACK_PARTS = ['back', 'upper back', 'lower back', 'arms', 'hands', 'legs', 'feet', 'left arm', 'right arm', 'left leg', 'right leg'];
const BODY_HIGHLIGHT: Record<string, string> = {
  head: `<circle cx="48" cy="14" r="9" fill="${HI}"/>`,
  face: `<circle cx="48" cy="15" r="6.5" fill="${HI}" stroke="none"/>`,
  eyes: `<path d="M43 12h3M50 12h3" stroke="${HI}" stroke-width="4"/>`,
  mouth: `<path d="M44 18h8" stroke="${HI}" stroke-width="4"/>`,
  'top of head': `<path d="M40 10a9 9 0 0116 0" stroke="${HI}" stroke-width="5"/>`,
  ears: `<path d="M38 14v2M58 14v2" stroke="${HI}" stroke-width="5"/>`,
  neck: `<rect x="44" y="22" width="8" height="6" fill="${HI}" stroke="none"/>`,
  'left side': `<path d="M50 30h11l1 14H50z" fill="${HI}" stroke="none"/>`,
  'right side': `<path d="M35 30h11v14H34z" fill="${HI}" stroke="none"/>`,
  middle: `<path d="M44 30h8v14h-8z" fill="${HI}" stroke="none"/>`,
  'upper stomach': `<path d="M34 44h28l1 9H33z" fill="${HI}" stroke="none"/>`,
  'lower stomach': `<path d="M33 53h30l1 9H32z" fill="${HI}" stroke="none"/>`,
  chest: `<path d="M35 30h26l1 14H34z" fill="${HI}" stroke="none"/>`,
  stomach: `<path d="M34 44h28l2 18H32z" fill="${HI}" stroke="none"/>`,
  back: `<path d="M35 30h26l3 32H32z" fill="${HI}" stroke="none" opacity=".6"/><path d="M48 30v32" stroke="${HI}"/>`,
  'upper back': `<path d="M35 30h26l1 16H34z" fill="${HI}" stroke="none" opacity=".6"/><path d="M40 34h16" stroke="${HI}"/>`,
  'lower back': `<path d="M34 46h28l2 16H32z" fill="${HI}" stroke="none" opacity=".6"/><path d="M40 58h16" stroke="${HI}"/>`,
  arms: `<path d="M34 30l-12 28M62 30l12 28" stroke="${HI}" stroke-width="8"/>`,
  legs: `<path d="M38 64l-4 26M58 64l4 26" stroke="${HI}" stroke-width="9"/>`,
  hands: `<circle cx="22" cy="60" r="6" fill="${HI}" stroke="none"/><circle cx="74" cy="60" r="6" fill="${HI}" stroke="none"/>`,
  feet: `<path d="M28 90h8M60 90h8" stroke="${HI}" stroke-width="8"/>`,
  // (seen from behind: the person's left arm and leg are on the viewer's left)
  'left arm': `<path d="M34 30l-12 28" stroke="${HI}" stroke-width="9"/>`,
  'right arm': `<path d="M62 30l12 28" stroke="${HI}" stroke-width="9"/>`,
  'left leg': `<path d="M38 64l-4 26" stroke="${HI}" stroke-width="10"/>`,
  'right leg': `<path d="M58 64l4 26" stroke="${HI}" stroke-width="10"/>`,
};
export const BODY_PARTS = Object.keys(BODY_HIGHLIGHT);

const hand = `<path d="M30 84V50a5 5 0 0110 0V26a5 5 0 0110 0v-6a5 5 0 0110 0v8a5 5 0 0110 0v26l6-8a5 5 0 018 6L70 78c-3 6-8 10-16 10H40c-5 0-10-2-10-4z" fill="${C.skin}"/><path d="M40 50V40M50 44V26M60 44V28" stroke="${C.skinShade}" stroke-width="2"/>`;
const pointing = `<path d="M36 90V58a6 6 0 0112 0V30a6 6 0 0112 0v24a6 6 0 0111 2 6 6 0 0111 3v17c0 9-6 16-16 16z" fill="${C.skin}"/><path d="M60 54v10M71 58v8" stroke="${C.skinShade}" stroke-width="2"/>`;

const P: Record<string, string> = {
  yes: `<circle cx="48" cy="48" r="38" fill="${C.green}"/><path d="M28 50l14 14 27-30" stroke="${C.white}" stroke-width="9"/>`,
  no: `<circle cx="48" cy="48" r="38" fill="${C.red}"/><path d="M33 33l30 30M63 33L33 63" stroke="${C.white}" stroke-width="9"/>`,
  'not sure': `<circle cx="48" cy="48" r="38" fill="${C.amber}"/><path d="M36 38c0-8 5-13 12-13s12 5 12 12c0 9-12 10-12 20" stroke-width="7"/><circle cx="48" cy="70" r="4.5" fill="${OUTLINE}" stroke="none"/>`,
  // the only dashed shape in the set (rule 4)
  'something else': `<rect x="12" y="22" width="72" height="52" rx="12" fill="${C.paper}" stroke-dasharray="8 7"/><circle cx="32" cy="48" r="5" fill="${C.grey}" stroke="none"/><circle cx="48" cy="48" r="5" fill="${C.grey}" stroke="none"/><circle cx="64" cy="48" r="5" fill="${C.grey}" stroke="none"/>`,
  'someone else': `${bust(38, C.steel, 1.05, 32)}<circle cx="76" cy="26" r="14" fill="${C.amber}"/><path d="M71 22c0-4 2-6 5-6s5 2 5 5c0 4-5 4-5 8" stroke-width="3.5"/><circle cx="76" cy="34" r="2" fill="${OUTLINE}" stroke="none"/>`,
  'somewhere else': `<path d="M48 88S22 60 22 40a26 26 0 0152 0c0 20-26 48-26 48z" fill="${C.red}"/><circle cx="48" cy="40" r="15" fill="${C.white}"/><path d="M43 36c0-4 2-6 5-6s5 2 5 5c0 4-5 4-5 8" stroke-width="3.5"/><circle cx="48" cy="48" r="2" fill="${OUTLINE}" stroke="none"/>`,
  good: face('#8fd694', '<path d="M32 56c8 11 24 11 32 0" stroke-width="4"/>'),
  okay: face(C.yellow, '<path d="M34 62h28" stroke-width="4"/>'),
  bad: face('#f29488', '<path d="M32 68c8-10 24-10 32 0" stroke-width="4"/>'),
  tasty: `${steam([36, 48, 60], 34)}<path d="M12 46h72c0 22-14 36-36 36S12 68 12 46z" fill="${C.blue}"/><ellipse cx="48" cy="46" rx="36" ry="8" fill="${C.orange}"/><path d="M22 58c3 9 9 15 18 18" stroke="${C.white}" stroke-width="3" opacity=".5"/>`,
  plain: plate(''),
  'too salty': `<path d="M32 38h32l-4 48H36z" fill="${C.white}"/><path d="M34.5 62h27l-1.5 24H36z" fill="${C.greyLight}" stroke="none"/><path d="M32 38h32l-4 48H36z"/><path d="M32 38c0-12 6-20 16-20s16 8 16 20z" fill="${C.steel}"/><circle cx="42" cy="28" r="2" fill="${OUTLINE}" stroke="none"/><circle cx="48" cy="25" r="2" fill="${OUTLINE}" stroke="none"/><circle cx="54" cy="28" r="2" fill="${OUTLINE}" stroke="none"/><path d="M74 14l3 5M82 24l5 2M72 30l5 5" stroke="${C.grey}"/>`,
  'good idea': `<path d="M48 10a26 26 0 0115 47c-3 3-4 6-4 9H37c0-3-1-6-4-9a26 26 0 0115-47z" fill="${C.yellow}"/><path d="M34 26a16 16 0 018-8" stroke="${C.white}" stroke-width="4" opacity=".8"/><path d="M37 66h22v12a6 6 0 01-6 6H43a6 6 0 01-6-6z" fill="${C.steel}"/><path d="M37 73h22"/>`,
  'leave it': hand,
  'like them': `${bust(36, C.blue, 1.05, 32)}<path d="M76 40c-7-5-14-10-14-17a7 7 0 0114-3 7 7 0 0114 3c0 7-7 12-14 17z" fill="${C.red}"/>`,
  unhappy: `${bust(36, C.grey, 1.05, 32)}<circle cx="76" cy="26" r="14" fill="${C.sky}"/><path d="M69 31c4-5 10-5 14 0" stroke-width="3"/><circle cx="71" cy="22" r="1.8" fill="${OUTLINE}" stroke="none"/><circle cx="81" cy="22" r="1.8" fill="${OUTLINE}" stroke="none"/>`,
  'this one': `<rect x="8" y="34" width="38" height="48" rx="7" fill="${C.green}"/><rect x="56" y="42" width="30" height="40" rx="6" fill="${C.greyLight}" stroke="${C.steel}"/><path d="M84 12L56 32M56 32h13M56 32l4-12" stroke-width="5"/>`,
  'that one': `<rect x="50" y="34" width="38" height="48" rx="7" fill="${C.green}"/><rect x="10" y="42" width="30" height="40" rx="6" fill="${C.greyLight}" stroke="${C.steel}"/><path d="M12 12l28 20M40 32H27M40 32l-4-12" stroke-width="5"/>`,
  listen: `<path d="M26 40a22 22 0 0144 0c0 13-9 17-13 24-3 5-3 13-11 15-7 2-13-3-13-9" fill="${C.skin}"/><path d="M38 42a10 10 0 0120 0c0 6-6 8-7 14" stroke="${C.skinShade}"/><path d="M78 26a22 22 0 010 26M86 18a34 34 0 010 42" stroke="${C.blue}" stroke-width="4"/>`,
  tea: `<ellipse cx="46" cy="80" rx="34" ry="7" fill="${C.greyLight}"/><path d="M68 46h5a8 8 0 010 16h-7"/><path d="M18 38h52v18c0 14-11 24-26 24S18 70 18 56z" fill="${C.white}"/><ellipse cx="44" cy="38" rx="26" ry="6" fill="${C.tea}"/><path d="M50 38c0-10 10-12 14-20" stroke-width="2"/><rect x="60" y="8" width="11" height="12" rx="2" fill="${C.leaf}"/><path d="M24 48v10" stroke="${C.greyLight}" stroke-width="3"/>`,
  coffee: `${steam([36, 50], 24)}${mug(C.red, C.coffee)}`,
  // (phase 12, judge round 9: the bars read as phone signal on the pain scale) the pain scale is three faces, green
  // to red, the word under each; the bars stay for amounts of food or drink. (phase 12b, judge round 9b: the faces read
  // as angry and laughing; since then the scale shows three faces made with Gemini for this app, from calm to crying, and
  // these drawings, the fallback, have brows raised at the inner ends, no teeth and no grin)
  'pain mild': face('#cfe8a0', '<path d="M38 64h20" stroke-width="4"/>', `<circle cx="36" cy="42" r="3.5" fill="${OUTLINE}" stroke="none"/><circle cx="60" cy="42" r="3.5" fill="${OUTLINE}" stroke="none"/><path d="M29 34l10-3M67 34l-10-3" stroke-width="3"/>`),
  'pain medium': face('#f6b04a', '<path d="M34 68c8-8 20-8 28 0" stroke-width="4"/>', `<circle cx="36" cy="44" r="3.5" fill="${OUTLINE}" stroke="none"/><circle cx="60" cy="44" r="3.5" fill="${OUTLINE}" stroke="none"/><path d="M28 36l12-6M68 36l-12-6" stroke-width="4"/>`),
  'pain strong': face('#e8574a', `<path d="M34 74c4-12 24-12 28 0z" fill="${OUTLINE}"/>`, '<path d="M28 38l10 5-10 5M68 38l-10 5 10 5" stroke-width="4"/><path d="M26 32c4-1 10-3 14-7M70 32c-4-1-10-3-14-7" stroke-width="3"/>'),
  // (phase 12) the person's "I need something": the four squares of the needs button on Home, in colour
  needs: `<rect x="12" y="12" width="32" height="32" rx="7" fill="${C.blue}"/><rect x="52" y="12" width="32" height="32" rx="7" fill="${C.green}"/><rect x="12" y="52" width="32" height="32" rx="7" fill="${C.amber}"/><rect x="52" y="52" width="32" height="32" rx="7" fill="${C.red}"/>`,
  // (phase 12) the person's "I feel…": three small faces, glad, so-so and low, so it never opens on one answer
  feelings: `<circle cx="18" cy="48" r="14" fill="#8fd694"/><path d="M11 52c4 5 10 5 14 0" stroke-width="3"/><circle cx="48" cy="48" r="14" fill="${C.yellow}"/><path d="M41 54h14" stroke-width="3"/><circle cx="78" cy="48" r="14" fill="#f29488"/><path d="M71 56c4-5 10-5 14 0" stroke-width="3"/><path d="M13 44h1M23 44h1M43 44h1M53 44h1M73 44h1M83 44h1" stroke-width="4"/>`,
  'a little': bars(1),
  some: bars(2),
  'a lot': bars(4),
  change: `<path d="M72 40a26 26 0 00-46-9" stroke="${C.blue}" stroke-width="7"/><path d="M22 16v18h18z" fill="${C.blue}" stroke="${C.blue}"/><path d="M24 56a26 26 0 0046 9" stroke="${C.green}" stroke-width="7"/><path d="M74 80V62H56z" fill="${C.green}" stroke="${C.green}"/>`,
  wait: clock(`<path d="M48 30v20l13 9" stroke-width="4"/><path d="M40 10h16" stroke="${C.navy}" stroke-width="5"/>`),
  stop: `<path d="M33 10h30l23 23v30L63 86H33L10 63V33z" fill="${C.red}"/><path d="M30 48h36" stroke="${C.white}" stroke-width="9"/>`,
  'write it': `<path d="M12 84h66" stroke="${C.blue}" stroke-width="4"/>${pencil('translate(22 66) rotate(-45)')}`,
  more: `<circle cx="48" cy="48" r="36" fill="${C.green}"/><path d="M48 28v40M28 48h40" stroke="${C.white}" stroke-width="9"/>`,
  'show me': `<rect x="52" y="6" width="24" height="18" rx="4" fill="${C.blue}"/><g transform="translate(-6 0)">${pointing}</g>`,
  draw: `<path d="M10 84c8-10 14-10 22 0s14 10 22 0 14-10 24-2" stroke="${C.violet}" stroke-width="5"/>${pencil('translate(30 54) rotate(-45)')}`,
  later: clock(`<path d="M48 32v18l11 7" stroke-width="4"/>`) + `<path d="M84 34a40 40 0 00-12-16" stroke="${C.orange}" stroke-width="6"/><path d="M66 8l6 11-12 3z" fill="${C.orange}" stroke="${C.orange}"/>`,
  'change topic': `<path d="M12 14h40a7 7 0 017 7v20a7 7 0 01-7 7H34l-11 9v-9H12a7 7 0 01-7-7V21a7 7 0 017-7z" fill="${C.greyLight}"/><path d="M44 44h36a7 7 0 017 7v20a7 7 0 01-7 7h-7v9l-11-9H44a7 7 0 01-7-7V51a7 7 0 017-7z" fill="${C.blue}"/><path d="M48 58h28M48 66h18" stroke="${C.white}"/>`,
  tired: face(C.sky, '<ellipse cx="48" cy="64" rx="6" ry="5" fill="#2b3440" stroke="none"/>', '<path d="M28 42c4 4 10 4 14 0M54 42c4 4 10 4 14 0" stroke-width="4"/>') + `<path d="M70 12h10l-10 10h10" stroke="${C.navy}" stroke-width="3"/>`,
  worried: face('#f6d08a', '<path d="M34 66c5-5 9 4 14 0s9 4 14 0" stroke-width="4"/>', `<circle cx="36" cy="44" r="3.5" fill="${OUTLINE}" stroke="none"/><circle cx="60" cy="44" r="3.5" fill="${OUTLINE}" stroke="none"/><path d="M27 34l12-5M69 34l-12-5" stroke-width="4"/>`),
  // (18 Nov, phase 5) the ninth tile of the needs board, and the two new diary logs
  "something's wrong": `<path d="M48 10L88 80H8z" fill="${C.amber}"/><path d="M48 22L74 70" stroke="${C.white}" stroke-width="3" opacity=".45"/><path d="M48 36v22" stroke="${OUTLINE}" stroke-width="7"/><circle cx="48" cy="69" r="4.5" fill="${OUTLINE}" stroke="none"/>`,
  fall: `<path d="M8 84h80" stroke="${C.grey}" stroke-width="4"/><circle cx="24" cy="56" r="10" fill="${C.skin}"/><path d="M34 62l26 8-2 12H34z" fill="${C.blue}"/><path d="M58 72l22 2M58 80l20 4" stroke-width="5"/><path d="M40 62l14-14" stroke-width="5"/><path d="M66 20l-8 12M78 26l-10 10M54 14l-4 12" stroke="${C.red}" stroke-width="4"/>`,
  tablets: `<rect x="12" y="26" width="46" height="22" rx="11" fill="${C.white}" transform="rotate(-24 35 37)"/><path d="M30 24l10 24" transform="rotate(-24 35 37)"/><circle cx="64" cy="64" r="16" fill="${C.sky}"/><path d="M52 64h24"/><path d="M56 56a10 10 0 018-5" stroke="${C.white}" stroke-width="3" opacity=".7"/>`,
  pain: `<path d="M56 6L24 52h20l-8 38 36-50H52z" fill="${C.red}"/><path d="M50 18L34 44" stroke="${C.white}" stroke-width="3" opacity=".5"/>`,

  // people: head and shoulders, one attribute each
  spouse: `${bust(30, C.blue, 0.8, 40)}${bust(66, C.green, 0.8, 40)}<circle cx="48" cy="16" r="9" stroke="${C.gold}" stroke-width="5"/>`,
  child: `${bust(30, C.blue, 0.95, 30)}${bust(70, C.orange, 0.72, 44)}`,
  sibling: `${bust(30, C.violet, 0.8, 38)}${bust(66, C.orange, 0.8, 38)}`,
  grandchild: `${bust(32, C.blue, 0.95, 30)}${bust(72, C.yellow, 0.55, 56)}`,
  friend: `<path d="M80 50l9-22" stroke="${C.skin}" stroke-width="7"/><circle cx="90" cy="24" r="5" fill="${C.skin}"/>${bust(30, C.green, 0.8, 38)}${bust(64, C.orange, 0.8, 38)}`,
  neighbour: `${house(46, 30, 1.1, C.cream)}${bust(26, C.blue, 0.75, 44)}`,
  carer: `${bust(48, C.green, 1.2, 30)}<path d="M48 82c-8-6-13-10-13-16a6.5 6.5 0 0113-2 6.5 6.5 0 0113 2c0 6-5 10-13 16z" fill="${C.white}"/>`,
  nurse: `${bust(48, C.water, 1.2, 30)}<path d="M48 58v20M38 68h20" stroke="${C.red}" stroke-width="7"/>`,
  doctor: `${bust(48, C.white, 1.2, 30)}<path d="M36 50v10a12 12 0 0024 0V50" stroke="${C.dark}"/><path d="M48 72v2a9 9 0 0018 0" stroke="${C.dark}"/><circle cx="66" cy="70" r="5" fill="${C.steel}"/>`,
  'speech therapist': `${bust(36, C.violet, 1.05, 34)}<path d="M58 6h28a5 5 0 015 5v18a5 5 0 01-5 5h-9l-9 8v-8h-1a5 5 0 01-5-5V11a5 5 0 015-5z" fill="${C.white}"/><path d="M63 16h18M63 24h12" stroke="${C.blue}"/>`,
  physio: `<path d="M64 60l16-26" stroke="${C.skin}" stroke-width="8"/><path d="M70 28h22" stroke-width="6" stroke="${C.dark}"/><rect x="66" y="22" width="6" height="12" rx="2" fill="${C.dark}"/><rect x="88" y="22" width="6" height="12" rx="2" fill="${C.dark}"/>${bust(40, C.orange, 1.1, 32)}`,
  priest: `${bust(48, C.black, 1.2, 30)}<rect x="41" y="45" width="14" height="8" rx="2" fill="${C.white}"/>`,
  family: `${bust(20, C.blue, 0.62, 42)}${bust(76, C.green, 0.62, 42)}${bust(48, C.orange, 0.7, 46)}`,
  visitor: `<path d="M16 90V8h64v82" fill="${C.wood}"/><path d="M26 90V18h44v72z" fill="${C.sky}"/>${bust(48, C.blue, 0.8, 46)}`,

  // the quick-needs board
  toilet: `<rect x="18" y="8" width="26" height="40" rx="5" fill="${C.white}"/><path d="M26 20h10" stroke="${C.steel}" stroke-width="4"/><path d="M36 76l-3 14h34l-3-14z" fill="${C.greyLight}"/><path d="M18 48h64c0 17-11 28-26 28H42c-13 0-24-10-24-22z" fill="${C.white}"/><path d="M18 48h66" stroke-width="6" stroke="${C.steel}"/><path d="M18 48h66"/>`,
  drink: `${glass(C.water, 40)}<path d="M52 78L64 8h14" stroke="${C.red}" stroke-width="5"/>`,
  food: `${plate(`<path d="M34 54c0-8 6-12 12-10 3-5 14-4 15 3 6 1 6 9-1 10H38c-3 0-4-1-4-3z" fill="${C.leaf}"/><circle cx="54" cy="50" r="6" fill="${C.red}"/>`)}<path d="M6 16v14a5 5 0 0010 0V16M11 16v66" /><path d="M90 82V14c-6 6-8 26-4 36h4"/>`,
  'too hot': `${thermometer(C.red, 24)}${sun(72, 34, 9)}`,
  'too cold': `${thermometer(C.blue, 56)}<path d="M72 14v40M55 24l34 20M89 24L55 44" stroke="${C.blue}" stroke-width="4"/><path d="M66 17l6 5 6-5M66 51l6-5 6 5" stroke="${C.blue}"/>`,
  'call someone': `<path d="M22 12l14-3 9 22-11 8c4 10 12 18 22 22l8-11 22 9-3 14c-1 6-7 10-13 9C40 80 14 54 12 24c0-6 4-11 10-12z" fill="${C.green}"/><path d="M58 30a12 12 0 0110 10M60 14a28 28 0 0124 24" stroke="${C.blue}" stroke-width="4"/>`,

  // batch 2, drawn 18 Nov 2026: what the topic questions and their trees offer
  water: glass(C.water, 38),
  juice: `${glass(C.orange, 38)}<circle cx="70" cy="22" r="13" fill="${C.amber}"/><path d="M70 9v26M57 22h26M61 13l18 18M79 13L61 31" stroke="${C.white}" stroke-width="2"/><circle cx="70" cy="22" r="13"/>`,
  milk: `<path d="M34 30v-8h28v8l8 12v40a4 4 0 01-4 4H30a4 4 0 01-4-4V42z" fill="${C.white}"/><rect x="34" y="12" width="28" height="10" rx="3" fill="${C.blue}"/><path d="M26 50h44v20H26z" fill="${C.sky}" stroke="none"/><path d="M34 30v-8h28v8l8 12v40a4 4 0 01-4 4H30a4 4 0 01-4-4V42z"/>`,
  'hot drink': `${steam([34, 46, 58], 24)}${mug(C.orange, C.brown)}`,
  'cold drink': `${glass(C.sky, 34)}<rect x="38" y="40" width="13" height="13" rx="3" fill="${C.white}" transform="rotate(-12 44 46)"/><rect x="47" y="56" width="13" height="13" rx="3" fill="${C.white}" transform="rotate(14 53 62)"/><path d="M54 80L66 8h12" stroke="${C.blue}" stroke-width="5"/>`,
  snack: `<path d="M14 62h68l-6 22H20z" fill="${C.blue}"/><circle cx="34" cy="50" r="14" fill="${C.wood}"/><circle cx="60" cy="48" r="15" fill="${C.wood}"/><circle cx="30" cy="46" r="2.2" fill="${C.coffee}" stroke="none"/><circle cx="38" cy="54" r="2.2" fill="${C.coffee}" stroke="none"/><circle cx="56" cy="44" r="2.2" fill="${C.coffee}" stroke="none"/><circle cx="65" cy="52" r="2.2" fill="${C.coffee}" stroke="none"/><path d="M14 62h68l-6 22H20z" fill="${C.blue}"/>`,
  meal: `${plate(`<path d="M30 52c2-9 12-12 20-9 8 3 10 12 2 15s-24 2-22-6z" fill="${C.wood}"/><circle cx="62" cy="46" r="5" fill="${C.green}"/><circle cx="66" cy="55" r="5" fill="${C.green}"/><circle cx="56" cy="58" r="4" fill="${C.orange}"/>`)}${steam([40, 54], 26)}`,
  'something sweet': `<path d="M12 80h72" stroke="${C.steel}" stroke-width="5"/><path d="M16 76V46l52-16 12 14v32z" fill="${C.cream}"/><path d="M16 46l52-16 12 14-52 14z" fill="${C.pink}"/><path d="M16 60l12 2 52-16" stroke="${C.wood}"/><circle cx="46" cy="30" r="7" fill="${C.red}"/><path d="M46 23c2-6 6-8 10-8" stroke="${C.greenDark}"/>`,
  'something savoury': `<path d="M10 70l38-46 38 46z" fill="${C.wood}"/><path d="M16 68l32-39 32 39z" fill="${C.cream}"/><path d="M14 62h68" stroke="${C.leaf}" stroke-width="6"/><path d="M18 68h60" stroke="${C.red}" stroke-width="5"/><path d="M10 70l38-46 38 46z"/><path d="M12 78h72" stroke="${C.woodDark}" stroke-width="6"/>`,
  'hot meal': `${steam([34, 48, 62], 26)}<path d="M10 44h76c0 24-15 38-38 38S10 68 10 44z" fill="${C.white}"/><ellipse cx="48" cy="44" rx="38" ry="9" fill="${C.wood}"/><circle cx="38" cy="43" r="4" fill="${C.orange}" stroke="none"/><circle cx="56" cy="45" r="4" fill="${C.green}" stroke="none"/><path d="M10 44h76c0 24-15 38-38 38S10 68 10 44z"/>`,
  'cold meal': `${plate(`<path d="M30 58l18-22 18 22z" fill="${C.cream}"/><path d="M33 54h30" stroke="${C.leaf}" stroke-width="4"/><path d="M30 58h36" stroke="${C.red}" stroke-width="3"/><path d="M30 58l18-22 18 22z"/>`)}`,
  bed: `<path d="M8 84V30M88 84V56" stroke="${C.woodDark}" stroke-width="6"/><rect x="8" y="52" width="80" height="18" rx="4" fill="${C.blue}"/><rect x="12" y="40" width="26" height="14" rx="6" fill="${C.white}"/><path d="M8 70h80" stroke="${C.woodDark}" stroke-width="6"/>`,
  chair: `<path d="M24 86V70M72 86V70" stroke="${C.woodDark}" stroke-width="6"/><path d="M28 14h40a6 6 0 016 6v36H22V20a6 6 0 016-6z" fill="${C.green}"/><rect x="10" y="40" width="14" height="32" rx="6" fill="${C.greenDark}"/><rect x="72" y="40" width="14" height="32" rx="6" fill="${C.greenDark}"/><rect x="22" y="52" width="52" height="20" rx="5" fill="${C.leaf}"/>`,
  tv: `<path d="M34 88h28M48 76v12" stroke-width="5"/><rect x="8" y="16" width="80" height="58" rx="7" fill="${C.dark}"/><rect x="15" y="23" width="66" height="44" rx="3" fill="${C.sky}"/><path d="M15 55l18-16 14 12 12-8 22 16v8H15z" fill="${C.leaf}" stroke="none"/><circle cx="66" cy="34" r="6" fill="${C.yellow}" stroke="none"/>`,
  music: `${note(22, 26, C.violet)}${note(52, 40, C.blue)}`,
  news: `<path d="M12 16h60v64a6 6 0 01-6 6H18a6 6 0 01-6-6z" fill="${C.white}"/><path d="M72 34h12v44a8 8 0 01-16 0" fill="${C.greyLight}"/><rect x="20" y="26" width="44" height="10" fill="${C.dark}" stroke="none"/><rect x="20" y="44" width="20" height="16" fill="${C.blue}" stroke="none"/><path d="M46 46h18M46 54h18M20 68h44M20 76h30" stroke="${C.grey}"/>`,
  film: `<rect x="10" y="38" width="76" height="46" rx="5" fill="${C.dark}"/><path d="M10 38l74-20 3 12-74 20z" fill="${C.white}"/><path d="M22 35l8 10M40 30l8 10M58 25l8 10M76 20l6 9" stroke-width="5"/><path d="M42 52v20l18-10z" fill="${C.white}"/>`,
  radio: `<path d="M22 30l44-18" stroke-width="4"/><rect x="8" y="30" width="80" height="52" rx="8" fill="${C.wood}"/><circle cx="32" cy="56" r="15" fill="${C.dark}"/><circle cx="32" cy="56" r="6" fill="${C.steel}"/><rect x="54" y="42" width="26" height="10" rx="2" fill="${C.cream}"/><circle cx="60" cy="68" r="5" fill="${C.cream}"/><circle cx="76" cy="68" r="5" fill="${C.cream}"/>`,
  paper: `<path d="M10 22l34 8 42-8v52l-42 8-34-8z" fill="${C.white}"/><path d="M44 30v52"/><path d="M17 34l20 5M17 44l20 5M17 54l20 5M17 64l20 5M52 39l26-5M52 49l26-5M52 59l26-5M52 69l18-4" stroke="${C.grey}"/>`,
  photos: `<rect x="22" y="12" width="60" height="48" rx="4" fill="${C.white}" transform="rotate(8 52 36)"/><rect x="10" y="30" width="64" height="54" rx="4" fill="${C.white}"/><rect x="16" y="36" width="52" height="34" fill="${C.sky}" stroke="none"/><path d="M16 62l14-12 12 9 10-6 16 11v6H16z" fill="${C.leaf}" stroke="none"/><circle cx="56" cy="46" r="5" fill="${C.yellow}" stroke="none"/>`,
  now: clock(`<path d="M48 28v22" stroke-width="4"/><path d="M48 50h14" stroke-width="4"/>`) + `<circle cx="78" cy="20" r="13" fill="${C.green}"/><path d="M72 20l5 5 8-9" stroke="${C.white}" stroke-width="4"/>`,
  morning: `<path d="M6 70h84" stroke="${C.blueDark}" stroke-width="5"/><path d="M22 70a26 26 0 0152 0z" fill="${C.yellow}"/><path d="M48 22v12M16 40l9 9M80 40l-9 9M6 60h10M80 60h10" stroke="${C.orange}" stroke-width="5"/><path d="M48 90V78M40 84l8-8 8 8" stroke="${C.orange}" stroke-width="4"/>`,
  afternoon: `${sun(48, 40, 18)}<path d="M6 82h84" stroke="${C.blueDark}" stroke-width="5"/>`,
  'stay in': `${house(12, 16, 1.8, C.cream)}<rect x="24" y="52" width="14" height="14" fill="${C.sky}"/><rect x="58" y="52" width="14" height="14" fill="${C.sky}"/>`,
  'go out': `<path d="M10 90V10h44v80" fill="${C.woodDark}"/><path d="M18 90V18h30l-10 8v64z" fill="${C.sky}"/><path d="M38 26l10-8v72H38z" fill="${C.wood}"/><path d="M56 54h30M74 42l12 12-12 12" stroke="${C.green}" stroke-width="7"/>`,
  open: `<rect x="14" y="16" width="68" height="64" fill="${C.sky}"/><circle cx="58" cy="36" r="8" fill="${C.yellow}" stroke="none"/><path d="M14 80l20-18 14 10 12-8 22 16z" fill="${C.leaf}" stroke="none"/><path d="M48 16v64M14 48h68" stroke="${C.white}"/><rect x="14" y="16" width="68" height="64"/><path d="M8 12h80" stroke-width="5" stroke="${C.woodDark}"/><path d="M12 14c0 26 0 46 10 70H10V14zM84 14c0 26 0 46-10 70h12V14z" fill="${C.red}"/>`,
  closed: `<path d="M8 12h80" stroke-width="5" stroke="${C.woodDark}"/><path d="M10 14h38v70H10zM48 14h38v70H48z" fill="${C.red}"/><path d="M20 16v66M30 16v66M40 16v66M58 16v66M68 16v66M78 16v66" stroke="${C.redDark}"/>`,
  glasses: `<path d="M8 40l8-14M88 40l-8-14" /><circle cx="28" cy="54" r="16" fill="${C.sky}"/><circle cx="68" cy="54" r="16" fill="${C.sky}"/><path d="M44 52c2-4 6-4 8 0" /><path d="M20 48l8-8M60 48l8-8" stroke="${C.white}" stroke-width="3"/><circle cx="28" cy="54" r="16" stroke-width="4"/><circle cx="68" cy="54" r="16" stroke-width="4"/>`,
  'hearing aid': `<path d="M30 44a20 20 0 0140 0c0 12-8 15-12 22-3 5-3 12-10 14-6 2-12-3-12-8" fill="${C.skin}"/><path d="M42 46a8 8 0 0116 0c0 5-5 7-6 12" stroke="${C.skinShade}"/><path d="M26 30c-6 10-6 34 6 44 5 4 10 0 7-6-6-10-7-24-3-36 2-6-6-9-10-2z" fill="${C.wood}"/><path d="M36 38c4-6 10-6 12 2" stroke="${C.steel}" stroke-width="2.5"/>`,
  company: `${bust(30, C.blue, 0.85, 38)}${bust(66, C.orange, 0.85, 38)}<path d="M48 22c-5-4-8-6-8-10a4 4 0 018-1 4 4 0 018 1c0 4-3 6-8 10z" fill="${C.red}"/>`,
  'time alone': `<path d="M20 88V72M76 88V72" stroke="${C.woodDark}" stroke-width="6"/><path d="M24 30h48a6 6 0 016 6v38H18V36a6 6 0 016-6z" fill="${C.violet}"/>${bust(48, C.blue, 0.8, 36)}<rect x="8" y="56" width="14" height="22" rx="6" fill="${C.violet}"/><rect x="74" y="56" width="14" height="22" rx="6" fill="${C.violet}"/>`,
  walk: `<path d="M6 86h84" stroke="${C.leaf}" stroke-width="5"/><path d="M40 82l8-24 12 24" stroke="${C.navy}" stroke-width="8"/><path d="M44 34l-10 14M54 36l12 10" stroke="${C.skin}" stroke-width="6"/><path d="M40 30h16l-2 30H42z" fill="${C.orange}"/><circle cx="48" cy="18" r="9" fill="${C.skin}"/>`,
  // (phase 12, 22 Nov 2026) the curtain question and the church: the drawings stand behind the pictures made with Gemini
  'curtains open': `<rect x="14" y="16" width="68" height="64" fill="${C.sky}"/><path d="M14 80l20-18 14 10 12-8 22 16z" fill="${C.leaf}" stroke="none"/><path d="M48 16v64M14 48h68" stroke="${C.white}"/><rect x="14" y="16" width="68" height="64"/><path d="M8 12h80" stroke-width="5" stroke="${C.woodDark}"/><path d="M12 14c0 26 0 46 10 70H10V14zM84 14c0 26 0 46-10 70h12V14z" fill="${C.blue}"/>`,
  'curtains closed': `<path d="M8 12h80" stroke-width="5" stroke="${C.woodDark}"/><path d="M10 14h38v70H10zM48 14h38v70H48z" fill="${C.navy}"/><path d="M20 16v66M30 16v66M40 16v66M58 16v66M68 16v66M78 16v66" stroke="${C.blueDark}"/><path d="M6 86h84" stroke="${C.grey}" stroke-width="4"/>`,
  church: `<path d="M10 86h76" stroke="${C.grey}" stroke-width="4"/><path d="M16 52l22-18 22 18v34H16z" fill="${C.greyLight}"/><path d="M12 54l26-22 26 22" stroke="${C.redDark}" stroke-width="5"/><path d="M60 38h18v48H60z" fill="${C.steel}"/><path d="M57 40l12-16 12 16z" fill="${C.redDark}"/><path d="M69 8v14M63 13h12" stroke-width="3"/><path d="M32 86V68a6 6 0 0112 0v18z" fill="${C.wood}"/><circle cx="69" cy="52" r="4" fill="${C.sky}"/>`,
  garden: `<path d="M4 84h88" stroke="${C.woodDark}" stroke-width="5"/><path d="M48 84V46" stroke="${C.greenDark}" stroke-width="5"/><path d="M48 66c-14 0-18-8-18-14 10 0 18 4 18 14zM48 60c12 0 16-8 16-14-10 0-16 6-16 14z" fill="${C.leaf}"/><circle cx="48" cy="22" r="7" fill="${C.yellow}"/><circle cx="34" cy="26" r="8" fill="${C.red}"/><circle cx="62" cy="26" r="8" fill="${C.red}"/><circle cx="40" cy="38" r="8" fill="${C.red}"/><circle cx="56" cy="38" r="8" fill="${C.red}"/><circle cx="48" cy="14" r="8" fill="${C.red}"/><circle cx="48" cy="28" r="7" fill="${C.yellow}"/>`,
  drive: `<path d="M6 80h84" stroke="${C.grey}" stroke-width="4"/><path d="M8 62c0-8 4-12 12-12l8-18h34l12 18c8 0 14 4 14 12v8H8z" fill="${C.blue}"/><path d="M32 36h14v14H26zM52 36h8l9 14H52z" fill="${C.sky}"/><circle cx="28" cy="72" r="9" fill="${C.dark}"/><circle cx="70" cy="72" r="9" fill="${C.dark}"/><circle cx="28" cy="72" r="3" fill="${C.steel}" stroke="none"/><circle cx="70" cy="72" r="3" fill="${C.steel}" stroke="none"/>`,
  wash: `<path d="M12 44h72v14c0 14-11 24-26 24H38c-15 0-26-10-26-24z" fill="${C.white}"/><path d="M14 46h68v6H14z" fill="${C.water}" stroke="none"/><path d="M12 44h72v14c0 14-11 24-26 24H38c-15 0-26-10-26-24z"/><path d="M66 44V22a8 8 0 0116 0" stroke="${C.steel}" stroke-width="5"/><circle cx="30" cy="30" r="6" fill="${C.sky}"/><circle cx="44" cy="22" r="5" fill="${C.sky}"/><circle cx="50" cy="34" r="4" fill="${C.sky}"/>`,
  exercises: `<path d="M22 48h52" stroke-width="6" stroke="${C.steel}"/><rect x="10" y="30" width="12" height="36" rx="4" fill="${C.dark}"/><rect x="74" y="30" width="12" height="36" rx="4" fill="${C.dark}"/><rect x="2" y="38" width="8" height="20" rx="3" fill="${C.grey}"/><rect x="86" y="38" width="8" height="20" rx="3" fill="${C.grey}"/>`,
  // plans: a calendar page (the "Today & plans" topic)
  plans: `<rect x="12" y="20" width="72" height="66" rx="8" fill="${C.white}"/><path d="M12 28a8 8 0 018-8h56a8 8 0 018 8v12H12z" fill="${C.red}"/><path d="M30 10v18M66 10v18" stroke-width="5"/><rect x="24" y="50" width="12" height="10" rx="2" fill="${C.greyLight}" stroke="none"/><rect x="42" y="50" width="12" height="10" rx="2" fill="${C.green}" stroke="none"/><rect x="60" y="50" width="12" height="10" rx="2" fill="${C.greyLight}" stroke="none"/><rect x="24" y="66" width="12" height="10" rx="2" fill="${C.greyLight}" stroke="none"/><rect x="42" y="66" width="12" height="10" rx="2" fill="${C.greyLight}" stroke="none"/>`,
  quiet: `<path d="M12 36h16l22-18v60L28 60H12z" fill="${C.grey}"/><path d="M62 38l22 20M84 38L62 58" stroke="${C.red}" stroke-width="6"/>`,
  'just right': `${thermometer(C.green, 40)}<circle cx="72" cy="36" r="15" fill="${C.green}"/><path d="M65 36l5 6 9-11" stroke="${C.white}" stroke-width="5"/>`,
};

/** The microphone on the partner's "speak your question" button. A control, not a choice picture: it is never on a card. */
const control = (body: string, label: string) => `<svg viewBox="0 0 96 96" role="img" aria-label="${label}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const MIC = control('<rect x="36" y="10" width="24" height="44" rx="12"/><path d="M22 44a26 26 0 0052 0M48 70v16M34 86h28"/>', 'microphone');

/** The same button while it records: a square, the usual sign for "stop". */
export const MIC_STOP = control('<rect x="28" y="28" width="40" height="40" rx="6" fill="currentColor"/>', 'stop recording');

/** Every bundled picture id (for the provenance check in tests and PICTOGRAMS.md). */
export const PICTO_IDS = [...Object.keys(P), ...BODY_PARTS.map((b) => `body:${b}`), 'monogram'];

/**
 * The ids shown as a picture made with Gemini (20 Nov 2026; 16 made again or added on 22 Nov), the same list as
 * devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json (tests/unit/pictures.test.ts checks both, and the files).
 */
export const IMAGE_IDS: readonly string[] = ['not sure', 'somewhere else', 'good', 'bad', 'tasty', 'plain', 'too salty', 'good idea', 'leave it', 'like them', 'unhappy', 'listen', 'tea', 'coffee', 'change', 'wait', 'stop', 'write it', 'more', 'draw', 'later', 'tired', 'worried', "something's wrong", 'fall', 'tablets', 'pain',
  'spouse', 'child', 'sibling', 'grandchild', 'friend', 'neighbour', 'carer', 'nurse', 'doctor', 'speech therapist', 'physio', 'priest', 'family', 'visitor', 'toilet', 'drink', 'food', 'too hot', 'too cold', 'call someone', 'water', 'juice', 'milk', 'hot drink', 'cold drink', 'snack', 'meal', 'something sweet', 'something savoury',
  'hot meal', 'cold meal', 'bed', 'chair', 'tv', 'music', 'news', 'film', 'radio', 'paper', 'photos', 'now', 'afternoon', 'stay in', 'go out', 'open', 'closed', 'glasses', 'hearing aid', 'company', 'time alone', 'walk', 'garden', 'drive', 'wash', 'exercises', 'plans', 'quiet',
  // (phase 12, 22 Nov 2026)
  'curtains open', 'curtains closed', 'church',
  // (phase 12b, 22 Nov 2026: the pain scale's three faces; show me, an angled finger with the thumb visible)
  'pain mild', 'pain medium', 'pain strong', 'show me'];
const IMAGES = new Set(IMAGE_IDS);
/** The file of a picture, as the manifest names it: the id with every run of other characters made "_". */
export const imageFile = (id: string) => `pictures/${id.replace(/[^a-z0-9]+/g, '_')}.webp`;

/** Our SVG drawing of an id (body parts too); an unknown id gets the way out, "something else". */
export function svgPicto(id: string): string {
  if (id.startsWith('body:')) {
    const part = id.slice(5);
    // (phase 17, judge round 12, seat 02n, ADV-02n-4: "back" read as the chest) the back is drawn from behind: hair over the
    // whole head, no face, the spine down the middle, and a small arrow that turns round; (phase 18) the limbs too
    return svg((BACK_PARTS.includes(part) ? BODY_BEHIND : BODY_OUTLINE) + (BODY_HIGHLIGHT[part] ?? ''), part);
  }
  return svg(P[id] ?? P['something else'], id);
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * The picture of a choice: the picture made with Gemini where there is one, our SVG otherwise. The <img> has the
 * word as its text, its size written in (so nothing moves while it loads; CSS sets the same box as for the SVG), and
 * is decoded off the main thread. A family's own photo is chosen before this (web/src/main.ts, `picture`).
 */
export function builtinPicto(id: string): string {
  if (!IMAGES.has(id)) return svgPicto(id);
  return `<img class="pic" src="/${imageFile(id)}" alt="${attr(id)}" data-id="${attr(id)}" width="96" height="96" decoding="async" draggable="false">`;
}

/** The same picture as decoration (next to its word, so hidden from a screen reader): the topic tiles, the diary. */
export function decoPicto(id: string): string {
  const p = builtinPicto(id);
  return p.startsWith('<img')
    ? p.replace('class="pic"', 'class="pic tp"').replace(/alt="[^"]*"/, 'alt="" aria-hidden="true"')
    : p.replace(/role="img" aria-label="[^"]*"/, 'class="tp" aria-hidden="true" focusable="false"');
}

/**
 * A picture file that could not be loaded is swapped for our SVG drawing of the same id (web/src/main.ts listens for
 * the error), so a tile never shows a broken image. Returns the markup to put in its place.
 */
export function pictoFallback(id: string, decorative: boolean): string {
  const s = svgPicto(id);
  return decorative ? s.replace(/role="img" aria-label="[^"]*"/, 'class="tp" aria-hidden="true" focusable="false"') : s;
}

/** A named person without a photo: their initial in a soft circle (the one place letters are allowed, rule 5). */
export function monogram(initial: string): string {
  return `<svg viewBox="0 0 96 96" role="img" aria-label="${initial}"><circle cx="48" cy="48" r="42" fill="#d5f5ea" stroke="${OUTLINE}" stroke-width="3"/><text x="48" y="62" text-anchor="middle" font-size="42" font-family="Verdana, sans-serif" fill="#0f141a">${initial}</text></svg>`;
}

/** A named person's own photo (a local data URL): round, same size as a pictogram. */
export function photoTile(dataUrl: string, name: string): string {
  return `<img class="photo" src="${dataUrl}" alt="${name}">`;
}

/** The tick and the cross of the full view's check ("Yes" / "Change"): controls, drawn in the theme's own colours. */
export const TICK = control('<path d="M20 50l18 18 38-40" stroke="var(--yes)" stroke-width="9"/>', 'yes');
export const CROSS = control('<path d="M24 24l48 48M72 24L24 72" stroke="var(--no)" stroke-width="9"/>', 'no');
