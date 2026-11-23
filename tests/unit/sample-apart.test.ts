// 23 Nov 2026: "Try it with the Millers" (the sample family; judge mode on a computer) showed the family's own diary,
// health notes and learned lines on a phone, because entering it swapped only the profile and the answers in memory.
// The sample family now has a store of its own (web/src/store.ts, `setSampleScope`): it never reads the family's own
// lists and never writes over them, and leaving it reads the family's own back from this device.
// The same walk in a browser, with a diary on the device: scripts/phase12-walk.py (`sample_apart`, 360 and 390 px as a
// phone, and a desktop).
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { kvClear, kvGet, kvSet, setSampleScope } from '../../web/src/store';

afterEach(() => setSampleScope(false));

describe('the sample family has a store of its own', () => {
  it('reads none of the family\'s own lists, and its writes and "Delete everything" never reach them', async () => {
    const diary = [{ id: 'r1', at: 1, kind: 'answer', q: 'Do you want pea soup?', label: 'pea soup', topic: 'food' }];
    await kvSet('diary', diary);
    await kvSet('health', { text: 'his tablets at eight', emergency: '112' });
    await kvSet('profile', { personName: 'Walter' });
    setSampleScope(true);
    expect(await kvGet('diary')).toBeUndefined();
    expect(await kvGet('health')).toBeUndefined();
    expect(await kvGet('profile')).toBeUndefined();
    await kvSet('diary', [{ id: 's1', at: 2, kind: 'log', log: 'drank', label: 'Drank', topic: 'food' }]);
    expect(await kvGet('diary')).toHaveLength(1);
    await kvClear();
    expect(await kvGet('diary')).toBeUndefined();
    setSampleScope(false);
    expect(await kvGet('diary')).toEqual(diary);
    expect(await kvGet('health')).toEqual({ text: 'his tablets at eight', emergency: '112' });
    expect(await kvGet('profile')).toEqual({ personName: 'Walter' });
  });
  it('keeps nothing once it is left: opening it again starts empty', async () => {
    setSampleScope(true);
    await kvSet('diary', [{ id: 's1' }]);
    setSampleScope(false);
    setSampleScope(true);
    expect(await kvGet('diary')).toBeUndefined();
  });
  it('a value handed to it is copied, so a later change in memory is not kept by surprise', async () => {
    setSampleScope(true);
    const list = [{ id: 's1' }];
    await kvSet('diary', list);
    list.push({ id: 's2' });
    expect(await kvGet('diary')).toHaveLength(1);
  });
  it('only this browser\'s settings pass through (the view, the support level, the cloud switch)', async () => {
    await kvSet('settings', { view: 'simple' });
    setSampleScope(true);
    expect(await kvGet('settings')).toEqual({ view: 'simple' });
    await kvSet('settings', { view: 'full' });
    setSampleScope(false);
    expect(await kvGet('settings')).toEqual({ view: 'full' });
  });
});

describe('main.ts: entering and leaving the sample family', () => {
  const src = readFileSync(new URL('../../web/src/main.ts', import.meta.url), 'utf8');
  const body = (name: string) => { const i = src.indexOf(`function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)); };
  it('entering turns the sample store on and empties every one of the family\'s lists in memory', () => {
    const enter = body('enterDemo');
    expect(enter).toContain('setSampleScope(true)');
    expect(enter).toContain('clearFamily()');
    const clear = body('clearFamily');
    for (const k of ['state.diary = []', 'state.health = NO_HEALTH', 'state.history = []', 'state.needsLog = []', 'state.photos = []', 'state.asks = []', 'state.forgotten = NOTHING_FORGOTTEN', 'state.p4.visit = null', 'p8later.list = []', 'p8.log = newLog(']) expect(clear, k).toContain(k);
  });
  it('leaving turns it off before the family\'s own lists are read back', () => {
    const leave = body('leaveDemo');
    expect(leave.indexOf('setSampleScope(false)')).toBeGreaterThan(-1);
    expect(leave.indexOf('setSampleScope(false)')).toBeLessThan(leave.indexOf('await load()'));
  });
  it('a first load that ends after the sample family opened takes only the settings', () => {
    const load = body('load');
    expect(load.indexOf('if (state.demo) return;')).toBeGreaterThan(load.indexOf('state.settings ='));
    expect(load.indexOf('if (state.demo) return;')).toBeLessThan(load.indexOf('state.diary ='));
  });
});
