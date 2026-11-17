// A recording, not a card: what the on-device step made on our machine for judge mode's first open question.
// Shown in judge mode only where this browser cannot run the on-device step (no Gemini Nano, or not downloaded), so a
// judge on an ordinary Chrome can still see what that step makes. Nothing here is made in the viewer's browser, no
// model runs for it and nothing is sent; the screen says so, with the date, the commit and the SDK's own report.
//
// Every value below is copied from the saved run log named in `log` (the weekend question in its section 2, the
// cloud's card for the same question in its section 5). tests/unit/recorded.test.ts reads that log and fails if a
// value here is not in it, so this file cannot drift from the evidence.

export const RECORDED_STEP = {
  /** The saved run this is copied from (written by scripts/e2e-ondevice.mjs). */
  log: 'devlog/evidence_r7/final/ondevice/RUN_LOG.md',
  /** The log's own date line is 2026-11-17T05:49:43Z. */
  date: '17 Nov 2026 (UTC)',
  commit: '8ace9f0',
  browser: 'Chrome 157',
  question: 'What do you want to do this weekend?',
  badge: 'On this computer',
  tail: 'nothing left this computer · lake, church from About me',
  tiles: ['lake', 'church', 'something else'],
  /** The console line the engine printed for this call: the SDK's `inferenceSource` as it came back. */
  sdk: '[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3059',
  inferenceSource: 'on_device',
  /** The same question in the same run, answered by the cloud step alone (a browser without the model, cloud help on). */
  cloudTiles: ['stay home', 'go out', 'something else'],
} as const;
