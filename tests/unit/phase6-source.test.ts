// Phase 6, part D (18 Nov 2026): every line of "What stands out" and of "Since the last visit" can show the diary
// entries it was counted from. Pinned here: for every insight id the ids returned are exactly the entries the rule
// counted (with the 20-minute "a card and a tap count once" merge), the screen only draws them, nothing of it is
// printed or handed to a model, and an opened line keeps its "whom to tell" sentence and its call box.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P6 } from '../../core/copy6';
import { SAME_EVENT_MS, eventGroups, events, inSpan, tags, type DiaryEntry, type LogKind, type Tag } from '../../core/diary';
import { NO_HEALTH, cloudLines, insightCloudText, insightDevicePrompt, insights, type HealthNotes, type Insight } from '../../core/insights';
import { sinceLines } from '../../core/since';
import { insightsBlock } from '../../web/src/diary';
import { sinceBlock } from '../../web/src/phase5';
import { sourceBlock } from '../../web/src/phase6';
import { NOW, WEEK, weekDiary, when } from './week';

const ROOT = join(__dirname, '..', '..');
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const H = (h: Partial<HealthNotes>): HealthNotes => ({ ...NO_HEALTH, ...h });
const TOPIC: Record<LogKind, DiaryEntry['topic']> = { drank: 'food', ate: 'food', toilet: 'body', slept: 'rest', pain: 'body', fall: 'body', tablets: 'body' };
const log = (id: string, k: LogKind, d: number, t: string, label: string = k): DiaryEntry => ({ id, at: when(d, t), kind: 'log', log: k, label, topic: TOPIC[k] });
const ans = (id: string, q: string, label: string, d: number, t: string, topic: DiaryEntry['topic'] = 'body', lessSure = false): DiaryEntry => ({ id, at: when(d, t), kind: 'answer', q, label, topic, ...(lessSure ? { lessSure: true } : {}) });
/** A plain day: three drinks and three meals logged. Ids "d<day>-<n>". */
const plain = (d: number): DiaryEntry[] => [['08:00', 'drank'], ['08:30', 'ate'], ['12:00', 'drank'], ['12:30', 'ate'], ['17:00', 'drank'], ['18:00', 'ate']].map(([t, k], i) => log(`d${d}-${i}`, k as LogKind, d, t));
const days = (...ds: number[]) => ds.flatMap(plain);
const line = (xs: Insight[], id: Insight['id']) => { const x = xs.find((l) => l.id === id); if (!x) throw new Error(`no ${id} line among ${xs.map((l) => l.id).join(', ')}`); return x; };

/** The count as it was written before phase 6 (core/diary.ts, `events`), kept here word for word as the reference. */
function eventsBefore(entries: DiaryEntry[], tag: Tag): number[] {
  const hits = [...entries].filter((e) => tags(e).includes(tag)).sort((a, b) => a.at - b.at);
  const logs = hits.filter((e) => e.kind === 'log').map((e) => ({ at: e.at, paired: false }));
  const out = logs.map((l) => l.at);
  let lastCard = -Infinity;
  for (const e of hits) {
    if (e.kind === 'log') continue;
    if (e.at - lastCard < SAME_EVENT_MS) { lastCard = e.at; continue; }
    lastCard = e.at;
    const near = logs.filter((l) => !l.paired && Math.abs(l.at - e.at) < SAME_EVENT_MS).sort((a, b) => Math.abs(a.at - e.at) - Math.abs(b.at - e.at))[0];
    if (near) near.paired = true; else out.push(e.at);
  }
  return out.sort((a, b) => a - b);
}

describe('the count and its entries are one thing (core/diary.ts, eventGroups)', () => {
  const ALL: Tag[] = ['drink', 'food', 'sweet', 'toilet', 'sleep', 'bad-sleep', 'pain', 'tired', 'fall', 'tablets', 'low-mood'];
  it('the same moments as the count before phase 6, on the week fixture and on 300 made-up days', () => {
    for (const t of ALL) expect(events(weekDiary(), t), t).toEqual(eventsBefore(weekDiary(), t));
    let seed = 7;
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    for (let run = 0; run < 300; run++) {
      const d: DiaryEntry[] = [];
      for (let i = 0; i < 2 + rnd(12); i++) {
        const t = `${String(7 + rnd(3)).padStart(2, '0')}:${String(rnd(60)).padStart(2, '0')}`;
        d.push(rnd(2) ? log(`r${i}`, 'drank', 0, t) : rnd(2) ? ans(`r${i}`, 'Would you like tea or coffee?', 'tea', 0, t, 'food') : ans(`r${i}`, 'Would you like something to drink?', 'yes', 0, t, 'food'));
      }
      expect(events(d, 'drink'), JSON.stringify(d)).toEqual(eventsBefore(d, 'drink'));
      const g = eventGroups(d, 'drink');
      // every drink entry is behind exactly one event
      expect(g.flatMap((x) => x.ids).sort()).toEqual(d.map((e) => e.id).sort());
    }
  });
  it('a card and a tap within 20 minutes are one event with both entries behind it, the tap first; 20 minutes apart they are two', () => {
    const card = ans('c', 'Would you like tea or coffee?', 'tea', 0, '08:00', 'food');
    expect(eventGroups([card, log('l', 'drank', 0, '08:19')], 'drink')).toEqual([{ at: when(0, '08:19'), ids: ['l', 'c'] }]);
    expect(eventGroups([card, log('l', 'drank', 0, '08:20')], 'drink').map((g) => g.ids)).toEqual([['c'], ['l']]);
  });
  it('the answers of one conversation are one event: "something to drink? yes", then "tea"', () => {
    const g = eventGroups([ans('a', 'Would you like something to drink?', 'yes', 0, '09:00', 'food'), ans('b', 'Would you like tea or coffee?', 'tea', 0, '09:01', 'food'), log('l', 'drank', 0, '15:00')], 'drink');
    expect(g.map((x) => x.ids)).toEqual([['a', 'b'], ['l']]);
  });
});

describe('every insight id returns exactly the entries its rule counted', () => {
  it('pain: every pain entry of the span, and nothing else', () => {
    const d = [...days(0, 1, 2), ans('p0', 'Are you in pain?', 'yes', 0, '09:00'), ans('p1', 'Are you in pain?', 'yes', 1, '09:00'), log('p2', 'pain', 2, '10:00'), ans('n', 'Are you in pain?', 'no', 2, '11:00')];
    const x = line(insights(d, NO_HEALTH, 'week', NOW), 'pain');
    expect(x.source).toEqual({ ids: ['p0', 'p1', 'p2'], once: [], note: '' });
  });
  it('pain-day: the strong answer and the place in the head or chest, on every such day; a plain "yes" is not among them', () => {
    const d = [...days(0, 1, 2), ans('y', 'Are you in pain?', 'yes', 2, '09:00'), ans('w', 'Where does it hurt?', 'chest', 2, '09:01'), ans('m', 'Where in the chest?', 'middle', 2, '09:02'), ans('b', 'How bad is the pain?', 'very bad', 2, '09:03'), ans('old', 'How bad is the pain?', 'quite bad', 0, '09:00')];
    const x = line(insights(d, NO_HEALTH, 'week', NOW), 'pain-day');
    expect(x.source).toEqual({ ids: ['old', 'w', 'm', 'b'], once: [], note: '' });
    expect(x.urgent).toBe(true);
  });
  it('no-drink: that day\'s entries, with the note "No drink among these."; none of them is a drink', () => {
    const d = [...days(0, 1), log('a1', 'ate', 2, '08:00'), log('t1', 'toilet', 2, '10:00'), log('a2', 'ate', 2, '18:00')];
    const x = line(insights(d, NO_HEALTH, 'week', NOW), 'no-drink');
    expect(x.source).toEqual({ ids: ['a1', 't1', 'a2'], once: [], note: 'No drink among these.' });
    expect(d.filter((e) => x.source.ids.includes(e.id)).some((e) => tags(e).includes('drink'))).toBe(false);
    // with a fluid limit noted the line is worded otherwise, and its entries are the same
    expect(line(insights(d, H({ fluidLimit: true }), 'week', NOW), 'no-drink').source).toEqual(x.source);
  });
  it('no-drink names three days at most, and the entries are those three days\'', () => {
    const d = [...days(0), ...[1, 2, 3, 4].map((n) => log(`a${n}`, 'ate', n, '08:00'))];
    const x = line(insights(d, NO_HEALTH, 'week', NOW), 'no-drink');
    expect(x.text).toContain('Wed 18 Nov, Thu 19 Nov and Fri 20 Nov');
    expect(x.source.ids).toEqual(['a2', 'a3', 'a4']);
  });
  it('few-drinks: the drinks of the day, a card and a tap within 20 minutes shown as both and counted once', () => {
    const d = [...days(0, 1), ans('c', 'Would you like tea or coffee?', 'tea', 2, '08:00', 'food'), log('l1', 'drank', 2, '08:05'), log('a', 'ate', 2, '12:00'), log('l2', 'drank', 2, '15:00')];
    const x = line(insights(d, NO_HEALTH, 'week', NOW), 'few-drinks');
    expect(x.text).toBe('Few drinks were entered on Wed 18 Nov: 2.');
    expect(x.source).toEqual({ ids: ['c', 'l1', 'l2'], once: ['c'], note: '' });
    expect(x.source.ids.length - x.source.once.length).toBe(2);
  });
  it('few-drinks on two days with the same count: both days\' drinks', () => {
    const d = [...days(0), log('x1', 'drank', 1, '08:00'), log('xa', 'ate', 1, '09:00'), log('y1', 'drank', 2, '08:00'), log('ya', 'ate', 2, '09:00')];
    const x = line(insights(d, NO_HEALTH, 'week', NOW), 'few-drinks');
    expect(x.text).toBe('Few drinks were entered on Tue 17 Nov and Wed 18 Nov: 1 each.');
    expect(x.source.ids).toEqual(['x1', 'y1']);
  });
  it('many-drinks (a fluid limit is noted): the drinks of that day', () => {
    const many = Array.from({ length: 8 }, (_, i) => log(`m${i}`, 'drank', 2, `${String(8 + i).padStart(2, '0')}:00`));
    const d = [...days(0, 1), ...many, log('a', 'ate', 2, '12:30')];
    const x = line(insights(d, H({ fluidLimit: true }), 'week', NOW), 'many-drinks');
    expect(x.source).toEqual({ ids: many.map((e) => e.id), once: [], note: '' });
  });
  it('sweets: every sweet choice; two answers of one conversation are shown as both and counted once', () => {
    const sweet = (id: string, dd: number, t: string) => ans(id, 'Would you like something sweet or something savoury?', 'something sweet', dd, t, 'food');
    const d = [...days(0, 1, 2), sweet('s1', 0, '10:00'), ans('s1b', 'Would you like a biscuit or cake?', 'cake', 0, '10:02', 'food'), sweet('s2', 1, '10:00'), sweet('s3', 2, '10:00')];
    const x = line(insights(d, H({ diabetes: true }), 'week', NOW), 'sweets');
    expect(x.text).toBe('Something sweet was chosen 3 times in the last 7 days.');
    expect(x.source).toEqual({ ids: ['s1', 's1b', 's2', 's3'], once: ['s1b'], note: '' });
  });
  it('no-food (swallowing difficulty is noted): that day\'s entries, with "No food among these."', () => {
    const d = [...days(0, 1), log('k1', 'drank', 2, '08:00'), log('k2', 'drank', 2, '12:00'), log('k3', 'drank', 2, '17:00')];
    const x = line(insights(d, H({ swallowing: true }), 'week', NOW), 'no-food');
    expect(x.source).toEqual({ ids: ['k1', 'k2', 'k3'], once: [], note: 'No food among these.' });
  });
  it('sleep: the "bad" answers to "How did you sleep?"', () => {
    const d = [...days(0, 1, 2), ...[0, 1, 2].map((n) => ans(`z${n}`, 'How did you sleep?', 'bad', n, '07:30', 'rest')), ans('ok', 'How did you sleep?', 'well', 3, '07:30', 'rest')];
    expect(line(insights(d, NO_HEALTH, 'week', NOW), 'sleep').source).toEqual({ ids: ['z0', 'z1', 'z2'], once: [], note: '' });
  });
  it('mood: the "sad" and "bad" answers to "How are you feeling today?"', () => {
    const d = [...days(0, 1, 2), ans('f0', 'How are you feeling today?', 'sad', 0, '10:00', 'feel'), ans('f1', 'How are you feeling today?', 'bad', 1, '10:00', 'feel'), ans('f2', 'How are you feeling today?', 'sad', 2, '10:00', 'feel'), ans('g', 'How are you feeling today?', 'good', 3, '10:00', 'feel')];
    expect(line(insights(d, NO_HEALTH, 'week', NOW), 'mood').source).toEqual({ ids: ['f0', 'f1', 'f2'], once: [], note: '' });
  });
  it('fall: every "Fall" tap, with the blow to the head', () => {
    const d = [...days(0, 1, 2), log('fa', 'fall', 1, '14:00'), log('fb', 'fall', 2, '09:00', 'fall: hit head')];
    const x = line(insights(d, NO_HEALTH, 'week', NOW), 'fall');
    expect(x.source).toEqual({ ids: ['fa', 'fb'], once: [], note: '' });
    expect(x.urgent).toBe(true);
  });
  it('less-sure: the answers the answer check marked', () => {
    const d = [...days(0, 1, 2), ...['u1', 'u2', 'u3'].map((id, i) => ans(id, 'Would you like to watch TV?', 'yes', 2, `14:0${i}`, 'fun', true)), ans('sure', 'Would you like to watch TV?', 'no', 2, '16:00', 'fun')];
    expect(line(insights(d, NO_HEALTH, 'week', NOW), 'less-sure').source).toEqual({ ids: ['u1', 'u2', 'u3'], once: [], note: '' });
  });
  it('"nothing stands out" has no entries behind it, and no button', () => {
    const xs = insights(days(0, 1, 2, 3, 4, 5), NO_HEALTH, 'week', NOW);
    expect(xs.map((x) => x.id)).toEqual(['nothing']);
    expect(xs[0].source).toEqual({ ids: [], once: [], note: '' });
    expect(insightsBlock({ span: 'week', lines: xs, words: null, source: 'rules', busy: false, note: '', cloud: null, diary: days(0, 1, 2, 3, 4, 5), now: NOW })).not.toContain('src-toggle');
  });
  it('the 30-day view keeps a line of the last 7 days with its entries', () => {
    const d = [...days(0, 1, 2), log('fa', 'fall', 1, '14:00')];
    const x = line(insights(d, NO_HEALTH, 'month', NOW), 'fall');
    expect(x.source.ids).toEqual(['fa']);
  });
  it('on the week fixture: every line\'s entries are in the span, oldest first, each once; a counted line counts what its text says', () => {
    const diary = weekDiary();
    const span = inSpan(diary, 'week', NOW);
    const at = new Map(span.map((e) => [e.id, e.at]));
    const xs = insights(diary, WEEK.health, 'week', NOW);
    expect(xs.length).toBeGreaterThan(2);
    for (const x of xs) {
      expect(x.source.ids.length, x.id).toBeGreaterThan(0);
      expect(new Set(x.source.ids).size, x.id).toBe(x.source.ids.length);
      expect(x.source.ids.every((id) => at.has(id)), x.id).toBe(true);
      expect(x.source.ids.map((id) => at.get(id)!), x.id).toEqual([...x.source.ids.map((id) => at.get(id)!)].sort((a, b) => a - b));
      expect(x.source.once.every((id) => x.source.ids.includes(id)), x.id).toBe(true);
    }
    const few = line(xs, 'few-drinks');
    expect(few.source.ids.length - few.source.once.length).toBe(WEEK.expect.fewDrinks);
    const sweets = line(xs, 'sweets');
    expect(sweets.source.ids.length - sweets.source.once.length).toBe(WEEK.expect.sweets);
    expect(line(xs, 'less-sure').source.ids.length).toBe(WEEK.expect.lessSure);
  });
  it('no model is handed an entry id: the text for online help and the on-device prompt are the lines only', () => {
    const d = [...days(0, 1), log('zz-secret-1', 'drank', 2, '08:00'), log('zz-secret-2', 'ate', 2, '12:00')];
    const xs = insights(d, NO_HEALTH, 'week', NOW);
    expect(xs.some((x) => x.source.ids.includes('zz-secret-1'))).toBe(true);
    expect(insightCloudText(xs)).not.toContain('zz-secret');
    expect(insightDevicePrompt(xs, NO_HEALTH)).not.toContain('zz-secret');
    expect(JSON.stringify(cloudLines(xs).map((l) => l.text))).not.toContain('zz-secret');
  });
});

describe('"Since the last visit": the same, line by line', () => {
  const d = [...days(0, 1), log('a1', 'ate', 2, '08:00'), ans('p', 'Are you in pain?', 'yes', 2, '09:00'), ans('b', 'How bad is the pain?', 'very bad', 2, '09:01'), log('fa', 'fall', 3, '14:00', 'fall: hit head'), log('k', 'drank', 3, '15:00'), ans('f', 'How are you feeling today?', 'sad', 3, '16:00', 'feel'), ans('z', 'How did you sleep?', 'bad', 4, '07:30', 'rest'), log('k2', 'drank', 4, '08:00')];
  const s = sinceLines(d, when(0, '00:00'), NOW);
  it('one source for each line, in the same order', () => {
    expect(s.sources.length).toBe(s.lines.length);
    const of = (start: string) => s.sources[s.lines.findIndex((l) => l.startsWith(start))];
    expect(of('Pain:')).toEqual({ ids: ['p', 'b'], note: '' });
    expect(of('Strong pain')).toEqual({ ids: ['b'], note: '' });
    expect(of('Falls:')).toEqual({ ids: ['fa'], note: '' });
    expect(of('Drinks:')).toEqual({ ids: ['a1', 'p', 'b'], note: 'No drink among these.' });
    expect(of('Mood:')).toEqual({ ids: ['f'], note: '' });
    expect(of('Sleep:')).toEqual({ ids: ['z'], note: '' });
  });
  it('a line that counted nothing has no entries and no button; an empty diary has one line and no button', () => {
    const calm = sinceLines(days(0, 1, 2), when(0, '00:00'), NOW);
    expect(calm.sources.map((x) => x.ids.length)).toEqual([0, 0, 0, 0, 0]);
    expect(sinceBlock({ name: 'Frank', since: calm, picked: [], number: '911', diary: days(0, 1, 2) })).not.toContain('src-toggle');
    const none = sinceLines([], null, NOW);
    expect(none.sources).toEqual([{ ids: [], note: '' }]);
  });
  it('on the page: "See the entries (N)" under a line that has entries, opened in place, and not printed', () => {
    const closed = sinceBlock({ name: 'Frank', since: s, picked: [], number: '911', open: [], diary: d });
    expect(text(closed)).toContain('Falls: 1 logged (Thu 19 Nov). See the entries (1)');
    expect(closed).not.toContain('class="src"');
    const i = s.lines.findIndex((l) => l.startsWith('Drinks:'));
    const open = sinceBlock({ name: 'Frank', since: s, picked: [], number: '911', open: [i], diary: d });
    expect(text(open)).toContain('Hide the entries No drink among these. Wed 18 Nov 08:00 Ate 09:00 Are you in pain? yes 09:01 How bad is the pain? very bad');
    // every part of it is inside a block that the print style hides
    expect(open.match(/class="src-wrap no-print"/g)!.length).toBe(s.sources.filter((x) => x.ids.length).length);
    const css = readFileSync(join(ROOT, 'web/src/simple.css'), 'utf8');
    expect(css).toMatch(/@media print \{ \.simple \.src-wrap \{ display: none !important; \} \}/);
    expect(css).toMatch(/@media print \{\s*\.simple \.s-top, \.simple \.no-print, \.update-bar \{ display: none !important; \}/);
  });
});

describe('the screen only draws them (web/src/phase6.ts)', () => {
  const d = [...days(0, 1), ans('c', 'Would you like tea or coffee?', 'tea', 2, '08:00', 'food'), log('l1', 'drank', 2, '08:05'), log('a', 'ate', 2, '12:00'), log('l2', 'drank', 2, '15:00'), ans('w', 'Where does it hurt?', 'chest', 2, '16:00'), log('fa', 'fall', 2, '17:00', 'fall: hit head')];
  const xs = insights(d, NO_HEALTH, 'week', NOW);
  const model = (open: string[]) => ({ span: 'week' as const, lines: xs, words: null, source: 'rules' as const, busy: false, note: '' as const, cloud: null, number: '911', open, diary: d, now: NOW });
  it('closed: "See the entries (N)" under every line, with the number of entries; nothing else is drawn', () => {
    const html = insightsBlock(model([]));
    for (const x of xs) expect(html).toContain(`data-src="${x.id}" aria-expanded="false" aria-controls="src-${x.id}">See the entries (${x.source.ids.length})</button>`);
    expect(html).not.toContain('class="src"');
  });
  it('open: by day, the time, the question and the answer, or the log; "Hide the entries"; the merged entry says it was counted once', () => {
    const html = insightsBlock(model(['few-drinks']));
    const part = html.slice(html.indexOf('id="src-few-drinks"'));
    expect(text(html)).toContain('Hide the entries Wed 18 Nov 08:00 Would you like tea or coffee? tea counted once with the entry beside it (within 20 minutes) 08:05 Drank 15:00 Drank');
    expect(part).toContain('<li class="de answer" data-entry="c" data-once="1">');
    expect(html).toContain('data-src="few-drinks" aria-expanded="true"');
    // the other lines stay closed
    expect(html.match(/class="src"/g)!.length).toBe(1);
  });
  it('worst case: an opened line about chest pain or a fall with a blow to the head keeps its sentence and its call box above the entries', () => {
    const html = insightsBlock(model(['pain-day', 'fall']));
    for (const id of ['pain-day', 'fall']) {
      const li = html.slice(html.indexOf(`data-id="${id}"`), html.indexOf('</li>', html.indexOf(`id="src-${id}"`)));
      expect(li.indexOf('class="ins-act"')).toBeGreaterThan(0);
      expect(li.indexOf(`id="urgent-${id}"`)).toBeGreaterThan(li.indexOf('class="ins-act"'));
      expect(li.indexOf(`id="src-${id}"`)).toBeGreaterThan(li.indexOf(`id="urgent-${id}"`));
      expect(text(li)).toContain('Call 911 now if this is new or sudden.');
    }
    expect(text(html)).toContain('17:00 Fall Noted: a blow to the head.');
    expect(text(html)).toContain('16:00 Where does it hurt? chest');
  });
  it('an entry that was undone since is not drawn, and the block says so; a line with no entries draws nothing', () => {
    const html = sourceBlock({ key: 'fall', open: true, ids: ['fa', 'gone'], once: [], note: '', diary: d, now: NOW });
    expect(text(html)).toContain('17:00 Fall');
    expect(text(html)).toContain(P6.source.gone);
    expect(sourceBlock({ key: 'x', open: true, ids: [], once: [], note: '', diary: d, now: NOW })).toBe('');
  });
  it('what an entry holds is escaped', () => {
    const evil = [ans('e', '<img src=x onerror=alert(1)>?', '<b>tea</b>', 2, '08:00', 'food')];
    const html = sourceBlock({ key: 'k', open: true, ids: ['e'], once: [], note: '', diary: evil, now: NOW });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;b&gt;tea&lt;/b&gt;');
  });
  it('the words: nothing that plays a line down, no exclamation mark', () => {
    const all = [P6.source.see(3), P6.source.hide, P6.source.noDrink, P6.source.noFood, P6.source.once, P6.source.gone].join(' ');
    expect(all).not.toMatch(/\bjust\b|\bonly\b|\bfine\b|nothing to worry|probably|simply|!/i);
  });
});
