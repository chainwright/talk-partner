// After "something else" (18 Nov 2026, the owner's walk on his phone): the carer's list of ways to find out what it
// is, one step at a time, and the end of "show me" / "write it" that goes on instead of stopping. These functions
// only draw: main.ts hands in the ways (core/more.ts decides them and their order) and the markup of the ways that
// were there before (the first letter, the AI's step). No DOM here; every word comes from core/copy7.ts.

import { COPY } from '../../core/copy';
import { P7 } from '../../core/copy7';
import type { Way } from '../../core/more';
import { WHERE_HURTS } from '../../core/topics';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface WaysModel {
  ways: Way[];
  /** Phase 18: the question of the way "Which one?" ("Which meat would you like?"). */
  which?: string;
  /** The first choices the card of more choices will offer ("water, juice, milk"). */
  moreFirst: string[];
  /** The first-letter button, as it was (web/src/phase4.ts). Empty when it does not fit this card. */
  letterHtml: string;
  /** The AI's step with its line about where it runs, as it was (web/src/simple.ts). Empty when there is none here. */
  narrowHtml: string;
  /**
   * Phase 12b (judge round 9b): the AI's step goes online here (a phone), so it is the second way, not the last. Not on
   * a card about pain, the body or a feeling: there the body card and the needs board stay ahead of it.
   */
  aiSecond?: boolean;
}

/** One way: the first on the list is the main button of the screen. */
const way = (id: string, first: boolean, attrs: string, title: string, sub: string) => `<button type="button" class="btn way${first ? ' primary' : ''}" id="way-${id}" ${attrs}><span><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;

/**
 * The ways after "something else", in the order the rules gave, numbered. The first is always one the rules make on
 * the device. No question of another topic is among them.
 */
export function waysBlock(m: WaysModel): string {
  const O = P7.out;
  const second = !!m.aiSecond && !!m.narrowHtml && m.ways.length > 2 && m.ways.includes('narrow') && !m.ways.includes('where') && !m.ways.includes('needs');
  const ways = second ? [m.ways[0], 'narrow' as Way, ...m.ways.slice(1).filter((w) => w !== 'narrow')] : m.ways;
  const html = ways.map((w, i) => {
    const first = i === 0;
    if (w === 'which') return m.which ? way('which', first, `data-act="which-one" data-which="${esc(m.which)}"`, O.which(m.which), O.whichSub) : '';
    if (w === 'more') return way('more', first, 'data-act="more-like"', O.more, O.moreSub(m.moreFirst));
    if (w === 'about') return way('about', first, 'data-act="about-what"', O.about, O.aboutSub);
    if (w === 'where') return way('where', first, `data-q="${esc(WHERE_HURTS)}" data-next="1"`, O.where, O.whereSub).replace('class="btn way', 'class="btn ask-next way');
    if (w === 'needs') return way('needs', first, 'data-act="needs"', O.needs, O.needsSub);
    if (w === 'letter') return m.letterHtml;
    if (w === 'show') return `<button type="button" class="btn way" id="show-write" data-act="stuck">${COPY.simple.out.showWrite}</button>`;
    if (second) return m.narrowHtml;
    return m.narrowHtml ? `<p class="tip way-last" id="narrow-last">${O.narrowLast}</p>${m.narrowHtml}` : '';
  }).filter(Boolean);
  return `<ol class="ways" id="ways">${html.map((h) => `<li>${h}</li>`).join('')}</ol>`;
}

/** After "show me", "write it" or "draw": did the carer understand? Type it, for the person to confirm; or back to the ways. */
export function understoodBlock(name: string): string {
  const U = P7.understood;
  return `<div class="understood" id="understood"><p class="steplabel">${U.ask}</p>
    <form id="understood-form" class="who-form"><label for="understood-word">${U.yes} <small>${U.hint}</small></label>
      <div class="row"><input id="understood-word" class="field" autocomplete="off" autocapitalize="off" maxlength="40"><button type="submit" class="btn primary" id="understood-go">${esc(U.go(name))}</button></div></form>
    <button type="button" class="btn" id="not-yet" data-act="ways">${U.no}</button></div>`;
}
