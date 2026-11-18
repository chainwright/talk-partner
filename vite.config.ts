import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The version and the commit the build was made from: written into a feedback note (web/src/main.ts), nowhere else.
const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;
const commit = (() => { try { return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'unknown'; } })();

/**
 * The app shell for the service worker (web/sw.template.js): after the bundle is written, every file of the build is
 * listed in dist/sw.js with a version made from the names and sizes, so the worker keeps exactly this build and a new
 * build replaces it. The worker is plain JavaScript and is not bundled.
 */
function appShell() {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const out = join(here, 'dist');
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  return {
    name: 'talk-partner-app-shell',
    apply: 'build' as const,
    closeBundle() {
      const files = walk(out).filter((f) => !f.endsWith(`${sep}sw.js`)).sort();
      const urls = files.map((f) => `/${relative(out, f).split(sep).join('/')}`).map((u) => (u === '/index.html' ? '/' : u));
      const version = createHash('sha256').update(files.map((f) => `${relative(out, f)}:${statSync(f).size}`).join('|')).update(readFileSync(join(out, 'index.html'))).digest('hex').slice(0, 12);
      const sw = readFileSync(join(here, 'web', 'sw.template.js'), 'utf8').replace("'__VERSION__'", JSON.stringify(version)).replace('__FILES__', JSON.stringify(urls));
      writeFileSync(join(out, 'sw.js'), sw);
    },
  };
}

// The web client lives in web/. The shared core (core/) is imported from there by relative path.
// Firebase web config comes from VITE_FIREBASE_* variables in .env.local (gitignored); see .env.example.
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version), __APP_COMMIT__: JSON.stringify(commit) },
  plugins: [appShell()],
  root: 'web',
  envDir: '..',
  publicDir: 'public',
  build: { outDir: '../dist', emptyOutDir: true },
  // the feedback form loads Firestore on "Send" only; named here so the dev server has it ready and does not reload
  // the page (and lose the note) the first time it meets it
  optimizeDeps: { include: ['firebase/firestore/lite'] },
  server: { port: 5179, strictPort: true },
  preview: { port: 5179, strictPort: true },
  test: {
    root: '.',
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
