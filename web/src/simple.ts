// The simple view (direction A, "One screen"): what a carer on a phone sees at "/". Three states of one screen (the
// first screen, the card is ready, they answered), a consent sheet that comes up only when a question needs online
// help, and About them as four plain rows. These functions only draw: every value is handed in by main.ts, which reads
// it from the same state, the same `Card` and the same pipeline as the full view. No DOM here, so the markup can be
// tested in Node (tests/unit/simple-view.test.ts). Every word a person reads comes from core/copy.ts.

import type { PartnerAction } from '../../core/actions';
import { COPY } from '../../core/copy';
import type { MadeWhere } from '../../core/simple';
import type { Card, Profile } from '../../core/types';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Signs for controls and status lines (never on a card): decorative, so hidden from a screen reader.
const sign = (body: string) => `<svg class="sg" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const SIGN = {
  lock: sign('<rect x="20" y="42" width="56" height="42" rx="8"/><path d="M32 42V30a16 16 0 0132 0v12"/>'),
  cloud: sign('<path d="M28 72a16 16 0 01-2-32 22 22 0 0142-6 18 18 0 014 38z"/>'),
  maybe: sign('<path d="M28 72a16 16 0 01-2-32 22 22 0 0142-6 18 18 0 014 38z" stroke-dasharray="9 9"/>'),
  info: sign('<circle cx="48" cy="48" r="36"/><path d="M48 44v24"/><circle cx="48" cy="29" r="2" fill="currentColor"/>'),
  back: sign('<path d="M56 20L28 48l28 28"/>'),
  grid: sign('<rect x="14" y="14" width="28" height="28" rx="6"/><rect x="54" y="14" width="28" height="28" rx="6"/><rect x="14" y="54" width="28" height="28" rx="6"/><rect x="54" y="54" width="28" height="28" rx="6"/>'),
  person: sign('<circle cx="48" cy="30" r="14"/><path d="M20 84c2-18 14-28 28-28s26 10 28 28"/>'),
  tick: sign('<path d="M20 50l18 18 38-40"/>'),
};

export interface SimpleModel {
  /** The person's name, or '' when About me has none yet. */
  name: string;
  /** The About-me heading: "About Frank" / "About me". */
  about: string;
  /** About me holds something (a name, a person, a list entry). */
  hasProfile: boolean;
  busy: boolean;
  error: string | null;
  question: string;
  /** The three ready questions, each with the line that says how its card is made here. */
  tries: { q: string; note: string }[];
  /** The state-driven privacy sentences (core/simple.ts, privacyLines). */
  privacy: string[];
  /** Where the AI runs, in one line (core/simple.ts, whereLine). */
  where: string;
  /** The microphone button and the line under the field, as the full view draws them (main.ts): '' where there is none. */
  micHtml: string;
  voiceHtml: string;
}

const top = (m: { name: string }) => `<header class="s-top"><a class="brand" href="#/">${COPY.app.name}</a>${m.name ? `<span class="with">${SIGN.person}${esc(COPY.simple.with(m.name))}</span>` : ''}</header>`;
const insideLink = (act: 'inside' | 'inside-card', label: string) => `<button type="button" class="tlink inside" data-act="${act}">${label} →</button>`;
const privacyBlock = (lines: string[], extra = '') => `<p class="lock" id="s-privacy">${SIGN.lock}<span>${lines.map(esc).join(' ')}${extra ? ` ${esc(extra)}` : ''}</span></p>`;

/** The first screen: one thing to do, three ready questions, quick needs, About them offered, and what has left. */
export function homeScreen(m: SimpleModel): string {
  const S = COPY.simple;
  const status = m.busy ? `<p class="making" role="status"><span class="dot wait"></span>${S.making}</p>` : m.error ? `<p class="warn" role="alert">${esc(m.error)}</p>` : '';
  return `<main class="simple wrap home" data-screen="home">
  ${top(m)}
  <div class="col">
    <div><h1>${S.heading}</h1><p class="sub">${S.sub}</p></div>
    <form id="ask" class="s-ask">
      <div class="row"><input id="q" class="field" autocomplete="off" placeholder="${S.field}" aria-label="${COPY.ask.label}" value="${esc(m.question)}">${m.micHtml}</div>
      ${m.voiceHtml}
      <button id="make" class="btn primary" type="submit" ${m.busy ? 'disabled' : ''}>${S.make}</button>
    </form>
    <div id="result" aria-live="polite">${status}</div>
    <div class="try"><h2>${S.tryHeading}</h2>
      ${m.tries.map((t) => `<button type="button" class="btn ready" data-q="${esc(t.q)}"><span><b>${esc(t.q)}</b><small>${esc(t.note)}</small></span></button>`).join('')}
    </div>
  </div>
  <div class="col">
    <button type="button" class="btn needs" data-act="needs">${SIGN.grid}<span><b>${S.needs}</b><small>${S.needsSub}</small></span></button>
    <a class="offer" href="#/about"><span><b>${m.hasProfile ? esc(m.about) : S.offer}</b><small>${S.offerSub}</small></span><span class="go">${S.offerGo(m.hasProfile)} →</span></a>
  </div>
  <footer class="foot">
    ${privacyBlock(m.privacy)}
    <p class="where" id="s-where">${esc(m.where)}</p>
    ${insideLink('inside', S.inside)}
  </footer>
</main>`;
}

export interface CardModel {
  name: string;
  card: Card;
  /** "Hide the choices" is on: the person sees only the headline. */
  less: boolean;
  /** The recap is on the person's screen. */
  recap: boolean;
  recapText: string;
  /** The recap was confirmed. */
  recapDone: boolean;
  /** The buttons the card rules give this card (core/actions.ts), the same list as the full view. */
  actions: PartnerAction[];
  made: MadeWhere;
  /** What the person's card looks like now (main.ts, personView): the preview the partner holds up. */
  personHtml: string;
  /** Cloud help is off and could try this question: the blocked screen offers the sheet again. */
  canAskOnline: boolean;
  /** What they chose the last time this question was asked ('' when it was not): for the partner only. */
  lastTime: string;
}

/** Where this card was made: on the screen itself, under the card, never only behind a link. */
export function madeBlock(w: MadeWhere): string {
  const icon = w.left === 'sent' || w.maker === 'cloud' ? SIGN.cloud : w.left === 'maybe' ? SIGN.maybe : SIGN.lock;
  return `<p class="made-where" id="made-where" data-maker="${w.maker}" data-left="${w.left}"${w.spoken ? ' data-spoken="1"' : ''}>${icon}<span>${w.lines.map(esc).join(' ')}</span></p>`;
}

function actionButtons(m: { name: string }, actions: PartnerAction[]): { primary: string; rest: string } {
  const S = COPY.simple;
  const label = (a: PartnerAction) => (a.act === 'show' ? S.step2(m.name) : a.act === 'recap' ? S.recap : a.label);
  const primary = actions.filter((a) => a.primary).map((a) => `<button type="button" class="btn primary" data-act="${a.act}">${esc(label(a))}</button>`).join('');
  const others = actions.filter((a) => !a.primary);
  const rest = others.length ? `<div class="two-btn${others.length === 1 ? ' one' : ''}">${others.map((a) => `<button type="button" class="btn quiet" data-act="${a.act}">${esc(label(a))}</button>`).join('')}</div>` : '';
  return { primary, rest };
}

/** The card is ready: 1 say this out loud, 2 show them the card. Also the screen for a question that got no card. */
export function cardScreen(m: CardModel): string {
  const S = COPY.simple;
  const K = COPY.card;
  const c = m.card;
  const { primary, rest } = actionButtons(m, m.actions);
  const back = `<button type="button" class="backrow" data-act="new">${SIGN.back}${S.back}</button>`;
  const foot = `<footer class="foot">${insideLink('inside-card', S.madeLink)}</footer>`;
  const coach = c.coach ? `<p class="coach">${esc(c.coach)}</p>` : '';
  const safety = c.kind === 'body' || c.kind === 'pain' ? `<p class="safety">${COPY.safety}</p>` : '';
  const step = (n: number, text: string) => `<p class="steplabel"><span class="num">${n}</span>${esc(text)}</p>`;

  // no card: a memory question (a line to say instead), or a question nothing here could make choices for
  if (c.kind === 'no-quiz' || c.blocked) {
    const body = c.kind === 'no-quiz'
      ? `<p class="steplabel">${COPY.memory.line}</p><p class="say">${esc(c.say.replace(COPY.notes.tellPrefix, ''))}</p>`
      : `<h1>${S.noCard}</h1><p class="why-not">${esc(c.blocked ?? '')}</p><p class="say">${K.justAsk}</p>
         ${m.canAskOnline ? `<button type="button" class="btn" data-act="sheet">${S.useOnline}</button>` : ''}
         <p class="tip">${S.askChoice}</p>`;
    return `<main class="simple wrap one nocard" data-screen="nocard">${back}
  <div class="col">${coach}${body}${primary}${rest}${madeBlock(m.made)}</div>${foot}</main>`;
  }

  const say = m.recap || m.recapDone ? `${COPY.person.recapLine} ${m.recapText}` : m.less ? c.asked : c.say;
  const sayLabel = m.recap || m.recapDone ? S.recap : m.less ? K.lessOn : S.step1;
  const tip = c.kind === 'repair' ? COPY.repair.tip : c.kind === 'needs' ? COPY.needs.tip : S.tip;
  const canHide = m.actions.some((a) => a.act === 'less');
  return `<main class="simple wrap card" data-screen="card">${back}
  <div class="c-say">${coach}<div class="stack">${step(1, sayLabel)}<p class="say">${esc(say)}</p></div>${m.lastTime ? `<p class="last">${esc(m.lastTime)}</p>` : ''}</div>
  <div class="c-card">${step(2, S.step2(m.name))}
    <section id="person" class="person mini" aria-label="Card for the person" data-kind="${c.kind}">${m.personHtml}</section>
    ${madeBlock(m.made)}
  </div>
  <div class="c-go">${primary}
    ${primary ? `<p class="tip">${esc(tip)} ${esc(S.tipExit(m.name))}</p>` : ''}
    ${rest}
    ${canHide ? `<p class="hint">${esc(S.lessHint(m.name))}</p>` : ''}
    ${safety}
  </div>${foot}</main>`;
}

export interface AnsweredModel {
  name: string;
  /** The label they chose and confirmed with the tick. */
  label: string;
  /** The partner's next move for this answer, already drawn (a way out, a need, a repair way): '' for a plain answer. */
  afterHtml: string;
  /** "Next: second question", when the question was two in one. */
  next: PartnerAction | null;
  hasAnswers: boolean;
  /** Answers confirmed since this page was opened, newest first. */
  today: { q: string; label: string }[];
  made: MadeWhere;
  privacy: string[];
}

/** They answered: what they chose, and the next thing to do. */
export function answeredScreen(m: AnsweredModel): string {
  const S = COPY.simple;
  const today = m.today.length ? `<div class="before"><p class="steplabel muted">${S.today}</p><ul>${m.today.map((t) => `<li><span>${esc(t.q)}</span><b>${esc(t.label)}</b></li>`).join('')}</ul></div>` : '';
  return `<main class="simple wrap s-answered" data-screen="answered">
  ${top(m)}
  <div class="col">
    <div class="chose" role="status">${SIGN.tick}<div><span class="muted small">${esc(S.chose(m.name))}</span><b>${esc(m.label)}</b></div></div>
    ${m.afterHtml}
    ${m.next ? `<button type="button" class="btn primary" data-act="${m.next.act}">${esc(m.next.label)}</button><button type="button" class="btn" data-act="new">${S.another}</button>`
      : `<button type="button" class="btn primary" data-act="new">${S.another}</button>`}
    <div class="two-btn"><button type="button" class="btn quiet" data-act="needs">${S.needs}</button>${m.hasAnswers ? `<button type="button" class="btn quiet" data-act="recap">${S.recap}</button>` : ''}<button type="button" class="btn quiet" data-act="stuck">${COPY.card.stuck}</button></div>
  </div>
  <div class="col">${today}${madeBlock(m.made)}</div>
  <footer class="foot">
    ${privacyBlock(m.privacy, S.privacy.answers)}
    ${insideLink('inside-card', S.madeLink)}
  </footer>
</main>`;
}

export interface SheetModel {
  about: string;
  /** The one line of the request that changes with the question ("Partner asks: …", after the name swap). */
  line: string;
  /** This browser has the on-device model (it made no card for this question): the sheet then does not say it has none. */
  deviceThere: boolean;
}

/**
 * Online help, asked in plain words at the moment a question needs it. Everything that decides it stands above the two
 * buttons: the line that would go, what else is in the request, what can be missed, what is never sent, the data use.
 */
export function consentSheet(m: SheetModel): string {
  const K = COPY.consent.sheet;
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
  <button type="button" class="btn" data-act="sheet-no">${K.no}</button></div>
  <p class="small muted after">${esc(K.after)}</p>
  <p class="links"><a class="tlink" href="#/cloud">${K.exact} →</a><a class="tlink" href="${COPY.consent.termsLink}" target="_blank" rel="noopener">${K.terms}</a></p>
</div>`;
}

export type AboutRow = 'names' | 'people' | 'foods' | 'places';

/** About them, as four plain rows over the same fields as the full page: offered, never required. */
export function aboutSimple(m: { profile: Profile; open: AboutRow | null; saved: boolean }): string {
  const S = COPY.simple.about;
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
  <a class="backrow" href="#/">${SIGN.back}${COPY.app.nav.home}</a>
  <div><h1>${esc(A.heading(p.personName))}</h1><p class="sub">${esc(S.sub(p.personName))}</p></div>
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
  </form>
  <p id="saved" class="saved" role="status">${m.saved ? A.saved : ''}</p>
  <a class="btn primary" href="#/">${A.done}</a>
  <p class="small muted more">${S.more} <button type="button" class="tlink" data-act="inside-about">${S.moreLink} →</button></p>
</main>`;
}
