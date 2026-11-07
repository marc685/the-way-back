import { describe, it, expect } from 'vitest';
import { upgradeMember, profileProblems } from './profile';

const base = { id: 'a', name: 'Ana', avatar: '🦊', age: 'adult', activities: [], extended: [], friends: [], rewardApproved: false, wedges: [], rounds: 0 };

describe('upgradeMember', () => {
  it('turns an old single reward into a list', () => {
    const m = upgradeMember({ ...base, reward: 'Roblox credit' });
    expect(m.rewards).toEqual(['Roblox credit']);
    expect('reward' in m).toBe(false);
  });
  it('gives an empty list when there was no reward', () => {
    expect(upgradeMember({ ...base, reward: '' }).rewards).toEqual([]);
  });
  it('keeps an existing list', () => {
    expect(upgradeMember({ ...base, rewards: ['Spa day', 'Date night'] }).rewards).toEqual(['Spa day', 'Date night']);
  });
});

describe('profileProblems', () => {
  const m = upgradeMember(base);
  it('asks for a reward', () => expect(profileProblems(m)).toHaveLength(1));
  it('never asks an adult for parent approval', () => expect(profileProblems({ ...m, rewards: ['Spa day'] })).toEqual([]));
  it('lets a child save their rewards – a parent approves them on their own phone', () => {
    expect(profileProblems({ ...m, age: 'child' as const, rewards: ['Roblox credit'] })).toEqual([]);
  });
  it('does not require activities', () => expect(profileProblems({ ...m, rewards: ['x'], activities: [] })).toEqual([]));
});

describe('upgradeMember – cards from older versions', () => {
  it('drops extended family and friends', () => {
    const m = upgradeMember({ ...base, rewards: ['x'], extended: ['Gran'], friends: ['the Naidoos'] });
    expect('extended' in m).toBe(false);
    expect('friends' in m).toBe(false);
  });
  it('turns an old repair card into a normal card waiting to be done', () => {
    const m = upgradeMember({ ...base, rewards: ['x'], currentCard: { cardId: 'way-1', wedge: 'wayback', type: 'repair', text: 't', withMemberId: 'b' } });
    expect(m.currentCard).toMatchObject({ type: 'task', status: 'todo' });
  });
  it('clears an old solo card so they can roll again', () => {
    const m = upgradeMember({ ...base, rewards: ['x'], lastRollDate: '2026-11-07', currentCard: { cardId: 'self-1', wedge: 'self', type: 'task', text: 't' } });
    expect(m.currentCard).toBeUndefined();
    expect(m.lastRollDate).toBeUndefined();
  });
});
