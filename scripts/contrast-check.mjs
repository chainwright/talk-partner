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
  ['ink', 'line', 'a button that is off ("Make a card" while a card is being made)'],
];
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
];
// the person's card: a white sheet in every theme (web/src/styles.css, .person)
const CARD = [['#0f141a', '#ffffff', 'card ink on the card'], ['#4a5361', '#ffffff', 'card muted ("something else") on the card']];

let bad = 0;
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
