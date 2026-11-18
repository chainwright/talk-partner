// The privacy boundary of phase 3 (the diary, health notes, insights, the tip, the guard, the copy in a file).
// Pinned here, from the source and by running it:
//   - no file that builds a prompt or a request for a model imports the diary, the health notes, the guard, the tip
//     or the backup; the health notes are not part of the profile the prompts read;
//   - the one text of phase 3 that may reach online help is made by `insightCloudText` from the rules' own lines, and
//     holds no name, no photo, no health note and no diary entry, whatever the family typed;
//   - that cloud step runs only from the "yes" of a sheet that showed the same text, every time; nothing else in the
//     page calls it, and the yes does not turn online help on for anything else;
//   - the on-device wording step throws on any source but the device; no new model, library or network call came in.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { answerEntry, logEntry } from '../../core/diary';
import { cloudLines, insightCloudText, insights, type HealthNotes } from '../../core/insights';
import { rewordRequest } from '../../core/reword';
import { EMPTY_PROFILE } from '../../core/types';
import { insightSheet } from '../../web/src/diary';
import { NOW, WEEK, weekDiary, when } from './week';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const imports = (f: string) => [...read(f).matchAll(/^import [^;]*? from '([^']+)';$/gms)].map((m) => m[1]);
const PHASE3 = ['diary', 'insights', 'reliability', 'tip', 'backup'];

describe('what builds a prompt or a request does not know the diary or the health notes', () => {
  const builders = ['core/prompt.ts', 'core/requests.ts', 'core/strip.ts', 'core/pipeline.ts', 'core/narrow.ts', 'core/summary.ts', 'core/reword.ts', 'core/engine.ts', 'core/rules.ts', 'core/kinds.ts', 'web/src/ai/firebaseEngine.ts', 'web/src/ai/app.ts', 'web/src/ai/remoteConfig.ts', 'web/src/voice.ts', 'web/src/mic.ts'];
  it.each(builders)('%s imports none of them', (f) => {
    for (const i of imports(f)) expect(PHASE3.some((m) => i.endsWith(`/${m}`)), `${f} imports ${i}`).toBe(false);
  });
  it('the wording module takes lines of text and nothing else: it imports the model name and the engine type only', () => {
    expect(imports('core/reword.ts').sort()).toEqual(['./engine', './models']);
  });
  it('the diary, the guard and the backup reach no engine and no network', () => {
    for (const f of ['core/diary.ts', 'core/reliability.ts', 'core/backup.ts', 'core/tip.ts', 'core/insights.ts']) {
      expect(read(f)).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|engine\.|firebase/);
      for (const i of imports(f)) expect(i).not.toMatch(/engine|requests|prompt|pipeline|strip$/);
    }
  });
  it('health notes are not a field of the profile (the on-device card prompt and the name swap read the profile)', () => {
    expect(Object.keys(EMPTY_PROFILE).sort()).toEqual(['foods', 'music', 'other', 'partnerName', 'people', 'personName', 'places', 'tv']);
    expect(read('core/types.ts')).not.toMatch(/health|diabetes|diary/i);
    expect(read('core/prompt.ts')).not.toMatch(/health|diabetes|diary/i);
  });
});

describe('the one text that may go to online help', () => {
  const nasty: HealthNotes = { text: 'Frank Miller, born 1958, takes metformin 500 mg. Call Dr Patel 555-0100.', diabetes: true, swallowing: true, fluidLimit: true, reminders: true, emergency: '999' };
  const diary = [...weekDiary(), answerEntry({ q: 'Would you like to call Tom?', label: 'yes', at: when(1, '11:00') }, 'people'), answerEntry({ q: 'Would you like Aunt Zelda\'s fudge cake or porridge?', label: "Aunt Zelda's fudge cake", at: when(1, '15:00') }, 'food'), logEntry('pain', when(0, '09:00')), logEntry('pain', when(2, '09:00'))];
  it('holds no name, no health note and no diary entry, whatever the family typed', () => {
    for (const h of [WEEK.health, nasty]) for (const span of ['week', 'month'] as const) {
      const text = insightCloudText(insights(diary, h, span, NOW));
      for (const w of ['Frank', 'Miller', 'Carol', 'Beth', 'Tom', 'Zelda', 'fudge', 'porridge', 'ginger', 'Patel', 'metformin', '555', '1958', 'diabetes', 'Diabetes', 'swallow', 'Swallow', 'fluid limit', 'Reminders', 'noted here', 'data:image']) expect(text, `${w} in: ${text}`).not.toContain(w);
      // every line of it is a line of the rules, word for word
      const own = insights(diary, h, span, NOW).map((l) => l.text);
      for (const line of text.split('\n')) expect(own).toContain(line.replace(/^\d+\. /, ''));
    }
  });
  it('the request is that text, the fixed instructions and the answer format: nothing else', () => {
    const text = insightCloudText(insights(diary, nasty, 'week', NOW));
    const body = JSON.stringify(rewordRequest(text));
    for (const w of ['Frank', 'Patel', 'metformin', 'Zelda', 'swallow', 'fluid limit']) expect(body).not.toContain(w);
    expect(Object.keys(rewordRequest(text)).sort()).toEqual(['contents', 'generationConfig', 'mode', 'model', 'systemInstruction']);
  });
  it('the sheet shows that exact text, and the whole request, above the two buttons', () => {
    const lines = insights(weekDiary(), WEEK.health, 'week', NOW);
    const text = insightCloudText(lines);
    const html = insightSheet({ text, request: JSON.stringify(rewordRequest(text), null, 2) });
    const shown = html.slice(html.indexOf('id="ins-sheet-text">') + 20, html.indexOf('</pre>')).replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    expect(shown).toBe(text);
    expect(html.indexOf('ins-sheet-text')).toBeLessThan(html.indexOf('data-act="ins-yes"'));
    expect(html).toContain(COPY.simple.insights.sheet.never);
    expect(COPY.simple.insights.sheet.never).toMatch(/names, photos, the diary itself, the health notes/);
    expect(html).toContain('PREFER_IN_CLOUD');
    expect(cloudLines(lines).length).toBe(2); // (phase 5: the "less sure" line has a fixed sentence and does not go)
  });
});

describe('the cloud wording step runs only from the yes on that sheet', () => {
  const main = read('web/src/main.ts');
  it('one call site in the page, inside sendInsights, with the sheet\'s own text', () => {
    const calls = [...main.matchAll(/\.rewordCloud\(([^)]*)\)/g)].map((m) => m[1]);
    expect(calls).toEqual(['sheet.text']);
    const fn = main.slice(main.indexOf('async function sendInsights()'), main.indexOf('async function sendInsights()') + 600);
    expect(fn).toMatch(/const sheet = state\.insSheet;\s+if \(!sheet \|\| !state\.engine\.rewordCloud\) return;/);
    expect([...main.matchAll(/sendInsights\(\)/g)].length).toBe(2); // the function, and the 'ins-yes' action
    expect(main).toMatch(/case 'ins-yes': void sendInsights\(\); break;/);
  });
  it('the sheet\'s text is only ever made by insightCloudText', () => {
    const sets = [...main.matchAll(/state\.insSheet = (\{[^;]*\}|null);/g)].map((m) => m[1]).filter((x) => x !== 'null');
    expect(sets.length).toBe(1);
    expect(sets[0]).toMatch(/^\{ key: insKey\(state\.diaryTab, lines\), text, request: JSON\.stringify\(state\.engine\.rewordRequest\(text\), null, 2\), sources \}$/);
    expect(main).toMatch(/const text = insightCloudText\(lines\);\s+state\.insSheet = /);
  });
  it('the yes is for these lines, once: it does not turn online help on', () => {
    const fn = main.slice(main.indexOf('async function sendInsights()'), main.indexOf('// ---------------------------------------------------------------- what was learned'));
    expect(fn).not.toMatch(/cloudHelp\s*=/);
    expect(fn).toMatch(/state\.insSheet = null;/);
  });
  it('the health notes and the diary are handed to an on-device step only', () => {
    expect([...main.matchAll(/insightDevicePrompt\(/g)].length).toBe(1);
    expect(main).toMatch(/rewordOnDevice\(lines\.map\(\(l\) => l\.text\), insightDevicePrompt\(lines, state\.health\), state\.engine, true\)/);
    // state.health and state.diary appear in no call of a cloud step, a card prompt or the voice step
    for (const m of main.matchAll(/(?:runCloud|rewordCloud|transcribe|makeCard|narrowCard|runDevice|summarizeDevice)\(([^;]*);/g)) expect(m[1]).not.toMatch(/state\.(?:health|diary)\b/);
  });
});

describe('the engine', () => {
  const eng = read('web/src/ai/firebaseEngine.ts');
  it('the on-device wording step is ONLY_ON_DEVICE on the app with no App Check, and throws on any other source', () => {
    const step = eng.slice(eng.indexOf('async rewordDevice('), eng.indexOf('rewordRequest(text: string) {'));
    expect(step).toContain('mode: InferenceMode.ONLY_ON_DEVICE');
    expect(step).toContain('this.local');
    expect(step).not.toMatch(/inCloudParams|PREFER_|this\.ai\b/);
    expect(step).toMatch(/inferenceSource !== InferenceSource\.ON_DEVICE\) throw/);
  });
  it('the cloud wording step goes through Firebase AI Logic on the app with App Check, and reports where it ran', () => {
    const step = eng.slice(eng.indexOf('async rewordCloud('), eng.indexOf('/**\n * Lazy wrapper'));
    expect(step).toContain('mode: InferenceMode.PREFER_IN_CLOUD');
    expect(step).toContain('this.ai');
    expect(step).toContain('REWORD_SYSTEM_PROMPT');
    expect(step).toMatch(/generateContent\(text\)/);
    expect(step).toMatch(/inferenceSource === InferenceSource\.ON_DEVICE \? 'on-device' : 'in-cloud'/);
  });
  it('no other model, library or speech API came in with phase 3', () => {
    const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies)).toEqual(['firebase']);
    const src = [...readdirSync(join(ROOT, 'core')).map((f) => `core/${f}`), ...readdirSync(join(ROOT, 'web/src')).filter((f) => f.endsWith('.ts')).map((f) => `web/src/${f}`)].map(read).join('\n');
    expect(src).not.toMatch(/mediapipe|tensorflow|onnxruntime|transformers\.js|SpeechRecognition|speechSynthesis|webkitSpeech/i);
  });
});
