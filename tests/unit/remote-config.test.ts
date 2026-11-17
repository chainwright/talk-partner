// Firebase Remote Config (16 Nov 2026): the cloud model's name and the two routing thresholds may come from it. What
// has to hold, and is pinned here: the defaults in the code run whenever it is not asked, fails, hangs or sends a
// value this app cannot run on; no card waits for it; it is asked only when cloud help is on; and the module that
// asks it can reach neither a question nor About me. The real service is exercised in scripts/e2e-cloud.mjs.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { CLOUD_TEXT_MODEL, DEFAULT_SETTINGS, REMOTE_KEYS, checkSetting, defaultReport, settingsFrom, type RuntimeSettings } from '../../core/models';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { route } from '../../core/rules';
import type { ModelOutput } from '../../core/types';
import { PROFILE } from './fixtures';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

// a stand-in for the SDK: what the service "answers" is set per test
const sdk = { supported: true, outcome: 'ok' as 'ok' | 'reject' | 'hang', remote: {} as Record<string, string>, fetches: 0, settings: {} as Record<string, number>, defaults: {} as Record<string, string> };
vi.mock('firebase/app', () => ({ getApps: () => [], initializeApp: () => ({ name: '[DEFAULT]' }) }));
vi.mock('firebase/remote-config', () => ({
  isSupported: async () => sdk.supported,
  getRemoteConfig: () => ({ settings: sdk.settings, set defaultConfig(v: Record<string, string>) { sdk.defaults = v; } }),
  fetchAndActivate: () => { sdk.fetches++; return sdk.outcome === 'ok' ? Promise.resolve(true) : sdk.outcome === 'reject' ? Promise.reject(new Error('Failed to fetch')) : new Promise(() => {}); },
  getValue: (_rc: unknown, key: string) => (key in sdk.remote
    ? { getSource: () => 'remote', asString: () => sdk.remote[key] }
    : { getSource: () => 'default', asString: () => sdk.defaults[key] ?? '' }),
}));
const { fetchSettings } = await import('../../web/src/ai/remoteConfig');
const OPTS = { apiKey: 'k', appId: 'a', projectId: 'p' };

beforeEach(() => { sdk.supported = true; sdk.outcome = 'ok'; sdk.remote = {}; sdk.fetches = 0; });

describe('the defaults in the code', () => {
  it('are the model and thresholds the app ran on before Remote Config existed', () => {
    expect(DEFAULT_SETTINGS).toEqual({ cloudTextModel: CLOUD_TEXT_MODEL, routeMoodWords: 2, routeMinChoices: 2 });
    expect(cloudTextRequest('q').model).toBe(CLOUD_TEXT_MODEL);
  });
  it('the template in the repository has exactly the three parameters, with the same defaults', () => {
    const t = JSON.parse(read('remoteconfig.template.json')).parameters as Record<string, { defaultValue: { value: string } }>;
    expect(Object.keys(t).sort()).toEqual(Object.values(REMOTE_KEYS).sort());
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof RuntimeSettings)[]) expect(t[REMOTE_KEYS[k]].defaultValue.value).toBe(String(DEFAULT_SETTINGS[k]));
    expect(JSON.parse(read('firebase.json')).remoteconfig.template).toBe('remoteconfig.template.json');
  });
});

describe('a fetched value is used only when the app can run on it', () => {
  it.each([
    ['cloudTextModel', 'gemini-3.5-flash-lite', 'gemini-3.5-flash-lite'], ['cloudTextModel', ' gemini-4.0-flash ', 'gemini-4.0-flash'],
    ['cloudTextModel', '', null], ['cloudTextModel', 'gpt-4o', null], ['cloudTextModel', 'gemini-3.1-flash-lite-image', null], ['cloudTextModel', 'gemini-x"; drop', null], ['cloudTextModel', 'GEMINI-3.5', null],
    ['routeMoodWords', '1', 1], ['routeMoodWords', '3', 3], ['routeMoodWords', '0', null], ['routeMoodWords', '4', null], ['routeMoodWords', '2.5', null], ['routeMoodWords', 'two', null], ['routeMoodWords', '-1', null],
    ['routeMinChoices', '2', 2], ['routeMinChoices', '3', 3], ['routeMinChoices', '1', null], ['routeMinChoices', '0', null], ['routeMinChoices', '9', null], ['routeMinChoices', '', null],
  ] as [keyof RuntimeSettings, string, string | number | null][])('%s = "%s" -> %s', (key, raw, want) => {
    expect(checkSetting(key, raw)).toBe(want);
  });
  it('a refused value leaves the default in use and is reported as refused, with what was sent', () => {
    const r = settingsFrom({ cloudTextModel: 'not-a-model', routeMoodWords: '3', routeMinChoices: undefined }, 5);
    expect(r.values).toEqual({ cloudTextModel: CLOUD_TEXT_MODEL, routeMoodWords: 3, routeMinChoices: 2 });
    expect(r.sources).toEqual({ cloudTextModel: 'refused', routeMoodWords: 'remote', routeMinChoices: 'default' });
    expect(r.refused).toEqual({ cloudTextModel: 'not-a-model' });
    expect(r.status).toBe('fetched');
  });
});

describe('fetchSettings never throws and never leaves the app without settings', () => {
  it('answered: each value says it came from Remote Config; the SDK was given the in-code defaults and a 5 s timeout', async () => {
    sdk.remote = { cloud_text_model: 'gemini-4.0-flash-lite', route_mood_words: '3', route_min_choices: '3' };
    const r = await fetchSettings(OPTS);
    expect(r.status).toBe('fetched');
    expect(r.values).toEqual({ cloudTextModel: 'gemini-4.0-flash-lite', routeMoodWords: 3, routeMinChoices: 3 });
    expect(Object.values(r.sources)).toEqual(['remote', 'remote', 'remote']);
    expect(sdk.defaults).toEqual({ cloud_text_model: CLOUD_TEXT_MODEL, route_mood_words: '2', route_min_choices: '2' });
    expect(sdk.settings.fetchTimeoutMillis).toBe(5000);
  });
  it('answered, but the template has no such parameters: the defaults, reported as defaults', async () => {
    const r = await fetchSettings(OPTS);
    expect(r.status).toBe('fetched');
    expect(r.values).toEqual(DEFAULT_SETTINGS);
    expect(Object.values(r.sources)).toEqual(['default', 'default', 'default']);
  });
  it('unreachable (offline, blocked): "failed", the reason, the defaults', async () => {
    sdk.outcome = 'reject';
    sdk.remote = { cloud_text_model: 'gemini-4.0-flash-lite' };
    const r = await fetchSettings(OPTS);
    expect(r).toMatchObject({ status: 'failed', error: 'Failed to fetch', values: DEFAULT_SETTINGS });
    expect(Object.values(r.sources)).toEqual(['default', 'default', 'default']);
  });
  it('a browser that cannot keep the values: "failed", the defaults, and no request at all', async () => {
    sdk.supported = false;
    const r = await fetchSettings(OPTS);
    expect(r.status).toBe('failed');
    expect(r.values).toEqual(DEFAULT_SETTINGS);
    expect(sdk.fetches).toBe(0);
  });
  it('a request that never answers ends by itself, with the defaults', async () => {
    vi.useFakeTimers();
    try {
      sdk.outcome = 'hang';
      const p = fetchSettings(OPTS);
      await vi.advanceTimersByTimeAsync(7000);
      const r = await p;
      expect(r.status).toBe('failed');
      expect(r.error).toMatch(/no answer in 5 s/);
      expect(r.values).toEqual(DEFAULT_SETTINGS);
    } finally { vi.useRealTimers(); }
  });
});

describe('the routing thresholds', () => {
  it('with no thresholds given, the rule is the one it always was', () => {
    expect(route('choice', 'What now?', ['good', 'fine'], false).reasons).toEqual(['two or more mood words']);
    expect(route('choice', 'What now?', ['tea'], false).reasons).toEqual(['fewer than two usable choices']);
    expect(route('choice', 'What now?', ['tea', 'cake'], false)).toEqual({ to: 'device', reasons: [] });
  });
  it('the thresholds move it, inside the allowed range', () => {
    expect(route('choice', 'What now?', ['good', 'tea', 'cake'], false, { moodWords: 1, minChoices: 2 }).to).toBe('cloud');
    expect(route('choice', 'What now?', ['good', 'fine', 'tea'], false, { moodWords: 3, minChoices: 2 }).to).toBe('device');
    expect(route('choice', 'What now?', ['tea', 'cake'], false, { moodWords: 2, minChoices: 3 }).reasons).toEqual(['fewer than 3 usable choices']);
  });

  class E implements Engine {
    label = 'e'; modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' }; cloudConfigured = true; cloudCalls = 0;
    constructor(private dev: ModelOutput) {}
    async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
    async prepareDevice() {}
    async runDevice(): Promise<ModelResult> { return { text: JSON.stringify(this.dev), source: 'on-device', ms: 1 }; }
    cloudRequest(q: string) { return cloudTextRequest(q); }
    async runCloud(): Promise<ModelResult> { this.cloudCalls++; return { text: JSON.stringify({ topic: 'x', kind: 'choice', choices: ['a walk', 'a rest'] }), source: 'in-cloud', ms: 1 }; }
    pictureRequest(w: string) { return pictureRequestBody(w); }
    async picture() { return null; }
  }
  const dev: ModelOutput = { topic: 'afternoon', kind: 'choice', choices: ['a film', 'a drive'] };
  it('a card is made the same way when no settings were ever fetched (the pipeline needs none)', async () => {
    const e = new E(dev);
    const c = await makeCard('What shall we do after lunch?', { profile: PROFILE, support: 'more', engine: e, allowCloud: true, deviceReady: true });
    expect(e.cloudCalls).toBe(0);
    expect(c.source).toBe('on-device');
  });
  it('a threshold from Remote Config changes when a card goes for a second opinion, and nothing else', async () => {
    const e = new E(dev);
    const c = await makeCard('What shall we do after lunch?', { profile: PROFILE, support: 'more', engine: e, allowCloud: true, deviceReady: true, routing: { moodWords: 2, minChoices: 3 } });
    expect(e.cloudCalls).toBe(1);
    expect(c.source).toBe('in-cloud');
    // with cloud help off the same threshold sends nothing
    const off = new E(dev);
    const kept = await makeCard('What shall we do after lunch?', { profile: PROFILE, support: 'more', engine: off, allowCloud: false, deviceReady: true, routing: { moodWords: 2, minChoices: 3 } });
    expect(off.cloudCalls).toBe(0);
    expect(kept.cloudPayload ?? null).toBeNull();
  });
});

describe('where and when Remote Config is asked', () => {
  const main = read('web/src/main.ts');
  const rc = read('web/src/ai/remoteConfig.ts');
  it('only one file imports the Remote Config SDK, and it can reach neither a question nor About me', () => {
    const importers = ['web/src/main.ts', 'web/src/ai/firebaseEngine.ts', 'web/src/ai/pick.ts', 'web/src/ai/config.ts', 'web/src/ai/app.ts', 'web/src/store.ts', 'web/src/trial.ts', 'web/src/pictos.ts']
      .filter((p) => /firebase\/remote-config/.test(read(p)));
    expect(importers).toEqual([]);
    expect(rc).toMatch(/from 'firebase\/remote-config'/);
    const imports = [...rc.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    expect(imports.sort()).toEqual(['../../../core/models', './app', 'firebase/app', 'firebase/remote-config']);
    // outside its comments the file names no profile and no question, and sends no custom signals
    const code = rc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
    expect(code).not.toMatch(/profile|question|setCustomSignals|About/i);
  });
  it('it is asked only when cloud help is on, once, and no card waits for it', () => {
    expect(main).toContain('if (!cfg || !state.settings.cloudHelp || settingsAsked) return;');
    expect(main).not.toMatch(/await\s+fetchSettings/);
    expect(main).not.toMatch(/await\s+askSettings/);
    expect(main.match(/fetchSettings\(/g)).toHaveLength(1);
    // an answer that arrives while a card is being made is put in use after it
    expect(main).toContain('if (!settingsWaiting || state.busy) return;');
  });
  it('the line under the chips names the settings request once it was made', () => {
    const n = { cards: 1, cardsLeft: 0, bodyBytes: 0, namesWithheld: 0, otherWithheld: 0, attempts: 0, attemptBytes: 0 };
    expect(COPY.judge.receipt.number(n).label).toBe('left this computer');
    const asked = COPY.judge.receipt.number(n, true);
    expect(`${asked.figure} ${asked.label}`).toBe('0 bytes of any question left this computer');
    expect(asked.scope).toMatch(/settings request/);
    expect(COPY.judge.receipt.number({ ...n, cardsLeft: 1, bodyBytes: 4528 }, true).scope).toMatch(/nor is the settings request/);
    expect(defaultReport().status).toBe('off');
  });
});
