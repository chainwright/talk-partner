// Phase 18 (judge round 13, seats 02n and 13b, a regression of phase 13's "Ask it again"): a question left for later
// came back as a typed question (web/src/main.ts, `make(x.q)`), so "Where in the arms?" lost its body card, went to the
// consent sheet and was offered to an AI. Here the card it was left on is built again from what Home kept
// (core/later.ts, `Later.node`): the body card with its region, or the guard's card from the carer's own words. Rows
// kept by an older build have no node: a body question is known by its words, and words the guard takes get the
// guard's card. Rules only: no engine of the app is ever handed the question here (NullEngine), so nothing can be sent.

import { NullEngine } from './engine';
import type { Later } from './later';
import { ownGuard, ownGuardCard } from './ownwords';
import { bodyDetailCard, makeCard, type PipelineEnv } from './pipeline';
import { BODY_REGIONS } from './rules';
import { WHERE_HURTS } from './topics';
import type { BodyRegion, Card } from './types';

const isRegion = (r: unknown): r is BodyRegion => typeof r === 'string' && (BODY_REGIONS as string[]).includes(r);

/** The card to ask again, or null for a question that is asked again as it was (any question that is not care). */
export async function laterCard(x: Later, env: PipelineEnv): Promise<Card | null> {
  const own = { profile: env.profile, support: env.support };
  const rules = (q: string) => makeCard(q, { profile: env.profile, support: env.support, engine: new NullEngine(), allowCloud: false, deviceReady: false });
  const n = x.node;
  if (n?.kind === 'guard') return ownGuardCard(n.asked, n.guard, own);
  if (n?.kind === 'body') return isRegion(n.region) ? bodyDetailCard(n.region, env.profile, env.support) : rules(WHERE_HURTS);
  // (an older row: the body card's own questions, then the guard)
  const region = /^where in the (\w+)\?$/i.exec(x.q.trim())?.[1]?.toLowerCase();
  if (isRegion(region)) return bodyDetailCard(region, env.profile, env.support);
  if (x.q.trim() === WHERE_HURTS) return rules(WHERE_HURTS);
  const g = ownGuard(x.q);
  return g ? ownGuardCard(x.q, g, own) : null;
}
