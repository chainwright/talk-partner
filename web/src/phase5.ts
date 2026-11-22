// The screens of phase 5 (18 Nov 2026, after judge round 6): "Something new or sudden?" with its call button, the
// boxed line over an answer that can be urgent, Read aloud (the carer's switch, its sheet, the person's button), the
// line after a logged fall, and "Since the last visit" on the doctor-visit page. Like web/src/simple.ts these
// functions only draw: every value is handed in by main.ts, there is no DOM here, and every word comes from
// core/copy5.ts (the data-use sentence from core/copy.ts).

import { COPY } from '../../core/copy';
import { P5 } from '../../core/copy5';
import { dayText } from '../../core/diary';
import { telHref } from '../../core/redflag';
import { P12 } from '../../core/copy12';
import { P9 } from '../../core/copy9';
import { SINCE_QUESTIONS, isoDay, type Since } from '../../core/since';
import type { DiaryEntry } from '../../core/diary';
import { sourceBlock } from './phase6';
import { SIGN, navBar } from './simple';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const sign = (body: string) => `<svg class="sg" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ALERT = sign('<path d="M48 12L88 80H8z"/><path d="M48 38v20"/><circle cx="48" cy="68" r="2" fill="currentColor"/>');
const PHONE = sign('<path d="M22 12h14l6 18-9 6c4 10 11 17 21 21l6-9 18 6v14c0 6-5 10-11 9C40 73 19 52 13 23c-1-6 3-11 9-11z"/>');
const SOUND = sign('<path d="M12 38h16l22-18v56L28 58H12z"/><path d="M64 34a20 20 0 010 28M74 22a36 36 0 010 52"/>');

// ---------------------------------------------------------------- "Something new or sudden?"
/** The way in: on the first screen, and at the top of "Body & care". */
export const suddenLink = (id = 'sudden-link') => `<a class="btn sudden-link" id="${id}" href="#/sudden">${ALERT}<span><b>${P5.sudden.link}</b><small>${P5.sudden.linkSub}</small></span></a>`;
/**
 * Phase 12b (judge round 9b): the same box on the first screen, with the number in it, and under it "Change it" (with
 * "Is this your emergency number?" while the number is a guess), which opens About them at the number.
 */
export const suddenFirst = (number: string, guess: boolean) => `<a class="btn sudden-link" id="sudden-link" href="#/sudden">${ALERT}<span><b>${P5.sudden.link}</b><small>${esc(P5.sudden.linkSubNumber(number))}</small></span></a>
<p class="tip number-guess" id="first-number">${guess ? `${P9.number.guess} ` : ''}<button type="button" class="tlink" data-act="sudden-number">${P9.number.change} →</button></p>`;

/** The call button: a plain tel: link, so the phone's own dialler opens with the number in it. Nothing is dialled by the app. */
export const callButton = (number: string, big = false) => `<a class="btn call${big ? ' big' : ''}" data-call="1" href="${telHref(number)}">${PHONE}<span>${esc(big ? P5.sudden.call(number) : P5.sudden.boxCall(number))}</span></a>`;

/** The carer's card: FAST, four more reasons to call, the big button, and what the list is and is not. No AI anywhere in it. */
export function suddenScreen(m: { number: string; guess?: boolean }): string {
  const S = P5.sudden;
  return `<main class="simple wrap one sudden" data-screen="sudden">${navBar({ back: true })}
  <div><h1 id="sudden-h">${S.heading}</h1><p class="sub" id="sudden-lead">${esc(S.lead(m.number))}</p></div>
  ${callButton(m.number, true)}${guessLine(!!m.guess, 'sudden-guess')}
  <section class="fast" id="fast" aria-labelledby="fast-h"><h2 class="sec" id="fast-h">${S.fastHeading}</h2>
    <ol class="fast-list">${S.fast.map(([k, v]) => `<li><b>${k}</b><span>${v}</span></li>`).join('')}</ol></section>
  <section class="fast" id="also" aria-labelledby="also-h"><h2 class="sec" id="also-h">${S.alsoHeading}</h2>
    <ul class="also-list">${S.also.map((x) => `<li>${x}</li>`).join('')}</ul></section>
  <p class="unsure" id="sudden-unsure">${S.unsure}</p>
  ${callButton(m.number, true).replace('class="btn call big"', 'class="btn call big second"')}
  <p class="tip" id="sudden-not">${S.notSudden}</p>
  <p class="tip" id="sudden-number">${esc(S.number(m.number))} <button type="button" class="tlink" data-act="sudden-number">${S.change} →</button></p>
  <p class="lock" id="sudden-source">${SIGN.lock}<span>${S.source}</span></p>
</main>`;
}

/**
 * Phase 12 (judge round 9): the person chose "I can't go on". On the carer's answer screen, a box (an alert): take it
 * seriously and stay, the emergency number, the crisis line where there is one, and "What to do now" (the screen).
 */
export function crisisBox(m: { name: string; number: string; line: string; guess?: boolean }): string {
  const K = P12.crisis;
  return `<div class="urgent crisis" id="crisis-box" role="alert">${ALERT}<div><b>${esc(K.box(m.name))}</b><div class="urgent-acts">${callButton(m.number)}${m.line ? `<a class="btn call" data-call="1" href="${telHref(m.line)}">${PHONE}<span>${esc(K.callLine(m.line))}</span></a>` : ''}<a class="tlink" href="#/crisis">${K.open} →</a></div>${guessLine(!!m.guess, 'crisis-guess')}</div></div>`;
}
/** The calm safety screen after "I can't go on": fixed steps, two call buttons, what the list is and is not. No AI anywhere in it. */
export function crisisScreen(m: { name: string; number: string; line: string; lineGuess: boolean; numberGuess: boolean }): string {
  const K = P12.crisis;
  const lineBtn = m.line ? `<a class="btn call big second" data-call="1" href="${telHref(m.line)}">${PHONE}<span>${esc(K.callLine(m.line))}</span></a>` : '';
  const steps = [K.stay(m.name), K.danger(m.name, m.number), m.line ? K.line(m.name, m.line) : K.noLine(m.name), K.ask(m.name), K.no, K.means, K.tell(m.name)];
  return `<main class="simple wrap one sudden crisis-screen" data-screen="crisis">${navBar({ back: true })}
  <div><h1 id="crisis-h">${esc(K.heading(m.name))}</h1><p class="sub" id="crisis-lead">${esc(K.lead(m.name))}</p></div>
  ${callButton(m.number, true)}${guessLine(m.numberGuess, 'crisis-number-guess')}
  ${lineBtn}${m.line && m.lineGuess ? `<p class="tip number-guess" id="crisis-line-guess">${K.lineGuess} <button type="button" class="tlink" data-act="sudden-number">${P9.number.change} →</button></p>` : ''}
  <section class="fast" id="crisis-steps" aria-labelledby="crisis-steps-h"><h2 class="sec" id="crisis-steps-h">${K.open}</h2>
    <ol class="fast-list">${steps.map((x, i) => `<li><b>${i + 1}</b><span>${esc(x)}</span></li>`).join('')}</ol></section>
  <p class="lock" id="crisis-source">${SIGN.lock}<span>${K.source}</span></p>
</main>`;
}

/** Phase 12 (judge round 9): under a pain question left for later, the signs that do not wait, a call button with the number, and the list. */
export const laterPainHtml = (number: string, guess = false) => `<div class="later-signs"><p>${esc(COPY.simple.later.painSigns(number))}</p><div class="urgent-acts">${callButton(number)}<a class="tlink" href="#/sudden">${P5.sudden.boxMore} →</a></div>${guessLine(guess, 'later-guess')}</div>`;
/** The boxed line over an answer that can be urgent (core/redflag.ts): the sentence, the call button, the way to the list. */
/** `now`: a yes to sudden weakness or numbness was confirmed (phase 12b): "Call … now. Note the time it started." */
export const urgentBox = (number: string, id = 'urgent', guess = false, now = false) => `<div class="urgent" id="${id}" role="alert">${ALERT}<div><b>${esc(now ? P5.sudden.boxNow(number) : P5.sudden.box(number))}</b><div class="urgent-acts">${callButton(number)}<a class="tlink" href="#/sudden">${P5.sudden.boxMore} →</a></div>${guessLine(guess, `${id}-guess`)}</div></div>`;
/**
 * Phase 9: while About them holds no number, the call boxes use the language setting's guess (core/redflag.ts,
 * localeNumber), and say so: "Is this your emergency number? Change it", which opens About them at the number.
 */
export const guessLine = (guess: boolean, id = 'number-guess') => (guess ? `<p class="tip number-guess" id="${id}">${P9.number.guess} <button type="button" class="tlink" data-act="sudden-number">${P9.number.change} →</button></p>` : '');

/** After "Fall" was logged: when to call, the call button, and one tap to note a blow to the head. */
export function fallBlock(m: { number: string; id: string; head: boolean; guess?: boolean }): string {
  return `<div class="urgent fall-box" id="fall-box" role="status">${ALERT}<div><b>${esc(P5.fall.box(m.number))}</b><div class="urgent-acts">${callButton(m.number)}${m.head ? `<span class="tip" id="fall-head-noted">${P5.fall.headNoted}</span>` : `<button type="button" class="btn quiet small-btn" id="fall-head" data-act="fall-head" data-id="${esc(m.id)}">${P5.fall.head}</button>`}</div>${guessLine(!!m.guess, 'fall-guess')}</div></div>`;
}

/** The number's field in About them, under the health notes. */
export const numberField = (raw: string, helpline = '') => `<label>${P5.sudden.field} <small>${P5.sudden.fieldHint}</small><input id="emergency-number" class="field" data-health="emergency" inputmode="tel" autocomplete="off" maxlength="16" value="${esc(raw)}"></label>
  <label>${P5.sudden.helplineField} <small>${esc(P5.sudden.helplineHint)}</small><input id="helpline-number" class="field" data-health="helpline" autocomplete="off" maxlength="40" value="${esc(helpline)}"></label>`;
/** Phase 8: the line under a "sad" or "low" answer, on the carer's side only. */
export const lowHelpLine = (name: string, helpline: string, number: string) => `<p class="tip low-help" id="low-help" role="note">${esc(P5.lowHelp(name, helpline, number))}</p>`;

// ---------------------------------------------------------------- Read aloud
export interface SpeakModel { name: string; on: boolean; online: boolean; /** This card may be read aloud (never a doctor-visit question). */ can: boolean }
/** The carer's switch, on the screen before handing over: what it does, whether it is on, and where the words go. */
export function speakSwitch(m: SpeakModel): string {
  const K = P5.speak;
  if (!m.can) return `<p class="tip speak-never" id="speak-never">${SOUND}<span>${K.never}</span></p>`;
  if (!m.online && !m.on) return '';
  return `<div class="speak" id="speak" data-on="${m.on ? 1 : 0}">${SOUND}<div><b>${K.title}</b><small id="speak-state">${esc(m.on ? (m.online ? K.on : K.offline) : K.off(m.name))}</small></div>
    <button type="button" class="btn quiet small-btn" id="speak-toggle" data-act="${m.on ? 'speak-off' : 'speak-ask'}" aria-pressed="${m.on}">${m.on ? K.turnOff : esc(K.turnOnFor(m.name))}</button></div>`;
}
/** The sheet before Read aloud is turned on: the brief's sentence, the words of this card, what never goes, the data use. */
export function speakSheet(m: { text: string; request: string; name?: string }): string {
  const K = P5.speak.sheet;
  return `<div class="dim"></div>
<div class="sheet speak-sheet" id="speak-sheet" role="dialog" aria-modal="true" aria-labelledby="speak-sheet-h">
  <h2 id="speak-sheet-h" tabindex="-1">${K.heading}</h2>
  <p id="speak-sheet-for"><b>${esc(P5.speak.forWho(m.name ?? ''))}</b></p>
  <p id="speak-sheet-body">${K.body}</p>
  <div class="goes"><p class="small muted">${K.goes}</p><p class="q" id="speak-sheet-text">${esc(m.text)}</p><p class="small muted">${K.plus}</p></div>
  <ul class="facts">
    <li class="n">${SIGN.lock}<span><b>${K.neverLabel}</b> ${K.never}</span></li>
    <li class="w">${SIGN.info}<span><b>${K.dataLabel}</b> ${esc(COPY.consent.sheet.data)}</span></li>
  </ul>
  <div class="choice"><button type="button" class="btn primary" data-act="speak-yes">${K.yes}</button>
  <button type="button" class="btn" data-act="speak-no">${K.no}</button></div>
  <p class="small muted after">${K.after}</p>
  <details class="whole" id="speak-sheet-whole"><summary>${COPY.consent.sheet.narrow.whole}</summary><pre>${esc(m.request)}</pre></details>
  <p class="links"><a class="tlink" href="${COPY.consent.termsLink}" target="_blank" rel="noopener">${COPY.consent.sheet.terms}</a></p>
</div>`;
}
/** The button on the person's screen, over the choices: a control, not a choice. Not drawn when Read aloud is off or cannot run. */
export function hearButton(state: 'ready' | 'loading' | 'failed'): string {
  const K = P5.speak;
  // (phase 8: no instruction on the person's screen: the button only says there was no sound; the carer's screen says what to do)
  if (state === 'failed') return `<button type="button" class="hear failed" id="hear-failed" disabled aria-disabled="true">${SOUND}<span>${K.noSound}</span></button>`;
  return `<button type="button" class="hear" id="hear" data-hear="1"${state === 'loading' ? ' disabled' : ''}>${SOUND}<span>${state === 'loading' ? K.loading : K.again}</span></button>`;
}
/** Under a card whose words were sent to be spoken. */
export const readAloudLine = () => `<p class="made-where spoken" id="spoken-line" data-left="sent">${SIGN.cloud}<span>${P5.speak.made}</span></p>`;

// ---------------------------------------------------------------- "Since the last visit"
export interface SinceModel { name: string; since: Since; picked: string[]; number: string; /** "See the entries": the lines whose entries are shown (by index), and the diary they are looked up in. */ open?: number[]; diary?: DiaryEntry[] }
/** On the doctor-visit page, apart from the person's own answers: the diary's counts, and the family's questions. */
export function sinceBlock(m: SinceModel): string {
  const S = P5.since;
  const picked = m.picked.length ? `<div class="since-q" id="since-picked"><p class="vr">${S.qPrinted}</p><ul>${m.picked.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>` : '';
  return `<section class="since" id="since" aria-labelledby="since-h"><h2 id="since-h">${S.heading}</h2>
    <p class="sub" id="since-sub">${esc(S.sub(m.name))}</p>
    <p class="tip" id="since-span">${esc(S.span(dayText(m.since.from), dayText(m.since.to)))}</p>
    <ul class="since-lines" id="since-lines">${m.since.lines.map((l, i) => `<li>${esc(l)}${sourceBlock({ key: `since-${i}`, open: !!m.open?.includes(i), ids: m.since.sources[i]?.ids ?? [], once: [], note: m.since.sources[i]?.note ?? '', diary: m.diary ?? [], now: m.since.to })}</li>`).join('')}</ul>
    ${picked}
    <p class="visit-foot" id="since-note">${S.note}</p></section>`;
}
/** The carer's controls for it (not printed): the day to count from, and the fixed questions to pick from. */
export function sinceControls(m: SinceModel): string {
  const S = P5.since;
  const full = m.picked.length >= SINCE_QUESTIONS;
  return `<div class="since-controls" id="since-controls">
    <label for="since-from">${S.fromLabel} <input type="date" id="since-from" class="field" value="${isoDay(m.since.from)}" max="${isoDay(m.since.to)}"></label>
    <fieldset class="since-pick" id="since-pick"><legend>${S.qHeading}</legend><p class="tip">${S.qLead}</p>
    ${S.questions.map((q, i) => { const on = m.picked.includes(q); return `<label class="check"><input type="checkbox" data-since-q="${i}" ${on ? 'checked' : ''} ${!on && full ? 'disabled' : ''}>${esc(q)}</label>`; }).join('')}</fieldset></div>`;
}
