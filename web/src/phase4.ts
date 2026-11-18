// The screens of phase 4 (18 Nov 2026): the alphabet of the first-letter helper (the person's screen), the button
// "[Name] wants to say something" and the line the carer reads after it, "Before a doctor visit" (the carer's page of
// the person's own answers) and "Talk about a photo". Like web/src/simple.ts these functions only draw: every value is
// handed in by main.ts, there is no DOM here, and every word comes from core/copy4.ts.

import { COPY } from '../../core/copy';
import { P4 } from '../../core/copy4';
import { LETTERS } from '../../core/letter';
import type { Photo } from '../../core/photos';
import type { PhotoQuestion } from '../../core/phototalk';
import { VISIT_MAX, visitDate, visitElse, visitRows, visitTotal, type VisitRecord } from '../../core/visit';
import { SIGN, navBar } from './simple';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const sign = (body: string) => `<svg class="sg" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const SPEAK = sign('<path d="M14 18h52a8 8 0 018 8v26a8 8 0 01-8 8H40L24 76V60h-10a8 8 0 01-8-8V26a8 8 0 018-8z"/><path d="M26 34h28M26 46h18"/>');
const ABC = sign('<rect x="10" y="14" width="76" height="68" rx="10"/><path d="M24 62l8-26 8 26M27 53h10"/><path d="M52 36v26h8a7 7 0 000-13h-8m0 0h7a6 6 0 000-13h-7"/>');
const CLIP = sign('<rect x="20" y="16" width="56" height="70" rx="8"/><rect x="34" y="8" width="28" height="16" rx="5"/><path d="M32 42h32M32 56h32M32 70h18"/>');

// ---------------------------------------------------------------- the first-letter helper
/**
 * The person's screen: the question, the instruction, and the alphabet, six letters to a row, every letter a big
 * target; the way out ("No, I don't know") is the wide button at the end of the last row. The one screen with more
 * than three choices beside the quick-needs board; it fits a 390 x 844 phone without scrolling (styles: .abc).
 */
export function letterGrid(o: { holdHtml: string }): string {
  const L = P4.letter;
  return `${o.holdHtml}<p class="p-do" id="abc-ask">${L.ask}</p><p class="p-ask">${L.point}</p>
  <div class="abc" id="abc" role="group" aria-labelledby="abc-ask">${LETTERS.map((x) => `<button type="button" class="ab" data-letter="${x}">${x}</button>`).join('')}<button type="button" class="ab ab-no" id="abc-no" data-letter-no="1">${L.no}</button></div>`;
}

/** The carer's button that opens the alphabet (after "something else", and on the "We're stuck" card). */
export const letterButton = (name: string, again = false) => `<button type="button" class="btn letter-go" id="letter-go" data-act="letter">${ABC}<span><b>${again ? P4.letter.again : P4.letter.go}</b>${again ? '' : `<small>${esc(P4.letter.goSub(name))}</small>`}</span></button>`;
export const letterMoreButton = (letter: string) => `<button type="button" class="btn" id="letter-more" data-act="letter-more">${esc(P4.letter.more(letter))}</button>`;
/** Who found the words of a first-letter card, under the card on the carer's screen. */
export const letterBy = (by: 'rules' | 'device' | 'cloud') => `<p class="ai-made" id="letter-by" data-by="${by}">${by === 'rules' ? SIGN.lock : SIGN.spark}<span>${by === 'rules' ? P4.letter.byRules : by === 'device' ? P4.letter.byDevice : P4.letter.byCloud}</span></p>`;

/**
 * The sheet before the letter and the question go to online help: plain words first, then the one line that comes
 * from the conversation, what is never sent, the data use, the two buttons, and the whole request one tap away.
 */
export function letterSheet(m: { line: string; request: string }): string {
  const S = P4.letter.sheet;
  const K = COPY.consent.sheet;
  return `<div class="dim"></div>
<div class="sheet narrow-sheet letter-sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h">
  <h2 id="sheet-h" tabindex="-1">${S.heading}</h2>
  <p>${S.body}</p>
  <div class="goes"><p class="q" id="sheet-line">${esc(m.line)}</p><p class="small muted">${S.plus}</p></div>
  <ul class="facts">
    <li class="n">${SIGN.lock}<span><b>${K.neverLabel}</b> ${S.never}</span></li>
    <li class="w">${SIGN.info}<span><b>${K.dataLabel}</b> ${esc(K.data)}</span></li>
  </ul>
  <div class="choice"><button type="button" class="btn primary" data-act="sheet-yes">${S.yes}</button>
  <button type="button" class="btn" data-act="sheet-no">${S.no}</button></div>
  <p class="small muted after">${esc(K.after)}</p>
  <details class="whole" id="sheet-whole"><summary>${S.whole}</summary><pre>${esc(m.request)}</pre></details>
  <p class="links"><a class="tlink" href="${COPY.consent.termsLink}" target="_blank" rel="noopener">${K.terms}</a></p>
</div>`;
}

// ---------------------------------------------------------------- "[Name] wants to say something"
/** The big button on the first screen: the person starts. */
export const turnButton = (name: string) => `<button type="button" class="btn turn-go" id="turn-go" data-act="turn">${SPEAK}<span><b>${esc(P4.turn.button(name))}</b><small>${esc(P4.turn.sub(name))}</small></span></button>`;
/** What the carer reads over the answer after the person started: who started, and what it is about. */
export const turnLine = (m: { line: string; about: string }) => `<p class="turn-lead" id="turn-lead" role="status">${SPEAK}<span><b>${esc(m.line)}</b>${m.about ? ` ${esc(m.about)}` : ''}</span></p>`;

// ---------------------------------------------------------------- the two ways in, on the first screen
export function p4Links(name: string): string {
  return `<a class="btn diary-link" id="visit-link" href="#/visit">${CLIP}<span><b>${P4.visit.link}</b><small>${esc(P4.visit.linkSub(name))}</small></span></a>
    <a class="btn diary-link" id="phototalk-link" href="#/phototalk">${SIGN.photo}<span><b>${P4.photo.link}</b><small>${P4.photo.linkSub}</small></span></a>`;
}

// ---------------------------------------------------------------- "Before a doctor visit"
export interface VisitModel { name: string; record: VisitRecord | null; copied: boolean }
/**
 * The carer's screen: before the first answer, what this is and the button that starts it; after, the one page of the
 * person's own answers (the part that is printed), then the buttons. No line here interprets an answer.
 */
export function visitScreen(m: VisitModel): string {
  const V = P4.visit;
  const r = m.record;
  const head = `<main class="simple wrap one visit" data-screen="visit">${navBar({ back: true })}`;
  if (!r || !r.answers.length) {
    return `${head}
  <div><h1>${V.heading}</h1><p class="sub">${esc(V.lead(m.name))}</p></div>
  <p class="tip" id="visit-fixed">${V.fixed}</p>
  <p class="lock banner" id="visit-lock">${SIGN.lock}<span>${V.lock}</span></p>
  <p class="tip">${V.count(VISIT_MAX)}</p>
  <button type="button" class="btn primary" id="visit-start" data-act="visit-start">${esc(V.start(m.name))}</button>
  <p class="waitline">${SIGN.info}<span>${V.wait}</span></p>
</main>`;
  }
  const rows = visitRows(r).map((x) => `<li data-row="${esc(x.row)}"><span class="vr">${esc(x.row)}</span><b>${esc(x.label)}</b><small>${esc(x.q)} · ${x.time}</small></li>`).join('');
  const pain = r.answers.some((a) => a.id === 'pain' && a.label.toLowerCase() === 'yes');
  return `${head}
  <section class="visit-page" id="visit-page" aria-labelledby="visit-h">
    <p class="vp-kicker">${V.heading}</p>
    <h1 id="visit-h">${esc(V.pageTitle(m.name))}</h1>
    <p class="sub" id="visit-when">${esc(V.pageSub(visitDate(r.startedAt)))}</p>
    ${r.done ? '' : `<p class="tip" id="visit-part">${V.part(r.answers.length, visitTotal(r.answers))}</p>`}
    <ul class="visit-rows" id="visit-rows">${rows}</ul>
    ${visitElse(r) ? `<p class="visit-else" id="visit-else">${V.elseNote}</p>` : ''}
    <p class="visit-foot" id="visit-foot">${esc(V.footer(m.name))}</p>
  </section>
  <div class="no-print stack">
    ${pain ? `<p class="safety" id="visit-safety">${V.safety}</p>` : ''}
    ${r.done ? '' : `<button type="button" class="btn primary" id="visit-resume" data-act="visit-resume">${V.resume}</button>`}
    <button type="button" class="btn${r.done ? ' primary' : ''}" id="visit-print" data-act="visit-print">${V.print}</button>
    <button type="button" class="btn" id="visit-copy" data-act="visit-copy" aria-live="polite">${m.copied ? V.copied : V.copy}</button>
    <button type="button" class="btn quiet" id="visit-again" data-act="visit-start">${V.again}</button>
    <button type="button" class="btn quiet danger" id="visit-del" data-act="visit-del">${V.del}</button>
    <p class="lock">${SIGN.lock}<span>${V.lock} ${V.fixed}</span></p>
  </div>
</main>`;
}
/** The person's last screen of the questions: thanks, and the way to hand the phone back. */
export const visitDone = () => `<div class="p-done" role="status"><svg class="p-tick" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><circle cx="48" cy="48" r="40"/><path d="M28 50l14 14 26-28"/></svg><p class="p-do">${COPY.simple.person.thanks}</p></div><button type="button" class="p-give" data-act="give-back">${COPY.simple.person.give}</button>`;

// ---------------------------------------------------------------- "Talk about a photo"
export interface PhotoTalkModel {
  name: string;
  photos: Photo[];
  picked: Photo | null;
  questions: PhotoQuestion[];
  /** The on-device model can be shown the photo here ('ask'), is looking ('busy'), has looked ('done': a question was added, 'none': nothing usable), or there is none in this browser (null). */
  look: 'ask' | 'busy' | 'done' | 'none' | null;
}
export function photoTalkScreen(m: PhotoTalkModel): string {
  const P = P4.photo;
  const head = `<main class="simple wrap one phototalk" data-screen="phototalk">${navBar({ back: true })}
  <div><h1>${P.heading}</h1><p class="sub">${esc(P.lead(m.name))}</p></div>
  <p class="lock banner" id="pt-lock">${SIGN.lock}<span>${P.lock}</span></p>`;
  if (!m.photos.length) return `${head}<p class="tip" id="pt-none">${P.none}</p><a class="btn primary" href="#/about">${P.add}</a></main>`;
  if (!m.picked) {
    return `${head}<h2 class="sec">${P.pick}</h2>
  <ul class="pt-grid" id="pt-grid">${m.photos.map((p) => `<li><button type="button" class="pt-photo" data-act="pt-pick" data-id="${esc(p.id)}"><img class="photo own" src="${p.data}" alt=""><b>${esc(p.word)}</b></button></li>`).join('')}</ul></main>`;
  }
  const qs = m.questions.map((q, i) => `<button type="button" class="btn ask-next" data-act="pt-ask" data-k="${i}"${q.ai ? ' data-ai="1"' : ''}><span>${esc(q.q)}${q.choices ? `<small>${q.choices.map(esc).join(' · ')}</small>` : ''}</span></button>`).join('');
  const look = m.look === 'ask' ? `<button type="button" class="btn narrow" id="pt-look" data-act="pt-look">${SIGN.spark}<span>${P.look}</span></button><p class="tip" id="pt-look-why">${P.lookWhy}</p>`
    : m.look === 'busy' ? `<p class="making" role="status" id="pt-looking"><span class="dot wait"></span>${P.looking}</p>`
    : m.look === 'none' ? `<p class="tip" id="pt-look-none">${P.lookNone}</p>` : '';
  return `${head}
  <div class="pt-one" id="pt-one"><img class="photo own big" src="${m.picked.data}" alt=""><b>${esc(m.picked.word)}</b></div>
  <div class="next-steps" id="pt-questions"><p class="steplabel">${P.questions}</p>${qs}</div>
  ${look}
  <p class="ai-made" id="pt-by" data-by="${m.look === 'done' ? 'device' : 'rules'}">${m.look === 'done' ? SIGN.spark : SIGN.lock}<span>${m.look === 'done' ? P.byDevice : P.byRules}</span></p>
  ${m.photos.length > 1 ? `<button type="button" class="btn quiet" data-act="pt-other">${P.other}</button>` : ''}
</main>`;
}
