// The simple view's screens as markup (web/src/simple.ts draws strings, so no browser is needed): the numbered steps,
// "We're stuck" on the card-ready screen, where the card was made on the screen itself, the consent sheet's contents,
// the way inside on every screen. The same screens are driven in a real browser by scripts/e2e-simple.py.
import { describe, expect, it } from 'vitest';
import { partnerActions } from '../../core/actions';
import { COPY } from '../../core/copy';
import { NullEngine } from '../../core/engine';
import { makeCard, repairCard } from '../../core/pipeline';
import { sentLine } from '../../core/receipt';
import { madeWhere } from '../../core/simple';
import { EMPTY_PROFILE, type Card } from '../../core/types';
import { aboutSimple, answeredScreen, cardScreen, consentSheet, homeScreen, type CardModel } from '../../web/src/simple';
import { PROFILE } from './fixtures';

const S = COPY.simple;
const make = (q: string): Promise<Card> => makeCard(q, { profile: PROFILE, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
const cardModel = (c: Card, over: Partial<CardModel> = {}): CardModel => ({
  name: 'Alan', card: c, less: false, recap: false, recapText: '', recapDone: false,
  actions: partnerActions(c, { less: false, hasAnswers: false }), made: madeWhere(c, { about: 'About Alan' }),
  personHtml: '<h2 class="headline">x</h2>', canAskOnline: false, lastTime: '', ...over,
});
const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('simple view: the first screen', () => {
  const html = homeScreen({
    name: '', about: 'About me', hasProfile: false, busy: false, error: null, question: '',
    tries: S.tries.map((q) => ({ q, note: S.tryNote.code })), privacy: [S.privacy.none], where: S.where.cloudOff, micHtml: '', voiceHtml: '',
  });
  it('one field, one main button, three one-tap questions, quick needs, About them', () => {
    expect(count(html, 'id="q"')).toBe(1);
    expect(count(html, 'class="btn primary"')).toBe(1);
    expect(html).toContain(`>${S.make}</button>`);
    expect(count(html, 'class="btn ready"')).toBe(3);
    for (const q of S.tries) expect(html).toContain(`data-q="${q}"`);
    expect(html).toContain('data-act="needs"');
    expect(html).toContain('href="#/about"');
  });
  it('the privacy line, where the AI runs and the way inside are on the screen', () => {
    expect(html).toContain(S.privacy.none);
    expect(html).toContain(S.where.cloudOff.replace(/'/g, '&#39;'));
    expect(html).toContain(`data-act="inside">${S.inside} →`);
  });
  it('nothing technical: no status box, no badge, no mode names', () => {
    expect(html).not.toMatch(/ONLY_ON_DEVICE|PREFER_IN_CLOUD|Firebase|Gemini|class="badge|id="status"|Judge mode|bytes/);
  });
  it('while a card is being made the button is off and the screen says so', () => {
    const busy = homeScreen({ name: 'Alan', about: 'About Alan', hasProfile: true, busy: true, error: null, question: 'x', tries: [], privacy: [], where: '', micHtml: '', voiceHtml: '' });
    expect(busy).toMatch(/id="make"[^>]*disabled/);
    expect(busy).toContain(S.making);
    expect(busy).toContain('with Alan');
  });
});

describe('simple view: the card is ready', () => {
  it('1 "Say this out loud", 2 "Show <name> the card", the card, the main button', async () => {
    const c = await make('Do you want coffee or tea?');
    const html = cardScreen(cardModel(c));
    expect(html).toContain(`<span class="num">1</span>${S.step1}`);
    expect(html).toContain('<span class="num">2</span>Show Alan the card');
    expect(html).toContain(c.say);
    expect(html).toContain('id="person"');
    expect(html).toContain('class="btn primary" data-act="show">Show Alan the card</button>');
    expect(html.indexOf(S.step1)).toBeLessThan(html.indexOf('id="person"'));
    expect(html.indexOf('id="person"')).toBeLessThan(html.indexOf('data-act="show"'));
  });
  it('"We\'re stuck" is on this screen, before any answer', async () => {
    const html = cardScreen(cardModel(await make('Do you want coffee or tea?')));
    expect(html).toContain(`data-act="stuck">${COPY.card.stuck.replace(/'/g, '&#39;')}</button>`);
    expect(html).toContain('data-act="less"');
  });
  it('where the card was made is on the screen itself, under the card, not only behind the link', async () => {
    const c = await make('Do you want coffee or tea?');
    const html = cardScreen(cardModel(c));
    expect(html).toContain('id="made-where" data-maker="code" data-left="nothing"');
    expect(html).toContain(S.made.code.replace(/'/g, '&#39;'));
    expect(html).toContain(S.left.nothing);
    expect(html.indexOf('id="made-where"')).toBeLessThan(html.indexOf('data-act="inside-card"'));
    expect(html).toContain(`data-act="inside-card">${S.madeLink} →`);
  });
  it('a card made with online help carries the cloud strip and what was sent', async () => {
    const c = { ...(await make('Do you want coffee or tea?')), source: 'in-cloud' as const, cloudPayload: '{"contents":[{"parts":[{"text":"Partner asks: x"}]}]}' };
    const html = cardScreen(cardModel(c, { made: madeWhere(c, { about: 'About Alan' }) }));
    expect(html).toContain('data-maker="cloud" data-left="sent"');
    expect(html).toContain('fixed instructions');
  });
  it('the repair card keeps the way back to the choices', () => {
    const c = repairCard(PROFILE);
    const html = cardScreen(cardModel(c));
    expect(html).toContain('data-act="unstuck"');
    expect(html).toContain(COPY.repair.tip);
  });
  it('a question with no card: the reason, the line to say, and the sheet offered again when online help could try', async () => {
    const c = await makeCard('What do you want to do this weekend?', { profile: PROFILE, support: 'more', engine: Object.assign(new NullEngine(), { cloudConfigured: true }), allowCloud: false, deviceReady: false });
    expect(c.blocked).toBeTruthy();
    const html = cardScreen(cardModel(c, { canAskOnline: true }));
    expect(html).toContain(S.noCard);
    expect(html).toContain(COPY.card.justAsk);
    expect(html).toContain(`data-act="sheet">${S.useOnline}</button>`);
    expect(html).not.toContain('id="person"');
    expect(html).toContain('data-maker="none"');
    expect(cardScreen(cardModel(c, { canAskOnline: false }))).not.toContain('data-act="sheet"');
  });
  it('a memory question: the line to say instead, no card to show', async () => {
    const c = await make('What year did we get married?');
    const html = cardScreen(cardModel(c));
    expect(c.kind).toBe('no-quiz');
    expect(html).toContain(COPY.memory.line);
    expect(html).not.toContain('data-act="show"');
  });
});

describe('simple view: they answered', () => {
  const made = { maker: 'code' as const, left: 'nothing' as const, spoken: false, lines: [S.made.code, S.left.nothing] };
  const html = answeredScreen({ name: 'Alan', label: 'tea', afterHtml: '', next: null, hasAnswers: true, today: [{ q: 'Do you want coffee or tea?', label: 'tea' }], made, privacy: [S.privacy.none] });
  it('what they chose, the next thing to do, the ways on', () => {
    expect(html).toContain('Alan chose and said yes to');
    expect(html).toContain('<b>tea</b>');
    expect(html).toContain(`class="btn primary" data-act="new">${S.another}</button>`);
    for (const act of ['needs', 'recap', 'stuck']) expect(html).toContain(`data-act="${act}"`);
    expect(html).toContain(S.today);
  });
  it('says where the answers are kept and where the card was made', () => {
    expect(html).toContain(S.privacy.answers);
    expect(html).toContain('id="made-where"');
    expect(html).toContain('data-act="inside-card"');
  });
  it('a question that was two in one: the second question is the main button', () => {
    const two = answeredScreen({ name: '', label: 'good', afterHtml: '', next: { act: 'next', label: COPY.card.nextSecond }, hasAnswers: false, today: [], made, privacy: [] });
    expect(two).toContain(`class="btn primary" data-act="next">${COPY.card.nextSecond}</button>`);
    expect(two).toContain('They chose and said yes to');
  });
});

describe('simple view: the consent sheet', () => {
  const payload = JSON.stringify({ contents: [{ parts: [{ text: 'Partner asks: What do you want to do this weekend?' }] }] });
  const html = consentSheet({ about: 'About Alan', line: sentLine(payload).text, deviceThere: false });
  const K = COPY.consent.sheet;
  it('is a dialog with the exact line that would go, above the buttons', () => {
    expect(html).toContain('role="dialog" aria-modal="true" aria-labelledby="sheet-h"');
    expect(html).toContain('Partner asks: What do you want to do this weekend?');
    expect(html.indexOf('id="sheet-line"')).toBeLessThan(html.indexOf('data-act="sheet-yes"'));
  });
  it('what is sent, what can be missed, what is never sent and the data use stand above the buttons', () => {
    const yes = html.indexOf('data-act="sheet-yes"');
    for (const s of [K.sentLabel, 'fixed instructions', 'can be missed', K.neverLabel, K.dataLabel, 'may use what is sent']) {
      expect(html.indexOf(s)).toBeGreaterThan(-1);
      expect(html.indexOf(s)).toBeLessThan(yes);
    }
  });
  it('two buttons that say what they do, a link to the exact request and to Google\'s terms', () => {
    expect(html).toContain(`data-act="sheet-yes">${K.yes}</button>`);
    expect(html).toContain(`data-act="sheet-no">${K.no}</button>`);
    expect(html).toContain('href="#/cloud"');
    expect(html).toContain(`href="${COPY.consent.termsLink}"`);
    expect(html).not.toMatch(/type="checkbox"/);
  });
  it('with an on-device model in this browser it does not say the device has no AI', () => {
    const there = consentSheet({ about: 'About Alan', line: 'x', deviceThere: true });
    expect(there).not.toContain('has no AI of its own');
    expect(there).toContain('made no card for this one');
  });
});

describe('simple view: About them', () => {
  it('four rows, closed, with what is in them; nothing is required', () => {
    const html = aboutSimple({ profile: PROFILE, open: null, saved: false });
    expect(html.split('class="rowhead"').length - 1).toBe(4);
    expect(html).toContain('About Alan');
    expect(html).toContain('Alan · Maria');
    expect(html).toContain('Maria (wife)');
    expect(html).toContain(S.about.lock);
    expect(html).not.toContain('data-field="personName"');
    expect(html).toContain('data-act="inside-about"');
  });
  it('an open row holds the same fields as the full page', () => {
    expect(aboutSimple({ profile: PROFILE, open: 'names', saved: false })).toContain('data-field="personName"');
    expect(aboutSimple({ profile: PROFILE, open: 'people', saved: false })).toContain('data-act="person-add"');
    expect(aboutSimple({ profile: PROFILE, open: 'places', saved: false })).toContain('data-list="tv"');
  });
  it('empty: every row says so and offers "Add"', () => {
    const html = aboutSimple({ profile: { ...EMPTY_PROFILE, people: [] }, open: null, saved: false });
    expect(html.split(S.about.none).length - 1).toBe(4);
    expect(html.split(`>${S.about.add}<`).length - 1).toBe(4);
    expect(html).toContain('About me');
  });
});
