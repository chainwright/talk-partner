// Hidden trial timer (#/trial, not in the nav): the stopwatch and log for the timed pad-vs-card trial in
// devlog/TRIAL_PROTOCOL.md. Entries live in IndexedDB on this device (store.ts) and leave it only as a CSV the
// operator downloads. Meant to run on a second device, so the partner's own screen is never touched during a trial.

import { COPY } from '../../core/copy';
import { kvGet, kvSet } from './store';

const T = COPY.trial;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export type Outcome = 'confirmed' | 'escape' | 'guess' | 'abandoned';
export interface TrialRow {
  pair: string;
  condition: 'pad' | 'card';
  set: 'A' | 'B';
  q: number;
  startedAt: string;
  seconds: number;
  outcome: Outcome;
  note: string;
}
interface TrialState {
  pair: string;
  condition: 'pad' | 'card';
  set: 'A' | 'B';
  q: number;
  note: string;
  rows: TrialRow[];
}

const trial: TrialState = { pair: '1', condition: 'pad', set: 'A', q: 1, note: '', rows: [] };
let t0: number | null = null;
let loaded = false;

export async function loadTrial(): Promise<void> {
  if (loaded) return;
  const s = await kvGet<TrialState>('trial');
  if (s) Object.assign(trial, s, { rows: s.rows ?? [] });
  loaded = true;
}
const save = () => void kvSet('trial', trial);

const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor((ms % 1000) / 100))}`;

/** The elapsed-time string while the stopwatch runs, or null. Polled by the screen's interval. */
export function trialClock(): string | null {
  return t0 === null ? null : T.running(clock(performance.now() - t0));
}

/** RFC 4180 quoting: every field in double quotes, inner quotes doubled. */
export function toCsv(rows: TrialRow[]): string {
  const cols: (keyof TrialRow)[] = ['pair', 'condition', 'set', 'q', 'startedAt', 'seconds', 'outcome', 'note'];
  const cell = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n';
}

export function trialScreen(): string {
  const opt = (v: string, cur: string, label: string) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${label}</option>`;
  const rows = trial.rows.length
    ? `<table><tr><th>${T.columns.pair}</th><th>${T.columns.condition}</th><th>${T.columns.set}</th><th>${T.columns.q}</th><th>${T.columns.seconds}</th><th>${T.columns.outcome}</th><th>${T.columns.note}</th></tr>${trial.rows
      .map((r) => `<tr><td>${esc(r.pair)}</td><td>${r.condition === 'pad' ? T.pad : T.card}</td><td>${r.set}</td><td>${r.q}</td><td>${r.seconds.toFixed(1)}</td><td>${T.outcomes[r.outcome]}</td><td>${esc(r.note)}</td></tr>`).join('')}</table>`
    : `<p class="muted">${T.empty}</p>`;
  const running = t0 !== null;
  return `<main class="screen trial">
    <h1>${T.heading}</h1>
    <p>${T.intro}</p>
    <div class="trial-setup">
      <label>${T.pair}<input id="trial-pair" value="${esc(trial.pair)}" ${running ? 'disabled' : ''}></label>
      <label>${T.condition}<select id="trial-condition" ${running ? 'disabled' : ''}>${opt('pad', trial.condition, T.pad)}${opt('card', trial.condition, T.card)}</select></label>
      <label>${T.set}<select id="trial-set" ${running ? 'disabled' : ''}>${opt('A', trial.set, 'A')}${opt('B', trial.set, 'B')}</select></label>
      <label>${T.question}<input id="trial-q" type="number" min="1" max="99" value="${trial.q}" ${running ? 'disabled' : ''}></label>
      <label>${T.note}<input id="trial-note" value="${esc(trial.note)}"></label>
    </div>
    <p id="elapsed" class="elapsed">${trialClock() ?? T.idle}</p>
    <div class="actions">
      ${running
        ? `<button class="primary" data-act="trial-stop" data-outcome="confirmed">${T.confirmed}</button><button data-act="trial-stop" data-outcome="escape">${T.viaEscape}</button><button data-act="trial-stop" data-outcome="guess">${T.guessed}</button><button data-act="trial-stop" data-outcome="abandoned">${T.gaveUp}</button>`
        : `<button class="primary" data-act="trial-start">${T.asked}</button>`}
    </div>
    <h2>${T.logHeading}</h2>
    ${rows}
    <div class="actions"><button data-act="trial-export" ${trial.rows.length ? '' : 'disabled'}>${T.exportCsv}</button><button data-act="trial-undo" ${trial.rows.length ? '' : 'disabled'}>${T.undo}</button><button class="danger" data-act="trial-clear" ${trial.rows.length ? '' : 'disabled'}>${T.clear}</button></div>
  </main>`;
}

/** Field edits on the trial screen (delegated from main.ts). */
export function trialInput(t: HTMLInputElement | HTMLSelectElement): boolean {
  switch (t.id) {
    case 'trial-pair': trial.pair = t.value.trim(); break;
    case 'trial-condition': trial.condition = t.value === 'card' ? 'card' : 'pad'; break;
    case 'trial-set': trial.set = t.value === 'B' ? 'B' : 'A'; break;
    case 'trial-q': trial.q = Math.max(1, Number(t.value) || 1); break;
    case 'trial-note': trial.note = t.value; break;
    default: return false;
  }
  save();
  return true;
}

/** Buttons on the trial screen. Returns true when the screen must be drawn again. */
export function trialAct(el: HTMLElement, download: (name: string, text: string, type: string) => void): boolean {
  switch (el.dataset.act) {
    case 'trial-start':
      t0 = performance.now();
      return true;
    case 'trial-stop': {
      if (t0 === null) return false;
      const seconds = Math.round((performance.now() - t0) / 100) / 10;
      t0 = null;
      const outcome = (el.dataset.outcome ?? 'confirmed') as Outcome;
      trial.rows.push({ pair: trial.pair, condition: trial.condition, set: trial.set, q: trial.q, startedAt: new Date(Date.now() - seconds * 1000).toISOString(), seconds, outcome, note: trial.note });
      trial.note = '';
      trial.q += 1;
      save();
      return true;
    }
    case 'trial-undo':
      trial.rows.pop();
      save();
      return true;
    case 'trial-clear':
      if (confirm(T.clearConfirm)) { trial.rows = []; trial.q = 1; save(); return true; }
      return false;
    case 'trial-export':
      download(T.exportName, toCsv(trial.rows), 'text/csv');
      return false;
    default:
      return false;
  }
}
