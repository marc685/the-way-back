import type { AgeGroup, Card, CustomCard, GameState, WedgeId } from './types';
import { DECKS } from './decks';
import { customToCard } from './cardEngine';
import { WEDGES } from './wedges';

export interface Idea { card: Card; wedge: WedgeId; custom: boolean }

export interface IdeaFilter {
  query?: string;
  wedge?: WedgeId;
  age?: AgeGroup;
  cost?: Card['cost'];
  place?: Card['place'];
  time?: Card['time'];
  only?: 'favourites' | 'hidden';
}

/** Readable text for browsing: "Make {member} a cup of tea" → "Make someone a cup of tea". */
export const ideaText = (c: Card, age: AgeGroup = 'adult') =>
  (age === 'child' ? c.child : c.adult)
    .replace(/\{member\}/g, 'someone at home')
    .replace(/\{activity\}/g, 'your hobby')
    .replace(/\{theirActivity\}/g, 'their hobby');

/** Every idea: the built-in library plus the family's own activities for that wedge. */
export function allIdeas(custom: CustomCard[] = []): Idea[] {
  return WEDGES.flatMap((w) => [
    ...custom.filter((c) => c.wedge === w.id).map((c) => ({ card: customToCard(c), wedge: w.id, custom: true })),
    ...DECKS[w.id].map((card) => ({ card, wedge: w.id, custom: false })),
  ]);
}

/** The deck the dice draws from: built-in cards plus the family's own activities. */
export const deckFor = (state: Pick<GameState, 'customCards'>, wedge: WedgeId): Card[] =>
  [...DECKS[wedge], ...state.customCards.filter((c) => c.wedge === wedge).map(customToCard)];

export function filterIdeas(ideas: Idea[], f: IdeaFilter, state?: Pick<GameState, 'favourites' | 'hidden'>): Idea[] {
  const words = (f.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return ideas.filter(({ card, wedge }) => {
    if (f.wedge && wedge !== f.wedge) return false;
    if (f.age && card.ages && !card.ages.includes(f.age)) return false;
    if (f.cost && card.cost !== f.cost) return false;
    if (f.place && card.place !== f.place) return false;
    if (f.time && card.time !== f.time) return false;
    if (f.only === 'favourites' && !state?.favourites.includes(card.id)) return false;
    if (f.only === 'hidden' && !state?.hidden.includes(card.id)) return false;
    if (words.length) {
      const hay = `${ideaText(card, 'child')} ${ideaText(card)}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}
