// The simple view (direction A, "One screen"): what a carer on a phone sees at "/", and what the person sees when the
// phone is turned to them. The carer's side: the first screen (the hope line, quick needs, "How it works: 4 steps",
// topics, your own question), the screen before handing over, and the screen after an answer; a consent sheet that
// comes up only when a question needs online help; About them as four plain rows. The person's side: the choices
// ("Point to your answer" and the question, no category word), the check ("So: tea. Right?"), the finish ("Thank you.
// Tea." and "Give the phone back"). Design: design/USER_FIRST.md, design/topics_2026-11-17/.
// These functions only draw: every value is handed in by main.ts, which reads it from the same state, the same `Card`
// and the same pipeline as the full view. No DOM here, so the markup can be tested in Node
// (tests/unit/simple-view.test.ts). Every word a person reads comes from core/copy.ts.

import type { Way } from '../../core/more';
import { waysBlock } from './phase7';
import type { PartnerAction } from '../../core/actions';
import { COPY } from '../../core/copy';
import { P5 } from '../../core/copy5';
import { HEALTH_TEXT_MAX, HEALTH_TOGGLES, NO_HEALTH, hasHealth, type HealthNotes } from '../../core/insights';
import { NARROW_LEVELS } from '../../core/narrow';
import { cropRect, PHOTO_CAP, WORD_MAX, type Frame, type Photo } from '../../core/photos';
import type { Learned } from '../../core/prefs';
import type { MadeWhere } from '../../core/simple';
import type { Topic, TopicId } from '../../core/topics';
import type { Card, Choice, Profile } from '../../core/types';
import { decoPicto } from './pictos';
import { DEFAULT_NUMBER, crisisAnswer } from '../../core/redflag';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Signs for controls and status lines (never on a card): decorative, so hidden from a screen reader.
const sign = (body: string) => `<svg class="sg" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const SIGN = {
  lock: sign('<rect x="20" y="42" width="56" height="42" rx="8"/><path d="M32 42V30a16 16 0 0132 0v12"/>'),
  cloud: sign('<path d="M28 72a16 16 0 01-2-32 22 22 0 0142-6 18 18 0 014 38z"/>'),
  maybe: sign('<path d="M28 72a16 16 0 01-2-32 22 22 0 0142-6 18 18 0 014 38z" stroke-dasharray="9 9"/>'),
  info: sign('<circle cx="48" cy="48" r="36"/><path d="M48 44v24"/><circle cx="48" cy="29" r="2" fill="currentColor"/>'),
  back: sign('<path d="M56 20L28 48l28 28"/>'),
  photo: sign('<rect x="10" y="24" width="76" height="56" rx="10"/><circle cx="48" cy="52" r="15"/><path d="M34 24l6-10h16l6 10"/>'),
  home: sign('<path d="M14 46L48 16l34 30"/><path d="M24 40v40h48V40"/><path d="M40 80V58h16v22"/>'),
  grid: sign('<rect x="14" y="14" width="28" height="28" rx="6"/><rect x="54" y="14" width="28" height="28" rx="6"/><rect x="14" y="54" width="28" height="28" rx="6"/><rect x="54" y="54" width="28" height="28" rx="6"/>'),
  person: sign('<circle cx="48" cy="30" r="14"/><path d="M20 84c2-18 14-28 28-28s26 10 28 28"/>'),
  tick: sign('<path d="M20 50l18 18 38-40"/>'),
  alert: sign('<path d="M48 12L88 80H8z"/><path d="M48 38v20"/><circle cx="48" cy="68" r="2" fill="currentColor"/>'),
  out: sign('<circle cx="48" cy="48" r="36"/><path d="M36 38c0-8 5-13 12-13s12 5 12 12c0 9-12 9-12 19"/><circle cx="48" cy="69" r="2" fill="currentColor"/>'),
  net: sign('<path d="M14 40a50 50 0 0168 0M26 54a32 32 0 0144 0M38 68a14 14 0 0120 0"/><circle cx="48" cy="80" r="2" fill="currentColor"/>'),
  spark: sign('<path d="M48 10l9 27 27 9-27 9-9 27-9-27-27-9 27-9z"/>'),
  // the four steps: ask, turn the phone, they point, check
  ask: sign('<circle cx="26" cy="22" r="10"/><path d="M10 80c0-20 8-32 16-32s16 12 16 32"/><path d="M56 12c14 0 28 6 28 16s-14 16-28 16l-6 6v-6"/>'),
  turn: sign('<rect x="30" y="12" width="36" height="60" rx="6"/><path d="M14 40a36 36 0 0020 32M82 40a36 36 0 01-20 32"/><path d="M26 66l8 6-2 10M70 66l-8 6 2 10"/>'),
  point: sign('<rect x="12" y="8" width="44" height="60" rx="6"/><rect x="20" y="18" width="28" height="16" rx="4"/><rect x="20" y="40" width="28" height="16" rx="4"/><path d="M48 92V60a6 6 0 0112 0v12l14 2a8 8 0 016 8v10"/>'),
  check: sign('<path d="M16 16h52a8 8 0 018 8v24a8 8 0 01-8 8H40L24 70V56h-8a8 8 0 01-8-8V24a8 8 0 018-8z"/><path d="M26 36l10 10 20-20"/>'),
};
/** One colour picture per topic tile, from the same set as the choices (decorative here: the word is always next to it). */
const deco = decoPicto;
/** The picture id of each topic tile. Phase 12: web/index.html preloads the picture files among them (tests/unit/phase12.test.ts keeps the two lists the same). */
export const TOPIC_PICTURES: Record<TopicId, string> = { food: 'food', body: 'body:whole', rest: 'bed', people: 'family', feel: 'good', plans: 'plans', fun: 'tv' };
const TOPIC_SIGN = Object.fromEntries(Object.entries(TOPIC_PICTURES).map(([k, id]) => [k, deco(id)])) as Record<TopicId, string>;

export interface HomeModel {
  /** The person's name, or '' when About them has none yet (then the words say "them", never "him" or "her"). */
  name: string;
  /** Phase 13: the emergency number of the call buttons, for the intended-purpose line at the foot. */
  number?: string;
  /**
   * Phase 12b (judge round 9b): where "Try it with the Millers" goes: "#/sample" on a phone or a tablet (this simple
   * view, with the sample family), "#/demo" on a computer (judge mode). `sampleOn`: the sample family is open here now.
   */
  sampleHref?: string;
  sampleOn?: boolean;
  /** About them holds something, or a first card was answered here: the small link to it is on the first screen. */
  aboutLink: boolean;
  busy: boolean;
  error: string | null;
  question: string;
  /** "How it works: 4 steps" is open (the first visit) or folded to one line (after the first card; remembered). */
  howOpen: boolean;
  topics: Topic[];
  topicOpen: TopicId | null;
  /** The tag on the open question: "needs internet", or that the AI is on this device (core/simple.ts, aiTag). */
  aiTag: string;
  /** The plain AI line: what the AI is for, then where it runs here (core/simple.ts, aiLines). */
  ai: string[];
  /** The state-driven privacy sentences (core/simple.ts, privacyLines): one small line. */
  privacy: string[];
  /** The microphone button and the line under the field, as the full view draws them (main.ts): '' where there is none. */
  micHtml: string;
  voiceHtml: string;
  /** The way into the diary (web/src/diary.ts), drawn by main.ts: under the questions. '' where there is none. */
  diaryHtml?: string;
  /** The button "[Name] wants to say something" (web/src/phase4.ts), drawn by main.ts: under the quick needs. */
  turnHtml?: string;
  /** Phase 8: "Left for later" cards (core/later.ts), under how it works. */
  laterHtml?: string;
  /** Phase 9: the sample open question (`tryAiBlock`). */
  tryHtml?: string;
  /** The way to "Something new or sudden?" at the top of "Body & care" (web/src/phase5.ts), drawn by main.ts. */
  bodyHtml?: string;
}

/**
 * The bar at the top of every carer screen: "Back" (one step back in the flow; not on the first screen, which has
 * nowhere to go back to) and "Home" (the app's name with the word "Home": always to the first screen). The phone's own
 * back button does what "Back" does (web/src/main.ts, backStep).
 */
export const navBar = (o: { back: boolean; name?: string }) => {
  const N = COPY.simple.nav;
  return `<header class="s-top" id="s-top">${o.back ? `<button type="button" class="navbtn navback" data-act="back">${SIGN.back}<span>${N.back}</span></button>` : ''}<button type="button" class="navbtn navhome" data-act="home" aria-label="${N.homeLabel}"><span class="brand">${COPY.app.name}</span>${o.back ? `<span class="home-word">${SIGN.home}${N.home}</span>` : ''}</button>${!o.back && o.name ? `<span class="with">${SIGN.person}${esc(COPY.simple.with(o.name))}</span>` : ''}</header>`;
};
const insideLink = (act: 'inside' | 'inside-card', label: string) => `<button type="button" class="tlink inside" data-act="${act}">${label} →</button>`;
const privacyBlock = (lines: string[], extra = '') => `<p class="lock" id="s-privacy">${SIGN.lock}<span>${lines.map(esc).join(' ')}${extra ? ` ${esc(extra)}` : ''}</span></p>`;

/** "How it works: 4 steps": the highlighted block, or its one folded line. The "wait" line is always under step 3. */
export function howBlock(name: string, open: boolean): string {
  const H = COPY.simple.how;
  if (!open) return `<button type="button" class="how-line" id="how" data-act="how" aria-expanded="false"><span>${H.title} <small class="how-tip">${H.foldTip}</small></span><span class="tog">${H.show}</span></button>`;
  const signs = [SIGN.ask, SIGN.turn, SIGN.point, SIGN.check];
  const steps = H.steps(name).map((line, i) => `<li><span class="num">${i + 1}</span>${signs[i]}<span class="st">${esc(line)}${i === 0 ? `<b class="kw" id="how-keyword">${esc(H.keyword)}</b>` : ''}${i === 2 ? `<b class="wait">${esc(COPY.simple.wait(name))}</b>` : ''}</span></li>`).join('');
  return `<section class="how" id="how" aria-labelledby="how-h"><div class="how-head"><h2 id="how-h">${H.title}</h2><button type="button" class="tog" data-act="how" aria-expanded="true">${H.hide}</button></div><ol>${steps}</ol></section>`;
}

/**
 * Phase 8: one card for each question left for later, newest first: tap to ask it again, or "Done". Phase 9: a care
 * question (pain, the body, the toilet, a drink, feelings) is pinned first; its "Done" first asks "Did you find out?"
 * (`asking`), and under a pain question stands the line that new or strong pain does not wait.
 */
export function laterBlock(items: { q: string; time: string; ago?: string; i: number; care?: boolean; pain?: boolean; asking?: boolean; red?: 'chest' | 'head' | 'sign' }[], painHtml = '', number = DEFAULT_NUMBER): string {
  const L = COPY.simple.later;
  if (!items.length) return '';
  const buttons = (x: (typeof items)[number]) => (x.asking
    ? `<p class="later-found" id="later-found-${x.i}" tabindex="-1"><b>${L.found}</b></p><div class="two-btn"><button type="button" class="btn" data-act="later-found" data-i="${x.i}">${L.foundYes}</button><button type="button" class="btn quiet" data-act="later-notyet" data-i="${x.i}">${L.foundNo}</button></div>`
    : `<div class="two-btn"><button type="button" class="btn" data-act="later-ask" data-i="${x.i}">${L.ask}</button><button type="button" class="btn quiet" data-act="later-done" data-i="${x.i}">${L.done}</button></div>`);
  const item = (x: (typeof items)[number]) => `<div class="later-item${x.care ? ' care' : ''}" data-later="${x.i}"${x.care ? ' data-care="1"' : ''}><p><b>${esc(L.line(x.q, x.time))}</b></p>${x.ago ? `<p class="tip later-ago">${esc(x.ago)}</p>` : ''}${x.red ? `<p class="warn later-pain later-red" role="alert">${esc(L.redLine(x.red, x.time, number))}</p>${painHtml}` : x.pain ? `<p class="warn later-pain">${esc(L.painLine(number))}</p>${painHtml}` : ''}${buttons(x)}</div>`;
  return `<div class="later" id="later">${items.map(item).join('')}<p class="tip">${items.some((x) => x.care) ? L.careNote : L.note}</p></div>`;
}

/**
 * Phase 9 (judge round 8, IMPROVE F): one tap on Home to the hybrid moment: the sample open question, tagged with
 * where its AI runs here ("uses Google's AI, after your yes" on a phone; "AI on this computer" with Chrome's own AI),
 * leading to the card and its routing chip. Not drawn on a copy with no AI.
 */
export function tryAiBlock(m: { q: string; tag: string | null; busy: boolean }): string {
  if (!m.tag) return '';
  const T = COPY.simple.tryAi;
  // (phase 12, judge round 9: above the fold at 390 x 844) the button, then two short lines: where the AI runs on a phone, and on a laptop
  return `<div class="try-ai" id="try-ai"><button type="button" class="btn try-ai-btn" data-act="try-ai" data-q="${esc(m.q)}" ${m.busy ? 'disabled' : ''} aria-describedby="ai-strip">${SIGN.spark}<span><b>${T.label}</b><span class="tag net" id="try-ai-tag">${esc(m.tag)}</span></span></button><ul class="ai-strip" id="ai-strip" title="${esc(T.stripLong)}"><li>${SIGN.cloud}<span>${esc(T.strip[0])}</span></li><li>${SIGN.lock}<span>${esc(T.strip[1])}</span></li></ul>${m.busy ? `<p class="making" role="status" id="try-ai-making"><span class="dot wait"></span>${COPY.simple.making}</p>` : ''}</div>`;
}

/**
 * The topic tiles, two to a row; the questions of the open topic come in a panel under the ROW the tile is in, so no
 * tile ever moves when a topic opens (a tired hand finds each topic where it was).
 */
export function topicGrid(m: Pick<HomeModel, 'name' | 'topics' | 'topicOpen' | 'aiTag' | 'bodyHtml'>): string {
  const S = COPY.simple;
  const tile = (t: Topic) => `<button type="button" class="topic${m.topicOpen === t.id ? ' open' : ''}" data-act="topic" data-topic="${t.id}" aria-expanded="${m.topicOpen === t.id}" aria-controls="tq-${t.id}">${TOPIC_SIGN[t.id]}<span>${esc(t.label)}</span></button>`;
  const panel = (t: Topic) => `<div class="tqs" id="tq-${t.id}" role="group" aria-label="${esc(t.label)}"><p class="lead">${esc(S.topicLead(m.name))}</p>${t.id === 'body' ? m.bodyHtml ?? '' : ''}${t.questions.map((x) =>
    `<button type="button" class="tq" data-q="${esc(x.q)}"><span>${esc(x.q)}</span>${x.own ? `<span class="tag">${esc(S.ownTag(m.name))}</span>` : x.ai ? `<span class="tag net" id="ai-tag">${esc(m.aiTag)}</span>` : ''}</button>`).join('')}</div>`;
  let html = '';
  for (let i = 0; i < m.topics.length; i += 2) {
    const row = m.topics.slice(i, i + 2);
    html += row.map(tile).join('');
    const open = row.find((t) => t.id === m.topicOpen);
    if (open) html += panel(open);
  }
  return `<div class="topics" id="topics">${html}</div>`;
}

/**
 * The first screen, top to bottom: the hope line, quick needs, how it works, topics, your own question, the plain AI
 * line, one small privacy line. No empty video slot, no walkthrough, no About-them form before the first card.
 */
export function homeScreen(m: HomeModel): string {
  const S = COPY.simple;
  // (phase 12b, judge round 9b: a pain question left for later stands directly under "Needs something now?", so its
  // signs and call button are on the screen at 360 px; other questions left for later stay lower down)
  const painLater = (m.laterHtml ?? '').includes('class="warn later-pain"');
  const status = m.busy ? `<p class="making" role="status"><span class="dot wait"></span>${S.making}</p>` : m.error ? `<p class="warn" role="alert">${esc(m.error)}</p>` : '';
  return `<main class="simple wrap home" data-screen="home">
  ${navBar({ back: false, name: m.name })}
  <div class="col">
    <h1 id="hope">${esc(S.hope(m.name))}</h1>
    <button type="button" class="btn needs" data-act="needs">${SIGN.grid}<span><b>${S.needs}</b><small>${esc(S.needsSub(m.name))}</small></span></button>
    ${painLater ? m.laterHtml : ''}
    ${m.turnHtml ?? ''}
    ${m.tryHtml ?? ''}
    ${howBlock(m.name, m.howOpen)}
    ${painLater ? '' : m.laterHtml ?? ''}
  </div>
  <div class="col">
    <div class="stack"><h2 class="sec">${S.topicsHeading}</h2>${topicGrid(m)}</div>
    <form id="ask" class="s-ask"><h2 class="sec">${S.ownHeading}</h2>
      <div class="row"><input id="q" class="field" autocomplete="off" placeholder="${S.field}" aria-label="${S.ownHeading}" value="${esc(m.question)}">${m.micHtml}</div>
      ${m.voiceHtml}
      <button id="make" class="btn primary" type="submit" ${m.busy ? 'disabled' : ''}>${esc(S.make(m.name))}</button>
      <div id="result" aria-live="polite">${status}</div>
      <p class="ai-line" id="ai-line">${SIGN.spark}<span>${m.ai.map(esc).join(' ')}</span></p>
    </form>
    ${m.diaryHtml ?? ''}
  </div>
  <footer class="foot">
    ${privacyBlock(m.privacy)}
    <p class="tip purpose" id="purpose">${esc(P5.purpose(m.number ?? ''))}</p>
    <p class="links">${insideLink('inside', S.inside)}${m.aboutLink ? `<a class="tlink" href="#/about">${esc(S.aboutLink(m.name))} →</a>` : ''}</p>
    ${m.sampleOn ? `<p class="links sample-link" id="sample-on">${esc(S.sampleOn)} <button type="button" class="tlink" data-act="leave-demo">${esc(S.sampleLeave)} →</button></p>`
      : `<p class="links sample-link"><a class="tlink" id="try-sample" href="${m.sampleHref ?? '#/demo'}">${esc(S.sample)} →</a><small class="muted">${esc(S.sampleSub)}</small></p>`}
  </footer>
</main>`;
}

// ---------------------------------------------------------------- the person's side
export interface PersonModel {
  card: Card | null;
  busy: boolean;
  /** "Hide the choices" is on: the person sees only the question. */
  less: boolean;
  picked: Choice | null;
  confirmed: boolean;
  /** Going over the answers: the list so far, with Yes / No. */
  recap: boolean;
  answers: { topic: string; label: string }[];
  /** The picture of a choice, drawn by main.ts (a bundled pictogram, the person's photo or initial): '' for none. */
  pic: (ch: Choice) => string;
  /** The picture shown while there is nothing to point to. */
  waitPic: string;
  /** The whole screen (with the carer's way back and the finish button), or the preview on the carer's screen. */
  full: boolean;
}

const TICK = '<svg class="p-sign" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 50l18 18 38-40"/></svg>';
const DONE = '<svg class="p-tick" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><circle cx="48" cy="48" r="40"/><path d="M28 50l14 14 26-28"/></svg>';

/**
 * The person's screen. One instruction and the question itself on top, then the choices in one centred column, each
 * as wide as the screen (a choice never sits only on the right half), the picture with its word under it, the way out
 * last. No category word above the choices. Nothing moves except the pressed choice. The only other control is the
 * carer's way back, labelled as the carer's, which needs a press and hold; the finish screen has a plain button.
 */
export function personSimple(m: PersonModel): string {
  const P = COPY.simple.person;
  const c = m.card;
  const hold = m.full ? `<button type="button" id="exit" class="hold" title="${P.holdTitle}"><i aria-hidden="true"></i>${P.hold}</button>` : '';
  const tile = (ch: Choice, i: number, cls = '') => {
    const pic = m.pic(ch);
    return `<button type="button" class="pt${ch.role === 'escape' ? ' esc' : ''}${pic ? '' : ' wordonly'}${cls}" data-i="${i}">${pic}<span>${esc(ch.label)}</span></button>`;
  };
  const yesNo = (yes: string, no: string) => `<div class="p-tiles"><button type="button" class="pt yes" data-confirm="${yes}">${TICK}<span>${P.yes}</span></button>
      <button type="button" class="pt no" data-confirm="${no}"><span>${no === 'change' ? P.no : P.recapNo}</span></button></div>`;
  if (m.recap) {
    const list = m.answers.length ? `<ul class="so">${m.answers.map((a) => `<li>${a.topic ? `<span>${esc(a.topic)}</span>` : ''}<b>${esc(a.label)}</b></li>`).join('')}</ul>` : `<p class="so-empty">${COPY.person.recapEmpty}</p>`;
    return `${hold}<p class="p-do">${P.recap}</p>${list}${yesNo('recap-yes', 'recap-change')}`;
  }
  if (!c || c.blocked || !c.choices.length) return `${hold}<div class="listening${m.busy ? ' thinking' : ''}">${m.waitPic}</div>`;
  if (m.less) return `${hold}<p class="p-ask alone">${esc(c.asked)}</p>`;
  if (m.picked && m.confirmed) {
    // the finish: "Thank you. Tea." and the way to hand the phone back; never a dead end, never only a press and hold
    return `<div class="p-done" role="status">${DONE}<p class="p-do">${crisisAnswer(m.picked.label) ? P.thanksTold : P.thanks}</p><div class="p-pick">${m.pic(m.picked)}<p class="p-big">${esc(P.done(m.picked.label))}</p></div></div>
      ${m.full ? `<button type="button" class="p-give" data-act="give-back">${P.give}</button>` : ''}`;
  }
  if (m.picked) {
    return `${hold}<p class="p-do" id="p-so">${esc(P.so(m.picked.label))}</p>
      <div class="p-pick">${m.pic(m.picked)}<p class="p-big">${esc(m.picked.label)}</p></div>${yesNo('yes', 'change')}`;
  }
  const headLines = `<p class="p-do">${P.point}</p><p class="p-ask">${esc(c.asked)}</p>`;
  // (phase 9) the person's own "Not now": the same small tile on the top row of every question screen; it ends the card
  // and the question is kept for later (core/later.ts). Not a choice: it never enters the answers.
  const notNow = m.full ? `<button type="button" class="p-notnow" id="p-notnow" data-not-now="1">${P.notNow}</button>` : '';
  // (it shares the top row with the carer's press and hold, so it adds no height: three choices and the way out still fit)
  const top = hold || notNow ? `<div class="p-top">${hold}${notNow}</div>` : '';
  if (c.scale) {
    // a number scale named in the question: one line of numbers, the two ends named under it, then the way out
    const nums = c.choices.map((ch, i) => (ch.role === 'answer' ? `<button type="button" class="pt wordonly num" data-i="${i}"><span>${esc(ch.label)}</span></button>` : '')).join('');
    const out = c.choices.map((ch, i) => (ch.role === 'escape' ? tile(ch, i) : '')).join('');
    const n = Math.min(6, c.choices.filter((x) => x.role === 'answer').length);
    return `${top}${headLines}<div class="p-tiles scale" style="--n:${n}">${nums}</div>
      <p class="scale-ends"><span>${c.scale.lo} · ${c.scale.lo === 0 ? COPY.scale.low : COPY.scale.lowFromOne}</span><span>${c.scale.hi} · ${COPY.scale.high}</span></p>
      <div class="p-tiles">${out}</div>`;
  }
  // the quick-needs board is the one screen with more than three choices: two to a row, the way out on its own row
  const cls = c.kind === 'needs' ? ' board' : c.kind === 'repair' ? ' ways' : '';
  return `${top}${headLines}<div class="p-tiles${cls}">${c.choices.map((ch, i) => tile(ch, i, ch.role === 'repair' && i >= 3 ? ' quiet' : '')).join('')}</div>`;
}

// ---------------------------------------------------------------- "Today in short"
export interface ShortModel {
  sentences: string[];
  /** Who wrote it: the AI on this device, or the app's rules (core/summary.ts). Never online help. */
  source: 'on-device' | 'rules';
  /** The on-device model is still writing: the rules' sentences stand meanwhile. */
  busy: boolean;
  copied: boolean;
}
/** Two to four sentences of today's answers, who wrote them, and a button to copy them for the family or the therapist. */
export function shortBlock(m: ShortModel | null): string {
  if (!m) return '';
  const K = COPY.simple.short;
  return `<section class="short" id="today-short" data-source="${m.source}" aria-labelledby="short-h"><h2 id="short-h">${K.heading}</h2>
    <p id="short-text">${m.sentences.map(esc).join(' ')}</p>
    <p class="by">${m.source === 'on-device' ? SIGN.spark : SIGN.lock}<span>${esc(m.busy ? K.busy : m.source === 'on-device' ? K.device : K.rules)}</span></p>
    <button type="button" class="btn quiet" data-act="copy-short" aria-live="polite">${m.copied ? K.copied : K.copy}</button></section>`;
}

// ---------------------------------------------------------------- the carer's screen before handing over
export interface CardModel {
  name: string;
  card: Card;
  /** "Hide the choices" is on: the person sees only the question. */
  less: boolean;
  /** The recap is on the person's screen. */
  recap: boolean;
  recapText: string;
  /** The recap was confirmed. */
  recapDone: boolean;
  /** The buttons the card rules give this card (core/actions.ts), the same list as the full view. */
  actions: PartnerAction[];
  made: MadeWhere;
  /** What the person's screen looks like now (personSimple, not full): the preview the carer sees before turning the phone. */
  personHtml: string;
  /** Cloud help is off and could try this question: the blocked screen offers the sheet again. */
  canAskOnline: boolean;
  /** This question needs online help and the browser has no connection: said instead of the offer. */
  offline: boolean;
  /** What they chose the last time this question was asked ('' when it was not): for the carer only. */
  lastTime: string;
  /** "Today in short", shown while the answers are gone over. */
  short?: ShortModel | null;
  /** "More tips" is open: the rest of the advice, under the two lines that always show. */
  tips?: boolean;
  /** The person's usual answer to this question, learned on this device ("Usually: tea (5 of 7)"): '' before three answers. For the carer only. */
  usual?: string;
  /** The answer-reliability guard's line for the carer (web/src/diary.ts, guardBlock): '' when nothing was noticed. Never on the person's screen. */
  guardHtml?: string;
  /** More for the carer on this screen, drawn by main.ts (web/src/phase4.ts): the way to the first-letter helper, who found a first-letter card's words. */
  extraHtml?: string;
  /** Over everything else on this screen (web/src/phase5.ts): the boxed call line, while an answer of this conversation can be urgent. */
  topHtml?: string;
  /**
   * Phase 14: right under the main button, the second one: "Find more choices" (findMoreBlock, core/findmore.ts
   * decides where it is offered) and the one-tap offer of Read aloud (web/src/phase5.ts, speakOffer). '' for none.
   */
  findHtml?: string;
}

/**
 * Phase 14 (judge round 10): "Find more choices" on the screen before handing over a topic card, and where its AI runs
 * here, in one line under it. `where` comes from core/findmore.ts (findMoreOffer).
 */
export function findMoreBlock(where: 'device' | 'cloud'): string {
  const F = COPY.simple.findMore;
  return `<button type="button" class="btn find-more" id="find-more" data-act="find-more">${SIGN.spark}<span>${esc(where === 'device' ? F.device : F.cloud)}</span></button>
    <p class="tip" id="find-more-where">${esc(where === 'device' ? F.deviceWhere : F.cloudWhere)}</p>`;
}

/** Phase 15: "Find more choices" at work, where its button was; the card stays on screen. `.making` is the line the 3 s timer fills in. */
export function findWaitLine(where: 'device' | 'cloud'): string {
  const F = COPY.simple.findMore;
  return `<p class="making find-wait" id="find-wait" role="status"><span class="slow-wait" id="slow-wait"><span class="slow-s">${esc(where === 'device' ? F.waitDevice : F.waitCloud)}</span> <button type="button" class="btn quiet small-btn" data-act="stop-wait">${esc(F.stop)}</button></span></p>`;
}
/** Phase 15: the wait was stopped; the card is the one it was asked from. */
export function findStoppedLine(): string {
  return `<p class="tip" id="find-stopped" role="status" tabindex="-1">${esc(COPY.simple.findMore.stopped)}</p>`;
}
/** Where this card was made: on the screen itself, under the card, never only behind a link. */
/** Phase 8: the routing chip over a card an AI made: where it ran, and why, in one line. */
export function chipBlock(r: { where: 'device' | 'cloud'; text: string; why: string } | null): string {
  if (!r) return '';
  return `<p class="route-chip" id="route-chip" data-where="${r.where}">${r.where === 'cloud' ? SIGN.cloud : SIGN.lock}<span><b class="chip">${esc(r.text)}</b> ${esc(r.why)}</span></p>`;
}
export function madeBlock(w: MadeWhere): string {
  const icon = w.left === 'sent' || w.maker === 'cloud' ? SIGN.cloud : w.left === 'maybe' ? SIGN.maybe : SIGN.lock;
  return `<p class="made-where" id="made-where" data-maker="${w.maker}" data-left="${w.left}"${w.spoken ? ' data-spoken="1"' : ''}>${icon}<span>${w.lines.map(esc).join(' ')}</span></p>`;
}

function actionButtons(m: { name: string }, actions: PartnerAction[]): { primary: string; rest: string } {
  const S = COPY.simple;
  const label = (a: PartnerAction) => (a.act === 'show' ? S.make(m.name) : a.act === 'recap' ? S.recap : a.label);
  const primary = actions.filter((a) => a.primary).map((a) => `<button type="button" class="btn primary" data-act="${a.act}">${esc(label(a))}</button>`).join('');
  const others = actions.filter((a) => !a.primary);
  const rest = others.length ? `<div class="two-btn${others.length === 1 ? ' one' : ''}">${others.map((a) => `<button type="button" class="btn quiet" data-act="${a.act}">${esc(label(a))}</button>`).join('')}</div>` : '';
  return { primary, rest };
}

/** The visible "wait" line: on the steps of the first screen and on the screen the carer reads before handing over. */
export const waitLine = (name: string) => `<p class="waitline" id="wait-line">${SIGN.info}<span>${esc(COPY.simple.wait(name))}</span></p>`;

/**
 * The carer's screen before handing over: 1 say it out loud (the line), 2 turn the phone (what they will see, and the
 * main button), with "Wait. Count to ten. Don't answer for them." on the screen itself. Also the screen for a
 * question that got no card.
 */
export function cardScreen(m: CardModel): string {
  const S = COPY.simple;
  const K = COPY.card;
  const c = m.card;
  const { primary, rest } = actionButtons(m, m.actions);
  const back = navBar({ back: true });
  const foot = `<footer class="foot">${insideLink('inside-card', S.madeLink)}</footer>`;
  const coach = c.coach ? `<p class="coach">${esc(c.coach)}</p>` : '';
  const safety = c.kind === 'body' || c.kind === 'pain' ? `<p class="safety">${COPY.safety}</p>` : '';
  const step = (n: number, text: string) => `<p class="steplabel"><span class="num">${n}</span>${esc(text)}</p>`;

  // no card: a memory question (a line to say instead), or a question nothing here could make choices for
  if (c.kind === 'no-quiz' || c.blocked) {
    const body = c.kind === 'no-quiz'
      ? `<p class="steplabel">${COPY.memory.line}</p><p class="say">${esc(c.say.replace(COPY.notes.tellPrefix, ''))}</p>`
      : `<h1>${S.noCard}</h1>${m.offline ? `<p class="offline" id="offline" role="status">${SIGN.net}<span>${S.offline}</span></p>` : `<p class="why-not">${esc(c.blocked ?? '')}</p>`}<p class="say">${K.justAsk}</p>
         ${m.canAskOnline && !m.offline ? `<button type="button" class="btn" data-act="sheet">${S.useOnline}</button>` : ''}
         <p class="tip">${S.askChoice}</p>
         ${c.retry ? `<button type="button" class="btn primary" id="no-card-ways" data-act="stuck">${S.noCardWays}</button><button type="button" class="btn" id="no-card-topics" data-act="new">${S.noCardTopics}</button>` : ''}`;
    return `<main class="simple wrap one nocard" data-screen="nocard">${back}
  <div class="col">${coach}${body}${m.extraHtml ?? ''}${primary}${rest}${madeBlock(m.made)}</div>${foot}</main>`;
  }

  const say = m.recap || m.recapDone ? `${COPY.person.recapLine} ${m.recapText}` : m.less ? c.asked : c.say;
  const sayLabel = m.recap || m.recapDone ? S.recap : m.less ? K.lessOn : S.step1;
  const tip = c.kind === 'repair' ? COPY.repair.tip : c.kind === 'needs' ? COPY.needs.tip : S.tip;
  const canHide = m.actions.some((a) => a.act === 'less');
  // a narrowing card says in plain words that an AI made this follow-up, and where
  const where = c.source === 'in-cloud' ? 'cloud' : 'device';
  const ai = c.narrow ? `<p class="ai-made" id="ai-made" data-by="${c.narrow.by ?? 'ai'}">${c.narrow.by === 'rules' ? SIGN.lock : SIGN.spark}<span>${esc(c.narrow.by === 'rules' ? S.narrow.labelRules(c.narrow.level, NARROW_LEVELS) : c.narrow.offered ? S.narrow.labelFound(where) : S.narrow.label(c.narrow.level, NARROW_LEVELS, where))}</span></p>` : '';
  return `<main class="simple wrap card" data-screen="card">${back}
  <div class="c-say">${m.topHtml ?? ''}${m.guardHtml ?? ''}${ai}${coach}<div class="stack">${step(1, sayLabel)}<p class="say">${esc(say)}</p></div>${m.usual ? `<p class="usual" id="usual">${SIGN.person}<span>${esc(m.usual)}</span></p>` : m.lastTime ? `<p class="last">${esc(m.lastTime)}</p>` : ''}</div>
  <div class="c-go">${step(2, S.step2(m.name))}
    ${primary}
    ${primary ? m.findHtml ?? '' : ''}
    ${primary ? waitLine(m.name) : ''}
    ${primary ? `<p class="tip" id="tip">${esc(tip)}</p>
    <button type="button" class="tlink more-tips" id="more-tips" data-act="tips" aria-expanded="${!!m.tips}" aria-controls="tips">${m.tips ? S.tipsLess : S.tipsMore}</button>
    ${m.tips ? `<ul class="tips" id="tips">${[...(c.kind === 'repair' || c.kind === 'needs' ? [] : [S.tipWeak]), S.tipExit(m.name), ...(canHide ? [S.lessHint(m.name)] : [])].map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}` : ''}
  </div>
  <div class="c-card"><p class="steplabel muted">${esc(S.preview(m.name))}</p>
    <section id="person" class="person mini pv" aria-label="${esc(S.preview(m.name))}" data-kind="${c.kind}">${m.personHtml}</section>
    ${m.extraHtml ?? ''}
    ${rest}
    ${safety}
    ${m.recap || m.recapDone ? shortBlock(m.short ?? null) : ''}
    ${madeBlock(m.made)}
  </div>${foot}</main>`;
}

// ---------------------------------------------------------------- the carer's screen after an answer
export interface AnsweredModel {
  name: string;
  /** The label they chose and confirmed. */
  label: string;
  /** The question it answers, shown over the answer ("Are you tired?" then "Yes"): '' for the quick-needs board. */
  question: string;
  /** "More" is open: the other buttons, today's answers, "Today in short", how the card was made, the privacy lines. */
  more: boolean;
  /** They chose the way out ("something else", "not sure"): the screen then says what to do now. */
  out: boolean;
  /** The carer's next move for this answer, already drawn (a need's line, a repair way): '' for a plain answer. */
  afterHtml: string;
  /** "Next: second question", when the question was two in one. */
  next: PartnerAction | { act: string; label: string } | null;
  /** The questions that follow from this answer (core/tree.ts): the first is the main button ("Next: …"), made by the rules. */
  follow: string[];
  /** A shorter way, as a suggestion (core/prefs.ts): the person's usual side of the next either-or, asked first. Null when nothing is learned yet. */
  shortcut?: { q: string; line: string; of: string; label: string } | null;
  /** The end of a path: what the carer does now, in one short line (core/tree.ts). '' while a next question is offered. */
  end: string;
  /** After the way out: the next question of the same topic to try, or null. */
  tryNext: string | null;
  /**
   * After the way out: an AI can suggest the next, broader choices (core/narrow.ts), and where it would run here.
   * Null when no further narrowing step is offered (two were made, "not sure", or no AI on this copy).
   */
  narrow: 'device' | 'cloudOn' | 'ask' | 'offline' | null;
  /** The card they left was itself the last narrowing step. */
  narrowLast: boolean;
  /** After the way out: the ways to find out what it is, in the rules' order (core/more.ts), and what the card of more choices offers first. */
  ways?: Way[];
  moreFirst?: string[];
  /** After the way out of a card the person started: the next question of the same conversation stays the first step. */
  keepLead?: boolean;
  short: ShortModel | null;
  /** "Call someone" was answered yes and About them names nobody: a field for one name. */
  who: boolean;
  /** About them is offered (after the first card; at most once a visit). */
  invite: boolean;
  hasAnswers: boolean;
  /** Answers confirmed since this page was opened, newest first. */
  today: { q: string; label: string }[];
  made: MadeWhere;
  privacy: string[];
  /** The answer-reliability guard's line for the carer (web/src/diary.ts, guardBlock): '' when nothing was noticed. */
  guardHtml?: string;
  /** The person started this conversation (web/src/phase4.ts, turnLine): the line over the answer. */
  leadHtml?: string;
  /** After the way out: the first-letter helper's button or buttons (web/src/phase4.ts), drawn by main.ts. */
  outExtra?: string;
  /**
   * Phase 13 (judge round 10, a health P0): the end line is a safety check (core/tree.ts, `alert`): main.ts draws it
   * as a red box with the call button (web/src/phase5.ts, nowAlert). It stands ABOVE "Next" and replaces the green
   * "Now:" line, and the answer above it carries no tick.
   */
  alertHtml?: string;
}

/** They answered: what they chose, "Ask another question" as the main button, and the next step where there is one. */
export function answeredScreen(m: AnsweredModel): string {
  const S = COPY.simple;
  const today = m.today.length ? `<div class="before"><p class="steplabel muted">${S.today}</p><ul>${m.today.map((t) => `<li><span>${esc(t.q)}</span><b>${esc(t.label)}</b></li>`).join('')}</ul></div>` : '';
  const qBtn = (q: string, label = q) => `<button type="button" class="btn ask-next" data-q="${esc(q)}">${esc(label)}</button>`;
  // the carer is led: the next question of the tree is the main button, and "Ask something else" stands under it
  const lead = !m.next && m.follow.length > 0;
  // after the way out with nothing from the tree, the next question of the topic is the main button instead
  const tryMain = m.out && !lead && !m.next && !!m.tryNext;
  const nextBtn = lead ? `<button type="button" class="btn primary ask-next" id="next-q" data-q="${esc(m.follow[0])}" data-next="1"><span><small>${S.nextLabel}</small>${esc(m.follow[0])}</span></button>`
    : tryMain ? `<button type="button" class="btn primary ask-next" id="next-q" data-q="${esc(m.tryNext!)}"><span><small>${S.nextLabel}</small>${esc(m.tryNext!)}</span></button>` : '';
  // (phase 13: under a safety-check alert the call button is the main action; "Ask another question" is not primary)
  const another = `<button type="button" class="btn${m.next || lead || m.out || m.alertHtml ? '' : ' primary'}" id="another" data-act="new">${lead ? S.anotherElse : S.another}</button>`;
  const end = m.alertHtml ? m.alertHtml : m.end && !lead ? `<p class="do-now" id="do-now">${SIGN.tick}<span><small>${S.doNow}</small>${esc(m.end)}</span></p>` : '';
  // the way out was chosen: what to do now, in order of how often it helps (never a dead end)
  const online = m.narrow === 'cloudOn' || m.narrow === 'ask';
  const narrow = m.narrow ? `<button type="button" class="btn narrow" id="narrow" data-act="narrow" ${m.narrow === 'offline' ? 'disabled' : ''}>${SIGN.spark}<span>${online ? S.narrow.goOnline : S.narrow.go}</span></button>
      <p class="tip" id="narrow-where">${esc(S.narrow[m.narrow])}</p>` : '';
  // (18 Nov, the role-play: six things to press were too many for a tired carer. Three stay on the screen: the next
  // question, the AI's broader choices, and "Ask them to show or write it"; the rest is under "More".)
  // (18 Nov, phase 4: the first-letter helper joins them. Still three at most on the screen, in this order; what does not fit is the first thing under "More".)
  const showWrite = `<button type="button" class="btn" id="show-write" data-act="stuck">${S.out.showWrite}</button>`;
  // (18 Nov, the owner's walk on his phone: "Next: Are you hungry?" after "something else" to a drink jumped to another
  // topic, and he did not know how to find out what else. The screen now has one line that says what to do and the
  // ways in the rules' order (core/more.ts): a step the rules make first, the AI's last, and no question of another
  // topic. A question of the same conversation stays the first step where the person started it, `keepLead`.)
  void tryMain; void showWrite;
  const waysHtml = m.out && m.ways ? waysBlock({ ways: m.ways, moreFirst: m.moreFirst ?? [], letterHtml: m.outExtra ?? '', narrowHtml: narrow, aiSecond: online }) : '';
  const outBlock = m.out ? `<div class="next-steps" id="after-out"><p class="steplabel out-lead" id="out-lead">${S.out.heading}</p>
      ${m.keepLead ? nextBtn : ''}${waysHtml}${m.narrowLast ? `<p class="tip">${S.narrow.last}</p>` : ''}</div>` : '';
  const outMore = m.out ? `<div class="next-steps" id="out-more">${m.label === 'not sure' ? `<p class="tip">${esc(S.out.notSure)}</p>` : ''}
      ${m.ways?.includes('needs') ? '' : `<button type="button" class="btn" data-act="needs">${S.out.needs}</button>`}
      <button type="button" class="btn" data-act="own">${S.out.own}</button></div>` : '';
  const rest = m.follow.slice(lead ? 1 : 0);
  const follow = rest.length ? `<div class="next-steps" id="follow"><p class="steplabel muted">${S.nextHeading}</p>${rest.map((q) => qBtn(q).replace('data-q=', 'data-next="1" data-q=')).join('')}</div>` : '';
  const who = m.who ? `<form id="who" class="who-form"><label for="who-name">${S.who.label}</label><div class="row"><input id="who-name" class="field" autocomplete="off"><button type="submit" class="btn">${S.who.go}</button></div></form>` : '';
  const invite = m.invite ? `<div class="invite" id="invite"><b>${esc(S.invite.title(m.name))}</b><p>${S.invite.body}</p>
      <a class="btn" href="#/about">${S.invite.add}</a><button type="button" class="btn quiet" data-act="invite-later">${S.invite.later}</button></div>` : '';
  const big = m.label.charAt(0).toUpperCase() + m.label.slice(1);
  const others = `<div class="two-btn">${m.out ? '' : `<button type="button" class="btn quiet" data-act="needs">${S.needsShort}</button>`}${m.hasAnswers ? `<button type="button" class="btn quiet" data-act="recap">${S.recap}</button>` : ''}${m.out ? '' : `<button type="button" class="btn quiet" data-act="stuck">${esc(COPY.card.stuck)}</button>`}</div>`;
  // one line stays on the screen: what left for this card (it is "Nothing was sent." for every card the rules made)
  const oneLine = `<p class="lock" id="left-line" data-left="${m.made.left}">${m.made.left === 'nothing' ? SIGN.lock : m.made.left === 'sent' ? SIGN.cloud : SIGN.maybe}<span>${esc(m.made.lines.slice(1).join(' '))}</span></p>`;
  return `<main class="simple wrap s-answered" data-screen="answered">
  ${navBar({ back: true })}
  <div class="col">
    ${m.leadHtml ?? ''}
    <div class="chose${m.alertHtml ? ' alert' : m.out ? ' out' : ''}" id="chose" role="status">${m.alertHtml ? SIGN.alert : m.out ? SIGN.out : SIGN.tick}<div>${m.question ? `<span class="asked" id="chose-q">${esc(m.question)}</span>` : `<span class="muted small">${esc(S.choseNeed(m.name))}</span>`}<b id="chose-a">${esc(big)}</b></div></div>
    ${m.guardHtml ?? ''}
    ${m.afterHtml}
    ${end}
    ${m.next ? `<button type="button" class="btn primary" data-act="${m.next.act}">${esc(m.next.label)}</button>` : ''}
    ${m.out ? '' : nextBtn}${!m.out && lead && m.shortcut ? `<div class="shortcut" id="shortcut"><p class="tip">${SIGN.person}<span>${esc(m.shortcut.line)}</span></p><button type="button" class="btn ask-next" data-short="1" data-of="${esc(m.shortcut.of)}" data-label="${esc(m.shortcut.label)}" data-q="${esc(m.shortcut.q)}">${esc(m.shortcut.q)}</button></div>` : ''}${m.out ? '' : follow}
    ${m.out ? '' : another}
    ${outBlock}${who}
    ${invite}
    ${oneLine}
    <button type="button" class="btn quiet more-btn" id="more" data-act="more" aria-expanded="${m.more}" aria-controls="more-body">${m.more ? S.less : S.more}</button>
  </div>
  ${m.more ? `<div class="col more-body" id="more-body">${m.out ? `${another}${m.keepLead ? follow : ''}${outMore}` : ''}${others}${today}${shortBlock(m.short)}${madeBlock(m.made)}
    ${privacyBlock(m.privacy, S.privacy.answers)}
    ${insideLink('inside-card', S.madeLink)}</div>` : ''}
</main>`;
}

export interface SheetModel {
  about: string;
  /** The one line of the request that changes with the question ("Partner asks: …", after the name swap). */
  line: string;
  /** This browser has the on-device model (it made no card for this question): the sheet then does not say it has none. */
  deviceThere: boolean;
  /**
   * The sheet is for a narrowing step (after "something else"): `line` is then the part of the request that comes from
   * the conversation, word for word (the question and the choices that did not fit), and `request` the whole request.
   */
  narrow?: { request: string; /** Phase 14: "Find more choices" before handing over: nothing was turned down yet, so the sheet does not say "None of those fitted". */ offered?: boolean };
}

/**
 * Online help, asked in plain words at the moment a question needs it. Everything that decides it stands above the two
 * buttons: the line that would go, what else is in the request, what can be missed, what is never sent, the data use.
 */
export function consentSheet(m: SheetModel): string {
  const K = COPY.consent.sheet;
  // a narrowing step: plain words first ("It sees only this: …"), the app's fixed instructions named in one line, and
  // the whole request, word for word, one tap away (18 Nov, the role-play: the raw instructions led the sheet)
  if (m.narrow) {
    const N = K.narrow;
    return `<div class="dim"></div>
<div class="sheet narrow-sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h">
  <h2 id="sheet-h" tabindex="-1">${N.heading}</h2>
  <p>${m.narrow.offered ? N.bodyFound : N.body}</p>
  <div class="goes"><p class="q" id="sheet-line">${esc(m.line)}</p><p class="small muted">${N.plus}</p></div>
  <ul class="facts">
    <li class="n">${SIGN.lock}<span><b>${K.neverLabel}</b> ${esc(N.never(m.about))}</span></li>
    <li class="w">${SIGN.info}<span><b>${K.dataLabel}</b> ${esc(K.data)}</span></li>
  </ul>
  <div class="choice"><button type="button" class="btn primary" data-act="sheet-yes">${N.yes}</button>
  <button type="button" class="btn" data-act="sheet-no">${N.no}</button></div>
  <p class="small muted after">${esc(K.after)}</p>
  <details class="whole" id="sheet-whole"><summary>${N.whole}</summary><pre>${esc(m.narrow.request)}</pre></details>
  <p class="links"><a class="tlink" href="${COPY.consent.termsLink}" target="_blank" rel="noopener">${K.terms}</a></p>
</div>`;
  }
  return `<div class="dim"></div>
<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h">
  <h2 id="sheet-h" tabindex="-1">${K.heading}</h2>
  <p>${esc(m.deviceThere ? K.bodyDevice(m.about) : K.bodyNoDevice(m.about))}</p>
  <div class="goes"><p class="small muted">${K.goes}</p><p class="q" id="sheet-line">${esc(m.line)}</p></div>
  <ul class="facts">
    <li class="y">${SIGN.cloud}<span><b>${K.sentLabel}</b> ${esc(K.sent)}</span></li>
    <li class="n">${SIGN.lock}<span><b>${K.neverLabel}</b> ${esc(K.never(m.about))}</span></li>
    <li class="w">${SIGN.info}<span><b>${K.dataLabel}</b> ${esc(K.data)}</span></li>
  </ul>
  <div class="choice"><button type="button" class="btn primary" data-act="sheet-yes">${K.yes}</button>
  <button type="button" class="btn" data-act="sheet-always">${K.always}</button>
  <button type="button" class="btn" data-act="sheet-no">${K.no}</button></div>
  <p class="small muted after">${esc(K.after)}</p>
  <details class="whole" id="sheet-tech"><summary>${K.tech}</summary><p>${K.techBody}</p></details>
  <p class="links"><a class="tlink" href="#/cloud">${K.exact} →</a><a class="tlink" href="${COPY.consent.termsLink}" target="_blank" rel="noopener">${K.terms}</a></p>
</div>`;
}

export type AboutRow = 'names' | 'people' | 'foods' | 'places' | 'health';

/** About them, as four plain rows over the same fields as the full page: offered, never required. */
/**
 * "What we've learned about them": every line the app counted from the answers on this device (core/prefs.ts), in
 * plain words with its counts. The carer keeps a line as a fact, removes it, or forgets everything learned.
 */
export function learnedBlock(m: { name: string; lines: Learned[]; facts: string[]; short: string[] | null }): string {
  const L = COPY.simple.learned;
  const lines = m.lines.map((l) => `<li data-key="${esc(l.key)}"><span>${esc(l.text)}</span><span class="acts">${l.care ? '' : `<button type="button" class="btn quiet small-btn" data-act="learned-keep" data-key="${esc(l.key)}">${L.keep}</button>`}<button type="button" class="btn quiet small-btn" data-act="learned-remove" data-key="${esc(l.key)}">${L.remove}</button></span></li>`).join('');
  const facts = m.facts.map((f, i) => `<li><span>${esc(f)}</span><span class="acts"><button type="button" class="btn quiet small-btn" data-act="fact-remove" data-fact="${i}">${L.remove}</button></span></li>`).join('');
  return `<section class="learned" id="learned" aria-labelledby="learned-h"><h2 id="learned-h">${esc(L.heading(m.name))}</h2>
    <p class="lock">${SIGN.lock}<span>${esc(L.how(m.name))}</span></p>
    ${m.short ? `<p class="learned-short" id="learned-short">${SIGN.spark}<span>${m.short.map(esc).join(' ')} <small>${L.shortBy}</small></span></p>` : ''}
    ${lines ? `<ul class="learned-list" id="learned-list">${lines}</ul>` : `<p class="tip" id="learned-none">${esc(L.none(m.name))}</p>`}
    ${facts ? `<p class="steplabel muted">${L.kept}</p><ul class="learned-list" id="learned-kept">${facts}</ul>` : ''}
    ${lines ? `<button type="button" class="btn quiet" data-act="learned-forget">${L.forget}</button>` : ''}</section>`;
}

/** The family's own photos: each with its word and "Delete", "Add a photo", and "Delete all photos". On this device only. */
export function photosBlock(m: { name: string; photos: Photo[]; error?: string; desktopAi?: boolean }): string {
  const P = COPY.simple.photos;
  const tiles = m.photos.map((p) => `<li data-id="${esc(p.id)}"><img class="photo own" src="${p.data}" alt=""><b>${esc(p.word)}</b><button type="button" class="btn quiet small-btn" data-act="photo-del" data-id="${esc(p.id)}" aria-label="${P.del}: ${esc(p.word)}">${P.del}</button></li>`).join('');
  const full = m.photos.length >= PHOTO_CAP;
  return `<section class="photos" id="photos" aria-labelledby="photos-h"><h2 id="photos-h">${esc(P.heading(m.name))}</h2>
    <p class="tip">${esc(P.why(m.name))}</p>
    <p class="lock" id="photos-lock">${SIGN.lock}<span>${m.desktopAi ? P.lockDesktop : P.lock}</span></p>
    ${tiles ? `<ul class="photo-list" id="photo-list">${tiles}</ul>` : `<p class="tip" id="photos-none">${P.none}</p>`}
    ${m.error ? `<p class="warn" role="alert" id="photo-error">${esc(m.error)}</p>` : ''}
    ${full ? `<p class="tip">${P.full}</p>` : `<button type="button" class="btn" data-act="photo-new">${SIGN.photo}<span>${P.add}</span></button><input type="file" id="photo-file" accept="image/*" hidden>`}
    ${tiles ? `<button type="button" class="btn quiet" data-act="photo-del-all">${P.delAll}</button>` : ''}</section>`;
}

/** Where the picture sits in the square viewport for a frame, as CSS (percent of the viewport): the same arithmetic as the crop. */
export function frameStyle(f: Frame, w: number, h: number): string {
  const r = cropRect(f, w, h);
  const width = (w / r.side) * 100;
  const height = (h / r.side) * 100;
  return `width:${width.toFixed(3)}%;height:${height.toFixed(3)}%;left:${(-(r.x / r.side) * 100).toFixed(3)}%;top:${(-(r.y / r.side) * 100).toFixed(3)}%`;
}

export interface PhotoDraftModel { src: string; w: number; h: number; frame: Frame; step: 'frame' | 'label'; framed: string; word: string; error: string }
/** Adding a photo, in two steps over the screen: frame it by hand (move, zoom), then give it its word. */
export function photoSheet(m: PhotoDraftModel): string {
  const P = COPY.simple.photos;
  const body = m.step === 'frame'
    ? `<h2 id="photo-h" tabindex="-1">${P.frame.heading}</h2><p>${P.frame.how}</p>
  <div class="crop" id="crop" tabindex="0" role="img" aria-label="${P.frame.view}"><img id="crop-img" src="${m.src}" alt="" draggable="false" style="${frameStyle(m.frame, m.w, m.h)}"></div>
  <div class="zoom"><button type="button" class="btn" data-act="photo-zoom" data-by="-0.25" aria-label="${P.frame.zoomOut}">−</button><input type="range" id="crop-zoom" min="1" max="4" step="0.05" value="${m.frame.zoom}" aria-label="${P.frame.zoom}"><button type="button" class="btn" data-act="photo-zoom" data-by="0.25" aria-label="${P.frame.zoomIn}">+</button></div>
  <div class="choice"><button type="button" class="btn primary" data-act="photo-use">${P.frame.use}</button><button type="button" class="btn" data-act="photo-cancel">${P.frame.cancel}</button></div>`
    : `<h2 id="photo-h" tabindex="-1">${P.label.heading}</h2>
  <form id="photo-form" class="photo-form"><img class="photo own big" id="photo-framed" src="${m.framed}" alt=""><p>${P.label.how}</p>
  <label for="photo-word">${P.label.field}</label><input id="photo-word" class="field" autocomplete="off" autocapitalize="none" maxlength="${WORD_MAX}" value="${esc(m.word)}">
  ${m.error ? `<p class="warn" role="alert" id="photo-error">${esc(m.error)}</p>` : ''}
  <div class="choice"><button type="submit" class="btn primary">${P.label.save}</button><button type="button" class="btn" data-act="photo-reframe">${P.label.back}</button><button type="button" class="btn" data-act="photo-cancel">${P.frame.cancel}</button></div></form>`;
  return `<div class="dim"></div><div class="sheet photo-sheet" id="photo-sheet" role="dialog" aria-modal="true" aria-labelledby="photo-h">${body}</div>`;
}

export function aboutSimple(m: { profile: Profile; open: AboutRow | null; saved: boolean; learned?: Learned[]; learnedShort?: string[] | null; photos?: Photo[]; photoError?: string; health?: HealthNotes; backupHtml?: string; numberHtml?: string; desktopAi?: boolean }): string {
  const S = COPY.simple.about;
  const HN = COPY.simple.health;
  const h = m.health ?? NO_HEALTH;
  const noted = [...HEALTH_TOGGLES.filter((k) => h[k]).map((k) => HN.toggles[k]), ...(h.text.trim() ? [h.text.trim().slice(0, 40)] : [])];
  const A = COPY.about;
  const p = m.profile;
  const count = (n: number) => (n ? String(n) : '+');
  const listed = (xs: string[]) => (xs.length ? xs.join(', ') : S.none);
  const row = (id: AboutRow, ava: string, title: string, summary: string, filled: boolean, body: string) => {
    const open = m.open === id;
    return `<div class="rowcard${open ? ' open' : ''}" data-row="${id}">
      <button type="button" class="rowhead" data-act="row" data-row="${id}" aria-expanded="${open}"><span class="ava">${esc(ava)}</span><span class="t"><b>${title}</b><small>${esc(summary)}</small></span><span class="go">${filled ? S.change : S.add}</span></button>
      ${open ? `<div class="rowbody">${body}</div>` : ''}</div>`;
  };
  const text = (key: 'foods' | 'places' | 'tv' | 'music', label: string) => `<label>${label} <small>(${A.onePerLine})</small><textarea data-list="${key}" rows="3">${esc(p[key].join('\n'))}</textarea></label>`;
  const people = p.people.map((x, i) => `<fieldset class="who"><legend>${A.person} ${i + 1}</legend>
      <label>${A.name}<input data-person="${i}" data-field="name" value="${esc(x.name)}"></label>
      <label>${A.relation}<input data-person="${i}" data-field="relation" value="${esc(x.relation)}"></label>
      <label class="check"><input type="checkbox" data-person="${i}" data-field="household" ${x.household ? 'checked' : ''}>${A.livesHere}</label>
      <button type="button" class="btn quiet small-btn" data-act="person-remove" data-person="${i}">${A.remove}</button>
    </fieldset>`).join('');
  const names = [p.personName, p.partnerName].filter(Boolean);
  return `<main class="simple wrap one about-simple" data-screen="about">
  ${navBar({ back: true })}
  <div><h1>${esc(COPY.simple.aboutLink(p.personName))}</h1><p class="sub">${esc(S.sub(p.personName))}</p></div>
  <p class="lock banner">${SIGN.lock}<span>${S.lock}</span></p>
  <p class="tip">${esc(A.nudge(p.personName))}</p>
  <form id="about" class="rows">
    ${row('names', p.personName ? p.personName[0].toUpperCase() : '+', S.rows.names, names.length ? names.join(' · ') : S.none, names.length > 0,
      `<label>${A.theirName}<input data-field="personName" value="${esc(p.personName)}"></label><label>${A.yourName}<input data-field="partnerName" value="${esc(p.partnerName)}"></label>`)}
    ${row('people', count(p.people.length), S.rows.people, p.people.length ? p.people.map((x) => (x.relation ? `${x.name} (${x.relation})` : x.name)).filter(Boolean).join(', ') || S.none : S.none, p.people.length > 0,
      `${people}<button type="button" class="btn" data-act="person-add">${A.addPerson}</button>`)}
    ${row('foods', count(p.foods.length), S.rows.foods, listed(p.foods), p.foods.length > 0, text('foods', A.foods))}
    ${row('places', count(p.places.length + p.tv.length + p.music.length), S.rows.places, listed([...p.places, ...p.tv, ...p.music]), p.places.length + p.tv.length + p.music.length > 0,
      `${text('places', A.places)}${text('tv', A.tv)}${text('music', A.music)}`)}
    ${row('health', hasHealth(h) ? '✓' : '+', HN.row, noted.length ? noted.join(', ') : HN.none, hasHealth(h),
      `<p class="tip">${HN.lead}</p><p class="lock" id="health-lock">${SIGN.lock}<span>${HN.lock}</span></p>
      ${HEALTH_TOGGLES.map((k) => `<label class="check"><input type="checkbox" data-health="${k}" ${h[k] ? 'checked' : ''}>${HN.toggles[k]}</label>`).join('')}
      <label>${HN.text} <small>${HN.textHint}</small><textarea data-health="text" id="health-text" rows="3" maxlength="${HEALTH_TEXT_MAX}">${esc(h.text)}</textarea></label>${m.numberHtml ?? ''}`)}
  </form>
  <p id="saved" class="saved" role="status">${m.saved ? A.saved : ''}</p>
  <a class="btn primary" href="#/">${A.done}</a>
  ${photosBlock({ name: p.personName, photos: m.photos ?? [], error: m.photoError, desktopAi: m.desktopAi })}
  ${learnedBlock({ name: p.personName, lines: m.learned ?? [], facts: p.other ?? [], short: m.learnedShort ?? null })}
  ${m.backupHtml ?? ''}
  <button type="button" class="btn quiet danger" id="delete-everything" data-act="delete-all">${COPY.simple.photos.everything}</button>
  <p class="small muted more">${S.more} <button type="button" class="tlink" data-act="inside-about">${S.moreLink} →</button></p>
</main>`;
}
