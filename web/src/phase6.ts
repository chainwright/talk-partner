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
