// Answers the person confirmed, kept on this computer only, so the partner can see what they chose the last time the
// same question was asked. Pure data and functions: no DOM, no storage (the web client keeps the list in IndexedDB).
// Privacy boundary: nothing in this file is imported by the prompts, the privacy swap, the requests or the pipeline
// (tests/unit/history.test.ts checks the imports), so an answer never reaches a model, on this computer or anywhere.

export interface Answered {
  /** The question as the card showed it. */
  q: string;
  /** The card's headline. */
  topic: string;
  /** The choice the person pointed at and confirmed with the tick. Way-out tiles are never recorded. */
  label: string;
  /** When it was confirmed (ms since the epoch, from this computer's clock). */
  at: number;
}

export const HISTORY_CAP = 300;

/** Two askings of the same question match whatever the capitals, the punctuation or the spacing. */
export function questionKey(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim();
}

/** A new list with the answer added; the oldest entries fall off past the cap. */
export function addAnswer(history: Answered[], a: Answered, cap = HISTORY_CAP): Answered[] {
  if (!a.label.trim() || !questionKey(a.q)) return history;
  return [...history, a].slice(-cap);
}

/** The most recent confirmed answer to this question from before `before` (the moment this card was made), or null. */
export function lastAnswer(history: Answered[], q: string, before = Infinity): Answered | null {
  const k = questionKey(q);
  for (let i = history.length - 1; i >= 0; i--) if (history[i].at < before && questionKey(history[i].q) === k) return history[i];
  return null;
}

/** How often each answer to this question was confirmed, most often first ("lake ×3, church ×1"). */
export function answerCounts(history: Answered[], q: string, before = Infinity): { label: string; n: number }[] {
  const k = questionKey(q);
  const m = new Map<string, number>();
  for (const h of history) if (h.at < before && questionKey(h.q) === k) m.set(h.label, (m.get(h.label) ?? 0) + 1);
  return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
}

/** "today", "yesterday" or a short date, by this computer's calendar days. */
export function whenText(at: number, now: number): string {
  const day = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const days = Math.round((day(now) - day(at)) / 86400000);
  if (days <= 0) return 'earlier today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
