// Phase 17b (the owner's rule of 24 Nov 2026: "this principle works for ANY topic"): the dead-end audit. Written before
// the fixes, and seen failing (devlog/evidence_phase17b/deadend_audit_before.md).
//
// It walks what the carer's screen does after a confirmed answer (core/endstep.ts, answerStep: the function the screen
// calls), from every question of every topic on the first screen, every question of the trees, a typed "want
// something?" in "Ask in your own words", the rules' best card for typed words the AI could not help with, the cards of
// more choices, and every way out. Each END (nothing more to ask) is put in one class:
//   (a) the goal reached: a concrete thing to do ("Bring Frank tea.");
//   (b) a deliberate stop: no, nothing bothering, stop for now, later;
//   (c) health: a red box or a call line, with the where / how-bad step;
//   (w) the way out was chosen: the screen of ways (more choices, the first letter, show or write) follows;
//   (d) DEAD END: the answer names a kind of thing, is a yes to wanting something, or the line asks a question that is
//       no button, and the screen offers no next question and no way to find which (letters, more choices, show/write).
// The test fails on every (d). AUDIT_OUT=<file> writes the table.
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NullEngine } from '../../core/engine';
import { answerStep, type AnswerStep } from '../../core/endstep';
import { MORE_SUBJECTS, moreCard, outWays } from '../../core/more';
import { ownCard, ownFallbackCard } from '../../core/ownwords';
import { crisisAnswer } from '../../core/redflag';
import { bodyDetailCard, makeCard } from '../../core/pipeline';
import { redPlace } from '../../core/redflag';
import { BODY_REGIONS } from '../../core/rules';
import { SAMPLE_PROFILE } from '../../core/sample';
import { HOW_BAD, WHERE_HURTS, topicOf, topics } from '../../core/topics';
import { NEAREST } from '../../core/ownwords';
import { TELL, TELL_DAY, TREE_QUESTIONS, WHAT_TOPIC } from '../../core/tree';
import { EMPTY_PROFILE, type Card, type Profile } from '../../core/types';

const env = (profile: Profile) => ({ profile, support: 'more' as const, engine: new NullEngine(), allowCloud: false, deviceReady: false });
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
const head = (q: string) => norm(q.split('?')[0]);

/** The answers that name a kind of thing: which one is still to be found. */
const KINDS = new Set(['snack', 'meal', 'something sweet', 'something savoury', 'hot meal', 'cold meal', 'hot drink', 'cold drink', 'tv', 'music', 'film', 'quiet music', 'lively music', 'stay in', 'go out', 'this morning', 'this afternoon', 'about food or drink', 'people', 'plans', 'good news', 'worry', 'something on tv', 'today', 'another day', 'something to eat', 'something to drink', 'lonely', 'worried']);
/** The questions whose "yes" wants something not named yet. */
const OPEN_YES = new Set(['are you hungry', 'would you like something to drink', 'would you like a visitor today', 'do you want to call someone', 'would you like some music on', 'shall we put the tv on', 'would you like to go for a drive', 'did something happen', 'is something bothering you']);
/** "Now" to telling: the telling is still to be found. */
const OPEN_PAIR = new Set(['do you want to tell me now or later|now', 'would you like to talk about how you feel now or later|now']);
const HEALTH_Q = /\b(?:pain|hurt|weak|numb|which side|chest|breath|fall|unwell|sugar|toilet)\b/i;

type Cls = 'a' | 'b' | 'c' | 'w' | 'd';
interface Row { from: string; path: string; label: string; role: string; end: string; follow: string[]; ways: string[]; cls: Cls; why: string }

function classify(c: Card, label: string, role: string, s: AnswerStep & { open?: { ways: string[] } }, chain: string[], profile: Profile, typed: boolean): { cls: Cls | 'n'; why: string; ways: string[] } {
  const q = norm(c.asked);
  const l = label.toLowerCase();
  const out = role === 'escape' && c.kind !== 'needs' && !s.alert;
  const ways = out ? outWays(c, profile, topicOf(chain[0] ?? c.asked, profile)?.id ?? topicOf(c.asked, profile)?.id ?? null) : (s.open?.ways ?? []);
  const health = !!s.alert || c.kind === 'body' || c.kind === 'pain' || crisisAnswer(label) || l === 'body' || (/\b(?:call|nurse|doctor|911|emergency)\b/i.test(s.end) && !/^Call [A-Z]/.test(s.end)) || HEALTH_Q.test(c.asked) && l !== 'no';
  if (health) {
    // (the crisis answer: the safety screen's red box; the way out of a care card: "Show me where" and the needs board)
    const kept = !!s.alert || crisisAnswer(label) || /\b(?:call|nurse|doctor)\b/i.test(s.end) || s.follow.some((f) => f === WHERE_HURTS || f === HOW_BAD || f === 'Are you in pain?') || ways.includes('where') || c.kind === 'body' || /toilet/i.test(c.asked);
    return kept ? { cls: 'c', why: s.alert ? 'red box' : 'call or nurse line', ways } : { cls: 'd', why: 'health with no call line and no where / how bad', ways };
  }
  if (out) return ways.length ? { cls: 'w', why: `ways: ${ways.join(', ')}`, ways } : { cls: 'd', why: 'way out with no ways', ways };
  if (s.follow.length) return { cls: 'n', why: 'goes on', ways };
  const open = KINDS.has(l) || (l === 'yes' && (OPEN_YES.has(q) || typed)) || OPEN_PAIR.has(`${q}|${l}`) || /(?:^|\. )Ask:? "/.test(s.end) || /^It is about\b/.test(s.end) || !s.end && l === 'yes';
  if (open) return ways.length ? { cls: 'a', why: `which one: ${ways.join(', ')}`, ways } : { cls: 'd', why: !s.end ? 'no line, no next question' : KINDS.has(l) ? 'names a kind, no way to find which' : /Ask:? "/.test(s.end) ? 'asks a question that is no button' : 'a yes to wanting, no way to find what', ways };
  if (l === 'no' || /^(?:no |not |nothing|stop here|later|maybe no|maybe not|a good|the noise is fine|the sound is fine|just right|some time alone|leave )/i.test(s.end) || ['later', 'some time alone', 'stop for now', 'good', 'just right'].includes(l)) return { cls: 'b', why: 'a stop', ways };
  if (!s.end) return { cls: 'd', why: 'no line, no next question', ways };
  return { cls: 'a', why: 'what to do', ways };
}

function labels(c: Card): { label: string; spoken: string; role: string }[] {
  const out: { label: string; spoken: string; role: string }[] = [];
  for (let p: Card | null | undefined = c; p; p = p.nextPage) for (const ch of p.choices) if (!out.some((o) => o.label === ch.label)) out.push({ label: ch.label, spoken: ch.spoken, role: ch.role });
  return out;
}

async function audit(profile: Profile): Promise<Row[]> {
  const rows: Row[] = [];
  const seen = new Set<string>();
  const cache = new Map<string, Promise<Card>>();
  const card = (q: string) => { if (!cache.has(q)) cache.set(q, makeCard(q, env(profile))); return cache.get(q)!; };
  const walkCard = async (from: string, c0: Card, chain: string[], typed = false): Promise<void> => {
    const cards: Card[] = c0.kind === 'body' && c0.bodyStep !== 2 ? BODY_REGIONS.map((r) => bodyDetailCard(r, profile)) : [c0];
    for (const c of cards) {
      for (const p of labels(c)) {
        if (c.kind === 'body' && /^(?:somewhere else|something else)$/.test(p.label)) continue; // the next page of the map
        const key = `${chain.map(head).join('>')}|${c.asked}|${p.label}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const out = p.role === 'escape' && c.kind !== 'needs';
        const s = answerStep(c, p, { profile, chain, number: '911', red: redPlace(c.asked, p.label), out }) as AnswerStep & { open?: { ways: string[] } };
        const k = classify(c, p.label, p.role, s, chain, profile, typed);
        if (k.cls !== 'n') rows.push({ from, path: chain.join(' > ') + (head(chain[chain.length - 1] ?? '') === head(c.asked) ? '' : ` > (${c.asked})`), label: p.label, role: p.role, end: s.end, follow: s.follow, ways: k.ways, cls: k.cls, why: k.why });
        // the screen leads on only after an answer (after the way out the ways show instead: core/more.ts)
        if (k.cls === 'n' || (!out && s.follow.length)) for (const n of s.follow) await walkCard(from, await card(n), [...chain, n]);
      }
    }
  };
  // 1. every topic on the first screen, every question in it
  for (const t of topics(profile)) for (const x of t.questions) if (!x.ai) await walkCard(t.label, await card(x.q), [x.q]);
  // 2. every question of the trees that no topic reaches first (the telling, the topic card, the rules' nearest cards),
  // as the screen words it; a question of the trees that is in neither list fails the test (none is skipped silently)
  const roots = [...TELL, TELL_DAY, WHAT_TOPIC, ...Object.values(NEAREST), 'Is it the news or something on TV?', 'Shall we put the TV on?'];
  for (const q of roots) { const c = await card(q); await walkCard('trees', c, [c.asked]); }
  const walked = new Set([...seen].flatMap((k) => k.split('|')[0].split('>')).concat([...seen].map((k) => head(k.split('|')[1]))));
  for (const k of TREE_QUESTIONS) if (!walked.has(norm(k))) rows.push({ from: 'trees', path: k, label: '', role: '', end: '', follow: [], ways: [], cls: 'd', why: 'a question of the trees the audit did not walk' });
  // 3. "Ask in your own words": a typed "want something?", and the rules' best card when the AI could not help
  for (const q of ['Would you like something?', 'Do you need anything?', 'Do you want something?', 'I would like to something?', 'Is there anything you would like?']) {
    const c = await ownCard(q, env(profile));
    if (!c.blocked) await walkCard('own words', c, [q], true);
  }
  for (const q of ['What would you like?', 'What would you like to eat?', 'What do you want to watch?', 'Who do you want to see?', 'Where shall we go today?', 'What would help you rest?']) {
    const blocked = await makeCard(q, env(profile));
    const c = blocked.blocked ? await ownFallbackCard(q, blocked, 'none', env(profile)) : blocked;
    await walkCard('own words, the rules\' card', c, [q]);
  }
  // 4. the cards of more choices (after the way out): every choice on the first page
  for (const sub of MORE_SUBJECTS) { const c = moreCard(sub, [], profile); if (c) await walkCard('more choices', c, [c.asked]); }
  return rows;
}

const count = (rows: Row[]) => ({ a: rows.filter((r) => r.cls === 'a').length, b: rows.filter((r) => r.cls === 'b').length, c: rows.filter((r) => r.cls === 'c').length, w: rows.filter((r) => r.cls === 'w').length, d: rows.filter((r) => r.cls === 'd').length });
const cell = (s: string) => s.replace(/\|/g, '/');

describe('17b. the dead-end audit: every topic, every question, every answer, every way out', () => {
  it('no answer ends on a kind of thing, a yes to wanting, or a question that is no button, without a way on', async () => {
    const empty = await audit(EMPTY_PROFILE);
    const family = await audit(SAMPLE_PROFILE);
    const out = process.env.AUDIT_OUT;
    if (out) {
      const table = (name: string, rows: Row[]) => {
        const n = count(rows);
        return `## ${name}: ${rows.length} ends (a ${n.a}, b ${n.b}, c ${n.c}, w ${n.w}, d ${n.d})\n\n| class | from | path | answer | end line | next / ways | why |\n|---|---|---|---|---|---|---|\n${rows.map((r) => `| ${r.cls} | ${cell(r.from)} | ${cell(r.path)} | ${cell(r.label)} | ${cell(r.end)} | ${cell([...r.follow, ...r.ways.map((w) => `[${w}]`)].join('; '))} | ${cell(r.why)} |`).join('\n')}\n`;
      };
      writeFileSync(out, `# Dead-end audit (phase 17b)\n\nWritten by tests/unit/phase17-deadends.test.ts (AUDIT_OUT=...). Classes: (a) a thing to do, (b) a deliberate stop, (c) health: red box or call line, (w) the way out: the screen of ways follows, (d) dead end.\n\n${table('Nothing in About them', empty)}\n${table('The sample family (Frank)', family)}`);
    }
    process.stderr.write(`dead-end audit: empty ${JSON.stringify(count(empty))}, family ${JSON.stringify(count(family))}\n`);
    expect(empty.length).toBeGreaterThan(200);
    const dead = [...empty, ...family].filter((r) => r.cls === 'd').map((r) => `${r.path} [${r.label}] "${r.end}" (${r.why})`);
    expect(dead).toEqual([]);
  }, 60000);
});

describe('17b. the owner\'s paths, and the screen that draws the ways', () => {
  const P = SAMPLE_PROFILE;
  const x = (chain: string[], out = false) => ({ profile: P, chain, number: '911', red: null, out });
  const yes = { label: 'yes', role: 'answer' };
  it('typed "want something?" > food or drink > hungry > yes, at the depth limit: what to do, and the ways to find which one inside food', async () => {
    const c = await makeCard('Are you hungry?', env(P));
    const s = answerStep(c, yes, x(['Would you like something?', WHAT_TOPIC, 'Are you hungry?']));
    expect(s.follow).toEqual([]);
    expect(s.end).toBe('Bring Frank something to eat.');
    expect(s.open?.ways).toEqual(['more', 'letter', 'show']);
    expect(s.open?.topic).toBe('food');
    expect(s.open?.moreFirst.length).toBe(3);
    // as the first question, a yes still leads on (the ways are only for when no question is left)
    expect(answerStep(c, yes, x(['Are you hungry?'])).follow).toEqual(['Would you like a snack or a meal?']);
    expect(answerStep(c, yes, x(['Are you hungry?'])).open).toBeUndefined();
  });
  it('"Did something happen?" no: the topic card follows, never a question that is no button', async () => {
    const c = await makeCard('Did something happen?', env(P));
    expect(answerStep(c, { label: 'no', role: 'answer' }, x(['Did something happen?'])).follow).toEqual([WHAT_TOPIC]);
  });
  it('the rules\' nearest card for typed food words goes on: something to eat > a snack or a meal; something to drink > hot or cold', async () => {
    const c = await makeCard(NEAREST.food, env(P));
    expect(answerStep(c, { label: 'something to eat', role: 'answer' }, x(['What would you like to eat?'])).follow).toEqual(['Would you like a snack or a meal?']);
    expect(answerStep(c, { label: 'something to drink', role: 'answer' }, x(['What would you like to eat?'])).follow).toEqual(['Would you like a hot drink or a cold drink?']);
  });
  it('a word that was found leads on: a person of the family to call or see, a place to go; "something sweet" from more choices keeps the ways', () => {
    const letter = { asked: 'It starts with T. Is it one of these?', kind: 'choice' as const, letter: { letter: 'T', rejected: [], by: 'rules' as const } };
    expect(answerStep(letter, { label: 'Tyler', spoken: 'Tyler', role: 'answer' }, x(['Would you like company, or some time alone?'])).follow).toEqual(['Would you like to call Tyler?', 'Would you like to see Tyler?']);
    expect(answerStep(letter, { label: 'hardware store', spoken: 'hardware store', role: 'answer' }, x(['Would you like to stay in or go out?'])).follow).toEqual(['Would you like to go to hardware store?']);
    const more = moreCard('food', [], P)!;
    const s = answerStep(more, { label: 'something sweet', spoken: 'something sweet', role: 'answer' }, x([more.asked]));
    expect(s.open?.ways).toContain('letter');
    expect(s.open?.topic).toBe('food');
  });
  it('the screen draws "Which one? Find out together:" with the ways under the end line, and the letters and more choices read the open kind', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const ROOT = join(__dirname, '..', '..');
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    const simple = readFileSync(join(ROOT, 'web/src/simple.ts'), 'utf8');
    const { P17 } = await import('../../core/copy17');
    expect(P17.openLead).toBe('Which one? Find out together:');
    expect(main).toContain('p17open = !out && !step0.alert && !step0.follow.length && step0.open ? step0.open : null;');
    expect(main).toContain("const opened = !lead && state.picked?.role === 'answer' && p17open?.subject ? p17open.subject : null;");
    expect(main).toContain('? p17open.topic : chainTopic(asked);');
    expect(simple).toContain("${end}${!m.out && !lead && m.openHtml ? m.openHtml : ''}");
  });
});
