# Day 1: Wed 11 Nov 2026

## What works (checked, not assumed)
- **Firebase project `talk-partner`** (display name "Talk Partner"), web app `talk-partner-web`, Hosting site `talk-partner` reserved (no deploy yet).
  Analytics off, console Gemini assistant off, AI monitoring off (no prompt logging anywhere off the device).
- **Firebase AI Logic** enabled with the **Gemini Developer API** (Spark plan, free tier).
- **App Check**: debug token registered for local development. AI Logic enforcement: "Unenforced" for now (Google enforces automatically
  from 21 Jan 2027). The production provider (reCAPTCHA Enterprise) and enforcement come with the first deploy.
- **Real end-to-end against Firebase AI Logic** (`scripts/e2e-cloud.mjs`, headless Chrome with a fresh profile, 9/9 checks):
  - "Do you want coffee or tea?" → coffee / tea / something else, "No AI needed", no Google host contacted.
  - "What do you want to do this weekend with Jenny?", cloud help on → the stripped leg (`PREFER_IN_CLOUD`) answered with
    `inferenceSource` = in-cloud in ~1.5–2.5 s. The payload says "Person A", not the name. The request went to `firebasevertexai.googleapis.com`.
  - Page load with cloud help off contacts **only the app's own host**. Google hosts (App Check, reCAPTCHA, AI Logic) appear only when cloud help runs.
- **Gates by exit code** (`npm run check`): ESLint 0, `tsc` 0, Vitest 305/305.
  - `no-direct-model-calls.test.ts`: fails on any direct model call (Chrome Prompt API, Gemini/Vertex/TTS REST, other model SDKs,
    ML Kit GenAI or FoundationModels used directly), on `firebase/ai` outside the engine file, and on DOM/network code in `core/`.
    Mutation-checked: injected violations made it fail (4 rules hit); one gap found (`s.prompt(…)` slipped through) and closed.
  - `engine-matrix.test.ts`: coffee/tea is identical in all 25 states (model ready / bad options / empty / throws / absent ×
    cloud off / unconfigured / throws / offline fall-back / ok), plus privacy invariants per state.
  - `npm run build` ends with `scripts/check-dist.mjs`: the production bundle must not contain the App Check debug token.

## Bugs found today by our own checks (fixed)
1. **Debug token in the production bundle.** Aliasing `import.meta.env` made Vite inline the whole env object. Fixed with direct
   references; `check-dist.mjs` now fails the build if it recurs (mutation-checked).
2. **"Sent" claimed when nothing was sent.** When `PREFER_IN_CLOUD` fell back to the device (offline) or the cloud call threw, the card
   still showed the payload as sent. Now "sent" means the cloud really answered; an offline fall-back says "Ran on this computer (offline)".
3. **App Check and reCAPTCHA loaded on page load with cloud help off** (against spec §1.5). Firebase now starts lazily on the first AI call.
4. **Coffee/tea**: a valid either-or pair read from the question was dropped when the on-device model's options failed the check.
   The code pair is now used (one pre-period test that encoded the old behaviour was updated, with the reason in the test).

## Known gaps (on the plan, not hidden)
- Either-or headline reads "coffee tea"; it must be the shared topic (spec §2.5, Fri 13).
- The cloud answer "stay home / go out" for an open question is the generic pair the spec marks as bad (§2.6, Sat 14).
- **No on-device run today**: this Mac has ~3 GB free disk. Chrome needs ≥ 22 GB free for Gemini Nano, so the device leg shows
  "can't run the private helper" here. Nothing claims on-device. See "What the owner must do".
- Not deployed yet (no `web.app` page): the Firebase CLI isn't installed, and installing it needs disk space and a browser login.

## Billing status: Spark (no-cost). Blaze NOT enabled.
The Google account used for this project has **no Cloud Billing account**. Upgrading would mean creating one with a new card, and the
Cloud console also asked for the account password. Both steps belong to the owner; we stopped there. Budget alerts need a billing
account, so they are not set yet.
Why it matters beyond quota: per the Gemini API Additional Terms (effective 23 Mar 2026), on the **unpaid** tier Google may use prompts and
responses to improve its products. On the **paid** tier it doesn't. The consent text in the app says this today; Blaze would let us drop it.

## Multi-platform check (owner asked for iOS + Android + Web; rules prefer multi-platform for the Grand Prize)
### (a) Which framework gives all three with hybrid on-device through Firebase AI Logic?
Checked on the official Firebase AI Logic docs, 11 Nov:
| Platform | Hybrid on-device via AI Logic | Status | How |
|---|---|---|---|
| Web (desktop Chrome 139+) | yes | no "experimental" label | `firebase` JS SDK ≥ 12.5: `getGenerativeModel(ai, {mode: InferenceMode.…})`, `inferenceSource` |
| Android | yes | **Experimental**; ML Kit Prompt API is beta | `firebase-ai:18.1.0` + `firebase-ai-ondevice:16.0.0-beta07` (not in the BoM), `OnDeviceConfig(mode = InferenceMode.…)`, `FirebaseAIOnDevice.checkStatus()/download()`; min API 26; 4,000-token limit |
| iOS | yes | **Experimental** | `FirebaseAILogic` ≥ 12.13 via **SPM only**: `HybridModel(primary: SystemLanguageModel.default, secondary: cloud)`; needs Apple Intelligence enabled; the app can't trigger the model download; 4,096-token limit |
| Flutter (`firebase_ai`) | **not documented** | — | only cloud setup is documented |
| React Native | **not documented** | — | not listed among AI Logic SDKs |

**Conclusion:** only the three native SDKs have a documented on-device path. Flutter or React Native would lose the on-device leg, which is
the point of the contest's first criterion. So: **one shared core plus three thin native clients.** The core (`core/`) is pure TypeScript with
no DOM or Firebase, enforced by a test. Two ways to share it with native:
1. **Run the core bundle inside each app**: JavaScriptCore on iOS (built in), Jetpack `javascriptengine` (JavaScriptSandbox) on Android.
   The native client implements the same `Engine` interface with the native Firebase SDK and passes results in. One source of truth for the rules.
2. Share only data (prompts, schema, sample family, test cases as JSON) and port the rules per platform. More code, and the rules can drift.
We plan option 1 and keep option 2 as a fallback if the JS bridge costs too much time. The shared test cases run against every client.

### (b) What can be tested on this Mac (Mac mini, Apple M4, 16 GB RAM, macOS 26.2)?
| Need | State today |
|---|---|
| Free disk | **~3 GB.** Blocks everything below. |
| Chrome Gemini Nano (web on-device) | Needs ≥ 22 GB free on the profile volume (Chrome docs). **Not runnable now.** RAM and CPU are fine (16 GB, M4). |
| Xcode | **Not installed** (Command Line Tools only). Firebase's Swift guide asks for Xcode 26.2+. Xcode plus an iOS simulator runtime needs roughly 20+ GB (our estimate). |
| iOS Simulator with Foundation Models | **Not verified**: Apple's Foundation Models page didn't load for our fetcher, and the Firebase iOS hybrid page doesn't mention the Simulator. Needs checking once Xcode is in. Apple Intelligence requires iPhone 16 or later, iPad M1+ or Mac M1+ (Apple support page, 5 Nov 2026). |
| Android SDK / emulator / adb / Java | **None installed.** |
| Android Emulator with Gemini Nano | **Not documented as supported.** The ML Kit device list is physical phones only (Pixel 9/10/11 series, Galaxy S25/S26/Z Fold/Flip and others). The on-device leg needs a **physical supported phone**. |
| Physical devices | none available to us today |

### (c) Realistic per-platform plan to Sat 28 Nov, with the honest fallback
Rule for every platform: **the badge comes from the SDK's own report of where inference ran; we never claim on-device where it didn't run.**
On a device without the model, the private step is off, and the app says so.
| Platform | Plan | Fallback if the blocker isn't cleared |
|---|---|---|
| **Web** (primary, Best Web/Chrome) | GATE plan unchanged: E-A complete by 21 Nov, E-B relay by 24 Nov. On-device runs once disk is freed (≥ 25 GB to leave margin). | If disk can't be freed: test the device leg on another desktop Chrome machine. The cloud leg and code cards work everywhere today. |
| **Android** | From **Mon 16 Nov**, if a supported phone and disk are available: a thin Kotlin client (one screen like E-A) using `firebase-ai-ondevice`, the shared core via JavaScriptSandbox, App Check debug provider. Judges get an APK download link. | **Decision Wed 18 Nov.** Without a phone: an emulator build runs cloud-only, labelled honestly, or Android is cut. Never shown as on-device. |
| **iOS** | From **Tue 17 Nov**, if Xcode fits on disk: a thin SwiftUI client with `HybridModel`, the core via JavaScriptCore. On-device needs an Apple Intelligence device. | **Decision Wed 18 Nov.** Without a device: Simulator only (cloud, or the Simulator's model if Apple supports it there, verified first), labelled honestly. Judges can't install iOS builds without TestFlight, so iOS would be shown in the video and the repo only. |
Cost in time: each native client is 2–3 days on top of a plan that is already full. The cut order stays as in GATE; native clients come after the
web E-A freeze is safe, and they are cut before the E-B relay.

## What the owner must do (nothing was bought or created)
1. **Billing (Blaze)**: in the Firebase console → project "Talk Partner" → bottom-left **Upgrade** → **Create a Cloud Billing account** →
   enter a card (Google may ask for the account password first) → link it to `talk-partner`. Then we set the $10 and $25 budget alerts.
2. **Disk**: free ≥ 25 GB on this Mac (for Chrome's Gemini Nano; Xcode needs ~20 GB more on top). Today: ~3 GB free.
3. **Android (optional)**: access to a Gemini-Nano phone (Pixel 9 or newer, or Galaxy S25/S26) by Wed 18 Nov. No Play Console account is needed for an APK link.
4. **iOS (optional)**: an iPhone 16 or newer (or an M-series iPad) with Apple Intelligence. TestFlight for judges would need the paid
   Apple Developer Program: the owner decides; we don't buy it.

## Next (per the GATE plan; judge round 1 on Sun 15 Nov)
- Thu 12: build session 12:00 CST; install the Firebase CLI (if disk allows) and deploy a first page; reCAPTCHA Enterprise key, then App Check enforcement.
- Fri 13: headline rule (§2.5), either-or label check, engine-state matrix extended.
- Sat 14: open-question sources (§2.6–2.13); property tests.
- Sun 15: partner/person/About screens, consent flow, copy module, pictograms batch 1, judge mode v0 → **judge round 1** on the live URL.
