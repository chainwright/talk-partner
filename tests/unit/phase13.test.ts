// Phase 13 (23 Nov 2026), the fixes of judge round 10. Every new or changed line is walked on its worst case: can it
// help a carer wait, play down pain, a stroke sign or distress, or lose a question that is not found out yet? Each item
// has a test that failed before its fix.
import { describe, expect, it } from 'vitest';
import { after, WEAK_NUMB } from '../../core/tree';
import { EMPTY_PROFILE } from '../../core/types';
import { answeredScreen, type AnsweredModel } from '../../web/src/simple';

const card = (asked: string) => ({ asked, kind: 'choice' as const });
const made = { maker: 'code' as const, left: 'nothing' as const, spoken: false, lines: ["Made by the app's rules.", 'Nothing was sent.'] };
const answered = (m: Partial<AnsweredModel>) => answeredScreen({ name: '', label: 'no', question: WEAK_NUMB, more: false, out: false, afterHtml: '', next: null, follow: [], end: '', tryNext: null, narrow: null, narrowLast: false, short: null, who: false, invite: false, hasAnswers: false, today: [], made, privacy: [], ...m } as AnsweredModel);

describe('A1. After a "no" or "not sure" to the weakness question, the check line is a red box ABOVE "Next"', () => {
  for (const label of ['no', 'not sure']) {
    it(`"${label}": the tree marks the end line as an alert, with the arms-and-smile check and the number`, () => {
      const s = after(card(WEAK_NUMB), label, { ...EMPTY_PROFILE, personName: 'Frank' }, [WEAK_NUMB], '999');
      expect(s.alert, label).toBe(true);
      expect(s.end, label).toMatch(/lift both arms and smile/);
      expect(s.end, label).toMatch(/call 999 now/);
      expect(s.end, label).not.toMatch(/the emergency number/);
      // the pain questions still follow
      expect(s.next, label).toEqual(['How bad is the pain?']);
    });
    it(`"${label}": at the depth limit (no next question) it is still an alert`, () => {
      const s = after(card(WEAK_NUMB), label, EMPTY_PROFILE, ['Are you in pain?', 'Where in the arms?', WEAK_NUMB], '911');
      expect(s.next).toEqual([]);
      expect(s.alert).toBe(true);
    });
  }
  it('a "yes" is not this alert (its own call box says call now)', () => {
    expect(after(card(WEAK_NUMB), 'yes', EMPTY_PROFILE, [WEAK_NUMB], '911').alert).toBeFalsy();
  });
  it('an ordinary answer is never an alert', () => {
    expect(after(card('Would you like tea or coffee?'), 'tea', EMPTY_PROFILE, []).alert).toBeFalsy();
  });
  it('the answered screen draws the alert before "Next", and no green tick over it', () => {
    const s = after(card(WEAK_NUMB), 'no', EMPTY_PROFILE, [WEAK_NUMB], '911');
    const html = answered({ follow: s.next, end: s.end, alertHtml: `<div class="urgent now-alert" id="now-alert">${s.end}</div>` });
    const a = html.indexOf('id="now-alert"');
    const n = html.indexOf('id="next-q"');
    expect(a).toBeGreaterThan(-1);
    expect(n).toBeGreaterThan(-1);
    expect(a).toBeLessThan(n);
    expect(html).toContain('lift both arms and smile');
    // the "chose" block is an alert, not a tick
    expect(html).toMatch(/class="chose alert"/);
    // the line is not drawn a second time as the green "Now:" line
    expect(html).not.toContain('id="do-now"');
  });
  it('with no alert, a led screen still hides the end line (unchanged)', () => {
    const html = answered({ label: 'tea', question: 'Would you like tea or coffee?', follow: ['Would you like milk in it?'], end: 'Make the tea the way they like it.' });
    expect(html).not.toContain('id="do-now"');
    expect(html).not.toContain('now-alert');
  });
});
