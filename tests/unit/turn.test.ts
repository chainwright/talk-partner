// "[Name] wants to say something" (core/turn.ts): three starters and the way out, the topics three to a screen, the
// line and the questions the carer gets; rules only; and the safety rule that the answer check stays out of it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P4 } from '../../core/copy4';
import { BUILTIN } from '../../core/pictures';
import { TOPIC_BASE } from '../../core/topics';
import { FEEL_QUESTION, MENU, menuTopic, starterOf, topicMenu, turnCard, turnLead } from '../../core/turn';
import { after } from '../../core/tree';
import { EMPTY_PROFILE, type Profile } from '../../core/types';
import { turnButton, turnLine } from '../../web/src/phase4';

const ROOT = join(__dirname, '..', '..');
const MILLER: Profile = { ...EMPTY_PROFILE, personName: 'Frank', partnerName: 'Carol', people: [{ id: 'p2', name: 'Beth', relation: 'daughter', household: false }, { id: 'p3', name: 'Tom', relation: 'brother', household: false }] };

describe('the card the person starts from', () => {
  const c = turnCard();
  it('three starters and "something else": never more than three choices', () => {
    expect(c.choices.map((x) => x.label)).toEqual(['I need something', 'I want to tell you something', 'I feel…', 'something else']);
    expect(c.choices.filter((x) => x.role === 'answer')).toHaveLength(3);
    expect(c.choices.at(-1)?.role).toBe('escape');
  });
  it('made by the rules: no model, nothing sent; every starter has a drawing', () => {
    expect(c.source).toBe('code');
    expect(c.cloudPayload).toBeNull();
    for (const x of c.choices) expect(x.picture.type === 'builtin' && BUILTIN.has(x.picture.id), x.label).toBe(true);
  });
  it('each starter is known by its label; the way out is none of them', () => {
    expect(c.choices.map((x) => starterOf(x.label))).toEqual(['need', 'tell', 'feel', null]);
  });
  it('"I feel…" leads to a question the trees know, with pain leading to where it hurts', () => {
    expect(TOPIC_BASE.find((t) => t.id === 'feel')!.questions).toContain(FEEL_QUESTION);
    expect(after({ asked: FEEL_QUESTION, kind: 'feeling' }, 'in pain', MILLER).next[0]).toBe('Where does it hurt?');
  });
});

describe('the topics as a picture menu', () => {
  const m = topicMenu();
  it('three to a screen, the way out of the first screen leading to the next three, the last one real', () => {
    expect(m.choices.filter((x) => x.role === 'answer')).toHaveLength(3);
    expect(m.nextPage?.choices.filter((x) => x.role === 'answer')).toHaveLength(3);
    expect(m.nextPage?.nextPage ?? null).toBeNull();
    const all = [...m.choices, ...m.nextPage!.choices].filter((x) => x.role === 'answer').map((x) => menuTopic(x.label));
    expect(all).toEqual(MENU);
  });
  it('every topic has a drawing of this app', () => {
    for (const x of [...m.choices, ...m.nextPage!.choices]) expect(x.picture.type).toBe('builtin');
  });
});

describe('what the carer reads', () => {
  it('says who started, in words that fit a name or none, and never "he" or "she"', () => {
    expect(turnLead('tell', 'Frank', null, MILLER).line).toBe('Frank started this: there is something to tell you.');
    expect(turnLead('need', '', null, EMPTY_PROFILE).line).toBe('They started this: something is needed.');
    for (const f of Object.values(P4.turn.lines)) expect(f('Frank')).not.toMatch(/\b(?:he|she|him|her|his)\b/i);
  });
  it('a topic gives up to three questions of it, the family\'s own first; all of them questions the trees know or the rules make', () => {
    const lead = turnLead('tell', 'Frank', 'people', MILLER);
    expect(lead.about).toBe('It is about: People & family.');
    expect(lead.ask).toHaveLength(3);
    expect(lead.ask[0]).toBe('Would you like to see Beth?');
    expect(turnLead('tell', '', 'plans', EMPTY_PROFILE).ask.every((q) => TOPIC_BASE.some((t) => t.questions.includes(q)))).toBe(true);
  });
  it('the button and the line', () => {
    expect(turnButton('Frank')).toContain('Frank wants to say something');
    expect(turnButton('')).toContain('They want to say something');
    expect(turnLine({ line: 'Frank started this: something is needed.', about: '' })).toContain('role="status"');
  });
});

describe('boundaries', () => {
  it('core/turn.ts reaches no engine and no network', () => {
    const src = readFileSync(join(ROOT, 'core/turn.ts'), 'utf8');
    expect([...src.matchAll(/^import .* from '([^']+)';$/gm)].map((x) => x[1]).sort()).toEqual(['./copy4', './topics', './types']);
    expect(src).not.toMatch(/fetch\(|engine\.|firebase/);
  });
  it('safety: what the person started is never counted by the answer check, and its line never stands on those screens', () => {
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    expect(main).toContain("!c.scale && !c.letter && !c.turn && !state.p4.turn ?");
    expect(main).toContain("guardHtml: c.kind === 'repair' || c.letter || c.turn || c.visit || state.p4.turn ? '' : guardHtml(c, p.label),");
    expect(main).toContain("c.kind === 'no-quiz' || c.letter || c.turn || c.visit || state.p4.turn ? '' : guardHtml(c),");
  });
});
