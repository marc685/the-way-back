import type { Card, CustomCard, DrawnCard, Member, WedgeId } from './types';

const SLOT_RE = /\{(\w+)\}/g;

export const slotsIn = (text: string) => [...text.matchAll(SLOT_RE)].map((m) => m[1]);

const pick = <T>(arr: T[], rng: () => number): T | undefined =>
  arr.length ? arr[Math.floor(rng() * arr.length)] : undefined;

/** Does this idea suit the player's age? Ideas without age tags suit everyone. */
export const suitsAge = (card: Card, player: Member) => !card.ages || card.ages.includes(player.age);

/** Turn a family's own activity into a card. "Go fishing at the dam" → "Go fishing at the dam – with {member}". */
export function customToCard(c: CustomCard): Card {
  const text = c.text.includes('{member}') ? c.text : `${c.text.trim().replace(/[.!]$/, '')} – with {member}`;
  return { id: c.id, tier: 'free', type: 'task', child: text, adult: text, ages: c.ages, withId: c.withId };
}

/**
 * Fill a card's template from the family profiles.
 * Every card is done with another household member ({member}), who confirms it.
 * Returns null when it can't be filled (e.g. no activity listed, or the named person is the player),
 * so the engine can skip that card instead of showing "{activity}".
 */
export function fillCard(
  card: Card,
  wedge: WedgeId,
  player: Member,
  members: Member[],
  rng: () => number = Math.random
): DrawnCard | null {
  const template = player.age === 'child' ? card.child : card.adult;
  const slots = slotsIn(template);
  const others = members.filter((m) => m.id !== player.id);

  let partner: Member | undefined;
  if (card.withId) {
    partner = others.find((m) => m.id === card.withId);
  } else if (slots.includes('theirActivity')) {
    partner = pick(others.filter((m) => m.activities.length), rng);
  } else {
    partner = pick(others, rng);
  }
  if (!partner) return null;

  const values: Record<string, string | undefined> = {
    member: partner.name,
    theirActivity: pick(partner.activities, rng),
    activity: pick(player.activities, rng),
  };
  for (const s of slots) if (!values[s]) return null;

  return {
    cardId: card.id,
    wedge,
    type: card.type,
    text: template.replace(SLOT_RE, (_, s) => values[s]!),
    withMemberId: partner.id,
    status: 'todo',
  };
}

export interface DrawOptions {
  plus: boolean;
  avoid?: string[]; // recently done – used only if nothing else fits
  hidden?: string[]; // "not for us" – never drawn
  favourites?: string[]; // "our list" – drawn more often
  rng?: () => number;
}

/** Draw a random playable card that suits the player, avoiding recently seen ids where possible. */
export function drawCard(deck: Card[], wedge: WedgeId, player: Member, members: Member[], opts: DrawOptions): DrawnCard | null {
  const rng = opts.rng ?? Math.random;
  const allowed = deck.filter((c) =>
    (opts.plus || c.tier === 'free') && suitsAge(c, player) && !opts.hidden?.includes(c.id));
  const fresh = allowed.filter((c) => !opts.avoid?.includes(c.id));
  for (const pool of [fresh, allowed]) {
    // Favourites get three tickets in the hat.
    const weighted = pool.flatMap((c) => (opts.favourites?.includes(c.id) ? [c, c, c] : [c]));
    const shuffled = weighted.map((c) => ({ c, k: rng() })).sort((a, b) => a.k - b.k).map((x) => x.c);
    const seen = new Set<string>();
    for (const card of shuffled) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      const drawn = fillCard(card, wedge, player, members, rng);
      if (drawn) return drawn;
    }
  }
  return null;
}
