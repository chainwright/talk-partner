// Runs one command and saves what it printed as an evidence log.
//
//   node scripts/save-log.mjs <out-file> -- <command> [args...]
//
// The log starts with the date, the commit and whether the working tree was clean when the command started, and ends
// with the command's exit code. Colour codes are removed, and the absolute path of this checkout (and the home
// folder) is replaced by "<repo>" / "<home>", so a saved log never carries a machine's folder names.
// This script exits with the command's own exit code.
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const cut = process.argv.indexOf('--');
const out = process.argv[2];
const cmd = cut > 0 ? process.argv.slice(cut + 1) : [];
if (!out || cut !== 3 || !cmd.length) {
  console.error('usage: node scripts/save-log.mjs <out-file> -- <command> [args...]');
  process.exit(2);
}

const git = (c) => { try { return execSync(`git ${c}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const root = git('rev-parse --show-toplevel') || process.cwd();
const commit = git('rev-parse HEAD') || 'unknown';
const dirty = git('status --porcelain');
const tree = dirty ? `uncommitted changes in ${dirty.split('\n').length} file(s)` : 'clean working tree';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const scrub = (s) => s
  // eslint-disable-next-line no-control-regex
  .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
  .replace(new RegExp(esc(root), 'g'), '<repo>')
  .replace(new RegExp(esc(homedir()), 'g'), '<home>');

const started = new Date().toISOString();
const r = spawnSync(cmd[0], cmd.slice(1), { cwd: root, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }, maxBuffer: 64 * 1024 * 1024 });
const code = r.status ?? 1;
const body = scrub(`${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? `${r.error.message}\n` : ''}`).replace(/\s+$/, '');
const text = [
  `date: ${started}`,
  `commit: ${commit} (${tree})`,
  `command: ${scrub(cmd.join(' '))}`,
  '',
  body,
  '',
  `exit code: ${code}`,
  '',
].join('\n');

const file = resolve(out);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, text);
console.log(`${code === 0 ? 'ok' : 'FAILED'} (exit ${code}) -> ${scrub(file)}`);
process.exit(code);
