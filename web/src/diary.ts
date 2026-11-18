// The carer's screens of phase 3 (18 Nov 2026): the diary with its one-tap log, the week's and the month's insights,
// the tip of the day, the gentle line of the answer-reliability guard, the sheet that asks before the insight lines go
// to online help for their wording, and the copy of About them in a file. Carer's side only: nothing here is drawn on
// the person's screen (tests/unit/diary-view.test.ts).
// These functions only draw: every value is handed in by main.ts. No DOM here, so the markup is tested in Node. Every
// word a person reads comes from core/copy.ts.

import type { BackupPreview } from '../../core/backup';
import { COPY } from '../../core/copy';
import { LOG_KINDS, byDay, dayText, dayWord, timeText, type DiaryEntry, type DiaryTopic, type LogKind, type Span } from '../../core/diary';
import type { Insight, InsightSpan } from '../../core/insights';
import type { Flag } from '../../core/reliability';
import type { RewordSource } from '../../core/reword';
import type { Tip } from '../../core/tip';
import { TOPIC_BASE } from '../../core/topics';
import { builtinPicto } from './pictos';
import { SIGN, navBar } from './simple';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const deco = (id: string) => builtinPicto(id).replace(/role="img" aria-label="[^"]*"/, 'class="tp" aria-hidden="true" focusable="false"');
const BOOK = '<svg class="sg" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 14h52a8 8 0 018 8v60H26a8 8 0 01-8-8z"/><path d="M34 34h28M34 50h28M34 66h16"/></svg>';
const LOG_PIC: Record<LogKind, string> = { drank: 'drink', ate: 'food', toilet: 'toilet', slept: 'bed', pain: 'pain' };

/** The guard's line for the carer: gentle, about the moment. Empty when nothing was noticed. */
export function guardBlock(m: { name: string; flags: Flag[] }): string {
  if (!m.flags.length) return '';
  const G = COPY.simple.guard;
  const why = [m.flags.includes('yes-run') ? G.yes : '', m.flags.includes('same-position') ? G.place : ''].filter(Boolean).join(' ');
  // the headline and one line; why, and what else follows, under "More"
  return `<div class="guard" id="guard" role="status">${SIGN.info}<div><b>${esc(G.line(m.name))}</b><small>${esc(G.marked)}</small><details class="guard-more"><summary>${G.more}</summary><p>${esc(why)} ${esc(G.order)} ${esc(G.never)}</p></details></div></div>`;
}

/** The way into the diary from the first screen: under the questions, never above them. */
export function diaryLink(): string {
  const D = COPY.simple.diary;
  return `<a class="btn diary-link" id="diary-link" href="#/diary">${BOOK}<span><b>${D.open}</b><small>${D.openSub}</small></span></a>`;
}

export interface InsightsModel {
  span: InsightSpan;
  lines: Insight[];
  /** The lines in plainer words, by index (a model wrote them and code let them stand): null where the rules' own words stand. */
  words: (string | null)[] | null;
  source: RewordSource;
  /** The on-device model is writing. */
  busy: boolean;
  /** After online help was asked: what happened ('' when it was not asked). */
  note: '' | 'failed' | 'notSent' | 'refused';
  /** Online help can be asked for the wording here ('ask'), could if there were a connection ('offline'), or not at all (null: there is a model on the device, no project settings, or no line that may go). */
  cloud: 'ask' | 'offline' | null;
}

/** The week's or the month's lines: the level, the line, what it was counted from; who worded them; the fixed footer. */
export function insightsBlock(m: InsightsModel | null): string {
  if (!m) return '';
  const I = COPY.simple.insights;
  const line = (x: Insight, i: number) => `<li class="ins ${x.level}" data-id="${x.id}" data-level="${x.level}">${x.id === 'nothing' ? '' : `<span class="lvl">${x.level === 'note' ? SIGN.info : SIGN.person}${I.level[x.level]}</span>`}<p class="ins-text">${esc(m.words?.[i] ?? x.text)}${x.noted ? ` <span class="noted">${esc(x.noted)}</span>` : ''}</p><p class="ins-base">${esc(x.base)}</p></li>`;
  const by = m.busy ? I.by.busy : m.note ? I.by[m.note] : m.source === 'on-device' ? I.by.device : m.source === 'in-cloud' ? I.by.cloud : I.by.rules;
  const body = m.lines.length ? `<ul class="ins-list" id="ins-list">${m.lines.map(line).join('')}</ul>
    <p class="by" id="ins-by" data-source="${m.source}">${m.source === 'rules' ? SIGN.lock : m.source === 'in-cloud' ? SIGN.cloud : SIGN.spark}<span>${esc(by)}</span></p>
    ${m.cloud === 'ask' && m.source === 'rules' ? `<button type="button" class="btn quiet" id="ins-plainer" data-act="ins-plainer">${SIGN.cloud}<span>${I.plainer}</span></button>` : m.cloud === 'offline' && m.source === 'rules' ? `<p class="tip" id="ins-offline">${SIGN.net}<span>${I.plainerOffline}</span></p>` : ''}` : `<p class="tip" id="ins-empty">${I.empty}</p>`;
  return `<section class="insights" id="insights" aria-labelledby="ins-h"><h2 id="ins-h">${I.heading[m.span]}</h2>${body}
    <p class="ins-foot" id="ins-foot">${SIGN.info}<span>${I.footer}</span></p></section>`;
}

export interface TipModel { tip: Tip | null; words: string | null; off: boolean }
/** One tip for the carer, about the carer's own questions; it can be hidden, and it stays hidden. */
export function tipBlock(m: TipModel): string {
  const T = COPY.simple.dayTip;
  if (m.off) return `<button type="button" class="tlink" id="tip-show" data-act="tip-toggle">${T.show}</button>`;
  if (!m.tip) return '';
  return `<section class="day-tip" id="day-tip" data-kind="${m.tip.kind}" aria-labelledby="tip-h"><h2 id="tip-h">${T.heading}</h2><p id="tip-text">${esc(m.words ?? m.tip.text)}</p>
    <p class="by">${m.words ? SIGN.spark : SIGN.lock}<span>${esc(m.tip.base)} ${m.words ? T.device : T.rules}</span></p>
    <button type="button" class="tlink" id="tip-hide" data-act="tip-toggle">${T.hide}</button></section>`;
}

export interface DiaryModel {
  name: string;
  tab: Span;
  topic: DiaryTopic | 'all';
  now: number;
  /** The entries of the tab and the topic, oldest first. */
  entries: DiaryEntry[];
  /** The diary holds anything at all (the buttons to copy and delete it are then there). */
  any: boolean;
  /** What was just logged, with "Undo": null after anything else was done. */
  logged: { id: string; log: LogKind; at: number } | null;
  insights: InsightsModel | null;
  tip: TipModel;
  copied: boolean;
  /** The diary was just deleted. */
  deleted: boolean;
}

function entryLine(e: DiaryEntry): string {
  const D = COPY.simple.diary;
  const what = e.kind === 'log' ? `<b>${D.log[e.log!]}</b>` : e.kind === 'need' ? `<span class="q">${D.need}</span> <b>${esc(e.label)}</b>` : `<span class="q">${esc(e.q ?? '')}</span> <b>${esc(e.label)}</b>`;
  return `<li class="de ${e.kind}" data-kind="${e.kind}"${e.lessSure ? ' data-less-sure="1"' : ''}><time>${timeText(e.at)}</time><span class="what">${what}${e.lessSure ? ` <span class="tag unsure">${COPY.simple.guard.lessSure}</span>` : ''}</span></li>`;
}

/** The diary: log it now, today / week / month, a topic, the timeline by day, what stands out, the tip, copy, delete. */
export function diaryScreen(m: DiaryModel): string {
  const D = COPY.simple.diary;
  const log = LOG_KINDS.map((k) => `<button type="button" class="btn logbtn" data-act="log" data-log="${k}">${deco(LOG_PIC[k])}<span>${D.log[k]}</span></button>`).join('');
  const logged = m.logged ? `<p class="logged" id="logged" role="status">${SIGN.tick}<span>${esc(D.logged(D.log[m.logged.log], timeText(m.logged.at)))}</span><button type="button" class="btn quiet small-btn" data-act="log-undo" data-id="${esc(m.logged.id)}">${D.undo}</button></p>` : m.deleted ? `<p class="logged" id="diary-deleted" role="status">${SIGN.tick}<span>${D.delDone}</span></p>` : '';
  const tabs = (['today', 'week', 'month'] as Span[]).map((t) => `<button type="button" role="tab" class="tab${m.tab === t ? ' on' : ''}" id="tab-${t}" data-act="diary-tab" data-tab="${t}" aria-selected="${m.tab === t}" aria-controls="timeline">${D.tabs[t]}</button>`).join('');
  const topics = [['all', D.topicAll], ...TOPIC_BASE.map((t) => [t.id, t.label]), ['other', D.topicOther]].map(([id, label]) => `<option value="${id}"${m.topic === id ? ' selected' : ''}>${esc(label)}</option>`).join('');
  const days = byDay(m.entries).map((d) => {
    const word = dayWord(d.day, m.now);
    return `<section class="day" data-day="${dayText(d.day)}"><h3>${word ? `${word} · ` : ''}${dayText(d.day)}</h3><ul>${d.entries.map(entryLine).join('')}</ul></section>`;
  }).join('');
  const timeline = days || `<p class="tip" id="diary-empty">${m.topic === 'all' ? D.empty[m.tab] : D.emptyTopic}</p>`;
  return `<main class="simple wrap one diary" id="diary" data-screen="diary" data-tab="${m.tab}">
  ${navBar({ back: true })}
  <div><h1>${esc(D.heading(m.name))}</h1></div>
  <p class="lock banner" id="diary-lock">${SIGN.lock}<span>${esc(D.lock(m.name))}</span></p>
  <section class="logrow" aria-labelledby="log-h"><h2 class="sec" id="log-h">${D.logHeading}</h2><div class="logbtns" id="log-row">${log}</div>${logged}</section>
  <div class="tabs" role="tablist" aria-label="${D.tabsLabel}" id="tabs">${tabs}</div>
  <label class="topic-pick" for="diary-topic"><span>${D.topic}</span><select id="diary-topic" class="field">${topics}</select></label>
  <div class="timeline" id="timeline" role="tabpanel" aria-labelledby="tab-${m.tab}">${timeline}</div>
  <p class="tip" id="diary-base">${esc(D.base(m.name))}</p>
  ${insightsBlock(m.insights)}
  ${m.tab === 'today' ? tipBlock(m.tip) : ''}
  ${m.any ? `<div class="two-btn"><button type="button" class="btn quiet" id="diary-copy" data-act="diary-copy" aria-live="polite">${m.copied ? D.copied : D.copy}</button><button type="button" class="btn quiet danger" id="diary-del" data-act="diary-del">${D.del}</button></div>` : ''}
</main>`;
}

/**
 * Before the insight lines go to online help for their wording: the exact text, what else is in the request, what is
 * never sent, the data use, and two buttons. It is asked every time, for these lines, this once.
 */
export function insightSheet(m: { text: string; request: string }): string {
  const K = COPY.simple.insights.sheet;
  return `<div class="dim"></div>
<div class="sheet ins-sheet" id="ins-sheet" role="dialog" aria-modal="true" aria-labelledby="ins-sheet-h">
  <h2 id="ins-sheet-h" tabindex="-1">${K.heading}</h2>
  <p>${K.body}</p>
  <div class="goes"><pre class="q" id="ins-sheet-text">${esc(m.text)}</pre></div>
  <ul class="facts">
    <li class="y">${SIGN.cloud}<span><b>${K.sentLabel}</b> ${esc(K.sent)}</span></li>
    <li class="n">${SIGN.lock}<span><b>${K.neverLabel}</b> ${esc(K.never)}</span></li>
    <li class="w">${SIGN.info}<span><b>${K.dataLabel}</b> ${esc(K.data)}</span></li>
  </ul>
  <div class="choice"><button type="button" class="btn primary" data-act="ins-yes">${K.yes}</button>
  <button type="button" class="btn" data-act="ins-no">${K.no}</button></div>
  <p class="small muted after">${K.once}</p>
  <details class="whole" id="ins-sheet-whole"><summary>${K.whole}</summary><pre>${esc(m.request)}</pre></details>
  <p class="links"><a class="tlink" href="${COPY.consent.termsLink}" target="_blank" rel="noopener">${COPY.consent.sheet.terms}</a></p>
</div>`;
}

/** "Keep a copy": About them to a file, and back from one. */
export function backupBlock(m: { error: string; done: boolean }): string {
  const B = COPY.simple.backup;
  return `<section class="backup" id="backup" aria-labelledby="backup-h"><h2 id="backup-h">${B.heading}</h2>
    <p class="tip">${B.why}</p>
    <p class="lock" id="backup-lock">${SIGN.lock}<span>${B.lock}</span></p>
    <button type="button" class="btn" id="backup-save" data-act="backup-save">${B.save}</button>
    <button type="button" class="btn" id="backup-load" data-act="backup-load">${B.load}</button><input type="file" id="backup-file" accept="application/json,.json" hidden>
    ${m.error ? `<p class="warn" role="alert" id="backup-error">${esc(m.error)}</p>` : ''}${m.done ? `<p class="saved" role="status" id="backup-done">${B.done}</p>` : ''}</section>`;
}

/** What the chosen file holds, before anything on this device is replaced. */
export function importSheet(p: BackupPreview): string {
  const B = COPY.simple.backup;
  const H = COPY.simple.health;
  const health = p.health.map((k) => (k === 'text' ? H.text.toLowerCase() : H.toggles[k].toLowerCase()));
  const when = new Date(p.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const rows = [p.name ? B.has.name(p.name) : B.has.noName, B.has.people(p.people), B.has.lists(p.lists), B.has.photos(p.photos), B.has.facts(p.facts), B.has.health(health.join(', ')), B.has.saved(when)];
  return `<div class="dim"></div>
<div class="sheet import-sheet" id="import-sheet" role="dialog" aria-modal="true" aria-labelledby="import-h">
  <h2 id="import-h" tabindex="-1">${B.preview}</h2>
  <ul class="has" id="import-has">${rows.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  <p>${B.replaces}</p>
  <div class="choice"><button type="button" class="btn primary" data-act="import-yes">${B.yes}</button><button type="button" class="btn" data-act="import-no">${B.no}</button></div>
</div>`;
}
