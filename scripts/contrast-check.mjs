// Contrast of the simple view's colours (web/src/simple.css), light and dark: every text pair at 4.5:1 or more
// (WCAG 2.2 SC 1.4.3), every control edge, sign and focus ring at 3:1 or more (SC 1.4.11). The colours are read from
// the stylesheet itself (the two token blocks under :root[data-view="simple"]), so the table cannot drift from what
// ships; the pairs below are the combinations the stylesheet uses, each with the rule that uses it.
// Exit code 0 only if every pair passes. No browser, no network.
//
// Usage: node scripts/contrast-check.mjs [--out devlog/evidence_shell/contrast.md]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', null);
const css = readFileSync('web/src/simple.css', 'utf8');

const blocks = [...css.matchAll(/:root\[data-view="simple"\]\s*\{([^}]*)\}/g)].map((m) => m[1]);
if (blocks.length !== 2) { console.error(`expected the light and the dark token block, found ${blocks.length}`); process.exit(1); }
const tokens = (b) => Object.fromEntries([...b.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2].toLowerCase()]));
const THEMES = { light: tokens(blocks[0]), dark: tokens(blocks[1]) };

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground, background, where it is used]
const TEXT = [
  ['ink', 'bg', 'body text, headings, the line to say'],
  ['ink', 'panel', 'buttons, the field, rows, the sheet'],
  ['muted', 'bg', 'sub line, tips, where the AI runs, "New question"'],
  ['muted', 'panel', 'small line in a ready question, placeholder, sheet notes'],
  ['accent', 'bg', 'links ("See how it works inside"), today\'s answers'],
  ['accent', 'panel', 'links on a panel ("Add details", "Change", sheet links)'],
  ['on-accent', 'accent', 'the main button, the step numbers, the "Simple view" pill'],
  ['ink', 'accent-soft', 'where the card was made (on this device), "they chose", quick needs, banner'],
  ['accent', 'accent-soft', 'the "Quick needs" title'],
  ['ink', 'cloud-soft', 'where the card was made (with online help)'],
  ['ink', 'warn-soft', 'where the card was made (may have left)'],
  ['warn', 'bg', 'the safety line, an error'],
  ['warn', 'panel', 'the safety line on a panel'],
  ['ink', 'line', 'a button that is off (the main button while the choices are being found)'],
  ['how-ink', 'how-bg', '"How it works: 4 steps" (the steps, the folded line) and the "Wait. Count to ten." line'],
  ['how-bg', 'how-ink', 'the step numbers in that block'],
  ['ink', 'panel', '18 Nov: "Back" and "Home" in the top bar, the line that says what to do now, a learned line, a photo\'s word'],
  ['accent', 'panel', '18 Nov: the word "Home" in the top bar'],
  ['muted', 'panel', '18 Nov: the small "Now:" over the line that says what to do'],
  ['on-accent', 'accent', '18 Nov: "Next: ..." (the tree\'s next question), the bar "A newer version is ready. Tap to update."'],
  ['ink', 'accent-soft', '18 Nov: "Usually: tea (5 of 7)"'],
  ['no', 'panel', '18 Nov: "Delete everything on this phone"'],
  ['ink', 'panel', 'phase 3: the guard\'s line, a diary entry, an insight line, the tip of the day, a log button'],
  ['muted', 'panel', 'phase 3: the time of a diary entry, its question, the base of an insight line, who worded it'],
  ['ink', 'accent-soft', 'phase 3: the selected tab of the diary (Today / Week / Month)'],
  ['ink', 'bg', 'phase 3: the day headings of the diary, the topic filter\'s label'],
  ['muted', 'bg', 'phase 3: "Nothing entered today yet.", the line on what the diary holds'],
  ['no', 'bg', 'phase 3: "Delete the diary"'],
  ['ink', 'panel', 'phase 4: "[Name] wants to say something", "Try the first letter", the line "[Name] started this", an answer on the doctor-visit page, a photo\'s word'],
  ['muted', 'panel', 'phase 4: the row name, the question and the time on the doctor-visit page, the choices under a photo question'],
  ['accent', 'panel', 'phase 4: the signs of those buttons and of the line "[Name] started this"'],
  ['warn', 'bg', 'phase 4: "If the pain is new or strong, do not wait for the visit" under the doctor-visit page'],
  ['no', 'bg', 'phase 4: "Delete these answers"'],
  // phase 5 (judge round 6: the small "Next:" label on the main button took the muted grey and stood at about 1.2:1)
  ['on-accent', 'accent', 'phase 5: the small "Next:" label on the main button (.btn.primary.ask-next small)'],
  ['panel', 'no', 'phase 5: the call button ("Call emergency services: 911", "Call 911")'],
  ['ink', 'panel', 'phase 5: the boxed line "Call 911 now if this is new or sudden", the FAST list, "Since the last visit", the Read aloud switch'],
  ['ink', 'cloud-soft', 'phase 5: the Read aloud switch when it is on'],
  ['muted', 'panel', 'phase 5: the small line of "Something new or sudden?"'],
  ];
// The "Next:" label is a <small> inside the main button. The plain rule for it is the muted grey (right on a white
// button); on the green main button it must be overridden, or it is unreadable. The rule is checked to be there.
const NEXT_RULE = /\.simple \.btn\.primary\.ask-next small \{[^}]*color: var\(--on-accent\)/;
const nextRuleOk = NEXT_RULE.test(css);
const UI = [
  ['field', 'bg', 'the edge of every button, field and row'],
  ['field', 'panel', 'the edge of a field inside a row or the sheet'],
  ['accent', 'bg', 'the edge of quick needs and of the made-where strip, the focus ring'],
  ['accent', 'accent-soft', 'the lock and tick signs'],
  ['accent', 'panel', 'the lock sign on the sheet'],
  ['cloud', 'bg', 'the edge of the made-where strip (online help)'],
  ['cloud', 'cloud-soft', 'the cloud sign in that strip'],
  ['cloud', 'panel', 'the cloud sign on the sheet'],
  ['warn', 'bg', 'the edge of the made-where strip (may have left)'],
  ['warn', 'warn-soft', 'the sign in that strip'],
  ['warn', 'panel', 'the data-use sign on the sheet'],
  ['panel', 'warn', 'the microphone sign while recording'],
  ['muted', 'panel', 'the arrow in a ready question'],
  ['ink', 'bg', 'the focus ring of the main button'],
  ['ink', 'panel', 'the focus ring on the sheet'],
  ['how-edge', 'bg', 'the edge of the how-to block, its folded line and the "wait" line'],
  ['how-ink', 'how-bg', 'the step pictures, the sign in the "wait" line, the focus ring inside the block'],
  ['accent', 'panel', 'the topic signs, the spark of the AI line and of the narrowing button'],
  ['accent', 'accent-soft', 'the sign of an open topic'],
  ['muted', 'panel', 'the "?" sign after the way out'],
  ['field', 'panel', 'the edge of the "needs internet" tag'],
  ['field', 'bg', '18 Nov: the edge of "Back" and "Home", of a photo in the list, of a learned line'],
  ['accent', 'bg', '18 Nov: the edge of the line that says what to do now'],
  ['no', 'bg', '18 Nov: the edge of "Delete everything on this phone"'],
  ['warn', 'panel', 'phase 3: the edge and the sign of the guard\'s line, the edge of a "Tell the doctor or nurse" line, of the "less sure" tag'],
  ['accent', 'panel', 'phase 3: the edge of a "Worth mentioning" line, the tick of "Logged", the signs in "what stands out"'],
  ['field', 'panel', 'phase 3: the edge of the tabs, of the timeline, of a "To keep in mind" line'],
  ['accent', 'accent-soft', 'phase 3: the bar under the selected tab'],
  ['no', 'panel', 'phase 5: the edge and the sign of the boxed call line, the edge of the way to "Something new or sudden?"'],
  ['no', 'bg', 'phase 5: the call button against the page'],
  ['cloud', 'panel', 'phase 5: the sign of the Read aloud switch'],
];
// the person's card: a white sheet in every theme (web/src/styles.css, .person)
const CARD = [
  ['#0f141a', '#ffffff', 'the person\'s screen: the instruction, the question, the choices, "No, something else"'],
  ['#4a5361', '#ffffff', 'the person\'s screen: "Carer: hold here to go back", the edge of the way out'],
  ['#0b6e4f', '#ffffff', 'the person\'s screen: "Yes" and its tick, the finish tick, the edge of "Yes"'],
  ['#ffffff', '#0b6e4f', 'the person\'s screen: "Give the phone back"'],
  ['#1f262e', '#ffffff', 'phase 5: the "Hear it again" button on the person\'s screen (Read aloud)'],
  ['#2b3440', '#ffffff', '18 Nov: the outline of every colour picture on the card and on a topic tile\'s white plate, the edge of a family photo'],
];

let bad = 0;
if (!nextRuleOk) { console.error('the "Next:" label on the main button has no rule that gives it the button\'s own text colour'); bad++; }
const lines = ['# Contrast of the simple view', '', `Read from \`web/src/simple.css\` by \`scripts/contrast-check.mjs\`. Text needs 4.5:1, a control edge or sign 3:1 (WCAG 2.2, 1.4.3 and 1.4.11).`, ''];
for (const [theme, t] of Object.entries(THEMES)) {
  lines.push(`## ${theme}`, '', '| kind | foreground | background | ratio | needs | result | used for |', '|---|---|---|---|---|---|---|');
  for (const [kind, need, pairs] of [['text', 4.5, TEXT], ['control', 3, UI]]) {
    for (const [f, b, where] of pairs) {
      if (!t[f] || !t[b]) { console.error(`${theme}: no token --${t[f] ? b : f}`); bad++; continue; }
      const r = ratio(t[f], t[b]);
      const ok = r >= need;
      if (!ok) bad++;
      lines.push(`| ${kind} | --${f} ${t[f]} | --${b} ${t[b]} | ${r.toFixed(2)}:1 | ${need}:1 | ${ok ? 'pass' : 'FAIL'} | ${where} |`);
    }
  }
  lines.push('');
}
lines.push('## the person\'s card (the same in both themes)', '', '| kind | foreground | background | ratio | needs | result | used for |', '|---|---|---|---|---|---|---|');
for (const [f, b, where] of CARD) { const r = ratio(f, b); const ok = r >= 4.5; if (!ok) bad++; lines.push(`| text | ${f} | ${b} | ${r.toFixed(2)}:1 | 4.5:1 | ${ok ? 'pass' : 'FAIL'} | ${where} |`); }
const total = lines.filter((l) => /\| (pass|FAIL) \|/.test(l)).length;
lines.push('', `${total - bad} of ${total} pairs pass.`, '', 'Not measured here: the full view (judge mode and the inner pages), which keeps the dark desk of `web/src/styles.css` and its own table (devlog/DESIGN_DIRECTIONS.md).', '');
const text = lines.join('\n');
console.log(text);
if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, text); }
process.exit(bad ? 1 : 0);
