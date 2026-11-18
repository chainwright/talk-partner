// The carer's screens of phase 3 as markup (web/src/diary.ts, web/src/simple.ts): the diary, what stands out, the
// tip, health notes and "Keep a copy" in About them, the guard's line on the carer's screens. And what must never be:
// a score, a count or any of this on the person's screen; medical advice anywhere.
import { describe, expect, it } from 'vitest';
import { makeBackup, previewOf } from '../../core/backup';
import { COPY } from '../../core/copy';
import { inSpan } from '../../core/diary';
import { NO_HEALTH, insights } from '../../core/insights';
import { needsCard } from '../../core/needs';
import { tipOfDay } from '../../core/tip';
import { EMPTY_PROFILE } from '../../core/types';
import { backupBlock, diaryLink, diaryScreen, guardBlock, importSheet, insightsBlock, tipBlock, type DiaryModel } from '../../web/src/diary';
import { aboutSimple, homeScreen, personSimple } from '../../web/src/simple';
import { NOW, WEEK, weekDiary } from './week';

const S = COPY.simple;
const count = (html: string, part: string) => html.split(part).length - 1;
/** As the screens write it: an apostrophe is escaped. */
const h = (t: string) => t.replace(/'/g, '&#39;');
const lines = insights(weekDiary(), WEEK.health, 'week', NOW);
const model = (o: Partial<DiaryModel> = {}): DiaryModel => ({
  name: 'Frank', tab: 'week', topic: 'all', now: NOW, entries: inSpan(weekDiary(), 'week', NOW), any: true, logged: null,
  insights: { span: 'week', lines, words: null, source: 'rules', busy: false, note: '', cloud: 'ask' }, tip: { tip: null, words: null, off: false }, copied: false, deleted: false, ...o,
});

describe('the diary screen', () => {
  const html = diaryScreen(model());
  it('five one-tap log buttons, three tabs, a topic filter, Back and Home, and the line that it stays on this device', () => {
    expect(count(html, 'data-act="log"')).toBe(5);
    for (const k of ['drank', 'ate', 'toilet', 'slept', 'pain']) expect(html).toContain(`data-log="${k}"`);
    expect(count(html, 'role="tab"')).toBe(3);
    expect(html).toContain('id="tab-week" data-act="diary-tab" data-tab="week" aria-selected="true"');
    expect(count(html, '<option')).toBe(9);
    expect(html).toContain('data-act="back"');
    expect(html).toContain('data-act="home"');
    expect(html).toContain(h(S.diary.lock('Frank')));
    expect(html).toContain('never shown on Frank&#39;s screen');
    expect(html).toContain('answers Frank confirmed, needs Frank pointed to');
    expect(html).toContain("<h1>Frank&#39;s diary</h1>");
  });
  it('the timeline: a section per day, the newest first, each entry with its time; "less sure" is said on the entry', () => {
    expect(count(html, '<section class="day"')).toBe(7);
    expect(html.indexOf('Today · Sun 22 Nov')).toBeLessThan(html.indexOf('Yesterday · Sat 21 Nov'));
    expect(html.indexOf('Sat 21 Nov')).toBeLessThan(html.indexOf('Mon 16 Nov'));
    expect(html).toContain('<time>07:40</time><span class="what"><span class="q">Would you like tea or coffee?</span> <b>tea</b></span>');
    expect(html).toContain('<time>10:30</time><span class="what"><b>Drank</b></span>');
    expect(count(html, 'data-less-sure="1"')).toBe(5);
    expect(count(html, `class="tag unsure">${S.guard.lessSure}<`)).toBe(5);
  });
  it('what stands out: the level, the line, its base, who worded it, the fixed footer', () => {
    expect(count(html, '<li class="ins ')).toBe(3);
    expect(html).toContain('data-id="sweets" data-level="mention"');
    expect(html).toMatch(/Worth mentioning to the doctor or nurse<\/span><p class="ins-text">Something sweet was chosen 3 times in the last 7 days\. <span class="noted">Diabetes is noted here\.<\/span><\/p><p class="ins-base">Chosen 3 times in 7 days\. Only what was entered here\.<\/p>/);
    expect(html).toContain('Few drinks were entered on Wed 18 Nov: 2.');
    expect(html).toContain('Chosen or logged 2 times that day. Only what was entered here.');
    expect(html).toContain(h(S.insights.by.rules));
    expect(html).toContain(S.insights.footer);
    expect(html).toContain('id="ins-plainer"');
  });
  it('today has no "what stands out" (a day is too little to count), and shows the tip instead', () => {
    const tip = tipOfDay([1, 2, 3].map((n) => ({ at: NOW - n * 60000, open: false, two: n === 1, quiz: false, again: false })), NOW);
    const today = diaryScreen(model({ tab: 'today', insights: null, entries: inSpan(weekDiary(), 'today', NOW), tip: { tip, words: null, off: false } }));
    expect(today).not.toContain('id="insights"');
    expect(today).toContain('id="day-tip"');
    expect(today).toContain("One of today&#39;s questions asked two things at once.");
    expect(today).toContain('From your 3 questions today. About the questions, never about them.');
    expect(diaryScreen(model({ tab: 'week' }))).not.toContain('id="day-tip"');
  });
  it('an empty diary says so, and has nothing to copy or delete', () => {
    const empty = diaryScreen(model({ entries: [], any: false, insights: { span: 'week', lines: [], words: null, source: 'rules', busy: false, note: '', cloud: null } }));
    expect(empty).toContain(S.diary.empty.week);
    expect(empty).toContain(S.insights.empty);
    expect(empty).not.toContain('data-act="diary-del"');
    expect(diaryScreen(model({ entries: [], topic: 'people' }))).toContain(S.diary.emptyTopic);
    expect(html).toContain('data-act="diary-del"');
    expect(html).toContain('data-act="diary-copy"');
  });
  it('after a tap on the log: what was logged, the time, and "Undo"', () => {
    const logged = diaryScreen(model({ logged: { id: 'd1', log: 'drank', at: new Date(2026, 10, 22, 14, 2).getTime() } }));
    expect(logged).toContain('Logged: Drank, 14:02.');
    expect(logged).toContain('data-act="log-undo" data-id="d1"');
  });
  it('markup in a question or a name stays text', () => {
    const e = [{ id: 'x', at: NOW - 1000, kind: 'answer' as const, q: '<img src=x onerror=alert(1)>?', label: '<b>tea</b>', topic: 'other' as const }];
    const out = diaryScreen(model({ name: '<i>Al</i>', entries: e }));
    expect(out).not.toContain('<img src=x');
    expect(out).not.toContain('<b>tea</b>');
    expect(out).not.toContain('<i>Al</i>');
  });
});

describe('who worded the lines', () => {
  const base = { span: 'week' as const, lines, busy: false, note: '' as const, cloud: null };
  it('a model\'s words replace the line\'s text only: the level, the health note and the base stay the rules\' own', () => {
    const html = insightsBlock({ ...base, words: ['Sweet things were picked 3 times this week.', null, null], source: 'on-device' });
    expect(html).toContain('<p class="ins-text">Sweet things were picked 3 times this week. <span class="noted">Diabetes is noted here.</span></p><p class="ins-base">Chosen 3 times in 7 days. Only what was entered here.</p>');
    expect(html).toContain('Few drinks were entered on Wed 18 Nov: 2.');
    expect(html).toContain(h(S.insights.by.device));
    expect(html).toContain('data-source="on-device"');
    expect(html).toContain(S.insights.footer);
  });
  it('online help: offered only where it can run, said when it was used, and said when it failed', () => {
    expect(insightsBlock({ ...base, words: null, source: 'rules' })).not.toContain('ins-plainer');
    expect(insightsBlock({ ...base, words: null, source: 'rules', cloud: 'offline' })).toContain(S.insights.plainerOffline);
    expect(insightsBlock({ ...base, words: ['a', 'b', 'c'], source: 'in-cloud', cloud: 'ask' })).toContain(h(S.insights.by.cloud));
    expect(insightsBlock({ ...base, words: ['a', 'b', 'c'], source: 'in-cloud', cloud: 'ask' })).not.toContain('ins-plainer');
    expect(insightsBlock({ ...base, words: null, source: 'rules', note: 'failed', cloud: 'ask' })).toContain('may have left');
    expect(insightsBlock({ ...base, words: null, source: 'rules', note: 'notSent', cloud: 'ask' })).toContain('Nothing was sent.');
    expect(S.insights.by.failed).not.toMatch(/nothing was sent/i);
  });
  it('the tip can be hidden, and then only the way to show it again is there', () => {
    const tip = tipOfDay([1, 2, 3].map((n) => ({ at: NOW - n * 60000, open: false, two: false, quiz: false, again: false })), NOW);
    expect(tipBlock({ tip, words: null, off: true })).toBe(`<button type="button" class="tlink" id="tip-show" data-act="tip-toggle">${S.dayTip.show}</button>`);
    expect(tipBlock({ tip: null, words: null, off: false })).toBe('');
    expect(tipBlock({ tip, words: 'Every question today was about one thing, 3 in all.', off: false })).toContain(S.dayTip.device);
  });
});

describe('About them: health notes and "Keep a copy"', () => {
  it('the health row: four toggles and free text, and the line that it is never sent', () => {
    const html = aboutSimple({ profile: WEEK.profile, open: 'health', saved: false, health: WEEK.health });
    expect(count(html, 'type="checkbox" data-health=')).toBe(4);
    expect(html).toContain('data-health="diabetes" checked');
    expect(html).toContain('data-health="fluidLimit" >');
    expect(html).toContain('Type 2 diabetes, diet only. Dr Patel on Monday.</textarea>');
    expect(html).toContain(S.health.lock);
    expect(html).toContain(S.health.lead);
    const closed = aboutSimple({ profile: WEEK.profile, open: null, saved: false, health: WEEK.health });
    expect(closed).toContain('Diabetes, Type 2 diabetes, diet only. Dr Patel on');
    expect(aboutSimple({ profile: WEEK.profile, open: null, saved: false, health: NO_HEALTH })).toContain(S.health.none);
  });
  it('"Keep a copy": save, bring back, and where the file goes', () => {
    const html = backupBlock({ error: '', done: false });
    expect(html).toContain('data-act="backup-save"');
    expect(html).toContain('data-act="backup-load"');
    expect(html).toContain('type="file" id="backup-file" accept="application/json,.json" hidden');
    expect(html).toContain(S.backup.lock);
    expect(backupBlock({ error: S.backup.bad.kind, done: false })).toContain('role="alert"');
    expect(aboutSimple({ profile: EMPTY_PROFILE, open: null, saved: false, backupHtml: html })).toContain('id="backup"');
  });
  it('the preview says what the file holds and that it replaces, above the two buttons', () => {
    const html = importSheet(previewOf(makeBackup(WEEK.profile, [], WEEK.health, NOW)));
    for (const t of ['The name: Frank', '3 people', '0 photos', '1 fact you kept', 'Health notes: diabetes, anything else to keep in mind', 'Saved on 22 Nov 2026']) expect(html).toContain(t);
    expect(html).toContain(S.backup.replaces);
    expect(html.indexOf('id="import-has"')).toBeLessThan(html.indexOf('data-act="import-yes"'));
  });
});

describe('carer\'s side only', () => {
  it('the first screen has the way into the diary under the questions, not above them', () => {
    const html = homeScreen({ name: '', aboutLink: false, busy: false, error: null, question: '', howOpen: true, topics: [], topicOpen: null, aiTag: '', ai: [], privacy: [], micHtml: '', voiceHtml: '', diaryHtml: diaryLink() });
    expect(html).toContain('href="#/diary"');
    expect(html.indexOf('id="ask"')).toBeLessThan(html.indexOf('id="diary-link"'));
    expect(html.indexOf('data-act="needs"')).toBeLessThan(html.indexOf('id="diary-link"'));
  });
  it('the person\'s screens hold no diary, no insight, no tip, no count and no mark, in any state', () => {
    const card = needsCard();
    const pic = () => '';
    const base = { card, busy: false, less: false, picked: null, confirmed: false, recap: false, answers: [{ topic: 'drink', label: 'tea' }], pic, waitPic: '', full: true };
    const all = [personSimple(base), personSimple({ ...base, picked: card.choices[1] }), personSimple({ ...base, picked: card.choices[1], confirmed: true }), personSimple({ ...base, recap: true }), personSimple({ ...base, less: true }), personSimple({ ...base, card: null })].join(' ');
    expect(all).not.toMatch(/diary|less sure|stands out|tip for you|logged|doctor|nurse|\d+ of \d+|times|score|%/i);
    expect(all).not.toMatch(/data-act="(?:log|diary|ins|tip|backup|import)/);
  });
  it('no screen of phase 3 gives medical advice: no diagnosis, no medicine, no dose, no diet', () => {
    const tip = tipOfDay([1, 2, 3].map((n) => ({ at: NOW - n * 60000, open: true, two: false, quiz: false, again: false })), NOW);
    const all = [diaryScreen(model({ tip: { tip, words: null, off: false } })), guardBlock({ name: 'Frank', flags: ['yes-run', 'same-position'] }), aboutSimple({ profile: WEEK.profile, open: 'health', saved: false, health: WEEK.health }).replace(/<textarea[^>]*data-health[\s\S]*?<\/textarea>/, '')].join(' ').replace(/<[^>]+>/g, ' ');
    expect(all).not.toMatch(/dehydrat|infection|\bdose|\bmg\b|medicine|medication|insulin|calorie|you should|you must|treatment|prescri/i);
    expect(all).toContain('not medical advice and not a diagnosis');
  });
});
