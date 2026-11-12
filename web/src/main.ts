// The web client: partner screen, person screen, About me, cloud help consent, first run, judge mode.
// All card logic is in the shared core (../../core); this file is UI, local storage and the Firebase engine.
// Every string a person reads comes from core/copy.ts.

import './styles.css';
import './themes.css';
import { applyPreviewTheme } from './theme';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine } from '../../core/engine';
import { LEGS } from '../../core/models';
import { bodyDetailCard, makeCard, quizOverrideCard } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { BODY_REGIONS } from '../../core/rules';
import { SAMPLE_PROFILE, SAMPLE_QUESTIONS } from '../../core/sample';
import { stripQuestion } from '../../core/strip';
import { EMPTY_PROFILE, type BodyRegion, type Card, type Choice, type Profile, type StepTrace, type SupportLevel } from '../../core/types';
import { webConfig } from './ai/config';
import { LazyFirebaseEngine } from './ai/firebaseEngine';
import { CROSS, TICK, builtinPicto, monogram, photoTile } from './pictos';
import { kvClear, kvGet, kvSet } from './store';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const C = COPY;

type Route = 'partner' | 'welcome' | 'about' | 'cloud' | 'person' | 'how';

interface Settings {
  cloudHelp: boolean;
  support: SupportLevel;
  welcomed: boolean;
}

interface State {
  engine: Engine | null;
  device: DeviceStatus;
  downloading: number | null;
  warming: boolean;
  profile: Profile;
  settings: Settings;
  /** Judge mode: the made-up family is loaded in memory; the real profile on disk is untouched. */
  demo: boolean;
  busy: boolean;
  card: Card | null;
  picked: Choice | null;
  confirmed: boolean;
  /** "Less support": the person sees only the headline. */
  less: boolean;
  /** Confirmed answers this session, for the recap. */
  answers: { topic: string; label: string }[];
  recap: boolean;
  recapDone: boolean;
  lastQuestion: string;
  error: string | null;
  /** Every card made this session (judge mode tally). */
  made: Card[];
  waitStart: number | null;
  consentChecked: boolean;
  saved: boolean;
}

const cfg = webConfig();
const state: State = {
  engine: cfg ? new LazyFirebaseEngine(cfg) : null,
  device: 'unavailable',
  downloading: null,
  warming: false,
  profile: { ...EMPTY_PROFILE },
  settings: { cloudHelp: false, support: 'more', welcomed: false }, // cloud help off by default (§1.5)
  demo: false,
  busy: false,
  card: null,
  picked: null,
  confirmed: false,
  less: false,
  answers: [],
  recap: false,
  recapDone: false,
  lastQuestion: '',
  error: cfg ? null : C.status.noConfig,
  made: [],
  waitStart: null,
  consentChecked: false,
  saved: false,
};

// ---------------------------------------------------------------- routing
function route(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'demo') { enterDemo(); return 'partner'; }
  if (h === 'about') return 'about';
  if (h === 'cloud') return 'cloud';
  if (h === 'person') return 'person';
  if (h === 'how') return 'how';
  if (h === 'welcome' || (!state.settings.welcomed && !state.demo)) return 'welcome';
  return 'partner';
}
function go(r: Route | 'demo' | '') { location.hash = r ? `#/${r}` : ''; }

function enterDemo() {
  if (state.demo) return;
  state.demo = true;
  state.profile = SAMPLE_PROFILE;
  resetCard();
}
async function leaveDemo() {
  state.demo = false;
  state.profile = (await kvGet<Profile>('profile')) ?? { ...EMPTY_PROFILE };
  resetCard();
  go('');
}
function resetCard() { state.card = null; state.picked = null; state.confirmed = false; state.less = false; state.recap = false; state.recapDone = false; state.waitStart = null; }

// ---------------------------------------------------------------- persistence
async function load() {
  const p = await kvGet<Profile>('profile');
  if (p) state.profile = { ...EMPTY_PROFILE, ...p, people: p.people ?? [] };
  const s = await kvGet<Settings>('settings');
  if (s) state.settings = { ...state.settings, ...s };
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
  if (!state.engine) return `<span class="dot off"></span>${esc(state.error ?? C.status.noConfig)}`;
  if (state.warming) return `<span class="dot wait"></span>${C.status.warming}`;
  switch (state.device) {
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

function sentPanel(c: Card): string {
  const swaps = c.cloudSwaps?.length ? `<p class="swaps">${C.sent.swaps}<br>${c.cloudSwaps.map(esc).join('<br>')}</p>` : '';
  if (c.cloudPayload) return `<p>${c.source === 'in-cloud' ? C.sent.sentFor : C.sent.notUsed}</p><pre>${esc(c.cloudPayload)}</pre>${swaps}`;
  if (c.unsentPayload) return `<p>${C.sent.notSent}</p><pre>${esc(c.unsentPayload)}</pre>${swaps}`;
  return `<p>${C.sent.nothing}</p>`;
}

function traceList(t: StepTrace[] | undefined): string {
  if (!t) return '';
  return `<ul class="trace">${t.map((s) => `<li class="${s.ran}${s.used ? ' used' : ''}" data-step="${s.step}"><b>${C.how.steps[s.step]}</b>: ${C.how.ran[s.ran]}${s.ms ? ` (${s.ms} ms)` : ''}${s.used ? ` · ${C.how.used}` : ''}<br><span>${esc(s.why)}</span></li>`).join('')}</ul>`;
}

function tally(): { device: number; cloud: number; code: number; failed: number } {
  const n = { device: 0, cloud: 0, code: 0, failed: 0 };
  for (const c of state.made) {
    if (c.blocked) continue;
    if (c.source === 'code') n.code++; else if (c.source === 'in-cloud') n.cloud++; else n.device++;
    n.failed += (c.trace ?? []).filter((t) => t.ran === 'failed').length;
  }
  return n;
}

function legsTable(): string {
  const names = C.how.legNames;
  return `<table><tr><th>${C.how.columns.step}</th><th>${C.how.columns.mode}</th><th>${C.how.columns.gets}</th><th>${C.how.columns.why}</th></tr>${(Object.keys(LEGS) as (keyof typeof LEGS)[]).map((k) => `<tr><td>${names[k]}</td><td><code>${LEGS[k].mode}</code></td><td>${esc(LEGS[k].gets)}</td><td>${esc(LEGS[k].why)}</td></tr>`).join('')}</table>`;
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
function partnerScreen(): string {
  const c = state.card;
  const chips = state.demo ? `<div class="chips">${SAMPLE_QUESTIONS.map((s) => `<button class="chip" data-q="${esc(s.q)}" title="${esc(s.shows)}">${esc(s.q)}</button>`).join('')}</div>` : '';
  const judgeIntro = state.demo ? `<details class="judge" open><summary><b>${C.judge.label}</b> · ${C.how.tallyHeading}: ${C.how.tally(tally())}</summary><p>${C.judge.intro}</p>${state.device !== 'available' ? `<p>${C.judge.noDevice}</p>` : ''}</details>` : '';
  return `${nav()}
<main class="layout">
  <section class="partner" aria-label="Partner">
    <p class="tagline">${C.app.tagline}</p>
    <p id="status" class="status">${statusLine()}</p>
    ${state.demo ? `<p class="sample">${C.app.sample}</p>` : ''}
    <form id="ask"><input id="q" autocomplete="off" placeholder="${C.ask.placeholder}" aria-label="${C.ask.label}" value="${esc(state.lastQuestion)}"><button id="make" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? C.ask.making : C.ask.make}</button></form>
    <div id="result" aria-live="polite">${c ? cardPanel(c) : ''}</div>
    ${chips}
    ${judgeIntro}
    <div class="settings">
      <label>Support <select id="support"><option value="mild" ${state.settings.support === 'mild' ? 'selected' : ''}>mild (3 choices)</option><option value="more" ${state.settings.support === 'more' ? 'selected' : ''}>more (2 choices)</option><option value="most" ${state.settings.support === 'most' ? 'selected' : ''}>most (2, larger)</option></select></label>
      <span class="privacy">${state.settings.cloudHelp ? C.consent.isOn : C.privacy.cloudOff}</span>
    </div>
  </section>
  <section id="person" class="person" aria-label="Card for the person">${personView(false)}</section>
</main>${footer()}`;
}

function cardPanel(c: Card): string {
  const notes = c.notes.length ? `<ul class="notes">${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
  const safety = c.kind === 'body' || c.kind === 'pain' ? `<p class="safety">${C.safety}</p>` : '';
  let main: string;
  let actions = '';
  if (c.kind === 'no-quiz') {
    main = `<p class="warn">${C.memory.line}</p><p class="say">${esc(c.say.replace(C.notes.tellPrefix, ''))}</p>`;
    actions = `<button data-act="override">${C.memory.override}</button>`;
  } else if (c.blocked) {
    const offer = !state.settings.cloudHelp && state.engine?.cloudConfigured && c.unsentPayload
      ? `<p class="offer">${C.blocked.cloudCouldTry} <button class="link" data-act="show-sent">${C.blocked.showWouldSend}</button> <a href="#/cloud">${C.blocked.turnOn}</a></p>` : '';
    main = `<p class="warn">${esc(c.blocked)}</p><p class="say">${C.card.justAsk}</p>${offer}`;
  } else if (state.less) {
    main = `<p class="label">${C.card.lessOn}</p><p class="say">${esc(c.asked)}</p>`;
    actions = `<button data-act="less">${C.card.lessOff}</button>`;
  } else {
    main = `<p class="label">${C.card.sayThis}</p><p class="say">${esc(c.say)}</p><p class="tip">${C.card.tip} <span id="wait" class="wait"></span></p>`;
    const next = c.pending ? C.card.nextSecond : c.nextPage ? C.card.nextWhere : '';
    actions = `<button class="primary" data-act="show">${C.card.show}</button><button data-act="less">${C.card.less}</button>${next ? `<button data-act="next">${next}</button>` : ''}${state.answers.length ? `<button data-act="recap">${C.card.recap}</button>` : ''}`;
  }
  let answered = '';
  if (state.recapDone) answered = `<p class="done">${C.person.recapLine} ${esc(recapText())}</p>`;
  else if (state.confirmed && state.picked) answered = `<p class="done">${state.picked.role === 'escape' ? esc(C.card.choseEscape(state.picked.label)) : esc(C.card.chose(state.picked.label))}</p>`;
  return `${badge(c)}${main}${answered}${actions ? `<div class="actions">${actions}</div>` : ''}${safety}${notes}
    <details class="sent" id="sent"><summary>${C.sent.heading}</summary>${sentPanel(c)}</details>
    <details class="sent" ${state.demo ? 'open' : ''}><summary>${C.how.traceHeading}</summary>${traceList(c.trace)}</details>`;
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
  if (!c || c.blocked || !c.choices.length) return `${exit}<div class="listening">${builtinPicto('listen')}</div>`;
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
function welcomeScreen(): string {
  const W = C.welcome;
  let device: string;
  if (!state.engine) device = `<p class="warn">${esc(state.error ?? '')}</p>`;
  else if (state.device === 'available') device = `<p><span class="dot ok"></span>${C.status.ready}</p>`;
  else if (state.device === 'downloadable' || state.device === 'downloading') device = `<p id="status"><span class="dot wait"></span>${statusLine().replace(/<span class="dot[^>]*><\/span>/, '')}</p>`;
  else device = `<p><span class="dot off"></span>${W.cantRun} ${C.status.deviceReason}</p>`;
  return `<main class="screen welcome">
    <h1>${W.heading}</h1>
    <p class="lead">${W.what}</p>
    <ol class="points">
      <li>${W.local}</li>
      <li>${device}</li>
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
    ${last ? `<h2>${H.traceHeading}</h2><p class="muted">${esc(last.asked)}</p>${traceList(last.trace)}` : ''}
    <h2>${H.scoresHeading}</h2><p>${H.scoresNone}</p>
    <p><a href="#/">${C.app.nav.home}</a></p></main>${footer()}`;
}

// ---------------------------------------------------------------- render
let timer: ReturnType<typeof setInterval> | null = null;
function render() {
  const r = route();
  const app = $('#app');
  app.className = r;
  app.innerHTML = r === 'partner' ? partnerScreen() : r === 'person' ? personScreen() : r === 'about' ? aboutScreen() : r === 'cloud' ? cloudScreen() : r === 'how' ? howScreen() : welcomeScreen();
  if (timer) { clearInterval(timer); timer = null; }
  if (r === 'partner' && state.card && !state.card.blocked && !state.picked) {
    state.waitStart ??= Date.now();
    const tick = () => { const el = document.querySelector('#wait'); if (!el || !state.waitStart) return; const s = Math.floor((Date.now() - state.waitStart) / 1000); el.textContent = C.card.waiting(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); };
    tick();
    timer = setInterval(tick, 1000);
  }
}

// ---------------------------------------------------------------- actions
async function refreshDevice() {
  if (state.engine) state.device = await state.engine.deviceStatus();
  render();
}

async function make(q: string) {
  if (!state.engine || !q.trim()) return;
  state.busy = true; state.lastQuestion = q; resetCard(); render();
  try {
    state.card = await makeCard(q, {
      profile: state.profile, support: state.settings.support, engine: state.engine,
      allowCloud: state.settings.cloudHelp, deviceReady: state.device === 'available',
    });
    state.made.push(state.card);
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
    if (state.picked && state.picked.role === 'answer') state.answers.push({ topic: c.topic, label: state.picked.label });
    render(); return;
  }
  if (t.dataset.confirm === 'change') { state.picked = null; state.waitStart = Date.now(); render(); return; }
  const ch = c.choices[Number(t.dataset.i)];
  if (!ch) return;
  if (ch.role === 'escape' && c.nextPage) { state.card = c.nextPage; render(); return; }
  if (c.kind === 'body' && c.bodyStep === 1 && (BODY_REGIONS as string[]).includes(ch.label)) {
    state.card = bodyDetailCard(ch.label as BodyRegion, state.profile, state.settings.support); render(); return;
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
      else if (state.card?.nextPage) { state.card = state.card.nextPage; state.picked = null; state.confirmed = false; render(); }
      break;
    case 'recap': state.recap = true; state.recapDone = false; render(); break;
    case 'override':
      if (state.card) { state.card = quizOverrideCard(state.card.asked, state.profile, state.settings.support); state.made.push(state.card); state.waitStart = Date.now(); render(); }
      break;
    case 'show-sent': { const d = document.querySelector<HTMLDetailsElement>('#sent'); if (d) { d.open = true; d.scrollIntoView({ block: 'nearest' }); } break; }
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
    case 'delete-all':
      if (confirm(C.about.deleteConfirm)) {
        void kvClear().then(() => { state.profile = { ...EMPTY_PROFILE, people: [] }; state.settings = { cloudHelp: false, support: 'more', welcomed: false }; state.answers = []; state.made = []; resetCard(); go('welcome'); render(); });
      }
      break;
  }
}

async function download() {
  if (!state.engine) return;
  state.device = 'downloading'; render();
  try {
    await state.engine.prepareDevice((p) => { state.downloading = p; if (p >= 1) state.warming = true; render(); });
  } catch (err) { state.error = (err as Error).message; }
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
  if (t.id === 'support') { state.settings.support = (t as HTMLSelectElement).value as SupportLevel; saveSettings(); if (state.lastQuestion) void make(state.lastQuestion); return; }
  if (t.id === 'consent') { state.consentChecked = (t as HTMLInputElement).checked; render(); return; }
  if (t instanceof HTMLInputElement && t.dataset.photo !== undefined && t.files?.[0]) { void addPhoto(Number(t.dataset.photo), t.files[0]); return; }
  if (t instanceof HTMLInputElement && t.dataset.field === 'household') { state.profile.people[Number(t.dataset.person)].household = t.checked; saveProfile(); }
});
app.addEventListener('input', (ev) => {
  const t = ev.target as HTMLInputElement | HTMLTextAreaElement;
  if (t.id === 'q') { state.lastQuestion = t.value; return; }
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

applyPreviewTheme();
void load().then(() => { render(); void refreshDevice(); });
