import type { Card, DrawnCard, Member, WedgeId } from './types';

const SLOT_RE = /\{(\w+)\}/g;

export const slotsIn = (text: string) => [...text.matchAll(SLOT_RE)].map((m) => m[1]);

const pick = <T>(arr: T[], rng: () => number): T | undefined =>
  arr.length ? arr[Math.floor(rng() * arr.length)] : undefined;

/**
 * Fill a card's template from the family profiles.
 * Returns null when a slot can't be filled (e.g. no extended family listed),
 * so the engine can skip that card instead of showing "{extended}".
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
  if (slots.includes('theirActivity')) {
    partner = pick(others.filter((m) => m.activities.length), rng);
  } else if (slots.includes('member')) {
    partner = pick(others, rng);
  }

  const values: Record<string, string | undefined> = {
    member: partner?.name,
    theirActivity: partner ? pick(partner.activities, rng) : undefined,
    activity: pick(player.activities, rng),
    extended: pick(player.extended, rng),
    friend: pick(player.friends, rng),
  };

  for (const s of slots) if (!values[s]) return null;

  return {
    cardId: card.id,
    wedge,
    type: card.type,
    text: template.replace(SLOT_RE, (_, s) => values[s]!),
    withMemberId: partner?.id,
  };
}

/** Draw a random playable card from a deck, avoiding recently seen ids where possible. */
export function drawCard(
  deck: Card[],
  wedge: WedgeId,
  player: Member,
  members: Member[],
  opts: { plus: boolean; avoid?: string[]; rng?: () => number }
): DrawnCard | null {
  const rng = opts.rng ?? Math.random;
  const allowed = deck.filter((c) => opts.plus || c.tier === 'free');
  const fresh = allowed.filter((c) => !opts.avoid?.includes(c.id));
  for (const pool of [fresh, allowed]) {
    const shuffled = [...pool].sort(() => rng() - 0.5);
    for (const card of shuffled) {
      const drawn = fillCard(card, wedge, player, members, rng);
      if (drawn) return drawn;
    }
  }
  return null;
}
