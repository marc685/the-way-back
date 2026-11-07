import { describe, it, expect } from 'vitest';
import { allIdeas, deckFor, filterIdeas, ideaText } from './catalogue';
import type { CustomCard } from './types';

const own: CustomCard = { id: 'own-1', wedge: 'play', text: 'Go fishing at the dam', ages: ['child', 'teen', 'adult'] };

describe('catalogue', () => {
  const ideas = allIdeas([own]);
  it('holds the whole library plus our own activities', () => {
    expect(ideas).toHaveLength(401);
    expect(ideas.find((i) => i.card.id === 'own-1')!.custom).toBe(true);
  });
  it('searches the wording', () => {
    const r = filterIdeas(ideas, { query: 'fishing dam' });
    expect(r.map((i) => i.card.id)).toEqual(['own-1']);
    expect(filterIdeas(ideas, { query: 'tea' }).length).toBeGreaterThan(0);
  });
  it('filters by wedge, age, cost, place and time', () => {
    const r = filterIdeas(ideas, { wedge: 'play', age: 'child', cost: 'free', place: 'home', time: 'quick' });
    expect(r.length).toBeGreaterThan(0);
    for (const { card, wedge } of r) {
      expect(wedge).toBe('play');
      expect(card.ages).toContain('child');
      expect([card.cost, card.place, card.time]).toEqual(['free', 'home', 'quick']);
    }
  });
  it('shows only our list or only hidden ideas', () => {
    const state = { favourites: ['play-1'], hidden: ['self-2'] };
    expect(filterIdeas(ideas, { only: 'favourites' }, state).map((i) => i.card.id)).toEqual(['play-1']);
    expect(filterIdeas(ideas, { only: 'hidden' }, state).map((i) => i.card.id)).toEqual(['self-2']);
  });
  it('reads naturally without names', () => {
    expect(ideaText({ id: 'x', tier: 'free', type: 'task', child: '', adult: 'Teach {member} {activity}' })).toBe('Teach someone at home your hobby');
  });
  it('puts our own activities into the dice draw for their wedge only', () => {
    expect(deckFor({ customCards: [own] }, 'play').some((c) => c.id === 'own-1')).toBe(true);
    expect(deckFor({ customCards: [own] }, 'self').some((c) => c.id === 'own-1')).toBe(false);
  });
});
