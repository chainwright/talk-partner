// The feedback form's one write: a checked note (core/feedback.ts) becomes one new document in the Cloud Firestore
// collection `feedback`, with the server's time. The page can only add: firestore.rules allows a create that passes
// the same checks and refuses every read, change and delete, so nobody can read notes back through the app.
//
// It runs on the default Firebase app with App Check started (ai/app.ts), so the request carries an App Check token.
// Nothing here runs at page load: this file is loaded, and Google is contacted, only when "Send" is pressed.
// Firestore Lite (plain requests, no listeners, no offline cache) is all one write needs.
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore/lite';
import { FEEDBACK_COLLECTION, type FeedbackDoc } from '../../core/feedback';
import { appWithAppCheck, type WebConfig } from './ai/app';

/** Writes the note and returns the new document's id. Throws what the SDK throws (no connection, refused by the rules). */
export async function sendFeedback(cfg: WebConfig, doc: FeedbackDoc): Promise<string> {
  const db = getFirestore(appWithAppCheck(cfg));
  const ref = await addDoc(collection(db, FEEDBACK_COLLECTION), { ...doc, createdAt: serverTimestamp() });
  return ref.id;
}
