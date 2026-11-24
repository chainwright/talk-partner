// The conversation trees: what comes after every answer to every topic question (core/topics.ts). Rules only, no AI.
//
// Why (the owner's phone test, 17 Nov 2026): "Are you hungry? -> yes, and then what?" Most topic questions ended on
// the answer and left the carer alone with it. Supported conversation narrows one idea at a time, so here every
// answer (yes, no, not sure, each choice, the way out) has:
//   - `next`: one or two questions that narrow it down, each made into a card by the rules (2 or 3 choices and the way
//     out, adult wording), offered as the main button ("Next: Would you like a snack or a meal?");
//   - `end`: one short line that tells the carer what to do now ("Bring them a sweet snack."), shown when there is no
//     next question, or when the conversation is three questions deep (TREE_DEPTH). Never a silent end.
// What About them names is slotted in where it fits: the family's foods under "a meal", the people who do not live
// there under a call or a visit (one question, "Who would you like to call?", with up to three names as the choices
// and "someone else"; a yes / no when there is one name), their places under going out.
// tests/unit/tree.test.ts walks every topic question and every answer, down every path, and fails on a path with
// neither a next question nor an end line, on a question the rules cannot make a card for, and on a path deeper than
// three questions.

import { HOW_BAD, LIMB, WEAK_NUMB, WHAT_BOTHERS, WHERE_HURTS, WHICH_SIDE, awayNames, ownQuestions } from './topics';
export { WEAK_NUMB } from './topics';
import { EMPTY_PROFILE, type Card, type Profile } from './types';
import { P12 } from './copy12';
import { crisisAnswer } from './redflag';

/** A conversation is at most this many questions deep: the topic question and two that narrow it down. */
export const TREE_DEPTH = 3;

export interface Step {
  /** The questions to ask next, the most useful first. Empty at the end of a path. */
  next: string[];
  /** What the carer does now, in one short line. '' only for a question the trees do not know (a typed one). */
  end: string;
  /**
   * Phase 13 (judge round 10, a health P0): the end line is a safety check the carer must see now, even while a next
   * question is offered: it is drawn as a red box ABOVE "Next", never hidden behind it, and never under a green tick.
   */
  alert?: true;
}

type Raw = { next?: string[]; end: string; alert?: true };
type Node = Record<string, Raw>;

const SNACK_MEAL = 'Would you like a snack or a meal?';
const SWEET_SAVOURY = 'Would you like something sweet or something savoury?';
const HOT_COLD_MEAL = 'Would you like a hot meal or a cold meal?';
const DRINK = 'Would you like something to drink?';
const HOT_COLD = 'Would you like a hot drink or a cold drink?';
const TEA_COFFEE = 'Would you like tea or coffee?';
const WATER_JUICE = 'Would you like water, juice or milk?';
const MILK_IN = 'Would you like milk in it?';
const LIE_DOWN = 'Would you like to lie down?';
const BED_CHAIR = 'Would you like to rest in the bed or the chair?';
const COMPANY = 'Would you like company, or some time alone?';
const STAY = 'Would you like me to stay with you?';
const BOTHERING = 'Is something bothering you?';
const IN_PAIN = 'Are you in pain?';
const HOT_COLD_ROOM = 'Are you too hot or too cold?';
const COMFORTABLE = 'Are you comfortable?';
const TALK_WHEN = 'Would you like to talk about how you feel now, or later?';
const IN_OUT = 'Would you like to stay in or go out?';
const WHEN_OUT = 'Would you like to go out this morning or this afternoon?';
const TV_MUSIC = 'Would you like TV or music?';
const NEWS_FILM = 'Would you like to watch the news or a film?';
const MUSIC_KIND = 'Would you like quiet music or lively music?';
const TIRED = 'Are you tired?';
const SHOW = 'Ask {them} to show you, or to point to it.';
// When the person has something to TELL (core/turn.ts: "[Name] wants to say something"), the carer's questions are
// about the telling, not offers: is it good or a worry, did something happen, now or later.
// (worded so that the rules read both sides whole: "good news" / "worry", "today" / "another day"; tests/unit/turn.test.ts)
export const TELL_NEWS = 'Is it good news, or a worry?';
export const TELL_HAPPENED = 'Did something happen?';
export const TELL_WHEN = 'Do you want to tell me now or later?';
export const TELL_DAY = 'Is it today or another day?';
export const TELL = [TELL_NEWS, TELL_HAPPENED, TELL_WHEN];

/**
 * The trees. Key: the question in lower case without its punctuation. Under it, one entry per answer the rules' card
 * for that question can give. `{them}`, `{They}` and `{their}` take the person's name from About them; "`{name}` says" is "Frank says", or "they say".
 */
const TREE: Record<string, Node> = {
  // ---------------------------------------------------------------- food and drink
  'are you hungry': {
    yes: { next: [SNACK_MEAL], end: 'Bring {them} something to eat.' },
    no: { next: [DRINK], end: 'Not hungry now. Ask again in an hour.' },
    'not sure': { next: [DRINK], end: 'Offer something small, and see if {they} take it.' },
  },
  'would you like a snack or a meal': {
    snack: { next: [SWEET_SAVOURY], end: 'Bring {them} a snack.' },
    meal: { next: ['@foods', HOT_COLD_MEAL], end: 'Make {them} a meal.' },
    'something else': { next: [DRINK], end: 'Show {them} what is in the kitchen, and let {them} point.' },
  },
  'would you like something sweet or something savoury': {
    'something sweet': { end: 'Bring {them} a sweet snack. Show two to pick from, if you can.' },
    'something savoury': { end: 'Bring {them} a savoury snack. Show two to pick from, if you can.' },
    'something else': { end: 'Show {them} what there is, and let {them} point.' },
  },
  'would you like a hot meal or a cold meal': {
    'hot meal': { end: 'Make a hot meal. Show two things {they} could have, and let {them} point.' },
    'cold meal': { end: 'Make a cold meal: a sandwich or a salad. Show {them} what there is.' },
    'something else': { end: 'Show {them} what is in the kitchen, and let {them} point.' },
  },
  'would you like something to drink': {
    yes: { next: [HOT_COLD], end: 'Bring {them} a drink.' },
    no: { end: 'No drink for now. Offer one again in an hour.' },
    'not sure': { next: [HOT_COLD], end: 'Leave a glass of water where {they} can reach it.' },
  },
  'would you like a hot drink or a cold drink': {
    'hot drink': { next: [TEA_COFFEE], end: 'Make {them} a hot drink.' },
    'cold drink': { next: [WATER_JUICE], end: 'Bring {them} a cold drink.' },
    'something else': { next: ['Are you hungry?'], end: 'Not a drink, then. ' + SHOW },
  },
  'would you like tea or coffee': {
    tea: { next: [MILK_IN], end: 'Make the tea the way {they} like it.' },
    coffee: { next: [MILK_IN], end: 'Make the coffee the way {they} like it.' },
    'something else': { next: [HOT_COLD], end: 'Show {them} the cupboard, and let {them} point.' },
  },
  'would you like milk in it': {
    yes: { end: 'Make it with milk.' },
    no: { end: 'Make it without milk.' },
    'not sure': { end: 'Bring the milk with it, and let {them} show you.' },
  },
  'would you like water juice or milk': {
    water: { end: 'Bring {them} a glass of water.' },
    juice: { end: 'Bring {them} a glass of juice.' },
    milk: { end: 'Bring {them} a glass of milk.' },
    'something else': { next: [HOT_COLD], end: 'Show {them} what is in the fridge, and let {them} point.' },
  },
  'would you like some more': {
    yes: { end: 'Give a little more, then ask again.' },
    no: { end: '{They} have had enough. Clear it away.' },
    'not sure': { end: 'Leave it in reach, so {they} can take more.' },
  },
  // ---------------------------------------------------------------- body and care
  'do you need the toilet': {
    yes: { end: 'Take {them} now. This one does not wait.' },
    no: { end: 'Not now. Ask again in an hour or two.' },
    'not sure': { end: 'Offer to go anyway: it is easier than a rush later.' },
  },
  'are you in pain': {
    yes: { next: [WHERE_HURTS], end: 'Ask where it hurts, one place at a time. If the pain is new or strong, call the nurse or doctor.' },
    // (phase 8, judge round 7, the SLP's seat: self-report of pain is less reliable in aphasia; the end line keeps the carer watching)
    no: { end: 'No pain, {name} says. Watch the face, ask again later.' },
    'not sure': { next: [COMFORTABLE], end: 'Watch {their} face and how {they} move, and ask again soon.' },
  },
  // (phase 12, judge round 9: pain in an arm, a hand, a leg, the feet or the face: the FAST sign first)
  'is it suddenly weak or numb yes or no': {
    yes: { end: 'Suddenly weak or numb: this can be a stroke. Call {number} now, and note the time it started.' },
    // (phase 12b, judge round 9b, the SLP's seat: one wrong "no" must not stop the stroke check; the carer checks it)
    // (phase 13, judge round 10: the line was hidden while "Next: How bad is the pain?" was offered; it is now a red box above it)
    no: { next: [HOW_BAD], alert: true, end: '{They} pointed to no. A yes or no can be wrong after a stroke: check it yourself now. Ask {them} to lift both arms and smile. If one side drops or the face droops, call {number} now.' },
    'not sure': { next: [HOW_BAD], alert: true, end: '{They} pointed to not sure. Check it yourself now: ask {them} to lift both arms and smile. If one side drops or the face droops, call {number} now.' },
  },
  // (the card keeps the question's first part as what was asked: "Which side?")
  'which side': {
    left: { next: [HOW_BAD], end: 'The left side. Tell the nurse or doctor which side it is.' },
    right: { next: [HOW_BAD], end: 'The right side. Tell the nurse or doctor which side it is.' },
    'something else': { next: [HOW_BAD], end: 'Ask {them} to put a hand where it hurts.' },
  },
  'how bad is the pain': {
    // (phase 9, judge round 8: "keep an eye on it" could stand under a chest-pain call box)
    // (phase 12, judge round 9: the depth limit can cut the weakness question, so the end line names the sign too)
    'a little': { end: 'A little pain. Ask again in an hour; tell the nurse or doctor if it stays. Sudden weakness or numbness: call now.' },
    // (phase 12b, judge round 9b: "follow the care plan" let a quite bad pain wait; it now takes the same route as very bad)
    'quite bad': { end: 'Quite bad. Call {their} nurse or doctor now. If it looks like an emergency, call the emergency number.' },
    'very bad': { end: 'Very bad. Call {their} nurse or doctor now. If it looks like an emergency, call the emergency number.' },
    'not sure': { end: 'Watch {their} face and how {they} move. If you are worried, call the nurse or doctor.' },
  },
  'are you too hot or too cold': {
    hot: { end: 'Too hot. Open a window, or take a layer off.' },
    cold: { end: 'Too cold. Bring a blanket or a jumper.' },
    'just right': { end: 'Just right. Nothing to change.' },
    'something else': { next: [COMFORTABLE], end: 'Not the temperature. ' + SHOW },
  },
  'would you like a wash now or later': {
    now: { end: 'Get the wash things ready, and go together.' },
    later: { end: 'Later. Ask again after a rest.' },
    'something else': { end: 'Maybe no wash today. Ask again tomorrow.' },
  },
  'are you comfortable': {
    yes: { end: 'Comfortable. Nothing to change.' },
    no: { next: [IN_PAIN, HOT_COLD_ROOM], end: 'Help {them} change position, then ask again.' },
    'not sure': { next: [HOT_COLD_ROOM], end: 'Help {them} change position, and see if it is better.' },
  },
  'would you like your glasses or your hearing aid': {
    'your glasses': { end: 'Bring the glasses. Clean them first.' },
    'your hearing aid': { end: 'Bring the hearing aid. Check the battery.' },
    'something else': { end: 'Ask {them} to point to what {they} need.' },
  },
  // ---------------------------------------------------------------- rest and sleep
  'are you tired': {
    yes: { next: [LIE_DOWN], end: 'Tired. Help {them} to rest.' },
    no: { end: 'Not tired. Carry on.' },
    'not sure': { next: [LIE_DOWN], end: 'Keep things quiet for a while, and ask again.' },
  },
  'would you like to lie down': {
    yes: { next: [BED_CHAIR], end: 'Help {them} to lie down.' },
    no: { end: '{They} will stay up. Ask again later.' },
    'not sure': { next: [BED_CHAIR], end: 'Offer the chair first: it is easier to get up from.' },
  },
  'would you like to rest in the bed or the chair': {
    bed: { end: 'Help {them} to the bed.' },
    chair: { end: 'Help {them} to the chair, with a cushion.' },
    'something else': { end: 'Ask {them} to point to where {they} want to rest.' },
  },
  'how did you sleep': {
    good: { end: 'A good night. Nothing to do.' },
    'so-so': { next: [TIRED], end: 'An ordinary night. A rest after lunch may help.' },
    bad: { next: [IN_PAIN, BOTHERING], end: 'A bad night. Plan a rest today, and tell the nurse if it keeps happening.' },
    'something else': { next: [TIRED], end: 'Ask again later in the day.' },
  },
  'is it too noisy in here': {
    yes: { end: 'Turn the sound down, or close the door.' },
    no: { end: 'The noise is fine.' },
    'not sure': { end: 'Turn it down a little, and see.' },
  },
  'would you like the curtains open or closed': {
    open: { end: 'Open the curtains.' },
    closed: { end: 'Close the curtains.' },
    'something else': { end: 'Ask {them} to point to the window, and show you.' },
  },
  // ---------------------------------------------------------------- people and family
  'would you like a visitor today': {
    yes: { next: ['@see'], end: 'Say one name at a time, and wait for a yes. Then arrange the visit.' },
    no: { end: 'No visitors today. Let people know.' },
    'not sure': { next: [COMPANY], end: 'Ask again later, before anyone sets off.' },
  },
  'do you want to call someone': {
    yes: { next: ['@call'], end: 'Say one name at a time, and wait for a yes. Then make the call together.' },
    no: { end: 'No call for now.' },
    'not sure': { next: [COMPANY], end: 'Ask again later.' },
  },
  'would you like to look at some photos': {
    yes: { end: 'Bring the photos. Go slowly, one at a time.' },
    no: { end: 'No photos now. That is fine.' },
    'not sure': { end: 'Put one photo where {they} can see it, and see if {they} reach for it.' },
  },
  'would you like company or some time alone': {
    company: { next: [STAY], end: 'Stay with {them}, or ask someone to come.' },
    'some time alone': { end: 'Give {them} time alone. Say when you will be back.' },
    'something else': { next: [BOTHERING], end: SHOW },
  },
  'would you like me to stay with you': {
    yes: { end: 'Stay. You do not have to talk.' },
    no: { end: 'Leave {them} for a while. Say when you will be back.' },
    'not sure': { end: 'Stay nearby, where {they} can see you.' },
  },
  // ---------------------------------------------------------------- feelings
  'how are you feeling today': {
    good: { end: 'A good day. Nothing to fix.' },
    'so-so': { next: [BOTHERING], end: 'So-so. Ask again later in the day.' },
    bad: { next: [BOTHERING, IN_PAIN], end: 'A bad day. Stay near, and ask one small question at a time.' },
    sad: { next: [COMPANY], end: 'Sad today. Stay near: you do not have to fix it.' },
    tired: { next: [LIE_DOWN], end: 'Tired. Help {them} to rest.' },
    'in pain': { next: [WHERE_HURTS], end: 'In pain. Ask where it hurts, and tell the nurse or doctor.' },
    'something else': { next: [BOTHERING], end: SHOW },
    // (phase 12: the third page of the feelings card)
    worried: { next: [BOTHERING], end: 'Worried. Stay near, and ask what it is about, one small question at a time.' },
    lonely: { next: [COMPANY], end: 'Lonely. Stay a while, and ask who {they} would like to see or call.' },
    "i can't go on": { end: P12.crisis.end },
    // (phase 12b, judge round 9b: the calm way out beside it; it ends the card, and the carer still asks again)
    'stop for now': { end: '{They} want to stop for now. Stay near, and ask again later today, one small question at a time.' },
  },
  'is something bothering you': {
    yes: { next: [WHAT_BOTHERS], end: 'Something is bothering {them}. Ask what it is about: the body, people, or plans.' },
    no: { end: 'Nothing is bothering {them}. Good.' },
    'not sure': { next: [TALK_WHEN], end: 'Leave it for now, and ask again this evening.' },
  },
  'what is bothering you': {
    body: { next: [IN_PAIN, COMFORTABLE], end: 'It is about the body. Ask about pain first, then comfort.' },
    people: { next: [COMPANY], end: 'It is about people. Say one name at a time, and wait for a yes.' },
    plans: { next: [IN_OUT], end: 'It is about plans. Go through today, one thing at a time.' },
    'something else': { end: '{They} cannot say it this way. ' + SHOW },
  },
  'would you like to talk about how you feel now or later': {
    now: { next: [BOTHERING], end: 'Sit down with {them}, and ask one small question at a time.' },
    later: { end: 'Later. Come back to it this evening.' },
    'something else': { end: '{They} do not want to talk about it now. That is fine.' },
  },
  'do you want some quiet time': {
    yes: { end: 'Turn things off and give {them} quiet. Say when you will be back.' },
    no: { next: [TV_MUSIC], end: 'No quiet time needed. Carry on.' },
    'not sure': { end: 'Turn the sound down a little, and stay near.' },
  },
  'shall we stop for now': {
    yes: { end: 'Stop here. {They} do not want to go on now, and that is fine.' },
    no: { end: '{They} want to go on. Ask your next question.' },
    'not sure': { end: 'Take a short break, then ask again.' },
  },
  // ---------------------------------------------------------------- the person has something to tell
  'is it good news or a worry': {
    'good news': { next: [TELL_HAPPENED], end: 'Good news. Ask what it is about, one small question at a time, and wait.' },
    worry: { next: [TELL_HAPPENED, IN_PAIN], end: 'A worry. Stay near, and ask one small question at a time. It is {their} worry to tell: do not guess it away.' },
    'something else': { next: [TELL_WHEN], end: SHOW },
  },
  'did something happen': {
    yes: { next: [TELL_DAY], end: 'Something happened. Ask when, then who was there, one question at a time.' },
    no: { end: 'Nothing happened. It may be a thought or a wish. Ask: "Is it something you want?"' },
    'not sure': { end: 'Ask it again in other words, or ask {them} to show you.' },
  },
  'do you want to tell me now or later': {
    now: { end: 'Sit down together. Ask one small question at a time, and wait.' },
    later: { end: 'Later. Agree when, and come back to it. Make sure you do.' },
    'something else': { end: SHOW },
  },
  // (phase 10: "I want to talk about… the news / TV")
  'is it the news or something on tv': {
    news: { next: [TELL_NEWS], end: 'The news. Put it on, or find the story, and ask one small question at a time.' },
    'something on tv': { next: [TELL_NEWS], end: 'Something on TV. Show the list on the screen, and let {them} point.' },
    'something else': { end: SHOW },
  },
  'shall we put the tv on': {
    yes: { end: 'Put the TV on together. Show the choices on the screen, and let {them} point.' },
    no: { end: 'No TV now. Ask one small question at a time about what {they} saw, and wait.' },
    'not sure': { end: 'Put it on quietly, and see.' },
  },
  'is it today or another day': {
    today: { end: 'It is about today. Go through today, one thing at a time.' },
    'another day': { end: 'Another day. Ask: "Has it happened, or is it still to come?"' },
    'something else': { end: SHOW },
  },
  // ---------------------------------------------------------------- today and plans
  'would you like to stay in or go out': {
    'stay in': { next: [TV_MUSIC], end: 'A day at home.' },
    'go out': { next: [WHEN_OUT, '@places'], end: 'Plan to go out. Say when and where, one thing at a time.' },
    'something else': { next: [TIRED], end: SHOW },
  },
  'would you like to go out this morning or this afternoon': {
    'this morning': { next: ['@places'], end: 'Go out this morning. Say it again nearer the time.' },
    'this afternoon': { next: ['@places'], end: 'Go out this afternoon. Say it again nearer the time.' },
    'something else': { end: 'Maybe not today. Ask again tomorrow.' },
  },
  'would you like to go for a drive': {
    yes: { next: ['@places', WHEN_OUT], end: 'Plan a drive. Tell {them} when you will set off.' },
    no: { end: 'No drive today.' },
    'not sure': { end: 'Ask again nearer the time.' },
  },
  'would you like to sit in the garden': {
    yes: { end: 'Help {them} out to the garden. Take a hat or a blanket.' },
    no: { end: 'Not the garden now.' },
    'not sure': { end: 'Open the door, and let {them} look out first.' },
  },
  'would you like to go for a walk': {
    yes: { next: [WHEN_OUT], end: 'Go for a short walk together, at {their} pace.' },
    no: { end: 'No walk today.' },
    'not sure': { end: 'Offer a few steps outside, and see how it goes.' },
  },
  'do you want to do your exercises now or later': {
    now: { end: 'Do the exercises together now.' },
    later: { end: 'Later. Agree a time, and ask again then.' },
    'something else': { end: 'Maybe no exercises today. Tell the therapist if it happens often.' },
  },
  // ---------------------------------------------------------------- TV, music and hobbies
  'would you like tv or music': {
    tv: { next: [NEWS_FILM, '@tv'], end: 'Put the TV on. Show the choices on the screen, and let {them} point.' },
    music: { next: ['@music', MUSIC_KIND], end: 'Put some music on.' },
    'something else': { next: ['Would you like to look at the paper?'], end: SHOW },
  },
  'would you like to watch the news or a film': {
    news: { end: 'Put the news on.' },
    film: { end: 'Pick a film together: show two, and let {them} point.' },
    'something else': { next: ['@tv'], end: 'Show the choices on the screen, and let {them} point.' },
  },
  'would you like some music on': {
    yes: { next: ['@music', MUSIC_KIND], end: 'Put some music on.' },
    no: { end: 'No music now.' },
    'not sure': { end: 'Play something quietly, and watch {their} face.' },
  },
  'would you like quiet music or lively music': {
    'quiet music': { end: 'Put on something quiet.' },
    'lively music': { end: 'Put on something lively.' },
    'something else': { end: 'Show {them} the records or the list, and let {them} point.' },
  },
  'is the tv too loud': {
    yes: { end: 'Turn the TV down.' },
    no: { end: 'The sound is fine.' },
    'not sure': { end: 'Turn it down a little, and see.' },
  },
  'would you like the radio on': {
    yes: { end: 'Put the radio on.' },
    no: { end: 'No radio now.' },
    'not sure': { end: 'Put it on quietly, and see.' },
  },
  'would you like to look at the paper': {
    yes: { end: 'Bring the paper. Point to a headline, and wait.' },
    no: { end: 'No paper now.' },
    'not sure': { end: 'Leave the paper where {they} can reach it.' },
  },
};

const SINGULAR: Record<string, string> = { have: 'has', do: 'does', want: 'wants', take: 'takes', need: 'needs', like: 'likes', move: 'moves', reach: 'reaches' };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
const key = (label: string) => label.toLowerCase().replace(/\s+/g, ' ').trim();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Who would you like to call? Beth, Tom or Anna?": the rules make it a choice card, each name with its photo or initial. */
export function who(verb: 'call' | 'see', names: string[]): string[] {
  if (!names.length) return [];
  if (names.length === 1) return [`Would you like to ${verb} ${names[0]}?`];
  const xs = names.slice(0, 3);
  return [`Who would you like to ${verb}? ${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}?`];
}

/** The family's own questions that stand for a marker in the tree ("@foods", "@call" …): none when About them has none. */
function own(marker: string, profile: Profile): string[] {
  const under = (q: string) => ownQuestions(profile).filter((o) => o.under === q).map((o) => o.q);
  switch (marker) {
    case '@foods': return under('Would you like tea or coffee?');
    // one question with the family's names as the choices (three at most, and "someone else"); with one name, a yes / no
    case '@call': return who('call', awayNames(profile));
    case '@see': return who('see', awayNames(profile));
    case '@places': return under('Would you like to go for a drive?');
    case '@tv': return under('Would you like to watch the news or a film?');
    case '@music': return under('Would you like some music on?');
    default: return [];
  }
}

// (phase 10) the questions after "I want to talk about…" a person or a place (core/turn.ts, talkLead)
const TALK_VISIT = /^Is it about (.+)'s visit\?$/;
const TALK_HAPPENED = /^Did something happen (?:with|at) .+\?$/;
const TALK_GO = /^Would you like to go to ((?:(?! or ).)+)\?$/;

/** The family's own questions, and the body map, are not in the table: their steps are made from the question's shape. */
function shaped(card: Pick<Card, 'asked' | 'kind' | 'bodyStep'>, label: string): Raw | null {
  const l = key(label);
  const a = card.asked.trim();
  if (card.kind === 'body') {
    // the first step of the body map leads to its second by itself; after the second: how bad, and which side
    if (card.bodyStep !== 2) return null;
    const sided = !/\b(?:left|right|middle|both)\b/i.test(label) && !/\b(?:head|face|eyes|mouth|neck|top of head|stomach|upper stomach|lower stomach|upper back|lower back|back|chest)\b/i.test(label);
    const where = label.replace(/^your\s+/i, '');
    // (phase 12) an arm, a hand, a leg, the feet or the face: whether it is suddenly weak or numb is asked first
    if (LIMB.test(label)) return { next: [WEAK_NUMB, HOW_BAD, ...(sided ? [WHICH_SIDE] : [])], end: `It hurts here: ${where}. Suddenly weak or numb? Call the emergency number now. Tell the nurse or doctor where.` };
    return { next: sided ? [HOW_BAD, WHICH_SIDE] : [HOW_BAD], end: `It hurts here: ${where}. Tell the nurse or doctor where, and ask how bad it is.` };
  }
  if (card.kind === 'feeling' && l === 'in pain') return { next: [WHERE_HURTS], end: 'In pain. Ask where it hurts, and tell the nurse or doctor.' };
  // (phase 12) the crisis choice: no next question; the red box and the safety screen carry what to do
  if (crisisAnswer(label)) return { end: P12.crisis.end };
  const yn = (yes: string, thing: string): Raw | null => (l === 'yes' ? { end: yes } : l === 'no' ? { end: `Not ${thing} now. That is fine.` } : l === 'not sure' ? { end: 'Not sure. Ask again later.' } : null);
  let m: RegExpMatchArray | null;
  // (phase 10) the questions after "I want to talk about…" a person or a place (core/turn.ts, talkLead)
  if ((m = a.match(TALK_VISIT))) return l === 'yes' ? { next: [TELL_HAPPENED], end: `It is about ${m[1]}'s visit. Ask when, then what about it, one question at a time.` } : l === 'no' ? { next: [TELL_HAPPENED], end: 'Not the visit. Ask one small question at a time, and wait.' } : l === 'not sure' ? { end: 'Ask it again in other words, or ask {them} to show you.' } : null;
  if (TALK_HAPPENED.test(a)) return TREE['did something happen'][l] ?? null;
  if ((m = a.match(TALK_GO))) return yn(`Plan to go to ${m[1]}. Tell {them} when.`, 'a trip');
  if ((m = a.match(/^Would you like to call (.+)\?$/))) return yn(`Call ${m[1]} now, together.`, 'a call');
  if ((m = a.match(/^Would you like to see (.+)\?$/))) return yn(`Ask ${m[1]} to come, and tell {them} when.`, 'a visit');
  if ((m = a.match(/^Would you like to watch (.+)\?$/))) return yn(`Put ${m[1]} on.`, m[1]);
  if ((m = a.match(/^Would you like to listen to (.+)\?$/))) return yn(`Put ${m[1]} on.`, m[1]);
  const out = l === 'something else' || l === 'somewhere else' || l === 'someone else';
  if (/^Who would you like to call\?/.test(a)) return out ? { end: 'Someone else. Say one name at a time, or show photos, and wait for a yes.' } : { end: `Call ${label} now, together.` };
  if (/^Who would you like to see\?/.test(a)) return out ? { end: 'Someone else. Say one name at a time, or show photos, and wait for a yes.' } : { end: `Ask ${label} to come, and tell {them} when.` };
  if (/^Where would you like to go\?/.test(a)) return out ? { end: 'Somewhere else. Show {them} photos of places, and let {them} point.' } : { end: `Plan to go to ${label}. Tell {them} when.` };
  // the family's foods: "Would you like pot roast or chili?", "Would you like porridge?"
  if (/^Would you like [^?]+ or [^?]+\?$/.test(a)) return out ? { next: [SNACK_MEAL], end: 'Show {them} what is in the kitchen, and let {them} point.' } : { end: `${cap(label)}. Get it ready.` };
  if ((m = a.match(/^Would you like ([^?]+)\?$/))) return yn(`Bring ${m[1]}.`, m[1]);
  return null;
}

/** The step for `label` on `card`: from the table, or from the question's shape for the family's own questions and the body map. */
function rawStep(card: Pick<Card, 'asked' | 'kind' | 'bodyStep'>, label: string, profile: Profile): Raw | null {
  const hit = TREE[norm(card.asked)]?.[key(label)];
  if (hit) return hit;
  const known = [TALK_VISIT, TALK_HAPPENED, TALK_GO].some((r) => r.test(card.asked.trim())) || card.kind === 'body' || card.kind === 'feeling' || ownQuestions(profile).some((o) => o.q === card.asked || `${o.q.split('?')[0]}?` === card.asked.trim()) || /^Would you like to (?:call|see) .+\?$/.test(card.asked.trim()) || /^Who would you like to (?:call|see)\?/.test(card.asked.trim());
  return known ? shaped(card, label) : null;
}

/**
 * What comes after `label` was confirmed on `card`. `chain` is the questions already asked in this conversation, this
 * card's included: a question is never offered twice in one conversation, and after TREE_DEPTH questions only the end
 * line is left. For a question the trees do not know (the carer typed it), both are empty. `number` is the emergency
 * number the call buttons use ("{number}" in a line; "the emergency number" when none is given).
 */
export function after(card: Pick<Card, 'asked' | 'kind' | 'bodyStep'>, label: string, profile: Profile, chain: string[] = [], number = ''): Step {
  const raw = rawStep(card, label, profile);
  if (!raw) return { next: [], end: '' };
  const name = profile.personName.trim();
  let end = raw.end.replace(/\{name\} says/g, name ? `${name} says` : 'they say').replace(/\{them\}/g, name || 'them').replace(/\{They\}/g, name || 'They').replace(/\{they\}/g, name || 'they').replace(/\{their\}/g, name ? `${name}'s` : 'their').replace(/\{number\}/g, number || 'the emergency number');
  // with a name the verb is singular: "Frank has had enough", "Frank does not want", "Frank wants to go on"
  if (name) end = end.split(`${name} `).map((part, i) => (i === 0 ? part : part.replace(/^(have|do|want|take|need|like|move|reach)\b/, (v) => SINGULAR[v]))).join(`${name} `);
  // a two-part question is kept by its first part on the card ("Which side?"): compared by that part
  const head = (q: string) => norm(q.split('?')[0]);
  const asked = new Set([...chain, card.asked].map(head));
  const deep = chain.length >= TREE_DEPTH;
  const next = deep ? [] : (raw.next ?? []).flatMap((q) => (q.startsWith('@') ? own(q, profile) : [q])).filter((q, i, all) => !asked.has(head(q)) && all.indexOf(q) === i).slice(0, 3);
  return { next, end, ...(raw.alert ? { alert: true as const } : {}) };
}

/** Every end line of the table, with the person's name put in (for the grammar test: no "them can", "them is"). */
export const treeEnds = (name: string) => Object.entries(TREE).flatMap(([q, node]) => Object.keys(node).map((label) => after({ asked: q, kind: 'choice' }, label, { ...EMPTY_PROFILE, personName: name }).end));
/** Every question the table knows, as written (for the coverage test). */
export const TREE_QUESTIONS = Object.keys(TREE);
/** The size of the table: questions, and answers with a step. */
export const treeSize = () => ({ questions: Object.keys(TREE).length, answers: Object.values(TREE).reduce((n, node) => n + Object.keys(node).length, 0) });
