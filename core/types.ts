// Shared types for the card pipeline. Pure data, no DOM.

export interface Person {
  id: string;
  name: string;
  /** e.g. "son", "granddaughter". Stays on the device. */
  relation: string;
  /** Lives in the same home. Household members are never offered for call / visit / invite. */
  household: boolean;
  /** Optional short form the partner uses ("Jen" for Jenny). Swapped out before the cloud like the name (§2.19). */
  nickname?: string;
  /** Optional photo (a small data URL). Stays on the device; shown on the person's tile instead of the initial. */
  photo?: string;
}

/** The "About me" profile. Stored only in IndexedDB on this device; never sent anywhere. */
export interface Profile {
  /** The person's own first name (the one the family uses). On device only; swapped out before the cloud. */
  personName: string;
  /** The name of the partner using the app (a household member by definition). Shown as "you" on cards. */
  partnerName: string;
  people: Person[];
  foods: string[];
  places: string[];
  tv: string[];
  music: string[];
  /** Anything else about the person (a pet's name, a team, a hobby). Same rules: on device only. */
  other: string[];
}

export const EMPTY_PROFILE: Profile = { personName: '', partnerName: '', people: [], foods: [], places: [], tv: [], music: [], other: [] };

/** What the model is allowed to return: topic, kind and at most three choices. */
export interface ModelOutput {
  topic: string;
  kind: 'feeling' | 'yesno' | 'choice';
  choices: string[];
  /** Either-or questions only: the options copied out of the question (validated in code before use). */
  options?: string[];
}

/** 'repair' is the fixed "we're stuck" card (show me / write it / draw / later / change topic): never a model, never an answer. */
/** 'needs' is the fixed quick-needs board (core/needs.ts): everyday needs to point to, made in code, never a model. */
export type CardKind = 'choice' | 'yesno' | 'feeling' | 'body' | 'pain' | 'no-quiz' | 'repair' | 'needs';
export type FeelingSubtype = 'general' | 'taste' | 'idea' | 'result' | 'person';
export type BodyRegion = 'head' | 'chest' | 'stomach' | 'back' | 'arms' | 'legs';

export type PictureRef =
  | { type: 'builtin'; id: string }
  | { type: 'person'; personId: string | null; initial: string }
  | { type: 'cloud'; word: string }
  /** No picture: the word alone on the tile (never an empty frame, never the escape icon). */
  | { type: 'word' };

export interface Choice {
  /** Text on the person's card. */
  label: string;
  /** Text in the partner's spoken line (differs only for the partner's own name: card "you", spoken "me"). */
  spoken: string;
  /** 'repair' marks a tile on the "we're stuck" card: a way to try, not an answer, so it never enters the recap. */
  role: 'answer' | 'escape' | 'repair';
  picture: PictureRef;
}

export type Source = 'on-device' | 'in-cloud' | 'code';

export interface RouteDecision {
  to: 'device' | 'cloud';
  reasons: string[];
}

/**
 * Where each step of one card ran, from what the engine reported (the SDK's `inferenceSource`), never assumed.
 * `private` is the ONLY_ON_DEVICE leg, `stripped` the PREFER_IN_CLOUD leg, `code` the rules with no model.
 * Shown to a judge as "where it ran": a step that did not run says so and why.
 */
export interface StepTrace {
  step: 'private' | 'stripped' | 'code';
  ran: 'on-device' | 'in-cloud' | 'skipped' | 'failed';
  /** Plain words: why it was skipped or failed, or what it got. */
  why: string;
  ms?: number;
  /** True when the card the person sees came from this step. */
  used: boolean;
}

/**
 * "Why this card": what the model proposed, what code kept, what it added, what it dropped and by which rule.
 * Built by the pipeline while the card is assembled, from the values it actually worked on; nothing here is
 * inferred afterwards. Shown as one line in judge mode and collapsed on the partner screen.
 */
export interface CardWhy {
  /** The parsed proposal the rules worked from, and which step produced it; null when no model answer reached the rules. */
  proposed: { step: 'private' | 'stripped'; topic: string; kind: string; choices: string[]; options: string[] } | null;
  /** One line: how the choices were decided (plain words from the copy module). */
  decided: string;
  /** Labels on the card that came from the proposal, as shown. */
  kept: string[];
  /** Labels code added, each with where it came from. */
  added: { label: string; from: string }[];
  /** Proposed choices that are not on the card, each with the rule that removed it. */
  dropped: { label: string; rule: string }[];
  /** Where the headline came from. */
  headline: string;
  /**
   * Answers on the card that are About-me entries (names, places, foods…). Only a step that ran on this computer can
   * put them there: the cloud step never sees About me. Empty when the card holds none.
   */
  personal?: string[];
}

export interface Card {
  /** The question shown on this card (first part if the input was split). */
  asked: string;
  /** The second part of a split question, for "Next". */
  pending: string | null;
  topic: string;
  kind: CardKind;
  subtype?: FeelingSubtype;
  bodyStep?: 1 | 2;
  /** A pain card whose question named a number scale: its choices are the numbers lo … hi, shown as one line. */
  scale?: { lo: number; hi: number };
  region?: BodyRegion;
  choices: Choice[];
  /** The line the partner says aloud, built in code from the final choices. */
  say: string;
  source: Source;
  route: RouteDecision;
  /** Exact JSON payload that left the device for this card's text, or null if nothing was sent. */
  cloudPayload: string | null;
  /** Which About-me words were swapped for which placeholder before sending (shown on the partner screen only). */
  cloudSwaps?: string[];
  /**
   * The request body of a cloud call that was handed to the SDK and failed (an error from the service, a broken
   * connection). The app cannot tell whether it reached the cloud, so the card never says "nothing left" for it.
   */
  cloudAttempted?: string | null;
  /** How many such requests were handed over and failed for this card: 1, or 2 when the one retry failed too. */
  cloudAttempts?: number;
  /** What WOULD have been sent if the cloud were on/configured (shown as "not sent"). */
  unsentPayload?: string | null;
  /** On a 'no-quiz' card: which kind of test the question was (rules.ts, quizKind). */
  quiz?: 'now' | 'identity' | 'remember' | 'fact' | 'place' | 'recall';
  /**
   * On a 'repair' card made for a question nobody can guess the answer to ("What were you trying to tell me?"): the
   * card is the answer to that question, not a detour from another card, so there is no card behind it to go back to.
   */
  unguessable?: boolean;
  /**
   * The question, or a model's answer, held exactly one real option beside a way out ("Rest or something else?"):
   * the pipeline turns such a card into a yes / no card on that option. A lone model choice with no way out beside
   * it is not enough: that card is not made.
   */
  oneOption?: boolean;
  /**
   * A narrowing card (core/narrow.ts): the person chose the way out, and an AI suggested the next, broader choices
   * from the question and what did not fit. `level` is 1 or 2 (there is no third); `rejected` is every choice that
   * was offered and not taken so far, so the next level does not offer it again.
   */
  narrow?: { level: number; rejected: string[]; /** 'rules' when the model's choices were more of the same kind and the rules made the card (core/kinds.ts). */ by?: 'rules' };
  /**
   * A first-letter card (core/letter.ts): the person pointed to the letter their word starts with, and the card offers
   * words that start with it. `by` says who found the words: the rules alone, or a model that added some.
   */
  letter?: { letter: string; rejected: string[]; by: 'rules' | 'device' | 'cloud' };
  /** A card the person started the conversation from (core/turn.ts): the starters, the topics as a picture menu, or what in that topic it is about. */
  turn?: 'start' | 'topics' | 'about';
  /** A question of the fixed list asked before a visit to the doctor (core/visit.ts): its id. Never a model. */
  visit?: string;
  /** A question about one of the family's own photos (core/phototalk.ts). 'device': the on-device model named things in it. */
  photoTalk?: 'rules' | 'device';
  /** Set when no card could be made without a step the partner has to allow (e.g. cloud consent). */
  blocked?: string | null;
  /**
   * Set on a card that has no choices because cloud help failed (busy, unreachable): the question to ask again. The
   * partner screen offers "Try again" for it.
   */
  retry?: string | null;
  /**
   * Phase 9: made from the one sample open question on Home ("See the AI at work"), with no About them in it: its
   * answers are kept nowhere and counted nowhere.
   */
  sample?: boolean;
  /** A card of more choices of one kind, made by the rules after "something else" (core/more.ts): the kind, and what was shown before this page. */
  more?: { subject: 'drink' | 'food' | 'people' | 'place' | 'activity'; shown: string[] };
  /** The fixed card "What is it about?" (core/more.ts). */
  aboutWhat?: boolean;
  /** The one answer is a word the carer typed after "show me" or "write it" (core/more.ts): the person confirms it. */
  typed?: boolean;
  /** Paged fixed list (body map at "more"): the escape on this card leads to the next page. */
  nextPage?: Card | null;
  /** Notes for the partner screen (e.g. "cloud not configured: card kept from device"). */
  notes: string[];
  ms: number;
  /** The stripped leg (PREFER_IN_CLOUD) fell back to the device because the cloud was unreachable. */
  ranOffline?: boolean;
  /** Where each step ran for this card (judge mode, "How this works"). Built by makeCard from engine reports only. */
  trace?: StepTrace[];
  /**
   * A quiet coaching line for the partner, only where a rule detected something about the way the question was
   * asked: two questions in one, a memory test, options the screen cannot know. Never about the person.
   */
  coach?: string;
  /** "Why this card": model proposed, code decided, made visible. */
  why?: CardWhy;
}

export type SupportLevel = 'mild' | 'more' | 'most';
