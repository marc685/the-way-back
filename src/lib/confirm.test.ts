import { describe, it, expect } from 'vitest';
import { confirmCard, handOver, sendBack, waitingFor } from './confirm';
import type { GameState, Member } from './types';

const mk = (name: string, p: Partial<Member> = {}): Member => ({
  id: name, name, avatar: '🙂', age: 'adult', activities: [], rewards: ['x'], rewardApproved: true, wedges: [], rounds: 0, nudges: true, nudgeLog: [], ...p,
});
const start = (): GameState => ({
  version: 1, safetyAccepted: true, familyName: 'F', plus: false, journal: [], customCards: [], favourites: [], hidden: [],
  members: [
    mk('Liam', { age: 'child', currentCard: { cardId: 'way-1', wedge: 'wayback', type: 'task', text: 'Make Mom tea', withMemberId: 'Mom', status: 'todo' } }),
    mk('Mom'),
  ],
});
const liam = (s: GameState) => s.members.find((m) => m.id === 'Liam')!;
const mom = (s: GameState) => s.members.find((m) => m.id === 'Mom')!;

describe('confirmation', () => {
  it('handing over waits for the other person, with no wedge yet', () => {
    const s = handOver(start(), 'Liam');
    expect(liam(s).currentCard!.status).toBe('awaiting');
    expect(liam(s).wedges).toEqual([]);
    expect(waitingFor(s, 'Mom').map((m) => m.id)).toEqual(['Liam']);
  });
  it('confirming gives the wedge to the player, not the confirmer, and records the reply', () => {
    const s = confirmCard(handOver(start(), 'Liam'), 'Liam', { feeling: 'loved', reply: '  Thank you!  ' });
    expect(liam(s).wedges).toEqual(['wayback']);
    expect(liam(s).currentCard).toBeUndefined();
    expect(mom(s).wedges).toEqual([]);
    expect(s.journal).toHaveLength(1);
    expect(s.journal[0]).toMatchObject({ memberId: 'Liam', confirmedBy: 'Mom', feeling: 'loved', reply: 'Thank you!' });
  });
  it('cannot confirm a card that was not handed over', () => {
    const s = confirmCard(start(), 'Liam', { feeling: 'ok' });
    expect(liam(s).wedges).toEqual([]);
  });
  it('"not yet" gives the card back with no wedge', () => {
    const s = sendBack(handOver(start(), 'Liam'), 'Liam');
    expect(liam(s).currentCard!.status).toBe('todo');
    expect(liam(s).wedges).toEqual([]);
    expect(s.journal).toHaveLength(0);
  });
  it('keeps the letter for the confirmer to read and in the journal', () => {
    const s0 = handOver(start(), 'Liam', 'You are the best');
    expect(liam(s0).currentCard!.letter).toBe('You are the best');
    expect(confirmCard(s0, 'Liam', { feeling: 'nice' }).journal[0].letter).toBe('You are the best');
  });
});
