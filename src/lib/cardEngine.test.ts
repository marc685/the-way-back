import { describe, it, expect } from 'vitest';
import { fillCard, drawCard } from './cardEngine';
import { DECKS } from './decks';
import type { Card, Member } from './types';

const mk = (p: Partial<Member>): Member => ({
  id: p.name!, name: p.name!, avatar: '🙂', age: 'adult', activities: [], extended: [], friends: [],
  rewards: [], rewardApproved: false, wedges: [], rounds: 0, ...p,
});

const son = mk({ name: 'Liam', age: 'child', activities: ['fishing'], extended: ['Gran'] });
const mom = mk({ name: 'Mom', activities: ['baking'] });
const card: Card = { id: 'x', tier: 'free', type: 'task', child: 'Go {activity} with {member}', adult: 'A {theirActivity} with {member}' };

describe('fillCard', () => {
  it('fills slots from profiles using child text for children', () => {
    expect(fillCard(card, 'together', son, [son, mom])!.text).toBe('Go fishing with Mom');
  });
  it('uses the partner\'s own activity for {theirActivity}', () => {
    const d = fillCard(card, 'together', mom, [son, mom])!;
    expect(d.text).toBe('A fishing with Liam');
    expect(d.withMemberId).toBe('Liam');
  });
  it('returns null when a slot cannot be filled', () => {
    expect(fillCard(card, 'together', son, [son])).toBeNull();
    const c2: Card = { ...card, child: 'Call {friend}' };
    expect(fillCard(c2, 'together', son, [son, mom])).toBeNull();
  });
});

describe('drawCard', () => {
  it('never leaves template braces in any drawn card', () => {
    for (const [wedge, deck] of Object.entries(DECKS)) {
      for (let i = 0; i < 50; i++) {
        const d = drawCard(deck, wedge as any, son, [son, mom], { plus: true });
        expect(d).not.toBeNull();
        expect(d!.text).not.toMatch(/[{}]/);
      }
    }
  });
  it('only draws free cards without Plus', () => {
    for (let i = 0; i < 50; i++) {
      const d = drawCard(DECKS.play, 'play', son, [son, mom], { plus: false })!;
      expect(DECKS.play.find((c) => c.id === d.cardId)!.tier).toBe('free');
    }
  });
  it('works for a solo player with an empty profile', () => {
    const solo = mk({ name: 'Solo' });
    expect(drawCard(DECKS.self, 'self', solo, [solo], { plus: false })).not.toBeNull();
  });
});

describe('every card in every deck', () => {
  const full = mk({ name: 'Liam', age: 'child', activities: ['fishing'], extended: ['Gran'], friends: ['the Naidoos'] });
  const fullAdult = { ...full, age: 'adult' as const };
  const other = mk({ name: 'Mom', activities: ['baking'] });
  it('fills completely for child and adult wording, with unique ids', () => {
    const ids = new Set<string>();
    for (const [wedge, deck] of Object.entries(DECKS)) {
      for (const c of deck) {
        expect(ids.has(c.id)).toBe(false);
        ids.add(c.id);
        for (const p of [full, fullAdult]) {
          const d = fillCard(c, wedge as any, p, [p, other]);
          expect(d, `${c.id} (${p.age})`).not.toBeNull();
          expect(d!.text).not.toMatch(/[{}]/);
        }
      }
    }
    expect(ids.size).toBeGreaterThanOrEqual(100);
  });
});
