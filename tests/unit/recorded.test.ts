// Judge mode in a browser that cannot run the on-device step shows a recording of what that step made on our machine
// (core/recorded.ts; web/src/main.ts, `recordedBlock`). That is only honest if (1) every value of the recording is in
// the saved run log it names, (2) the screen calls it a recording, with the date, the commit and the SDK's report,
// (3) showing it makes no card, calls no engine and changes no setting, and (4) cloud help still needs the consent
// screen. Pinned here. Written 17 Nov 2026.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { RECORDED_STEP as D } from '../../core/recorded';
import { SAMPLE_PROFILE, SAMPLE_STEP } from '../../core/sample';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const log = read(D.log);
const main = read('web/src/main.ts');
const block = main.split('function recordedCan(): boolean {')[1]?.split('\nfunction badge(')[0] ?? '';

describe('the recording of the on-device step: every value is in the saved run log', () => {
  // the log's entry for the question, asked by a click with cloud help off (section 2)
  const entry = log.split(`**Asked:** "${D.question}"`)[1]?.split('**Asked:**')[0] ?? '';
  it('the log exists, is the run of the named commit and date, in the named browser', () => {
    expect(log).toMatch(/^# On-device proof run/);
    expect(log).toContain(`- commit: \`${D.commit}`);
    expect(log).toMatch(/- date: 2026-11-17T/);
    expect(D.date).toBe('17 Nov 2026 (UTC)');
    expect(log).toContain(`Chrome/${D.browser.replace('Chrome ', '')}.`);
    expect(log).toMatch(/working tree clean/);
  });
  it('the question is judge mode\'s first open question, and the log has a card for it made with cloud help off', () => {
    expect(D.question).toBe(SAMPLE_STEP);
    expect(entry.length).toBeGreaterThan(100);
    expect(log.indexOf('## 2. Cloud help OFF')).toBeLessThan(log.indexOf(`**Asked:** "${D.question}"`));
  });
  it('badge line, tiles and the SDK console line are the log\'s, word for word', () => {
    expect(entry).toContain(`- badge line: ${D.badge} · ${D.tail}`);
    expect(entry).toContain(`- tiles on the person's card: ${D.tiles.join(' / ')}`);
    expect(entry).toContain(`- SDK report (console): \`${D.sdk}\``);
    expect(entry).toContain('- requests to hosts other than localhost:5179: none');
    expect(D.sdk).toContain(`inferenceSource=${D.inferenceSource}`);
    expect(D.sdk).toContain('mode=ONLY_ON_DEVICE');
  });
  it('the cloud card it is compared with is the same question in section 5 of the same log', () => {
    const cloud = log.split('## 5.')[1]?.split(`**Asked:** "${D.question}"`)[1]?.split('**Asked:**')[0] ?? '';
    expect(cloud).toContain(`- tiles on the person's card: ${D.cloudTiles.join(' / ')}`);
    expect(cloud).toContain('Cloud help (question only)');
  });
  it('the recorded choices are entries of the sample family\'s About me', () => {
    const places = SAMPLE_PROFILE.places.map((p) => p.replace(/^the /, ''));
    for (const t of D.tiles.slice(0, -1)) expect(places).toContain(t);
    for (const t of D.cloudTiles.slice(0, -1)) expect(places).not.toContain(t);
  });
});

describe('the recording on screen: labelled, shown only where the step cannot run, and it does nothing', () => {
  const R = COPY.judge.recorded;
  it('the link and the label say what it is', () => {
    expect(R.link).toBe('See what the on-device step makes →');
    expect(R.tag).toBe('Recording');
    const label = R.label(D.date, D.commit, D.browser);
    expect(label).toMatch(/^Recorded on our machine on 17 Nov 2026 \(UTC\), at commit 8ace9f0/);
    expect(label).toContain('Not made in this browser');
    expect(label).toContain('nothing was sent');
    expect(R.sdk(D.inferenceSource)).toContain('inferenceSource=on_device');
  });
  it('it is drawn in judge mode only, and only when this browser cannot run the on-device step', () => {
    expect(block).toContain('if (!state.demo) return false;');
    expect(block).toContain("return !cfg || state.device === 'downloadable' || state.device === 'downloading' || (state.device === 'unavailable' && deviceFinal);");
    // closed until the link is clicked: the link stands alone, the recording only once it was asked for
    expect(block).toContain('return recordedCan() && !state.recorded ? ` <button class="link" data-act="recorded">${C.judge.recorded.link}</button>` : \'\';');
    expect(block).toContain("if (!recordedCan() || !state.recorded) return '';");
    // tag, label, badge marked as a recording, the SDK line
    for (const piece of ['${R.tag}', 'R.label(D.date, D.commit, D.browser)', 'class="badge device rec"', 'R.sdk(D.inferenceSource)', 'esc(D.sdk)']) expect(block).toContain(piece);
  });
  it('showing it makes no card, calls no engine and changes no setting', () => {
    expect(block).not.toMatch(/makeCard|state\.engine\.(?:run|prepare|warm)|state\.made|setCard|saveSettings|cloudHelp\s*=[^=]/);
    const act = main.split("case 'recorded':")[1]?.split('\n')[0] ?? '';
    expect(act).toContain('state.recorded = !state.recorded; patchRecorded();');
    expect(act).not.toMatch(/makeCard|make\(|engine|cloudHelp|saveSettings|render\(/);
  });
  it('cloud help is turned on in two places only, each a press after reading what is sent: the consent screen with the box ticked, and "Yes" on the simple view\'s consent sheet', () => {
    const on = main.split('\n').filter((l) => /state\.settings\.cloudHelp = true/.test(l));
    expect(on).toHaveLength(2);
    expect(on.some((l) => l.includes("case 'cloud-on': if (state.consentChecked) {"))).toBe(true);
    // the sheet (17 Nov 2026): its "Yes" is the only other switch, and the sheet is drawn only for a card that holds what would be sent
    const yes = main.split("case 'sheet-yes':")[1]?.split('break;')[0] ?? '';
    expect(yes).toContain('state.settings.cloudHelp = true; saveSettings(); askSettings(); if (state.card?.narrow && state.narrowPending) void runNarrow(state.narrowPending); else void make(state.lastQuestion);');
    expect(main).toContain("if (!state.sheet || !c?.unsentPayload) return screen;");
    // with cloud help off the recording only links to the consent screen
    expect(block).toContain('`${R.cloudOff} <a href="#/cloud">${R.cloudLink}</a>`');
    expect(main).toContain('<button class="primary" data-act="cloud-on" ${state.consentChecked ? \'\' : \'disabled\'}>');
  });
  it('the frame around it is dashed and tagged, so it is not taken for a card made here', () => {
    const css = read('web/src/styles.css');
    expect(css).toMatch(/\.recorded \{[^}]*border: 2px dashed/);
    expect(css).toMatch(/\.badge\.rec \{ border-style: dashed; \}/);
  });
});

// 17 Nov 2026: "How this works" named two of the three badges that come from the card rules (review round 4).
describe('"How this works" names every badge', () => {
  it('the three rule badges and the two AI badges are all in the opening lines, as the badges spell them', () => {
    const intro = COPY.how.intro;
    for (const b of [COPY.badge.code, COPY.badge.codeAsked, COPY.badge.none, COPY.badge.device]) expect(intro).toContain(`"${b}"`);
    expect(intro).toContain('"Cloud help"');
    expect(COPY.badge.cloud.startsWith('Cloud help')).toBe(true);
  });
});

// 17 Nov 2026 (review round 4): judge mode stacked four open panels under every card; they became one summary line
// under every card but the first. Review round 5, the same day: the first card had them open still, a wall of text
// on a phone before anything was asked. Now every card in judge mode has the one closed line, the first included,
// and the receipt is closed under every card.
describe('judge mode: one closed summary line under every card, the first included', () => {
  it('every card folds its panels into #made with the summary line; the receipt is closed', () => {
    expect(main).toContain("? `<details class=\"made\" id=\"made\"><summary>${esc(line)}</summary>${madePanels(c)}</details>`");
    expect(main).not.toContain('state.first ? madePanels(c)');
    expect(main).toContain('const line = c.why ? C.judge.madeLine(c.why.decided, c.why.kept.length, c.why.added.length, c.why.dropped.length) : C.judge.madeLineNoWhy;');
    expect(main).toContain("${state.demo ? receiptPanel(false, false) : ''}");
  });
  it('nothing is removed: the fold holds the same three panels', () => {
    const panels = main.split('function madePanels(c: Card): string {')[1]?.split('\n}')[0] ?? '';
    for (const p of ['whyPanel(c, true)', 'traceList(c.trace)', 'sentPanel(c)']) expect(panels).toContain(p);
  });
  it('the line says who decided and what the rules did, and what a click opens', () => {
    const l = COPY.judge.madeLine('the model proposed; code checked every choice', 2, 0, 1);
    expect(l).toBe('How this card was made: the model proposed; code checked every choice · 2 kept, 0 added, 1 dropped by a rule. Open for why, where each step ran, what was sent.');
    expect(COPY.judge.madeLineNoWhy).toMatch(/^How this card was made\./);
  });
});
