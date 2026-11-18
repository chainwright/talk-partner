// The screens of phase 7 of the build (18 Nov 2026): "For the speech therapist" (how the conversations went, in
// counts) and the communication passport ("How to talk with Frank": first the lines to decide on, then the page as it
// prints). Like web/src/simple.ts these functions only draw: every value is handed in by main.ts, there is no DOM
// here, and every word comes from core/copy8.ts or from the page the rules built (core/practice.ts,
// core/passport.ts). Carer's side only. (web/src/phase7.ts was taken by the fix of 18 Nov.)

import { P8 } from '../../core/copy8';
import type { PassLine, PassSection, Passport, PassportPrefs } from '../../core/passport';
import { OWN_LEN, OWN_MAX, YESNO_LEN, printed } from '../../core/passport';
import { PRACTICE_QUESTIONS, type PracticeReport, type PracticeSpan } from '../../core/practice';
import { SIGN, navBar } from './simple';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const sign = (body: string) => `<svg class="sg" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const BARS = sign('<path d="M14 82h68"/><path d="M26 82V52M48 82V22M70 82V40"/>');
const CARD = sign('<rect x="10" y="18" width="76" height="60" rx="10"/><circle cx="32" cy="42" r="9"/><path d="M18 68c2-9 8-13 14-13s12 4 14 13"/><path d="M56 38h20M56 52h20M56 66h12"/>');

// ---------------------------------------------------------------- the ways in
/** On the diary screen: the page for the speech therapist. */
export const practiceLink = () => `<a class="btn diary-link" id="practice-link" href="#/practice">${BARS}<span><b>${P8.practice.link}</b><small>${P8.practice.linkSub}</small></span></a>`;
/** On the first screen and in About them: the communication passport. */
export const passportLink = (name: string, id = 'passport-link') => `<a class="btn diary-link" id="${id}" href="#/passport">${CARD}<span><b>${esc(P8.passport.link(name))}</b><small>${P8.passport.linkSub}</small></span></a>`;

// ---------------------------------------------------------------- "For the speech therapist"
export interface PracticeModel {
  name: string;
  device: string;
  span: PracticeSpan;
  report: PracticeReport;
  /** "Include the needs and pain answers" is ticked. */
  health: boolean;
  /** The box is off and the diary of the span holds a strong pain, a pain in the head or the chest or "something's wrong": the fixed sentence for the carer. '' otherwise. */
  warn: string;
  picked: string[];
  /** The log holds anything at all ("Delete these counts" is then there). */
  any: boolean;
}

/** One line of the page: a line that starts with "- " is an item under the line before it. */
const pageLines = (lines: string[]) => lines.map((l) => (l.startsWith('- ') ? `<li class="sub-item">${esc(l.slice(2))}</li>` : `<li>${esc(l)}</li>`)).join('');

/**
 * The carer's screen: how far back, the box for the needs and pain answers (off), the questions to pick, then the
 * page exactly as it prints, then Print and Share. Nothing is printed or shared that is not on the screen first.
 */
export function practiceScreen(m: PracticeModel): string {
  const K = P8.practice;
  const r = m.report;
  const tabs = (['week', 'month'] as PracticeSpan[]).map((s) => `<button type="button" role="tab" class="tab${m.span === s ? ' on' : ''}" id="practice-${s}" data-act="practice-span" data-span="${s}" aria-selected="${m.span === s}" aria-controls="practice-page">${K.spans[s]}</button>`).join('');
  const full = m.picked.length >= PRACTICE_QUESTIONS;
  const picks = K.questions.map((q, i) => { const on = m.picked.includes(q); return `<label class="check"><input type="checkbox" data-practice-q="${i}" ${on ? 'checked' : ''} ${!on && full ? 'disabled' : ''}>${esc(q)}</label>`; }).join('');
  return `<main class="simple wrap one practice" id="practice" data-screen="practice" data-span="${m.span}">
  ${navBar({ back: true })}
  <div class="no-print"><h1>${K.heading}</h1><p class="sub">${esc(K.lead(m.name))}</p></div>
  <p class="lock banner no-print" id="practice-lock">${SIGN.lock}<span>${esc(K.lock(m.device))}</span></p>
  <div class="no-print stack practice-controls" id="practice-controls">
    <div class="tabs two" role="tablist" aria-label="${K.spanLabel}" id="practice-tabs">${tabs}</div>
    <label class="check" id="practice-health-row"><input type="checkbox" id="practice-health" ${m.health ? 'checked' : ''}><span>${K.healthBox}</span></label>
    <p class="small muted" id="practice-health-state">${m.health ? K.healthOn : K.healthOff}</p>
    ${m.warn ? `<p class="warn boxed" id="practice-warn" role="status">${esc(m.warn)}</p>` : ''}
    <fieldset class="since-pick" id="practice-pick"><legend>${K.qHeading}</legend><p class="tip">${K.qLead}</p>${picks}</fieldset>
  </div>
  <section class="visit-page practice-page" id="practice-page" role="tabpanel" aria-labelledby="practice-h">
    <p class="vp-kicker">${K.kicker}</p>
    <h2 class="page-title" id="practice-h">${esc(r.title)}</h2>
    <p class="sub" id="practice-sub">${esc(r.sub)}</p>
    ${r.call ? `<p class="page-call" id="practice-call">${esc(r.call)}</p>` : ''}
    <ul class="page-notes" id="practice-notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${r.sections.map((s) => `<section class="page-sec" data-sec="${s.id}"><h3>${esc(s.heading)}</h3><ul>${pageLines(s.lines)}</ul></section>`).join('')}
    <p class="visit-foot" id="practice-foot">${esc(r.footer)}</p>
  </section>
  <div class="no-print stack">
    <button type="button" class="btn primary" id="practice-print" data-act="page-print">${K.print}</button>
    <button type="button" class="btn" id="practice-share" data-act="share-page" data-kind="practice">${K.share}</button>
    ${m.any ? `<button type="button" class="btn quiet danger" id="practice-del" data-act="practice-del">${K.del}</button>` : ''}
  </div>
</main>`;
}

// ---------------------------------------------------------------- the communication passport
/** A picture for the printed page: one of the family's own photos, or an initial in a circle. Never in the shared text. */
export interface PassPicture { word: string; data: string }

export interface PassportModel {
  name: string;
  device: string;
  passport: Passport;
  prefs: PassportPrefs;
  /** The carer is looking at the page as it prints (the second step); else the lines are being decided. */
  page: boolean;
  pictures: PassPicture[];
}

const picture = (p: PassPicture) => `<li>${p.data ? `<img class="photo own" src="${p.data}" alt="">` : `<span class="mono" aria-hidden="true">${esc(p.word.charAt(0).toUpperCase())}</span>`}<b>${esc(p.word)}</b></li>`;

/** The page as it prints: the title, the sections with the lines left on, the pictures, the footer. */
export function passportPage(m: PassportModel): string {
  const secs = printed(m.passport);
  const pics = m.prefs.photos && m.pictures.length ? `<ul class="pass-pics" id="pass-pics">${m.pictures.map(picture).join('')}</ul>` : '';
  const sec = (s: PassSection) => `<section class="page-sec${s.id === 'wrong' ? ' wrong' : ''}" data-sec="${s.id}"><h3>${esc(s.heading)}</h3><ul>${s.lines.map((l) => `<li data-key="${esc(l.key)}">${esc(l.text)}</li>`).join('')}</ul>${s.notes.map((n) => `<p class="page-note">${esc(n)}</p>`).join('')}${s.id === 'about' ? pics : ''}</section>`;
  // (with nothing in About them the pictures have no section to stand in: there are none then)
  return `<section class="visit-page pass-page" id="pass-page" aria-labelledby="pass-h">
    <h2 class="page-title" id="pass-h">${esc(m.passport.title)}</h2>
    ${secs.map(sec).join('')}
    <p class="visit-foot" id="pass-foot">${esc(m.passport.footer)}</p>
  </section>`;
}

/**
 * The carer's two screens. First every line the page could hold, each with its box (a line that is always on the
 * page says so), how yes and no are shown, up to three lines of the carer's own, and "Look at the page". Then the
 * page itself, with Print, Share and the way back to the lines. Print and Share are on the second screen only.
 */
export function passportScreen(m: PassportModel): string {
  const K = P8.passport;
  const head = `<main class="simple wrap one passport" id="passport" data-screen="passport" data-step="${m.page ? 'page' : 'lines'}">${navBar({ back: true })}`;
  if (m.page) {
    return `${head}
  <p class="tip no-print" id="pass-page-lead">${K.pageLead}</p>
  ${passportPage(m)}
  <div class="no-print stack">
    <button type="button" class="btn primary" id="pass-print" data-act="page-print">${K.print}</button>
    <button type="button" class="btn" id="pass-share" data-act="share-page" data-kind="passport">${K.share}</button>
    <button type="button" class="btn quiet" id="pass-change" data-act="back">${K.change}</button>
    <p class="small muted" id="pass-photos-never">${K.photosNever}</p>
  </div>
</main>`;
  }
  const box = (l: PassLine) => (l.removable
    ? `<li><label class="check pass-line"><input type="checkbox" data-pass-line="${esc(l.key)}" ${l.on ? 'checked' : ''} aria-label="${K.onPage}: ${esc(l.text)}"><span>${esc(l.text)}${l.hint ? `<small>${esc(l.hint)}</small>` : ''}</span></label></li>`
    : `<li class="pass-fixed"><span>${esc(l.text)}</span></li>`);
  const yesno = `<div class="pass-fields"><label for="pass-yes">${K.yesLabel} <small>${K.yesHint}</small></label><input id="pass-yes" class="field" data-pass="yes" autocomplete="off" maxlength="${YESNO_LEN}" value="${esc(m.prefs.yes)}">
      <label for="pass-no">${K.noLabel} <small>${K.noHint}</small></label><input id="pass-no" class="field" data-pass="no" autocomplete="off" maxlength="${YESNO_LEN}" value="${esc(m.prefs.no)}"></div>`;
  const own = `<section class="pass-sec" data-sec="own"><h2 class="sec">${K.sec.own}</h2><div class="pass-fields">${Array.from({ length: OWN_MAX }, (_, i) => `<label for="pass-own-${i}">${K.ownLabel(i + 1)}${i === 0 ? ` <small>${K.ownHint}</small>` : ''}</label><input id="pass-own-${i}" class="field" data-pass-own="${i}" autocomplete="off" maxlength="${OWN_LEN}" value="${esc(m.prefs.own[i] ?? '')}">`).join('')}</div></section>`;
  const sec = (s: PassSection) => (s.id === 'own' ? '' : `<section class="pass-sec" data-sec="${s.id}"><h2 class="sec">${esc(s.heading)}${s.id === 'wrong' ? ` <small class="always">${K.always}</small>` : ''}</h2>${s.id === 'yesno' ? `${yesno}<ul class="pass-lines">${s.lines.filter((l) => l.key === 'yesno:tired').map(box).join('')}</ul>` : `<ul class="pass-lines">${s.lines.map(box).join('')}</ul>`}${s.notes.map((n) => `<p class="tip">${esc(n)}</p>`).join('')}</section>`);
  const before = m.passport.sections.filter((s) => s.id !== 'wrong' && s.id !== 'own');
  const wrong = m.passport.sections.filter((s) => s.id === 'wrong');
  return `${head}
  <div><h1 id="pass-title">${esc(m.passport.title)}</h1><p class="sub">${esc(K.lead(m.name))}</p></div>
  <p class="lock banner" id="pass-lock">${SIGN.lock}<span>${esc(K.lock(m.device))}</span></p>
  ${m.name ? '' : `<p class="tip" id="pass-noname">${K.noName} <a class="tlink" href="#/about">${K.addName} →</a></p>`}
  ${before.map(sec).join('')}
  ${own}
  ${wrong.map(sec).join('')}
  <label class="check" id="pass-photos-row"><input type="checkbox" id="pass-photos" ${m.prefs.photos ? 'checked' : ''}><span>${K.photosBox}</span></label>
  <button type="button" class="btn primary" id="pass-look" data-act="pass-look">${K.look}</button>
  <p class="small muted" id="pass-look-sub">${K.lookSub}</p>
</main>`;
}
