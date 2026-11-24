// The conversation trees (core/tree.ts): after every answer to every topic question there is a next question or a
// line that tells the carer what to do. This file WALKS them: every topic question (the generic 40 the rules make, and
// the family's own from About them), every answer its card can give (yes, no, not sure, each choice, the way out,
// every page), then every next question the same way, down every path. It fails on: an answer with neither a next
// question nor an end line; a next question the rules cannot make a card for (a model would be needed); a path deeper
// than three questions; a question offered twice in one conversation; an end line that is not a short, positive line.
import { describe, expect, it } from 'vitest';
import { NullEngine } from '../../core/engine';
import { bodyDetailCard, makeCard } from '../../core/pipeline';
import { BODY_REGIONS } from '../../core/rules';
import { SAMPLE_PROFILE } from '../../core/sample';
import { AI_QUESTION, HOW_BAD, WHERE_HURTS, awayNames, topics } from '../../core/topics';
import { TREE_DEPTH, TREE_QUESTIONS, after, treeSize, who } from '../../core/tree';
import { EMPTY_PROFILE, type Card, type Profile } from '../../core/types';

const env = (profile: Profile) => ({ profile, support: 'more' as const, engine: new NullEngine(), allowCloud: false, deviceReady: false });
const cache = new Map<string, Promise<Card>>();
const card = (q: string, profile: Profile) => { const k = `${profile.personName}|${q}`; if (!cache.has(k)) cache.set(k, makeCard(q, env(profile))); return cache.get(k)!; };
/** Every label a card can give: the answers and the way out, on every page. A body map's first step leads to its second. */
function labels(c: Card): string[] {
  const out: string[] = [];
  for (let p: Card | null | undefined = c; p; p = p.nextPage) for (const ch of p.choices) if (!out.includes(ch.label)) out.push(ch.label);
  return out;
}

interface Walk { paths: number; ends: number; steps: number; deepest: number; problems: string[]; questions: Set<string>; pairs: Set<string> }
async function walk(profile: Profile): Promise<Walk> {
  const w: Walk = { paths: 0, ends: 0, steps: 0, deepest: 0, problems: [], questions: new Set(), pairs: new Set() };
  // (phase 15, judge round 11, ADV-05-17: past the depth limit only "How bad is the pain?" may follow, after a safety check's red box)
  const visit = async (q: string, chain: string[], safety = false): Promise<void> => {
    const here = [...chain, q];
    const extra = safety && here.length === TREE_DEPTH + 1 && q === 'How bad is the pain?';
    if (!extra) w.deepest = Math.max(w.deepest, here.length);
    w.questions.add(q);
    if (here.length > TREE_DEPTH && !extra) { w.problems.push(`deeper than ${TREE_DEPTH}: ${here.join(' > ')}`); return; }
    const c = await card(q, profile);
    if (c.blocked || c.choices.length < 2) { w.problems.push(`the rules make no card for "${q}" (${here.join(' > ')})`); return; }
    // the body map: its first step leads to the second by itself, so the answers that count are the second step's
    const cards: Card[] = c.kind === 'body' ? BODY_REGIONS.map((r) => bodyDetailCard(r, profile)) : [c];
    for (const one of cards) {
      for (const label of labels(one)) {
        if (one.kind === 'body' && /^(?:somewhere else|something else)$/.test(label)) continue; // the next page of the map
        w.pairs.add(`${q}|${label}`);
        w.steps++;
        const step = after(one, label, profile, here);
        const where = `${here.join(' > ')} > [${label}]`;
        if (!step.next.length && !step.end) w.problems.push(`silent end: ${where}`);
        if (!step.end) w.problems.push(`no end line: ${where}`);
        // (phase 12b: a line that walks the carer through the stroke check itself may run to 200 characters;
        // phase 13: so may the call line of a chest or head pain, drawn as a red box with its call button)
        if (step.end && (step.end.length > (/lift both arms|Do not wait to see if it passes/.test(step.end) ? 200 : 120) || /\{|\}|undefined/.test(step.end) || !/[.!]$/.test(step.end))) w.problems.push(`bad end line "${step.end}": ${where}`);
        for (const n of step.next) if (here.includes(n)) w.problems.push(`asked twice: ${n} in ${where}`);
        if (!step.next.length) { w.paths++; w.ends++; continue; }
        // the carer may also stop here: the end line of this answer is the fallback at the depth limit
        for (const n of step.next) await visit(n, here, !!step.alert);
      }
    }
  };
  for (const t of topics(profile)) for (const x of t.questions) if (!x.ai) await visit(x.q, []);
  return w;
}

describe('the conversation trees: every topic question, every answer, down every path', () => {
  it('with nothing in About them: no silent end, no question the rules cannot make, never deeper than three', async () => {
    const w = await walk(EMPTY_PROFILE);
    expect(w.problems).toEqual([]);
    expect(w.deepest).toBeLessThanOrEqual(TREE_DEPTH);
    expect(w.ends).toBeGreaterThan(100);
    // the size of the walk, printed for the record (README, "Conversation trees")
    process.stderr.write(`tree walk, empty About them: ${w.questions.size} questions, ${w.pairs.size} question x answer pairs, ${w.steps} steps walked, ${w.paths} paths, each ending on an action line; deepest ${w.deepest}\n`);
  });
  it('with a family in About them: the same, and their own questions are walked too', async () => {
    const w = await walk(SAMPLE_PROFILE);
    expect(w.problems).toEqual([]);
    expect(w.deepest).toBeLessThanOrEqual(TREE_DEPTH);
    expect([...w.questions].some((q) => /call Jen/.test(q))).toBe(true);
    process.stderr.write(`tree walk, sample family: ${w.questions.size} questions, ${w.pairs.size} question x answer pairs, ${w.steps} steps walked, ${w.paths} paths; deepest ${w.deepest}\n`);
  });
  it('every generic topic question the rules make is in the table, with an entry for every answer of its card', async () => {
    const generic = topics(EMPTY_PROFILE).flatMap((t) => t.questions).filter((x) => !x.ai).map((x) => x.q);
    expect(generic).toHaveLength(40);
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
    for (const q of generic) {
      expect(TREE_QUESTIONS, q).toContain(norm(q));
      const c = await card(q, EMPTY_PROFILE);
      for (const label of labels(c)) expect(after(c, label, EMPTY_PROFILE, [q]).end, `${q} [${label}]`).not.toBe('');
    }
    expect(treeSize().questions).toBeGreaterThanOrEqual(46);
    expect(treeSize().answers).toBeGreaterThanOrEqual(140);
  });
});

describe('the paths the owner asked for', () => {
  const step = async (q: string, label: string, chain: string[], profile = EMPTY_PROFILE) => after(await card(q, profile), label, profile, [...chain, q]);
  it('hungry -> yes -> a snack or a meal -> snack -> sweet or savoury -> sweet -> END with what to do', async () => {
    const one = await step('Are you hungry?', 'yes', []);
    expect(one.next).toEqual(['Would you like a snack or a meal?']);
    const two = await step(one.next[0], 'snack', ['Are you hungry?']);
    expect(two.next).toEqual(['Would you like something sweet or something savoury?']);
    const three = await step(two.next[0], 'something sweet', ['Are you hungry?', one.next[0]]);
    expect(three).toEqual({ next: [], end: 'Bring them a sweet snack. Show two to pick from, if you can.' });
  });
  it('a "no" has a branch or a natural end, and so has "not sure"', async () => {
    expect(await step('Are you hungry?', 'no', [])).toEqual({ next: ['Would you like something to drink?'], end: 'Not hungry now. Ask again in an hour.' });
    expect(await step('Would you like something to drink?', 'no', ['Are you hungry?'])).toEqual({ next: [], end: 'No drink for now. Offer one again in an hour.' });
    expect((await step('Shall we stop for now?', 'yes', [])).end).toBe('Stop here. They do not want to go on now, and that is fine.');
    expect((await step('Do you need the toilet?', 'not sure', [])).end).toBe('Offer to go anyway: it is easier than a rush later.');
  });
  it('the third question of a conversation ends it: only the action line is left', async () => {
    const deep = await step('Would you like tea or coffee?', 'tea', ['Would you like something to drink?', 'Would you like a hot drink or a cold drink?']);
    expect(deep).toEqual({ next: [], end: 'Make the tea the way they like it.' });
    // as a first question the same answer leads on
    expect((await step('Would you like tea or coffee?', 'tea', [])).next).toEqual(['Would you like milk in it?']);
  });
  it('a question is never offered twice in one conversation', async () => {
    const s = await step('Would you like tea or coffee?', 'something else', ['Would you like a hot drink or a cold drink?']);
    expect(s.next).toEqual([]);
    expect(s.end).toBe('Show them the cupboard, and let them point.');
  });
  it('About them slots in: the family\'s foods under "a meal", their people under a call and a visit, their places under going out', async () => {
    const P = SAMPLE_PROFILE;
    const meal = await step('Would you like a snack or a meal?', 'meal', ['Are you hungry?'], P);
    expect(meal.next[0]).toMatch(/^Would you like .+ or .+\?$/);
    expect(meal.next[0]).toContain(P.foods[0]);
    // (18 Nov, the role-play: one question with the family's names as the choices, not one name at a time)
    const away = awayNames(P);
    expect(away.length).toBeGreaterThanOrEqual(2);
    expect((await step('Do you want to call someone?', 'yes', [], P)).next).toEqual([`Who would you like to call? ${away.slice(0, -1).join(', ')} or ${away[away.length - 1]}?`]);
    expect((await step('Would you like a visitor today?', 'yes', [], P)).next[0]).toMatch(/^Who would you like to see\? .+ or .+\?$/);
    expect((await step('Would you like to go for a drive?', 'yes', [], P)).next[0]).toMatch(/^Where would you like to go\?/);
    // and the end lines use the person's name, with the verb in the singular
    expect((await step('Would you like some more?', 'no', [], P)).end).toBe(`${P.personName} has had enough. Clear it away.`);
    expect((await step('Shall we stop for now?', 'yes', [], P)).end).toBe(`Stop here. ${P.personName} does not want to go on now, and that is fine.`);
    const call = (await step('Do you want to call someone?', 'yes', [], P)).next[0];
    const card = await makeCard(call, { profile: P, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
    // the rules make it a choice card: up to three names, each with the person's photo or initial, and "someone else"
    expect(card.source).toBe('code');
    expect(card.choices.map((c) => c.label)).toEqual([...away.slice(0, 3), 'someone else']);
    expect(card.choices.slice(0, -1).every((c) => c.picture.type === 'person')).toBe(true);
    expect((await step(call, away[0], ['Do you want to call someone?'], P)).end).toBe(`Call ${away[0]} now, together.`);
    expect((await step(call, 'someone else', ['Do you want to call someone?'], P)).end).toBe('Someone else. Say one name at a time, or show photos, and wait for a yes.');
    const see = (await step('Would you like a visitor today?', 'yes', [], P)).next[0];
    expect((await step(see, away[1], ['Would you like a visitor today?'], P)).end).toBe(`Ask ${away[1]} to come, and tell ${P.personName} when.`);
    // one name: a yes / no about that person; no name: nothing to slot in
    const one = { ...P, people: P.people.filter((x) => x.household || (x.nickname?.trim() || x.name) === away[0]) };
    expect(who('call', awayNames(one))).toEqual([`Would you like to call ${away[0]}?`]);
    expect(who('see', [])).toEqual([]);
    expect(who('call', ['A', 'B', 'C', 'D'])).toEqual(['Who would you like to call? A, B or C?']);
  });
  it('pain leads to where, where to how bad, and how bad ends on what to do', async () => {
    expect((await step('Are you in pain?', 'yes', [])).next).toEqual([WHERE_HURTS]);
    const body = bodyDetailCard('arms', EMPTY_PROFILE);
    const part = body.choices[0].label;
    // (phase 12: an arm first asks "Is it suddenly weak or numb?", then how bad; the back goes straight to how bad)
    expect(after(body, part, EMPTY_PROFILE, ['Are you in pain?', WHERE_HURTS]).next.slice(0, 2)).toEqual(['Is it suddenly weak or numb, yes or no?', HOW_BAD]);
    expect(after(bodyDetailCard('back', EMPTY_PROFILE), 'lower back', EMPTY_PROFILE, ['Are you in pain?', WHERE_HURTS]).next[0]).toBe(HOW_BAD);
    expect((await step(HOW_BAD, 'very bad', ['Are you in pain?', WHERE_HURTS])).end).toContain('Call their nurse or doctor now.');
  });
  it('a question the carer typed is not in the trees: nothing is made up for it', async () => {
    const c = await card('Did you take your tablets?', EMPTY_PROFILE);
    expect(after(c, 'yes', EMPTY_PROFILE, [c.asked])).toEqual({ next: [], end: '' });
    expect(AI_QUESTION).toBe('What do you want to do this weekend?');
  });
});
