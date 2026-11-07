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
  it('asks a child for parent approval', () => {
    const kid = { ...m, age: 'child' as const, rewards: ['Roblox credit'] };
    expect(profileProblems(kid)[0]).toMatch(/parent/);
    expect(profileProblems({ ...kid, rewardApproved: true })).toEqual([]);
  });
  it('does not require activities', () => expect(profileProblems({ ...m, rewards: ['x'], activities: [] })).toEqual([]));
});
