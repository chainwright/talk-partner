# Why the hosted copy made no cloud card on the evening of 17 Nov 2026: what was measured

All from the development machine (one IP, many automated runs that day). Times UTC. No key or token is in this file.

1. **19:06**, build of `4d7edee` (limited-use App Check tokens): `e2e-cloud.mjs --url` 28/28.
2. **19:53, 19:54**, the organiser of the fifth review, same build: 17/27 and 26/28. **About 20:20**, ours, three runs:
   16 or 17 of 27. In the network capture: `POST …firebaseappcheck…/exchangeRecaptchaEnterpriseToken` → 403
   `{"message":"App attestation failed.","status":"PERMISSION_DENIED"}`; the SDK then throws
   "AppCheck: Requests throttled due to previous 403 error…" and sends no model request.
3. **SDK source** (`firebase` 13.3.0: `@firebase/app-check` 0.13.1, `@firebase/ai` 3.1.0): with
   `useLimitedUseAppCheckTokens` the SDK calls the provider for every request and a failure throws before the request
   is sent; with the session token `getToken` "always resolves", and on failure the request goes out with a
   placeholder token. After a 403 the provider refuses every new try for one day, in memory (a page load resets it).
4. **20:43**, build of `bbcb075` (session token), headless Chrome 157: attestation 403 again; the model request was
   sent and answered **400 "Firebase AI Logic genai config not found"** (`FAILED_PRECONDITION`). The same at 20:46 in
   a headed Chrome 157 with a new profile.
5. **20:45**, the same model request by hand, same body, three ways: with no App Check header → 400 (that message);
   with the SDK's placeholder token → 400 (that message); with a valid App Check token (from the debug-token
   exchange) → **200**. On localhost, where App Check uses the debug token, the app made the cloud card
   (`inferenceSource=in_cloud`, 16.5 s).
6. So, for this project: **no valid App Check token, no cloud answer**, although enforcement is not switched on in
   the console as far as we know; and reCAPTCHA Enterprise was refusing this machine's browsers. Limited-use tokens
   were not the cause of the 403; they multiplied the attestations (one per request) and hid the service's answer.
7. **20:56 and 21:17**, build of `2c5673e` (session token; the failure named): `e2e-cloud.mjs --url` 18/27 and 14/27,
   attestation still 403 both times (`e2e-cloud_live_2026-11-17_2c5673e_run1.txt`, `_run2.txt`). The card reads
   "Cloud help could not confirm this browser, so there is no card. Load the page again and try once more, …". In
   the second run three checks that do not touch the cloud also failed (the status line was still "Checking…" when
   the script read it) and Remote Config did not answer in 5 s in either run; both passed in the run at 20:41.

**Not known:** whether a judge's own browser on another network passes the attestation today; why reCAPTCHA began to
refuse this machine between 19:06 and 19:53 (score after many automated runs is our guess, not a finding). To find
out: the reCAPTCHA Enterprise key's score and assessment charts and the App Check request metrics in the console
(the owner's step), and one run from another network.
