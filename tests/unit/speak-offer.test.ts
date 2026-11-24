// Phase 14 (judge round 10, seat 01 fwd a2 ADV-01-2, rev b ADV-01-1): Read aloud is offered on the carer's screen
// before handing over, as one button right under "Show them the choices", while it is off. The first tap opens the
// sheet that says what goes (unchanged); once the carer said yes there, the same tap turns it on with no sheet. Off by
// default. Never a doctor-visit card, never offline, never the sample family (canSpeak in main.ts).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { partnerActions } from '../../core/actions';
import { P5 } from '../../core/copy5';
import { NullEngine } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { SAMPLE_PROFILE } from '../../core/sample';
import { madeWhere } from '../../core/simple';
import { TTS_STYLE } from '../../core/speak';
import { speakOffer } from '../../web/src/phase5';
import { cardScreen } from '../../web/src/simple';

const ROOT = join(__dirname, '..', '..');
const text = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

describe('Read aloud, offered before handing over', () => {
  it('one button while it is off and the phone is online: who hears it, that Google\'s AI speaks, and in a calm, slow voice', () => {
    const html = speakOffer({ name: 'Frank', on: false, online: true, can: true });
    expect(html).toContain('data-act="speak-ask"');
    expect(html).toContain('id="speak-offer"');
    expect(text(html)).toBe(P5.speak.offer('Frank'));
    expect(P5.speak.offer('Frank')).toBe("Read it aloud to Frank (Google's AI, a calm, slow voice)");
    expect(P5.speak.offer('')).toBe("Read it aloud to them (Google's AI, a calm, slow voice)");
    expect(TTS_STYLE).toBe('calm, slow and clear');
  });
  it('none when it is on already, offline, or for a card that is never read aloud', () => {
    expect(speakOffer({ name: 'Frank', on: true, online: true, can: true })).toBe('');
    expect(speakOffer({ name: 'Frank', on: false, online: false, can: true })).toBe('');
    expect(speakOffer({ name: 'Frank', on: false, online: true, can: false })).toBe('');
  });
  it('on the screen: right under the main button (and under "Find more choices" where that is there)', async () => {
    const c = await makeCard('Would you like tea or coffee?', { profile: SAMPLE_PROFILE, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
    const html = cardScreen({
      name: 'Frank', card: c, less: false, recap: false, recapText: '', recapDone: false, actions: partnerActions(c, { less: false, hasAnswers: false }),
      made: madeWhere(c, { about: 'About Frank' }), personHtml: '', canAskOnline: false, offline: false, lastTime: '',
      findHtml: speakOffer({ name: 'Frank', on: false, online: true, can: true }),
    });
    const acts = [...html.matchAll(/<button[^>]*data-act="([^"]+)"/g)].map((m) => m[1]).filter((a) => a !== 'back' && a !== 'home');
    expect(acts.slice(0, 2)).toEqual(['show', 'speak-ask']);
  });
  it('the first tap opens the sheet; after one yes the tap turns it on; it stays off until then', () => {
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    expect(main).toContain("case 'speak-ask': if (state.settings.speakOk) { state.settings.speak = true; saveSettings(); } else p5.speakSheet = true;");
    expect(main).toContain("settings: { cloudHelp: false, support: 'more', welcomed: false }");
    // the offer is drawn from the same switch state as the old switch, and only where Read aloud can run here at all
    expect(main).toContain('speakOffer({ name, on: speakOn(), online: isOnline(), can: speakable(c) })');
    expect(main).toMatch(/canSpeak\(\) && !c\.blocked && c\.kind !== 'no-quiz' \? speakOffer\(/);
  });
});
