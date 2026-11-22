// What the app learns about the person over time, so the carer understands them faster later: their usual choice
// for a question ("Usually: tea (5 of 7)"), a pattern by time of day ("tea in the morning, water in the evening"),
// what they usually say no to, and what they ask for on the quick-needs board (what, how often, when).
//
// How it is learned: by COUNTING, with rules, on this device. The input is the answers the person confirmed (the
// history kept in IndexedDB, core/history.ts) and the needs they pointed to on the quick-needs board. No model reads
// them to learn anything. Nothing here is a guess about the person: every line states a count the carer can check.
//
// Dignity and privacy guards:
//   - nothing is said before three confirmed answers to the same question (MIN_ANSWERS), and only when one answer
//     clearly leads (at least 60 % of them, and ahead of the next one);
//   - a learned choice is only ever a SUGGESTION to the carer: it moves first among the choices and a small line says
//     "Usually: …". No answer is ever selected for the person, and no choice is ever taken away (`usualFirst` returns
//     every choice it was given: tests/unit/prefs.test.ts);
//   - the carer sees everything that was learned in About them ("What we've learned"), can keep a line as a fixed
//     fact, remove a line (the answers before that moment no longer count for it), or forget everything learned;
//   - it never leaves the device. This file imports nothing; the prompts, the privacy swap, the requests and the
//     pipeline do not import it (tests/unit/prefs.test.ts checks the imports), so no cloud request can hold a
//     preference. The one AI that may read the learned lines is the on-device model (ONLY_ON_DEVICE), where the
//     browser has it: for an optional short summary, and as hints for the narrowing step's on-device prompt.

/** A confirmed answer, as the history keeps it. */
export interface Seen { q: string; label: string; at: number; /** Marked by the answer check (core/reliability.ts): never counted for a usual answer (phase 8, judge round 7). */ lessSure?: boolean }
/** The answers a usual line may be counted from: none the answer check marked "less sure". */
const sure = <T extends { lessSure?: boolean }>(xs: T[]): T[] => xs.filter((x) => !x.lessSure);
/** A need pointed to on the quick-needs board. */
export interface Need { label: string; at: number }

/** What the carer removed or reset: answers from before these moments no longer count. */
export interface Forgotten {
  /** "Forget everything learned": nothing before this moment counts. */
  all: number;
  /** One line removed: its key, and the moment. */
  one: Record<string, number>;
  /** Lines the carer kept as a fixed fact in About them: their keys (they are not offered again). */
  kept: string[];
}
export const NOTHING_FORGOTTEN: Forgotten = { all: 0, one: {}, kept: [] };

export const MIN_ANSWERS = 3;
/** One answer leads when it has at least this share of the answers, and more than any other. */
export const LEAD_SHARE = 0.6;

export type DayPart = 'morning' | 'afternoon' | 'evening';
/** By this device's clock: morning 5 to 12, afternoon 12 to 17, evening and night 17 to 5. */
export function dayPart(at: number): DayPart {
  const h = new Date(at).getHours();
  return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : 'evening';
}

const qKey = (q: string) => q.toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim();
const lKey = (l: string) => l.toLowerCase().replace(/\s+/g, ' ').trim();
const bare = (q: string) => q.replace(/[?.!]+$/, '').trim();

export interface Usual { label: string; n: number; of: number }

/** The leading answer of a list of labels, or null: fewer than three, no clear lead, or a tie. */
function lead(labels: string[]): Usual | null {
  if (labels.length < MIN_ANSWERS) return null;
  const m = new Map<string, { label: string; n: number }>();
  for (const l of labels) { const k = lKey(l); const e = m.get(k); if (e) e.n++; else m.set(k, { label: l, n: 1 }); }
  const sorted = [...m.values()].sort((a, b) => b.n - a.n);
  const top = sorted[0];
  if (sorted[1] && sorted[1].n === top.n) return null;
  if (top.n / labels.length < LEAD_SHARE) return null;
  return { label: top.label, n: top.n, of: labels.length };
}

/** The answers that still count for a line: after "forget everything", and after that line was removed. */
function counted<T extends { at: number }>(xs: T[], key: string, f: Forgotten): T[] {
  const since = Math.max(f.all, f.one[key] ?? 0);
  return xs.filter((x) => x.at > since);
}

/** The person's usual answer to this question, or null (never before three answers, never on a tie). */
export function usual(history: Seen[], q: string, f: Forgotten = NOTHING_FORGOTTEN): Usual | null {
  const k = qKey(q);
  if (!k) return null;
  return lead(counted(sure(history).filter((h) => qKey(h.q) === k), `q:${k}`, f).map((h) => h.label));
}

/** The small line for the carer: "Usually: tea (5 of 7)". */
export const usualHint = (u: Usual) => `Usually: ${u.label} (${u.n} of ${u.of})`;

/**
 * The same choices with the usual one first. Every choice that came in goes out, once, and the rest keep their order:
 * nothing is removed, nothing is added, nothing is selected. A label that is not among them changes nothing.
 */
export function usualFirst<T extends { label: string }>(choices: T[], label: string | null | undefined): T[] {
  if (!label) return choices;
  const i = choices.findIndex((c) => lKey(c.label) === lKey(label));
  return i <= 0 ? choices : [choices[i], ...choices.slice(0, i), ...choices.slice(i + 1)];
}

export interface Learned {
  /** Stable for the same finding: "q:<question>", "t:<question>", "n:<need>". Used to remove or keep it. */
  key: string;
  kind: 'usual' | 'no' | 'time' | 'need';
  /** In plain words, with its counts. */
  text: string;
  /** The question it is about ('' for a need). */
  q: string;
  /** Phase 12: about pain, the body, a feeling or a need (set by core/share.ts, aboutLearned): never offered as a fact to keep. */
  care?: boolean;
}

/** Everything learned so far, in plain words: usual choices, usual "no", patterns by time of day, needs. */
export function learned(history: Seen[], needs: Need[], f: Forgotten = NOTHING_FORGOTTEN): Learned[] {
  const out: Learned[] = [];
  const byQ = new Map<string, Seen[]>();
  for (const h of sure(history)) { const k = qKey(h.q); if (!k) continue; (byQ.get(k) ?? byQ.set(k, []).get(k)!).push(h); }
  for (const [k, all] of byQ) {
    const q = bare(all[all.length - 1].q);
    // by time of day: at least three answers in a part of the day with a clear lead there, and the parts differ
    const tKey = `t:${k}`;
    const parts = (['morning', 'afternoon', 'evening'] as DayPart[]).map((p) => ({ p, u: lead(counted(all, tKey, f).filter((h) => dayPart(h.at) === p).map((h) => h.label)) })).filter((x): x is { p: DayPart; u: Usual } => !!x.u);
    const differs = parts.length >= 2 && new Set(parts.map((x) => lKey(x.u.label))).size >= 2;
    if (differs && !f.kept.includes(tKey)) out.push({ key: tKey, kind: 'time', q, text: `"${q}": ${parts.map((x) => `${x.u.label} in the ${x.p} (${x.u.n} of ${x.u.of})`).join(', ')}.` });
    const uKey = `q:${k}`;
    const u = lead(counted(all, uKey, f).map((h) => h.label));
    if (!u || f.kept.includes(uKey)) continue;
    // a pattern by time of day says more than the overall count: the overall line is left out beside it
    if (differs && !f.kept.includes(tKey)) continue;
    if (lKey(u.label) === 'no') out.push({ key: uKey, kind: 'no', q, text: `Usually says no to "${q}" (${u.n} of ${u.of}).` });
    else if (lKey(u.label) === 'yes') out.push({ key: uKey, kind: 'usual', q, text: `Usually says yes to "${q}" (${u.n} of ${u.of}).` });
    else out.push({ key: uKey, kind: 'usual', q, text: `"${q}": usually ${u.label} (${u.n} of ${u.of}).` });
  }
  // the quick-needs board: what they ask for, how often, and when (a part of the day is named only when it leads)
  const byNeed = new Map<string, Need[]>();
  for (const n of needs) { const k = lKey(n.label); if (!k) continue; (byNeed.get(k) ?? byNeed.set(k, []).get(k)!).push(n); }
  for (const [k, all] of byNeed) {
    const key = `n:${k}`;
    const xs = counted(all, key, f);
    if (xs.length < MIN_ANSWERS || f.kept.includes(key)) continue;
    const when = lead(xs.map((x) => dayPart(x.at)));
    out.push({ key, kind: 'need', q: '', text: `Asked for "${xs[xs.length - 1].label}" on the needs board ${xs.length} times${when ? `, mostly in the ${when.label} (${when.n} of ${when.of})` : ''}.` });
  }
  return out;
}

/** "Remove": the answers so far no longer count for this line (it can be learned again from new answers). */
export function forgetOne(f: Forgotten, key: string, now: number): Forgotten {
  return { ...f, one: { ...f.one, [key]: now } };
}
/** "Keep as a fact": the line goes to About them as the carer's own fact, and is not offered again. */
export function keepOne(f: Forgotten, key: string): Forgotten {
  return f.kept.includes(key) ? f : { ...f, kept: [...f.kept, key] };
}
/** "Forget everything learned": nothing before now counts, and nothing is marked as kept. */
export function forgetAll(now: number): Forgotten {
  return { all: now, one: {}, kept: [] };
}

/**
 * A shorter way through a tree, as a suggestion: when the next question is an either-or and the person usually picks
 * one side of it, the carer can ask about that side first ("Would you like something sweet?"). The words are taken
 * from the question itself ("a hot drink", "the chair"), so the short question reads as the carer would say it. Null
 * when there is no usual answer yet, or the question does not name it. The full question always stays on offer.
 */
export function shortcut(history: Seen[], next: string, f: Forgotten = NOTHING_FORGOTTEN): { q: string; usual: Usual; line: string } | null {
  const u = usual(history, next, f);
  if (!u || /^(?:yes|no)$/i.test(u.label.trim())) return null;
  const m = next.trim().match(/^(Would you like|Do you want) (.+)\?$/i);
  if (!m) return null;
  const pieces = m[2].split(/,\s*(?:or\s+)?|\s+or\s+/).map((p) => p.trim()).filter(Boolean);
  const piece = pieces.find((p) => lKey(p) === lKey(u.label) || lKey(p).endsWith(` ${lKey(u.label)}`));
  if (!piece || pieces.length < 2) return null;
  return { q: `${m[1]} ${piece}?`, usual: u, line: `Usually picks ${u.label} here (${u.n} of ${u.of}). You can ask that first:` };
}

/** The learned top choices as short hints for the narrowing step's ON-DEVICE prompt only (never the cloud text). */
export function hints(history: Seen[], needs: Need[], f: Forgotten = NOTHING_FORGOTTEN, max = 6): string[] {
  return learned(history, needs, f).slice(0, max).map((l) => l.text);
}

// ---------------------------------------------------------------- an optional summary by the on-device model
/** The prompt for the on-device model: the learned lines, and nothing else. It is handed to ONLY_ON_DEVICE alone. */
export function learnedPrompt(lines: Learned[]): string {
  return `These lines are not from today. They are what was counted over time about one adult with aphasia. Say them again as 2 short plain sentences, grouped by time of day where a line names one. Use only what is in the lines.\n${lines.map((l) => `- ${l.text}`).join('\n')}`;
}
/** What may stand of the model's sentences: one to four, short, and no number that the learned lines do not hold. */
export function checkedSummary(sentences: unknown, lines: Learned[]): string[] | null {
  if (!Array.isArray(sentences)) return null;
  const xs = sentences.map((s) => String(s).replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (xs.length < 1 || xs.length > 4 || xs.some((s) => s.length > 200)) return null;
  const source = lines.map((l) => l.text).join(' ');
  const nums = new Set(source.match(/\d+/g) ?? []);
  for (const n of xs.join(' ').match(/\d+/g) ?? []) if (!nums.has(n)) return null;
  return xs;
}
