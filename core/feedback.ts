// "Send feedback": a short note from a speech-language therapist, a carer, a person with aphasia or anyone else, to
// the people who make Talk Partner. This file is the note's shape and its checks, with no platform code: the web
// client writes the checked note to Cloud Firestore (web/src/feedback.ts), and firestore.rules repeats every check
// on the server, because a rule in the page can be skipped by anyone who writes to the database directly.
//
// What a note holds: the text, the role (may be empty), an email address only if one was typed, the app's version
// and commit, and the server's time. Nothing else: no question, no card, nothing from About me, no browser details.

export const FEEDBACK_COLLECTION = 'feedback';
export const FEEDBACK_MAX = 1000;
export const EMAIL_MAX = 254;
/** Stored values of the role; '' = not said. The words shown for them are in core/copy.ts. */
export const FEEDBACK_ROLES = ['slt', 'carer', 'person', 'other'] as const;
export type FeedbackRole = (typeof FEEDBACK_ROLES)[number] | '';

export interface FeedbackInput { text: string; role: string; email: string }
/** The note as it is written, before the server adds `createdAt`. `email` is absent unless one was given. */
export interface FeedbackDoc { text: string; role: FeedbackRole; email?: string; version: string; commit: string }
export type FeedbackError = 'empty' | 'long' | 'email';

/** One "@" with something before it, a dot after it, and no spaces: enough to catch a slip, not a proof it exists. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const COMMIT = /^(?:[0-9a-f]{7,40}|unknown)$/;

/**
 * The typed form -> the note to write, or the first thing wrong with it. The text is trimmed; an unknown role is
 * stored as "not said"; an empty email field means no email field in the note at all.
 */
export function feedbackDoc(input: FeedbackInput, build: { version: string; commit: string }): { ok: true; doc: FeedbackDoc } | { ok: false; error: FeedbackError } {
  const text = input.text.trim();
  if (!text) return { ok: false, error: 'empty' };
  if (text.length > FEEDBACK_MAX) return { ok: false, error: 'long' };
  const email = input.email.trim();
  if (email && (email.length > EMAIL_MAX || !EMAIL.test(email))) return { ok: false, error: 'email' };
  const role = (FEEDBACK_ROLES as readonly string[]).includes(input.role) ? (input.role as FeedbackRole) : '';
  const doc: FeedbackDoc = { text, role, version: build.version.slice(0, 20), commit: COMMIT.test(build.commit) ? build.commit : 'unknown' };
  if (email) doc.email = email;
  return { ok: true, doc };
}
