// The screens of phase 6 (18 Nov 2026): "See the entries" under a line of "What stands out" and of "Since the last
// visit", and the sheet that shows the exact text before the carer shares it. Like web/src/simple.ts these functions
// only draw: every value is handed in by main.ts, there is no DOM here, and every word comes from core/copy6.ts and
// core/copy.ts. Carer's side only.

import { COPY } from '../../core/copy';
import { P5 } from '../../core/copy5';
import { P6 } from '../../core/copy6';
import { FALL_HEAD, byDay, dayText, dayWord, timeText, type DiaryEntry } from '../../core/diary';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface SourceModel {
  /** Which line: an insight id ("pain-day"), or "since-2" for the third line of "Since the last visit". */
  key: string;
  open: boolean;
  /** The entries behind the line, as the rules returned their ids (core/insights.ts, core/since.ts). */
  ids: string[];
  once: string[];
  note: string;
  /** The diary on this device: the entries are looked up in it, never copied anywhere. */
  diary: DiaryEntry[];
  now: number;
}

/** One entry as the diary's timeline shows it: the time, the question and the answer, or the log. No button in it. */
function sourceLine(e: DiaryEntry, once: boolean): string {
  const D = COPY.simple.diary;
  const what = e.kind === 'log' ? `<b>${D.log[e.log!]}</b>${e.label === FALL_HEAD ? ` <span class="q">${P5.fall.headNoted}</span>` : ''}` : e.kind === 'need' ? `<span class="q">${D.need}</span> <b>${esc(e.label)}</b>` : `<span class="q">${esc(e.q ?? '')}</span> <b>${esc(e.label)}</b>`;
  return `<li class="de ${e.kind}" data-entry="${esc(e.id)}"${once ? ' data-once="1"' : ''}><time>${timeText(e.at)}</time><span class="what">${what}${e.lessSure ? ` <span class="tag unsure">${COPY.simple.guard.lessSure}</span>` : ''}${once ? ` <span class="once">${P6.source.once}</span>` : ''}</span></li>`;
}

/**
 * "See the entries (N)" under a line, and, once tapped, the diary entries the line was counted from: by day, the time,
 * the question and the answer or the log. On the same screen, with "Hide the entries". Not printed. Empty when the
 * line has no entries behind it.
 */
export function sourceBlock(m: SourceModel): string {
  if (!m.ids.length) return '';
  const S = P6.source;
  const byId = new Map(m.diary.map((e) => [e.id, e]));
  const found = m.ids.map((id) => byId.get(id)).filter((e): e is DiaryEntry => !!e);
  const id = `src-${m.key}`;
  const button = `<button type="button" class="tlink src-toggle" data-act="src-toggle" data-src="${esc(m.key)}" aria-expanded="${m.open}" aria-controls="${id}">${m.open ? S.hide : S.see(m.ids.length)}</button>`;
  if (!m.open) return `<div class="src-wrap no-print">${button}</div>`;
  const days = byDay(found).map((d) => { const w = dayWord(d.day, m.now); return `<section class="day" data-day="${dayText(d.day)}"><h4>${w ? `${w} · ` : ''}${dayText(d.day)}</h4><ul>${d.entries.map((e) => sourceLine(e, m.once.includes(e.id))).join('')}</ul></section>`; }).join('');
  return `<div class="src-wrap no-print">${button}<div class="src" id="${id}" role="region" aria-label="${S.hide}">${m.note ? `<p class="src-note">${m.note}</p>` : ''}${days}${found.length < m.ids.length ? `<p class="tip src-gone">${S.gone}</p>` : ''}</div></div>`;
}

// ---------------------------------------------------------------- share with the care circle
const sign = (body: string) => `<svg class="sg" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const SHARE = sign('<path d="M48 60V12M30 28l18-18 18 18"/><path d="M20 46v32a6 6 0 006 6h44a6 6 0 006-6V46"/>');
const NOTE = sign('<path d="M22 12h40l14 14v52a6 6 0 01-6 6H22a6 6 0 01-6-6V18a6 6 0 016-6z"/><path d="M32 40h32M32 54h32M32 68h18"/>');

/** On the diary screen: "Share with family" (the tab's span) and "For the next carer". */
export const shareButtons = () => `<div class="two-btn share-row" id="share-row"><button type="button" class="btn" id="share-family" data-act="share-open" data-kind="family">${SHARE}<span>${P6.share.family}</span></button><button type="button" class="btn" id="share-handover" data-act="share-open" data-kind="handover">${NOTE}<span>${P6.share.handover}</span></button></div>`;
/** On the carer's first screen, under the way into the diary: the note for the next carer. */
export const handoverLink = () => `<button type="button" class="btn diary-link handover-link" id="handover-link" data-act="share-open" data-kind="handover">${NOTE}<span><b>${P6.share.handover}</b><small>${P6.share.handoverSub}</small></span></button>`;

export interface ShareSheetModel {
  /** 'practice' and 'passport' (phase 7): a page the carer has on the screen already, shared as its text. */
  kind: 'family' | 'handover' | 'practice' | 'passport';
  /** For a page of phase 7: its heading, and the line that says what is and is not in the text. There is no box on the sheet then: what goes in was decided on the page. */
  page?: { heading: string; note: string };
  /** The exact text: what "Share" hands over and what "Copy" copies, character for character. */
  text: string;
  /** "Include the health notes" is ticked. */
  health: boolean;
  /** Health notes are noted in About them at all (the box can be ticked). */
  hasHealth: boolean;
  /** While the box is off: the notes that change what is safe to give, by name (core/share.ts, riskyNotes). */
  risky: string[];
  /** This browser has the Web Share API. Without it there is only "Copy". */
  canShare: boolean;
  /** "phone", "tablet" or "computer". */
  device: string;
  status: '' | 'shared' | 'copied' | 'shareFailed' | 'copyFailed';
}

/**
 * The sheet before anything leaves: where the text goes, the box for the health notes (off by default), the exact
 * text, and Share / Copy / Cancel. Nothing is handed over until a button on it is pressed.
 */
export function shareSheet(m: ShareSheetModel): string {
  const K = P6.share.sheet;
  const state = m.page ? m.page.note : !m.hasHealth ? K.healthNone : m.health ? K.healthOn : K.healthOff;
  const said = m.status === 'shared' ? K.shared : m.status === 'shareFailed' ? K.shareFailed : m.status === 'copyFailed' ? K.copyFailed : '';
  return `<div class="dim"></div>
<div class="sheet share-sheet" id="share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-h" data-kind="${m.kind}" data-health="${m.health ? 1 : 0}">
  <h2 id="share-h" tabindex="-1">${m.page ? esc(m.page.heading) : K.heading[m.kind]}</h2>
  <p id="share-leaves">${esc(m.canShare ? K.leaves(m.device) : K.leavesCopy(m.device))}</p>
  ${m.page ? '' : `<label class="check" id="share-health-row"><input type="checkbox" id="share-health" ${m.health ? 'checked' : ''} ${m.hasHealth ? '' : 'disabled'}><span>${K.healthBox}</span></label>`}
  <p class="small muted" id="share-health-state">${state} ${K.photos}</p>
  ${!m.health && m.risky.length ? `<p class="warn" id="share-health-warn" role="status">${esc(K.healthWarn(m.risky.join(', ')))}</p>` : ''}
  <div class="goes"><p class="small muted" id="share-exact">${K.exact} ${K.names}</p><pre class="q" id="share-text" tabindex="0">${esc(m.text)}</pre></div>
  <div class="choice">${m.canShare ? `<button type="button" class="btn primary" id="share-go" data-act="share-go">${K.share}</button>` : ''}
  <button type="button" class="btn${m.canShare ? '' : ' primary'}" id="share-copy" data-act="share-copy">${m.status === 'copied' ? K.copied : K.copy}</button>
  <button type="button" class="btn" id="share-cancel" data-act="share-cancel">${m.status === 'shared' || m.status === 'copied' ? K.close : K.cancel}</button></div>
  <p class="small" id="share-status" role="status">${said}</p>
</div>`;
}
