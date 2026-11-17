import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// The version and the commit the build was made from: written into a feedback note (web/src/main.ts), nowhere else.
const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;
const commit = (() => { try { return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'unknown'; } })();

// The web client lives in web/. The shared core (core/) is imported from there by relative path.
// Firebase web config comes from VITE_FIREBASE_* variables in .env.local (gitignored); see .env.example.
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version), __APP_COMMIT__: JSON.stringify(commit) },
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
