// Shared types for the card pipeline. Pure data, no DOM.

export interface Person {
  id: string;
  name: string;
  /** e.g. "son", "granddaughter". Stays on the device. */
  relation: string;
  /** Lives in the same home. Household members are never offered for call / visit / invite. */
  household: boolean;
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

export type CardKind = 'choice' | 'yesno' | 'feeling' | 'body' | 'pain' | 'no-quiz';
export type FeelingSubtype = 'general' | 'taste' | 'idea' | 'result' | 'person';
export type BodyRegion = 'head' | 'chest' | 'stomach' | 'back' | 'arms' | 'legs';

export type PictureRef =
  | { type: 'builtin'; id: string }
  | { type: 'person'; personId: string | null; initial: string }
  | { type: 'cloud'; word: string };

export interface Choice {
  /** Text on the person's card. */
  label: string;
  /** Text in the partner's spoken line (differs only for the partner's own name: card "you", spoken "me"). */
  spoken: string;
  role: 'answer' | 'escape';
  picture: PictureRef;
}

export type Source = 'on-device' | 'in-cloud' | 'code';

export interface RouteDecision {
  to: 'device' | 'cloud';
  reasons: string[];
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
  /** What WOULD have been sent if the cloud were on/configured (shown as "not sent"). */
  unsentPayload?: string | null;
  /** Set when no card could be made without a step the partner has to allow (e.g. cloud consent). */
  blocked?: string | null;
  /** Paged fixed list (body map at "more"): the escape on this card leads to the next page. */
  nextPage?: Card | null;
  /** Notes for the partner screen (e.g. "cloud not configured: card kept from device"). */
  notes: string[];
  ms: number;
}

export type SupportLevel = 'mild' | 'more' | 'most';
