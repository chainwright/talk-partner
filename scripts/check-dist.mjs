// Fails (exit 1) if a production build contains the App Check debug token or the debug-token hook.
// Reads the token from .env.local if present; also checks for the debug hook name, which needs no secret.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const files = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(d, e.name)) : [join(d, e.name)]));
if (!existsSync('dist')) { console.error('no dist/: run vite build first'); process.exit(1); }
const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const token = /VITE_APPCHECK_DEBUG_TOKEN=(\S+)/.exec(env)?.[1];
let bad = 0;
for (const f of files('dist')) {
  const t = readFileSync(f, 'utf8');
  if (token && t.includes(token)) { console.error(`FAIL ${f}: contains the App Check debug token`); bad++; }
  if (/VITE_APPCHECK_DEBUG_TOKEN/.test(t)) { console.error(`FAIL ${f}: contains the debug-token variable name`); bad++; }
}
console.log(bad ? `${bad} problem(s)` : 'dist is clean: no App Check debug token');
process.exit(bad ? 1 : 0);
