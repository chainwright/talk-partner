// The quick-needs board (core/needs.ts), written 17 Nov 2026: a fixed board of everyday needs, made in code. These
// tests pin what the board promises: every tile is a picture and its word, the way out is there, no model and no
// request can be behind it, the person's side carries no coaching or praise, and the partner's side gets one short
// line per need. What they cannot show: that the board helps anyone. Nobody living with aphasia has used it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { partnerActions } from '../../core/actions';
import { COPY } from '../../core/copy';
import { needLine, needsCard } from '../../core/needs';
import { BUILTIN } from '../../core/pictures';
import { badgeKind, sessionReceipt } from '../../core/receipt';
import { SAMPLE_PROFILE } from '../../core/sample';
import { PICTO_IDS, builtinPicto } from '../../web/src/pictos';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const card = needsCard();
const labels = card.choices.map((c) => c.label);

describe('the quick-needs board: what is on it', () => {
  it('eight needs and the way out, in a fixed order', () => {
    expect(labels).toEqual(['toilet', 'drink', 'food', 'pain', 'tired', 'too hot', 'too cold', 'call someone', 'something else']);
    expect(card.choices.filter((c) => c.role === 'answer')).toHaveLength(8);
    expect(card.choices.filter((c) => c.role === 'escape').map((c) => c.label)).toEqual(['something else']);
    expect(card.choices[card.choices.length - 1].role).toBe('escape');
  });
  it('every tile has a picture we drew and a word: never a picture alone, never a word alone', () => {
    for (const c of card.choices) {
      expect(c.label.trim(), 'a word').not.toBe('');
      expect(c.picture, c.label).toEqual({ type: 'builtin', id: c.label });
      expect(BUILTIN.has(c.label), c.label).toBe(true);
      expect(PICTO_IDS, c.label).toContain(c.label);
      const svg = builtinPicto(c.label);
      expect(svg).toMatch(/^<svg /);
      expect(svg, 'no image from outside, no text inside').not.toMatch(/<image|href=|<text/);
    }
    // each need has its own drawing (an unknown id would fall back to the way-out picture)
    expect(new Set(card.choices.map((c) => builtinPicto(c.label).replace(/aria-label="[^"]+"/, ''))).size).toBe(card.choices.length);
  });
  it('adult, plain words: lower case, no negative, no exclamation mark, no praise, no digits spelled out', () => {
    for (const l of [...labels, card.topic]) {
      expect(l).not.toMatch(/!|\b(?:not|no|never|don't)\b/i);
      expect(l).not.toMatch(/\b(?:good|great|well done|potty|tummy|yummy|sleepy|poorly)\b/i);
    }
    for (const l of labels) expect(l).toBe(l.toLowerCase());
    expect(card.topic).toBe('I need');
  });
  it('is the same card every time: nothing in it depends on the family, the hour or a model', () => {
    expect(JSON.stringify(needsCard())).toBe(JSON.stringify(card));
  });
});

describe('the quick-needs board: no AI and nothing sent', () => {
  it('the module imports the copy and the types and nothing else: it cannot reach an engine, the pipeline or the network', () => {
    const src = read('core/needs.ts');
    const imports = [...src.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
    expect(imports.sort()).toEqual(['./copy', './types']);
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n');
    expect(code).not.toMatch(/fetch\(|XMLHttpRequest|WebSocket|engine|makeCard|await |async /i);
  });
  it('the card says so in the same words as every card made in code: badge "No AI needed", nothing in the receipt', () => {
    expect(card.source).toBe('code');
    expect(badgeKind(card)).toBe('code');
    expect(card.cloudPayload).toBeNull();
    expect(card.cloudAttempted ?? null).toBeNull();
    expect(card.unsentPayload ?? null).toBeNull();
    expect(card.trace?.map((t) => `${t.step}:${t.ran}:${t.used}`)).toEqual(['private:skipped:false', 'stripped:skipped:false', 'code:on-device:true']);
    expect(card.why?.proposed).toBeNull();
    expect(card.why?.decided).toBe(COPY.how.why.decidedBy.needs);
    const r = sessionReceipt([card], SAMPLE_PROFILE);
    expect(r.cardsLeft).toBe(0);
    expect(r.bodyBytes).toBe(0);
    expect(r.attempts).toBe(0);
  });
  it('the web client opens it without any engine call: openNeeds builds the card and makes no card through the pipeline', () => {
    const main = read('web/src/main.ts');
    const open = main.slice(main.indexOf('function openNeeds()'), main.indexOf('// ---------------------------------------------------------------- partner screen'));
    expect(open).toContain('const card = needsCard();');
    expect(open).not.toMatch(/makeCard|state\.engine|await |fetch\(/);
    // one tap from the partner screen (the top bar), and by its own address
    expect(main).toContain(`<button class="needs-open" data-act="needs"`);
    expect(main).toContain("if (h === 'needs') { if (state.card?.kind !== 'needs') openNeeds(); return 'person'; }");
  });
});

describe('the quick-needs board: the tick / cross check, and whose side says what', () => {
  it('the person\'s screen goes through the same check as every card: "So: toilet. Right?" with a tick and a cross', () => {
    const main = read('web/src/main.ts');
    const view = main.slice(main.indexOf('function personView('), main.indexOf('function personScreen('));
    // the check and the confirmed answer come before the board in personView, so a tapped need is checked like any choice
    const check = view.indexOf('C.person.so(state.picked.label)');
    const board = view.indexOf("if (c.kind === 'needs')");
    expect(check).toBeGreaterThan(0);
    expect(board).toBeGreaterThan(check);
    expect(view.slice(check, board)).toContain('data-confirm="yes">${TICK}');
    expect(view.slice(check, board)).toContain('data-confirm="change">${CROSS}');
    expect(COPY.person.so('toilet')).toBe('So: toilet. Right?');
    // the board itself: picture and word on every tile, nothing else
    const tiles = view.slice(board, view.indexOf('const answers = c.choices.filter'));
    expect(tiles).toContain('${picture(ch)}<span>${esc(ch.label)}</span>');
    expect(tiles).not.toMatch(/needLine|C\.needs\.(?:lines|tip|say|note)|coach|done|score|praise/);
  });
  it('the partner gets one short line for every tile, and none of them is on the card itself', () => {
    for (const l of labels) {
      const line = needLine(l);
      expect(line, l).not.toBe('');
      expect(line.length, l).toBeLessThanOrEqual(120);
      expect(line, l).not.toMatch(/!|\byou should\b|\byou must\b|\bdon't\b|\bnever\b/i); // short and optional, never a scolding
      expect(JSON.stringify(card), l).not.toContain(line);
    }
    expect(Object.keys(COPY.needs.lines).sort()).toEqual([...labels].sort());
    expect(needLine('a word that is not on the board')).toBe('');
    // the lines are drawn in the partner's panel only
    const main = read('web/src/main.ts');
    const uses = [...main.matchAll(/needLine\(/g)].map((m) => m.index!);
    expect(uses).toHaveLength(1);
    expect(uses[0]).toBeGreaterThan(main.indexOf('function cardPanel('));
    expect(uses[0]).toBeLessThan(main.indexOf('const recapText'));
  });
  it('"pain" leads on to the body card, which is made in code too', () => {
    expect(COPY.needs.painQuestion).toBe('Where does it hurt?');
    expect(needLine('pain')).toMatch(/where it hurts/i);
  });
  it('"something else" is a way out: the partner is sent back to the question box and to "We\'re stuck"', () => {
    expect(needLine('something else')).toMatch(/question box/);
    expect(needLine('something else')).toContain(COPY.card.stuck);
  });
  it('under the board the partner has "Show to person" and "We\'re stuck"; no "Hide the choices", no next page', () => {
    expect(partnerActions(card, { less: false, hasAnswers: false }).map((a) => a.act)).toEqual(['show', 'stuck']);
    expect(partnerActions(card, { less: false, hasAnswers: true }).map((a) => a.act)).toEqual(['show', 'recap', 'stuck']);
  });
  it('a confirmed need is of the moment: it is not kept in "Answers so far"', () => {
    const main = read('web/src/main.ts');
    expect(main).toMatch(/if \(c\.kind !== 'needs'\) \{\s+state\.history = addAnswer\(/);
  });
});

describe('the quick-needs board: targets', () => {
  const css = read('web/src/styles.css');
  it('no tile of the board is set lower than 64 px at any width', () => {
    const rules = [...css.matchAll(/\.tiles\.needs[^{]*\{([^}]*)\}/g)].map((m) => m[1]);
    const heights = rules.flatMap((r) => [...r.matchAll(/min-height:\s*(\d+)px/g)].map((m) => Number(m[1])));
    expect(heights.length).toBeGreaterThan(3);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(64);
  });
});
