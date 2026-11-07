import { describe, it, expect } from 'vitest';
import { fillCard, drawCard, customToCard } from './cardEngine';
import { DECKS } from './decks';
import type { Card, Member } from './types';

const mk = (p: Partial<Member>): Member => ({
  id: p.name!, name: p.name!, avatar: '🙂', age: 'adult', activities: [],
  rewards: [], rewardApproved: false, wedges: [], rounds: 0, nudges: true, nudgeLog: [], ...p,
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
  const ids = new Set<string>();
  it('is done with a household member, has valid tags, fills for every age it suits, and has a unique id', () => {
    for (const [wedge, deck] of Object.entries(DECKS)) {
      expect(deck).toHaveLength(80);
      deck.forEach((c, i) => {
        expect(ids.has(c.id), c.id).toBe(false);
        ids.add(c.id);
        expect(c.tier, c.id).toBe(i < 15 ? 'free' : 'plus');
        expect(['task', 'letter']).toContain(c.type);
        expect(c.ages!.length, c.id).toBeGreaterThan(0);
        expect(['free', 'low', 'outing']).toContain(c.cost);
        expect(['home', 'outside', 'out']).toContain(c.place);
        expect(['quick', 'long']).toContain(c.time);
        for (const text of [c.child, c.adult]) {
          expect(text, c.id).toContain('{member}');
          expect(text, c.id).not.toMatch(/\{(?!member\}|activity\}|theirActivity\})/);
        }
        for (const age of c.ages!) {
          const p = mk({ name: 'Liam', age, activities: ['fishing'] });
          const d = fillCard(c, wedge as any, p, [p, mom]);
          expect(d, `${c.id} (${age})`).not.toBeNull();
          expect(d!.text).not.toMatch(/[{}]/);
        }
      });
    }
    expect(ids.size).toBe(400);
  });
});

describe('ages, hidden ideas, favourites and our own activities', () => {
  const kid = mk({ name: 'Liam', age: 'child' });
  const adultOnly: Card = { id: 'a', tier: 'free', type: 'task', child: 'x {member}', adult: 'Date night with {member}', ages: ['adult'] };
  const anyone: Card = { id: 'b', tier: 'free', type: 'task', child: 'Tea with {member}', adult: 'Tea with {member}' };
  it('never draws an adult-only idea for a child', () => {
    for (let i = 0; i < 30; i++) expect(drawCard([adultOnly, anyone], 'together', kid, [kid, mom], { plus: true })!.cardId).toBe('b');
  });
  it('never draws a hidden idea', () => {
    for (let i = 0; i < 30; i++) expect(drawCard([anyone, { ...anyone, id: 'c' }], 'together', kid, [kid, mom], { plus: true, hidden: ['b'] })!.cardId).toBe('c');
  });
  it('draws favourites more often', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ ...anyone, id: `n${i}` }));
    let fav = 0;
    for (let i = 0; i < 2000; i++) if (drawCard(many, 'together', kid, [kid, mom], { plus: true, favourites: ['n0'] })!.cardId === 'n0') fav++;
    expect(fav / 2000).toBeGreaterThan(0.33); // 3 of 7 tickets ≈ 43%, vs 20% without
  });
  it('turns our own activity into a card with the household member added', () => {
    const c = customToCard({ id: 'own-1', wedge: 'together', text: 'Go fishing at the dam.', ages: ['child', 'adult'] });
    expect(fillCard(c, 'together', kid, [kid, mom])!.text).toBe('Go fishing at the dam – with Mom');
  });
  it('does our own activity with the chosen person only, and never with yourself', () => {
    const zoe = mk({ name: 'Zoe' });
    const c = customToCard({ id: 'own-2', wedge: 'play', text: 'Bake rusks', ages: ['child'], withId: 'Zoe' });
    for (let i = 0; i < 10; i++) expect(fillCard(c, 'play', kid, [kid, mom, zoe])!.withMemberId).toBe('Zoe');
    expect(fillCard(c, 'play', { ...zoe, age: 'child' }, [kid, mom, zoe])).toBeNull();
  });
});

describe('drawCard', () => {
  it('only draws free cards without Plus', () => {
    for (let i = 0; i < 50; i++) {
      const d = drawCard(DECKS.play, 'play', son, [son, mom], { plus: false })!;
      expect(DECKS.play.find((c) => c.id === d.cardId)!.tier).toBe('free');
    }
  });
  it('finds a card for every age in every wedge, even with no activities listed', () => {
    for (const age of ['child', 'teen', 'adult'] as const) {
      const a = mk({ name: 'A', age }), b = mk({ name: 'B' });
      for (const [wedge, deck] of Object.entries(DECKS)) {
        expect(drawCard(deck, wedge as any, a, [a, b], { plus: false }), `${wedge} ${age}`).not.toBeNull();
      }
    }
  });
  it('still finds cards when nobody has listed activities', () => {
    const a = mk({ name: 'A' }), b = mk({ name: 'B' });
    for (const [wedge, deck] of Object.entries(DECKS)) {
      expect(drawCard(deck, wedge as any, a, [a, b], { plus: false }), wedge).not.toBeNull();
    }
  });
});
