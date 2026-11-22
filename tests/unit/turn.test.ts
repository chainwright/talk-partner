// "[Name] wants to say something" (core/turn.ts): three starters and the way out, the topics three to a screen, the
// line and the questions the carer gets; rules only; and the safety rule that the answer check stays out of it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P4 } from '../../core/copy4';
import { BUILTIN } from '../../core/pictures';
import { TOPIC_BASE } from '../../core/topics';
import { NullEngine } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { BODY_FIRST, FEEL_QUESTION, MENU, aboutCard, menuTopic, starterOf, topicMenu, turnCard, turnLead } from '../../core/turn';
import { TELL, TELL_DAY, TELL_NEWS, TREE_QUESTIONS, after } from '../../core/tree';
import { EMPTY_PROFILE, type Profile } from '../../core/types';
import { turnButton, turnLine } from '../../web/src/phase4';

const ROOT = join(__dirname, '..', '..');
const MILLER: Profile = { ...EMPTY_PROFILE, personName: 'Frank', partnerName: 'Carol', people: [{ id: 'p2', name: 'Beth', relation: 'daughter', household: false }, { id: 'p3', name: 'Tom', relation: 'brother', household: false }] };

describe('the card the person starts from', () => {
  const c = turnCard();
  it('three starters and "something else": never more than three choices', () => {
    // (phase 10: "I want to talk about…" in place of "I want to tell you something"; tests/unit/phase10.test.ts)
    expect(c.choices.map((x) => x.label)).toEqual(['I need something', 'I want to talk about…', 'I feel…', 'something else']);
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

describe('what in the topic it is about: one more card on the person\'s screen', () => {
  it('People & family: "Who is it about?": (phase 8) "me" first, then up to two of the family\'s names, each with the person\'s picture, and "someone else"', () => {
    const c = aboutCard('people', MILLER)!;
    expect(c.asked).toBe('Who is it about?');
    expect(c.choices.map((x) => [x.label, x.role])).toEqual([['me', 'answer'], ['Beth', 'answer'], ['Tom', 'answer'], ['someone else', 'escape']]);
    expect(c.choices[0].picture).toEqual({ type: 'person', personId: null, initial: (MILLER.personName || 'M').charAt(0).toUpperCase() });
    expect(c.choices[1].picture).toEqual({ type: 'person', personId: 'p2', initial: 'B' });
    // the carer reads the person's own news, never "me"
    expect(turnLead('tell', 'Frank', 'people', 'me').about).toBe("It is about: People & family, Frank's own news.");
    expect(turnLead('tell', '', 'people', 'me').about).toBe('It is about: People & family, their own news.');
    expect(c.turn).toBe('about');
    expect(c.source).toBe('code');
  });
  it('never the person or the carer, never someone who lives there; with nobody named there is no such card', () => {
    const home: Profile = { ...MILLER, people: [{ id: 'p1', name: 'Carol', relation: 'wife', household: true }] };
    expect(aboutCard('people', home)).toBeNull();
    expect(aboutCard('people', EMPTY_PROFILE)).toBeNull();
  });
  it('the other topics: two plain choices and the way out; "Body & care" has no such card', () => {
    expect(aboutCard('plans', MILLER)!.choices.map((x) => x.label)).toEqual(['today', 'another day', 'something else']);
    expect(aboutCard('plans', MILLER)!.asked).toBe('Is it about today, or another day?');
    expect(aboutCard('fun', MILLER)!.choices.map((x) => x.label)).toEqual(['TV', 'music', 'something else']);
    expect(aboutCard('food', MILLER)!.choices.map((x) => x.label)).toEqual(['food', 'a drink', 'something else']);
    expect(aboutCard('rest', MILLER)!.choices.map((x) => x.label)).toEqual(['last night', 'now', 'something else']);
    expect(aboutCard('body', MILLER)).toBeNull();
    for (const t of MENU) for (const x of aboutCard(t, MILLER)?.choices ?? []) if (x.picture.type === 'builtin') expect(BUILTIN.has(x.picture.id), x.label).toBe(true);
  });
});

describe('what the carer reads', () => {
  it('says who started, in words that fit a name or none, and never "he" or "she"', () => {
    expect(turnLead('tell', 'Frank', null).line).toBe('Frank started this: there is something to tell you.');
    expect(turnLead('need', '', null).line).toBe('They started this: something is needed.');
    for (const f of Object.values(P4.turn.lines)) expect(f('Frank')).not.toMatch(/\b(?:he|she|him|her|his)\b/i);
  });
  it('the person wants to TELL something: the carer gets questions about the telling, never offers ("Would you like to see Beth?")', () => {
    const lead = turnLead('tell', 'Frank', 'people', 'Beth');
    expect(lead.about).toBe('It is about: People & family, Beth.');
    expect(lead.ask).toEqual(['Is it good news, or a worry?', 'Did something happen?', 'Do you want to tell me now or later?']);
    for (const t of MENU.filter((x) => x !== 'body')) for (const q of turnLead('tell', '', t).ask) expect(q).not.toMatch(/^Would you like|^Do you want to (?:call|see|go)/);
    expect(turnLead('tell', '', 'plans', 'another day').about).toBe('It is about: Today & plans, another day.');
    expect(turnLead('tell', '', 'plans').about).toBe('It is about: Today & plans.');
  });
  it('safety: for "Body & care" the first question is about pain, never "good news or a worry?"', () => {
    expect(turnLead('tell', 'Frank', 'body').ask).toEqual(['Are you in pain?', 'Are you comfortable?', 'Do you need the toilet?']);
    expect(BODY_FIRST[0]).toBe('Are you in pain?');
  });
  it('the button and the line', () => {
    // (phase 10: the person's own words first)
    expect(turnButton('Frank')).toContain('Frank: I want to say something');
    expect(turnButton('')).toContain('<b>I want to say something</b>');
    expect(turnLine({ line: 'Frank started this: something is needed.', about: '' })).toContain('role="status"');
  });
});

describe('the questions about the telling: every one is a card the rules make, and every answer leads on (the tree\'s coverage)', () => {
  const env = { profile: MILLER, support: 'more' as const, engine: new NullEngine(), allowCloud: false, deviceReady: false };
  it.each([...TELL, TELL_DAY, ...BODY_FIRST])('%s', async (q) => {
    expect(TREE_QUESTIONS).toContain(q.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim());
    const card = await makeCard(q, env);
    expect(card.source, q).toBe('code');
    expect(card.blocked ?? null, q).toBeNull();
    expect(card.choices.filter((x) => x.role === 'answer').length).toBeLessThanOrEqual(3);
    for (let p: typeof card | null | undefined = card; p; p = p.nextPage) for (const ch of p.choices) {
      if (ch.role === 'escape' && p.nextPage) continue;
      const step = after(card, ch.label, MILLER, [q]);
      expect(step.next.length > 0 || step.end !== '', `"${q}" -> ${ch.label}: a silent end`).toBe(true);
      expect(step.end, `"${q}" -> ${ch.label}`).not.toMatch(/\{them\}|\{their\}|\{they\}/i);
      // and every next question is itself one the trees know, three deep at most
      for (const n of step.next) { const c2 = await makeCard(n, env); expect(c2.source, n).toBe('code'); expect(c2.blocked ?? null, n).toBeNull(); }
    }
  });
  it('a worry is taken as said: the carer stays near and may ask about pain; nothing says later, tired or less sure', () => {
    const w = after({ asked: TELL_NEWS, kind: 'choice' }, 'worry', MILLER, [TELL_NEWS]);
    expect(w.next).toEqual(['Did something happen?', 'Are you in pain?']);
    expect(w.end).toBe("A worry. Stay near, and ask one small question at a time. It is Frank's worry to tell: do not guess it away.");
    expect(w.end).not.toMatch(/later|tired|less sure/i);
  });
});

describe('boundaries', () => {
  it('core/turn.ts reaches no engine and no network', () => {
    const src = readFileSync(join(ROOT, 'core/turn.ts'), 'utf8');
    expect([...src.matchAll(/^import .* from '([^']+)';$/gm)].map((x) => x[1]).sort()).toEqual(['./copy10', './copy4', './topics', './tree', './types']);
    expect([...readFileSync(join(ROOT, 'core/tree.ts'), 'utf8').matchAll(/^import .* from '([^']+)';$/gm)].map((x) => x[1]).sort()).toEqual(['./copy12', './redflag', './topics', './types']);
    // (phase 12: the crisis words and their check; both files import nothing)
    for (const f of ['core/copy12.ts', 'core/redflag.ts']) expect(readFileSync(join(ROOT, f), 'utf8'), f).not.toMatch(/^import /m);
    expect(src).not.toMatch(/fetch\(|engine\.|firebase/);
  });
  it('safety: what the person started is never counted by the answer check, and its line never stands on those screens', () => {
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    expect(main).toContain("!c.scale && !c.letter && !c.turn && !state.p4.turn ?");
    expect(main).toContain("guardHtml: c.kind === 'repair' || c.letter || c.turn || c.visit || state.p4.turn ? '' : guardHtml(c, p.label),");
    expect(main).toContain("c.kind === 'no-quiz' || c.letter || c.turn || c.visit || state.p4.turn ? '' : guardHtml(c),");
  });
});
