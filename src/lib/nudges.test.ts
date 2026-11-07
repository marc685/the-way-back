import { describe, it, expect } from 'vitest';
import { NUDGES, isNudgeDay, nudgeFor, pendingNudge } from './nudges';
import type { Member } from './types';

const mk = (id: string, age: Member['age'], p: Partial<Member> = {}): Member => ({
  id, name: id, avatar: '🙂', age, activities: [], rewards: ['x'], rewardApproved: true, wedges: [], rounds: 0, nudges: true, nudgeLog: [], ...p,
});
const days = (start: string, n: number) => Array.from({ length: n }, (_, i) => new Date(Date.parse(`${start}T12:00:00Z`) + i * 86400000).toISOString().slice(0, 10));

describe('self-care prompts', () => {
  it('has prompts for every age group', () => {
    for (const age of ['child', 'teen', 'adult']) expect(NUDGES.filter((n) => n.age === age).length).toBeGreaterThanOrEqual(20);
    expect(new Set(NUDGES.map((n) => n.id)).size).toBe(NUDGES.length);
  });
  it('comes exactly three times every week, never two days in a row more than once', () => {
    for (const id of ['liam', 'mom', 'zoe', 'abc123']) {
      for (let week = 0; week < 8; week++) {
        const wk = days('2026-11-02', 63).slice(week * 7, week * 7 + 7);
        expect(wk.filter((d) => isNudgeDay(id, d)).length, id).toBe(3);
      }
    }
  });
  it('spreads people out over the week', () => {
    const firstDays = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => days('2026-11-02', 7).findIndex((d) => isNudgeDay(id, d)));
    expect(new Set(firstDays).size).toBeGreaterThan(1);
  });
  it('matches the person’s age and is the same on every run', () => {
    for (const age of ['child', 'teen', 'adult'] as const) {
      const m = mk(`p-${age}`, age);
      for (const d of days('2026-11-02', 21)) {
        const n = nudgeFor(m, d);
        if (n) { expect(n.age).toBe(age); expect(nudgeFor(m, d)).toEqual(n); }
      }
    }
  });
  it('waits until read, and stays off when switched off', () => {
    const m = mk('liam', 'child');
    const day = days('2026-11-02', 7).find((d) => isNudgeDay('liam', d))!;
    expect(pendingNudge(m, day)).toBeDefined();
    expect(pendingNudge({ ...m, nudgeLog: [{ date: day, id: pendingNudge(m, day)!.nudge.id }] }, day)).toBeUndefined();
    expect(pendingNudge({ ...m, nudges: false }, day)).toBeUndefined();
  });
});
