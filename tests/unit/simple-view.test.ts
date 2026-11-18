// The simple view's screens as markup (web/src/simple.ts draws strings, so no browser is needed): the first screen
// (hope line, quick needs at the top, "How it works: 4 steps" open or folded, topics, your own question, the plain AI
// line, one privacy line), the carer's screen before handing over (with the visible "wait" line), the person's own
// screens (no category word; the check; the finish with its button), the screen after an answer ("Ask another
// question" as the main button, the next step, the way out, About them offered), the consent sheet, About them.
// The same screens are driven in a real browser by scripts/e2e-simple.py.
import { describe, expect, it } from 'vitest';
import { partnerActions } from '../../core/actions';
import { COPY } from '../../core/copy';
import { NullEngine } from '../../core/engine';
import { needsCard } from '../../core/needs';
import { makeCard, repairCard } from '../../core/pipeline';
import { sentLine } from '../../core/receipt';
import { madeWhere } from '../../core/simple';
import { SAMPLE_PROFILE } from '../../core/sample';
import { topics } from '../../core/topics';
import { EMPTY_PROFILE, type Card, type Choice } from '../../core/types';
import { aboutSimple, answeredScreen, cardScreen, consentSheet, homeScreen, howBlock, personSimple, shortBlock, topicGrid, type AnsweredModel, type CardModel, type HomeModel, type PersonModel } from '../../web/src/simple';
import { PROFILE } from './fixtures';

const S = COPY.simple;
const make = (q: string): Promise<Card> => makeCard(q, { profile: PROFILE, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
const cardModel = (c: Card, over: Partial<CardModel> = {}): CardModel => ({
  name: 'Alan', card: c, less: false, recap: false, recapText: '', recapDone: false,
  actions: partnerActions(c, { less: false, hasAnswers: false }), made: madeWhere(c, { about: 'About Alan' }),
  personHtml: '<p class="p-do">x</p>', canAskOnline: false, offline: false, lastTime: '', ...over,
});
const count = (html: string, needle: string) => html.split(needle).length - 1;
const text = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const home = (over: Partial<HomeModel> = {}): HomeModel => ({
  name: '', aboutLink: false, busy: false, error: null, question: '', howOpen: true, topics: topics({ ...EMPTY_PROFILE, people: [] }), topicOpen: null,
  aiTag: S.aiTag.net, ai: [S.ai.line, S.ai.ask], privacy: [S.privacy.none], micHtml: '', voiceHtml: '', ...over,
});
const pic = (ch: Choice) => (ch.picture.type === 'builtin' ? `<svg data-pic="${ch.picture.id}"></svg>` : '');
const person = (over: Partial<PersonModel>): PersonModel => ({ card: null, busy: false, less: false, picked: null, confirmed: false, recap: false, answers: [], pic, waitPic: '<svg data-pic="listen"></svg>', full: true, ...over });

describe('simple view: the first screen', () => {
  const html = home();
  const out = homeScreen(html);
  it('the hope line is the header, with no default "him": "them" until About them has a name', () => {
    expect(out).toContain("<h1 id=\"hope\">When the words won&#39;t come, let them point.</h1>");
    expect(homeScreen(home({ name: 'Frank' }))).toContain('let Frank point.');
    expect(text(out)).not.toMatch(/\b(?:him|his|he|her|she)\b/i);
  });
  it('the order: hope, quick needs, how it works, topics, your own question, the AI line, the privacy line', () => {
    const at = (needle: string) => { const i = out.indexOf(needle); expect(i, needle).toBeGreaterThan(-1); return i; };
    const order = [at('id="hope"'), at('data-act="needs"'), at('id="how"'), at('id="topics"'), at(S.ownHeading), at('id="q"'), at('id="make"'), at('id="ai-line"'), at('id="s-privacy"'), at('data-act="inside"')];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it('quick needs is at the top, above the how-to block and the topics', () => {
    expect(out).toContain(S.needs);
    expect(out.indexOf('data-act="needs"')).toBeLessThan(out.indexOf('id="how"'));
    expect(out.indexOf('data-act="needs"')).toBeLessThan(out.indexOf('class="topic'));
  });
  it('one main button, "Show them the choices"; the own question comes second, after the topics', () => {
    expect(count(out, 'class="btn primary"')).toBe(1);
    expect(out).toContain('>Show them the choices</button>');
    expect(homeScreen(home({ name: 'Frank' }))).toContain('>Show Frank the choices</button>');
    expect(out.indexOf('class="topic')).toBeLessThan(out.indexOf('id="q"'));
  });
  it('no empty video slot, no walkthrough, no About-them form and no ready-made example rows', () => {
    expect(out).not.toMatch(/video|Watch how|walkthrough|Skip|class="walk|class="dim|role="dialog"/i);
    expect(out).not.toContain('href="#/about"');
    expect(out).not.toMatch(/class="btn ready"|class="offer"/);
  });
  it('one plain AI line and one small privacy line; nothing technical', () => {
    expect(count(out, 'id="ai-line"')).toBe(1);
    expect(text(out)).toContain(`${S.ai.line} ${S.ai.ask}`);
    expect(count(out, 'class="lock"')).toBe(1);
    expect(out).toContain(S.privacy.none);
    expect(out).toContain(`data-act="inside">${S.inside} →`);
    expect(out).not.toMatch(/ONLY_ON_DEVICE|PREFER_IN_CLOUD|Firebase|Gemini|class="badge|id="status"|Judge mode|bytes|No AI: the app makes/);
    expect(text(out)).not.toMatch(/\bcard\b/i);
  });
  it('the link to About them appears once there is something in it, or after the first card', () => {
    expect(homeScreen(home({ aboutLink: true }))).toContain('<a class="tlink" href="#/about">About them →</a>');
    expect(homeScreen(home({ aboutLink: true, name: 'Frank' }))).toContain('About Frank →');
  });
  it('while the choices are being made the button is off and the screen says so', () => {
    const busy = homeScreen(home({ name: 'Alan', busy: true, question: 'x' }));
    expect(busy).toMatch(/id="make"[^>]*disabled/);
    expect(busy).toContain(S.making);
    expect(busy).toContain('with Alan');
  });
});

describe('simple view: "How it works: 4 steps"', () => {
  it('open: the title, four numbered steps each with a picture, and the visible "wait" line under step 3', () => {
    const html = howBlock('', true);
    expect(html).toContain('<h2 id="how-h">How it works: 4 steps</h2>');
    expect(count(html, '<li>')).toBe(4);
    expect(count(html, 'class="num"')).toBe(4);
    expect(count(html, '<svg')).toBe(4);
    for (const line of S.how.steps('')) expect(text(html)).toContain(line);
    expect(html).toContain('<b class="wait">Wait. Count to ten. Don&#39;t answer for them.</b>');
    expect(html.indexOf('class="wait"')).toBeGreaterThan(html.indexOf('They point at the answer'));
    expect(html.indexOf('class="wait"')).toBeLessThan(html.indexOf('Check:'));
    expect(html).toContain(`data-act="how" aria-expanded="true">${S.how.hide}</button>`);
  });
  it('with a name the steps use it', () => {
    const t = text(howBlock('Rosa', true));
    expect(t).toContain('Turn the computer to Rosa and say it out loud');
    expect(t).toContain("Don't answer for Rosa.");
  });
  it('folded: one highlighted line that opens it again, still at the top', () => {
    const html = howBlock('', false);
    expect(html).toMatch(/^<button type="button" class="how-line" id="how" data-act="how" aria-expanded="false">/);
    expect(text(html)).toBe('How it works: 4 steps Show');
    expect(html).not.toContain('<li>');
    const screen = homeScreen(home({ howOpen: false }));
    expect(screen.indexOf('class="how-line"')).toBeLessThan(screen.indexOf('id="topics"'));
  });
});

describe('simple view: the topics', () => {
  const list = topics(SAMPLE_PROFILE);
  it('seven tiles, closed: no question is shown until a topic is tapped', () => {
    const html = topicGrid({ name: '', topics: list, topicOpen: null, aiTag: S.aiTag.net });
    expect(count(html, 'class="topic"')).toBe(7);
    expect(html).not.toContain('class="tq"');
    for (const t of list) expect(html).toContain(`data-topic="${t.id}"`);
  });
  it('an open topic lists its questions as one-tap rows, the family\'s own tagged, under the lead line', () => {
    const html = topicGrid({ name: 'Frank', topics: list, topicOpen: 'food', aiTag: S.aiTag.net });
    expect(html).toContain('class="topic open" data-act="topic" data-topic="food" aria-expanded="true"');
    expect(count(html, 'class="tq"')).toBe(list[0].questions.length);
    expect(html).toContain('data-q="Would you like tea or coffee?"');
    expect(html).toContain('data-q="Would you like pot roast or chili?"><span>Would you like pot roast or chili?</span><span class="tag">Frank&#39;s own</span>');
    expect(html.indexOf('tea or coffee')).toBeLessThan(html.indexOf('pot roast or chili'));
    expect(text(html)).toContain('Tap one. Then say it out loud as you turn the computer to Frank.');
  });
  it('the panel opens under the ROW of its tile, so no tile moves (left and right tile alike)', () => {
    for (const [open, after] of [['food', 'body'], ['body', 'body'], ['rest', 'people'], ['fun', 'fun']] as const) {
      const html = topicGrid({ name: '', topics: list, topicOpen: open, aiTag: '' });
      const tiles = [...html.matchAll(/data-topic="(\w+)"/g)].map((m) => m[1]);
      expect(tiles).toEqual(list.map((t) => t.id));
      expect(html.indexOf('class="tqs"')).toBeGreaterThan(html.indexOf(`data-topic="${after}"`));
      const next = list[list.findIndex((t) => t.id === after) + 1];
      if (next) expect(html.indexOf('class="tqs"')).toBeLessThan(html.indexOf(`data-topic="${next.id}"`));
    }
  });
  it('the one open question carries the tag that says where its AI is', () => {
    const html = topicGrid({ name: '', topics: list, topicOpen: 'plans', aiTag: S.aiTag.net });
    expect(count(html, 'class="tag net"')).toBe(1);
    expect(html).toContain('<span class="tag net" id="ai-tag">needs internet</span>');
  });
});

describe("simple view: the person's screens", () => {
  it('the choices: "Point to your answer" and the question on top, no category word, one tile per choice, the way out last', async () => {
    const c = await make('Do you want coffee or tea?');
    expect(c.topic).toBe('drink');
    const html = personSimple(person({ card: c }));
    expect(html.indexOf('Point to your answer')).toBeLessThan(html.indexOf('Do you want coffee or tea?'));
    expect(html.indexOf('Do you want coffee or tea?')).toBeLessThan(html.indexOf('class="pt'));
    // the category word ("drink") is nowhere on the person's screen
    expect(text(html).split(' ')).not.toContain('drink');
    expect(html).not.toContain('class="headline"');
    expect([...html.matchAll(/class="pt[^"]*" data-i="(\d)"/g)].map((m) => m[1])).toEqual(['0', '1', '2']);
    expect(html).toMatch(/class="pt esc[^"]*" data-i="2">[\s\S]*something else/);
    // the word stands under its picture, inside the same tile
    expect(html).toMatch(/data-i="0"><svg data-pic="coffee"><\/svg><span>coffee<\/span>/);
  });
  it('nothing but the choices looks tappable: the only other control is the carer\'s labelled press-and-hold', async () => {
    const html = personSimple(person({ card: await make('Do you want coffee or tea?') }));
    expect(count(html, '<button')).toBe(4);
    expect(html).toContain('id="exit" class="hold"');
    expect(text(html)).toContain('Carer: hold here to go back');
    expect(html).not.toMatch(/data-act=|href=/);
    // the preview on the carer's screen has no such control
    expect(personSimple(person({ card: await make('Do you want coffee or tea?'), full: false }))).not.toContain('id="exit"');
  });
  it('at most three choices and the way out on a card; the needs board is the one grid', async () => {
    for (const q of ['Would you like water, juice or milk?', 'How bad is the pain?', 'Are you too hot or too cold?', 'How are you feeling today?', 'Are you hungry?']) {
      const html = personSimple(person({ card: await make(q) }));
      expect(count(html, 'class="pt'), q).toBeLessThanOrEqual(4);
      expect(html, q).toContain('<div class="p-tiles">');
    }
    const board = personSimple(person({ card: needsCard() }));
    expect(board).toContain('<div class="p-tiles board">');
    expect(count(board, 'class="pt')).toBe(9);
    expect(text(board)).toContain('Point to your answer What do you need?');
  });
  it('the check: "So: tea. Right?", the picture with its word, then "Yes" and "No, something else"', async () => {
    const c = await make('Do you want coffee or tea?');
    const html = personSimple(person({ card: c, picked: c.choices[1] }));
    expect(html).toContain('id="p-so">So: tea. Right?</p>');
    expect(html).toMatch(/class="p-pick"><svg data-pic="tea"><\/svg><p class="p-big">tea<\/p>/);
    expect(html).toMatch(/data-confirm="yes">[\s\S]*<span>Yes<\/span>/);
    expect(html).toContain('data-confirm="change"><span>No, something else</span>');
    expect(html.indexOf('data-confirm="yes"')).toBeLessThan(html.indexOf('data-confirm="change"'));
    expect(text(html)).not.toMatch(/\bchange\b/);
  });
  it('the finish: "Thank you. Tea." and one button, "Give the computer back"; no press-and-hold as the only way out', async () => {
    const c = await make('Do you want coffee or tea?');
    const html = personSimple(person({ card: c, picked: c.choices[1], confirmed: true }));
    expect(text(html)).toBe('Thank you. Tea. Give the computer back');
    expect(html).toContain('class="p-give" data-act="give-back">Give the computer back</button>');
    expect(count(html, '<button')).toBe(1);
    expect(html).not.toContain('id="exit"');
    // the preview shows the same finish without the button
    expect(personSimple(person({ card: c, picked: c.choices[1], confirmed: true, full: false }))).not.toContain('p-give');
  });
  it('"Hide the choices": only the question; nothing to point to yet: the waiting picture', async () => {
    const c = await make('Do you want coffee or tea?');
    expect(text(personSimple(person({ card: c, less: true })))).toBe('Carer: hold here to go back Do you want coffee or tea?');
    expect(personSimple(person({}))).toContain('data-pic="listen"');
  });
  it('a number scale named in the question stays one line of numbers with its ends named', async () => {
    const html = personSimple(person({ card: await make('How bad is the pain, from 0 to 10?') }));
    expect(html).toContain('class="p-tiles scale"');
    expect(html).toContain(COPY.scale.high);
  });
  it('going over the answers: the list, then Yes / No; an answer whose card had no title shows alone', () => {
    const html = personSimple(person({ recap: true, answers: [{ topic: 'drink', label: 'tea' }, { topic: '', label: 'rest' }] }));
    expect(html).toContain('<li><span>drink</span><b>tea</b></li><li><b>rest</b></li>');
    expect(html).toContain('data-confirm="recap-yes"');
    expect(html).toContain('data-confirm="recap-change"><span>No</span>');
  });
  it('the "we\'re stuck" ways are five rows in one column', () => {
    const html = personSimple(person({ card: repairCard(PROFILE) }));
    expect(html).toContain('<div class="p-tiles ways">');
    expect(count(html, 'class="pt')).toBe(5);
  });
});

describe("simple view: the carer's screen before handing over", () => {
  it('1 "Say it out loud" with the line, 2 "Turn the computer to <name>", the main button, then what they will see', async () => {
    const c = await make('Do you want coffee or tea?');
    const html = cardScreen(cardModel(c));
    expect(html).toContain(`<span class="num">1</span>${S.step1}`);
    expect(html).toContain('<span class="num">2</span>Turn the computer to Alan');
    expect(html).toContain(c.say);
    expect(html).toContain('class="btn primary" data-act="show">Show Alan the choices</button>');
    expect(html).toContain('What Alan will see:');
    expect(html).toContain('id="person" class="person mini pv"');
    expect(html.indexOf(S.step1)).toBeLessThan(html.indexOf('data-act="show"'));
    expect(html.indexOf('data-act="show"')).toBeLessThan(html.indexOf('id="person"'));
  });
  it('the visible line "Wait. Count to ten. Don\'t answer for <name>." stands on the screen, right under the main button', async () => {
    const html = cardScreen(cardModel(await make('Do you want coffee or tea?')));
    expect(html).toContain('id="wait-line"');
    expect(text(html)).toContain("Wait. Count to ten. Don't answer for Alan.");
    expect(html.indexOf('data-act="show"')).toBeLessThan(html.indexOf('id="wait-line"'));
    expect(html.indexOf('id="wait-line"')).toBeLessThan(html.indexOf('id="person"'));
    expect(text(cardScreen(cardModel(await make('Do you want coffee or tea?'), { name: '' })))).toContain("Don't answer for them.");
  });
  it('at most two short lines of advice under the main button: the "wait" line and one tip; the rest is behind "More tips"', async () => {
    const c = await make('Do you want coffee or tea?');
    const closed = cardScreen(cardModel(c));
    const go = closed.slice(closed.indexOf('<button type="button" class="btn primary" data-act="show"'), closed.indexOf('<div class="c-card"'));
    expect(text(go)).toBe(`Show Alan the choices Wait. Count to ten. Don't answer for Alan. ${S.tip} ${S.tipsMore}`);
    expect(S.tip.length).toBeLessThanOrEqual(40);
    expect(closed).toContain('id="more-tips" data-act="tips" aria-expanded="false"');
    expect(closed).not.toContain('id="tips"');
    expect(text(closed)).not.toContain('Give the computer back');
    // how to come back, the weak hand and "Hide the choices" are one tap away
    const t = text(cardScreen(cardModel(c, { tips: true })));
    expect(t).toContain('"Give the computer back"');
    expect(t).toContain('"Carer: hold here to go back"');
    expect(t).toContain(S.tipWeak);
    expect(t).toContain(S.lessHint('Alan'));
    expect(t).toContain(S.tipsLess);
  });
  it('Back and Home stand at the top of the screen', async () => {
    const html = cardScreen(cardModel(await make('Do you want coffee or tea?')));
    expect(html).toContain('class="navbtn navback" data-act="back"');
    expect(html).toContain('class="navbtn navhome" data-act="home"');
    expect(text(html.slice(0, html.indexOf('</header>')))).toBe('Back Talk Partner Home');
  });
  it('"We\'re stuck" and "Hide the choices" are on this screen, before any answer', async () => {
    const html = cardScreen(cardModel(await make('Do you want coffee or tea?')));
    expect(html).toContain(`data-act="stuck">${COPY.card.stuck.replace(/'/g, '&#39;')}</button>`);
    expect(html).toContain('data-act="less"');
  });
  it('where the choices were made is on the screen itself, not only behind the link', async () => {
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
  it('a narrowing card says in plain words that an AI made this follow-up, and where', async () => {
    const c: Card = { ...(await make('Do you want coffee or tea?')), source: 'in-cloud', narrow: { level: 1, rejected: ['coffee', 'tea'] } };
    const html = cardScreen(cardModel(c));
    expect(html).toContain('id="ai-made"');
    expect(text(html)).toContain('AI suggested these next choices with online help, because none of the first ones fitted (step 1 of 2).');
    expect(text(cardScreen(cardModel({ ...c, source: 'on-device', narrow: { level: 2, rejected: [] } })))).toContain('AI suggested these next choices on this computer, because none of the first ones fitted (step 2 of 2).');
    expect(cardScreen(cardModel(await make('Do you want coffee or tea?')))).not.toContain('id="ai-made"');
  });
  it('the repair card keeps the way back to the choices', () => {
    const html = cardScreen(cardModel(repairCard(PROFILE)));
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
  it('the same question with no connection: a clear "needs the internet" state, and no offer that could not work', async () => {
    const c = await makeCard('What do you want to do this weekend?', { profile: PROFILE, support: 'more', engine: Object.assign(new NullEngine(), { cloudConfigured: true }), allowCloud: false, deviceReady: false });
    const html = cardScreen(cardModel(c, { canAskOnline: true, offline: true }));
    expect(html).toContain('id="offline"');
    expect(text(html)).toContain('This question needs the internet, and you are offline. The topic questions and "Needs it now?" work without it.');
    expect(html).not.toContain('data-act="sheet"');
    expect(html).toContain(COPY.card.justAsk);
  });
  it('a memory question: the line to say instead, nothing to show', async () => {
    const c = await make('What year did we get married?');
    const html = cardScreen(cardModel(c));
    expect(c.kind).toBe('no-quiz');
    expect(html).toContain(COPY.memory.line);
    expect(html).not.toContain('data-act="show"');
  });
});

describe('simple view: after an answer', () => {
  const made = { maker: 'code' as const, left: 'nothing' as const, spoken: false, lines: [S.made.code, S.left.nothing] };
  const model = (over: Partial<AnsweredModel> = {}): AnsweredModel => ({
    name: 'Alan', label: 'tea', question: 'Do you want coffee or tea?', more: false, end: '', out: false, afterHtml: '', next: null, follow: [], tryNext: null, who: false, invite: false, narrow: null, narrowLast: false, short: null,
    hasAnswers: true, today: [{ q: 'Do you want coffee or tea?', label: 'tea' }], made, privacy: [S.privacy.none], ...over,
  });
  const html = answeredScreen(model());
  it('the question with its answer under it, big: a choice ("Do you want coffee or tea?" then "Tea")', () => {
    expect(html).toContain('<span class="asked" id="chose-q">Do you want coffee or tea?</span><b id="chose-a">Tea</b>');
    expect(text(html)).not.toContain('said yes to');
  });
  it('the question with its answer under it, big: a yes / no ("Are you tired?" then "Yes"), never "said yes to: yes"', () => {
    const h = answeredScreen(model({ question: 'Are you tired?', label: 'yes' }));
    expect(h).toContain('<span class="asked" id="chose-q">Are you tired?</span><b id="chose-a">Yes</b>');
    expect(text(h)).not.toMatch(/yes to|chose/i);
    expect(answeredScreen(model({ question: 'Are you tired?', label: 'not sure', out: true }))).toContain('<b id="chose-a">Not sure</b>');
    // the quick-needs board has no question: the need they pointed to
    expect(text(answeredScreen(model({ question: '', label: 'toilet' })))).toContain('Alan pointed to: Toilet');
    expect(text(answeredScreen(model({ question: '', label: 'toilet', name: '' })))).toContain('They pointed to: Toilet');
  });
  it('little on the screen: the answer, "Ask another question" as the main button, one line on what left, and "More"', () => {
    expect(html).toContain(`class="btn primary" id="another" data-act="new">${S.another}</button>`);
    expect(count(html, 'class="btn primary"')).toBe(1);
    expect(html.indexOf('id="chose"')).toBeLessThan(html.indexOf('data-act="new"'));
    expect(text(html)).toBe(`Back Talk Partner Home Do you want coffee or tea? Tea ${S.another} ${S.left.nothing} ${S.more}`);
    expect(html).toContain('id="more" data-act="more" aria-expanded="false"');
    for (const gone of ['id="made-where"', 'id="today-short"', 'id="s-privacy"', 'data-act="recap"', 'data-act="inside-card"']) expect(html).not.toContain(gone);
  });
  it('"More" holds the rest: the other buttons, today, where the answers are kept and where the choices were made', () => {
    const open = answeredScreen(model({ more: true }));
    for (const act of ['needs', 'recap', 'stuck', 'inside-card']) expect(open).toContain(`data-act="${act}"`);
    expect(open).toContain(S.today);
    expect(open).toContain(S.privacy.answers);
    expect(open).toContain('id="made-where"');
    expect(open).toContain(`aria-expanded="true" aria-controls="more-body">${S.less}</button>`);
  });
  it('what left for this card is never behind "More": a card that went to online help says so on the screen', () => {
    const sent = answeredScreen(model({ made: { maker: 'cloud', left: 'sent', spoken: false, lines: [S.made.cloud, S.left.sent('About Alan')] } }));
    expect(sent).toContain('id="left-line" data-left="sent"');
    expect(text(sent)).toContain('Sent to Google: your question');
  });
  it('the end of a path: one line that says what to do now, above "Ask another question"', () => {
    const h = answeredScreen(model({ question: 'Would you like something sweet or something savoury?', label: 'something sweet', end: 'Bring Alan a sweet snack.' }));
    expect(h).toContain('id="do-now"');
    expect(text(h)).toContain('Something sweet Now: Bring Alan a sweet snack. Ask another question');
    expect(html).not.toContain('id="do-now"');
  });
  it('the tree leads: the next question is the main button ("Next: …"), "Ask something else" stands under it, and the end line waits', () => {
    const h = answeredScreen(model({ question: 'Are you hungry?', label: 'yes', follow: ['Would you like a snack or a meal?'], end: 'Bring Alan something to eat.' }));
    expect(h).toContain('class="btn primary ask-next" id="next-q" data-q="Would you like a snack or a meal?" data-next="1"');
    expect(text(h)).toContain('Yes Next: Would you like a snack or a meal? Ask something else');
    expect(count(h, 'class="btn primary')).toBe(1);
    expect(h).toContain(`class="btn" id="another" data-act="new">${S.anotherElse}</button>`);
    expect(h).not.toContain('id="do-now"');
    // a second next question is offered under the main one
    const two = answeredScreen(model({ question: 'Are you comfortable?', label: 'no', follow: ['Are you in pain?', 'Are you too hot or too cold?'] }));
    expect(two).toContain('id="follow"');
    expect(two).toContain('class="btn ask-next" data-next="1" data-q="Are you too hot or too cold?">Are you too hot or too cold?</button>');
    expect(two.indexOf('id="next-q"')).toBeLessThan(two.indexOf('id="follow"'));
    expect(two.indexOf('id="follow"')).toBeLessThan(two.indexOf('id="another"'));
  });
  it('a question that was two in one: the second question is the main button, "Ask another question" stays', () => {
    const two = answeredScreen(model({ next: { act: 'next', label: COPY.card.nextSecond } }));
    expect(two).toContain(`class="btn primary" data-act="next">${COPY.card.nextSecond}</button>`);
    expect(two).toContain(`class="btn" id="another" data-act="new">${S.another}</button>`);
  });
  it('About them is offered here, after the first card, with "Ask another question" above it and never as the main button', () => {
    const h = answeredScreen(model({ invite: true, name: '' }));
    expect(h).toContain('id="invite"');
    expect(text(h)).toContain("Want their family's names on the questions?");
    expect(h).toContain(`<a class="btn" href="#/about">${S.invite.add}</a>`);
    expect(h).toContain('data-act="invite-later"');
    expect(h.indexOf('data-act="new"')).toBeLessThan(h.indexOf('id="invite"'));
    expect(count(h, 'class="btn primary"')).toBe(1);
    expect(text(answeredScreen(model({ invite: true, name: 'Rosa' })))).toContain("Want Rosa's family's names on the questions?");
    expect(html).not.toContain('id="invite"');
  });
  it('after "something else": what to do now, never a dead end', () => {
    const h = answeredScreen(model({ label: 'something else', out: true, tryNext: 'Would you like some more?' }));
    expect(text(h)).toContain('Do you want coffee or tea? Something else');
    expect(h).toContain('id="after-out"');
    expect(text(h)).toContain(S.out.show);
    expect(h).toContain('data-q="Would you like some more?">Try: Would you like some more?</button>');
    for (const act of ['needs', 'own', 'stuck', 'new']) expect(h).toContain(`data-act="${act}"`);
    expect(count(h, 'data-act="stuck"')).toBe(1);
    expect(text(answeredScreen(model({ label: 'not sure', out: true })))).toContain(S.out.notSure);
  });
  it('after "something else" an AI can narrow it down: the button, and where that AI runs, in plain words', () => {
    const cloud = answeredScreen(model({ label: 'something else', out: true, narrow: 'cloudOn' }));
    expect(cloud).toContain('id="narrow" data-act="narrow"');
    expect(text(cloud)).toContain('Narrow it down: AI suggests the next choices');
    expect(text(cloud)).toContain(S.narrow.cloudOn);
    expect(cloud.indexOf('id="narrow"')).toBeLessThan(cloud.indexOf(S.out.show));
    expect(text(answeredScreen(model({ label: 'something else', out: true, narrow: 'device' })))).toContain('Nothing is sent.');
    expect(text(answeredScreen(model({ label: 'something else', out: true, narrow: 'ask' })))).toContain('the app asks you first');
    const off = answeredScreen(model({ label: 'something else', out: true, narrow: 'offline' }));
    expect(off).toMatch(/id="narrow" data-act="narrow" disabled/);
    // after the second step it is no longer offered, and the screen says so
    const last = answeredScreen(model({ label: 'something else', out: true, narrow: null, narrowLast: true }));
    expect(last).not.toContain('id="narrow"');
    expect(text(last)).toContain(S.narrow.last);
    expect(text(last)).toContain(S.out.show);
  });
  it('"call someone" with nobody in About them: a field for one name', () => {
    const h = answeredScreen(model({ label: 'yes', who: true }));
    expect(h).toContain('<form id="who"');
    expect(h).toContain('id="who-name"');
    expect(html).not.toContain('id="who"');
  });
  it('"Today in short": the sentences, who wrote them, a Copy button', () => {
    const h = answeredScreen(model({ more: true, short: { sentences: ['Alan answered 2 questions today.', 'What they chose: tea.'], source: 'rules', busy: false, copied: false } }));
    expect(h).toContain('id="today-short" data-source="rules"');
    expect(text(h)).toContain('Today in short Alan answered 2 questions today. What they chose: tea.');
    expect(text(h)).toContain(S.short.rules);
    expect(h).toContain(`data-act="copy-short" aria-live="polite">${S.short.copy}</button>`);
    const dev = shortBlock({ sentences: ['a.', 'b.'], source: 'on-device', busy: false, copied: true });
    expect(dev).toContain('data-source="on-device"');
    expect(text(dev)).toContain(S.short.device);
    expect(dev).toContain(`>${S.short.copied}</button>`);
    expect(text(shortBlock({ sentences: ['a.'], source: 'rules', busy: true, copied: false }))).toContain(S.short.busy);
    expect(shortBlock(null)).toBe('');
    expect(html).not.toContain('id="today-short"');
  });
  it('it is on the "Go over the answers" screen too', async () => {
    const c = await make('Do you want coffee or tea?');
    const short = { sentences: ['x.', 'y.'], source: 'rules' as const, busy: false, copied: false };
    expect(cardScreen(cardModel(c, { recap: true, short }))).toContain('id="today-short"');
    expect(cardScreen(cardModel(c, { short }))).not.toContain('id="today-short"');
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
    expect(html).toContain('<h1>About them</h1>');
  });
});
