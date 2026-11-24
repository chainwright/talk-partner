// The web client: partner screen, person screen, About me, cloud help consent, first run, judge mode.
// All card logic is in the shared core (../../core); this file is UI, local storage and the Firebase engine.
// Every string a person reads comes from core/copy.ts.

import './styles.css';
import './simple.css';
import './fonts.css';
import { partnerActions } from '../../core/actions';
import { COPY, copyDevice, deviceKindFrom, deviceWords, setCopyDevice } from '../../core/copy';
import type { DeviceStatus, Engine } from '../../core/engine';
import { EMAIL_MAX, FEEDBACK_MAX, FEEDBACK_ROLES, feedbackDoc, type FeedbackError } from '../../core/feedback';
import { addAnswer, answerCounts, lastAnswer, topQuestions, whenText, type Answered } from '../../core/history';
import { needLine, needsCard } from '../../core/needs';
import { DEFAULT_SETTINGS, LEGS, REMOTE_KEYS, VOICE_MAX_SECONDS, defaultReport, type RuntimeSettings, type SettingsReport } from '../../core/models';
import { bodyDetailCard, makeCard, quizOverrideCard, repairCard } from '../../core/pipeline';
import { RECORDED_STEP } from '../../core/recorded';
import { badgeKind, countSwaps, sentLine, sessionReceipt, sessionTally } from '../../core/receipt';
import { BODY_REGIONS } from '../../core/rules';
import { SAMPLE_FIRST, SAMPLE_PROFILE, SAMPLE_QUESTIONS, SAMPLE_STEP } from '../../core/sample';
import { aiLines, aiTag, madeWhere, needsInternet, privacyLines, routeChip, sheetWanted, tryAiTag } from '../../core/simple';
import { NARROW_TASK, canNarrow, narrowCard, narrowInput, type NarrowInput } from '../../core/narrow';
import { aiPlace } from '../../core/simple';
import { daySummary, rulesSummary, todays, type DaySummary } from '../../core/summary';
import { asksWho, awayNames, callQuestion, followUps, nextInTopic, topics, type TopicId } from '../../core/topics';
import { after } from '../../core/tree';
import { NOTHING_FORGOTTEN, checkedSummary, forgetAll, forgetOne, keepOne, learned, learnedPrompt, shortcut, usual, usualFirst, usualHint, type Forgotten, type Need } from '../../core/prefs';
import { spokenLine } from '../../core/rules';
import { START_FRAME, addPhoto as addOwnPhoto, clampFrame, cleanWord, photoFor, removePhoto, type Frame, type Photo } from '../../core/photos';
import { framed, loadPhoto, type Loaded } from './photo';
import { stripQuestion } from '../../core/strip';
import { BACKUP_MAX_BYTES, addTo, backupText, makeBackup, readBackup, replaceWith, type Backup, type BackupPreview } from '../../core/backup';
import { addEntry, answerEntry, startedEntry, dayStart, dayText, diaryText, inSpan, laterEntry, logEntry, markDiary, needEntry, removeEntry, type DiaryEntry, type DiaryTopic, type LogKind, type Span } from '../../core/diary';
import { CLOUD_SLOW_MS, checkedCloud, type CloudError } from '../../core/engine';
import { P9 } from '../../core/copy9';
import { P10 } from '../../core/copy10';
import { hasHealth, NO_HEALTH, cleanHealth, cloudLines, insightCloudText, insightDevicePrompt, insights, type HealthNotes, type Insight, type InsightSpan } from '../../core/insights';
import { RELIABLE, careAnswer, guardExempt, markLessSure, reliability, reorder, tapsFrom } from '../../core/reliability';
import { checkReworded, rewordOnDevice, type RewordSource } from '../../core/reword';
import { addAsk, askOf, tipOfDay, type Ask } from '../../core/tip';
import { AI_QUESTION, TOPIC_BASE, WHERE_HURTS, topicOf } from '../../core/topics';
import { backupBlock, diaryLink, diaryScreen, guardBlock, importSheet, insightSheet, type InsightsModel } from './diary';
import { EMPTY_PROFILE, type BodyRegion, type Card, type CardWhy, type Choice, type Profile, type StepTrace, type SupportLevel } from '../../core/types';
import { webConfig } from './ai/config';
import { pickEngine } from './ai/pick';
import { fetchSettings } from './ai/remoteConfig';
import { CROSS, MIC, MIC_STOP, TICK, builtinPicto, monogram, photoTile, pictoFallback } from './pictos';
import { aboutSimple, answeredScreen, cardScreen, chipBlock, consentSheet, frameStyle, homeScreen, laterBlock, personSimple, photoSheet, shortBlock, tryAiBlock, type AboutRow } from './simple';
import { kvClear, kvGet, kvSet, setSampleScope } from './store';
import { P4 } from '../../core/copy4';
import { LETTER_CLOUD_TASK, letterCard, letterEnd, type LetterInput } from '../../core/letter';
import { checkedThings, photoEnd, photoQuestions, photoTalkCard, thingsQuestion, type PhotoQuestion } from '../../core/phototalk';
import { BODY_FIRST, FEEL_QUESTION, aboutCard, laterQuestion, menuTopic, starterOf, talkLead, talkMenu, talkPick, turnCard, turnLead, type Starter, type TalkPick } from '../../core/turn';
import { nextVisit, visitAlert, visitCard, visitLabel, visitStops, visitText, type VisitRecord } from '../../core/visit';
import { letterBy, letterButton, letterGrid, letterMoreButton, letterSheet, p4Links, photoTalkScreen, turnButton, turnLine, visitDone, visitScreen } from './phase4';
import { P5 } from '../../core/copy5';
import { FALL_HEAD } from '../../core/diary';
import { GUARD_TOPICS } from '../../core/reliability';
import { DEFAULT_NUMBER, WRONG_TILE, crisisAnswer, crisisLineFor, emergencyNumber, localeNumber, numberSet, redPlace, signNow, urgentAnswer, urgentAny, type RedPlace } from '../../core/redflag';
import { fromIsoDay, pickedQuestions, sinceLines, sinceText, toggleQuestion } from '../../core/since';
import { SpeakCache, isPcm, pcmRate, pcmToWav, speakText, speakable } from '../../core/speak';
import { P6 } from '../../core/copy6';
import { P7 } from '../../core/copy7';
import { ABOUT_LEADS, aboutWhatCard, moreCard, moreChoices, moreSubject, outWays, shownOn, typedCard, type MoreSubject } from '../../core/more';
import { understoodBlock } from './phase7';
import { aboutLearned, familyText, handoverText, riskyNotes } from '../../core/share';
import { handoverLink, shareSheet } from './phase6';
import { crisisBox, crisisScreen, fallBlock, hearButton, laterPainHtml, lowHelpLine, nowAlert, visitStopBox, numberField, sinceBlock, sinceControls, speakSheet, speakSwitch, readAloudLine, suddenFirst, suddenLink, suddenScreen, urgentBox } from './phase5';
import { loadTrial, trialAct, trialClock, trialInput, trialScreen } from './trial';
import { micDeps } from './mic';
import { createVoice, transcriptFrom, type VoiceView } from './voice';
import { P8 } from '../../core/copy8';
import { guessTopic, lowMood, signAnswer, timeText } from '../../core/diary';
/** Phase 8: a low answer to a question about how the person feels (not a photo): the helpline line follows on the carer's side. Phase 12: the diary's own rule (worried, scared, lonely, something bothering them). */
const lowMoodAnswer = lowMood;
import { addLater, agoText, answeredLater, askAgainLater, cleanLater, doneLater, laterOf, noLastTime, repairLine, shownLater, type Later } from '../../core/later';
import { NO_PASSPORT, OFF_UNTIL_TICKED, cleanPassport, passport, passportText, toggleLine, OWN_MAX, type PassportInput, type PassportPrefs } from '../../core/passport';
import { addEvent, cleanLog, lessSureCount, newLog, pickedPractice, practiceFlag, practiceReport, practiceText, practiceUrgent, togglePractice, type AskedBy, type PracticeEvent, type PracticeInput, type PracticeLog, type PracticeSpan, type Via } from '../../core/practice';
import { passportLink, passportScreen, practiceScreen, type PassPicture } from './care7';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
// "this phone" / "this tablet" / "this computer": the device is named once, before anything is drawn, and every string
// in core/copy.ts follows (setCopyDevice changes them in place, so the card pipeline's notes say the same word).
setCopyDevice(deviceKindFrom({
  userAgent: navigator.userAgent, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints,
  mobile: (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile,
}));
const C = COPY;
/** A string that is not in core/copy.ts (the sample questions' hover text, the diagram), with this device's word. */
const dw = (text: string) => deviceWords(text, copyDevice());

/** 'trial' is the hidden stopwatch for devlog/TRIAL_PROTOCOL.md: reachable only by typing #/trial, never linked. */
type Route = 'partner' | 'welcome' | 'about' | 'cloud' | 'person' | 'how' | 'feedback' | 'trial' | 'diary' | 'visit' | 'phototalk' | 'sudden' | 'crisis' | 'practice' | 'passport';

interface Settings {
  cloudHelp: boolean;
  support: SupportLevel;
  welcomed: boolean;
  /**
   * The partner has read that a spoken question is recorded and sent to Google's cloud, and said yes to the
   * microphone. A yes given to the earlier notice (the browser's speech recognition, 'local' / 'remote', the morning
   * of 17 Nov) does not count: it was a yes to something else.
   */
  voiceOk?: 'cloud' | 'local' | 'remote';
  /**
   * Which view "/" opens: the simple one (the default: one screen, one thing to do) or the full one (every fold, the
   * receipt, the links to judge mode). "See how it works inside" sets 'full', "Simple view" sets it back; the choice is
   * kept in this browser. Judge mode (#/demo) is always the full view and does not change this.
   */
  view?: 'simple' | 'full';
  /** Simple view: "How it works: 4 steps" is folded to one line. Set by the first confirmed answer, or by "Hide" / "Show". */
  howFolded?: boolean;
  /** Simple view: a first answer was confirmed in this browser (About them is offered only after that). */
  firstCard?: boolean;
  /** The diary's tip of the day is hidden ("Hide tips"); it stays hidden until "Show the tip of the day". */
  tipOff?: boolean;
  /** Read aloud is on (core/speak.ts): the words of each shown card go to Google to be spoken. Off until the carer says yes on its sheet. */
  speak?: boolean;
  /** The carer has said yes on the Read aloud sheet once: turning it on again needs no second sheet. */
  speakOk?: boolean;
}

interface State {
  /** Never null: a copy with no project settings gets the rules-only engine (ai/pick.ts), so code cards still work. */
  engine: Engine;
  /** 'checking' until the browser has answered the capability query: nothing is said about this computer before that. */
  device: DeviceStatus | 'checking';
  downloading: number | null;
  warming: boolean;
  profile: Profile;
  settings: Settings;
  /** Judge mode: the made-up family is loaded in memory; the real profile on disk is untouched. */
  demo: boolean;
  busy: boolean;
  card: Card | null;
  /** The card "We're stuck" replaced with the repair card; "Back to the choices" restores it. */
  before: Card | null;
  picked: Choice | null;
  confirmed: boolean;
  /** "Hide the choices": the person sees only the headline. */
  less: boolean;
  /** Confirmed answers this session, for the recap. */
  answers: { topic: string; label: string }[];
  recap: boolean;
  recapDone: boolean;
  lastQuestion: string;
  error: string | null;
  /** Confirmed answers kept on this computer (IndexedDB key 'history'); in judge mode, in memory only. Never sent. Today's answers are read by two on-device steps only (core/narrow.ts, core/summary.ts), never by a cloud step. */
  history: Answered[];
  /** When the card on screen was made: "last time" only looks at answers from before it. */
  cardAt: number;
  /** The card on screen is the one judge mode opened with (made in code before the first draw): it is shown without an entrance. */
  first: boolean;
  /** Every card made this session (judge mode tally). */
  made: Card[];
  /** The settings in use and where each came from: the in-code defaults until Firebase Remote Config answers (askSettings). */
  remote: SettingsReport;
  waitStart: number | null;
  consentChecked: boolean;
  saved: boolean;
  /** Judge mode, no on-device model in this browser: the recording of the on-device step is open (recordedBlock). */
  recorded: boolean;
  /** Simple view: the consent sheet is over the screen (a question needs online help and cloud help is off). */
  sheet: boolean;
  /** Simple view, About them: the row that is open. */
  aboutRow: AboutRow | null;
  /** Simple view, first screen: the topic whose questions are open (one at a time; kept while a question is asked). */
  topicOpen: TopicId | null;
  /** Simple view: "More tips" on the hand-over screen and "More" on the answered screen are open (closed for each new card). */
  tips: boolean;
  more: boolean;
  /** The family's own photos (core/photos.ts), kept on this device only (IndexedDB key 'photos'). Never sent. No model looks at them, but for the on-device model when the carer asks it to in "Talk about a photo" (lookAtPhoto). */
  photos: Photo[];
  /** A photo being added in About them: framed by hand, then given its word. */
  photoDraft: { loaded: Loaded; frame: Frame; step: 'frame' | 'label'; framed: string; word: string; error: string } | null;
  photoError: string;
  /** The needs pointed to on the quick-needs board, kept on this device (IndexedDB key 'needs'): for what is learned (core/prefs.ts). Never sent. */
  needsLog: Need[];
  /** What the carer removed, kept or reset of what was learned (IndexedDB key 'learned'). */
  forgotten: Forgotten;
  /** About them: the on-device model's short summary of what was learned (where the browser has it), or null. */
  learnedShort: string[] | null;
  /** Simple view: the short question offered beside the tree's next question (core/prefs.ts, shortcut), while it is being asked. */
  shortcut: { q: string; of: string; label: string } | null;
  /** Simple view: the questions asked in this conversation, in order (core/tree.ts: three at most, none twice). A question from the topics or the field starts a new one. */
  chain: string[];
  /** A newer build has taken over in this browser (the service worker changed): the bar offers to load it. */
  updateReady: boolean;
  /** Simple view: the answered card About them is offered on (at most one a visit), and "Not now". */
  inviteFor: Card | null;
  inviteOff: boolean;
  /** Simple view: the narrowing step being made or waiting for a yes on the consent sheet (core/narrow.ts). */
  narrowPending: NarrowInput | null;
  /** Simple view: "Today in short" (core/summary.ts), and whether the on-device model is still writing it. */
  short: DaySummary | null;
  shortBusy: boolean;
  shortCopied: boolean;
  /** The diary (core/diary.ts): confirmed answers, needs pointed to and the carer's one-tap log. On this device only (IndexedDB key 'diary'); never sent, never on the person's screen. */
  diary: DiaryEntry[];
  /** Health notes (core/insights.ts), from About them. On this device only (IndexedDB key 'health'); never in a cloud request. */
  health: HealthNotes;
  /** The flags of the questions asked (core/tip.ts): four marks and a time each, no words (IndexedDB key 'asks'). */
  asks: Ask[];
  diaryTab: Span;
  diaryTopic: DiaryTopic | 'all';
  /** The diary: what was just logged (for "Undo"), "Copied", and "the diary was deleted". */
  logged: { id: string; log: LogKind; at: number } | null;
  diaryCopied: boolean;
  diaryDeleted: boolean;
  /** The wording of the insight lines on screen: the rules' own, the on-device model's, or online help's (after a yes on the sheet). `key` names the lines it belongs to. */
  ins: { key: string; words: (string | null)[] | null; source: RewordSource; busy: boolean; note: '' | 'failed' | 'notSent' | 'refused' };
  /** The sheet that shows the exact text before the insight lines go to online help: null when it is not up. */
  insSheet: { key: string; text: string; request: string; sources: Insight[] } | null;
  /** How many times insight lines were handed to online help this session (the privacy line says so). */
  insSent: number;
  /** The tip of the day in the on-device model's words, for the tip text it belongs to. */
  tipWords: { of: string; words: string } | null;
  /** About them, "Keep a copy": the file chosen to bring back (shown before anything is replaced), an error, "done". */
  importDraft: { backup: Backup; preview: BackupPreview } | null;
  backupError: string;
  /** The line after a file was loaded ("replaced" or "added"); '' otherwise. */
  backupDone: string;
  /** Phase 10: "Include health notes" in the next file. Off until ticked, off again after each file, never kept on the device. */
  backupHealth: boolean;
  /** Phase 4 (core/letter.ts, core/turn.ts, core/visit.ts, core/phototalk.ts): see P4State. */
  p4: P4State;
}
interface P4State {
  /** The alphabet is on the person's screen: the question it is for, what was refused so far, the question's topic. */
  letter: { asked: string; rejected: string[]; topic: string | null } | null;
  /** "No, I don't know" was pointed to: one line on the carer's screen says that is fine. Nothing is counted. */
  letterNo: boolean;
  /** The letter step being made, or waiting for a yes on the sheet. */
  letterPending: LetterInput | null;
  /** The person started this conversation: with which starter, and the topic they pointed to. */
  turn: { starter: Starter | 'else'; topic: TopicId | null; what?: string; /** Phase 10: what was picked on "I want to talk about…". */ talk?: TalkPick } | null;
  /** The answers given before a doctor visit (IndexedDB key 'visit'): on this device only, apart from the history and the journal; never sent, read by no model. */
  visit: VisitRecord | null;
  /** The visit questions are on the person's screen; `visitEnd`: the last one was answered, the screen says thank you. */
  visitRun: boolean;
  visitEnd: boolean;
  visitCopied: boolean;
  /** Talk about a photo: the photo picked, what the on-device model named in it (null: not asked), and the state of that step. */
  talk: { id: string; things: string[] | null; look: 'busy' | 'none' | null } | null;
}

const cfg = webConfig();
const state: State = {
  engine: pickEngine(cfg),
  device: 'checking',
  downloading: null,
  warming: false,
  profile: { ...EMPTY_PROFILE },
  settings: { cloudHelp: false, support: 'more', welcomed: false }, // cloud help off by default (§1.5)
  demo: false,
  busy: false,
  card: null,
  before: null,
  picked: null,
  confirmed: false,
  less: false,
  answers: [],
  history: [],
  cardAt: 0,
  first: false,
  recap: false,
  recapDone: false,
  lastQuestion: '',
  error: null,
  made: [],
  remote: defaultReport(cfg ? 'off' : 'none'),
  waitStart: null,
  consentChecked: false,
  saved: false,
  recorded: false,
  sheet: false,
  aboutRow: null,
  topicOpen: null,
  tips: false,
  more: false,
  chain: [],
  photos: [],
  photoDraft: null,
  photoError: '',
  needsLog: [],
  forgotten: NOTHING_FORGOTTEN,
  learnedShort: null,
  shortcut: null,
  updateReady: false,
  inviteFor: null,
  inviteOff: false,
  narrowPending: null,
  short: null,
  shortBusy: false,
  shortCopied: false,
  diary: [],
  health: NO_HEALTH,
  asks: [],
  diaryTab: 'today',
  diaryTopic: 'all',
  logged: null,
  diaryCopied: false,
  diaryDeleted: false,
  ins: { key: '', words: null, source: 'rules', busy: false, note: '' },
  insSheet: null,
  insSent: 0,
  tipWords: null,
  importDraft: null,
  backupError: '',
  backupDone: '',
  backupHealth: false,
  p4: { letter: null, letterNo: false, letterPending: null, turn: null, visit: null, visitRun: false, visitEnd: false, visitCopied: false, talk: null },
};
/** When this page was opened: the simple view's "Today" list holds the answers confirmed since then. */
const pageStart = Date.now();
/** The simple view is what "/" shows unless the partner went inside (kept), or judge mode is on. */
// (phase 12b, judge round 9b) the sample family opened from a phone (#/sample) stays in the simple view
const simpleView = () => (!state.demo || sampleSimple) && state.settings.view !== 'full';
/** Phase 12b: the sample family is open in the simple view (a phone or a tablet), not in judge mode. */
let sampleSimple = false;
/** A phone or a tablet: no on-device model to download, and the sample family opens in the simple view. */
const handheld = () => copyDevice() !== 'computer';

// ---------------------------------------------------------------- routing
function route(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'demo') { if (!state.demo) void enterDemo().then(() => { render(); judgeStep(); }); return 'partner'; }
  if (h === 'sample') { if (!state.demo) { sampleSimple = true; void enterDemo().then(() => render()); } return 'partner'; }
  if (h === 'about') return 'about';
  if (h === 'cloud') return 'cloud';
  if (h === 'person') return 'person';
  // the quick-needs board, full screen: also reachable by its own address, with no question asked and no model
  if (h === 'needs') { if (state.card?.kind !== 'needs') openNeeds(); return 'person'; }
  // (phase 10) "I want to say something" from the home-screen shortcut (web/public/manifest.webmanifest): the person's
  // own start, by its own address. The address becomes the person's screen at once, so a later draw does not start it again.
  if (h === 'turn') { openTurn(); history.replaceState(history.state, '', '#/person'); return 'person'; }
  if (h === 'how') return 'how';
  if (h === 'diary') return 'diary';
  if (h === 'visit') return 'visit';
  if (h === 'phototalk') return 'phototalk';
  if (h === 'sudden') return 'sudden';
  // (phase 12) the safety screen after the person's "I can't go on"
  if (h === 'crisis') return 'crisis';
  if (h === 'practice') return 'practice';
  if (h === 'passport') return 'passport';
  if (h === 'feedback') return 'feedback';
  if (h === 'trial') return 'trial';
  // the simple view has no first-run screen: its first screen is the product
  if (h === 'welcome' || (!state.settings.welcomed && !state.demo && !simpleView())) return 'welcome';
  return 'partner';
}
/** Changes the hash (the hashchange event draws the screen); draws directly when the hash is already there. */
function go(r: Route | 'demo' | 'needs' | '') {
  const h = r ? `#/${r}` : '';
  if (location.hash.replace(/^#\/?$/, '') === h) { draw(); return; }
  // the simple view keeps one entry of its own in the browser's history (the guard below), so a step inside the app
  // changes the address in place: the phone's back button then goes one step back in the app, not through old screens.
  // The entry under the guard keeps the first screen's address, so going back to it never opens an inner screen again.
  if (simpleView() && r !== 'demo') {
    const url = h || location.pathname + location.search;
    if (h && !onGuard()) pushGuard(url); else history.replaceState(history.state, '', url);
    draw();
    return;
  }
  location.hash = h;
}

// ---------------------------------------------------------------- Back and Home (every view)
// The Back stack (18 Nov 2026, after the owner's walk on his phone: one tap on Back from the second question of a
// conversation landed on the first screen). Every screen that is drawn is a step: the first screen, a question
// before it is handed over, the answer, the next question, the diary, the visit page. "Back" and the phone's own
// back button pop exactly one step and show that screen as it was; the first screen is the bottom, and "Home"
// empties the stack.
// Phase 8 (judge round 7): the same in the full view and with the sample family, and the person's screens are steps
// too, with two folds, so that one step is one screen a person would call a step:
// - the check ("So: tea. Right?") and "Thank you" fold into the choices they confirm (`sub`): Back never lands on them;
// - a card handed over from the carer's screen folds into that carer's screen (`entry`): Back on the carer's side
//   goes from the answer to the question on the carer's screen, as before. A person's screen that followed another
//   person's screen (their own start, its topics and "Who is it about?", the alphabet and its words, the next
//   doctor-visit question) is a step of its own: Back from the carer's screen after it lands on it.
// The press and hold on the person's screen is "give the phone back": to the last carer's screen of the stack.
const VIEW = ['card', 'first', 'before', 'picked', 'confirmed', 'less', 'recap', 'recapDone', 'tips', 'more', 'lastQuestion', 'chain', 'topicOpen', 'error', 'cardAt', 'narrowPending', 'inviteFor'] as const;
interface Snap {
  key: string; route: string; view: Pick<State, typeof VIEW[number]>;
  p4: Pick<P4State, 'letterNo' | 'letterPending' | 'turn' | 'talk' | 'letter' | 'visitRun' | 'visitEnd'>;
  extra: unknown;
  /** How many doctor-visit answers there were (a step back to a visit question takes the later answers off again). */
  visitN: number;
  /** The call box of the conversation was up; `signNow`: over a confirmed yes to weakness or numbness (phase 12b). */
  urgent: boolean; signNow: boolean; red: RedPlace | null;
  /** A person's screen (key "person:…"); `sub`: the check or "Thank you" of one; `entry`: handed over from a carer's screen. */
  person: boolean; sub: boolean; entry: boolean;
}
const trail = { stack: [] as Snap[], current: null as Snap | null };
const cardIds = new WeakMap<Card, number>();
let cardIdSeq = 0;
/** One number for a card and for every further page of it: turning a page on the person's screen is not a step of the carer's. */
function cardId(c: Card): number {
  const known = cardIds.get(c);
  if (known) return known;
  const id = ++cardIdSeq;
  for (let p: Card | null | undefined = c; p; p = p.nextPage) if (!cardIds.has(p)) cardIds.set(p, id);
  return id;
}
/** Which screen is on: null while a card is being made (not a step). A person's screen starts with "person". */
function screenKey(r: Route): string | null {
  if (state.busy) return null;
  if (r === 'person') {
    if (state.p4.visitEnd) return 'person:visit-end';
    if (state.p4.letter) return `person:letter:${state.p4.letter.asked}`;
    const c = state.card;
    if (!c) return null;
    return `person:${cardId(c)}${state.recapDone ? ':recap-done' : state.recap ? ':recap' : state.confirmed ? ':done' : state.picked ? ':check' : ''}`;
  }
  if (r === 'phototalk') return `phototalk:${state.p4.talk?.id ?? ''}`;
  // the passport is two steps: the lines to decide on, then the page as it prints
  if (r === 'passport') return p8.page ? 'passport:page' : 'passport';
  if (r !== 'partner') return r;
  const c = state.card;
  if (!c) return 'home';
  return `card:${cardId(c)}:${state.confirmed && state.picked && !state.recap && !state.recapDone ? `answered:${state.picked.label}` : state.recap ? 'recap' : state.recapDone ? 'recap-done' : 'ask'}${navExtra.key()}`;
}
/** A hook for a later screen that is a step of its own on the same card (the ways after "something else"). */
const navExtra = { key: (): string => '', take: (): unknown => ({ passPage: p8.page }), put: (x: unknown): void => { p8.page = !!(x as { passPage?: boolean } | null)?.passPage; } };
function takeSnap(key: string, entry: boolean): Snap {
  const view = Object.fromEntries(VIEW.map((k) => [k, k === 'chain' ? [...state.chain] : state[k]])) as Snap['view'];
  const person = key.startsWith('person');
  const P = state.p4;
  return {
    key, route: person ? 'person' : hashNow() === 'needs' || hashNow() === 'person' ? '' : hashNow(), view,
    p4: { letterNo: P.letterNo, letterPending: P.letterPending, turn: P.turn, talk: P.talk, letter: person ? P.letter : null, visitRun: person && P.visitRun, visitEnd: person && P.visitEnd },
    extra: navExtra.take(), visitN: P.visit?.answers.length ?? 0, urgent: p5.urgent, signNow: p5.signNow, red: p5.red,
    person, sub: person && /:(?:check|done|recap|recap-done)$/.test(key), entry: person && entry,
  };
}
/** Called at every draw: a new screen puts the one before it on the stack; a screen that is already on the stack cuts the stack back to it. */
function trackScreen(r: Route) {
  const key = screenKey(r);
  if (key === null) return;
  const cur = trail.current;
  let entry = key.startsWith('person') && !cur?.person;
  if (cur && cur.key !== key) {
    const at = trail.stack.findIndex((x) => x.key === key);
    if (at >= 0) { entry = trail.stack[at].entry; trail.stack.length = at; } else trail.stack.push(cur);
  } else if (cur) entry = cur.entry;
  if (key === 'home') trail.stack = [];
  trail.current = takeSnap(key, entry);
}
/** Puts a step back on the screen as it was, with the call box as it was then. */
function putSnap(x: Snap) {
  Object.assign(state, x.view, { chain: [...x.view.chain] });
  Object.assign(state.p4, x.p4);
  // a step back to a doctor-visit question: the answers given after it come off again (it is asked once more)
  const v = state.p4.visit;
  if (x.p4.visitRun && v && v.answers.length > x.visitN) { v.answers = v.answers.slice(0, x.visitN); v.done = false; void kvSet('visit', v); }
  navExtra.put(x.extra);
  p5.urgent = x.urgent; p5.signNow = x.signNow; p5.red = x.red ?? null;
  state.sheet = false; state.waitStart = null; state.busy = false;
  trail.current = x;
}
/**
 * One step back in the flow, for the "Back" button and for the phone's own back button or gesture. `from` is the
 * screen's address before the step ('' / 'person' / 'needs' / 'about'). Returns the address to be on afterwards, or
 * null when there was no step to take: from the first screen the browser's back leaves the app, as it should.
 */
function backStep(from: string): string | null {
  if (state.sheet) { state.sheet = false; return from; }
  if (p5.speakSheet) { p5.speakSheet = false; return from; }
  if (state.photoDraft) { state.photoDraft = null; return from; }
  if (state.insSheet) { state.insSheet = null; return from; }
  if (state.importDraft) { state.importDraft = null; return from; }
  if (p6.share) { p6.share = null; return from; }
  // exactly one step back on the stack, in every view (the folds are in the note above the stack)
  if (trail.current) {
    stopSound();
    // while a card is being made the step is not taken yet: the making is called off and the screen before it stays
    if (state.busy) { makeSeq++; putSnap(trail.current); return trail.current.route; }
    const onPerson = trail.current.person;
    let to = trail.stack.pop();
    while (to && (to.sub || (!onPerson && to.entry))) to = trail.stack.pop();
    if (to) { putSnap(to); return to.route; }
  }
  // nothing under this screen (it was opened by its own address, or after a reload): the screen it belongs to
  if (from === 'sudden' || from === 'crisis') return '';
  if (from === 'passport' && p8.page) { p8.page = false; return from; }
  if (from === 'visit' || from === 'phototalk') { if (from === 'phototalk' && state.p4.talk) { state.p4.talk = null; return from; } return ''; }
  // the alphabet goes back to the carer's screen it was opened from; the visit questions go back to their page
  if (from === 'person' && state.p4.letter) { state.p4.letter = null; return ''; }
  if (from === 'person' && (state.p4.visitRun || state.p4.visitEnd)) {
    if (state.card && state.picked && !state.confirmed) { state.picked = null; return from; }
    state.p4.visitRun = false; state.p4.visitEnd = false; resetCard(); return 'visit';
  }
  if (from === 'person' || from === 'needs') {
    const c = state.card;
    // the check ("So: tea. Right?") goes back to the choices; the choices go back to the carer's screen
    if (c && state.picked && !state.confirmed && !state.recap) { state.picked = null; return from; }
    if (c?.kind === 'needs' && !state.confirmed) resetCard();
    return '';
  }
  if (from) return '';
  const c = state.card;
  if (!c && !state.busy) return null;
  if (state.recap || state.recapDone) { state.recap = false; state.recapDone = false; return ''; }
  // from the answer: back to the same card, to show it again; from a card: back to the first screen
  if (c && state.confirmed && state.picked && !c.blocked && c.kind !== 'needs') { state.picked = null; state.confirmed = false; state.more = false; return ''; }
  makeSeq++; state.busy = false; state.lastQuestion = ''; state.error = null; dictated = false; resetCard();
  return '';
}
/** The press and hold on the person's screen: the phone goes back to the last carer's screen on the stack, as it was. Null: none is there. */
/** The person's screens on top of the stack come off, and nothing is put back. */
function dropPerson() { while (trail.stack.length && trail.stack[trail.stack.length - 1].person) trail.stack.length--; }
function backToCarer(): string | null {
  let at = trail.stack.length - 1;
  while (at >= 0 && trail.stack[at].person) at--;
  if (at < 0) return null;
  const to = trail.stack[at];
  trail.stack.length = at;
  putSnap(to);
  return to.route;
}
/** "Home": the first screen, from anywhere. */
function goHome() {
  clearP4(); p5.urgent = false; p5.signNow = false; p5.red = null; p5.voiceFailed = false; p5.speakSheet = false; stopSound();
  makeSeq++; state.busy = false; state.lastQuestion = ''; state.error = null; dictated = false; resetCard();
  history.replaceState(history.state, '', location.pathname + location.search);
  render(); window.scrollTo(0, 0);
}
const hashNow = () => location.hash.replace(/^#\/?/, '');
/** True on the first screen of the simple view (nothing to go back to inside the app). */
const atHome = () => !hashNow() && !state.card && !state.busy && !state.sheet;
/**
 * The guard: while the simple view is past its first screen, one extra history entry stands over the page's own, so
 * the phone's back button fires `popstate` here instead of leaving. Each back press takes one step back in the app;
 * the guard is put back while there is still a step to take, and taken away when "Home" brought the first screen.
 */
/** True while the entry the browser is on is the guard (read from the entry itself, so a reload or a typed address cannot leave it stale). */
const onGuard = () => !!(history.state as { tpGuard?: boolean } | null)?.tpGuard;
/** Puts the guard over the entry the browser is on, and marks that entry as the one under it (a back press lands there). */
function pushGuard(url: string) {
  // the entry under the guard always carries the first screen's address, also when the page was opened on an inner
  // one (a link straight to About them): a step back then lands on the first screen, never on the inner screen again
  history.replaceState({ tpBase: true }, '', location.pathname + location.search);
  history.pushState({ tpGuard: true }, '', url);
}
let skipPop = false;
// (phase 8: the app sets the scroll of every screen it draws; the browser's own restore put the first screen back at
// the scroll of an older entry when "Home" took the guard away: 490 px down after "Home" from two questions deep)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
/** The address the screen was drawn at last: after a back press the browser has already left it. */
let drawnAt = hashNow();
/**
 * Phase 9 (judge round 8 §7.5): a reload at once after the address changed could race the guard. The guard rewrites
 * the entry under it to the first screen's address and puts the inner one on a new entry; a reload that the browser
 * took between the two loaded the first screen (1 time in 4 in the organiser's hands, 6 in 20 here). Each draw notes
 * its screen for this tab (sessionStorage: the screen's name and the moment, nothing else); a reload within 3 s that
 * lands on the bare first-screen address with no guard opens the noted screen instead.
 */
const DRAWN_KEY = 'tp-drawn';
const RACE_MS = 3000;
function noteDrawn() { try { sessionStorage.setItem(DRAWN_KEY, JSON.stringify({ h: hashNow(), t: Date.now() })); } catch { /* no storage in this tab: nothing to restore */ } }
function restoreRacedRoute() {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type !== 'reload' || hashNow() || onGuard()) return;
    const d = JSON.parse(sessionStorage.getItem(DRAWN_KEY) ?? 'null') as { h?: unknown; t?: unknown } | null;
    if (!d || typeof d.h !== 'string' || !/^[a-z]+$/.test(d.h) || d.h === 'demo' || typeof d.t !== 'number' || Date.now() - d.t > RACE_MS) return;
    history.replaceState(history.state, '', `#/${d.h}`);
    drawnAt = hashNow();
  } catch { /* nothing noted: the first screen stands */ }
}
function keepGuard() {
  noteDrawn();
  drawnAt = hashNow();
  if (!simpleView()) return;
  if (!atHome() && !onGuard()) pushGuard(location.href);
  else if (atHome() && onGuard()) { skipPop = true; history.back(); }
}
/** One step back, taken now (the "Back" button where no guard stands, and every back press of the browser). */
function stepBack(from: string) {
  const to = backStep(from);
  if (to === null) return;
  const url = to ? `#/${to}` : location.pathname + location.search;
  // the browser is on the entry under the guard: an inner address goes on a new guard, never on that entry
  if (simpleView() && to && !onGuard()) pushGuard(url); else history.replaceState(history.state, '', url);
  render(); window.scrollTo(0, 0);
}
window.addEventListener('popstate', () => {
  if (skipPop) { skipPop = false; return; }
  // only a step back onto the entry under the guard: a typed or linked address is a new entry, drawn by `hashchange`
  if (!simpleView() || !(history.state as { tpBase?: boolean } | null)?.tpBase) return;
  stepBack(drawnAt);
});

/**
 * The family's own data in memory, emptied (23 Nov 2026: on a phone "Try it with the Millers" showed the family's own
 * diary, health notes and learned lines, because only the profile and the answers were swapped). Used when the sample
 * family opens, and again when it is left, before the family's own lists are read back from this device.
 */
function clearFamily() {
  state.profile = { ...EMPTY_PROFILE, people: [] }; state.history = []; state.needsLog = []; state.forgotten = NOTHING_FORGOTTEN;
  state.learnedShort = null; state.photos = []; state.photoDraft = null; state.diary = []; state.health = NO_HEALTH; state.asks = [];
  state.logged = null; state.diaryCopied = false; state.diaryDeleted = false; state.importDraft = null; state.backupError = ''; state.backupDone = '';
  state.backupHealth = false; state.ins = { key: '', words: null, source: 'rules', busy: false, note: '' }; state.insSheet = null; state.tipWords = null;
  state.p4.visit = null; p8later.list = []; p8later.asking = null; p8.log = newLog(Date.now()); p8.picked = []; p8.pass = NO_PASSPORT; p8.page = false; p8.health = false;
  p6.share = null; clearP4();
}
/** What was on screen in this page before the sample family opened (in memory only, never stored): back when it is left. */
let beforeSample: { answers: State['answers']; made: Card[] } | null = null;
function enterDemo(): Promise<void> {
  if (state.demo) return Promise.resolve();
  state.demo = true;
  // the sample family reads and writes a store of its own in memory: the family's own lists on this device are
  // neither shown nor changed while it is open (web/src/store.ts, `setSampleScope`)
  setSampleScope(true);
  beforeSample = { answers: state.answers, made: state.made };
  state.answers = []; state.made = [];
  clearFamily();
  state.profile = SAMPLE_PROFILE;
  resetCard();
  // (phase 12b) on a phone the sample family opens on the simple view's first screen, with no card made for it
  return sampleSimple ? Promise.resolve() : firstCard();
}
/**
 * Judge mode opens with one card already made, so the first thing on screen is the product and not an empty pane.
 * The question is one that code decides alone (core/sample.ts, `SAMPLE_FIRST`): no model runs, nothing is sent, and
 * the card is there before the first draw. It is a real card from the same pipeline as every other and it is counted
 * in the session line and the receipt like any other.
 */
async function firstCard(): Promise<void> {
  try {
    const card = await makeCard(SAMPLE_FIRST, {
      profile: SAMPLE_PROFILE, support: state.settings.support, engine: state.engine,
      allowCloud: state.settings.cloudHelp, deviceReady: state.device === 'available', routing: routing(),
    });
    if (!state.demo || state.card || state.busy) return; // a question was asked meanwhile, or judge mode was left
    state.lastQuestion = SAMPLE_FIRST;
    setCard(card);
    state.made.push(card);
    state.first = true;
  } catch { /* no first card: the screen opens empty, as it did before */ }
}
async function leaveDemo() {
  state.demo = false; sampleSimple = false;
  setSampleScope(false);
  clearFamily();
  if (beforeSample) { state.answers = beforeSample.answers; state.made = beforeSample.made; beforeSample = null; }
  resetCard();
  await load();
  go('');
}
function resetCard() { state.tips = false; state.more = false; state.sheet = false; state.card = null; state.first = false; state.before = null; state.picked = null; state.confirmed = false; state.less = false; state.recap = false; state.recapDone = false; state.waitStart = null; }
/**
 * Every new card the person is shown (a made card, a body-map step, the next page, the override) bumps this counter.
 * The render keys the entrance animation on it and on the route, so an animation plays once per real event and never
 * again on a redraw caused by a tap, a toggle or a status update.
 */
let cardSeq = 0;
function setCard(c: Card | null) { state.card = c; state.first = false; if (c) { cardSeq++; state.cardAt = Date.now(); } }

// ---------------------------------------------------------------- persistence
async function load() {
  // every key is asked for at once, so all of them come from the same store; if the sample family was opened while
  // they were being read (a tap during the first load), only this browser's settings are taken, and none of the
  // family's own lists reach the sample family's screens (23 Nov 2026)
  const [p, s, h, n, ph, f, d, hn, a, lt, v, pr, pa, ps] = await Promise.all([
    kvGet<Profile>('profile'), kvGet<Settings>('settings'), kvGet<Answered[]>('history'), kvGet<Need[]>('needs'),
    kvGet<Photo[]>('photos'), kvGet<Forgotten>('learned'), kvGet<DiaryEntry[]>('diary'), kvGet<HealthNotes>('health'),
    kvGet<Ask[]>('asks'), kvGet<Later[]>('later'), kvGet<VisitRecord>('visit'), kvGet<PracticeLog>('practice'),
    kvGet<string[]>('practiceAsk'), kvGet<PassportPrefs>('passport'),
  ]);
  if (s) state.settings = { ...state.settings, ...s };
  if (state.demo) return;
  if (p) state.profile = { ...EMPTY_PROFILE, ...p, people: p.people ?? [] };
  if (Array.isArray(h)) state.history = h;
  if (Array.isArray(n)) state.needsLog = n;
  if (Array.isArray(ph)) state.photos = ph;
  if (f) state.forgotten = { ...NOTHING_FORGOTTEN, ...f };
  if (Array.isArray(d)) state.diary = d;
  state.health = cleanHealth(hn);
  if (Array.isArray(a)) state.asks = a;
  p8later.list = cleanLater(lt);
  if (v && Array.isArray(v.answers)) state.p4.visit = v;
  // phase 7: the log of the conversations starts the first time a build that has it runs here, and says so on its page
  p8.log = cleanLog(pr, Date.now());
  if (!pr) void kvSet('practice', p8.log);
  p8.picked = pickedPractice(pa);
  p8.pass = cleanPassport(ps);
}

// ---------------------------------------------------------------- phase 5: the call box, Read aloud, since the last visit
/**
 * What phase 5 keeps for the session. `urgent`: an answer of this conversation can be urgent (core/redflag.ts), so the
 * boxed "Call [number] now if this is new or sudden" stays up until a new conversation starts. `once`: the carer said
 * "Just this once" on the sheet, so the next request may use online help, and only that one. `spoken`: the cards whose
 * words went to Google to be read aloud; `speakSent`: how many requests were handed over.
 */
const p5 = {
  urgent: false, once: false, speakSheet: false, speakSent: 0,
  /** Phase 12b: a yes to sudden weakness or numbness in this conversation: the box says "Call … now. Note the time it started." */
  signNow: false,
  /** Phase 13: the conversation's red flag (core/redflag.ts, redPlace): a chest or head pain, a breathing / weak / numb yes. */
  red: null as RedPlace | null,
  hear: 'ready' as 'ready' | 'loading' | 'failed',
  /** Phase 8: Read aloud failed on the person's screen; the carer's next screen of this conversation says so. */
  voiceFailed: false,
  spoken: new WeakSet<Card>(),
  sounds: new SpeakCache<string>(),
  audio: null as HTMLAudioElement | null,
};
/** Phase 8: the questions left for later (IndexedDB key 'later'; core/later.ts). */
const p8later = { list: [] as Later[], /** Phase 9: the care question whose "Done" asks "Did you find out?" now. */ asking: null as Later | null };
const saveLater = () => { if (!state.demo) void kvSet('later', p8later.list); };
/**
 * Phase 9: a question is left for later (the tile "later", the answer "later" to talking now or later, or the person's
 * own "Not now"). A care question is pinned on Home and written to the diary, so the visit page names it. Never for
 * the sample family.
 */
function leaveForLater(q: string, topic: string | null) {
  if (state.demo) return;
  const at = Date.now();
  p8later.list = addLater(p8later.list, q, at, topic); saveLater();
  if (p8later.list.find((x) => x.q === q)?.care) { state.diary = addEntry(state.diary, laterEntry(q, at, (topic as DiaryTopic | null) ?? null)); saveDiary(); }
}
/** "14:37" today; "Tue 17 Nov, 14:37" for an older one (a care question stays for days). */
const laterTime = (at: number) => (dayStart(at) === dayStart(Date.now()) ? timeText(at) : `${dayText(at)}, ${timeText(at)}`);
/** Phase 8: the carer's line after Read aloud failed on the person's screen (never on the person's screen itself). */
const voiceFailedHtml = () => (p5.voiceFailed ? `<p class="warn" id="voice-failed" role="status">${esc(P5.speak.failed(state.profile.personName.trim()))}</p>` : '');
/**
 * The emergency number the call buttons use: About them's; else (phase 9) the one the browser's language setting
 * most likely means (en-GB 999, the EU 112, else 911), with "Is this your emergency number?" beside the box. The sample
 * family is American: 911, and no question.
 */
const callNumber = () => emergencyNumber(state.health.emergency, state.demo ? DEFAULT_NUMBER : localeNumber(navigator.language));
const numberGuess = () => !state.demo && !numberSet(state.health.emergency);
/**
 * Phase 12: after "I can't go on", the phone given back opens the safety screen, with the carer's answer screen (its red
 * box) under it, so Back from the safety screen lands there and not on the person's card.
 */
function toCrisis() {
  // the simple view draws at once (no hashchange); the full view changes the hash and draws on its event
  // (no lift animation here: its draw would come after the second step, and the answer screen would never be drawn)
  lift = false;
  if (simpleView()) { go(''); go('crisis'); return; }
  window.addEventListener('hashchange', () => go('crisis'), { once: true });
  go('');
}
/** Phase 12: the crisis line of the safety screen: the family's own helpline (About them), else the region's where we know one (the sample family is American: 988). */
const crisisLineNow = () => crisisLineFor(state.health.helpline ?? '', callNumber());
/** The crisis line as a second button: none when it is only the emergency number itself. */
const crisisLineButton = () => { const l = crisisLineNow(); return l === callNumber() ? '' : l; };
/** Read aloud can run here at all: a copy with project settings, and never the sample family. */
const canSpeak = () => !!state.engine.speak && state.engine.cloudConfigured && !state.demo;
const speakOn = () => canSpeak() && !!state.settings.speak;
const stopSound = () => { p5.audio?.pause(); p5.audio = null; };
function patchHear() {
  const el = document.querySelector('#hear, #hear-failed');
  if (el) el.outerHTML = hearButton(p5.hear);
}
/**
 * The card on the person's screen, read aloud (core/speak.ts): its question and its choices, through the engine's
 * `speak` (Firebase AI Logic, a Gemini text-to-speech model, ONLY_IN_CLOUD). Only when the carer turned Read aloud
 * on. A card is sent once: "Hear it again" plays the kept sound. Never a doctor-visit card.
 */
async function hear() {
  const c = state.card;
  if (!speakOn() || !speakable(c) || !state.engine.speak) return;
  const text = speakText(c);
  stopSound();
  const play = (url: string) => { const a = new Audio(url); p5.audio = a; void a.play().catch(() => { /* the browser wants a tap first: the button is there */ }); };
  const kept = p5.sounds.get(text);
  if (kept) { p5.hear = 'ready'; patchHear(); play(kept); return; }
  if (!isOnline()) return;
  p5.hear = 'loading'; patchHear();
  p5.speakSent++; p5.spoken.add(c);
  try {
    const r = await checkedCloud(state.engine, () => state.engine.speak!(text));
    const raw = Uint8Array.from(atob(r.base64), (ch) => ch.charCodeAt(0));
    const bytes = isPcm(r.mimeType) ? pcmToWav(raw, pcmRate(r.mimeType)) : raw;
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: isPcm(r.mimeType) ? 'audio/wav' : r.mimeType }));
    p5.sounds.set(text, url);
    p5.hear = 'ready'; p5.voiceFailed = false;
    if (state.card === c && route() === 'person' && !state.picked) { patchHear(); play(url); }
  } catch (e) {
    if ((e as CloudError).notSent) { p5.speakSent--; p5.spoken.delete(c); }
    p5.hear = 'failed'; p5.voiceFailed = true;
    if (state.card === c) patchHear();
  }
}
// ---------------------------------------------------------------- phase 7: for the speech therapist, and the passport
/**
 * What phase 7 keeps. `log`: the conversations as rows with no word of a question or an answer (core/practice.ts;
 * IndexedDB key 'practice'), from the day this build first ran here. `span`, `health`: the page for the speech
 * therapist as it stands on the screen; the box for the needs and pain answers is off every time the page is opened.
 * `picked`: the questions for the therapist (key 'practiceAsk'). `pass`: the carer's settings of the passport (key
 * 'passport'); `page`: the passport is shown as it prints (the second step). On this device only; nothing is sent.
 */
const p8 = {
  log: newLog(Date.now()) as PracticeLog,
  span: 'week' as PracticeSpan,
  health: false,
  picked: [] as string[],
  pass: NO_PASSPORT as PassportPrefs,
  page: false,
  /** Where the last question came from, for when it is asked again after a yes on the consent sheet. */
  lastBy: { q: '', by: 'typed' as AskedBy },
};
/** Set just before `make` by the caller that knows where the question came from; 'none' for a question that is not counted (asked again, or the person's own start). */
let askBy: AskedBy | 'none' | null = null;
/** One row of the log. Never for the sample family. */
function notePractice(e: PracticeEvent) {
  if (state.demo) return;
  p8.log = addEvent(p8.log, e);
  void kvSet('practice', p8.log);
}
/** The card an answer was confirmed on, as far as the counts need it (no word of it is kept). */
const viaOf = (c: Card, p: Choice): Via => (p.role === 'repair' || c.kind === 'repair' ? 'repair' : c.kind === 'needs' ? 'needs' : c.turn ? 'turn' : c.letter ? 'letter' : c.typed ? 'typed' : c.more ? 'more' : c.aboutWhat ? 'about' : c.narrow ? 'narrow' : c.kind === 'body' || c.kind === 'pain' ? 'body' : 'card');
/** The page for the speech therapist is built from this: the diary is handed over only when the box is ticked. */
const practiceInput = (): PracticeInput => ({ log: state.demo ? newLog(Date.now()) : p8.log, span: p8.span, now: Date.now(), name: state.profile.personName.trim(), device: copyDevice(), speak: speakOn(), questions: p8.picked, diary: p8.health && !state.demo ? state.diary : null, number: callNumber(), lessSure: state.demo ? 0 : lessSureCount(state.history, p8.span, Date.now()), flag: !p8.health && !state.demo && practiceFlag(state.diary, p8.span, Date.now()) });
/** The passport is built from this: About them, the answers that still count, what was learned, the photos' words (never a picture). */
const passportInput = (): PassportInput => ({ profile: state.profile, history: learns() ? state.history.filter((h) => h.at > state.forgotten.all) : [], learned: learns() ? aboutLearned(learned(state.history, state.needsLog, state.forgotten)) : [], photoWords: state.photos.map((x) => x.word), prefs: p8.pass, now: Date.now(), device: copyDevice(), number: callNumber(), numberSet: numberSet(state.health.emergency) ? callNumber() : '', foodCare: state.health.diabetes || state.health.swallowing || state.health.fluidLimit });
const savePassport = () => { if (!state.demo) void kvSet('passport', p8.pass); };
/** The pictures of the printed passport: each person of About them with their own photo or an initial, then the family's other photos. Eight at most. */
function passPictures(): PassPicture[] {
  const out = new Map<string, PassPicture>();
  for (const x of state.profile.people) { const n = x.name.trim(); if (n) out.set(n.toLowerCase(), { word: n, data: x.photo ?? photoFor(n, state.photos)?.data ?? '' }); }
  for (const x of state.photos) if (!out.has(x.word.toLowerCase())) out.set(x.word.toLowerCase(), { word: x.word, data: x.data });
  return [...out.values()].slice(0, 8);
}
function practiceView(): string {
  const now = Date.now();
  return practiceScreen({ name: state.profile.personName.trim(), device: copyDevice(), span: p8.span, report: practiceReport(practiceInput()), health: p8.health, warn: !p8.health && !state.demo && practiceUrgent(state.diary, p8.span, now) ? P8.practice.healthWarn(callNumber()) : '', picked: p8.picked, any: !state.demo && p8.log.events.length > 0 });
}
const passportView = () => passportScreen({ name: state.profile.personName.trim(), device: copyDevice(), passport: passport(passportInput()), prefs: p8.pass, page: p8.page, pictures: passPictures() });

// ---------------------------------------------------------------- phase 6: where a line came from, and sharing
/** "See the entries": the lines that are open, by key (an insight id, or "since-N" on the doctor-visit page). In memory only. */
const p6 = {
  open: [] as string[],
  /**
   * The sheet before a text is shared (core/share.ts): which text, whether the health notes are ticked in (off every
   * time the sheet opens), the exact text as the sheet shows it, and what happened. "Share" and "Copy" hand over this
   * text and no other. In memory only: nothing of it is stored.
   */
  share: null as { kind: 'family' | 'handover' | 'practice' | 'passport'; health: boolean; text: string; status: '' | 'shared' | 'copied' | 'shareFailed' | 'copyFailed'; from: string } | null,
  /** How many times a text was handed to the share sheet or copied this session (the privacy line says so). */
  shared: 0,
};
const canShare = () => typeof (navigator as Navigator & { share?: unknown }).share === 'function';
/** The text of the open sheet, built again by the rules: with the health notes only when the box is ticked (the builder is not handed them otherwise). */
function shareTextNow(kind: 'family' | 'handover' | 'practice' | 'passport', health: boolean): string {
  // (phase 7: the text of a page that is on the screen; what is in it was decided there, not on the sheet)
  if (kind === 'practice') return practiceText(practiceInput());
  if (kind === 'passport') return passportText(passportInput());
  const base = { diary: state.diary, health: health ? state.health : null, name: state.profile.personName.trim(), now: Date.now(), number: callNumber() };
  return kind === 'family' ? familyText({ ...base, span: state.diaryTab }) : handoverText({ ...base, learned: learns() ? aboutLearned(learned(state.history, state.needsLog, state.forgotten)) : [], safety: { swallowing: state.health.swallowing, fluidLimit: state.health.fluidLimit }, open: shownLater(p8later.list, Date.now()).filter((x) => x.care).map((x) => ({ q: x.q, at: x.at, pain: !!x.pain })) });
}

/** A card the rules made after "something else" goes onto the carer's screen like any other card: said out loud, then shown. */
function showRuleCard(card: Card) {
  makeSeq++; state.busy = false; state.error = null;
  state.before = null; setCard(card); state.made.push(card);
  state.picked = null; state.confirmed = false; state.less = false; state.recap = false; state.recapDone = false; state.more = false; state.waitStart = Date.now();
  render(); window.scrollTo(0, 0);
}
/** "Yes: type it": the carer's word on a card on the person's screen; they point to it and the check follows ("So: juice. Right?"). */
function checkTyped(raw: string) {
  const asked = state.before && state.before.kind !== 'needs' && state.before.kind !== 'repair' ? state.before.asked : '';
  const card = typedCard(raw, asked, state.profile, state.settings.support);
  if (!card) { document.querySelector<HTMLInputElement>('#understood-word')?.focus(); return; }
  // (the word goes onto the person's screen as a choice: only their own tap picks it, and only their yes confirms it)
  showRuleCard(card);
  lift = true; go('person');
}
function closeShare() {
  const from = p6.share?.from;
  p6.share = null;
  render();
  if (from) document.querySelector<HTMLElement>(`#${from}`)?.focus({ preventScroll: true });
}

/** "Since the last visit", for the doctor-visit page: the diary's counts from the day the carer named, and the picked questions. */
function sinceModel() {
  const r = state.p4.visit;
  return { name: state.profile.personName.trim(), since: sinceLines(state.demo ? [] : state.diary, r?.since ?? null, Date.now(), r?.answers ?? [], state.profile.personName.trim()), picked: pickedQuestions(r?.carerAsk), number: callNumber(), open: p6.open.filter((k) => k.startsWith('since-')).map((k) => Number(k.slice(6))), diary: state.demo ? [] : state.diary };
}

/** After a yes on the sheet: the step the sheet came up for is asked again (a letter, a narrowing step, or the question itself). */
function askAgain() {
  if (state.card?.letter && state.p4.letterPending) void runLetter(state.p4.letterPending); else if (state.card?.narrow && state.narrowPending) void runNarrow(state.narrowPending); else void make(state.lastQuestion);
}

// ---------------------------------------------------------------- phase 3: the guard, the diary, the insights, the tip (carer's side only)
/** What the answer-reliability guard notices now (core/reliability.ts): rules, from the answers kept on this device. Never for the sample family. */
const guardNow = () => (learns() ? reliability(tapsFrom(state.history), Date.now()) : RELIABLE);
/** The guard's line, never on a card about pain, the toilet, help or a need: such an answer is taken as said (core/reliability.ts, careAnswer). */
const careTopic = (c: Card) => topicOf(state.chain[0] ?? c.asked, state.profile)?.id ?? topicOf(c.asked, state.profile)?.id ?? null;
const guardHtml = (c?: Card, label = '') => (c && (c.kind === 'needs' || c.kind === 'body' || c.kind === 'pain' || c.kind === 'feeling' || guardExempt(c.asked, label, careTopic(c))) ? '' : guardBlock({ name: state.profile.personName.trim(), flags: guardNow().flags }));
/**
 * While the guard is on, the next either-or shows its answers in a different order (none removed; the line to say
 * follows). A yes / no card, a scale and a paged list keep their order.
 */
function guardOrder(c: Card): Card {
  if (c.kind !== 'choice' || c.nextPage || c.scale || c.blocked || !guardNow().flags.length) return c;
  c.choices = [...reorder(c.choices.filter((x) => x.role === 'answer')), ...c.choices.filter((x) => x.role !== 'answer')];
  c.say = spokenLine(c.asked, c.choices.map((x) => x.spoken));
  return c;
}
const saveDiary = () => { if (!state.demo) void kvSet('diary', state.diary); };
/** The flags of a card that was just made, kept for the tip of the day (no word of the question is kept). */
function noteAsk(c: Card) {
  if (state.demo) return;
  state.asks = addAsk(state.asks, askOf(c, Date.now()));
  void kvSet('asks', state.asks);
}
const insKey = (span: InsightSpan, lines: Insight[]) => `${span}|${lines.map((l) => l.text).join('|')}`;
/**
 * The insight lines of the diary's tab, and their wording. The lines are rules (core/insights.ts). Where this browser
 * has the on-device model they are put into plainer words there (ONLY_ON_DEVICE; the check in core/reword.ts decides);
 * online help words them only after a yes on the sheet (the 'ins-yes' action). No cloud step starts from here.
 */
function insightsModel(span: InsightSpan): InsightsModel {
  const lines = insights(state.diary, state.health, span, Date.now(), callNumber());
  const key = insKey(span, lines);
  if (state.ins.key !== key) {
    const worded = lines.filter((l) => l.id !== 'nothing');
    const onDevice = !state.demo && worded.length > 0 && worded.length === lines.length && state.device === 'available' && !!state.engine.rewordDevice;
    state.ins = { key, words: null, source: 'rules', busy: onDevice, note: '' };
    if (onDevice) {
      void rewordOnDevice(lines.map((l) => l.text), insightDevicePrompt(lines, state.health), state.engine, true).then((r) => {
        if (state.ins.key !== key) return;
        // (a line with a fixed "whom to tell" sentence keeps the rules' own words: no model rewords it)
        state.ins = { key, words: r.source === 'on-device' ? r.lines.map((w, i) => (lines[i].act ? null : w)) : null, source: r.source, busy: false, note: '' };
        if (route() === 'diary') render();
      });
    }
  }
  const sendable = cloudLines(lines).length > 0 && !state.demo && state.engine.cloudConfigured && !!state.engine.rewordCloud && (state.device === 'unavailable' || state.device === 'downloadable');
  return { span, lines, words: state.ins.words, source: state.ins.source, busy: state.ins.busy, note: state.ins.note, cloud: sendable ? (isOnline() ? 'ask' : 'offline') : null, number: callNumber(), guess: numberGuess(), open: p6.open, diary: state.diary, now: Date.now() };
}
/** The tip of the day (core/tip.ts: rules), and where the browser has the on-device model, its sentence in plainer words (ONLY_ON_DEVICE). */
function tipModel() {
  const tip = state.demo ? null : tipOfDay(state.asks, Date.now());
  if (tip && !state.settings.tipOff && state.tipWords?.of !== tip.text && state.device === 'available' && state.engine.rewordDevice) {
    state.tipWords = { of: tip.text, words: '' };
    void rewordOnDevice([tip.text], `1. ${tip.text}`, state.engine, true).then((r) => {
      if (state.tipWords?.of !== tip.text || r.source !== 'on-device') return;
      state.tipWords = { of: tip.text, words: r.lines[0] };
      if (route() === 'diary') render();
    });
  }
  return { tip, words: tip && state.tipWords?.of === tip.text && state.tipWords.words ? state.tipWords.words : null, off: !!state.settings.tipOff };
}
function diaryView(): string {
  const now = Date.now();
  return diaryScreen({
    name: state.profile.personName.trim(), tab: state.diaryTab, topic: state.diaryTopic, now,
    entries: inSpan(state.diary, state.diaryTab, now, state.diaryTopic), any: state.diary.length > 0, logged: state.logged,
    insights: state.diaryTab === 'today' ? null : insightsModel(state.diaryTab), tip: tipModel(), copied: state.diaryCopied, deleted: state.diaryDeleted,
    // after a logged fall: when to call, the call button, and one tap to note a blow to the head
    fallHtml: state.logged?.log === 'fall' ? fallBlock({ number: callNumber(), guess: numberGuess(), id: state.logged.id, head: state.diary.find((e) => e.id === state.logged!.id)?.label === FALL_HEAD }) : '',
  });
}
/** The yes on the sheet: these lines, this once, to online help for their wording. The text is the one the sheet showed. */
async function sendInsights() {
  const sheet = state.insSheet;
  if (!sheet || !state.engine.rewordCloud) return;
  state.insSheet = null;
  state.ins = { key: sheet.key, words: null, source: 'rules', busy: true, note: '' };
  state.insSent++;
  render();
  const done = (next: Partial<typeof state.ins>) => { if (state.ins.key !== sheet.key) return; state.ins = { ...state.ins, busy: false, ...next }; if (route() === 'diary') render(); };
  try {
    const r = await checkedCloud(state.engine, () => state.engine.rewordCloud!(sheet.text));
    const words = checkReworded(r.text, sheet.sources.map((l) => l.text));
    if (!words) { done({ note: 'refused' }); return; }
    // back onto the lines on screen: a line that did not go keeps the rules' own words
    const lines = insights(state.diary, state.health, sheet.key.split('|')[0] as InsightSpan, Date.now(), callNumber());
    done({ words: lines.map((l) => { const i = sheet.sources.findIndex((x) => x.text === l.text); return i < 0 ? null : words[i]; }), source: r.source });
  } catch (e) {
    if ((e as CloudError).notSent) state.insSent--;
    done({ note: (e as CloudError).notSent ? 'notSent' : 'failed' });
  }
}

// ---------------------------------------------------------------- what was learned (core/prefs.ts): on this device only
/** Nothing is learned from, or shown for, the sample family of judge mode. */
const learns = () => !state.demo;
const saveForgotten = () => { if (!state.demo) void kvSet('learned', state.forgotten); };
/**
 * Phase 9 (judge round 8, the nurse's seat): no "Last time they chose…" and no "So far: no ×5" before a question about
 * pain, the body, the toilet, a drink or feelings: last week's "no" must not prime the carer (or the person) today.
 * The same guard as `usualFor` (core/reliability.ts, careAnswer), with a drink as a need (core/later.ts, laterCare).
 */
const noPriming = (c: Card) => noLastTime(c, careTopic(c));
/** The person's usual answer to this card's question, for the carer's hint: null before three answers, and never for the body map, a scale, a narrowing card or a care question (core/reliability.ts, careAnswer). */
function usualFor(c: Card) {
  if (!learns() || c.blocked || c.narrow || c.scale || !['choice', 'yesno', 'feeling'].includes(c.kind)) return null;
  // never on a question about pain, the body, a feeling or a need (role-play round 4, 18 Nov: "Are you in pain? Usually: yes (4 of 4)"
  // could lead a carer to take the answer for granted, or to stop asking): such a question is asked fresh every time
  if (careAnswer(c.asked, '', careTopic(c))) return null;
  const u = usual(state.history, c.asked, state.forgotten);
  return u && c.choices.some((x) => x.label.toLowerCase() === u.label.toLowerCase()) ? u : null;
}
/**
 * The same card with the usual choice first among its answers (a suggestion to the carer; the person still chooses).
 * Only for an either-or or a list on one page: a yes / no and a scale keep their fixed order. No choice is removed.
 */
function usualOrder(c: Card): Card {
  const u = c.kind === 'choice' && !c.nextPage ? usualFor(c) : null;
  if (!u) return c;
  const answers = usualFirst(c.choices.filter((x) => x.role === 'answer'), u.label);
  // the same card (its record in the session stays the same object): its choices in the new order, and the line to say with them
  c.choices = [...answers, ...c.choices.filter((x) => x.role !== 'answer')];
  c.say = spokenLine(c.asked, c.choices.map((x) => x.spoken));
  return c;
}
/** The on-device model's short summary of the learned lines, where this browser has the model. ONLY_ON_DEVICE; there is no cloud step. */
let learnedSeq = 0;
function refreshLearnedShort() {
  const lines = aboutLearned(learned(state.history, state.needsLog, state.forgotten));
  const seq = ++learnedSeq;
  state.learnedShort = null;
  if (!learns() || lines.length < 2 || state.device !== 'available' || !state.engine.summarizeDevice) return;
  void state.engine.summarizeDevice(learnedPrompt(lines)).then((r) => {
    if (seq !== learnedSeq || r.source !== 'on-device') return;
    let sentences: unknown = null;
    try { sentences = (JSON.parse(r.text) as { sentences?: unknown }).sentences; } catch { /* not JSON: no summary */ }
    state.learnedShort = checkedSummary(sentences, lines);
    if (state.learnedShort && route() === 'about') render();
  }).catch(() => { /* no summary: the lines themselves stand */ });
}
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveProfile() {
  if (state.demo) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void kvSet('profile', state.profile).then(() => { state.saved = true; const el = document.querySelector('#saved'); if (el) el.textContent = C.about.saved; }); }, 250);
}
function saveSettings() { void kvSet('settings', state.settings); }

// ---------------------------------------------------------------- pieces
function nav(): string {
  const name = state.profile.personName;
  const cloud = state.settings.cloudHelp ? 'on' : 'off';
  return `<header class="top">
    <a class="brand" href="#/">${C.app.name}</a>
    <button class="needs-open" data-act="needs" title="${esc(C.needs.openTitle)}">${C.needs.open}</button>
    <nav aria-label="Sections">
      <button type="button" class="pill" data-act="simple">${SIGN_BACK}${C.simple.backSimple}</button>
      <a href="#/about">${esc(C.app.nav.about(name))}</a>
      <a href="#/cloud">${C.app.nav.cloud}: ${cloud}</a>
      <a href="#/how">${C.app.nav.how}</a>
      ${state.demo ? `<button class="link" data-act="leave-demo">${C.judge.exit}</button>` : `<a href="#/demo">${C.app.nav.judge}</a>`}
    </nav></header>`;
}
const SIGN_BACK = '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M56 20L28 48l28 28"/></svg>';
const footer = () => `<footer>${C.footer}</footer>`;

function statusLine(): string {
  if (!cfg) return `<span class="dot off"></span>${C.status.noConfig}`;
  // judge mode: the same line also says where the first step stands (judgeStep), and says plainly when this browser
  // has no on-device model to show
  const J = state.demo ? C.judge.step : null;
  const stepPending = J && step === 'waiting' && state.first;
  if (state.warming) return `<span class="dot wait"></span>${C.status.warming}${stepPending ? ` ${esc(J.waiting(SAMPLE_STEP))}` : ''}`;
  switch (state.device) {
    case 'checking': return `<span class="dot wait"></span>${C.status.checking}`;
    case 'available': {
      const more = !J ? '' : step === 'running' ? J.running(SAMPLE_STEP) : step === 'failed' && state.first ? J.failed : stepCard && state.card === stepCard ? J.done : '';
      return `<span class="dot ok"></span>${C.status.ready}${more ? ` <span class="step" data-step="${step}">${esc(more)}</span>` : ''}`;
    }
    case 'downloading': return `<span class="dot wait"></span>${C.status.downloading(state.downloading !== null ? `: ${Math.round(state.downloading * 100)}%` : '')}`;
    // (phase 12b, judge round 9b: a phone or a tablet is never offered the on-device model's download)
    case 'downloadable': if (handheld()) return `<span class="dot off"></span>${state.settings.cloudHelp ? C.status.unavailableCloudOn : `${C.status.unavailableCloudOff} <a href="#/cloud">${C.blocked.turnOn}</a>`}`;
      return stepPending
      ? `<span class="dot wait"></span>${esc(J.notDownloaded)} <button class="link" data-act="download">${C.status.download}</button> ${J.downloadSize}`
      : `<span class="dot wait"></span>${C.status.notDownloaded} <button class="link" data-act="download">${C.status.download}</button>`;
    default: {
      const tail = state.settings.cloudHelp ? C.status.unavailableCloudOn : `${C.status.unavailableCloudOff} <a href="#/cloud">${C.blocked.turnOn}</a>`;
      // judge mode says "no Gemini Nano here" only once that answer stands; until then it is still checking
      if (stepPending && !deviceFinal) return `<span class="dot wait"></span>${C.status.checking}`;
      return `<span class="dot off"></span>${stepPending ? esc(J.none) : C.status.unavailable} ${tail}`;
    }
  }
}

/**
 * Judge mode in a browser that cannot run the on-device step (no project settings, no Gemini Nano, or the model not
 * downloaded): a link under the status line, and behind it a recording of what that step made on our machine for
 * judge mode's first open question (core/recorded.ts, copied from a saved run log). It is a recording and says so:
 * the date, the commit, the SDK's own console line. No card is made for it, no engine is called and nothing is sent;
 * it changes no setting. The cloud step is offered next to it and stays behind the consent screen.
 * The link sits at the end of the "Sample family" line (no extra row above the card); the recording opens under the
 * status line.
 */
function recordedCan(): boolean {
  if (!state.demo) return false;
  return !cfg || state.device === 'downloadable' || state.device === 'downloading' || (state.device === 'unavailable' && deviceFinal);
}
function recordedLink(): string {
  return recordedCan() && !state.recorded ? ` <button class="link" data-act="recorded">${C.judge.recorded.link}</button>` : '';
}
function recordedBlock(): string {
  if (!recordedCan() || !state.recorded) return '';
  const R = C.judge.recorded;
  const D = RECORDED_STEP;
  const next = !state.engine.cloudConfigured ? R.noCloud
    : state.settings.cloudHelp ? `${R.cloudOn} <button class="chip" data-q="${esc(D.question)}">${R.askNow}</button>`
    : `${R.cloudOff} <a href="#/cloud">${R.cloudLink}</a>`;
  return `<section class="recorded" aria-label="${R.tag}">
    <p class="rec-head"><span class="rec-tag">${R.tag}</span> ${esc(R.label(D.date, D.commit, D.browser))}</p>
    <p class="rec-q">${esc(D.question)}</p>
    <p class="badge-line"><span class="badge device rec">${esc(D.badge)}</span><span class="tail">· ${esc(D.tail)}</span></p>
    <p class="rec-tiles">${D.tiles.map((t, i) => `<span${i === D.tiles.length - 1 ? ' class="out"' : ''}>${esc(t)}</span>`).join('')}</p>
    <p class="rec-sdk">${esc(R.sdk(D.inferenceSource))}<br><code>${esc(D.sdk)}</code></p>
    <p class="rec-compare">${esc(R.compare(D.cloudTiles.slice(0, -1).join(' / ')))}</p>
    <p class="rec-next">${next}</p>
    <p class="muted">${esc(R.source(D.log))} <button class="link" data-act="recorded">${R.hide}</button></p>
  </section>`;
}

function badge(c: Card): string {
  // the two AI badges come from `card.source` only (the SDK's report); "No AI needed" only when no model was called
  const kind = badgeKind(c);
  if (kind === 'none') return `<span class="badge none">${C.badge.none}</span>`;
  if (kind === 'code' || kind === 'codeAsked') return `<span class="badge code">${kind === 'code' ? C.badge.code : C.badge.codeAsked}</span>`;
  if (kind === 'device' || kind === 'offline') return `<span class="badge device">${kind === 'offline' ? C.badge.offline : C.badge.device}</span>`;
  return `<span class="badge cloud">${C.badge.cloud}</span>`;
}

/**
 * The badge and, after it, what left this computer for this card: one line that is always on screen and always true.
 * "Left" is the receipt's own definition (`Card.cloudPayload` is recorded only when the SDK reported that the cloud
 * answered); the swap counts are read from the recorded swaps, the same numbers the receipt shows.
 */
function badgeLine(c: Card): string {
  const T = C.badge.tail;
  let tail: string = T.kept;
  if (c.cloudPayload) { const n = countSwaps(c.cloudSwaps); tail = T.sent(n.names, n.other); }
  else if (c.cloudAttempted) tail = T.attempted;
  // a card made on this computer that offers About-me entries says so: the cloud step could not have offered them
  else if (c.source === 'on-device' && !c.blocked && c.why?.personal?.length) tail = `${T.kept} · ${T.personal(c.why.personal.join(', '))}`;
  // a spoken question: its recording went to Google's cloud before the card was made, so this line never says only "nothing left"
  if (voiceCards.has(c)) tail = tail.startsWith(T.kept) ? tail.replace(T.kept, C.voice.tailKept) : `${tail} · ${C.voice.tailAlso}`;
  return `<p class="badge-line">${badge(c)}<span class="tail">· ${esc(tail)}</span></p>`;
}

/**
 * "What was sent": by default one line, the part of the request that changes from card to card ("Partner asks: …",
 * after the swap), and the size of the whole request. The request itself, exactly as the app handed it to the SDK
 * (model, mode, fixed instructions, answer format), is one click further, under "Show the exact request".
 */
function sentPanel(c: Card): string {
  const spoken = voiceCards.has(c) ? `<p class="muted">${esc(C.voice.sentNote)}</p>` : '';
  const swaps = c.cloudSwaps?.length ? `<p class="swaps">${C.sent.swaps}<br>${c.cloudSwaps.map(esc).join('<br>')}</p>` : '';
  const body = (label: string, payload: string) => {
    const s = sentLine(payload);
    return `<p>${label}</p><p class="sent-line"><code>${esc(s.text)}</code><span>${esc(C.sent.size(s.bytes))}</span></p>${swaps}
      <details class="exact"><summary>${C.sent.exact}</summary><pre>${esc(payload)}</pre></details>${spoken}`;
  };
  if (c.cloudPayload) return body(c.source === 'in-cloud' ? C.sent.sentFor : C.sent.notUsed, c.cloudPayload);
  if (c.cloudAttempted) return body(C.sent.attempted, c.cloudAttempted);
  if (c.unsentPayload) return body(state.settings.cloudHelp ? C.sent.notSentOn : C.sent.notSent, c.unsentPayload);
  return `<p>${C.sent.nothing}</p>${spoken}`;
}

function traceList(t: StepTrace[] | undefined): string {
  if (!t) return '';
  return `<ul class="trace">${t.map((s) => `<li class="${s.ran}${s.used ? ' used' : ''}" data-step="${s.step}"><b>${C.how.steps[s.step]}</b>: ${C.how.ran[s.ran]}${s.ms ? ` (${s.ms} ms)` : ''}${s.used ? ` · ${C.how.used}` : ''}<br><span>${esc(s.why)}</span></li>`).join('')}</ul>`;
}

/**
 * "Why this card" as one line: what the model proposed, what code kept, added and dropped (each with its rule), who
 * decided, where the headline came from. Every value is read from `Card.why`, which the pipeline wrote while it worked.
 */
function whyLine(w: CardWhy, ranOffline = false): string {
  const Y = C.how.why;
  const parts: string[] = [];
  if (w.proposed) {
    const p = w.proposed;
    const opts = p.options.length ? ` · ${Y.options}: ${p.options.join(' / ')}` : '';
    parts.push(`<b>${p.step === 'stripped' && ranOffline ? Y.proposedOffline : Y.proposed[p.step]}</b>: ${esc(p.topic || '—')} · ${esc(p.kind)} · ${esc(p.choices.join(', ') || '—')}${esc(opts)}`);
  } else parts.push(`<b>${Y.noProposal}</b>`);
  if (w.kept.length) parts.push(`<b>${Y.kept}</b>: ${esc(w.kept.join(', '))}`);
  if (w.added.length) parts.push(`<b>${Y.added}</b>: ${esc(w.added.map((a) => `${a.label} (${a.from})`).join(', '))}`);
  if (w.dropped.length) parts.push(`<b>${Y.dropped}</b>: ${esc(w.dropped.map((d) => `${d.label} (${d.rule})`).join(', '))}`);
  if (w.personal?.length) parts.push(`<b>${Y.personal}</b>: ${esc(w.personal.join(', '))}`);
  parts.push(`<b>${Y.decided}</b>: ${esc(w.decided)}`);
  parts.push(`<b>${Y.headline}</b>: ${esc(w.headline)}`);
  return parts.join(' · ');
}

/** The panel: one line, open in judge mode and on "How this works"; on the partner screen it sits inside "How this card was made". */
function whyPanel(c: Card, open: boolean): string {
  if (!c.why) return '';
  return `<details class="why" ${open ? 'open' : ''}><summary>${C.how.why.heading}</summary><p>${whyLine(c.why, !!c.ranOffline)}</p></details>`;
}

/**
 * How this card was made, in the order a judge reads it: why this card → where each step ran → what was sent. The same
 * three panels, open, in both modes. In judge mode they sit behind one summary line under every card (`#made`,
 * cardPanel); on the partner screen they sit inside one closed disclosure (`#made`)
 * with the privacy receipt (folded, it is long) after them: one click shows all three, and nothing is removed, only
 * folded.
 */
function madePanels(c: Card): string {
  return `${whyPanel(c, true)}
    <details class="sent" open><summary>${C.how.traceHeading}</summary>${traceList(c.trace)}</details>
    <details class="sent" id="sent" open><summary>${C.sent.heading}</summary>${sentPanel(c)}</details>`;
}

/** Every card made this session by its badge, and every step that failed, on any card: a blocked card's failed step counts too. */
function tally(): { device: number; cloud: number; code: number; asked: number; none: number; failed: number } {
  return sessionTally(state.made);
}

function legsTable(): string {
  const names = C.how.legNames;
  return `<table><tr><th>${C.how.columns.step}</th><th>${C.how.columns.mode}</th><th>${C.how.columns.gets}</th><th>${C.how.columns.why}</th></tr>${(Object.keys(LEGS) as (keyof typeof LEGS)[]).map((k) => `<tr><td>${names[k]}</td><td><code>${LEGS[k].mode}</code></td><td>${esc(LEGS[k].gets)}</td><td>${esc(LEGS[k].why)}</td></tr>`).join('')}</table>`;
}

/**
 * The receipt's one number at display size ("0 bytes left this computer"), from the same count as the receipt table.
 * In judge mode it stands under the chips; elsewhere it opens the receipt.
 */
function bytesLine(): string {
  const n = C.judge.receipt.number(sessionReceipt(state.made, state.profile), settingsAsked, voiceSent);
  return `<p class="bytes ${n.state}" id="bytes"><b>${esc(n.figure)}</b> <span>${esc(n.label)}</span><small>${esc(n.scope)}</small></p>`;
}

/** The privacy receipt for this session: counted on the payloads the cards recorded (core/receipt.ts), never estimated. */
function receiptPanel(open: boolean, withNumber = true): string {
  const R = C.judge.receipt;
  const r = sessionReceipt(state.made, state.profile);
  const K = R.columns; // on a phone the cells stack, each labelled by its column name (styles.css)
  const rows = r.perCard.map((x, i) => `<tr><td data-l="${K.card}">${i + 1}. ${esc(x.asked)}</td><td data-l="${K.left}">${x.left ? R.leftYes : x.attempted ? R.leftMaybe : x.offline ? R.leftOffline : R.leftNo}</td><td data-l="${K.bytes}">${x.left ? `${x.bodyBytes} (${x.questionBytes})` : x.attempted ? `(${x.attemptBytes})` : '0'}</td><td data-l="${K.withheld}">${x.left ? esc(R.withheld(x.namesWithheld, x.otherWithheld)) : x.attempted ? '—' : R.kept}</td><td data-l="${K.check}">${x.left ? (x.leaksFound || x.photoFound ? esc(R.checkBad(x.leaksFound, x.photoFound)) : R.checkOk) : '—'}</td></tr>`).join('');
  const table = r.cards ? `<table><tr><th>${R.columns.card}</th><th>${R.columns.left}</th><th>${R.columns.bytes}</th><th>${R.columns.withheld}</th><th>${R.columns.check}</th></tr>${rows}</table>` : '';
  return `<details class="receipt" ${open ? 'open' : ''}><summary><b>${R.heading}</b></summary>${withNumber ? bytesLine() : ''}${table}
    <details class="counted"><summary>${R.howHeading}</summary><p>${esc(R.summary(r))}</p><p class="muted">${esc(R.how)}${settingsAsked ? ` ${esc(R.settingsNote)}` : ''}${voiceSent.clips ? ` ${esc(C.voice.counted)}` : ''}</p></details>
    <div class="actions"><button data-act="export-receipt" ${r.cards ? '' : 'disabled'}>${R.exportButton}</button></div></details>`;
}

/** Hands the person a file to save (the receipt, the trial CSV); nothing is uploaded anywhere. */
function downloadFile(name: string, text: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * "How this works": the three settings Firebase Remote Config may change, the value in use for each and where it came
 * from (Remote Config, or the default in the code), and whether Remote Config was asked at all. Read from
 * `state.remote`, which holds only what the SDK returned and what `checkSetting` made of it.
 */
function settingsPanel(): string {
  const S = C.how.settings;
  const r = state.remote;
  const status = r.status === 'fetched' ? S.fetched(new Date(r.at ?? Date.now()).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    : r.status === 'failed' ? S.failed(r.error ?? '') : S[r.status];
  const rows = (Object.keys(DEFAULT_SETTINGS) as (keyof RuntimeSettings)[]).map((k) => {
    const from = r.sources[k] === 'remote' ? S.from.remote : r.sources[k] === 'refused' ? S.from.refused(r.refused[k] ?? '') : S.from.default;
    return `<tr data-setting="${REMOTE_KEYS[k]}" data-from="${r.sources[k]}"><td>${esc(S.names[k])}<br><code>${REMOTE_KEYS[k]}</code></td><td><b>${esc(String(r.values[k]))}</b></td><td>${esc(from)}</td></tr>`;
  }).join('');
  return `<section id="settings" class="rc" data-status="${r.status}"><h2>${S.heading}</h2><p>${esc(status)}</p>
    <table><tr><th>${S.columns.setting}</th><th>${S.columns.value}</th><th>${S.columns.from}</th></tr>${rows}</table>
    <p class="muted">${S.note}</p></section>`;
}

function diagram(): string {
  // three boxes: the question; the private step on this computer (About me stays here); the cloud step (question only)
  return `<svg class="diagram" viewBox="0 0 640 170" role="img" aria-label="${dw('The question stays on this computer with About me; only a stripped question may go to the cloud')}">
    <rect x="8" y="30" width="180" height="110" rx="12"/><text x="98" y="62" text-anchor="middle">${dw('this computer')}</text><text x="98" y="88" text-anchor="middle">question + About me</text><text x="98" y="112" text-anchor="middle" class="mode">ONLY_ON_DEVICE</text>
    <rect x="230" y="30" width="180" height="110" rx="12"/><text x="320" y="62" text-anchor="middle">rules in code</text><text x="320" y="88" text-anchor="middle">model proposes,</text><text x="320" y="112" text-anchor="middle">code decides</text>
    <rect x="452" y="30" width="180" height="110" rx="12" stroke-dasharray="6 5"/><text x="542" y="62" text-anchor="middle">cloud help</text><text x="542" y="88" text-anchor="middle">question only, Person A</text><text x="542" y="112" text-anchor="middle" class="mode">PREFER_IN_CLOUD</text>
    <path d="M188 85h42M410 85h42"/><path d="M224 79l6 6-6 6M446 79l6 6-6 6"/>
  </svg>`;
}

// ---------------------------------------------------------------- quick needs
/**
 * The quick-needs board (core/needs.ts): a fixed card made in code, put on the person's screen in one tap. No engine is
 * called and nothing is asked of the network, so it is there with no model and no connection. It takes the place of
 * whatever card was on screen (a card still being made gives way), and it is counted like any card made in code.
 */
function openNeeds() {
  if (step === 'waiting') step = 'cancelled'; // judge mode's automatic step stands down, as for a typed question
  makeSeq++;
  voiceAsk = false; voiceHeard = false; dictated = false; voice.cancel();
  state.busy = false; state.error = null; state.lastQuestion = ''; resetCard(); p5.urgent = false; p5.signNow = false; p5.red = null;
  const card = needsCard();
  setCard(card); state.made.push(card); state.waitStart = Date.now();
}

// ---------------------------------------------------------------- voice input (the partner's question only)
/**
 * The microphone next to the question field (web/src/voice.ts): one short recording of the partner's own question,
 * turned into text by one model call through Firebase AI Logic (the engine's `transcribe`). The words go into the
 * field; nothing is submitted. The button is not drawn where the browser cannot record or this copy has no cloud
 * step. The first press opens a notice that the recording goes to Google's cloud, and recording starts only after a
 * yes. Every recording handed to the SDK is counted in the session's figure, and a card made from a spoken question
 * says so.
 */
let voiceAsk = false;
let voiceHeard = false;
/**
 * Recordings this app handed to the SDK for the cloud this session: those the SDK reported as answered in the cloud
 * and those that failed after being handed over (they may have left). One the SDK reported as run on this computer
 * would not be counted; with the SDK in package.json that cannot happen.
 */
const voiceSent = { clips: 0, bytes: 0 };
/** The question now in the field came from such a recording. */
let dictated = false;
const voiceCards = new WeakSet<Card>();
const voice = createVoice({
  ...micDeps(),
  // the one AI call of voice input: the engine, so Firebase AI Logic. A copy with no project settings has none.
  transcribe: state.engine.cloudConfigured && state.engine.transcribe
    ? async (clip) => { const r = await state.engine.transcribe!(clip); return { text: transcriptFrom(r.text), source: r.source }; }
    : null,
  online: () => navigator.onLine !== false,
  onSent: (bytes, outcome) => {
    if (outcome !== 'in-cloud' && outcome !== 'failed') return;
    voiceSent.clips++; voiceSent.bytes += bytes;
    const b = document.querySelector('#bytes'); if (b) b.outerHTML = bytesLine();
    const p = document.querySelector('#privacy'); if (p) p.innerHTML = privacyLine();
    const sp = document.querySelector('#s-privacy span'); if (sp) sp.textContent = simplePrivacy().join(' ');
  },
  maxSeconds: VOICE_MAX_SECONDS,
  onChange: onVoice,
});
const voiceAgreed = () => state.settings.voiceOk === 'cloud';
function voiceButton(): string {
  const v = voice.view();
  if (!v.supported) return '';
  const V = C.voice;
  const on = v.phase === 'recording';
  const busy = v.phase === 'asking' || v.phase === 'working';
  return `<button type="button" id="mic" class="mic${on ? ' on' : ''}${busy ? ' busy' : ''}" data-act="mic" data-phase="${v.phase}" aria-pressed="${on}" ${busy ? 'disabled' : ''} aria-label="${on ? V.stop : V.button}" title="${esc(on ? V.stop : `${V.button}. ${V.notice(VOICE_MAX_SECONDS)}`)}">${on ? MIC_STOP : MIC}</button>`;
}
function voiceNote(): string {
  const v = voice.view();
  const V = C.voice;
  if (!v.supported) return '';
  if (voiceAsk) return `${esc(V.notice(VOICE_MAX_SECONDS))} <span class="voice-acts"><button class="primary" data-act="voice-ok">${V.ok}</button><button data-act="voice-no">${V.cancel}</button></span>`;
  if (v.phase === 'asking') return `<span class="dot wait"></span>${esc(V.asking)}`;
  if (v.phase === 'recording') return `<span class="dot rec"></span>${esc(V.recording(VOICE_MAX_SECONDS))}<span class="rec-bar" style="--rec-s:${VOICE_MAX_SECONDS}s"></span>`;
  if (v.phase === 'working') return `<span class="dot wait"></span>${esc(V.working)}`;
  if (v.error) return esc(V.errors[v.error]);
  return voiceHeard ? esc(v.source === 'on-device' ? V.heardHere : V.heard) : '';
}
/** One line under the question field, there only while there is something to say (the notice, recording, an error). */
function voiceLine(): string {
  const t = voiceNote();
  return `<p id="voice" class="voice" role="status" ${t ? '' : 'hidden'}>${t}</p>`;
}
function patchVoice() {
  const b = document.querySelector('#mic'); if (b) b.outerHTML = voiceButton();
  const n = document.querySelector<HTMLElement>('#voice'); if (n) { const t = voiceNote(); n.innerHTML = t; n.hidden = !t; }
}
function privacyLine(): string {
  // (phase 8, judge round 7: Read aloud is named too: with it on, the words of each card shown go to Google)
  return `${state.settings.cloudHelp ? C.consent.isOn : C.privacy.cloudOff}${voiceSent.clips ? ` ${C.voice.privacy}` : ''}${speakOn() ? ` ${P5.speak.on.replace(/^On\. /, 'Read aloud is on: ')}` : ''}${p5.speakSent ? ` ${P5.speak.sent(p5.speakSent)}` : ''}`;
}
function startVoice() {
  if (step === 'waiting') step = 'cancelled'; // speaking a question is asking one: judge mode's automatic step stands down
  voiceHeard = false;
  voice.start();
}
/** Every change of the voice state: the words go into the question field (never further), the button and the line follow. */
function onVoice(v: VoiceView) {
  const q = document.querySelector<HTMLInputElement>('#q');
  if (v.final && v.text) {
    state.lastQuestion = v.text;
    if (q) q.value = v.text;
    // marked only when the recording left this computer: the card made from it then says so
    dictated = v.source !== 'on-device';
  }
  voiceHeard = v.final;
  patchVoice();
  if (v.final && q) q.focus(); // the words are there to be read and changed; "Make card" is the partner's press
}

// ---------------------------------------------------------------- partner screen
/** Judge mode: the one-tap questions in three groups, by what the judge sees happen; the chip shows the short form, asks the full question. */
function chipGroups(): string {
  const G = C.judge.groups;
  // the chip whose question is on screen (or being made) is lit, so the card can be traced back to its question
  const on = (q: string) => q === state.lastQuestion && (!!state.card || state.busy);
  return `<div class="chipgroups">${(Object.keys(G) as (keyof typeof G)[]).map((g) =>
    `<div class="chips group"><span class="gl">${G[g]}</span><span class="gc">${SAMPLE_QUESTIONS.filter((s) => s.group === g).map((s) => `<button class="chip${on(s.q) ? ' on' : ''}" ${on(s.q) ? 'aria-current="true" ' : ''}data-q="${esc(s.q)}" title="${esc(s.q)} — ${esc(dw(s.shows))}">${esc(s.short)}</button>`).join('')}</span></div>`).join('')}</div>`;
}

/**
 * Outside judge mode: the three questions answered most often, as one-tap chips above the question field, so the
 * empty field is the fallback and not the front door. They are read from "Answers so far" (kept on this computer);
 * a tap asks the question again through the same pipeline as a typed one, and no earlier answer is filled in.
 * Judge mode has its own sample chips, and the sample family's answers are not kept.
 */
function againChips(): string {
  const top = topQuestions(state.history, 3);
  if (!top.length) return '';
  const on = (q: string) => q === state.lastQuestion && (!!state.card || state.busy);
  return `<div class="chips again"><span class="gl">${C.ask.again}</span><span class="gc">${top.map((t) =>
    `<button class="chip${on(t.q) ? ' on' : ''}" ${on(t.q) ? 'aria-current="true" ' : ''}data-q="${esc(t.q)}" title="${esc(C.ask.againTitle(t.times))}">${esc(t.q)}</button>`).join('')}</span></div>`;
}

/**
 * The partner screen. Judge mode (#/demo) is ordered for a 60-second read: the chips under the question box, then the
 * card. Under every card, the one judge mode opens with included, the panels (why → where each step ran → what was
 * sent) are one closed summary line and the privacy receipt after them is closed (cardPanel). Then one compact session line (tally; the intro and the no-helper note fold under it). Outside judge mode the panels and
 * the receipt are folded into "How this card was made" inside the card panel, so above the fold there is only the
 * question, the coaching line, the line to say, the card and the actions.
 */
function partnerScreen(): string {
  const c = state.card;
  const judgeLine = state.demo ? `<details class="judge"><summary><b>${C.judge.label}</b> · ${C.how.tallyHeading}: ${C.how.tallyShort(tally())}</summary><p>${C.judge.intro}</p><p id="nodevice" ${state.device === 'available' || state.device === 'checking' ? 'hidden' : ''}>${C.judge.noDevice}</p></details>` : '';
  return `${nav()}
<main class="layout${state.first ? ' first' : ''}">
  <section class="partner" aria-label="Partner">
    <p class="tagline">${C.app.tagline}</p>
    <p class="tagline-sub">${C.app.taglineSub}</p>
    <p id="status" class="status">${statusLine()}</p>
    <div id="recorded">${recordedBlock()}</div>
    ${state.demo ? `<p class="sample">${C.app.sample}<span id="rec-link">${recordedLink()}</span></p>` : againChips()}
    <form id="ask"><input id="q" autocomplete="off" placeholder="${C.ask.placeholder}" aria-label="${C.ask.label}" value="${esc(state.lastQuestion)}">${voiceButton()}<button id="make" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? C.ask.making : C.ask.make}</button></form>
    ${voiceLine()}
    ${state.demo ? chipGroups() : ''}
    ${state.demo ? bytesLine() : ''}
    <div id="result" aria-live="polite">${state.busy ? `<p class="making" role="status"><span class="dot wait"></span>${C.ask.makingCard} <small>${C.ask.makingHint}</small></p>` : c ? cardPanel(c) : state.error ? `<p class="warn">${esc(state.error)}</p>` : ''}</div>
    ${state.demo ? receiptPanel(false, false) : ''}
    ${judgeLine}
    <div class="settings">
      <label>${C.support.label} <select id="support">${(['mild', 'more', 'most'] as const).map((v) => `<option value="${v}" ${state.settings.support === v ? 'selected' : ''}>${C.support.options[v]}</option>`).join('')}</select></label>
      <span class="privacy" id="privacy">${privacyLine()}</span>
      <a class="feedback-link" href="#/feedback">${C.feedback.link}</a>
    </div>
  </section>
  <section id="person" class="person" aria-label="Card for the person" data-kind="${c ? c.kind : ''}" data-blocked="${c?.blocked ? '1' : ''}">${personView(false)}</section>
</main>${footer()}`;
}

function cardPanel(c: Card): string {
  const notes = c.notes.length ? `<ul class="notes">${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
  const safety = c.kind === 'body' || c.kind === 'pain' ? `<p class="safety">${C.safety}</p>` : '';
  // the coaching line: only when a rule found something about the question itself (Card.coach), never otherwise
  const coach = c.coach ? `<p class="coach">${esc(c.coach)}</p>` : '';
  // what they chose the last time this question was asked: for the partner only, from the list kept on this computer
  const prev = c.blocked || c.kind === 'repair' || c.kind === 'needs' || noPriming(c) ? null : lastAnswer(state.history, c.asked, state.cardAt);
  const counts = prev ? answerCounts(state.history, c.asked, state.cardAt) : [];
  const last = prev ? `<p class="last">${esc(C.card.lastTime(whenText(prev.at, Date.now()), prev.label))}${counts.length > 1 || counts[0]?.n > 1 ? ` ${esc(C.card.lastTimeCounts(counts.map((x) => `${x.label} ×${x.n}`).join(', ')))}` : ''}</p>` : '';
  // The buttons under the card (core/actions.ts): "We're stuck" on every card the person can see, the way back on the
  // repair card, and "Next: second question" whenever the question was two in one, also when the first part has no card
  const actions = partnerActions(c, { less: state.less, hasAnswers: state.answers.length > 0 })
    .map((a) => `<button ${a.primary ? 'class="primary" ' : ''}data-act="${a.act}">${a.label}</button>`).join('');
  let main: string;
  if (c.kind === 'no-quiz') {
    main = `<p class="label">${C.memory.line}</p><p class="say">${esc(c.say.replace(C.notes.tellPrefix, ''))}</p>`;
  } else if (c.kind === 'repair') {
    main = `<p class="label">${C.card.sayThis}</p><p class="say">${esc(c.say)}</p><p class="tip">${C.repair.tip} <span id="wait" class="wait"></span></p>`;
  } else if (c.kind === 'needs') {
    // once a need is confirmed, the line to say has done its work: the partner's next move stands in its place (below)
    main = state.confirmed && state.picked ? '' : `<p class="label">${C.card.sayThis}</p><p class="say">${esc(c.say)}</p><p class="tip">${C.needs.tip} <span id="wait" class="wait"></span></p>`;
  } else if (c.blocked) {
    const offer = !state.settings.cloudHelp && state.engine.cloudConfigured && c.unsentPayload
      ? `<p class="offer">${C.blocked.cloudCouldTry} <button class="link" data-act="show-sent">${C.blocked.showWouldSend}</button> <a href="#/cloud">${C.blocked.turnOn}</a></p>` : '';
    main = `<p class="warn">${esc(c.blocked)}</p><p class="say">${C.card.justAsk}</p>${offer}`;
  } else if (state.less) {
    main = `<p class="label">${C.card.lessOn}</p><p class="say">${esc(c.asked)}</p>`;
  } else {
    main = `<p class="label">${C.card.sayThis}</p><p class="say">${esc(c.say)}</p><p class="tip">${C.card.tip} <span id="wait" class="wait"></span></p>`;
  }
  let answered = '';
  if (state.recapDone) answered = `<p class="done">${C.person.recapLine} ${esc(recapText())}</p>`;
  else if (state.confirmed && state.picked) answered = `<p class="done">${esc(choseLine(c, state.picked))}</p>${afterAnswer(c, state.picked, 'chip')}`;
  // judge mode: under every card, the one it opens with included, the panels are folded behind one summary line (who
  // decided, how many choices were kept, added and dropped), and one click opens all three; the receipt below is
  // closed. (Until review round 5 the first card had them open: a wall of text on a phone before anything was asked.)
  // Partner screen: one closed fold holds them and the receipt. Nothing is removed in either mode, only folded.
  const line = c.why ? C.judge.madeLine(c.why.decided, c.why.kept.length, c.why.added.length, c.why.dropped.length) : C.judge.madeLineNoWhy;
  const made = state.demo
    ? `<details class="made" id="made"><summary>${esc(line)}</summary>${madePanels(c)}</details>`
    : `<details class="made" id="made"><summary>${C.card.made}</summary>${madePanels(c)}${receiptPanel(false)}</details>`;
  return `${badgeLine(c)}${coach}${last}${main}${answered}${actions ? `<div class="actions">${actions}</div>` : ''}${safety}${notes}
    ${made}`;
}

/** What they chose, in one sentence for the partner. */
function choseLine(c: Card, p: Choice): string {
  if (p.role === 'repair') return C.card.choseRepair(p.label);
  if (c.kind === 'needs') return p.role === 'escape' ? C.card.choseRepair(p.label) : C.card.chose(p.label);
  return p.role === 'escape' ? C.card.choseEscape(p.label) : C.card.chose(p.label);
}
/**
 * The partner's next move after a confirmed tile, on the partner's side only: a repair tile is a way to try, not an
 * answer; a confirmed need gets its line, and after "pain" one tap asks where (a card made in code). '' for a plain
 * answer. `button` is the class of the one-tap question (a chip in the full view, a button in the simple one).
 */
function afterAnswer(c: Card, p: Choice, button: string): string {
  // (after "show me", "write it" or "draw" the screen goes on: the carer types what they understood, or goes back to the ways)
  if (p.role === 'repair') return `<p class="say">${esc(repairLine(p.label, state.before?.asked ?? state.chain[0] ?? null, C.repair))}</p>${([C.repair.tiles.showMe, C.repair.tiles.writeIt, C.repair.tiles.draw] as string[]).includes(p.label) ? understoodBlock(state.profile.personName.trim()) : ''}`;
  // (phase 12) the person chose "I can't go on": the crisis box comes first, in both views
  if (p.role === 'answer' && crisisAnswer(p.label)) return crisisBox({ name: state.profile.personName.trim(), number: callNumber(), line: crisisLineButton(), guess: numberGuess() });
  if (c.kind !== 'needs') return '';
  // (phase 12, judge round 9: "Where does it hurt?" is the main button, and the call box carries the number and a real button)
  const where = p.label === 'pain' ? `<p><button class="${button} primary" id="need-where" data-q="${esc(C.needs.painQuestion)}">${esc(C.needs.painQuestion)}</button></p>${urgentBox(callNumber(), 'need-urgent', numberGuess())}` : '';
  return `<p class="say need-line">${esc(needLine(p.label))}</p>${where}`;
}

const recapText = () => state.answers.map((a) => (a.topic ? `${a.topic}, ${a.label}` : a.label)).join('; ') + '. Right?';

// ---------------------------------------------------------------- person view (pane and full screen)
function picture(ch: Choice): string {
  const p = ch.picture;
  // the family's own photo comes before any generic picture, wherever its word is this choice (core/photos.ts: rules, no model)
  const own = state.demo || ch.role !== 'answer' ? null : photoFor(ch.label, state.photos);
  const ownSpoken = own || state.demo || ch.role !== 'answer' || !state.card?.letter ? null : photoFor(ch.spoken, state.photos);
  if (ownSpoken) return `<img class="photo own" src="${ownSpoken.data}" alt="">`;
  if (own) return `<img class="photo own" src="${own.data}" alt="">`;
  if (p.type === 'builtin') return builtinPicto(p.id);
  if (p.type === 'person') {
    const person = p.personId ? state.profile.people.find((x) => x.id === p.personId) : null;
    return person?.photo ? photoTile(person.photo, person.name) : monogram(p.initial);
  }
  return ''; // bundled pictures only in this build: a word-only tile, never an empty frame
}

/** The card's headline in the full view: left out when the card has none (never a generic word in its place). */
const headline = (topic: string) => (topic ? `<h2 class="headline">${esc(topic)}</h2>` : '');
function personView(full: boolean): string {
  const c = state.card;
  const exit = full ? `<button id="exit" class="exit" aria-label="${C.person.exit}" title="${C.person.exit}">${CROSS}</button>` : '';
  if (state.recap) {
    const list = state.answers.length ? `<ul class="so">${state.answers.map((a) => `<li><span>${esc(a.topic)}</span><b>${esc(a.label)}</b></li>`).join('')}</ul>` : `<p class="so-empty">${C.person.recapEmpty}</p>`;
    return `${exit}<h2 class="headline">${C.person.recapHeading}</h2>${list}
      <div class="tiles two"><button class="tile yes" data-confirm="recap-yes">${TICK}<span>${C.person.yes}</span></button>
      <button class="tile" data-confirm="recap-change">${CROSS}<span>${C.person.change}</span></button></div>`;
  }
  // the empty card area of the partner screen says in words what will be here (the owner's phone test, 18 Nov 2026: an
  // ear alone told nobody anything); the person's own full screen keeps its quiet picture. A question that got no card
  // says so here too, not "will appear" (a walk of the sample family at 390 px, 18 Nov: the first chip, an open
  // question, with no on-device model and cloud help off)
  if (!c || c.blocked || !c.choices.length) return full ? `${exit}<div class="listening${state.busy ? ' thinking' : ''}">${builtinPicto('listen')}</div>` : `<div class="listening words${state.busy ? ' thinking' : ''}"><p id="card-empty" role="status">${state.busy ? C.card.emptyBusy : c ? C.card.emptyNone : C.card.emptyPane}</p></div>`;
  if (state.less) return `${exit}${headline(c.topic)}`;
  if (state.picked && state.confirmed) {
    return `${exit}${headline(c.topic)}<div class="answered">${picture(state.picked)}<p>${esc(state.picked.label)}</p></div>`;
  }
  if (state.picked) {
    // a "no" or "not sure" sits in a neutral frame: never a giant cross above yes / change (§2.14)
    return `${exit}<h2 class="headline">${esc(C.person.so(state.picked.label))}</h2>
      <div class="confirm-pic ${state.picked.label === 'no' || state.picked.label === 'not sure' ? 'neutral' : ''}">${picture(state.picked)}<p>${esc(state.picked.label)}</p></div>
      <div class="tiles two"><button class="tile yes" data-confirm="yes">${TICK}<span>${C.person.yes}</span></button>
      <button class="tile" data-confirm="change">${CROSS}<span>${C.person.change}</span></button></div>`;
  }
  if (c.kind === 'repair') {
    // three ways to get the message out in one row, then the two ways to leave it for now (quieter tiles)
    const tile = (ch: Choice, i: number, extra: string) => `<button class="tile ${extra} ${picture(ch) ? '' : 'wordonly'}" data-i="${i}">${picture(ch)}<span>${esc(ch.label)}</span></button>`;
    return `${exit}${headline(c.topic)}
      <div class="tiles repair">${c.choices.slice(0, 3).map((ch, i) => tile(ch, i, '')).join('')}</div>
      <div class="tiles two">${c.choices.slice(3).map((ch, i) => tile(ch, i + 3, 'out')).join('')}</div>`;
  }
  if (c.kind === 'needs') {
    // one board: eight needs, each a picture and its word, then the way out on a row of its own
    return `${exit}${headline(c.topic)}
      <div class="tiles needs">${c.choices.map((ch, i) => `<button class="tile ${ch.role === 'escape' ? 'escape' : ''}" data-i="${i}">${picture(ch)}<span>${esc(ch.label)}</span></button>`).join('')}</div>`;
  }
  const answers = c.choices.filter((x) => x.role === 'answer');
  if (c.scale) {
    // a number scale named in the question: one line of numbers, the two ends named under it, then the way out
    const num = (ch: Choice, i: number) => `<button class="tile wordonly" data-i="${i}"><span>${esc(ch.label)}</span></button>`;
    const out = c.choices.map((ch, i) => (ch.role === 'escape' ? `<button class="tile escape ${picture(ch) ? '' : 'wordonly'}" data-i="${i}">${picture(ch)}<span>${esc(ch.label)}</span></button>` : '')).join('');
    return `${exit}${headline(c.topic)}
    <div class="tiles scale" style="--n:${Math.min(6, answers.length)}">${c.choices.map((ch, i) => (ch.role === 'answer' ? num(ch, i) : '')).join('')}</div>
    <p class="scale-ends"><span>${c.scale.lo} · ${c.scale.lo === 0 ? C.scale.low : C.scale.lowFromOne}</span><span>${c.scale.hi} · ${C.scale.high}</span></p>
    <div class="tiles two">${out}</div>`;
  }
  const cls = state.settings.support === 'most' ? 'tiles stacked' : answers.length >= 3 ? 'tiles three' : 'tiles two';
  return `${exit}${headline(c.topic)}
    <div class="${cls}">${c.choices.map((ch, i) => `<button class="tile ${ch.role === 'escape' ? 'escape' : ''} ${picture(ch) ? '' : 'wordonly'}" data-i="${i}">${picture(ch)}<span>${esc(ch.label)}</span></button>`).join('')}</div>`;
}

/** The person's side of the simple view (web/src/simple.ts, personSimple): the whole screen, or the carer's preview. */
function personModel(full: boolean) {
  // (read, never set: only a tap on the person's screen picks or confirms; tests/unit/truth.test.ts)
  const { card, busy, less, picked, confirmed, recap, answers } = state;
  return { card, busy, less, picked, confirmed, recap, answers, pic: picture, waitPic: builtinPicto('listen'), full };
}
function personScreen(): string {
  // the simple view has its own screens for the person (design/USER_FIRST.md); judge mode and the full view keep theirs
  const P = C.simple.person;
  const hold = `<button type="button" id="exit" class="hold" title="${P.holdTitle}"><i aria-hidden="true"></i>${P.hold}</button>`;
  // the alphabet of the first-letter helper, and the end of the doctor-visit questions (web/src/phase4.ts)
  if (simpleView() && state.p4.letter) return `<main class="person full pv letters" id="person" aria-label="For the person" data-kind="letters">${letterGrid({ holdHtml: hold })}</main>`;
  if (simpleView() && state.p4.visitEnd) return `<main class="person full pv" id="person" aria-label="For the person" data-kind="visit-end">${visitDone()}</main>`;
  // a question about a family photo shows that photo over the question (on this device only; it is in no request)
  const talkPhoto = state.card?.photoTalk && !state.picked ? state.photos.find((x) => x.id === state.p4.talk?.id) : null;
  if (simpleView() && talkPhoto) return `<main class="person full pv with-photo rowtiles" id="person" aria-label="For the person" data-kind="${state.card!.kind}">${personSimple(personModel(true)).replace('<p class="p-do">', `<img class="p-photo photo own" id="p-photo" src="${talkPhoto.data}" alt=""><p class="p-do">`)}</main>`;
  // (the starters and the topic menu have longer words: the picture stands beside the word, so three and the way out fit)
  // Read aloud is on: one button over the choices repeats the card (a control, not a choice); never on a doctor-visit card
  const hearHtml = speakOn() && speakable(state.card) && !state.picked && !state.recap && (isOnline() || p5.sounds.has(speakText(state.card))) ? hearButton(p5.hear) : '';
  if (simpleView()) return `<main class="person full pv${state.card?.turn && !state.picked ? ' rowtiles' : ''}${hearHtml ? ' with-hear' : ''}" id="person" aria-label="For the person" data-kind="${state.card ? state.card.kind : ''}">${personSimple(personModel(true)).replace('<p class="p-do">', `${hearHtml}<p class="p-do">`)}</main>`;
  return `<main class="person full" id="person" aria-label="Card for the person">${personView(true)}</main>`;
}

// ---------------------------------------------------------------- About me
function aboutScreen(): string {
  const p = state.profile;
  const A = C.about;
  const people = p.people.map((x, i) => `<fieldset class="who"><legend>${A.person} ${i + 1}</legend>
      <label>${A.name}<input data-person="${i}" data-field="name" value="${esc(x.name)}"></label>
      <label>${A.relation}<input data-person="${i}" data-field="relation" value="${esc(x.relation)}" placeholder="wife, son, carer…"></label>
      <label class="check"><input type="checkbox" data-person="${i}" data-field="household" ${x.household ? 'checked' : ''}>${A.livesHere}</label>
      <label>${A.nickname}<input data-person="${i}" data-field="nickname" value="${esc(x.nickname ?? '')}"></label>
      <div class="photo-row">${x.photo ? `${photoTile(x.photo, x.name)}<button data-act="photo-remove" data-person="${i}">${A.removePhoto}</button>` : `<button data-act="photo-add" data-person="${i}">${A.addPhoto}</button><input type="file" accept="image/*" data-photo="${i}" hidden>`}</div>
      <button class="link danger" data-act="person-remove" data-person="${i}">${A.remove}</button>
    </fieldset>`).join('');
  const list = (key: 'foods' | 'places' | 'tv' | 'music' | 'other', label: string) =>
    `<label>${label} <small>(${A.onePerLine})</small><textarea data-list="${key}" rows="3">${esc(p[key].join('\n'))}</textarea></label>`;
  return `${nav()}<main class="screen">
    <h1>${esc(A.heading(p.personName))}</h1>
    <p class="muted" id="about-device-note">${A.deviceNote}</p>
    <p class="note">${A.note}</p>
    <p class="nudge">${esc(A.nudge(p.personName))}</p>
    ${state.demo ? `<p class="sample">${C.app.sample}</p>` : ''}
    <form id="about" class="about">
      <label>${A.theirName}<input data-field="personName" value="${esc(p.personName)}"></label>
      <label>${A.yourName}<input data-field="partnerName" value="${esc(p.partnerName)}"></label>
      <h2>${A.people}</h2>
      ${people}
      <button type="button" data-act="person-add">${A.addPerson}</button>
      <h2>${A.foods}, ${A.places}, ${A.tv}, ${A.music}</h2>
      ${list('foods', A.foods)}${list('places', A.places)}${list('tv', A.tv)}${list('music', A.music)}${list('other', A.other)}
      <h2>${A.historyHeading}</h2>
      <p class="note">${A.historyNote}${state.demo ? ` ${A.historyNoteSample}` : ''}</p>
      ${state.history.length ? `<ul class="history">${state.history.slice(-8).reverse().map((h) => `<li><span>${esc(whenText(h.at, Date.now()))}</span> ${esc(h.q)} <b>${esc(h.label)}</b></li>`).join('')}</ul>${state.history.length > 8 ? `<p class="muted">${state.history.length} in all.</p>` : ''}
      <button type="button" data-act="history-forget">${A.historyForget}</button>` : `<p class="muted">${A.historyEmpty}</p>`}
      <p id="saved" class="saved">${state.saved ? A.saved : ''}</p>
      <div class="actions"><a class="button primary" href="#/">${A.done}</a><button type="button" class="danger" data-act="delete-all">${A.deleteAll}</button></div>
    </form></main>${footer()}`;
}

// ---------------------------------------------------------------- cloud help consent
function cloudScreen(): string {
  const K = C.consent;
  const on = state.settings.cloudHelp;
  const example = state.lastQuestion
    ? `<pre>${esc(JSON.stringify(state.engine.cloudRequest(stripQuestion(state.lastQuestion, state.profile).text), null, 2))}</pre>`
    : `<p class="muted">${K.exampleNone}</p>`;
  const control = on
    ? `<p class="ok">${K.isOn}</p><button class="primary" data-act="cloud-off">${K.turnOff}</button>`
    : `<label class="check big"><input type="checkbox" id="consent" ${state.consentChecked ? 'checked' : ''}>${K.checkbox}</label>
       <button class="primary" data-act="cloud-on" ${state.consentChecked ? '' : 'disabled'}>${K.turnOn}</button>`;
  return `${nav()}<main class="screen">
    <h1>${K.heading}</h1>
    <p>${K.intro}</p>
    <h2>${K.whatHeading}</h2><p>${esc(K.what)}</p>
    <h3>${K.exampleHeading}</h3>${example}
    <h2>${K.whoHeading}</h2><p>${esc(K.who)}</p><p class="muted">${esc(K.settings)}</p>
    <h2>${K.neverHeading}</h2><p>${C.privacy.neverSent}</p>
    <h2>${K.termsHeading}</h2><p>${esc(K.terms)} <a href="${K.termsLink}" target="_blank" rel="noopener">${K.termsLinkText}</a></p>
    <p class="muted">${K.pictures}</p>
    <div class="consent-box">${control}</div>
    <p class="muted">${K.scope}</p>
    <p><a href="#/">${C.app.nav.home}</a></p></main>${footer()}`;
}

// ---------------------------------------------------------------- first run
/** The private helper's state on the first screen, as the SDK reports it. Patched in place when the check finishes. */
function welcomeDevice(): string {
  const W = C.welcome;
  if (!cfg) return `<p><span class="dot off"></span>${C.status.noConfig}</p>`;
  if (state.device === 'checking') return `<p><span class="dot wait"></span>${C.status.checking}</p>`;
  if (state.device === 'available') return `<p><span class="dot ok"></span>${C.status.ready}</p>`;
  if (state.device === 'downloadable' || state.device === 'downloading') return `<p><span class="dot wait"></span>${statusLine().replace(/<span class="dot[^>]*><\/span>/, '')}</p>`;
  return `<p><span class="dot off"></span>${W.cantRun} ${C.status.deviceReason}</p>`;
}

function welcomeScreen(): string {
  const W = C.welcome;
  return `<main class="screen welcome">
    <h1>${W.heading}</h1>
    <p class="who">${W.who}</p>
    <p class="lead">${W.what}</p>
    <ol class="points">
      <li>${W.local}</li>
      <li id="device">${welcomeDevice()}</li>
      <li>${W.cloudOff}</li>
    </ol>
    <div class="actions"><button class="primary" data-act="welcome-setup">${W.setup}</button><button data-act="welcome-sample">${W.sample}</button></div>
  </main>${footer()}`;
}

// ---------------------------------------------------------------- how this works
function howScreen(): string {
  const H = C.how;
  const last = state.made[state.made.length - 1];
  return `${nav()}<main class="screen">
    <h1>${H.heading}</h1>
    <p class="routing"><b>${H.routing}</b></p>
    <p>${H.intro}</p>
    <p class="muted" id="pictures-line">${H.pictures}</p>
    ${diagram()}
    <h2>${H.legs}</h2>${legsTable()}
    ${settingsPanel()}
    <h2>${H.tallyHeading}</h2><p>${H.tally(tally())}</p>
    ${receiptPanel(true)}
    ${last ? `<h2>${H.traceHeading}</h2><p class="muted">${esc(last.asked)}</p>${traceList(last.trace)}${whyPanel(last, true)}` : ''}
    <h2>${H.scoresHeading}</h2><p>${H.scoresNone}</p>
    <h2>${H.lookalikesHeading}</h2><p>${H.lookalikesIntro}</p>
    <ul class="lookalikes">${H.lookalikes.map((l) => `<li><b><a href="${l.url}" target="_blank" rel="noopener">${esc(l.name)}</a></b><br>${esc(l.does)}<br><span class="ours">${esc(l.ours)}</span></li>`).join('')}</ul>
    <p><a href="#/feedback">${C.feedback.link}</a> · <a href="#/">${C.app.nav.home}</a></p></main>${footer()}`;
}

// ---------------------------------------------------------------- feedback
/**
 * "Send feedback" (core/feedback.ts): one note, written to Cloud Firestore on a press of "Send" and never before
 * (web/src/feedback.ts is loaded only then). The form is kept in memory while the page is open, so a failed send or
 * a look at another screen loses nothing; it is never stored on this computer and never sent in part.
 */
const fb: { text: string; role: string; email: string; status: 'idle' | 'sending' | 'sent'; error: FeedbackError | 'failed' | null } = { text: '', role: '', email: '', status: 'idle', error: null };
const isOnline = () => navigator.onLine !== false;
function feedbackScreen(): string {
  const F = C.feedback;
  if (fb.status === 'sent') {
    return `${nav()}<main class="screen feedback"><h1>${F.heading}</h1><p id="fb-status" class="fb-sent" role="status">${F.sent}</p>
      <div class="actions"><button type="button" data-act="fb-again">${F.another}</button><a class="button primary" href="#/">${C.app.nav.home}</a></div></main>${footer()}`;
  }
  const off = !isOnline();
  const sending = fb.status === 'sending';
  const note = !cfg ? F.noConfig : off ? F.offline : fb.error ? F.errors[fb.error] : '';
  return `${nav()}<main class="screen feedback"><h1>${F.heading}</h1>
    <p>${F.intro}</p>
    <form id="fb" novalidate>
      <label for="fb-text">${F.textLabel}</label>
      <textarea id="fb-text" rows="6" maxlength="${FEEDBACK_MAX}" ${sending ? 'disabled' : ''}>${esc(fb.text)}</textarea>
      <p class="fb-row"><span class="fb-warn">${F.noPatients}</span><span id="fb-left" class="muted">${F.left(FEEDBACK_MAX - fb.text.length)}</span></p>
      <label for="fb-role">${F.roleLabel}</label>
      <select id="fb-role" ${sending ? 'disabled' : ''}>${['', ...FEEDBACK_ROLES].map((r) => `<option value="${r}" ${fb.role === r ? 'selected' : ''}>${esc(F.roles[r])}</option>`).join('')}</select>
      <label for="fb-email">${F.emailLabel}</label>
      <input id="fb-email" type="email" autocomplete="email" maxlength="${EMAIL_MAX}" value="${esc(fb.email)}" aria-describedby="fb-email-hint" ${sending ? 'disabled' : ''}>
      <p id="fb-email-hint" class="muted">${F.emailHint}</p>
      <p class="muted">${F.where}</p>
      <p id="fb-status" class="${!cfg || off || fb.error ? 'warn' : 'muted'}" role="status" ${note ? '' : 'hidden'}>${esc(note)}</p>
      <div class="actions"><button id="fb-send" class="primary" type="submit" ${!cfg || off || sending ? 'disabled' : ''}>${sending ? F.sending : F.send}</button><a class="button" href="#/">${C.app.nav.home}</a></div>
    </form></main>${footer()}`;
}
async function submitFeedback() {
  if (!cfg || fb.status === 'sending') return;
  if (!isOnline()) { fb.error = null; render(); return; } // the screen then says it needs a connection
  const checked = feedbackDoc(fb, { version: __APP_VERSION__, commit: __APP_COMMIT__ });
  if (!checked.ok) { fb.error = checked.error; render(); return; }
  fb.status = 'sending'; fb.error = null; render();
  try {
    const { sendFeedback } = await import('./feedback');
    const id = await sendFeedback(cfg, checked.doc);
    console.info(`[feedback] written: ${id}`); // the new note's id; no text
    fb.text = ''; fb.email = ''; fb.status = 'sent';
  } catch {
    fb.status = 'idle'; fb.error = 'failed';
  }
  if (route() === 'feedback') render();
}
// the connection coming or going changes what the form can do: say so at once
for (const ev of ['online', 'offline']) window.addEventListener(ev, () => { if (route() === 'feedback' && fb.status === 'idle') render(); });

// ---------------------------------------------------------------- the simple view
/** What has left this session, for the simple view's privacy line: the receipt's own counts, never estimated. */
function simplePrivacy(): string[] {
  const r = sessionReceipt(state.made, state.profile);
  return privacyLines({
    cloudOn: state.settings.cloudHelp, settingsAsked,
    sent: r.cardsLeft, maybe: r.perCard.filter((x) => x.attempted && !x.left).length, clips: voiceSent.clips, stopped: p9stopped,
  }).concat(state.insSent ? [C.simple.insights.sentLine(state.insSent)] : []).concat(p5.speakSent ? [P5.speak.sent(p5.speakSent)] : []).concat(p6.shared ? [P6.share.sessionLine(p6.shared)] : []).filter((x, i, all) => !((state.insSent || p5.speakSent) && i === 0 && all.length > 1 && (x === C.simple.privacy.none || x === C.simple.privacy.cloudOn)));
}
const aboutName = () => C.about.heading(state.profile.personName);
const whereInput = () => ({ configured: !!cfg, device: state.device, cloudOn: state.settings.cloudHelp, online: isOnline() });
/** Where the card was made and what left for it. A card whose words went to Google to be read aloud never says "Nothing was sent". */
const simpleMade = (c: Card) => {
  const w = madeWhere(c, { spoken: voiceCards.has(c), about: aboutName() });
  if (!p5.spoken.has(c)) return w;
  return w.left === 'nothing' ? { ...w, left: 'sent' as const, lines: [w.lines[0], P5.speak.made, ...w.lines.slice(2)] } : { ...w, lines: [...w.lines, P5.speak.made] };
};

/** "Today in short" as the screens draw it: null until an answer was confirmed today. */
const shortModel = () => (state.short ? { sentences: state.short.sentences, source: state.short.source, busy: state.shortBusy, copied: state.shortCopied } : null);
const todayAnswers = () => todays(state.history).map((h) => ({ q: h.q, label: h.label, at: h.at }));
let shortSeq = 0;
/**
 * Writes "Today in short" again after an answer: the rules' sentences at once, then, where this browser has the
 * on-device model, the model's own (ONLY_ON_DEVICE; core/summary.ts checks them). No cloud step exists on this path.
 */
function refreshShort() {
  const answers = todayAnswers();
  const name = state.profile.personName.trim();
  const seq = ++shortSeq;
  state.shortCopied = false;
  if (!answers.length) { state.short = null; state.shortBusy = false; return; }
  state.short = { sentences: rulesSummary(answers, name), source: 'rules' };
  state.shortBusy = state.device === 'available' && !!state.engine.summarizeDevice && answers.length >= 2;
  if (!state.shortBusy) return;
  void daySummary(answers, name, state.engine, true).then((s) => { if (seq !== shortSeq) return; state.short = s; state.shortBusy = false; patchShort(); });
}
function patchShort() {
  const el = document.querySelector('#today-short');
  if (el) el.outerHTML = shortBlock(shortModel());
}
/** Where a narrowing step would run here, or null when none is offered for this answer. */
function narrowPlace(c: Card, label: string): 'device' | 'cloudOn' | 'ask' | 'offline' | null {
  if (!canNarrow(c, label)) return null;
  const place = aiPlace(whereInput());
  return place === 'none' || place === 'checking' ? null : place;
}
/** One narrowing step (core/narrow.ts): on this device where the model is, else online help when it is on; the consent sheet otherwise. */
async function runNarrow(i: NarrowInput) {
  const seq = ++makeSeq;
  useSettings();
  state.narrowPending = i;
  const once = p5.once; p5.once = false;
  state.busy = true; state.error = null; resetCard(); render();
  if (state.device === 'checking') await refreshDevice().catch(() => { state.device = 'unavailable'; });
  const card = await narrowCard(i, { profile: state.profile, support: state.settings.support, engine: state.engine, allowCloud: state.settings.cloudHelp || once, deviceReady: state.device === 'available', routing: routing() });
  state.made.push(card);
  if (!card.blocked) noteAsk(card);
  if (seq !== makeSeq) return;
  setCard(card);
  state.sheet = simpleView() && isOnline() && card.blocked !== C.notes.cloudCheckBlocked && sheetWanted(card, { cloudOn: state.settings.cloudHelp, cloudConfigured: state.engine.cloudConfigured });
  state.busy = false; state.waitStart = Date.now(); useSettings(); render();
}

/**
 * "/" in the simple view: the first screen, the screen before handing over or the screen after an answer, by the same
 * state the full view reads. The consent sheet is drawn over it when a question needs online help (state.sheet).
 */
/**
 * What comes after this answer (core/tree.ts): the next questions and, at the end of a path, the line that says what
 * to do now. For a question the trees do not know (a typed one) the older follow-ups of core/topics.ts stand.
 */
function treeStep(c: Card, p: Choice, out: boolean): { follow: string[]; end: string; alert?: true } {
  if (c.kind === 'needs' || c.kind === 'repair') return { follow: [], end: '' };
  // "What is it about?": the body leads to the body card and the first questions of "Body & care", a feeling to the feelings card
  if (c.aboutWhat) return { follow: out ? [] : ABOUT_LEADS[p.label] === 'body' ? [WHERE_HURTS, ...BODY_FIRST.filter((q) => q !== WHERE_HURTS)].slice(0, 3) : ABOUT_LEADS[p.label] === 'feeling' ? [FEEL_QUESTION] : [], end: '' };
  // a word the carer typed after "show me": a word about pain, the toilet or help leads on as it does for a first-letter word
  if (c.typed) return out ? { follow: [], end: '' } : letterEnd(p.spoken);
  // a card of more choices of one kind: the confirmed choice ends with what to do ("Bring Frank juice.")
  if (c.more) return out ? { follow: [], end: '' } : { follow: [], end: P7.more.end(c.more.subject, p.spoken || p.label, state.profile.personName.trim()) };
  // a first-letter card: the word is the answer; the menu the person started from: up to three questions of that topic
  if (c.letter) return out ? { follow: [], end: '' } : letterEnd(p.spoken);
  if (c.photoTalk && photoEnd(c.asked, p.label, state.profile.personName.trim())) return { follow: [], end: photoEnd(c.asked, p.label, state.profile.personName.trim()) };
  // (the questions about the telling follow what it is about, also after "someone else" there; the way out of the topics has none)
  // (phase 10) after "I want to talk about…": three questions by what was picked (core/turn.ts, talkLead)
  if (c.turn === 'talk') return { follow: !out && state.p4.turn?.talk ? talkLead(state.p4.turn.talk, '').ask : [], end: '' };
  if (c.turn) return { follow: out && c.turn !== 'about' ? [] : turnLead('tell', '', state.p4.turn?.topic ?? menuTopic(p.label)).ask, end: '' };
  // the short question about the usual choice: a yes ends as that choice would; anything else leads to the full question
  const sc = state.shortcut;
  if (sc && sc.q === c.asked) {
    if (p.label.toLowerCase() !== 'yes') return { follow: [sc.of], end: '' };
    const viaChoice = after({ asked: sc.of, kind: 'choice' }, sc.label, state.profile, state.chain.length ? state.chain : [sc.of], callNumber());
    return { follow: viaChoice.next, end: viaChoice.end };
  }
  const step = after(c, p.label, state.profile, state.chain.length ? state.chain : [c.asked], callNumber(), p5.red ?? redPlace(c.asked, p.label));
  if (step.next.length || step.end) return { follow: step.next, end: step.end, ...(step.alert ? { alert: step.alert } : {}) };
  return { follow: out || p.role !== 'answer' ? [] : followUps(c, p.label, state.profile), end: '' };
}

function simpleScreen(): string {
  const c = state.card;
  const name = state.profile.personName.trim();
  let screen: string;
  if (c && state.confirmed && state.picked && !state.recap && !state.recapDone) {
    const p = state.picked;
    const lead = c.aboutWhat && p.role === 'answer' ? ABOUT_LEADS[p.label] : undefined;
    const next = lead && lead !== 'body' && lead !== 'feeling' ? { act: 'more-like', label: P7.more.next(P7.more.ask[lead]) } : partnerActions(c, { less: false, hasAnswers: false }).find((a) => a.act === 'next' && !!c.pending) ?? null;
    // the way out of a card (not of the needs board, which has its own line, and not a way to try from the repair card)
    // (phase 13: "not sure" to a stroke sign is not a way out: its end line is a safety check, `alert`, and the pain questions follow)
    const step0 = treeStep(c, p, p.role === 'escape' && c.kind !== 'needs');
    const out = p.role === 'escape' && c.kind !== 'needs' && !step0.alert;
    const alertHtml = step0.alert ? nowAlert(step0.end, callNumber(), numberGuess()) : '';
    screen = answeredScreen({
      name, label: p.label, question: c.kind === 'needs' ? '' : c.asked, more: state.more, next, out, hasAnswers: state.answers.length > 0,
      afterHtml: `${afterAnswer(c, p, 'btn')}${c.photoTalk ? `<a class="btn" id="pt-back" href="#/phototalk">${P4.photo.questions}</a>` : ''}`,
      ...(() => {
        const step = step0;
        // a shorter way, as a suggestion: the usual side of the next either-or, asked first (the full question stays)
        const sc = learns() && step.follow[0] && !careAnswer(step.follow[0], '', careTopic(c)) ? shortcut(state.history, step.follow[0], state.forgotten) : null;
        return { ...step, shortcut: sc ? { q: sc.q, line: sc.line, of: step.follow[0], label: sc.usual.label } : null };
      })(),
      // (never a question that offers a refused choice again, and one about the same kind of thing: core/topics.ts)
      tryNext: out ? nextInTopic(state.lastQuestion, state.profile, [...(c.narrow?.rejected ?? []), ...c.choices.filter((x) => x.role === 'answer').map((x) => x.label)]) : null,
      narrow: out && !c.letter && !c.turn ? narrowPlace(c, p.label) : null, narrowLast: out && !!c.narrow && !canNarrow(c, p.label), short: shortModel(),
      who: p.role === 'answer' && asksWho(c, p.label, state.profile),
      invite: state.inviteFor === c && !state.inviteOff,
      today: state.history.filter((h) => h.at >= pageStart).slice(-5).reverse().map((h) => ({ q: h.q, label: h.label })),
      made: simpleMade(c), privacy: simplePrivacy(), guardHtml: c.kind === 'repair' || c.letter || c.turn || c.visit || state.p4.turn ? '' : guardHtml(c, p.label),
      alertHtml,
      // (the red box with the call button stands over the answer, for the whole conversation; a safety-check alert carries its own call above "Next")
      leadHtml: `${p5.urgent || urgentAnswer(c.asked, p.label) ? urgentBox(callNumber(), 'urgent', numberGuess(), p5.signNow || signNow(c.asked, p.label)) : ''}${voiceFailedHtml()}${chipBlock(routeChip(c, aboutName()))}${lowMoodAnswer(c.asked, p.label) && !crisisAnswer(p.label) ? lowHelpLine(state.profile.personName.trim(), crisisLineNow(), callNumber()) : ''}${turnHtml()}`,
      outExtra: !out ? '' : c.letter ? `${letterMoreButton(c.letter.letter)}${letterButton(name, true)}` : letterButton(name),
      // after the way out: the ways to find out what it is, in the rules' order; a step the rules make comes first
      ...(out ? (() => { const ways = outWays(c, state.profile, careTopic(c)); const subject = c.more?.subject ?? moreSubject(c.asked, shownOn(c)); return { ways, moreFirst: subject && ways[0] === 'more' ? moreChoices(subject, shownOn(c), state.profile).slice(0, 3) : [], keepLead: !!c.turn }; })() : {}),
    });
  } else if (c && !state.busy) {
    const prev = c.blocked || c.kind === 'repair' || c.kind === 'needs' || noPriming(c) ? null : lastAnswer(state.history, c.asked, state.cardAt);
    screen = cardScreen({
      name, card: c, less: state.less, recap: state.recap, recapDone: state.recapDone, recapText: recapText(),
      actions: partnerActions(c, { less: state.less, hasAnswers: state.answers.length > 0 }),
      made: simpleMade(c), personHtml: personSimple(personModel(false)),
      canAskOnline: sheetWanted(c, { cloudOn: state.settings.cloudHelp, cloudConfigured: state.engine.cloudConfigured }),
      offline: needsInternet(c, { online: isOnline(), cloudConfigured: state.engine.cloudConfigured }),
      lastTime: prev ? C.card.lastTime(whenText(prev.at, Date.now()), prev.label) : '', short: shortModel(), tips: state.tips,
      usual: (() => { const u = usualFor(c); return u ? usualHint(u) : ''; })(),
      // (the call box stays over the next questions of a conversation in which an answer can be urgent)
      topHtml: `${p5.urgent && !c.blocked ? urgentBox(callNumber(), 'urgent', numberGuess(), p5.signNow) : ''}${voiceFailedHtml()}${chipBlock(routeChip(c, aboutName()))}`,
      guardHtml: c.blocked || c.kind === 'repair' || c.kind === 'no-quiz' || c.letter || c.turn || c.visit || state.p4.turn ? '' : guardHtml(c),
      // the first-letter helper: its way in from "We're stuck", who found a letter card's words, and another letter when there was no word
      extraHtml: `${c.kind === 'repair' ? letterButton(name) : c.letter ? (c.blocked ? letterButton(name, true) : letterBy(c.letter.by)) : ''}${canSpeak() && !c.blocked && c.kind !== 'no-quiz' && (speakable(c) || speakOn()) ? speakSwitch({ name, on: speakOn(), online: isOnline(), can: speakable(c) }) : ''}${p5.spoken.has(c) ? readAloudLine() : ''}`,
    });
  } else {
    const p = state.profile;
    screen = homeScreen({
      name, number: callNumber(), sampleHref: handheld() ? '#/sample' : '#/demo', sampleOn: state.demo,
      aboutLink: !!state.settings.firstCard || !!(name || p.people.length || p.foods.length || p.places.length || p.tv.length || p.music.length),
      busy: state.busy, error: state.error, question: state.lastQuestion,
      // (phase 9, judge round 8: folded on the first visit too, to its one line with "Write the key word big.", so the
      // topics' first row is above the fold; open only once the carer opened it)
      howOpen: state.settings.howFolded === false, topics: topics(p), topicOpen: state.topicOpen, aiTag: aiTag(whereInput()), ai: aiLines(whereInput()),
      privacy: simplePrivacy(), micHtml: voiceButton(), voiceHtml: voiceLine(), diaryHtml: `${diaryLink()}${!state.demo && state.diary.length ? handoverLink() : ''}${p4Links(name)}${passportLink(name)}`,
      bodyHtml: suddenLink('sudden-body'),
      tryHtml: tryAiBlock({ q: AI_QUESTION, tag: tryAiTag(whereInput()), busy: state.busy && p9sample.q !== null && state.lastQuestion === p9sample.q }),
      laterHtml: (p9notNow ? `<p class="tip" id="not-now" role="status">${esc(P9.later.notNow(name, p9notNow.kept))}</p>` : '') + laterBlock(shownLater(p8later.list, Date.now()).map((x) => ({ q: x.q, time: laterTime(x.at), ago: agoText(x.at, Date.now()), i: p8later.list.indexOf(x), care: !!x.care, pain: !!x.pain, asking: p8later.asking === x })), laterPainHtml(callNumber(), numberGuess())),
      turnHtml: `${turnButton(name)}${suddenFirst(callNumber(), numberGuess())}${state.p4.letterNo ? `<p class="tip" id="letter-no" role="status">${esc(P4.letter.noLetter(name))}</p>` : ''}`,
    });
  }
  if (!state.sheet || !c?.unsentPayload) return screen;
  // the first-letter step: the sheet shows the one line that comes from the conversation (the question and the letter), then the whole request
  if (c.letter) return `${screen.replace('<main class="simple', '<main inert aria-hidden="true" class="simple')}${letterSheet({ line: sentLine(c.unsentPayload).text.split(` ${LETTER_CLOUD_TASK}`)[0].split(' Give two or three')[0].replace(/^Partner asks:\s*/, ''), request: c.unsentPayload })}`;
  return `${screen.replace('<main class="simple', '<main inert aria-hidden="true" class="simple')}${consentSheet({ about: aboutName(), line: c.narrow ? sentLine(c.unsentPayload).text.split(` ${NARROW_TASK}`)[0].replace(/^Partner asks:\s*/, '') : sentLine(c.unsentPayload).text, deviceThere: state.device === 'available', ...(c.narrow ? { narrow: { request: c.unsentPayload } } : {}) })}`;
}
/** The simple view's lines that depend on the device check or the connection, updated in place (no redraw). */
function patchSimple() {
  const a = document.querySelector('#ai-line span'); if (a) a.textContent = aiLines(whereInput()).join(' ');
  const t = document.querySelector('#ai-tag'); if (t) t.textContent = aiTag(whereInput());
  const tt = document.querySelector('#try-ai-tag'); const tag = tryAiTag(whereInput()); if (tt && tag) tt.textContent = tag;
}
// the connection came or went: the AI line and the "needs internet" tag follow; a no-card screen is drawn again
for (const ev of ['online', 'offline']) window.addEventListener(ev, () => { if (!simpleView() || route() !== 'partner') return; if (state.card?.blocked && !state.sheet) render(); else patchSimple(); });

// ---------------------------------------------------------------- phase 4: the first letter, the person starts, the doctor visit, a photo
/** A question asked from the person's own start keeps the line "[Name] started this" (set just before `make`). */
let turnKeep = false;
/** What does not outlive a conversation: the alphabet, the start by the person, the visit questions on the person's screen. The visit answers themselves stay. */
function clearP4() { state.p4.letter = null; state.p4.letterNo = false; state.p4.letterPending = null; state.p4.turn = null; state.p4.visitRun = false; state.p4.visitEnd = false; }
/** The person's own start ("I want to say something"): from the Home button, or from the shortcut's address `#/turn`. */
function openTurn() {
  if (step === 'waiting') step = 'cancelled';
  makeSeq++; clearP4(); state.busy = false; state.error = null; state.lastQuestion = ''; resetCard(); p5.urgent = false; p5.signNow = false; p5.red = null;
  const card = turnCard(); setCard(card); state.made.push(card); state.waitStart = Date.now();
  notePractice({ k: 'turn', at: Date.now() });
}
/** The carer takes the phone back from the person's screen (the press and hold): to the visit page while its questions run, else to the carer's screen. */
function leavePerson() {
  lift = true;
  // (phase 8) to the carer's screen the phone was handed over from, as it was: also from a needs board opened inside a
  // conversation, from the person's own start and from the alphabet's words
  if (state.p4.visitRun || state.p4.visitEnd) { dropPerson(); state.p4.visitRun = false; state.p4.visitEnd = false; resetCard(); go('visit'); return; }
  // an answer the person confirmed (a need on the board, held away after the tick): the carer's side of that answer,
  // never the screen from before it, which would hide what was chosen
  if (state.confirmed && state.picked) { dropPerson(); state.p4.letter = null; go(''); return; }
  const to = backToCarer();
  if (to !== null) { stopSound(); go(to as Route | ''); return; }
  state.p4.letter = null;
  go('');
}
/** The usual answers learned on this device (core/prefs.ts), as plain words: for the rules of the first-letter helper and its ON-DEVICE prompt only. */
const learnedWords = () => (learns() ? aboutLearned(learned(state.history, state.needsLog, state.forgotten)).flatMap((l) => (l.kind === 'usual' ? [usual(state.history, l.q, state.forgotten)?.label ?? ''] : [])).filter(Boolean) : []);
/**
 * One step of the first-letter helper (core/letter.ts): the rules' words when there are two or more; else the model on
 * this device; else online help, only when it is on, and otherwise the sheet with the exact text first.
 */
async function runLetter(i: LetterInput) {
  const seq = ++makeSeq;
  useSettings();
  state.p4.letterPending = i; state.p4.letter = null; state.p4.letterNo = false;
  const once = p5.once; p5.once = false;
  state.busy = true; state.error = null; resetCard(); render();
  if (state.device === 'checking') await refreshDevice().catch(() => { state.device = 'unavailable'; });
  const card = await letterCard(i, { profile: state.profile, support: state.settings.support, engine: state.engine, allowCloud: state.settings.cloudHelp || once, deviceReady: state.device === 'available', routing: routing() });
  state.made.push(card);
  if (seq !== makeSeq) return;
  setCard(card);
  state.sheet = simpleView() && isOnline() && card.blocked !== C.notes.cloudCheckBlocked && sheetWanted(card, { cloudOn: state.settings.cloudHelp, cloudConfigured: state.engine.cloudConfigured });
  state.busy = false; state.waitStart = Date.now(); useSettings();
  // words were found: they are on the person's screen at once; none: the carer's screen says so (and may ask about online help)
  if (card.blocked && route() === 'person') { lift = true; go(''); } else render();
}
/**
 * The tick on a doctor-visit question or on a card the person started from. True when the answer led straight on to
 * the next card on the person's screen (the choice is cleared for it; nothing is ever chosen here for the person).
 */
function p4Confirm(c: Card, picked: Choice): boolean {
  // a doctor-visit question: the answer goes on the visit page, exactly as given, and the next question follows.
  // It is not in the history or the journal, and the answer check never reads or marks it.
  if (c.visit && state.p4.visitRun && state.p4.visit) {
    state.p4.visit.answers = [...state.p4.visit.answers.filter((a) => a.id !== c.visit), { id: c.visit as VisitRecord['answers'][number]['id'], q: c.asked, label: visitLabel(c, picked.label), at: Date.now(), ...(picked.role === 'escape' ? { out: true } : {}) }];
    void kvSet('visit', state.p4.visit);
    // (phase 13) an answer that can be urgent stops the run: the person gives the phone back, the carer reads the call box first
    if (visitStops(state.p4.visit)) { state.p4.visit.stopped = true; void kvSet('visit', state.p4.visit); state.picked = null; makeSeq++; resetCard(); state.p4.visitRun = false; state.p4.visitEnd = true; render(); return true; }
    state.picked = null; void visitNext(); return true;
  }
  // the person started: the starter leads on, still on this screen (the needs board, the topics, the feelings card)
  if (c.turn === 'start') {
    const s = starterOf(picked.label);
    state.p4.turn = { starter: s ?? 'else', topic: null };
    // (phase 10) "I want to talk about…" first offers the family's people and places (core/turn.ts, talkMenu)
    if (s === 'need' || s === 'tell') { const card = s === 'need' ? needsCard() : talkMenu(state.profile); setCard(card); state.made.push(card); state.picked = null; state.waitStart = Date.now(); render(); return true; }
    if (s === 'feel') { turnKeep = true; askBy = 'none'; void make(FEEL_QUESTION); return true; }
  } else if (c.turn === 'topics' && state.p4.turn) {
    const topic = picked.role === 'answer' ? menuTopic(picked.label) : null;
    state.p4.turn = { starter: 'tell', topic };
    // what in that topic it is about, still on this screen ("Who is it about?"); none for "Body & care" or with no names
    const about = topic ? aboutCard(topic, state.profile) : null;
    if (about) { setCard(about); state.made.push(about); state.picked = null; state.waitStart = Date.now(); render(); return true; }
  } else if (c.turn === 'about' && state.p4.turn) state.p4.turn = { ...state.p4.turn, what: picked.role === 'answer' ? picked.label : '' };
  else if (c.turn === 'talk' && state.p4.turn) {
    const talk = picked.role === 'answer' ? talkPick(picked.label, state.profile) : null;
    state.p4.turn = { starter: 'tell', topic: null, what: picked.label, ...(talk ? { talk } : {}) };
  }
  return false;
}
/** Phase 10: the diary's words for what the person started with ("Beth", "the lake", "People & family: me"), and its topic. */
function startedLabel(c: Card, label: string): { label: string; topic: DiaryTopic } {
  const t = state.p4.turn;
  if (c.turn === 'talk' && t?.talk) return { label: t.talk.kind === 'me' ? P10.turn.diaryMe : t.talk.word, topic: t.talk.kind === 'person' ? 'people' : t.talk.kind === 'place' ? 'plans' : t.talk.kind === 'news' ? 'fun' : 'other' };
  const topic = t?.topic ?? menuTopic(label);
  const name = topic ? TOPIC_BASE.find((x) => x.id === topic)?.label ?? '' : '';
  return { label: c.turn === 'about' && name ? `${name}: ${label}` : label, topic: topic ?? 'other' };
}
/** The line the carer reads when the person started this conversation: '' otherwise. */
function turnHtml(): string {
  const t = state.p4.turn;
  if (!t) return '';
  if (t.talk) return turnLine({ line: talkLead(t.talk, state.profile.personName.trim()).line, about: '' });
  const lead = turnLead(t.starter, state.profile.personName.trim(), t.topic, t.what);
  return turnLine({ line: lead.line, about: lead.about });
}
/** The next question of the fixed doctor-visit list onto the person's screen, or the end of the list. No model: core/visit.ts. */
async function visitNext() {
  const r = state.p4.visit;
  if (!r) return;
  const v = nextVisit(r.answers);
  makeSeq++; state.busy = false; state.error = null; resetCard();
  if (!v) { r.done = true; void kvSet('visit', r); state.p4.visitEnd = true; state.p4.visitRun = false; if (route() === 'person') render(); else go('person'); return; }
  const card = await visitCard(v, state.profile, state.settings.support);
  setCard(card); state.p4.visitRun = true; state.p4.visitEnd = false; state.waitStart = Date.now();
  if (route() === 'person') render(); else { lift = true; go('person'); }
}
/** The doctor-visit page: the person's own answers, the call box when an answer can be urgent, and "Since the last visit" apart from them. */
function visitView(): string {
  const r = state.p4.visit;
  const m = sinceModel();
  const has = !!r && r.answers.length > 0;
  const urgent = has && (urgentAny(r.answers) || m.since.urgent);
  const low = has && r.answers.some((a) => (a.id === 'mood' || a.id === 'worry') && lowMood(a.q, a.label));
  // (phase 13) the run stopped on an urgent answer and has not gone on: the box names it, with "Go on with the questions"
  const stopped = has && !!r.stopped && !r.wentOn && !r.done;
  return visitScreen({ name: m.name, record: r, copied: state.p4.visitCopied, urgentHtml: `${stopped ? visitStopBox(visitAlert(r.answers, m.number), m.number, numberGuess()) : urgent ? urgentBox(m.number, 'visit-urgent') : ''}${low ? lowHelpLine(m.name, crisisLineFor(state.health.helpline ?? '', m.number), m.number) : ''}`, sinceHtml: has ? sinceBlock(m) : '', controlsHtml: has ? sinceControls(m) : '' });
}
/** The questions about the picked photo: the rules' three, and one more when the on-device model named things in it. */
function talkQuestions(): PhotoQuestion[] {
  const t = state.p4.talk;
  const photo = state.photos.find((x) => x.id === t?.id);
  if (!t || !photo) return [];
  const more = t.things ? thingsQuestion(t.things) : null;
  return [...photoQuestions(photo.word, state.profile), ...(more ? [more] : [])];
}
function photoTalkView(): string {
  const t = state.p4.talk;
  const picked = state.photos.find((x) => x.id === t?.id) ?? null;
  const can = !state.demo && state.device === 'available' && !!state.engine.lookDevice;
  const look = !picked || !t ? null : t.look === 'busy' ? 'busy' : t.things && thingsQuestion(t.things) ? 'done' : t.look === 'none' ? 'none' : can ? 'ask' : null;
  return photoTalkScreen({ name: state.profile.personName.trim(), photos: state.photos, picked, questions: talkQuestions(), look });
}
/**
 * The carer asked the model ON THIS DEVICE to look at the picked photo (ONLY_ON_DEVICE through Firebase AI Logic; the
 * engine throws on any other source, and has no cloud form of this call). Code checks every word it names.
 */
async function lookAtPhoto() {
  const t = state.p4.talk;
  const photo = state.photos.find((x) => x.id === t?.id);
  if (!t || !photo || !state.engine.lookDevice || state.device !== 'available') return;
  t.look = 'busy'; render();
  let things: string[] = [];
  try {
    const m = photo.data.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
    if (m) { const r = await state.engine.lookDevice({ mimeType: m[1] as 'image/jpeg' | 'image/png', base64: m[2] }); if (r.source === 'on-device') things = checkedThings(r.text, photo.word); }
  } catch { /* nothing usable: the rules' questions stand */ }
  if (state.p4.talk !== t) return;
  t.things = things; t.look = thingsQuestion(things) ? null : 'none';
  if (route() === 'phototalk') render();
}
/** One question about the photo becomes the card on the carer's screen. Fixed choices, or the app's rules with no model to call. */
async function askAboutPhoto(pq: PhotoQuestion) {
  const seq = ++makeSeq;
  const q = pq.q;
  const card = await photoTalkCard(pq, state.profile, state.settings.support);
  if (seq !== makeSeq) return;
  state.busy = false; state.error = null; state.lastQuestion = q; state.chain = [q]; resetCard(); clearP4();
  state.made.push(card); setCard(card); state.waitStart = Date.now();
  notePractice({ k: 'ask', at: Date.now(), topic: topicOf(q, state.profile)?.id ?? guessTopic(q), by: 'app', start: true });
  go(''); window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- render
let timer: ReturnType<typeof setInterval> | null = null;
let lastKey = '';
/** `lifted`: this draw is the new state of a "lift the card" view transition, which is its own entrance. */
function render(lifted = false) {
  const r = route();
  const app = $('#app');
  // the route goes on #app with a prefix: a bare "person" or "welcome" class made #app pick up the card pane's frame
  // and the welcome padding (the thin frame around the full-screen card, DESIGN_DIRECTIONS "must fix")
  // the diary is a carer's screen of the simple view, whichever view the rest is in
  const simple = (simpleView() && (r === 'partner' || r === 'about')) || r === 'diary' || r === 'visit' || r === 'phototalk' || r === 'sudden' || r === 'crisis' || r === 'practice' || r === 'passport';
  // (phase 7) the box for the needs and pain answers is off again once the page was left; the passport opens on its lines
  if (r !== 'practice') p8.health = false;
  if (r !== 'passport') p8.page = false;
  app.className = `route-${r}${simple ? ' view-simple' : ''}`;
  // the simple view has its own light look (dark by the system setting); the full view and the person's card do not change
  document.documentElement.dataset.view = simple ? 'simple' : r === 'person' ? 'person' : 'full';
  if (r !== 'partner') voice.cancel(); // the microphone records on the partner screen only: leaving it ends the go
  // entrance animations play once per real event (a new route or a new card), not on every redraw
  trackScreen(r);
  const key = `${r}|${cardSeq}`;
  // the card judge mode opens with is simply there: no entrance, so the very first frame is a finished card
  if (key !== lastKey && r === 'about' && simple) refreshLearnedShort();
  const fresh = key !== lastKey;
  if (r !== 'person') stopSound();
  if (key !== lastKey) { lastKey = key; if (!lifted && !(r === 'partner' && state.first)) app.classList.add('enter'); }
  app.innerHTML = r === 'partner' ? (simple ? simpleScreen() : partnerScreen()) : r === 'person' ? personScreen() : r === 'about' ? (simple ? aboutSimple({ profile: state.profile, open: state.aboutRow, saved: state.saved, learned: learns() ? aboutLearned(learned(state.history, state.needsLog, state.forgotten)) : [], learnedShort: state.learnedShort, photos: state.photos, photoError: state.photoError, health: state.health, backupHtml: `${passportLink(state.profile.personName.trim(), 'passport-about')}${backupBlock({ error: state.backupError, done: state.backupDone, health: state.backupHealth })}`, numberHtml: numberField(state.health.emergency, state.health.helpline ?? ''), desktopAi: state.device === 'available' && !!state.engine.lookDevice }) : aboutScreen()) : r === 'diary' ? diaryView() : r === 'practice' ? practiceView() : r === 'passport' ? passportView() : r === 'visit' ? visitView() : r === 'sudden' ? suddenScreen({ number: callNumber(), guess: numberGuess() }) : r === 'crisis' ? crisisScreen({ name: state.profile.personName.trim(), number: callNumber(), line: crisisLineButton(), lineGuess: !state.demo && !(state.health.helpline ?? '').trim(), numberGuess: numberGuess() }) : r === 'phototalk' ? photoTalkView() : r === 'cloud' ? cloudScreen() : r === 'how' ? howScreen() : r === 'feedback' ? feedbackScreen() : r === 'trial' ? trialScreen() : welcomeScreen();
  if (timer) { clearInterval(timer); timer = null; }
  keepGuard();
  if (simple && state.updateReady) app.insertAdjacentHTML('afterbegin', `<button type="button" class="update-bar" id="update-bar" data-act="update">${C.simple.update}</button>`);
  // the sheet is a dialog: the keyboard starts on its heading, and the screen under it is inert
  if (simple && state.sheet) document.querySelector<HTMLElement>('#sheet-h')?.focus();
  // Read aloud: the sheet before it is turned on shows the words of the card in front of the carer
  if (simple && r === 'partner' && p5.speakSheet && speakable(state.card)) {
    const text = speakText(state.card);
    app.querySelector('main')?.setAttribute('inert', '');
    app.insertAdjacentHTML('beforeend', speakSheet({ text, request: JSON.stringify(state.engine.speakRequest?.(text) ?? {}, null, 2), name: state.profile.personName.trim() }));
    document.querySelector<HTMLElement>('#speak-sheet-h')?.focus();
  }
  // a new card on the person's screen is read aloud once, when Read aloud is on (the button there repeats it)
  if (r === 'person' && fresh && simpleView() && speakOn() && speakable(state.card) && !state.picked && !state.p4.letter) { p5.hear = 'ready'; void hear(); }
  // adding a photo (About them): a dialog over the screen, which is inert under it
  if (simple && r === 'about' && state.photoDraft) {
    const d = state.photoDraft;
    app.querySelector('main')?.setAttribute('inert', '');
    app.insertAdjacentHTML('beforeend', photoSheet({ src: d.loaded.src, w: d.loaded.w, h: d.loaded.h, frame: d.frame, step: d.step, framed: d.framed, word: d.word, error: d.error }));
    document.querySelector<HTMLElement>(d.step === 'label' ? '#photo-word' : '#photo-h')?.focus();
  }
  // the two sheets of phase 3: the exact text before insight lines go to online help, and what a file holds before it replaces About them
  if (r === 'diary' && state.insSheet) {
    app.querySelector('main')?.setAttribute('inert', '');
    app.insertAdjacentHTML('beforeend', insightSheet({ text: state.insSheet.text, request: state.insSheet.request }));
    document.querySelector<HTMLElement>('#ins-sheet-h')?.focus();
  }
  // phase 6: the exact text before it is shared with the family or the next carer
  const sharing = r === 'diary' || r === 'partner' || r === 'practice' || r === 'passport';
  if (p6.share && !sharing) p6.share = null;
  if (p6.share && sharing) {
    const sh = p6.share;
    app.querySelector('main')?.setAttribute('inert', '');
    app.insertAdjacentHTML('beforeend', shareSheet({ kind: sh.kind, text: sh.text, health: sh.health, hasHealth: hasHealth(state.health), risky: sh.kind === 'handover' ? riskyNotes({ ...state.health, swallowing: false, fluidLimit: false }) : riskyNotes(state.health), ...(sh.kind === 'handover' ? { always: riskyNotes({ ...state.health, diabetes: false }) } : {}), canShare: canShare(), device: copyDevice(), status: sh.status, ...(sh.kind === 'practice' ? { page: { heading: P8.practice.sheetHeading, note: sh.health ? P8.practice.sheetHealthOn : P8.practice.sheetHealthOff } } : sh.kind === 'passport' ? { page: { heading: P8.passport.sheetHeading, note: P8.passport.sheetNote } } : {}) }));
  }
  if (simple && r === 'about' && state.importDraft) {
    app.querySelector('main')?.setAttribute('inert', '');
    app.insertAdjacentHTML('beforeend', importSheet(state.importDraft.preview));
    document.querySelector<HTMLElement>('#import-h')?.focus();
  }
  if (r === 'trial') {
    timer = setInterval(() => { const el = document.querySelector('#elapsed'); const c = trialClock(); if (el && c) el.textContent = c; }, 100);
  }
  if (r === 'partner' && state.card && !state.card.blocked && !state.picked) {
    state.waitStart ??= Date.now();
    const tick = () => { const el = document.querySelector('#wait'); if (!el || !state.waitStart) return; const s = Math.floor((Date.now() - state.waitStart) / 1000); el.textContent = C.card.waiting(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); };
    tick();
    timer = setInterval(tick, 1000);
  }
}

/**
 * "Show to person" lifts the card: the white pane on the desk grows into the whole screen (and comes back down when
 * the partner leaves the person's screen), as a view transition on that one element (styles.css, `tp-card`), 250 ms.
 * It is the gesture the product is built on: the card is held up to the person. Where the browser has no view
 * transitions, or the system asks for reduced motion, the screen simply changes, as it did before.
 */
let lift = false;
function draw() {
  const lifting = lift && 'startViewTransition' in document && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  lift = false;
  if (!lifting) { render(); return; }
  const root = document.documentElement;
  root.dataset.lift = '1'; // names the card for the transition only while it runs
  try {
    void document.startViewTransition(() => render(true)).finished.finally(() => { delete root.dataset.lift; });
  } catch { delete root.dataset.lift; render(); }
}

// ---------------------------------------------------------------- actions
/**
 * A device-status change (the check finishing, a download tick) updates the status elements in place instead of
 * redrawing the screen: nothing else on screen depends on it, and a redraw would cut the entrance animation short
 * (the device check finishes within the first second of the welcome screen) and reset the question field.
 */
function patchDevice() {
  const s = document.querySelector('#status'); if (s) s.innerHTML = statusLine();
  const d = document.querySelector('#device'); if (d) d.innerHTML = welcomeDevice();
  patchRecorded();
  patchSimple();
  const n = document.querySelector<HTMLElement>('#nodevice'); if (n) n.hidden = state.device === 'available' || state.device === 'checking';
}
/**
 * Asks the browser whether it can run the private helper. Until the first answer the status line says "checking",
 * never "can't run": the state used to start as 'unavailable', so a capable browser showed "This computer can't run
 * the private helper" until the answer came, and for good if a redraw raced it. A browser that has just started can
 * also answer "unavailable" for a moment before its model component is registered, so that answer is asked again
 * twice (after 2 s and 6 s) before it stands. A capability query only: no inference, no network.
 */
let recheck = 0;
/** True once the answer stands (an "unavailable" that was asked again twice, or any other answer). */
let deviceFinal = false;
let probing: Promise<void> | null = null;
function patchRecorded() {
  const rc = document.querySelector('#recorded'); if (rc) rc.innerHTML = recordedBlock();
  const rl = document.querySelector('#rec-link'); if (rl) rl.innerHTML = recordedLink();
}
function refreshDevice(): Promise<void> {
  return (probing ??= (async () => {
    try {
      state.device = await state.engine.deviceStatus();
      patchDevice();
      void warm();
      if (state.device === 'unavailable' && cfg && recheck < 2) setTimeout(() => void refreshDevice().then(() => judgeStep()), recheck++ ? 4000 : 2000);
      else { deviceFinal = true; patchDevice(); }
    } finally { probing = null; }
  })());
}
/**
 * Once per page load, when the private helper is there: load it into memory before the first question, so the first
 * open question does not wait for it (16 to 22 s after a browser start on the development machine, about 3 s afterwards). The status
 * line says "getting ready" meanwhile; questions can be asked during it.
 */
let warmed = false;
let warmOk = false;
async function warm() {
  if (warmed || state.device !== 'available' || !state.engine.warmDevice) return;
  warmed = true;
  state.warming = true; patchDevice();
  try { await state.engine.warmDevice(); warmOk = true; } catch { /* the first real question will report the failure in its trace */ }
  state.warming = false; patchDevice();
  judgeStep();
}

/**
 * Judge mode's first step, run by the app itself, once per page load. The first frame is a card made in code (it has
 * to be instant, and it has to be there on a copy with no model). What follows it, with no click, is the part a judge
 * came for: as soon as the on-device model has loaded, the app asks one open, personal question (`SAMPLE_STEP`) and
 * Gemini Nano makes the card from About me, on this computer. The card's badge is the one every card gets, from the
 * SDK's `inferenceSource`: "On this computer".
 *
 * Kept safe on purpose: cloud help is left out of this step whatever the setting, so nothing can be sent by a step
 * the judge did not click; it runs only while the first card is still untouched (any question asked or typed first
 * cancels it); the first card stays on screen while the model works; and if the model gives no card on this
 * computer, the first card simply stays and the status line says so. Where there is no on-device model, nothing runs
 * and the status line says that plainly (`statusLine`).
 */
let step: 'waiting' | 'running' | 'done' | 'failed' | 'cancelled' = 'waiting';
let stepCard: Card | null = null;
let makeSeq = 0;
function judgeStep() {
  if (step !== 'waiting' || !state.demo || !state.first || state.busy) return;
  if (location.hash.replace(/^#\/?/, '') !== 'demo' || state.device !== 'available' || state.warming || !warmOk) return;
  step = 'running'; patchDevice();
  const seq = ++makeSeq;
  void makeCard(SAMPLE_STEP, { profile: SAMPLE_PROFILE, support: state.settings.support, engine: state.engine, allowCloud: false, deviceReady: true, routing: routing() })
    .then((card) => {
      state.made.push(card); // a card that was made is counted, shown or not
      const untouched = seq === makeSeq && state.demo && state.first && !state.busy && location.hash.replace(/^#\/?/, '') === 'demo';
      if (!untouched) { step = 'cancelled'; return; }
      if (card.blocked || card.source !== 'on-device') { step = 'failed'; patchDevice(); return; }
      step = 'done'; stepCard = card;
      state.lastQuestion = SAMPLE_STEP; resetCard(); setCard(card); state.waitStart = Date.now(); render();
    })
    .catch(() => { step = 'failed'; patchDevice(); });
}

/**
 * Firebase Remote Config, asked once per page load and only when cloud help is on (web/src/ai/remoteConfig.ts): the
 * cloud model's name and the two routing thresholds. It runs beside the app: no card waits for it, and until it
 * answers, or if it fails, the defaults in the code run. An answer that arrives while a card is being made is put in
 * use after that card, so one card is never made with two sets of settings.
 */
let settingsAsked = false;
let settingsWaiting: SettingsReport | null = null;
function askSettings() {
  if (!cfg || !state.settings.cloudHelp || settingsAsked) return;
  settingsAsked = true;
  state.remote = { ...state.remote, status: 'asking' };
  void fetchSettings(cfg.firebase).then((r) => { settingsWaiting = r; useSettings(); }).catch(() => { /* fetchSettings never throws; the defaults stay either way */ });
}
function useSettings() {
  if (!settingsWaiting || state.busy) return;
  state.remote = settingsWaiting;
  settingsWaiting = null;
  state.engine.setCloudModel?.(state.remote.values.cloudTextModel);
  const el = document.querySelector('#settings'); if (el) el.outerHTML = settingsPanel();
}
const routing = () => ({ moodWords: state.remote.values.routeMoodWords, minChoices: state.remote.values.routeMinChoices });

/**
 * Phase 9 (judge round 8, ADV-01-5): the cloud step of the card being made. From CLOUD_SLOW_MS (3 s) on, the
 * "making" line says that online help is still working, with the seconds and "Stop waiting"; the pipeline itself
 * gives up at CLOUD_WAIT_MS (20 s). "Stop waiting" calls the making off (its card, when it comes, is not shown; the
 * privacy receipt still counts the request).
 */
/** Phase 9: the person tapped "Not now": the carer's next screen says so (and whether the question was kept). */
let p9notNow: { kept: boolean } | null = null;
/** Phase 9: the sample open question of Home while it is being made or shown (null otherwise). */
const p9sample = { q: null as string | null };
const p9wait = { at: null as number | null, timer: null as ReturnType<typeof setInterval> | null };
/** Phase 12: how many waits for online help the carer stopped this session (web/src simplePrivacy). */
let p9stopped = 0;
function cloudStarted(seq: number) {
  if (seq !== makeSeq) return;
  p9wait.at = Date.now();
  // (phase 13, judge round 10: after "Just this once" the waiting line sat below the fold: it is brought into view)
  document.querySelector('.making')?.scrollIntoView({ block: 'center' });
  if (p9wait.timer) clearInterval(p9wait.timer);
  p9wait.timer = setInterval(() => {
    if (seq !== makeSeq || !state.busy || p9wait.at === null) { cloudDone(); return; }
    const ms = Date.now() - p9wait.at;
    if (ms < CLOUD_SLOW_MS) return;
    const s = Math.floor(ms / 1000);
    const making = document.querySelector('.making');
    if (!making) return;
    const el = making.querySelector('#slow-wait .slow-s');
    if (el) el.textContent = P9.wait.slow(s);
    else making.insertAdjacentHTML('beforeend', `<span class="slow-wait" id="slow-wait"><span class="slow-s">${esc(P9.wait.slow(s))}</span> <button type="button" class="btn quiet small-btn" data-act="stop-wait">${P9.wait.stop}</button></span>`);
  }, 250);
}
function cloudDone() { p9wait.at = null; if (p9wait.timer) clearInterval(p9wait.timer); p9wait.timer = null; }

/** The question being made was tapped on the answered screen (a next step or a new start): its chain is already set. */
let chained = false;
/** The question being made is the second half of one the app split in two ("Next"). */
let askSecond = false;
async function make(q: string) {
  // (phase 7) where this question came from, as the caller said; taken here so that it never stays for a later question
  const from = askBy; const second = askSecond; askBy = null; askSecond = false;
  if (!q.trim()) return;
  if (step === 'waiting') step = 'cancelled'; // the judge asked something first: the automatic step stands down
  const seq = ++makeSeq;
  useSettings();
  // (phase 9) Home's sample open question: made with no About them at all, so the question is the only thing any step
  // gets; asked again after the consent sheet it is still the sample
  p9notNow = null;
  const sample = p9sample.q === q;
  if (!sample) p9sample.q = null;
  const profile = sample ? EMPTY_PROFILE : state.profile;
  // was this question spoken, and its recording sent to the cloud? (the card then says so, onVoice)
  const spoken = dictated; dictated = false; voiceHeard = false; voiceAsk = false; voice.cancel();
  // a question that was not tapped as a next step of the tree starts a new conversation
  if (!chained) { state.chain = [q]; p5.urgent = false; p5.signNow = false; p5.red = null; p5.voiceFailed = false; }
  chained = false;
  // (phase 7) where this question came from: the caller says so; a question asked again after the sheet keeps what it was
  const by = from ?? (p8.lastBy.q === q ? p8.lastBy.by : spoken ? 'spoken' : 'typed');
  if (by !== 'none') p8.lastBy = { q, by };
  // "Just this once" on the sheet: this one request may use online help, and the switch stays off
  const once = p5.once; p5.once = false;
  if (!turnKeep) state.p4.turn = null;
  turnKeep = false; state.p4.letterNo = false;
  state.busy = true; state.error = null; state.lastQuestion = q; resetCard(); render();
  // a question asked before the capability check has answered waits for it: the card must not be made as if this
  // computer could not run the private step
  if (state.device === 'checking') await refreshDevice().catch(() => { state.device = 'unavailable'; });
  try {
    const card = await makeCard(q, {
      profile, support: state.settings.support, engine: state.engine,
      allowCloud: state.settings.cloudHelp || once, deviceReady: state.device === 'available', routing: routing(),
      onCloud: () => cloudStarted(seq),
    });
    state.made.push(card);
    if (sample) for (let p: Card | null | undefined = card; p; p = p.nextPage) p.sample = true;
    if (spoken) voiceCards.add(card);
    if (seq !== makeSeq) return; // a later question was asked meanwhile: its card is the one to show
    // (a question that waits for a yes on the consent sheet is noted when it is asked again, not twice; the sample never)
    if (!(card.blocked && card.unsentPayload) && !sample) {
      noteAsk(card);
      // (phase 7) one row for the page of the speech therapist: the topic and where the question came from, none of its words
      if (by !== 'none') notePractice({ k: 'ask', at: Date.now(), topic: topicOf(state.chain[0] ?? q, state.profile)?.id ?? guessTopic(q), by, ...(card.pending ? { two: true as const } : {}), ...(card.kind === 'no-quiz' ? { quiz: true as const } : {}), ...(state.chain.length <= 1 ? { start: true as const } : {}), ...(second ? { second: true as const } : {}) });
    }
    setCard(simpleView() ? guardOrder(usualOrder(card)) : card);
    // simple view: a question that needs online help, with cloud help off, brings up the consent sheet (never a page)
    // (with no connection the sheet could send nothing: the screen then says the question needs the internet)
    state.sheet = simpleView() && isOnline() && card.blocked !== C.notes.cloudCheckBlocked && sheetWanted(card, { cloudOn: state.settings.cloudHelp, cloudConfigured: state.engine.cloudConfigured });
  } catch (e) {
    if (seq !== makeSeq) return;
    state.card = null; state.error = (e as Error).message;
  }
  cloudDone(); state.busy = false; state.waitStart = Date.now(); useSettings(); render();
}

function onPersonTap(t: HTMLElement) {
  if (t.dataset.hear) { void hear(); return; }
  // (phase 9) the person's own "Not now": the card ends, the question is kept for later (a care question pinned and in
  // the diary: core/later.ts), and the carer's screen says so. A doctor-visit question stops the visit run instead.
  if (t.dataset.notNow && state.card) {
    const c = state.card;
    stopSound();
    if (c.visit) { state.p4.visitRun = false; resetCard(); lift = true; go('visit'); return; }
    const q = laterQuestion(c.kind === 'repair' ? state.before?.asked ?? state.chain[0] ?? '' : c.asked);
    if (q.trim() && !c.sample) leaveForLater(q, careTopic(c));
    p9notNow = { kept: !!q.trim() && !state.demo && !c.sample };
    makeSeq++; state.busy = false; resetCard(); lift = true; go(''); window.scrollTo(0, 0);
    return;
  }
  // the alphabet: a letter leads to its words; "No, I don't know" goes back to the carer, and nothing is counted
  if (t.dataset.letter && state.p4.letter) { const l = state.p4.letter; t.classList.add('pressed'); setTimeout(() => { void runLetter({ asked: l.asked, letter: t.dataset.letter!, rejected: l.rejected, topic: l.topic, learned: learnedWords() }); }, 180); return; }
  if (t.dataset.letterNo && state.p4.letter) { state.p4.letter = null; state.p4.letterNo = true; makeSeq++; state.busy = false; resetCard(); lift = true; go(''); return; }
  const c = state.card;
  if (t.dataset.confirm === 'recap-yes') { state.recap = false; state.recapDone = true; render(); return; }
  if (t.dataset.confirm === 'recap-change') { state.recap = false; render(); return; }
  if (!c) return;
  // (phase 7) the check, for the page of the speech therapist: a yes with the kind of card it was on, a "No, something
  // else"; no word of the answer. Never a doctor-visit question: those answers are read by nothing.
  if (t.dataset.confirm === 'yes' && state.picked && !c.visit && !c.sample) notePractice({ k: 'answer', at: Date.now(), via: viaOf(c, state.picked), ...(state.picked.role === 'escape' && c.kind !== 'needs' && c.kind !== 'repair' ? { esc: true as const } : {}) });
  if (t.dataset.confirm === 'change' && state.picked && !c.visit && !c.sample) notePractice({ k: 'no', at: Date.now() });
  // a doctor-visit question, or a card the person started from: the confirmed answer leads on, on this screen (p4Confirm)
  if (t.dataset.confirm === 'yes' && state.picked && (c.visit || c.turn) && p4Confirm(c, state.picked)) return;
  if (t.dataset.confirm === 'yes') {
    state.confirmed = true;
    // an answer that can be urgent (core/redflag.ts) keeps the call box up for the rest of this conversation
    if (state.picked && urgentAnswer(c.asked, state.picked.label)) p5.urgent = true;
    if (state.picked && signNow(c.asked, state.picked.label)) p5.signNow = true;
    // (phase 13) the conversation's red flag: every "how bad" end line after it says to call now (core/tree.ts)
    if (state.picked) { const r = redPlace(c.asked, state.picked.label); if (r && !p5.red) p5.red = r; }
    // (phase 8) "later": the question is kept for Home, to come back to (core/later.ts); never for the sample family
    const left = state.picked ? laterOf({ asked: c.asked, label: state.picked.label, repair: c.kind === 'repair', before: state.before?.asked ?? state.chain[0] ?? null }) : null;
    if (left) leaveForLater(left, careTopic(c));
    // (phase 13) a confirmed answer to a question left for later finds it out: it goes off Home
    else if (state.picked && !c.sample && !state.demo) { p8later.list = answeredLater(p8later.list, c.asked, state.picked.role); saveLater(); }
    if (simpleView()) {
      // the first confirmed answer folds "How it works" to its one line (remembered), and About them is offered once,
      // on this answer's screen, when it names nobody yet
      if (!state.settings.firstCard) { state.settings.firstCard = true; state.settings.howFolded = true; saveSettings(); }
      if (!state.inviteFor && !state.inviteOff && c.kind !== 'repair' && awayNames(state.profile).length === 0) state.inviteFor = c;
    }
    if (state.picked && state.picked.role === 'answer') {
      state.answers.push({ topic: c.topic, label: state.picked.label });
      // kept on this computer for "last time"; with the sample family it stays in memory and goes when judge mode is left
      // (a need from the quick-needs board is of the moment: it is in the recap, and not in "Answers so far" or "Asked before")
      const at = Date.now();
      if (c.sample) {
        // (phase 9) the sample question of Home: in the recap of this conversation, and kept nowhere
      } else if (c.kind !== 'needs') {
        // where the choice stood among the answers, for the answer-reliability guard (an either-or, a yes / no or a feelings card only)
        const shown = c.choices.filter((x) => x.role === 'answer');
        const placed = ['choice', 'yesno', 'feeling'].includes(c.kind) && !c.scale && !c.letter && !c.turn && !state.p4.turn ? { pos: shown.indexOf(state.picked), of: shown.length, yn: c.kind === 'yesno' } : {};
        // (an answer about the body or a feeling, by its topic, is never counted or marked by the answer check)
        const careId = careTopic(c);
        state.history = addAnswer(state.history, { q: c.asked, topic: c.topic, label: state.picked.label, at, ...placed, ...(careId && GUARD_TOPICS.includes(careId) ? { care: true } : {}) });
        if (learns()) {
          // the guard (core/reliability.ts, rules): a run of "yes" or of one place on the screen is marked "less sure",
          // in the answers and in the diary. It shows on the carer's side only.
          const r = reliability(tapsFrom(state.history), at);
          state.history = markLessSure(state.history, r, at);
          const topic = topicOf(state.chain[0] ?? c.asked, state.profile)?.id ?? topicOf(c.asked, state.profile)?.id ?? null;
          // (phase 10) what the person picked when they started the conversation: "Frank started: Beth", never "less sure"
          const started = c.turn === 'talk' || c.turn === 'topics' || c.turn === 'about' ? startedLabel(c, state.picked.label) : null;
          state.diary = started ? addEntry(state.diary, startedEntry(state.profile.personName, started.label, at, started.topic)) : markDiary(addEntry(state.diary, answerEntry({ q: c.asked, label: state.picked.label, at }, topic)), r.since, at);
          saveDiary();
        }
        if (!state.demo) void kvSet('history', state.history);
      } else if (learns()) {
        // what was asked for on the board, and when: counted on this device for "What we've learned" (core/prefs.ts)
        state.needsLog = [...state.needsLog, { label: state.picked.label, at }].slice(-300);
        void kvSet('needs', state.needsLog);
        state.diary = addEntry(state.diary, needEntry(state.picked.label, at));
        saveDiary();
      }
    } else if (state.picked && state.picked.role === 'escape' && learns() && !c.sample && signAnswer(c.asked, state.picked.label)) {
      // (phase 13) a "not sure" to a stroke sign is not a way out: the diary keeps it, for the next carer and the doctor
      state.diary = addEntry(state.diary, answerEntry({ q: c.asked, label: state.picked.label, at: Date.now() }, topicOf(state.chain[0] ?? c.asked, state.profile)?.id ?? null)); saveDiary();
    }
    if (simpleView()) refreshShort();
    render(); return;
  }
  if (t.dataset.confirm === 'change') { state.picked = null; state.waitStart = Date.now(); render(); return; }
  const ch = c.choices[Number(t.dataset.i)];
  if (!ch) return;
  if (ch.role === 'escape' && c.nextPage) { setCard(c.nextPage); render(); return; }
  if (c.kind === 'body' && c.bodyStep === 1 && (BODY_REGIONS as string[]).includes(ch.label)) {
    const detail = bodyDetailCard(ch.label as BodyRegion, state.profile, state.settings.support);
    if (c.visit) for (let d: Card | null | undefined = detail; d; d = d.nextPage) d.visit = c.visit;
    setCard(detail); render(); return;
  }
  t.classList.add('pressed');
  setTimeout(() => { state.picked = ch; render(); }, 180);
}

async function addPhoto(i: number, file: File) {
  const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const s = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
  state.profile.people[i].photo = canvas.toDataURL('image/jpeg', 0.8);
  saveProfile(); render();
}

// ---------------------------------------------------------------- the family's own photos (core/photos.ts, web/src/photo.ts)
/** The file the carer took or chose becomes a picture to frame. Read in this page; nothing is uploaded. */
async function openPhoto(file: File) {
  try {
    const loaded = await loadPhoto(file);
    state.photoError = '';
    state.photoDraft = { loaded, frame: clampFrame(START_FRAME, loaded.w, loaded.h), step: 'frame', framed: '', word: '', error: '' };
  } catch {
    state.photoDraft = null; state.photoError = C.simple.photos.badFile;
  }
  render();
}
/** A new frame (moved or zoomed), kept inside the picture: the picture is moved in place, without drawing the screen again. */
function setFrame(f: Frame) {
  const d = state.photoDraft;
  if (!d) return;
  d.frame = clampFrame(f, d.loaded.w, d.loaded.h);
  const img = document.querySelector<HTMLElement>('#crop-img');
  if (img) img.style.cssText = frameStyle(d.frame, d.loaded.w, d.loaded.h);
  const z = document.querySelector<HTMLInputElement>('#crop-zoom');
  if (z && Number(z.value) !== d.frame.zoom) z.value = String(d.frame.zoom);
}
function savePhoto() {
  const d = state.photoDraft;
  if (!d) return;
  const word = cleanWord(document.querySelector<HTMLInputElement>('#photo-word')?.value ?? d.word);
  const next = word ? addOwnPhoto(state.photos, { id: `ph${Date.now().toString(36)}`, word, data: d.framed, at: Date.now() }) : null;
  if (!next) { d.word = word; d.error = C.simple.photos.label.empty; render(); return; }
  state.photos = next; state.photoDraft = null;
  void kvSet('photos', state.photos);
  render();
  document.querySelector<HTMLElement>('#photos')?.scrollIntoView({ block: 'nearest' });
}
function act(el: HTMLElement) {
  const a = el.dataset.act;
  const i = Number(el.dataset.person ?? -1);
  // (phase 7: the needs board opened from the first screen starts a new conversation; as a way after "something else" it is a step of that one)
  if (a === 'needs' && !(state.card && state.confirmed && state.picked?.role === 'escape')) notePractice({ k: 'board', at: Date.now() });
  switch (a) {
    case 'show': lift = true; go('person'); break;
    // ---- the simple view
    // (the simple view does not put the cursor in the field: on a phone that opens the keyboard over the topics)
    case 'new': clearP4(); state.lastQuestion = ''; state.error = null; dictated = false; resetCard(); render(); if (!simpleView()) document.querySelector<HTMLInputElement>('#q')?.focus({ preventScroll: true }); break;
    case 'inside': case 'inside-card': case 'inside-about':
      // into the full view, and it stays the view of this browser until "Simple view" is pressed
      state.settings.view = 'full'; state.settings.welcomed = true; state.sheet = false; saveSettings();
      if (a === 'inside-about') { go('about'); break; }
      go('');
      if (a === 'inside-card') { const m = document.querySelector<HTMLDetailsElement>('#made'); if (m) { m.open = true; m.scrollIntoView({ block: 'nearest' }); } }
      break;
    case 'simple':
      state.settings.view = 'simple'; saveSettings();
      if (state.demo) void leaveDemo(); else go('');
      break;
    case 'back': if (onGuard()) history.back(); else stepBack(hashNow()); break;
    case 'home': goHome(); break;
    case 'tips': state.tips = !state.tips; render(); document.querySelector<HTMLElement>('#more-tips')?.focus({ preventScroll: true }); break;
    case 'more': state.more = !state.more; render(); document.querySelector<HTMLElement>('#more')?.focus({ preventScroll: true }); break;
    case 'update': location.reload(); break;
    case 'how': state.settings.howFolded = !(state.settings.howFolded ?? true); saveSettings(); render(); document.querySelector<HTMLElement>('#how[data-act], #how [data-act=how]')?.focus({ preventScroll: true }); break;
    case 'topic': { const id = el.dataset.topic as TopicId; state.topicOpen = state.topicOpen === id ? null : id; render(); document.querySelector<HTMLElement>(`.topic[data-topic="${id}"]`)?.focus({ preventScroll: true }); break; }
    // the finish screen's button: the phone goes back to the carer, who sees the answer
    case 'give-back': lift = true; if (state.p4.visitEnd) { state.p4.visitEnd = false; state.p4.visitRun = false; resetCard(); go('visit'); } else if (state.card?.kind === 'needs' && state.confirmed && state.picked?.label === WRONG_TILE) go('sudden'); else if (state.confirmed && crisisAnswer(state.picked?.label ?? '')) toCrisis(); else go(''); break; // (the board's "something's wrong" leads the carer straight to "Something new or sudden?")
    // ---- phase 4: the first letter, the person starts, before a doctor visit, talk about a photo
    case 'letter': {
      const c = state.card;
      const of = c?.kind === 'repair' ? state.before : c;
      const shown = (x: Card | null | undefined) => (x && x.kind !== 'repair' && x.kind !== 'needs' ? x.choices.filter((y) => y.role === 'answer').map((y) => (x.letter ? y.spoken : y.label)) : []);
      const asked = c?.letter ? state.p4.letterPending?.asked ?? '' : of && of.kind !== 'needs' && !of.turn ? of.asked : '';
      const rejected = c?.letter ? [...c.letter.rejected, ...shown(c)] : [...(of?.narrow?.rejected ?? []), ...shown(of)];
      state.p4.letter = { asked, rejected: rejected.filter((x, k, all) => all.indexOf(x) === k), topic: topicOf(state.chain[0] ?? asked, state.profile)?.id ?? null };
      state.p4.letterNo = false; lift = true; go('person');
      break;
    }
    case 'letter-more': {
      const c = state.card; const i = state.p4.letterPending;
      if (c?.letter && i) void runLetter({ ...i, rejected: [...i.rejected, ...c.choices.filter((y) => y.role === 'answer').map((y) => y.spoken)] });
      break;
    }
    case 'turn': openTurn(); lift = true; go('person'); break;
    case 'visit-start': state.p4.visit = { startedAt: Date.now(), answers: [], done: false, ...(state.p4.visit?.since ? { since: state.p4.visit.since } : {}), ...(state.p4.visit?.carerAsk ? { carerAsk: state.p4.visit.carerAsk } : {}) }; state.p4.visitCopied = false; void kvSet('visit', state.p4.visit); void visitNext(); break;
    case 'visit-resume': if (state.p4.visit?.stopped) { state.p4.visit.wentOn = true; void kvSet('visit', state.p4.visit); } void visitNext(); break;
    case 'visit-print': window.print(); break;
    case 'visit-copy': {
      const done = () => { state.p4.visitCopied = true; render(); document.querySelector<HTMLElement>('#visit-copy')?.focus(); };
      if (state.p4.visit && navigator.clipboard?.writeText) void navigator.clipboard.writeText(`${visitText(state.p4.visit, state.profile.personName.trim())}\n\n${(() => { const m = sinceModel(); return sinceText(m.since, m.picked, m.name); })()}`).then(done, () => { /* no clipboard here: the page is on the screen */ });
      break;
    }
    case 'visit-del': if (confirm(P4.visit.delConfirm)) { state.p4.visit = null; state.p4.visitCopied = false; void kvSet('visit', null); render(); } break;
    case 'pt-pick': state.p4.talk = { id: el.dataset.id ?? '', things: null, look: null }; render(); window.scrollTo(0, 0); break;
    case 'pt-other': state.p4.talk = null; render(); break;
    case 'pt-look': void lookAtPhoto(); break;
    case 'pt-ask': { const q = talkQuestions()[Number(el.dataset.k)]; if (q) void askAboutPhoto(q); break; }
    // after the way out: ask it a new way, in the carer's own words
    // (phase 9) Home's sample open question: one tap to the card and its routing chip (after the consent sheet's yes on a phone)
    case 'try-ai': if (!state.busy) { p9sample.q = AI_QUESTION; askBy = 'none'; void make(AI_QUESTION); } break;
    // (phase 9) "Stop waiting" while online help is slow: the making is called off; the screen says what to do instead
    // (phase 12: a wait stopped while online help was asked is counted, so the footer says the question may have gone, as the line above it does)
    case 'stop-wait': if (state.busy) { if (p9wait.at !== null) p9stopped++; makeSeq++; cloudDone(); state.busy = false; state.error = P9.wait.stopped; render(); document.querySelector<HTMLInputElement>('#q')?.focus(); } break;
    case 'own': state.lastQuestion = ''; state.error = null; dictated = false; resetCard(); render(); document.querySelector<HTMLInputElement>('#q')?.focus(); break;
    case 'invite-later': state.inviteOff = true; render(); break;
    // (phase 8) "Left for later": ask it again (a new conversation of that question), or done; either way it goes off Home
    // (phase 9) a care question's "Done" asks "Did you find out?" first: "Yes" takes it off, "Not yet" keeps it
    case 'later-ask': case 'later-done': case 'later-found': case 'later-notyet': {
      const x = p8later.list[Number(el.dataset.i)];
      if (!x) break;
      if (a === 'later-done' && x.care) { p8later.asking = x; render(); document.querySelector<HTMLElement>(`#later-found-${p8later.list.indexOf(x)}`)?.focus(); break; }
      p8later.asking = null;
      if (a === 'later-notyet') { render(); break; }
      // (phase 13: "Ask it again" keeps it on Home until "Did you find out? Yes" or a confirmed answer to it)
      p8later.list = a === 'later-ask' ? askAgainLater(p8later.list, x) : doneLater(p8later.list, x, true); saveLater();
      if (a === 'later-ask') { askBy = 'none'; void make(x.q); } else render();
      break;
    }
    // after the way out: an AI suggests the next, broader choices (two steps at most)
    case 'narrow': if (state.card && state.picked) void runNarrow({ ...narrowInput(state.card, todayAnswers()), learned: learns() ? aboutLearned(learned(state.history, state.needsLog, state.forgotten)).slice(0, 6).map((l) => l.text) : [] }); break;
    case 'copy-short': {
      const text = state.short?.sentences.join(' ') ?? '';
      const done = () => { state.shortCopied = true; patchShort(); document.querySelector<HTMLElement>('[data-act=copy-short]')?.focus(); };
      if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(text).then(done, () => { /* no clipboard here: the text is on the screen to select */ });
      break;
    }
    case 'sheet': if (state.card?.unsentPayload) { state.sheet = true; render(); } break;
    case 'sheet-no': state.sheet = false; render(); break;
    // "Just this once" (the sheet's first button): this one request goes to online help, and online help stays off
    case 'sheet-yes': state.sheet = false; p5.once = true; askAgain(); break;
    // "Yes, every time": the same switch as the consent page's, turned on by one button; the question is then asked again at once
    case 'sheet-always': state.sheet = false; state.settings.cloudHelp = true; saveSettings(); askSettings(); askAgain(); break;
    // ---- what was learned (About them): keep a line as a fact, remove it, or forget everything learned
    case 'learned-keep': {
      const line = aboutLearned(learned(state.history, state.needsLog, state.forgotten)).find((l) => l.key === el.dataset.key);
      // (phase 12) a line about a care need is never kept as a fact (the button is not drawn; this is the second lock)
      if (line && !line.care) { state.profile.other = [...(state.profile.other ?? []), line.text]; state.forgotten = keepOne(state.forgotten, line.key); saveProfile(); saveForgotten(); refreshLearnedShort(); render(); }
      break;
    }
    case 'learned-remove': state.forgotten = forgetOne(state.forgotten, el.dataset.key ?? '', Date.now()); saveForgotten(); refreshLearnedShort(); render(); break;
    case 'learned-forget': if (confirm(C.simple.learned.forgetConfirm)) { state.forgotten = forgetAll(Date.now()); state.needsLog = []; void kvSet('needs', []); saveForgotten(); refreshLearnedShort(); render(); } break;
    case 'fact-remove': state.profile.other = (state.profile.other ?? []).filter((_, k) => k !== Number(el.dataset.fact)); saveProfile(); render(); break;
    // ---- the family's own photos (About them): chosen, framed by hand, given a word; kept on this device only
    case 'photo-new': state.photoError = ''; document.querySelector<HTMLInputElement>('#photo-file')?.click(); break;
    case 'photo-zoom': setFrame({ ...state.photoDraft!.frame, zoom: state.photoDraft!.frame.zoom + Number(el.dataset.by) }); break;
    case 'photo-use': if (state.photoDraft) { const d = state.photoDraft; void framed(d.loaded, d.frame).then((data) => { if (state.photoDraft !== d) return; d.framed = data; d.step = 'label'; d.error = ''; render(); }); } break;
    case 'photo-reframe': if (state.photoDraft) { state.photoDraft.step = 'frame'; state.photoDraft.error = ''; render(); } break;
    case 'photo-cancel': state.photoDraft = null; render(); break;
    case 'photo-del': state.photos = removePhoto(state.photos, el.dataset.id ?? ''); void kvSet('photos', state.photos); render(); break;
    case 'photo-del-all': if (confirm(C.simple.photos.delAllConfirm)) { state.photos = []; void kvSet('photos', []); render(); } break;
    // ---- phase 6: share with the care circle. The sheet shows the exact text; only "Share" and "Copy" hand it over,
    // to the app the carer picks or to the clipboard. The app itself sends nothing and stores nothing of it.
    case 'share-open': {
      if (state.demo) break;
      const kind = el.dataset.kind === 'handover' ? 'handover' : 'family';
      p6.share = { kind, health: false, text: shareTextNow(kind, false), status: '', from: el.id };
      render();
      document.querySelector<HTMLElement>('#share-h')?.focus();
      break;
    }
    // ---- phase 7: the page for the speech therapist and the passport. Both are on the screen before they are printed or
    // shared; "Share" goes through the sheet of phase 6, which shows the exact text first.
    case 'share-page': {
      if (state.demo) break;
      const kind = el.dataset.kind === 'passport' ? 'passport' : 'practice';
      if (kind === 'passport' && !p8.page) break;
      const health = kind === 'practice' && p8.health;
      p6.share = { kind, health, text: shareTextNow(kind, health), status: '', from: el.id };
      render();
      document.querySelector<HTMLElement>('#share-h')?.focus();
      break;
    }
    case 'page-print': window.print(); break;
    case 'practice-span': p8.span = el.dataset.span === 'month' ? 'month' : 'week'; render(); document.querySelector<HTMLElement>(`#practice-${p8.span}`)?.focus({ preventScroll: true }); break;
    case 'practice-del': if (confirm(P8.practice.delConfirm)) { p8.log = newLog(Date.now()); void kvSet('practice', p8.log); render(); window.scrollTo(0, 0); } break;
    case 'pass-look': p8.page = true; render(); window.scrollTo(0, 0); break;
    case 'share-cancel': closeShare(); break;
    case 'share-go': {
      const sh = p6.share;
      if (!sh || !canShare()) break;
      const said = (status: 'shared' | 'shareFailed') => { if (p6.share !== sh) return; sh.status = status; if (status === 'shared') p6.shared++; render(); document.querySelector<HTMLElement>('#share-status')?.scrollIntoView({ block: 'nearest' }); };
      // (a share the carer cancels in the phone's own sheet is an AbortError: nothing left, nothing is said)
      void navigator.share({ text: sh.text }).then(() => said('shared'), (e: unknown) => { if ((e as { name?: string } | null)?.name !== 'AbortError') said('shareFailed'); });
      break;
    }
    case 'share-copy': {
      const sh = p6.share;
      if (!sh) break;
      const said = (status: 'copied' | 'copyFailed') => { if (p6.share !== sh) return; sh.status = status; if (status === 'copied') p6.shared++; render(); document.querySelector<HTMLElement>('#share-copy')?.focus({ preventScroll: true }); };
      if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(sh.text).then(() => said('copied'), () => said('copyFailed')); else said('copyFailed');
      break;
    }
    // ---- phase 6: a line of "What stands out" or of "Since the last visit" shows the entries it was counted from, and hides them
    case 'src-toggle': {
      const k = el.dataset.src ?? '';
      p6.open = p6.open.includes(k) ? p6.open.filter((x) => x !== k) : [...p6.open, k];
      render();
      document.querySelector<HTMLElement>(`[data-act="src-toggle"][data-src="${k}"]`)?.focus({ preventScroll: true });
      break;
    }
    // ---- the diary (core/diary.ts): the carer's one-tap log, the tabs, copy, delete; on this device only
    case 'log': {
      const kind = el.dataset.log as LogKind;
      const e = logEntry(kind, Date.now());
      state.diary = addEntry(state.diary, e); saveDiary();
      state.logged = { id: e.id, log: kind, at: e.at }; state.diaryCopied = false; state.diaryDeleted = false;
      render(); document.querySelector<HTMLElement>(`[data-log="${kind}"]`)?.focus({ preventScroll: true });
      break;
    }
    case 'fall-head': state.diary = state.diary.map((e) => (e.id === el.dataset.id && e.log === 'fall' ? { ...e, label: FALL_HEAD } : e)); saveDiary(); render(); break;
    // ---- Read aloud: the sheet first, then the switch; off again with one tap
    case 'speak-ask': if (state.settings.speakOk) { state.settings.speak = true; saveSettings(); } else p5.speakSheet = true; render(); break;
    case 'speak-yes': p5.speakSheet = false; state.settings.speak = true; state.settings.speakOk = true; saveSettings(); render(); break;
    case 'speak-no': p5.speakSheet = false; render(); break;
    case 'speak-off': state.settings.speak = false; saveSettings(); stopSound(); render(); break;
    case 'sudden-number': state.aboutRow = 'health'; go('about'); window.scrollTo(0, 0); break;
    case 'log-undo': state.diary = removeEntry(state.diary, el.dataset.id ?? ''); saveDiary(); state.logged = null; render(); document.querySelector<HTMLElement>('#log-row button')?.focus({ preventScroll: true }); break;
    case 'diary-tab': state.diaryTab = el.dataset.tab as Span; state.logged = null; state.diaryCopied = false; render(); document.querySelector<HTMLElement>(`#tab-${state.diaryTab}`)?.focus({ preventScroll: true }); break;
    case 'diary-copy': {
      const D = C.simple.diary;
      const text = diaryText(inSpan(state.diary, state.diaryTab, Date.now(), state.diaryTopic), { log: D.log as Record<LogKind, string>, lessSure: C.simple.guard.lessSure, need: D.need });
      const done = () => { state.diaryCopied = true; render(); document.querySelector<HTMLElement>('#diary-copy')?.focus({ preventScroll: true }); };
      if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(text).then(done, () => { /* no clipboard here: the diary is on the screen to select */ });
      break;
    }
    case 'diary-del':
      if (confirm(C.simple.diary.delConfirm)) { state.diary = []; void kvSet('diary', []); state.logged = null; state.diaryDeleted = true; state.ins = { key: '', words: null, source: 'rules', busy: false, note: '' }; render(); }
      break;
    case 'tip-toggle': state.settings.tipOff = !state.settings.tipOff; saveSettings(); render(); document.querySelector<HTMLElement>('#tip-hide, #tip-show')?.focus({ preventScroll: true }); break;
    // ---- the insight lines in plainer words by online help: a sheet with the exact text first, every time
    case 'ins-plainer': {
      if (state.diaryTab === 'today' || !state.engine.rewordRequest) break;
      const lines = insights(state.diary, state.health, state.diaryTab, Date.now());
      const sources = cloudLines(lines);
      if (!sources.length) break;
      const text = insightCloudText(lines);
      state.insSheet = { key: insKey(state.diaryTab, lines), text, request: JSON.stringify(state.engine.rewordRequest(text), null, 2), sources };
      render();
      break;
    }
    case 'ins-no': state.insSheet = null; render(); document.querySelector<HTMLElement>('#ins-plainer')?.focus({ preventScroll: true }); break;
    case 'ins-yes': void sendInsights(); break;
    // ---- a copy of About them in a file (core/backup.ts): made here, saved where the carer chooses, sent nowhere
    // (phase 10: health notes only with the box ticked; the box is off again after each file)
    case 'backup-save': state.backupError = ''; state.backupDone = ''; downloadFile(P10.backup.fileName, backupText(makeBackup(state.profile, state.photos, state.health, Date.now(), state.backupHealth)), 'application/json'); state.backupHealth = false; render(); break;
    case 'backup-load': state.backupError = ''; state.backupDone = ''; document.querySelector<HTMLInputElement>('#backup-file')?.click(); break;
    case 'import-no': state.importDraft = null; render(); break;
    // nothing changes before one of these two: "Replace what is here" or "Add to what is here" (core/backup.ts)
    case 'import-replace':
    case 'import-add':
      if (state.importDraft) {
        const b = state.importDraft.backup;
        const here = { profile: state.profile, photos: state.photos, health: state.health };
        const next = a === 'import-add' ? addTo(here, b) : { ...replaceWith(here, b), skipped: 0 };
        state.profile = next.profile; state.photos = next.photos; state.health = next.health; state.importDraft = null;
        state.backupDone = a === 'import-add' ? `${P10.backup.added}${next.skipped ? P10.backup.full(next.skipped) : ''}` : P10.backup.replaced;
        void kvSet('profile', state.profile); void kvSet('photos', state.photos); void kvSet('health', state.health);
        render(); document.querySelector<HTMLElement>('#backup')?.scrollIntoView({ block: 'nearest' });
      }
      break;
    case 'row': { const row = el.dataset.row as AboutRow; state.aboutRow = state.aboutRow === row ? null : row; render(); break; }
    case 'less': state.less = !state.less; render(); break;
    case 'next':
      if (state.card?.pending) { askBy = p8.lastBy.by; askSecond = true; void make(state.card.pending); }
      else if (state.card?.nextPage) { setCard(state.card.nextPage); state.picked = null; state.confirmed = false; render(); }
      break;
    case 'retry': if (state.card?.narrow && state.narrowPending) void runNarrow(state.narrowPending); else if (state.card?.retry) { askBy = 'none'; void make(state.card.retry); } break;
    case 'recap': state.recap = true; state.recapDone = false; if (simpleView() && !state.short) refreshShort(); render(); break;
    // ---- after "something else" (core/more.ts): more choices of the same kind, or "What is it about?". Rules only.
    case 'more-like': {
      const c = state.card;
      if (!c) break;
      const lead = c.aboutWhat && state.picked?.role === 'answer' ? ABOUT_LEADS[state.picked.label] : undefined;
      const subject: MoreSubject | null = lead && lead !== 'body' && lead !== 'feeling' ? lead : c.more?.subject ?? moreSubject(c.asked, shownOn(c));
      const card = subject ? moreCard(subject, c.aboutWhat ? [] : shownOn(c), state.profile) : null;
      if (card) showRuleCard(card);
      break;
    }
    case 'about-what': if (state.card) showRuleCard(aboutWhatCard(state.profile)); break;
    // "Not yet: try another way": back to the list of ways of the question that was open, never to the first screen
    case 'ways': {
      if (state.card?.kind !== 'repair') break;
      // the screen with the ways is a step that was on the way here (the person's own "something else"): it is shown
      // again as it was. Nothing is picked or confirmed by the app.
      const at = trail.stack.map((x) => /^card:\d+:answered:/.test(x.key) && x.view.picked?.role === 'escape').lastIndexOf(true);
      if (at >= 0) { const to = trail.stack[at]; trail.stack.length = at; putSnap(to); }
      // no such step (the carer pressed "We're stuck" on a card): the other ways of that card stand again
      else { state.picked = null; state.confirmed = false; state.more = false; }
      render(); window.scrollTo(0, 0);
      break;
    }
    case 'stuck':
      // the repair card takes the person's screen; the question card waits behind it
      if (state.card && state.card.kind !== 'repair') { notePractice({ k: 'stuck', at: Date.now(), ...(state.confirmed && state.picked?.role === 'escape' ? { after: true as const } : {}) }); state.before = state.card; setCard(repairCard(state.profile)); state.picked = null; state.confirmed = false; state.less = false; state.recap = false; state.waitStart = Date.now(); render(); }
      break;
    case 'unstuck':
      if (state.card?.kind === 'repair') { setCard(state.before); state.before = null; state.picked = null; state.confirmed = false; state.waitStart = Date.now(); render(); }
      break;
    case 'override':
      if (state.card) { notePractice({ k: 'anyway', at: Date.now() }); const c = quizOverrideCard(state.card.asked, state.profile, state.settings.support); setCard(c); state.made.push(c); state.waitStart = Date.now(); render(); }
      break;
    case 'export-receipt': {
      const r = sessionReceipt(state.made, state.profile);
      downloadFile(C.judge.receipt.exportName, JSON.stringify({ app: C.app.name, exportedAt: new Date().toISOString(), page: location.origin, sampleFamily: state.demo, settings: state.remote, voiceInput: voiceSent.clips ? { recordingsHandedToCloud: voiceSent.clips, bytesAsSent: voiceSent.bytes, note: C.voice.counted } : 'not used this session', receipt: r }, null, 2), 'application/json');
      break;
    }
    case 'show-sent': {
      const m = document.querySelector<HTMLDetailsElement>('#made'); if (m) m.open = true; // the fold around it on the partner screen
      const d = document.querySelector<HTMLDetailsElement>('#sent'); if (d) { d.open = true; d.scrollIntoView({ block: 'nearest' }); }
      break;
    }
    case 'download': void download(); break;
    case 'needs': openNeeds(); lift = true; go('needs'); break;
    case 'mic': {
      if (voice.view().phase === 'recording') { voice.stop(); break; }
      if (voice.view().phase !== 'idle') break;
      // the first press shows where the recording goes; recording starts only after a yes to that
      if (!voiceAgreed()) { voiceAsk = !voiceAsk; patchVoice(); break; }
      startVoice(); break;
    }
    case 'voice-ok': state.settings.voiceOk = 'cloud'; saveSettings(); voiceAsk = false; startVoice(); break;
    case 'voice-no': voiceAsk = false; patchVoice(); break;
    case 'fb-again': fb.status = 'idle'; fb.error = null; render(); break;
    // the recording of the on-device step: shown or hidden in place; no card, no engine call, no setting changed
    case 'recorded': state.recorded = !state.recorded; patchRecorded(); break;
    case 'leave-demo': void leaveDemo(); break;
    // the first-run screen belongs to the full view (the simple view has none): setting up from it stays in the full view
    case 'welcome-setup': state.settings.welcomed = true; state.settings.view = 'full'; saveSettings(); go('about'); break;
    case 'welcome-sample': state.settings.welcomed = true; saveSettings(); go('demo'); break;
    case 'cloud-on': if (state.consentChecked) { state.settings.cloudHelp = true; state.sheet = false; saveSettings(); askSettings(); render(); } break;
    case 'cloud-off': state.settings.cloudHelp = false; state.consentChecked = false; saveSettings(); render(); break;
    case 'person-add': state.profile.people.push({ id: `p${Date.now().toString(36)}`, name: '', relation: '', household: false }); saveProfile(); render(); break;
    case 'person-remove': state.profile.people.splice(i, 1); saveProfile(); render(); break;
    case 'photo-add': document.querySelector<HTMLInputElement>(`input[data-photo="${i}"]`)?.click(); break;
    case 'photo-remove': delete state.profile.people[i].photo; saveProfile(); render(); break;
    case 'history-forget':
      if (confirm(C.about.historyForgetConfirm)) { state.history = []; if (!state.demo) void kvSet('history', []); render(); }
      break;
    case 'delete-all':
      if (confirm(C.about.deleteConfirm)) {
        void kvClear().then(() => { state.profile = { ...EMPTY_PROFILE, people: [] }; state.settings = { cloudHelp: false, support: 'more', welcomed: false }; state.answers = []; state.history = []; state.needsLog = []; state.forgotten = NOTHING_FORGOTTEN; state.learnedShort = null; state.photos = []; state.photoDraft = null; state.made = []; state.diary = []; state.health = NO_HEALTH; state.asks = []; state.logged = null; state.importDraft = null; state.backupError = ''; state.backupDone = ''; state.backupHealth = false; state.ins = { key: '', words: null, source: 'rules', busy: false, note: '' }; state.p4.visit = null; p8later.list = []; p8.log = newLog(Date.now()); void kvSet('practice', p8.log); p8.picked = []; p8.pass = NO_PASSPORT; p8.page = false; p8.health = false; clearP4(); resetCard(); go(simpleView() ? '' : 'welcome'); });
      }
      break;
    default:
      if (a?.startsWith('trial-') && trialAct(el, downloadFile)) render();
  }
}

async function download() {
  if (!cfg) return;
  state.device = 'downloading'; patchDevice();
  try {
    await state.engine.prepareDevice((p) => { state.downloading = p; if (p >= 1) state.warming = true; patchDevice(); });
  } catch (err) { state.error = (err as Error).message; }
  // the SDK starts the download and returns; the browser reports when the helper is there
  for (let i = 0; i < 900; i++) {
    state.device = await state.engine.deviceStatus();
    if (state.device === 'available' || state.device === 'unavailable') break;
    state.device = 'downloading'; patchDevice();
    await new Promise((r) => setTimeout(r, 2000));
  }
  state.downloading = null; state.warming = false; await refreshDevice();
}

// ---------------------------------------------------------------- events (delegated)
const app = document.querySelector('#app')!;
// A picture file that could not be loaded (web/src/pictos.ts): our drawing of the same id takes its place, never a
// broken image. `error` does not bubble, so it is caught on the way down.
app.addEventListener('error', (ev) => {
  const t = ev.target;
  if (!(t instanceof HTMLImageElement) || !t.classList.contains('pic') || !t.dataset.id) return;
  t.outerHTML = pictoFallback(t.dataset.id, t.classList.contains('tp'));
}, true);
app.addEventListener('click', (ev) => {
  // a link to a screen of the app, in the simple view: the address changes in place (see `go`), no new history entry
  const link = (ev.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#/"]');
  if (link && simpleView() && !link.target) { ev.preventDefault(); go(link.getAttribute('href')!.replace(/^#\/?/, '') as Route | ''); window.scrollTo(0, 0); return; }
  const t = (ev.target as HTMLElement).closest<HTMLElement>('button, [data-act]');
  if (!t) return;
  if (t.dataset.act) { act(t); return; }
  if (t.dataset.q) dictated = false; // a tapped question was not spoken, whatever the field held
  if (t.dataset.q) askBy = 'app'; // (phase 7) and it is one of the app's own questions, for the page of the speech therapist
  if (t.dataset.q && t.dataset.short) state.shortcut = { q: t.dataset.q, of: t.dataset.of ?? '', label: t.dataset.label ?? '' };
  if (t.dataset.q && t.dataset.short) { if (t.dataset.of && !state.chain.includes(t.dataset.of)) state.chain = [...state.chain, t.dataset.of]; chained = true; state.lastQuestion = t.dataset.q; void make(t.dataset.q); return; }
  // (a question that is not a next step of the tree starts a new conversation: the call box of the last one goes)
  if (t.dataset.q && !t.dataset.next && !t.dataset.short) { p5.urgent = false; p5.signNow = false; p5.red = null; }
  if (t.dataset.q) { state.chain = !t.dataset.next ? [t.dataset.q] : state.chain.includes(t.dataset.q) ? state.chain : [...state.chain, t.dataset.q]; chained = true; state.lastQuestion = t.dataset.q; void make(t.dataset.q); return; }
  if (t.closest('#person')) onPersonTap(t);
});
app.addEventListener('submit', (ev) => {
  if ((ev.target as HTMLElement).id === 'ask') { ev.preventDefault(); askBy = dictated ? 'spoken' : 'typed'; void make(($('#q') as HTMLInputElement).value); }
  else if ((ev.target as HTMLElement).id === 'fb') { ev.preventDefault(); void submitFeedback(); }
  else if ((ev.target as HTMLElement).id === 'photo-form') { ev.preventDefault(); savePhoto(); }
  // "Who? Type one name": one yes / no question about that one person, made by the rules
  else if ((ev.target as HTMLElement).id === 'who') { ev.preventDefault(); const n = ($('#who-name') as HTMLInputElement).value.trim(); if (n) { dictated = false; askBy = 'app'; void make(callQuestion(n)); } }
  else if ((ev.target as HTMLElement).id === 'understood-form') { ev.preventDefault(); checkTyped(($('#understood-word') as HTMLInputElement).value); }
  else ev.preventDefault();
});
app.addEventListener('change', (ev) => {
  const t = ev.target as HTMLInputElement | HTMLSelectElement;
  if (t.id.startsWith('trial-')) { trialInput(t); return; }
  if (t.id === 'fb-role') { fb.role = t.value; return; }
  if (t.id === 'support') { state.settings.support = (t as HTMLSelectElement).value as SupportLevel; saveSettings(); if (state.lastQuestion) { askBy = 'none'; void make(state.lastQuestion); } return; }
  if (t.id === 'consent') { state.consentChecked = (t as HTMLInputElement).checked; render(); return; }
  if (t instanceof HTMLInputElement && t.dataset.photo !== undefined && t.files?.[0]) { void addPhoto(Number(t.dataset.photo), t.files[0]); return; }
  if (t instanceof HTMLInputElement && t.id === 'photo-file' && t.files?.[0]) { void openPhoto(t.files[0]); return; }
  // the share sheet's box: the text is built again, with the health notes or without them, and shown before anything leaves
  if (t.id === 'share-health' && p6.share) { const on = (t as HTMLInputElement).checked; p6.share = { ...p6.share, health: on, text: shareTextNow(p6.share.kind, on), status: '' }; render(); document.querySelector<HTMLElement>('#share-health')?.focus({ preventScroll: true }); return; }
  // phase 7: the box of the page for the speech therapist, its questions; a line of the passport on or off, its photos
  if (t.id === 'practice-health') { p8.health = (t as HTMLInputElement).checked; render(); document.querySelector<HTMLElement>('#practice-health')?.focus({ preventScroll: true }); return; }
  if (t instanceof HTMLInputElement && t.dataset.practiceQ !== undefined) { const k = t.dataset.practiceQ; p8.picked = togglePractice(p8.picked, P8.practice.questions[Number(k)]); if (!state.demo) void kvSet('practiceAsk', p8.picked); render(); document.querySelector<HTMLElement>(`[data-practice-q="${k}"]`)?.focus({ preventScroll: true }); return; }
  if (t instanceof HTMLInputElement && t.dataset.passLine !== undefined) { const k = t.dataset.passLine; const on = OFF_UNTIL_TICKED.includes(k) ? p8.pass.on.includes(k) : !p8.pass.off.includes(k); if (on !== t.checked) { p8.pass = toggleLine(p8.pass, k); savePassport(); } return; }
  if (t.id === 'pass-photos') { p8.pass = { ...p8.pass, photos: (t as HTMLInputElement).checked }; savePassport(); return; }
  if (t.id === 'diary-topic') { state.diaryTopic = (t as HTMLSelectElement).value as DiaryTopic | 'all'; state.logged = null; render(); document.querySelector<HTMLElement>('#diary-topic')?.focus({ preventScroll: true }); return; }
  // "Since the last visit" (the doctor-visit page): the day to count from, and up to three fixed questions
  if (t.id === 'since-from' && state.p4.visit) { const d = fromIsoDay(t.value); if (d !== null) { state.p4.visit.since = d; void kvSet('visit', state.p4.visit); render(); } return; }
  if (t instanceof HTMLInputElement && t.dataset.sinceQ !== undefined && state.p4.visit) { state.p4.visit.carerAsk = toggleQuestion(pickedQuestions(state.p4.visit.carerAsk), P5.since.questions[Number(t.dataset.sinceQ)]); void kvSet('visit', state.p4.visit); render(); return; }
  // health notes (About them): kept on this device at once; never part of the profile the prompts read
  if (t instanceof HTMLInputElement && t.type === 'checkbox' && t.dataset.health) { state.health = cleanHealth({ ...state.health, [t.dataset.health]: t.checked }); if (!state.demo) void kvSet('health', state.health); return; }
  if (t instanceof HTMLInputElement && t.id === 'backup-health') { state.backupHealth = t.checked; return; }
  if (t instanceof HTMLInputElement && t.id === 'backup-file' && t.files?.[0]) {
    const file = t.files[0];
    t.value = '';
    const shown = (r: ReturnType<typeof readBackup>) => {
      if (r.ok) { state.importDraft = { backup: r.backup, preview: r.preview }; state.backupError = ''; } else { state.importDraft = null; state.backupError = P10.backup.bad[r.error]; }
      render(); if (!r.ok) document.querySelector<HTMLElement>('#backup')?.scrollIntoView({ block: 'nearest' });
    };
    // (phase 10) a file over the limit is refused by its size, before a byte of it is read
    if (file.size > BACKUP_MAX_BYTES) { shown({ ok: false, error: 'big' }); return; }
    void file.text().then((text) => shown(readBackup(text, file.size)), () => { state.backupError = P10.backup.bad.json; render(); });
    return;
  }
  if (t instanceof HTMLInputElement && t.dataset.field === 'household') { state.profile.people[Number(t.dataset.person)].household = t.checked; saveProfile(); }
});
// framing by hand: drag the picture in its square (pointer), or move it with the arrow keys
let dragAt: { x: number; y: number } | null = null;
app.addEventListener('pointerdown', (ev) => {
  const crop = (ev.target as HTMLElement).closest<HTMLElement>('#crop');
  if (!crop || !state.photoDraft) return;
  dragAt = { x: (ev as PointerEvent).clientX, y: (ev as PointerEvent).clientY };
  crop.setPointerCapture?.((ev as PointerEvent).pointerId);
});
app.addEventListener('pointermove', (ev) => {
  const d = state.photoDraft;
  const crop = document.querySelector<HTMLElement>('#crop');
  if (!dragAt || !d || !crop) return;
  const e = ev as PointerEvent;
  // the picture's size on the screen: the square shows `side` of its pixels across the viewport's width
  const perPx = (Math.min(d.loaded.w, d.loaded.h) / d.frame.zoom) / crop.clientWidth;
  setFrame({ ...d.frame, dx: d.frame.dx - ((e.clientX - dragAt.x) * perPx) / d.loaded.w, dy: d.frame.dy - ((e.clientY - dragAt.y) * perPx) / d.loaded.h });
  dragAt = { x: e.clientX, y: e.clientY };
});
const endDrag = () => { dragAt = null; };
app.addEventListener('pointerup', endDrag);
app.addEventListener('pointercancel', endDrag);
app.addEventListener('keydown', (ev) => {
  const d = state.photoDraft;
  const k = (ev as KeyboardEvent).key;
  if (!d || (ev.target as HTMLElement).id !== 'crop' || !k.startsWith('Arrow')) return;
  ev.preventDefault();
  const step = 0.04 / d.frame.zoom;
  setFrame({ ...d.frame, dx: d.frame.dx + (k === 'ArrowRight' ? step : k === 'ArrowLeft' ? -step : 0), dy: d.frame.dy + (k === 'ArrowDown' ? step : k === 'ArrowUp' ? -step : 0) });
});

app.addEventListener('input', (ev) => {
  const t = ev.target as HTMLInputElement | HTMLTextAreaElement;
  if (t.id === 'crop-zoom' && state.photoDraft) { setFrame({ ...state.photoDraft.frame, zoom: Number(t.value) }); return; }
  if (t.id === 'photo-word' && state.photoDraft) { state.photoDraft.word = t.value; return; }
  // the passport: how yes and no are shown, and the carer's own lines (kept as typed; no redraw, so the cursor stays)
  if (t instanceof HTMLInputElement && (t.dataset.pass === 'yes' || t.dataset.pass === 'no')) { p8.pass = cleanPassport({ ...p8.pass, [t.dataset.pass]: t.value }); savePassport(); return; }
  if (t instanceof HTMLInputElement && t.dataset.passOwn !== undefined) { const own = Array.from({ length: OWN_MAX }, (_, i) => (i === Number(t.dataset.passOwn) ? t.value : p8.pass.own[i] ?? '')); p8.pass = cleanPassport({ ...p8.pass, own }); savePassport(); return; }
  if (t instanceof HTMLInputElement && t.dataset.health === 'helpline') { state.health = cleanHealth({ ...state.health, helpline: t.value }); if (!state.demo) void kvSet('health', state.health); return; }
  if (t instanceof HTMLInputElement && t.dataset.health === 'emergency') { state.health = cleanHealth({ ...state.health, emergency: t.value }); if (!state.demo) void kvSet('health', state.health); return; }
  if (t instanceof HTMLTextAreaElement && t.dataset.health === 'text') { state.health = cleanHealth({ ...state.health, text: t.value }); if (!state.demo) void kvSet('health', state.health); return; }
  // typing takes over from the microphone; an emptied field holds no spoken question any more
  if (t.id === 'q') { if (voice.view().phase !== 'idle') voice.cancel(); if (!t.value.trim()) dictated = false; }
  if (t.id === 'q') { state.lastQuestion = t.value; if (step === 'waiting') step = 'cancelled'; return; }
  // a correction takes the complaint about the last try away
  if ((t.id === 'fb-text' || t.id === 'fb-email') && fb.error) { fb.error = null; const st = document.querySelector<HTMLElement>('#fb-status'); if (st && isOnline()) st.hidden = true; }
  if (t.id === 'fb-text') { fb.text = t.value; const left = document.querySelector('#fb-left'); if (left) left.textContent = C.feedback.left(FEEDBACK_MAX - t.value.length); return; }
  if (t.id === 'fb-email') { fb.email = t.value; return; }
  if (t.id.startsWith('trial-') && t instanceof HTMLInputElement) { trialInput(t); return; }
  if (t instanceof HTMLTextAreaElement && t.dataset.list) { state.profile[t.dataset.list as 'foods'] = t.value.split('\n').map((x) => x.trim()).filter(Boolean); saveProfile(); return; }
  if (t instanceof HTMLInputElement && t.dataset.field && t.dataset.field !== 'household') {
    if (t.dataset.person !== undefined) {
      const person = state.profile.people[Number(t.dataset.person)];
      if (t.dataset.field === 'nickname') person.nickname = t.value.trim() || undefined; else (person as unknown as Record<string, string>)[t.dataset.field] = t.value;
    } else (state.profile as unknown as Record<string, string>)[t.dataset.field] = t.value;
    saveProfile();
  }
});
// The exit from the person screen is top-right and needs a long press (a stray tap must not leave the card).
let hold: ReturnType<typeof setTimeout> | null = null;
app.addEventListener('pointerdown', (ev) => {
  const t = (ev.target as HTMLElement).closest('#exit');
  if (!t) return;
  t.classList.add('holding');
  hold = setTimeout(() => { hold = null; leavePerson(); }, 600);
});
const cancelHold = () => { if (hold) { clearTimeout(hold); hold = null; } document.querySelector('#exit')?.classList.remove('holding'); };
app.addEventListener('pointerup', cancelHold);
app.addEventListener('pointercancel', cancelHold);
app.addEventListener('pointerleave', cancelHold, true);
// with a keyboard there is no press and hold: Enter on the carer's way back leaves the person's screen
app.addEventListener('keydown', (ev) => { if ((ev as KeyboardEvent).key === 'Enter' && (ev.target as HTMLElement).id === 'exit') { ev.preventDefault(); leavePerson(); } });
// (a back press in the simple view is drawn by `popstate` above; the address change it brings is not drawn twice)
window.addEventListener('hashchange', () => { if (simpleView() && hashNow() === drawnAt) return; draw(); });
// the consent sheet: Escape is its "No"
window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && state.sheet) { state.sheet = false; render(); } else if (ev.key === 'Escape' && state.photoDraft) { state.photoDraft = null; render(); } else if (ev.key === 'Escape' && state.insSheet) { state.insSheet = null; render(); } else if (ev.key === 'Escape' && state.importDraft) { state.importDraft = null; render(); } else if (ev.key === 'Escape' && p6.share) closeShare(); });

// The app shell is kept by a service worker (web/public/sw.js, its file list written at build time), so the page, the
// rules, the topics, quick needs and About them open with no connection. Production builds only: the dev server has none.
//
// A new deploy reaches people (18 Nov 2026: a phone showed a build an hour old). Three things together: the worker
// asks the network for the page first and never the browser's own cache (sw.template.js); the page asks for a newer
// worker when it is opened and every time it comes back to the front (an installed app can stay in memory for days);
// and when a newer worker takes over while this page is open, the page loads the new build by itself if the carer is
// on the first screen, and otherwise shows "A newer version is ready. Tap to update." (never in the middle of a card).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadWorker = !!navigator.serviceWorker.controller;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
      const look = () => { if (document.visibilityState === 'visible' && navigator.onLine) void reg?.update().catch(() => { /* offline: the kept copy stands */ }); };
      document.addEventListener('visibilitychange', look);
      window.addEventListener('online', look);
    }).catch(() => { /* no offline copy: the page works as before */ });
  });
  // the first worker claiming a fresh page is not an update; a change of worker after that is
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadWorker && !state.updateReady && !sessionStorage.getItem('tp-had-worker')) { sessionStorage.setItem('tp-had-worker', '1'); return; }
    if (simpleView() && atHome() && !($('#q') as HTMLInputElement | null)?.value) { location.reload(); return; }
    state.updateReady = true; render();
  });
}

// Opened straight on judge mode: the first card is made before the first draw, so there is no empty frame before it.
restoreRacedRoute();
void Promise.all([load(), loadTrial()]).then(async () => {
  if (location.hash.replace(/^#\/?/, '') === 'demo') await enterDemo();
  render(); void refreshDevice().then(() => judgeStep());
  askSettings(); // only if cloud help was already on in this browser; otherwise when it is turned on
});
