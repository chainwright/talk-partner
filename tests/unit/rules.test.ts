import { describe, expect, it } from 'vitest';
import {
  dropBoth, escapeFor, inventedNameFilter, feelingSubtype, householdFilter, isAuxYesNo, isBodyWhere, isFeelingQuestion, isPainLevel, orPair,
  overlapFilter, route, spokenLine, splitQuestion, timeScaleFilter,
} from '../../src/pipeline/rules';
import { PROFILE } from './fixtures';

describe('rule 1: split two-part questions', () => {
  it('splits "..., and if so, ..."', () => {
    expect(splitQuestion('Did the physio phone, and if so, what time is she coming?')).toEqual([
      'Did the physio phone?', 'What time is she coming?',
    ]);
  });
  it('splits two question marks', () => {
    expect(splitQuestion('Have you had your tablets? Do you want some water with them?')).toEqual([
      'Have you had your tablets?', 'Do you want some water with them?',
    ]);
  });
  it('splits "and are you" without a comma', () => {
    expect(splitQuestion('Did you finish the crossword and are you ready for bed?')).toEqual([
      'Did you finish the crossword?', 'Are you ready for bed?',
    ]);
  });
  it('does not split a list joined by "and"', () => {
    expect(splitQuestion('Do you want bread and butter with your soup?')).toEqual(['Do you want bread and butter with your soup?', null]);
    expect(splitQuestion('Would you like tea, and a biscuit?')[1]).toBeNull();
  });
  it('adds a question mark to a bare input', () => {
    expect(splitQuestion('where shall we sit')[0]).toBe('Where shall we sit?');
  });
});

describe('rule 2: aux-verb questions become yes/no', () => {
  it.each(['Are you cold?', 'Shall I open the curtains?', 'Have you seen my glasses?', 'Could you hear the radio?'])('%s', (q) => {
    expect(isAuxYesNo(q)).toBe(true);
  });
  it('not when the question offers "or"', () => {
    expect(isAuxYesNo('Shall I open the curtains or leave them?')).toBe(false);
  });
  it('not for wh-questions', () => {
    expect(isAuxYesNo('What are you reading?')).toBe(false);
  });
});

describe('rule 3: an "or" pair keeps exactly its two options', () => {
  it.each([
    ['Would you like rice or potatoes?', ['rice', 'potatoes']],
    ['Do you want the lamp on or off?', ['on', 'off']],
    ['Shall we ring Grace or Peter?', ['Grace', 'Peter']],
    ['Do you want to sit inside or sit outside?', ['sit inside', 'sit outside']],
    ['Is the bath too warm or too cool?', ['warm', 'cool']],
    ['Would you like cocoa or hot milk?', ['cocoa', 'hot milk']],
    ['Would you rather have fish or a hot meal?', ['fish', 'hot meal']],
  ])('%s', (q, pair) => {
    expect(orPair(q)).toEqual(pair);
  });
  it('long verb phrases are parsed as two options, not left to the model', () => {
    expect(orPair('Do you want to get up or stay in bed?')).toEqual(['get up', 'stay in bed']);
  });
  it('returns null when there is no or-pair', () => {
    expect(orPair('What would you like for tea?')).toBeNull();
  });
  it('drops "both" except for body sides', () => {
    expect(dropBoth(['tea', 'coffee', 'both'], 'What do you want to drink?')).toEqual(['tea', 'coffee']);
    expect(dropBoth(['left foot', 'right foot', 'both feet'], 'Which foot is cold?')).toEqual(['left foot', 'right foot', 'both feet']);
  });
});

describe('rule 4: body map and pain level', () => {
  it('pain "where" goes to the body map', () => {
    expect(isBodyWhere('Where is the pain worst today?')).toBe(true);
    expect(isBodyWhere('Which bit feels sore?')).toBe(true);
  });
  it('pain amount goes to the pain scale, not the body map', () => {
    expect(isPainLevel('How bad is the ache this evening?')).toBe(true);
    expect(isBodyWhere('How bad is the ache this evening?')).toBe(false);
  });
  it('medicine questions are not body-map questions', () => {
    expect(isBodyWhere('Which pain tablets do you want?')).toBe(false);
  });
});

describe('rule 5: feeling subtype scales', () => {
  it.each([
    ['How was the walk by the canal?', 'general'],
    ['How did the omelette taste?', 'taste'],
    ['How was the lamb?', 'taste'],
    ['What do you think about selling the car?', 'idea'],
    ['What do you think of the new physio?', 'person'],
    ['What do you think of Leo?', 'person'],
    ['How did the scan go?', 'result'],
    ['What did you think about the cricket score?', 'result'],
  ])('%s -> %s', (q, sub) => {
    expect(feelingSubtype(q, PROFILE)).toBe(sub);
  });
  it('recognises feeling questions', () => {
    expect(isFeelingQuestion('How was the concert?')).toBe(true);
    expect(isFeelingQuestion('How many sugars?')).toBe(false);
  });
});

describe('rule 7: the spoken line is built in code', () => {
  it('question plus options, Oxford-style list', () => {
    expect(spokenLine('What would you like for tea?', ['lamb', 'rice', 'something else'])).toBe(
      'What would you like for tea? Lamb, rice, or something else?',
    );
  });
  it('two options read naturally', () => {
    expect(spokenLine('Lamp on or off?', ['on', 'off'])).toBe('Lamp on or off? On or off?');
  });
});

describe('rule 8: escape by question type', () => {
  it('who -> someone else', () => expect(escapeFor('Who sent the flowers?')).toBe('someone else'));
  it('where -> somewhere else', () => expect(escapeFor('Where shall we go on Saturday?')).toBe('somewhere else'));
  it('what -> something else', () => expect(escapeFor('What shall we have for tea?')).toBe('something else'));
  it('a list of names -> someone else', () => expect(escapeFor('Shall we ring Grace or Peter?', ['Grace', 'Peter'], PROFILE)).toBe('someone else'));
});

describe('rule 9: household members are excluded from call/visit/invite', () => {
  it('removes household and the partner from a call', () => {
    expect(householdFilter(['Sam', 'Grace', 'Maria'], 'Who do you want to phone tonight?', PROFILE)).toEqual(['Grace']);
  });
  it('replaces "another person" with a named non-household person', () => {
    expect(householdFilter(['Grace', 'another person'], 'Who should we invite on Sunday?', PROFILE)).toEqual(['Grace', 'Leo']);
  });
  it('leaves other questions alone', () => {
    expect(householdFilter(['Sam', 'Grace'], 'Who made you smile today?', PROFILE)).toEqual(['Sam', 'Grace']);
  });
});

describe('rule 9: never invent names', () => {
  it('drops a name the profile does not know on a who question', () => {
    expect(inventedNameFilter(['Grace', 'Leo', 'Luke'], 'Who should we invite round?', PROFILE)).toEqual(['Grace', 'Leo']);
  });
  it('keeps known capitalised things and other questions alone', () => {
    expect(inventedNameFilter(['Elvis', 'Grace'], 'Who do you want to hear?', PROFILE)).toEqual(['Elvis', 'Grace']);
    expect(inventedNameFilter(['Paris', 'Rome'], 'Where shall we go next spring?', PROFILE)).toEqual(['Paris', 'Rome']);
  });
});

describe('rule 10: one time scale', () => {
  it('keeps days when days dominate', () => {
    expect(timeScaleFilter(['Monday', 'Wednesday', 'evening'])).toEqual(['Monday', 'Wednesday']);
  });
  it('keeps parts of the day when they dominate', () => {
    expect(timeScaleFilter(['morning', 'afternoon', 'tomorrow'])).toEqual(['morning', 'afternoon']);
  });
  it('leaves non-time choices', () => {
    expect(timeScaleFilter(['library', 'market'])).toEqual(['library', 'market']);
  });
});

describe('category and name overlap', () => {
  it('drops a category next to its member', () => {
    expect(overlapFilter(['jumper', 'clothes', 'book'], PROFILE)).toEqual(['jumper', 'book']);
  });
  it('drops a people category next to a named person', () => {
    expect(overlapFilter(['Grace', 'family', 'radio'], PROFILE)).toEqual(['Grace', 'radio']);
  });
  it('drops a relation word next to that person', () => {
    expect(overlapFilter(['Leo', 'grandson', 'Peter'], PROFILE)).toEqual(['Leo', 'Peter']);
  });
  it('drops a longer choice that contains another', () => {
    expect(overlapFilter(['Leo', "Leo's photo", 'garden'], PROFILE)).toEqual(['Leo', 'garden']);
  });
  it('drops a profile list name next to one of its items', () => {
    expect(overlapFilter(['music', 'Elvis', 'news'], PROFILE)).toEqual(['Elvis', 'news']);
  });
});

describe('rule 11: router', () => {
  it('two mood words -> cloud', () => {
    const r = route('choice', 'What was the trip to the coast like?', ['nice', 'tiring and sad'], false);
    expect(r.to).toBe('cloud');
    expect(r.reasons).toContain('two or more mood words');
  });
  it('comparative echoed from the question -> cloud', () => {
    expect(route('choice', 'What would make mornings easier?', ['easier', 'music', 'tea'], false).reasons).toContain('comparative echoed from the question');
  });
  it('duplicate head noun -> cloud', () => {
    expect(route('choice', 'Which radio station?', ['local station', 'sports station', 'music'], false).reasons).toContain('duplicate head noun');
  });
  it('too few usable choices -> cloud', () => {
    expect(route('choice', 'What is on your mind?', ['something else'], false).to).toBe('cloud');
  });
  it('a clean card stays on device', () => {
    expect(route('choice', 'What shall we have for tea?', ['lamb', 'rice', 'salad'], false)).toEqual({ to: 'device', reasons: [] });
  });
  it('or-pairs and fixed cards never route', () => {
    expect(route('choice', 'Better or worse?', ['better', 'worse'], true).to).toBe('device');
    expect(route('feeling', 'How was it?', ['good', 'okay'], false).to).toBe('device');
  });
});
