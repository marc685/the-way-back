import { describe, it, expect } from 'vitest';
import { fillCard, drawCard } from './cardEngine';
import { DECKS } from './decks';
import type { Card, Member } from './types';

const mk = (p: Partial<Member>): Member => ({
  id: p.name!, name: p.name!, avatar: '🙂', age: 'adult', activities: [],
  rewards: [], rewardApproved: false, wedges: [], rounds: 0, ...p,
});

const son = mk({ name: 'Liam', age: 'child', activities: ['fishing'] });
const mom = mk({ name: 'Mom', activities: ['baking'] });
const card: Card = { id: 'x', tier: 'free', type: 'task', child: 'Go {activity} with {member}', adult: 'A {theirActivity} with {member}' };

describe('fillCard', () => {
  it('fills slots from profiles using child text for children', () => {
    const d = fillCard(card, 'together', son, [son, mom])!;
    expect(d.text).toBe('Go fishing with Mom');
    expect(d.withMemberId).toBe('Mom');
    expect(d.status).toBe('todo');
  });
  it("uses the other member's own activity for {theirActivity}", () => {
    expect(fillCard(card, 'together', mom, [son, mom])!.text).toBe('A fishing with Liam');
  });
  it('returns null when there is nobody else in the household', () => {
    expect(fillCard(card, 'together', son, [son])).toBeNull();
  });
  it('returns null when the player has no activity for {activity}', () => {
    const noAct = mk({ name: 'Zoe' });
    expect(fillCard(card, 'together', { ...noAct, age: 'child' }, [noAct, mom])).toBeNull();
  });
});

describe('every card in every deck', () => {
  const kid = mk({ name: 'Liam', age: 'child', activities: ['fishing'] });
  const adult = { ...kid, age: 'adult' as const };
  const ids = new Set<string>();
  it('is done with a household member, fills completely, and has a unique id', () => {
    for (const [wedge, deck] of Object.entries(DECKS)) {
      expect(deck).toHaveLength(20);
      for (const c of deck) {
        expect(ids.has(c.id)).toBe(false);
        ids.add(c.id);
        expect(['task', 'letter']).toContain(c.type);
        for (const text of [c.child, c.adult]) {
          expect(text, c.id).toContain('{member}');
          expect(text, c.id).not.toMatch(/\{(extended|friend)\}/);
        }
        for (const p of [kid, adult]) {
          const d = fillCard(c, wedge as any, p, [p, mom]);
          expect(d, `${c.id} (${p.age})`).not.toBeNull();
          expect(d!.text).not.toMatch(/[{}]/);
          expect(d!.withMemberId).toBe('Mom');
        }
      }
    }
    expect(ids.size).toBe(100);
  });
});

describe('drawCard', () => {
  it('only draws free cards without Plus', () => {
    for (let i = 0; i < 50; i++) {
      const d = drawCard(DECKS.play, 'play', son, [son, mom], { plus: false })!;
      expect(DECKS.play.find((c) => c.id === d.cardId)!.tier).toBe('free');
    }
  });
  it('still finds cards when nobody has listed activities', () => {
    const a = mk({ name: 'A' }), b = mk({ name: 'B' });
    for (const [wedge, deck] of Object.entries(DECKS)) {
      expect(drawCard(deck, wedge as any, a, [a, b], { plus: false }), wedge).not.toBeNull();
    }
  });
});
