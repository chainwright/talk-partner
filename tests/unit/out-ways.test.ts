// After "something else" (18 Nov 2026, the owner's walk on his phone): the carer must always have a clear next step
// that the rules make, and never a jump to another topic. Pinned here: every either-or of every topic and of every
// tree, walked to its way out; the lists of more choices; "What is it about?"; the body and feelings first get the
// body card and the needs board; the word the carer types after "show me" is confirmed only by the person.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { P7 } from '../../core/copy7';
import { NullEngine } from '../../core/engine';
import { ABOUT_LEADS, MORE_MAX, MORE_PAGE, aboutWhatCard, moreCard, moreChoices, moreSubject, outWays, shownOn, typedCard, typedWord, type Way } from '../../core/more';
import { makeCard, repairCard } from '../../core/pipeline';
import { urgentAnswer } from '../../core/redflag';
import { TOPIC_BASE, topicOf, topics } from '../../core/topics';
import { TREE_QUESTIONS } from '../../core/tree';
import { EMPTY_PROFILE, type Card, type Profile } from '../../core/types';
import { answeredScreen, type AnsweredModel } from '../../web/src/simple';
import { understoodBlock, waysBlock } from '../../web/src/phase7';
import { WEEK } from './week';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const FRANK: Profile = { ...WEEK.profile, foods: [...WEEK.profile.foods, 'hot chocolate'] };
const NO_MODEL = new NullEngine();
const card = (q: string, profile = FRANK) => makeCard(q, { profile, support: 'more', engine: NO_MODEL, allowCloud: false, deviceReady: false });
const pages = (c: Card): Card[] => { const out: Card[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(p); return out; };
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);
const RULES: Way[] = ['more', 'about', 'where', 'needs'];

describe('every either-or of every topic and every tree: after its way out a step the rules make comes first', () => {
  const questions = [...new Set([...TOPIC_BASE.flatMap((t) => t.questions), ...topics(FRANK).flatMap((t) => t.questions.map((q) => q.q)), ...TREE_QUESTIONS.map((q) => `${q.charAt(0).toUpperCase()}${q.slice(1)}?`)])];
  it('walks more than 60 questions', async () => {
    expect(questions.length).toBeGreaterThan(60);
    const first: Record<string, number> = {};
    let walked = 0;
    for (const q of questions) {
      const c = await card(q);
      if (c.blocked || !c.choices.length) continue;
      const last = pages(c)[pages(c).length - 1];
      if (!last.choices.some((x) => x.role === 'escape')) continue;
      walked++;
      const topic = topicOf(q, FRANK)?.id ?? null;
      const ways = outWays(last, FRANK, topic);
      // the first way is made by the rules on the device, and the AI's step is never before the last place
      expect(RULES, `${q}: ${ways.join(', ')}`).toContain(ways[0]);
      expect(ways[ways.length - 1], q).toBe('narrow');
      expect(ways.indexOf('letter'), q).toBeLessThan(ways.indexOf('show'));
      first[ways[0]] = (first[ways[0]] ?? 0) + 1;
      if (ways[0] === 'more') {
        const subject = moreSubject(last.asked, shownOn(last))!;
        const more = moreCard(subject, shownOn(last), FRANK)!;
        expect(more, q).not.toBeNull();
        for (const p of pages(more)) {
          expect(answers(p).length, q).toBeGreaterThanOrEqual(1);
          expect(answers(p).length, q).toBeLessThanOrEqual(MORE_PAGE);
          expect(p.choices.filter((x) => x.role === 'escape').map((x) => x.label), q).toEqual(['something else']);
          expect(p.source, q).toBe('code');
        }
        // nothing that was shown is offered again
        const again = pages(more).flatMap(answers).filter((a) => shownOn(last).map((x) => x.toLowerCase()).includes(a.toLowerCase()));
        expect(again, q).toEqual([]);
      }
      // the body and feelings: the body card and the needs board, never a list of guesses
      if (topic === 'body' || topic === 'feel') expect(ways.slice(0, 2).every((w) => w === 'where' || w === 'needs'), `${q}: ${ways.join(', ')}`).toBe(true);
      // and on the screen: no question of another topic, shown or under "More"
      const html = screen(last, ways, true);
      const asked = [...html.matchAll(/data-q="([^"]+)"/g)].map((m) => m[1]);
      expect(asked.filter((x) => x !== 'Where does it hurt?'), q).toEqual([]);
      expect(html, q).not.toContain('id="next-q"');
    }
    expect(walked).toBeGreaterThan(30);
    // every kind of first step is in use, and more choices of the same kind lead where a kind is known
    expect(first.more ?? 0).toBeGreaterThan(10);
    expect((first.where ?? 0) + (first.needs ?? 0)).toBeGreaterThan(5);
  });
  const made = { maker: 'code' as const, left: 'nothing' as const, spoken: false, lines: ["Made by the app's rules.", 'Nothing was sent.'] };
  const screen = (c: Card, ways: Way[], more: boolean) => answeredScreen({ name: 'Frank', label: 'something else', question: c.asked, more, out: true, afterHtml: '', next: null, follow: ['Are you hungry?'], end: '', tryNext: 'Are you hungry?', narrow: 'ask', narrowLast: false, short: null, who: false, invite: false, hasAnswers: false, today: [], made, privacy: [], ways, moreFirst: ['water'] } as AnsweredModel);
});

describe('more choices of the same kind (rules, no AI, no connection)', () => {
  it('the case found on the phone: "a hot drink or a cold drink?" -> something else -> water, juice, milk; then tea, coffee and the family\'s own drink', async () => {
    const c = await card('Would you like a hot drink or a cold drink?');
    expect(outWays(c, FRANK, 'food')[0]).toBe('more');
    expect(moreSubject(c.asked, shownOn(c))).toBe('drink');
    const more = moreCard('drink', shownOn(c), FRANK)!;
    expect(pages(more).map(answers)).toEqual([['water', 'juice', 'milk'], ['tea', 'coffee', 'hot chocolate']]);
    expect(more.asked).toBe('Which drink?');
    expect(more.say).toContain('Which drink?');
    expect(more.notes).toEqual([P7.more.note]);
    expect(more.cloudPayload).toBeNull();
    // every tile has a picture of ours, or is the family's own word
    expect(pages(more).flatMap((p) => p.choices).filter((x) => x.role === 'answer' && x.picture.type !== 'builtin').map((x) => x.label)).toEqual(['hot chocolate']);
  });
  it('what was already shown is never offered again: after "tea or coffee?" the list has neither', async () => {
    const c = await card('Would you like tea or coffee?');
    expect(pages(moreCard('drink', shownOn(c), FRANK)!).flatMap(answers)).toEqual(['water', 'juice', 'milk', 'hot chocolate']);
  });
  it('after the last page\'s way out the list is used up: the first letter is next, never the same list again', async () => {
    const c = await card('Would you like a hot drink or a cold drink?');
    const all = pages(moreCard('drink', shownOn(c), FRANK)!);
    const last = all[all.length - 1];
    expect(last.more).toEqual({ subject: 'drink', shown: ['hot drink', 'cold drink', 'water', 'juice', 'milk'] });
    expect(moreChoices('drink', shownOn(last), FRANK)).toEqual([]);
    expect(outWays(last, FRANK, 'food')).toEqual(['letter', 'show', 'narrow']);
  });
  it('food: the kinds, then the family\'s foods; people: the family first; places and things to do: the family\'s own first', () => {
    expect(moreChoices('food', [], FRANK)).toEqual(['something sweet', 'something savoury', 'a hot meal', 'a cold meal', 'a snack', 'ginger biscuits', 'porridge']);
    expect(moreChoices('people', [], FRANK).slice(0, 4)).toEqual(['Beth', 'Tom', 'a friend', 'a neighbour']);
    expect(moreChoices('people', [], FRANK)).not.toContain('Carol');
    expect(moreChoices('place', [], FRANK)).toEqual(['the lake', 'church', 'the garden', 'a walk', 'a drive', 'stay in']);
    expect(moreChoices('activity', ['tv'], FRANK)).toEqual(['football', 'music', 'radio', 'the paper', 'photos']);
    expect(moreChoices('food', [], FRANK).length).toBeLessThanOrEqual(MORE_MAX);
  });
  it('with nothing in About them the fixed lists stand; a question about nothing the rules know leads to "What is it about?"', async () => {
    expect(moreChoices('drink', [], EMPTY_PROFILE)).toEqual(['water', 'juice', 'milk', 'tea', 'coffee']);
    expect(moreChoices('people', [], EMPTY_PROFILE)).toEqual(['a friend', 'a neighbour', 'the carer', 'the nurse', 'the doctor']);
    const c = await card('Do you want the red one or the blue one?', EMPTY_PROFILE);
    if (c.choices.length) expect(outWays(c, EMPTY_PROFILE, null)[0]).toBe('about');
  });
});

describe('"What is it about?" and where each answer leads', () => {
  const c = aboutWhatCard(FRANK);
  it('six pictures, three at a time, "something else" on each page; fixed, made by the rules', () => {
    expect(pages(c).map(answers)).toEqual([['a drink', 'food', 'a person'], ['a place', 'my body', 'a feeling']]);
    expect(pages(c).every((p) => p.choices.filter((x) => x.role === 'escape').length === 1 && p.aboutWhat === true && p.source === 'code')).toBe(true);
    expect(pages(c).flatMap((p) => p.choices).filter((x) => x.role === 'answer').every((x) => x.picture.type === 'builtin')).toBe(true);
    expect(c.asked).toBe('What is it about?');
  });
  it('a drink, food, a person and a place lead to their list; the body and a feeling lead to their own cards', () => {
    expect(ABOUT_LEADS).toEqual({ 'a drink': 'drink', food: 'food', 'a person': 'people', 'a place': 'place', 'my body': 'body', 'a feeling': 'feeling' });
    for (const k of ['drink', 'food', 'people', 'place'] as const) expect(moreCard(k, [], FRANK)).not.toBeNull();
  });
  it('after its own way out it is not offered again: the first letter, then show or write', () => {
    expect(outWays(pages(c)[1], FRANK, null)).toEqual(['letter', 'show', 'narrow']);
  });
});

describe('worst case: the body and feelings', () => {
  it('"Are you in pain?", "How are you feeling today?" and a typed question about the chest: "Show me where" and the needs board first', async () => {
    for (const [q, topic] of [['Are you comfortable?', 'body'], ['How are you feeling today?', 'feel'], ['Is something bothering you?', 'feel']] as const) {
      const c = await card(q);
      const last = pages(c)[pages(c).length - 1];
      expect(outWays(last, FRANK, topic).slice(0, 2), q).toEqual(['where', 'needs']);
    }
    // by the question's words, with no topic known
    const typed = await card('Does your chest hurt or your head?');
    if (typed.choices.length) expect(outWays(pages(typed)[pages(typed).length - 1], FRANK, null)[0]).toBe(typed.kind === 'body' ? 'needs' : 'where');
  });
  it('the body card itself ("somewhere else" on its last page): the needs board first, not the body card again', async () => {
    const c = await card('Where does it hurt?');
    const last = pages(c)[pages(c).length - 1];
    expect(c.kind).toBe('body');
    expect(outWays(last, FRANK, 'body')).toEqual(['needs', 'letter', 'show', 'narrow']);
  });
  it('the list never holds a list of guesses about pain, and never a question of another topic', () => {
    const html = waysBlock({ ways: ['where', 'needs', 'letter', 'show', 'narrow'], moreFirst: [], letterHtml: '<button id="letter-go"></button>', narrowHtml: '' });
    expect(html).toContain('id="way-where" data-q="Where does it hurt?"');
    expect(html).not.toContain('more-like');
    expect(text(html)).toContain('Show me where The body card: they point to the place.');
    expect(text(html)).toContain('Open the needs board Toilet, pain, too hot, too cold, tired, call someone.');
  });
});

describe('"show me" and "write it" go on: the carer types what they understood, and the person confirms it', () => {
  it('the block under the line: "Did you understand?", a field, and "Not yet: try another way"', () => {
    const html = understoodBlock('Frank');
    expect(text(html)).toContain('Did you understand? Yes: type it One or two words. They will see it, point to it and say yes or no.');
    expect(html).toContain('<form id="understood-form"');
    expect(html).toContain('id="understood-go">Check it with Frank</button>');
    expect(html).toContain('id="not-yet" data-act="ways">Not yet: try another way</button>');
    expect(understoodBlock('')).toContain('Check it with them');
  });
  it('the typed word is the one choice of a card under the question that was open; the way out is there; nothing is picked', () => {
    const c = typedCard('  Juice ', 'Would you like a hot drink or a cold drink?', FRANK, 'more')!;
    expect(c.asked).toBe('Would you like a hot drink or a cold drink?');
    expect(c.choices.map((x) => [x.label, x.role])).toEqual([['Juice', 'answer'], ['something else', 'escape']]);
    expect(c.typed).toBe(true);
    expect(c.source).toBe('code');
    expect(typedCard('juice', '', FRANK, 'more')!.asked).toBe('Is this it?');
  });
  it('what is typed is cleaned: one line, no markup, forty characters; nothing typed makes no card', () => {
    expect(typedWord('  the   red <b>mug</b>\n')).toBe('the red bmug/b');
    expect(typedWord('x'.repeat(80))).toHaveLength(40);
    expect(typedCard('   ', 'q', FRANK, 'more')).toBeNull();
    expect(typedCard('something else', 'q', FRANK, 'more')).toBeNull();
  });
  it('worst case: a typed word that can be urgent ("chest", "dizzy", "fell") brings the call box like any answer', () => {
    for (const w of ['chest', 'dizzy', 'he fell']) expect(urgentAnswer('Would you like a hot drink or a cold drink?', typedCard(w, 'q', FRANK, 'more')!.choices[0].label), w).toBe(true);
  });
  it('in the page: the app never picks the typed word and never confirms it; "Not yet" shows a step that was on the way, or clears', () => {
    const main = read('web/src/main.ts');
    const typed = main.slice(main.indexOf('function checkTyped'), main.indexOf('function closeShare'));
    expect(typed).not.toMatch(/state\.picked = |state\.confirmed = true/);
    const ways = main.slice(main.indexOf("case 'ways': {"), main.indexOf("case 'stuck':"));
    expect(ways).not.toMatch(/state\.confirmed = true/);
    expect(ways).toContain('state.picked = null; state.confirmed = false;');
    // the repair card's own answered screen carries the block for the three ways to get it across, and not for "later"
    expect(main).toContain("([C.repair.tiles.showMe, C.repair.tiles.writeIt, C.repair.tiles.draw] as string[]).includes(p.label) ? understoodBlock(");
  });
  it('the repair card is not a question: its own ways hold no list of guesses', () => {
    expect(outWays(repairCard(FRANK), FRANK, null)).toEqual(['letter', 'show', 'narrow']);
  });
});

describe('no model, nothing sent', () => {
  it('core/more.ts imports no engine, no prompt and no request; its cards are made by the rules', () => {
    const imports = [...read('core/more.ts').matchAll(/^import [^;]*? from '([^']+)';$/gms)].map((m) => m[1]);
    expect(imports.sort()).toEqual(['./copy7', './kinds', './pipeline', './reliability', './types']);
    expect(read('core/more.ts')).not.toMatch(/fetch\(|runDevice|runCloud|engine\./);
  });
  it('the words: one line that says what to do; nothing that plays down, no exclamation mark', () => {
    expect(COPY.simple.out.heading).toBe('None of these. Find out what it is: one step at a time.');
    expect(P7.out.heading).toBe(COPY.simple.out.heading);
    const all = JSON.stringify([P7.out.more, P7.out.moreSub(['a']), P7.out.about, P7.out.aboutSub, P7.out.where, P7.out.whereSub, P7.out.needs, P7.out.needsSub, P7.out.narrowLast, P7.understood.ask, P7.understood.yes, P7.understood.hint, P7.understood.no, P7.understood.go('')]);
    expect(all).not.toMatch(/!|\bjust\b|\bfine\b|probably|\bhim\b|\bher\b/i);
  });
});
