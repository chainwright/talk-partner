// E-A: one screen. The partner types (left); the card for the person shows big (right).
// All card logic is in the shared core (../../core). This file is the thin web client: UI plus the Firebase engine.

import './styles.css';
import { bodyDetailCard, makeCard } from '../../core/pipeline';
import { SAMPLE_PROFILE, SAMPLE_QUESTIONS } from '../../core/sample';
import { LEGS } from '../../core/models';
import type { DeviceStatus, Engine } from '../../core/engine';
import type { BodyRegion, Card, Choice, SupportLevel } from '../../core/types';
import { BODY_REGIONS } from '../../core/rules';
import { builtinPicto, monogram, TICK, CROSS } from './pictos';
import { webConfig } from './ai/config';
import { LazyFirebaseEngine } from './ai/firebaseEngine';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

interface State {
  engine: Engine | null;
  device: DeviceStatus;
  downloading: number | null;
  cloudHelp: boolean;
  support: SupportLevel;
  busy: boolean;
  card: Card | null;
  picked: Choice | null;
  confirmed: boolean;
  error: string | null;
}

const cfg = webConfig();
const state: State = {
  engine: cfg ? new LazyFirebaseEngine(cfg) : null,
  device: 'unavailable',
  downloading: null,
  cloudHelp: false, // off by default; the partner turns it on after seeing what is sent
  support: 'more',
  busy: false,
  card: null,
  picked: null,
  confirmed: false,
  error: cfg ? null : 'Firebase is not configured (copy .env.example to .env.local).',
};

// ---------------------------------------------------------------- partner side
function statusLine(): string {
  if (!state.engine) return `<span class="dot off"></span>${esc(state.error ?? '')}`;
  switch (state.device) {
    case 'available': return '<span class="dot ok"></span>Ready on this computer.';
    case 'downloading': return `<span class="dot wait"></span>Downloading the private helper${state.downloading !== null ? `: ${Math.round(state.downloading * 100)}%` : ''}. Simple questions work meanwhile.`;
    case 'downloadable': return '<span class="dot wait"></span>One-time setup: download the private helper (several GB). <button id="dl" class="link">Download</button>';
    default: return '<span class="dot off"></span>This computer can\'t run the private helper. Yes/no, either-or and pain questions still work. Open questions need cloud help.';
  }
}

function badge(c: Card): string {
  if (c.blocked) return '<span class="badge none">No card</span>';
  if (c.source === 'code') return '<span class="badge code">No AI needed</span>';
  if (c.source === 'on-device') return c.ranOffline ? '<span class="badge device">Ran on this computer (offline)</span>' : '<span class="badge device">On this computer</span>';
  return '<span class="badge cloud">Cloud help (question only)</span>';
}

function sentPanel(c: Card): string {
  const swaps = c.cloudSwaps?.length ? `<p class="swaps">${c.cloudSwaps.map(esc).join('<br>')}</p>` : '';
  if (c.cloudPayload) return `<p>Sent for this card${c.source === 'in-cloud' ? '' : " (the cloud's answer wasn't used)"}:</p><pre>${esc(c.cloudPayload)}</pre>${swaps}`;
  if (c.unsentPayload) return `<p>Not sent. If cloud help were on, it would get only this:</p><pre>${esc(c.unsentPayload)}</pre>${swaps}`;
  return '<p>Nothing sent for this card.</p>';
}

function renderPartner() {
  $('#status').innerHTML = statusLine();
  $('#cloud').toggleAttribute('checked', state.cloudHelp);
  ($('#cloud') as HTMLInputElement).checked = state.cloudHelp;
  $('#consent').hidden = state.cloudHelp;
  ($('#make') as HTMLButtonElement).disabled = state.busy;
  $('#make').textContent = state.busy ? 'Making…' : 'Make card';
  const c = state.card;
  const out = $('#result');
  if (!c) { out.innerHTML = ''; return; }
  const notes = c.notes.length ? `<ul class="notes">${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
  const safety = c.kind === 'body' || c.kind === 'pain' ? '<p class="safety">Not for emergencies. For sudden or severe pain, call your emergency number.</p>' : '';
  let main: string;
  if (c.kind === 'no-quiz') {
    main = `<p class="warn">This one asks them to remember. Try saying it instead:</p><p class="say">${esc(c.say.replace(/^Tell, don't test:\s*/, ''))}</p>`;
  } else if (c.blocked) {
    main = `<p class="warn">${esc(c.blocked)}</p><p class="say">Just ask normally and give time.</p>`;
  } else {
    main = `<p class="label">Say this:</p><p class="say">${esc(c.say)}</p><p class="tip">Point to each choice as you read it. Then wait.</p>`;
  }
  const answered = state.confirmed && state.picked ? `<p class="done">Chose <b>${esc(state.picked.label)}</b> and confirmed it.</p>` : '';
  out.innerHTML = `${badge(c)}${main}${answered}${safety}${notes}
    <details class="sent"><summary>What was sent</summary>${sentPanel(c)}</details>`;
}

// ---------------------------------------------------------------- person side
function picture(ch: Choice): string {
  const p = ch.picture;
  if (p.type === 'builtin') return builtinPicto(p.id);
  if (p.type === 'person') return monogram(p.initial);
  return ''; // bundled pictures only in this build: a word-only tile, never an empty frame
}

function renderPerson() {
  const box = $('#person');
  const c = state.card;
  if (!c || c.blocked || !c.choices.length) {
    box.innerHTML = `<div class="listening">${builtinPicto('listen')}</div>`;
    return;
  }
  if (state.picked && state.confirmed) {
    box.innerHTML = `<h2 class="headline">${esc(c.topic)}</h2><div class="answered">${picture(state.picked)}<p>${esc(state.picked.label)}</p></div>`;
    return;
  }
  if (state.picked) {
    box.innerHTML = `<h2 class="headline">So: ${esc(state.picked.label)}. Right?</h2>
      <div class="confirm-pic">${picture(state.picked)}</div>
      <div class="tiles two"><button class="tile yes" data-confirm="yes">${TICK}<span>yes</span></button>
      <button class="tile" data-confirm="change">${CROSS}<span>change</span></button></div>`;
    return;
  }
  const answers = c.choices.filter((x) => x.role === 'answer');
  const cls = state.support === 'most' ? 'tiles stacked' : answers.length >= 3 ? 'tiles three' : 'tiles two';
  box.innerHTML = `<h2 class="headline">${esc(c.topic)}</h2>
    <div class="${cls}">${c.choices.map((ch, i) => `<button class="tile ${ch.role === 'escape' ? 'escape' : ''} ${picture(ch) ? '' : 'wordonly'}" data-i="${i}">${picture(ch)}<span>${esc(ch.label)}</span></button>`).join('')}</div>`;
}

function render() { renderPartner(); renderPerson(); }

// ---------------------------------------------------------------- actions
async function refreshDevice() {
  if (state.engine) state.device = await state.engine.deviceStatus();
  render();
}

async function make(q: string) {
  if (!state.engine || !q.trim()) return;
  state.busy = true; state.picked = null; state.confirmed = false; render();
  try {
    state.card = await makeCard(q, {
      profile: SAMPLE_PROFILE, support: state.support, engine: state.engine,
      allowCloud: state.cloudHelp, deviceReady: state.device === 'available',
    });
  } catch (e) {
    state.card = null; state.error = (e as Error).message;
  }
  state.busy = false; render();
}

function onPersonClick(ev: Event) {
  const t = (ev.target as HTMLElement).closest('button');
  if (!t || !state.card) return;
  const c = state.card;
  if (t.dataset.confirm === 'yes') { state.confirmed = true; render(); return; }
  if (t.dataset.confirm === 'change') { state.picked = null; render(); return; }
  const ch = c.choices[Number(t.dataset.i)];
  if (!ch) return;
  if (ch.role === 'escape' && c.nextPage) { state.card = c.nextPage; render(); return; }
  if (c.kind === 'body' && c.bodyStep === 1 && (BODY_REGIONS as string[]).includes(ch.label)) {
    state.card = bodyDetailCard(ch.label as BodyRegion, SAMPLE_PROFILE, state.support); render(); return;
  }
  t.classList.add('pressed');
  setTimeout(() => { state.picked = ch; render(); }, 180);
}

function legsTable(): string {
  return Object.entries(LEGS).map(([k, v]) => `<tr><td>${k}</td><td><code>${v.mode}</code></td><td>${esc(v.gets)}</td><td>${esc(v.why)}</td></tr>`).join('');
}

// ---------------------------------------------------------------- page
document.querySelector('#app')!.innerHTML = `
<header><h1>Talk Partner</h1><p>Turn your question into big written choices they can point to.</p></header>
<main class="layout">
  <section class="partner" aria-label="Partner">
    <p id="status" class="status"></p>
    <p class="sample">Sample family: made up (Frank, and Carol asking).</p>
    <form id="ask"><input id="q" autocomplete="off" placeholder="Ask what you'd normally ask…" aria-label="Your question"><button id="make" type="submit">Make card</button></form>
    <div class="chips">${SAMPLE_QUESTIONS.map((s) => `<button class="chip" data-q="${esc(s.q)}" title="${esc(s.shows)}">${esc(s.q)}</button>`).join('')}</div>
    <div class="settings">
      <label>Support <select id="support"><option value="mild">mild (3 choices)</option><option value="more" selected>more (2 choices)</option><option value="most">most (2, larger)</option></select></label>
      <label><input type="checkbox" id="cloud"> Cloud help</label>
    </div>
    <div id="consent" class="consent">When the private helper can't make a good card, cloud help sends <b>the question you typed</b> to Google's Gemini (through Firebase). Names, places and foods from About me are swapped for labels like "Person A" first. Anything else you type is sent as written. On the free tier, Google may use what is sent to improve its products.</div>
    <div id="result" aria-live="polite"></div>
    <details class="how"><summary>How this works</summary>
      <p>The model only proposes; code decides. Every AI call goes through Firebase AI Logic.</p>
      <table><tr><th>step</th><th>mode</th><th>gets</th><th>why</th></tr>${legsTable()}</table>
    </details>
  </section>
  <section id="person" class="person" aria-label="Card for the person"></section>
</main>
<footer>Based on Supported Conversation for Adults with Aphasia (SCA) principles. Not a therapy, not a diagnosis.</footer>`;

$('#ask').addEventListener('submit', (e) => { e.preventDefault(); void make(($('#q') as HTMLInputElement).value); });
$('.chips').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b?.dataset.q) return;
  ($('#q') as HTMLInputElement).value = b.dataset.q;
  void make(b.dataset.q);
});
$('#support').addEventListener('change', (e) => { state.support = (e.target as HTMLSelectElement).value as SupportLevel; const q = ($('#q') as HTMLInputElement).value; if (q) void make(q); });
$('#cloud').addEventListener('change', (e) => { state.cloudHelp = (e.target as HTMLInputElement).checked; render(); });
$('#person').addEventListener('click', onPersonClick);
$('#status').addEventListener('click', async (e) => {
  if ((e.target as HTMLElement).id !== 'dl' || !state.engine) return;
  state.device = 'downloading'; render();
  try {
    await state.engine.prepareDevice((p) => { state.downloading = p; render(); });
  } catch (err) { state.error = (err as Error).message; }
  state.downloading = null; await refreshDevice();
});

render();
void refreshDevice();
