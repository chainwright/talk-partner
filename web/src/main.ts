// The web client: partner screen, person screen, About me, cloud help consent, first run, judge mode.
// All card logic is in the shared core (../../core); this file is UI, local storage and the Firebase engine.
// Every string a person reads comes from core/copy.ts.

import './styles.css';
import './fonts.css';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine } from '../../core/engine';
import { addAnswer, answerCounts, lastAnswer, whenText, type Answered } from '../../core/history';
import { LEGS } from '../../core/models';
import { bodyDetailCard, makeCard, quizOverrideCard, repairCard } from '../../core/pipeline';
import { countSwaps, sessionReceipt, sessionTally } from '../../core/receipt';
import { cloudTextRequest } from '../../core/requests';
import { BODY_REGIONS } from '../../core/rules';
import { SAMPLE_FIRST, SAMPLE_PROFILE, SAMPLE_QUESTIONS } from '../../core/sample';
import { stripQuestion } from '../../core/strip';
import { EMPTY_PROFILE, type BodyRegion, type Card, type CardWhy, type Choice, type Profile, type StepTrace, type SupportLevel } from '../../core/types';
import { webConfig } from './ai/config';
import { pickEngine } from './ai/pick';
import { CROSS, TICK, builtinPicto, monogram, photoTile } from './pictos';
import { kvClear, kvGet, kvSet } from './store';
import { loadTrial, trialAct, trialClock, trialInput, trialScreen } from './trial';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const C = COPY;

/** 'trial' is the hidden stopwatch for devlog/TRIAL_PROTOCOL.md: reachable only by typing #/trial, never linked. */
type Route = 'partner' | 'welcome' | 'about' | 'cloud' | 'person' | 'how' | 'trial';

interface Settings {
  cloudHelp: boolean;
  support: SupportLevel;
  welcomed: boolean;
}

interface State {
  /** Never null: a copy with no project settings gets the rules-only engine (ai/pick.ts), so code cards still work. */
  engine: Engine;
  /** 'checking' until the browser has answered the capability query: nothing is said about this computer before that. */
  device: DeviceStatus | 'checking';
  downloading: number | null;
  warming: boolean;
  profile: Profile;
  settings: Settings;
  /** Judge mode: the made-up family is loaded in memory; the real profile on disk is untouched. */
  demo: boolean;
  busy: boolean;
  card: Card | null;
  /** The card "We're stuck" replaced with the repair card; "Back to the choices" restores it. */
  before: Card | null;
  picked: Choice | null;
  confirmed: boolean;
  /** "Hide the choices": the person sees only the headline. */
  less: boolean;
  /** Confirmed answers this session, for the recap. */
  answers: { topic: string; label: string }[];
  recap: boolean;
  recapDone: boolean;
  lastQuestion: string;
  error: string | null;
  /** Confirmed answers kept on this computer (IndexedDB key 'history'); in judge mode, in memory only. Never sent, never in a prompt. */
  history: Answered[];
  /** When the card on screen was made: "last time" only looks at answers from before it. */
  cardAt: number;
  /** The card on screen is the one judge mode opened with (made in code before the first draw): it is shown without an entrance. */
  first: boolean;
  /** Every card made this session (judge mode tally). */
  made: Card[];
  waitStart: number | null;
  consentChecked: boolean;
  saved: boolean;
}

const cfg = webConfig();
const state: State = {
  engine: pickEngine(cfg),
  device: 'checking',
  downloading: null,
  warming: false,
  profile: { ...EMPTY_PROFILE },
  settings: { cloudHelp: false, support: 'more', welcomed: false }, // cloud help off by default (§1.5)
  demo: false,
  busy: false,
  card: null,
  before: null,
  picked: null,
  confirmed: false,
  less: false,
  answers: [],
  history: [],
  cardAt: 0,
  first: false,
  recap: false,
  recapDone: false,
  lastQuestion: '',
  error: null,
  made: [],
  waitStart: null,
  consentChecked: false,
  saved: false,
};

// ---------------------------------------------------------------- routing
function route(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'demo') { if (!state.demo) void enterDemo().then(render); return 'partner'; }
  if (h === 'about') return 'about';
  if (h === 'cloud') return 'cloud';
  if (h === 'person') return 'person';
  if (h === 'how') return 'how';
  if (h === 'trial') return 'trial';
  if (h === 'welcome' || (!state.settings.welcomed && !state.demo)) return 'welcome';
  return 'partner';
}
/** Changes the hash (the hashchange event draws the screen); draws directly when the hash is already there. */
function go(r: Route | 'demo' | '') {
  const h = r ? `#/${r}` : '';
  if (location.hash.replace(/^#\/?$/, '') === h) render(); else location.hash = h;
}

function enterDemo(): Promise<void> {
  if (state.demo) return Promise.resolve();
  state.demo = true;
  state.profile = SAMPLE_PROFILE;
  state.history = []; // the sample family starts with no answers; the real list on disk is untouched
  resetCard();
  return firstCard();
}
/**
 * Judge mode opens with one card already made, so the first thing on screen is the product and not an empty pane.
 * The question is one that code decides alone (core/sample.ts, `SAMPLE_FIRST`): no model runs, nothing is sent, and
 * the card is there before the first draw. It is a real card from the same pipeline as every other and it is counted
 * in the session line and the receipt like any other.
 */
async function firstCard(): Promise<void> {
  try {
    const card = await makeCard(SAMPLE_FIRST, {
      profile: SAMPLE_PROFILE, support: state.settings.support, engine: state.engine,
      allowCloud: state.settings.cloudHelp, deviceReady: state.device === 'available',
    });
    if (!state.demo || state.card || state.busy) return; // a question was asked meanwhile, or judge mode was left
    state.lastQuestion = SAMPLE_FIRST;
    setCard(card);
    state.made.push(card);
    state.first = true;
  } catch { /* no first card: the screen opens empty, as it did before */ }
}
async function leaveDemo() {
  state.demo = false;
  state.profile = (await kvGet<Profile>('profile')) ?? { ...EMPTY_PROFILE };
  state.history = (await kvGet<Answered[]>('history')) ?? [];
  resetCard();
  go('');
}
function resetCard() { state.card = null; state.first = false; state.before = null; state.picked = null; state.confirmed = false; state.less = false; state.recap = false; state.recapDone = false; state.waitStart = null; }
/**
 * Every new card the person is shown (a made card, a body-map step, the next page, the override) bumps this counter.
 * The render keys the entrance animation on it and on the route, so an animation plays once per real event and never
 * again on a redraw caused by a tap, a toggle or a status update.
 */
let cardSeq = 0;
function setCard(c: Card | null) { state.card = c; state.first = false; if (c) { cardSeq++; state.cardAt = Date.now(); } }

// ---------------------------------------------------------------- persistence
async function load() {
  const p = await kvGet<Profile>('profile');
  if (p) state.profile = { ...EMPTY_PROFILE, ...p, people: p.people ?? [] };
  const s = await kvGet<Settings>('settings');
  if (s) state.settings = { ...state.settings, ...s };
  const h = await kvGet<Answered[]>('history');
  if (Array.isArray(h)) state.history = h;
}
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveProfile() {
  if (state.demo) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void kvSet('profile', state.profile).then(() => { state.saved = true; const el = document.querySelector('#saved'); if (el) el.textContent = C.about.saved; }); }, 250);
}
function saveSettings() { void kvSet('settings', state.settings); }

// ---------------------------------------------------------------- pieces
function nav(): string {
  const name = state.profile.personName;
  const cloud = state.settings.cloudHelp ? 'on' : 'off';
  return `<header class="top">
    <a class="brand" href="#/">${C.app.name}</a>
    <nav aria-label="Sections">
      <a href="#/about">${esc(C.app.nav.about(name))}</a>
      <a href="#/cloud">${C.app.nav.cloud}: ${cloud}</a>
      <a href="#/how">${C.app.nav.how}</a>
      ${state.demo ? `<button class="link" data-act="leave-demo">${C.judge.exit}</button>` : `<a href="#/demo">${C.app.nav.judge}</a>`}
    </nav></header>`;
}
const footer = () => `<footer>${C.footer}</footer>`;

function statusLine(): string {
  if (!cfg) return `<span class="dot off"></span>${C.status.noConfig}`;
  if (state.warming) return `<span class="dot wait"></span>${C.status.warming}`;
  switch (state.device) {
    case 'checking': return `<span class="dot wait"></span>${C.status.checking}`;
    case 'available': return `<span class="dot ok"></span>${C.status.ready}`;
    case 'downloading': return `<span class="dot wait"></span>${C.status.downloading(state.downloading !== null ? `: ${Math.round(state.downloading * 100)}%` : '')}`;
    case 'downloadable': return `<span class="dot wait"></span>${C.status.notDownloaded} <button class="link" data-act="download">${C.status.download}</button>`;
    default: {
      const tail = state.settings.cloudHelp ? C.status.unavailableCloudOn : `${C.status.unavailableCloudOff} <a href="#/cloud">${C.blocked.turnOn}</a>`;
      return `<span class="dot off"></span>${C.status.unavailable} ${tail}`;
    }
  }
}

function badge(c: Card): string {
  if (c.blocked) return `<span class="badge none">${C.badge.none}</span>`;
  if (c.source === 'code') return `<span class="badge code">${C.badge.code}</span>`;
  if (c.source === 'on-device') return `<span class="badge device">${c.ranOffline ? C.badge.offline : C.badge.device}</span>`;
  return `<span class="badge cloud">${C.badge.cloud}</span>`;
}

/**
 * The badge and, after it, what left this computer for this card: one line that is always on screen and always true.
 * "Left" is the receipt's own definition (`Card.cloudPayload` is recorded only when the SDK reported that the cloud
 * answered); the swap counts are read from the recorded swaps, the same numbers the receipt shows.
 */
function badgeLine(c: Card): string {
  const T = C.badge.tail;
  let tail: string = T.kept;
  if (c.cloudPayload) { const n = countSwaps(c.cloudSwaps); tail = T.sent(n.names, n.other); }
  else if (c.cloudAttempted) tail = T.attempted;
  // a card made on this computer that offers About-me entries says so: the cloud step could not have offered them
  else if (c.source === 'on-device' && !c.blocked && c.why?.personal?.length) tail = `${T.kept} · ${T.personal(c.why.personal.join(', '))}`;
  return `<p class="badge-line">${badge(c)}<span class="tail">· ${esc(tail)}</span></p>`;
}

function sentPanel(c: Card): string {
  const swaps = c.cloudSwaps?.length ? `<p class="swaps">${C.sent.swaps}<br>${c.cloudSwaps.map(esc).join('<br>')}</p>` : '';
  if (c.cloudPayload) return `<p>${c.source === 'in-cloud' ? C.sent.sentFor : C.sent.notUsed}</p><pre>${esc(c.cloudPayload)}</pre>${swaps}`;
  if (c.cloudAttempted) return `<p>${C.sent.attempted}</p><pre>${esc(c.cloudAttempted)}</pre>${swaps}`;
  if (c.unsentPayload) return `<p>${state.settings.cloudHelp ? C.sent.notSentOn : C.sent.notSent}</p><pre>${esc(c.unsentPayload)}</pre>${swaps}`;
  return `<p>${C.sent.nothing}</p>`;
}

function traceList(t: StepTrace[] | undefined): string {
  if (!t) return '';
  return `<ul class="trace">${t.map((s) => `<li class="${s.ran}${s.used ? ' used' : ''}" data-step="${s.step}"><b>${C.how.steps[s.step]}</b>: ${C.how.ran[s.ran]}${s.ms ? ` (${s.ms} ms)` : ''}${s.used ? ` · ${C.how.used}` : ''}<br><span>${esc(s.why)}</span></li>`).join('')}</ul>`;
}

/**
 * "Why this card" as one line: what the model proposed, what code kept, added and dropped (each with its rule), who
 * decided, where the headline came from. Every value is read from `Card.why`, which the pipeline wrote while it worked.
 */
function whyLine(w: CardWhy, ranOffline = false): string {
  const Y = C.how.why;
  const parts: string[] = [];
  if (w.proposed) {
    const p = w.proposed;
    const opts = p.options.length ? ` · ${Y.options}: ${p.options.join(' / ')}` : '';
    parts.push(`<b>${p.step === 'stripped' && ranOffline ? Y.proposedOffline : Y.proposed[p.step]}</b>: ${esc(p.topic || '—')} · ${esc(p.kind)} · ${esc(p.choices.join(', ') || '—')}${esc(opts)}`);
  } else parts.push(`<b>${Y.noProposal}</b>`);
  if (w.kept.length) parts.push(`<b>${Y.kept}</b>: ${esc(w.kept.join(', '))}`);
  if (w.added.length) parts.push(`<b>${Y.added}</b>: ${esc(w.added.map((a) => `${a.label} (${a.from})`).join(', '))}`);
  if (w.dropped.length) parts.push(`<b>${Y.dropped}</b>: ${esc(w.dropped.map((d) => `${d.label} (${d.rule})`).join(', '))}`);
  if (w.personal?.length) parts.push(`<b>${Y.personal}</b>: ${esc(w.personal.join(', '))}`);
  parts.push(`<b>${Y.decided}</b>: ${esc(w.decided)}`);
  parts.push(`<b>${Y.headline}</b>: ${esc(w.headline)}`);
  return parts.join(' · ');
}

/** The panel: one line, open in judge mode and on "How this works"; on the partner screen it sits inside "How this card was made". */
function whyPanel(c: Card, open: boolean): string {
  if (!c.why) return '';
  return `<details class="why" ${open ? 'open' : ''}><summary>${C.how.why.heading}</summary><p>${whyLine(c.why, !!c.ranOffline)}</p></details>`;
}

/**
 * How this card was made, in the order a judge reads it: why this card → where each step ran → what was sent. The same
 * three panels, open, in both modes. In judge mode they stand under the card; on the partner screen they sit inside one
 * closed disclosure (`#made`) with the privacy receipt (folded, it is long) after them: one click shows all three, and
 * nothing is removed, only folded.
 */
function madePanels(c: Card): string {
  return `${whyPanel(c, true)}
    <details class="sent" open><summary>${C.how.traceHeading}</summary>${traceList(c.trace)}</details>
    <details class="sent" id="sent" open><summary>${C.sent.heading}</summary>${sentPanel(c)}</details>`;
}

/** Every card made this session by its badge, and every step that failed, on any card: a blocked card's failed step counts too. */
function tally(): { device: number; cloud: number; code: number; none: number; failed: number } {
  return sessionTally(state.made);
}

function legsTable(): string {
  const names = C.how.legNames;
  return `<table><tr><th>${C.how.columns.step}</th><th>${C.how.columns.mode}</th><th>${C.how.columns.gets}</th><th>${C.how.columns.why}</th></tr>${(Object.keys(LEGS) as (keyof typeof LEGS)[]).map((k) => `<tr><td>${names[k]}</td><td><code>${LEGS[k].mode}</code></td><td>${esc(LEGS[k].gets)}</td><td>${esc(LEGS[k].why)}</td></tr>`).join('')}</table>`;
}

/** The privacy receipt for this session: counted on the payloads the cards recorded (core/receipt.ts), never estimated. */
function receiptPanel(open: boolean): string {
  const R = C.judge.receipt;
  const r = sessionReceipt(state.made, state.profile);
  const K = R.columns; // on a phone the cells stack, each labelled by its column name (styles.css)
  const rows = r.perCard.map((x, i) => `<tr><td data-l="${K.card}">${i + 1}. ${esc(x.asked)}</td><td data-l="${K.left}">${x.left ? R.leftYes : x.attempted ? R.leftMaybe : x.offline ? R.leftOffline : R.leftNo}</td><td data-l="${K.bytes}">${x.left ? `${x.bodyBytes} (${x.questionBytes})` : x.attempted ? `(${x.attemptBytes})` : '0'}</td><td data-l="${K.withheld}">${x.left ? esc(R.withheld(x.namesWithheld, x.otherWithheld)) : x.attempted ? '—' : R.kept}</td><td data-l="${K.check}">${x.left ? (x.leaksFound || x.photoFound ? esc(R.checkBad(x.leaksFound, x.photoFound)) : R.checkOk) : '—'}</td></tr>`).join('');
  const table = r.cards ? `<table><tr><th>${R.columns.card}</th><th>${R.columns.left}</th><th>${R.columns.bytes}</th><th>${R.columns.withheld}</th><th>${R.columns.check}</th></tr>${rows}</table>` : '';
  return `<details class="receipt" ${open ? 'open' : ''}><summary><b>${R.heading}</b></summary><p>${esc(R.summary(r))}</p>${table}<p class="muted">${esc(R.how)}</p>
    <div class="actions"><button data-act="export-receipt" ${r.cards ? '' : 'disabled'}>${R.exportButton}</button></div></details>`;
}

/** Hands the person a file to save (the receipt, the trial CSV); nothing is uploaded anywhere. */
function downloadFile(name: string, text: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function diagram(): string {
  // three boxes: the question; the private step on this computer (About me stays here); the cloud step (question only)
  return `<svg class="diagram" viewBox="0 0 640 170" role="img" aria-label="The question stays on this computer with About me; only a stripped question may go to the cloud">
    <rect x="8" y="30" width="180" height="110" rx="12"/><text x="98" y="62" text-anchor="middle">this computer</text><text x="98" y="88" text-anchor="middle">question + About me</text><text x="98" y="112" text-anchor="middle" class="mode">ONLY_ON_DEVICE</text>
    <rect x="230" y="30" width="180" height="110" rx="12"/><text x="320" y="62" text-anchor="middle">rules in code</text><text x="320" y="88" text-anchor="middle">model proposes,</text><text x="320" y="112" text-anchor="middle">code decides</text>
    <rect x="452" y="30" width="180" height="110" rx="12" stroke-dasharray="6 5"/><text x="542" y="62" text-anchor="middle">cloud help</text><text x="542" y="88" text-anchor="middle">question only, Person A</text><text x="542" y="112" text-anchor="middle" class="mode">PREFER_IN_CLOUD</text>
    <path d="M188 85h42M410 85h42"/><path d="M224 79l6 6-6 6M446 79l6 6-6 6"/>
  </svg>`;
}

// ---------------------------------------------------------------- partner screen
/** Judge mode: the one-tap questions in three groups, by what the judge sees happen; the chip shows the short form, asks the full question. */
function chipGroups(): string {
  const G = C.judge.groups;
  // the chip whose question is on screen (or being made) is lit, so the card can be traced back to its question
  const on = (q: string) => q === state.lastQuestion && (!!state.card || state.busy);
  return `<div class="chipgroups">${(Object.keys(G) as (keyof typeof G)[]).map((g) =>
    `<div class="chips group"><span class="gl">${G[g]}</span><span class="gc">${SAMPLE_QUESTIONS.filter((s) => s.group === g).map((s) => `<button class="chip${on(s.q) ? ' on' : ''}" ${on(s.q) ? 'aria-current="true" ' : ''}data-q="${esc(s.q)}" title="${esc(s.q)} — ${esc(s.shows)}">${esc(s.short)}</button>`).join('')}</span></div>`).join('')}</div>`;
}

/**
 * The partner screen. Judge mode (#/demo) is ordered for a 60-second read: the chips under the question box, then the
 * card with its panels open (badge → why → where each step ran → what was sent), the privacy receipt right after, and
 * one compact session line (tally; the intro and the no-helper note fold under it). Outside judge mode the panels and
 * the receipt are folded into "How this card was made" inside the card panel, so above the fold there is only the
 * question, the coaching line, the line to say, the card and the actions.
 */
function partnerScreen(): string {
  const c = state.card;
  const judgeLine = state.demo ? `<details class="judge"><summary><b>${C.judge.label}</b> · ${C.how.tallyHeading}: ${C.how.tallyShort(tally())}</summary><p>${C.judge.intro}</p><p id="nodevice" ${state.device === 'available' || state.device === 'checking' ? 'hidden' : ''}>${C.judge.noDevice}</p></details>` : '';
  return `${nav()}
<main class="layout${state.first ? ' first' : ''}">
  <section class="partner" aria-label="Partner">
    <p class="tagline">${C.app.tagline}</p>
    <p id="status" class="status">${statusLine()}</p>
    ${state.demo ? `<p class="sample">${C.app.sample}</p>` : ''}
    <form id="ask"><input id="q" autocomplete="off" placeholder="${C.ask.placeholder}" aria-label="${C.ask.label}" value="${esc(state.lastQuestion)}"><button id="make" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? C.ask.making : C.ask.make}</button></form>
    ${state.demo ? chipGroups() : ''}
    <div id="result" aria-live="polite">${state.busy ? `<p class="making" role="status"><span class="dot wait"></span>${C.ask.makingCard} <small>${C.ask.makingHint}</small></p>` : c ? cardPanel(c) : state.error ? `<p class="warn">${esc(state.error)}</p>` : ''}</div>
    ${state.demo ? receiptPanel(true) : ''}
    ${judgeLine}
    <div class="settings">
      <label>${C.support.label} <select id="support">${(['mild', 'more', 'most'] as const).map((v) => `<option value="${v}" ${state.settings.support === v ? 'selected' : ''}>${C.support.options[v]}</option>`).join('')}</select></label>
      <span class="privacy">${state.settings.cloudHelp ? C.consent.isOn : C.privacy.cloudOff}</span>
    </div>
  </section>
  <section id="person" class="person" aria-label="Card for the person" data-kind="${c ? c.kind : ''}" data-blocked="${c?.blocked ? '1' : ''}">${personView(false)}</section>
</main>${footer()}`;
}

function cardPanel(c: Card): string {
  const notes = c.notes.length ? `<ul class="notes">${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
  const safety = c.kind === 'body' || c.kind === 'pain' ? `<p class="safety">${C.safety}</p>` : '';
  // the coaching line: only when a rule found something about the question itself (Card.coach), never otherwise
  const coach = c.coach ? `<p class="coach">${esc(c.coach)}</p>` : '';
  // what they chose the last time this question was asked: for the partner only, from the list kept on this computer
  const prev = c.blocked || c.kind === 'repair' ? null : lastAnswer(state.history, c.asked, state.cardAt);
  const counts = prev ? answerCounts(state.history, c.asked, state.cardAt) : [];
  const last = prev ? `<p class="last">${esc(C.card.lastTime(whenText(prev.at, Date.now()), prev.label))}${counts.length > 1 || counts[0]?.n > 1 ? ` ${esc(C.card.lastTimeCounts(counts.map((x) => `${x.label} ×${x.n}`).join(', ')))}` : ''}</p>` : '';
  // "We're stuck" sits on every card the person can see; the repair card itself offers the way back
  const stuck = c.kind === 'repair' ? `<button data-act="unstuck">${C.card.unstuck}</button>` : !c.blocked ? `<button data-act="stuck">${C.card.stuck}</button>` : '';
  let main: string;
  let actions = '';
  if (c.kind === 'no-quiz') {
    main = `<p class="label">${C.memory.line}</p><p class="say">${esc(c.say.replace(C.notes.tellPrefix, ''))}</p>`;
    actions = `<button data-act="override">${C.memory.override}</button>`;
  } else if (c.kind === 'repair') {
    main = `<p class="label">${C.card.sayThis}</p><p class="say">${esc(c.say)}</p><p class="tip">${C.repair.tip} <span id="wait" class="wait"></span></p>`;
    actions = `<button class="primary" data-act="show">${C.card.show}</button>${stuck}`;
  } else if (c.blocked) {
    const offer = !state.settings.cloudHelp && state.engine.cloudConfigured && c.unsentPayload
      ? `<p class="offer">${C.blocked.cloudCouldTry} <button class="link" data-act="show-sent">${C.blocked.showWouldSend}</button> <a href="#/cloud">${C.blocked.turnOn}</a></p>` : '';
    main = `<p class="warn">${esc(c.blocked)}</p><p class="say">${C.card.justAsk}</p>${offer}`;
  } else if (state.less) {
    main = `<p class="label">${C.card.lessOn}</p><p class="say">${esc(c.asked)}</p>`;
    actions = `<button data-act="less">${C.card.lessOff}</button>`;
  } else {
    main = `<p class="label">${C.card.sayThis}</p><p class="say">${esc(c.say)}</p><p class="tip">${C.card.tip} <span id="wait" class="wait"></span></p>`;
    const next = c.pending ? C.card.nextSecond : c.nextPage ? (c.kind === 'body' ? C.card.nextWhere : C.card.nextMore) : '';
    actions = `<button class="primary" data-act="show">${C.card.show}</button><button data-act="less">${C.card.less}</button>${next ? `<button data-act="next">${next}</button>` : ''}${state.answers.length ? `<button data-act="recap">${C.card.recap}</button>` : ''}${stuck}`;
  }
  let answered = '';
  if (state.recapDone) answered = `<p class="done">${C.person.recapLine} ${esc(recapText())}</p>`;
  else if (state.confirmed && state.picked) {
    const p = state.picked;
    // a repair tile is a way to try, not an answer: the partner gets the next move for that way
    answered = p.role === 'repair'
      ? `<p class="done">${esc(C.card.choseRepair(p.label))}</p><p class="say">${esc(C.repair.lines[p.label] ?? '')}</p>`
      : `<p class="done">${p.role === 'escape' ? esc(C.card.choseEscape(p.label)) : esc(C.card.chose(p.label))}</p>`;
  }
  // judge mode: the panels stand open in reading order; partner screen: one closed fold holds them and the receipt
  const made = state.demo ? madePanels(c) : `<details class="made" id="made"><summary>${C.card.made}</summary>${madePanels(c)}${receiptPanel(false)}</details>`;
  return `${badgeLine(c)}${coach}${last}${main}${answered}${actions ? `<div class="actions">${actions}</div>` : ''}${safety}${notes}
    ${made}`;
}

const recapText = () => state.answers.map((a) => `${a.topic}, ${a.label}`).join('; ') + '. Right?';

// ---------------------------------------------------------------- person view (pane and full screen)
function picture(ch: Choice): string {
  const p = ch.picture;
  if (p.type === 'builtin') return builtinPicto(p.id);
  if (p.type === 'person') {
    const person = p.personId ? state.profile.people.find((x) => x.id === p.personId) : null;
    return person?.photo ? photoTile(person.photo, person.name) : monogram(p.initial);
  }
  return ''; // bundled pictures only in this build: a word-only tile, never an empty frame
}

function personView(full: boolean): string {
  const c = state.card;
  const exit = full ? `<button id="exit" class="exit" aria-label="${C.person.exit}" title="${C.person.exit}">${CROSS}</button>` : '';
  if (state.recap) {
    const list = state.answers.length ? `<ul class="so">${state.answers.map((a) => `<li><span>${esc(a.topic)}</span><b>${esc(a.label)}</b></li>`).join('')}</ul>` : `<p class="so-empty">${C.person.recapEmpty}</p>`;
    return `${exit}<h2 class="headline">${C.person.recapHeading}</h2>${list}
      <div class="tiles two"><button class="tile yes" data-confirm="recap-yes">${TICK}<span>${C.person.yes}</span></button>
      <button class="tile" data-confirm="recap-change">${CROSS}<span>${C.person.change}</span></button></div>`;
  }
  if (!c || c.blocked || !c.choices.length) return `${exit}<div class="listening${state.busy ? ' thinking' : ''}">${builtinPicto('listen')}</div>`;
  if (state.less) return `${exit}<h2 class="headline">${esc(c.topic)}</h2>`;
  if (state.picked && state.confirmed) {
    return `${exit}<h2 class="headline">${esc(c.topic)}</h2><div class="answered">${picture(state.picked)}<p>${esc(state.picked.label)}</p></div>`;
  }
  if (state.picked) {
    // a "no" or "not sure" sits in a neutral frame: never a giant cross above yes / change (§2.14)
    return `${exit}<h2 class="headline">${esc(C.person.so(state.picked.label))}</h2>
      <div class="confirm-pic ${state.picked.label === 'no' || state.picked.label === 'not sure' ? 'neutral' : ''}">${picture(state.picked)}<p>${esc(state.picked.label)}</p></div>
      <div class="tiles two"><button class="tile yes" data-confirm="yes">${TICK}<span>${C.person.yes}</span></button>
      <button class="tile" data-confirm="change">${CROSS}<span>${C.person.change}</span></button></div>`;
  }
  if (c.kind === 'repair') {
    // three ways to get the message out in one row, then the two ways to leave it for now (quieter tiles)
    const tile = (ch: Choice, i: number, extra: string) => `<button class="tile ${extra} ${picture(ch) ? '' : 'wordonly'}" data-i="${i}">${picture(ch)}<span>${esc(ch.label)}</span></button>`;
    return `${exit}<h2 class="headline">${esc(c.topic)}</h2>
      <div class="tiles repair">${c.choices.slice(0, 3).map((ch, i) => tile(ch, i, '')).join('')}</div>
      <div class="tiles two">${c.choices.slice(3).map((ch, i) => tile(ch, i + 3, 'out')).join('')}</div>`;
  }
  const answers = c.choices.filter((x) => x.role === 'answer');
  const cls = state.settings.support === 'most' ? 'tiles stacked' : answers.length >= 3 ? 'tiles three' : 'tiles two';
  return `${exit}<h2 class="headline">${esc(c.topic)}</h2>
    <div class="${cls}">${c.choices.map((ch, i) => `<button class="tile ${ch.role === 'escape' ? 'escape' : ''} ${picture(ch) ? '' : 'wordonly'}" data-i="${i}">${picture(ch)}<span>${esc(ch.label)}</span></button>`).join('')}</div>`;
}

function personScreen(): string {
  return `<main class="person full" id="person" aria-label="Card for the person">${personView(true)}</main>`;
}

// ---------------------------------------------------------------- About me
function aboutScreen(): string {
  const p = state.profile;
  const A = C.about;
  const people = p.people.map((x, i) => `<fieldset class="who"><legend>${A.person} ${i + 1}</legend>
      <label>${A.name}<input data-person="${i}" data-field="name" value="${esc(x.name)}"></label>
      <label>${A.relation}<input data-person="${i}" data-field="relation" value="${esc(x.relation)}" placeholder="wife, son, carer…"></label>
      <label class="check"><input type="checkbox" data-person="${i}" data-field="household" ${x.household ? 'checked' : ''}>${A.livesHere}</label>
      <label>${A.nickname}<input data-person="${i}" data-field="nickname" value="${esc(x.nickname ?? '')}"></label>
      <div class="photo-row">${x.photo ? `${photoTile(x.photo, x.name)}<button data-act="photo-remove" data-person="${i}">${A.removePhoto}</button>` : `<button data-act="photo-add" data-person="${i}">${A.addPhoto}</button><input type="file" accept="image/*" data-photo="${i}" hidden>`}</div>
      <button class="link danger" data-act="person-remove" data-person="${i}">${A.remove}</button>
    </fieldset>`).join('');
  const list = (key: 'foods' | 'places' | 'tv' | 'music' | 'other', label: string) =>
    `<label>${label} <small>(${A.onePerLine})</small><textarea data-list="${key}" rows="3">${esc(p[key].join('\n'))}</textarea></label>`;
  return `${nav()}<main class="screen">
    <h1>${esc(A.heading(p.personName))}</h1>
    <p class="note">${A.note}</p>
    <p class="nudge">${esc(A.nudge(p.personName))}</p>
    ${state.demo ? `<p class="sample">${C.app.sample}</p>` : ''}
    <form id="about" class="about">
      <label>${A.theirName}<input data-field="personName" value="${esc(p.personName)}"></label>
      <label>${A.yourName}<input data-field="partnerName" value="${esc(p.partnerName)}"></label>
      <h2>${A.people}</h2>
      ${people}
      <button type="button" data-act="person-add">${A.addPerson}</button>
      <h2>${A.foods}, ${A.places}, ${A.tv}, ${A.music}</h2>
      ${list('foods', A.foods)}${list('places', A.places)}${list('tv', A.tv)}${list('music', A.music)}${list('other', A.other)}
      <h2>${A.historyHeading}</h2>
      <p class="note">${A.historyNote}${state.demo ? ` ${A.historyNoteSample}` : ''}</p>
      ${state.history.length ? `<ul class="history">${state.history.slice(-8).reverse().map((h) => `<li><span>${esc(whenText(h.at, Date.now()))}</span> ${esc(h.q)} <b>${esc(h.label)}</b></li>`).join('')}</ul>${state.history.length > 8 ? `<p class="muted">${state.history.length} in all.</p>` : ''}
      <button type="button" data-act="history-forget">${A.historyForget}</button>` : `<p class="muted">${A.historyEmpty}</p>`}
      <p id="saved" class="saved">${state.saved ? A.saved : ''}</p>
      <div class="actions"><a class="button primary" href="#/">${A.done}</a><button type="button" class="danger" data-act="delete-all">${A.deleteAll}</button></div>
    </form></main>${footer()}`;
}

// ---------------------------------------------------------------- cloud help consent
function cloudScreen(): string {
  const K = C.consent;
  const on = state.settings.cloudHelp;
  const example = state.lastQuestion
    ? `<pre>${esc(JSON.stringify(cloudTextRequest(stripQuestion(state.lastQuestion, state.profile).text), null, 2))}</pre>`
    : `<p class="muted">${K.exampleNone}</p>`;
  const control = on
    ? `<p class="ok">${K.isOn}</p><button class="primary" data-act="cloud-off">${K.turnOff}</button>`
    : `<label class="check big"><input type="checkbox" id="consent" ${state.consentChecked ? 'checked' : ''}>${K.checkbox}</label>
       <button class="primary" data-act="cloud-on" ${state.consentChecked ? '' : 'disabled'}>${K.turnOn}</button>`;
  return `${nav()}<main class="screen">
    <h1>${K.heading}</h1>
    <p>${K.intro}</p>
    <h2>${K.whatHeading}</h2><p>${esc(K.what)}</p>
    <h3>${K.exampleHeading}</h3>${example}
    <h2>${K.whoHeading}</h2><p>${esc(K.who)}</p>
    <h2>${K.neverHeading}</h2><p>${C.privacy.neverSent}</p>
    <h2>${K.termsHeading}</h2><p>${esc(K.terms)} <a href="${K.termsLink}" target="_blank" rel="noopener">${K.termsLinkText}</a></p>
    <p class="muted">${K.pictures}</p>
    <div class="consent-box">${control}</div>
    <p class="muted">${K.scope}</p>
    <p><a href="#/">${C.app.nav.home}</a></p></main>${footer()}`;
}

// ---------------------------------------------------------------- first run
/** The private helper's state on the first screen, as the SDK reports it. Patched in place when the check finishes. */
function welcomeDevice(): string {
  const W = C.welcome;
  if (!cfg) return `<p><span class="dot off"></span>${C.status.noConfig}</p>`;
  if (state.device === 'checking') return `<p><span class="dot wait"></span>${C.status.checking}</p>`;
  if (state.device === 'available') return `<p><span class="dot ok"></span>${C.status.ready}</p>`;
  if (state.device === 'downloadable' || state.device === 'downloading') return `<p><span class="dot wait"></span>${statusLine().replace(/<span class="dot[^>]*><\/span>/, '')}</p>`;
  return `<p><span class="dot off"></span>${W.cantRun} ${C.status.deviceReason}</p>`;
}

function welcomeScreen(): string {
  const W = C.welcome;
  return `<main class="screen welcome">
    <h1>${W.heading}</h1>
    <p class="who">${W.who}</p>
    <p class="lead">${W.what}</p>
    <ol class="points">
      <li>${W.local}</li>
      <li id="device">${welcomeDevice()}</li>
      <li>${W.cloudOff}</li>
    </ol>
    <div class="actions"><button class="primary" data-act="welcome-setup">${W.setup}</button><button data-act="welcome-sample">${W.sample}</button></div>
  </main>${footer()}`;
}

// ---------------------------------------------------------------- how this works
function howScreen(): string {
  const H = C.how;
  const last = state.made[state.made.length - 1];
  return `${nav()}<main class="screen">
    <h1>${H.heading}</h1>
    <p>${H.intro}</p>
    ${diagram()}
    <h2>${H.legs}</h2>${legsTable()}
    <h2>${H.tallyHeading}</h2><p>${H.tally(tally())}</p>
    ${receiptPanel(true)}
    ${last ? `<h2>${H.traceHeading}</h2><p class="muted">${esc(last.asked)}</p>${traceList(last.trace)}${whyPanel(last, true)}` : ''}
    <h2>${H.scoresHeading}</h2><p>${H.scoresNone}</p>
    <h2>${H.lookalikesHeading}</h2><p>${H.lookalikesIntro}</p>
    <ul class="lookalikes">${H.lookalikes.map((l) => `<li><b><a href="${l.url}" target="_blank" rel="noopener">${esc(l.name)}</a></b><br>${esc(l.does)}<br><span class="ours">${esc(l.ours)}</span></li>`).join('')}</ul>
    <p><a href="#/">${C.app.nav.home}</a></p></main>${footer()}`;
}

// ---------------------------------------------------------------- render
let timer: ReturnType<typeof setInterval> | null = null;
let lastKey = '';
function render() {
  const r = route();
  const app = $('#app');
  // the route goes on #app with a prefix: a bare "person" or "welcome" class made #app pick up the card pane's frame
  // and the welcome padding (the thin frame around the full-screen card, DESIGN_DIRECTIONS "must fix")
  app.className = `route-${r}`;
  // entrance animations play once per real event (a new route or a new card), not on every redraw
  const key = `${r}|${cardSeq}`;
  // the card judge mode opens with is simply there: no entrance, so the very first frame is a finished card
  if (key !== lastKey) { lastKey = key; if (!(r === 'partner' && state.first)) app.classList.add('enter'); }
  app.innerHTML = r === 'partner' ? partnerScreen() : r === 'person' ? personScreen() : r === 'about' ? aboutScreen() : r === 'cloud' ? cloudScreen() : r === 'how' ? howScreen() : r === 'trial' ? trialScreen() : welcomeScreen();
  if (timer) { clearInterval(timer); timer = null; }
  if (r === 'trial') {
    timer = setInterval(() => { const el = document.querySelector('#elapsed'); const c = trialClock(); if (el && c) el.textContent = c; }, 100);
  }
  if (r === 'partner' && state.card && !state.card.blocked && !state.picked) {
    state.waitStart ??= Date.now();
    const tick = () => { const el = document.querySelector('#wait'); if (!el || !state.waitStart) return; const s = Math.floor((Date.now() - state.waitStart) / 1000); el.textContent = C.card.waiting(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); };
    tick();
    timer = setInterval(tick, 1000);
  }
}

// ---------------------------------------------------------------- actions
/**
 * A device-status change (the check finishing, a download tick) updates the status elements in place instead of
 * redrawing the screen: nothing else on screen depends on it, and a redraw would cut the entrance animation short
 * (the device check finishes within the first second of the welcome screen) and reset the question field.
 */
function patchDevice() {
  const s = document.querySelector('#status'); if (s) s.innerHTML = statusLine();
  const d = document.querySelector('#device'); if (d) d.innerHTML = welcomeDevice();
  const n = document.querySelector<HTMLElement>('#nodevice'); if (n) n.hidden = state.device === 'available' || state.device === 'checking';
}
/**
 * Asks the browser whether it can run the private helper. Until the first answer the status line says "checking",
 * never "can't run": the state used to start as 'unavailable', so a capable browser showed "This computer can't run
 * the private helper" until the answer came, and for good if a redraw raced it. A browser that has just started can
 * also answer "unavailable" for a moment before its model component is registered, so that answer is asked again
 * twice (after 2 s and 6 s) before it stands. A capability query only: no inference, no network.
 */
let recheck = 0;
let probing: Promise<void> | null = null;
function refreshDevice(): Promise<void> {
  return (probing ??= (async () => {
    try {
      state.device = await state.engine.deviceStatus();
      patchDevice();
      void warm();
      if (state.device === 'unavailable' && cfg && recheck < 2) setTimeout(() => void refreshDevice(), recheck++ ? 4000 : 2000);
    } finally { probing = null; }
  })());
}
/**
 * Once per page load, when the private helper is there: load it into memory before the first question, so the first
 * open question does not wait for it (16 to 22 s after a browser start on the development machine, about 3 s afterwards). The status
 * line says "getting ready" meanwhile; questions can be asked during it.
 */
let warmed = false;
async function warm() {
  if (warmed || state.device !== 'available' || !state.engine.warmDevice) return;
  warmed = true;
  state.warming = true; patchDevice();
  try { await state.engine.warmDevice(); } catch { /* the first real question will report the failure in its trace */ }
  state.warming = false; patchDevice();
}

async function make(q: string) {
  if (!q.trim()) return;
  state.busy = true; state.error = null; state.lastQuestion = q; resetCard(); render();
  // a question asked before the capability check has answered waits for it: the card must not be made as if this
  // computer could not run the private step
  if (state.device === 'checking') await refreshDevice().catch(() => { state.device = 'unavailable'; });
  try {
    const card = await makeCard(q, {
      profile: state.profile, support: state.settings.support, engine: state.engine,
      allowCloud: state.settings.cloudHelp, deviceReady: state.device === 'available',
    });
    setCard(card);
    state.made.push(card);
  } catch (e) {
    state.card = null; state.error = (e as Error).message;
  }
  state.busy = false; state.waitStart = Date.now(); render();
}

function onPersonTap(t: HTMLElement) {
  const c = state.card;
  if (t.dataset.confirm === 'recap-yes') { state.recap = false; state.recapDone = true; render(); return; }
  if (t.dataset.confirm === 'recap-change') { state.recap = false; render(); return; }
  if (!c) return;
  if (t.dataset.confirm === 'yes') {
    state.confirmed = true;
    if (state.picked && state.picked.role === 'answer') {
      state.answers.push({ topic: c.topic, label: state.picked.label });
      // kept on this computer for "last time"; with the sample family it stays in memory and goes when judge mode is left
      state.history = addAnswer(state.history, { q: c.asked, topic: c.topic, label: state.picked.label, at: Date.now() });
      if (!state.demo) void kvSet('history', state.history);
    }
    render(); return;
  }
  if (t.dataset.confirm === 'change') { state.picked = null; state.waitStart = Date.now(); render(); return; }
  const ch = c.choices[Number(t.dataset.i)];
  if (!ch) return;
  if (ch.role === 'escape' && c.nextPage) { setCard(c.nextPage); render(); return; }
  if (c.kind === 'body' && c.bodyStep === 1 && (BODY_REGIONS as string[]).includes(ch.label)) {
    setCard(bodyDetailCard(ch.label as BodyRegion, state.profile, state.settings.support)); render(); return;
  }
  t.classList.add('pressed');
  setTimeout(() => { state.picked = ch; render(); }, 180);
}

async function addPhoto(i: number, file: File) {
  const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const s = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
  state.profile.people[i].photo = canvas.toDataURL('image/jpeg', 0.8);
  saveProfile(); render();
}

function act(el: HTMLElement) {
  const a = el.dataset.act;
  const i = Number(el.dataset.person ?? -1);
  switch (a) {
    case 'show': go('person'); break;
    case 'less': state.less = !state.less; render(); break;
    case 'next':
      if (state.card?.pending) void make(state.card.pending);
      else if (state.card?.nextPage) { setCard(state.card.nextPage); state.picked = null; state.confirmed = false; render(); }
      break;
    case 'recap': state.recap = true; state.recapDone = false; render(); break;
    case 'stuck':
      // the repair card takes the person's screen; the question card waits behind it
      if (state.card && state.card.kind !== 'repair') { state.before = state.card; setCard(repairCard(state.profile)); state.picked = null; state.confirmed = false; state.less = false; state.recap = false; state.waitStart = Date.now(); render(); }
      break;
    case 'unstuck':
      if (state.card?.kind === 'repair') { setCard(state.before); state.before = null; state.picked = null; state.confirmed = false; state.waitStart = Date.now(); render(); }
      break;
    case 'override':
      if (state.card) { const c = quizOverrideCard(state.card.asked, state.profile, state.settings.support); setCard(c); state.made.push(c); state.waitStart = Date.now(); render(); }
      break;
    case 'export-receipt': {
      const r = sessionReceipt(state.made, state.profile);
      downloadFile(C.judge.receipt.exportName, JSON.stringify({ app: C.app.name, exportedAt: new Date().toISOString(), page: location.origin, sampleFamily: state.demo, receipt: r }, null, 2), 'application/json');
      break;
    }
    case 'show-sent': {
      const m = document.querySelector<HTMLDetailsElement>('#made'); if (m) m.open = true; // the fold around it on the partner screen
      const d = document.querySelector<HTMLDetailsElement>('#sent'); if (d) { d.open = true; d.scrollIntoView({ block: 'nearest' }); }
      break;
    }
    case 'download': void download(); break;
    case 'leave-demo': void leaveDemo(); break;
    case 'welcome-setup': state.settings.welcomed = true; saveSettings(); go('about'); break;
    case 'welcome-sample': state.settings.welcomed = true; saveSettings(); go('demo'); break;
    case 'cloud-on': if (state.consentChecked) { state.settings.cloudHelp = true; saveSettings(); render(); } break;
    case 'cloud-off': state.settings.cloudHelp = false; state.consentChecked = false; saveSettings(); render(); break;
    case 'person-add': state.profile.people.push({ id: `p${Date.now().toString(36)}`, name: '', relation: '', household: false }); saveProfile(); render(); break;
    case 'person-remove': state.profile.people.splice(i, 1); saveProfile(); render(); break;
    case 'photo-add': document.querySelector<HTMLInputElement>(`input[data-photo="${i}"]`)?.click(); break;
    case 'photo-remove': delete state.profile.people[i].photo; saveProfile(); render(); break;
    case 'history-forget':
      if (confirm(C.about.historyForgetConfirm)) { state.history = []; if (!state.demo) void kvSet('history', []); render(); }
      break;
    case 'delete-all':
      if (confirm(C.about.deleteConfirm)) {
        void kvClear().then(() => { state.profile = { ...EMPTY_PROFILE, people: [] }; state.settings = { cloudHelp: false, support: 'more', welcomed: false }; state.answers = []; state.history = []; state.made = []; resetCard(); go('welcome'); });
      }
      break;
    default:
      if (a?.startsWith('trial-') && trialAct(el, downloadFile)) render();
  }
}

async function download() {
  if (!cfg) return;
  state.device = 'downloading'; patchDevice();
  try {
    await state.engine.prepareDevice((p) => { state.downloading = p; if (p >= 1) state.warming = true; patchDevice(); });
  } catch (err) { state.error = (err as Error).message; }
  // the SDK starts the download and returns; the browser reports when the helper is there
  for (let i = 0; i < 900; i++) {
    state.device = await state.engine.deviceStatus();
    if (state.device === 'available' || state.device === 'unavailable') break;
    state.device = 'downloading'; patchDevice();
    await new Promise((r) => setTimeout(r, 2000));
  }
  state.downloading = null; state.warming = false; await refreshDevice();
}

// ---------------------------------------------------------------- events (delegated)
const app = document.querySelector('#app')!;
app.addEventListener('click', (ev) => {
  const t = (ev.target as HTMLElement).closest<HTMLElement>('button, [data-act]');
  if (!t) return;
  if (t.dataset.act) { act(t); return; }
  if (t.dataset.q) { state.lastQuestion = t.dataset.q; void make(t.dataset.q); return; }
  if (t.closest('#person')) onPersonTap(t);
});
app.addEventListener('submit', (ev) => {
  if ((ev.target as HTMLElement).id === 'ask') { ev.preventDefault(); void make(($('#q') as HTMLInputElement).value); }
  else ev.preventDefault();
});
app.addEventListener('change', (ev) => {
  const t = ev.target as HTMLInputElement | HTMLSelectElement;
  if (t.id.startsWith('trial-')) { trialInput(t); return; }
  if (t.id === 'support') { state.settings.support = (t as HTMLSelectElement).value as SupportLevel; saveSettings(); if (state.lastQuestion) void make(state.lastQuestion); return; }
  if (t.id === 'consent') { state.consentChecked = (t as HTMLInputElement).checked; render(); return; }
  if (t instanceof HTMLInputElement && t.dataset.photo !== undefined && t.files?.[0]) { void addPhoto(Number(t.dataset.photo), t.files[0]); return; }
  if (t instanceof HTMLInputElement && t.dataset.field === 'household') { state.profile.people[Number(t.dataset.person)].household = t.checked; saveProfile(); }
});
app.addEventListener('input', (ev) => {
  const t = ev.target as HTMLInputElement | HTMLTextAreaElement;
  if (t.id === 'q') { state.lastQuestion = t.value; return; }
  if (t.id.startsWith('trial-') && t instanceof HTMLInputElement) { trialInput(t); return; }
  if (t instanceof HTMLTextAreaElement && t.dataset.list) { state.profile[t.dataset.list as 'foods'] = t.value.split('\n').map((x) => x.trim()).filter(Boolean); saveProfile(); return; }
  if (t instanceof HTMLInputElement && t.dataset.field && t.dataset.field !== 'household') {
    if (t.dataset.person !== undefined) {
      const person = state.profile.people[Number(t.dataset.person)];
      if (t.dataset.field === 'nickname') person.nickname = t.value.trim() || undefined; else (person as unknown as Record<string, string>)[t.dataset.field] = t.value;
    } else (state.profile as unknown as Record<string, string>)[t.dataset.field] = t.value;
    saveProfile();
  }
});
// The exit from the person screen is top-right and needs a long press (a stray tap must not leave the card).
let hold: ReturnType<typeof setTimeout> | null = null;
app.addEventListener('pointerdown', (ev) => {
  const t = (ev.target as HTMLElement).closest('#exit');
  if (!t) return;
  t.classList.add('holding');
  hold = setTimeout(() => { hold = null; go(''); }, 600);
});
const cancelHold = () => { if (hold) { clearTimeout(hold); hold = null; } document.querySelector('#exit')?.classList.remove('holding'); };
app.addEventListener('pointerup', cancelHold);
app.addEventListener('pointercancel', cancelHold);
app.addEventListener('pointerleave', cancelHold, true);
window.addEventListener('hashchange', render);

// Opened straight on judge mode: the first card is made before the first draw, so there is no empty frame before it.
void Promise.all([load(), loadTrial()]).then(async () => {
  if (location.hash.replace(/^#\/?/, '') === 'demo') await enterDemo();
  render(); void refreshDevice();
});
