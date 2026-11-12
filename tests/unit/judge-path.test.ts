// The README's "For judges" table names the file and line of every Firebase AI Logic call and every place the SDK's
// report becomes a badge. This test reads the table and checks that each named line still holds its snippet, so the
// table cannot go stale without the build going red. Written 12 Nov 2026.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const section = readme.split('### Every Firebase AI Logic call, by file and line')[1]?.split('\n## ')[0] ?? '';
const rows = [...section.matchAll(/^\| `([^`:]+):(\d+)` \| `([^`]+)` \|/gm)].map((m) => ({ file: m[1], line: Number(m[2]), snippet: m[3] }));

describe('README "For judges": the file:line table matches the source', () => {
  it('the table exists and lists every call site in the engine', () => {
    expect(rows.length).toBeGreaterThanOrEqual(16);
    const engine = readFileSync(join(ROOT, 'web/src/ai/firebaseEngine.ts'), 'utf8').split('\n');
    // every generateContent / getGenerativeModel / initializeDeviceModel / getAI / initializeAppCheck line in the engine is in the table
    const calls = engine.map((t, i) => ({ t, n: i + 1 })).filter((l) => /\b(?:generateContent|getGenerativeModel|initializeDeviceModel|getAI|initializeAppCheck)\(/.test(l.t)).map((l) => l.n);
    const listed = rows.filter((r) => r.file === 'web/src/ai/firebaseEngine.ts').map((r) => r.line);
    for (const n of calls) expect(listed, `engine line ${n} is not in the README table`).toContain(n);
  });
  for (const r of rows) {
    it(`${r.file}:${r.line} holds "${r.snippet}"`, () => {
      const lines = readFileSync(join(ROOT, r.file), 'utf8').split('\n');
      expect(lines[r.line - 1], `line ${r.line} is: ${lines[r.line - 1]}`).toContain(r.snippet);
    });
  }
  it('the table has no duplicate file:line', () => {
    const keys = rows.map((r) => `${r.file}:${r.line}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('the README names the pre-contest tag and DISCLOSURE.md', () => {
    expect(readme).toMatch(/`pre-contest`/);
    expect(readme).toContain('DISCLOSURE.md');
  });
});
