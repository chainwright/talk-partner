// Records the app's motion as an mp4: the first screen, then judge mode opens, a sample question becomes a card
// (tiles + "where each step ran" trace), then the full-screen card. Same throwaway headless Chrome as shots.mjs;
// code cards only (no model, no cloud call). Needs ffmpeg on PATH.
//
// Usage: npm run dev (in another shell), then
//   node scripts/motion.mjs [--size desktop|phone] [--out devlog/motion]
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SIZE = arg('--size', 'desktop');
const OUT = arg('--out', 'devlog/motion');
const URL_ = arg('--url', 'http://localhost:5179/');
const PORT = 9343;
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SIZES = { phone: { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }, desktop: { width: 1280, height: 900, mobile: false, deviceScaleFactor: 1 } };

const profile = mkdtempSync(join(tmpdir(), 'tp-motion-'));
const frames = mkdtempSync(join(tmpdir(), 'tp-frames-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let code = 0;
try {
  let wsUrl;
  for (let i = 0; i < 50 && !wsUrl; i++) { try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* not up */ } if (!wsUrl) await sleep(200); }
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const shots = [];
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Page.screencastFrame') { shots.push({ t: m.params.metadata.timestamp, data: m.params.data }); void send('Page.screencastFrameAck', { sessionId: m.params.sessionId }); }
  });
  const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const waitFor = async (e, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await js(e)) return; await sleep(100); } };
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', SIZES[SIZE]);
  // settle fonts on a first load so the recording does not show the font swap
  await send('Page.navigate', { url: `${URL_}#/demo` });
  await waitFor('!!document.querySelector(".chip")');
  await js('document.fonts.ready.then(() => true)');
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(300);
  const { width, height } = SIZES[SIZE];
  await send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: width * SIZES[SIZE].deviceScaleFactor, maxHeight: height * SIZES[SIZE].deviceScaleFactor, everyNthFrame: 1 });
  await send('Page.navigate', { url: `${URL_}#/welcome` }); // first screen
  await waitFor('!!document.querySelector("main.welcome")');
  await sleep(2600);
  await send('Page.navigate', { url: `${URL_}#/demo` });
  await waitFor('!!document.querySelector(".chip")');
  await sleep(1600);
  if (SIZE === 'phone') await js('window.scrollTo(0, 0)');
  await js('document.querySelector(\'.chip[data-q="Do you want coffee or tea?"]\').click()');
  await waitFor('!!document.querySelector("#result .badge")');
  if (SIZE === 'phone') { await sleep(900); await js('document.querySelector("#person").scrollIntoView({ behavior: "smooth", block: "start" })'); }
  await sleep(2200);
  if (SIZE === 'phone') { await js('window.scrollTo({ top: 0, behavior: "smooth" })'); await sleep(700); }
  await js('document.querySelector("[data-act=show]").click()');
  await sleep(1400);
  await send('Page.stopScreencast');
  ws.close();
  // concat list with real frame durations (the screencast only sends frames when something changes)
  let list = '';
  shots.forEach((f, i) => {
    const name = `f${String(i).padStart(4, '0')}.jpg`;
    writeFileSync(join(frames, name), Buffer.from(f.data, 'base64'));
    const next = shots[i + 1]?.t ?? f.t + 0.8;
    list += `file '${join(frames, name)}'\nduration ${Math.max(0.016, next - f.t).toFixed(3)}\n`;
  });
  writeFileSync(join(frames, 'list.txt'), list);
  mkdirSync(OUT, { recursive: true });
  const out = join(OUT, `motion_${SIZE}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(frames, 'list.txt'), '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '24', out]);
  console.log(`${out}: ${shots.length} frames`);
} catch (e) {
  console.error('FAIL', e); code = 1;
} finally {
  chrome.kill('SIGTERM');
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
  rmSync(frames, { recursive: true, force: true });
}
process.exit(code);
