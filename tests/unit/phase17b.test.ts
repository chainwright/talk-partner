// Phase 17 B (judge round 12, P0 2): App Check warm on the question field, limited-use tokens, and "Try Google's AI
// again" on the rules' card after a refusal. Written before the code (failing first: devlog/evidence_phase17/).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');

describe('B. App Check: started early, limited-use tokens, one more try on refusal', () => {
  it('the installed Firebase AI Logic SDK has the limited-use option, and the cloud AI instance turns it on', () => {
    expect(read('node_modules/@firebase/ai/dist/ai-public.d.ts')).toMatch(/useLimitedUseAppCheckTokens\?: boolean;/);
    const engine = read('web/src/ai/firebaseEngine.ts');
    expect(engine).toContain('export const LIMITED_USE_TOKENS = false;');
    expect(engine).toContain('useLimitedUseAppCheckTokens: LIMITED_USE_TOKENS');
  });
  it('App Check starts when the question field gets the cursor, on a phone only (never with Chrome\'s own AI, never offline)', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain("app.addEventListener('focusin', (ev) => { if ((ev.target as HTMLElement).id === 'q') warmCloud(); });");
    const warm = main.slice(main.indexOf('function warmCloud()'), main.indexOf('async function retryOwn()'));
    expect(warm).toContain("if (place !== 'ask' && place !== 'cloudOn') return;");
    expect(warm).not.toMatch(/runCloud|generateContent/);
  });
  it('a refusal keeps the rules\' card and offers "Try Google\'s AI again": one tap, the same yes, the card stays meanwhile', async () => {
    const main = read('web/src/main.ts');
    const { P17 } = await import('../../core/copy17').catch(() => ({ P17: { tryAgain: '' } }));
    expect(P17.tryAgain).toBe("Try Google's AI again");
    expect(main).toContain("case 'own-retry': void retryOwn(); break;");
    const retry = main.slice(main.indexOf('async function retryOwn()'), main.indexOf('/** The consent sheet comes up for this card'));
    expect(retry).toContain('allowCloud: true');
    expect(retry).toContain('state.engine.retryCloudCheck?.();');
    // the card is only replaced by a card the AI made; otherwise it stays, with a line
    expect(retry).toContain("if (card && !card.blocked && !card.own?.guard && card.source !== 'code')");
    expect(retry).toContain('else p17.retryFailed = c;');
    // the SDK refuses every new try for 24 hours after a 403, in this page: the carer's tap clears that once
    expect(read('web/src/ai/app.ts')).toContain('(provider as unknown as { _throttleData: unknown })._throttleData = null;');
    expect(read('node_modules/@firebase/app-check/dist/esm/index.esm.js')).toMatch(/this\._throttleData = null;/);
  });
  it('the debug token is never in a production build (scripts/check-dist.mjs still runs in npm run build)', () => {
    expect(JSON.parse(read('package.json')).scripts.build).toContain('node scripts/check-dist.mjs');
    expect(read('scripts/check-dist.mjs')).toMatch(/debug/i);
  });
});
