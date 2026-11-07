import type { AgeGroup, Member } from './types';
import all from '../data/nudges.json';

export interface Nudge { id: string; age: AgeGroup; text: string }
export const NUDGES = all as Nudge[];

/** Small stable hash so the same person gets the same schedule on every phone and on a future push server. */
const hash = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

const dayIndex = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000);
const addDays = (date: string, n: number) => new Date((dayIndex(date) + n) * 86400000 + 43200000).toISOString().slice(0, 10);

/** Three days a week, spread out (every other day), starting on a different weekday per person. */
export function isNudgeDay(memberId: string, date: string) {
  const offset = hash(memberId) % 7;
  const d = (((dayIndex(date) - offset) % 7) + 7) % 7;
  return d === 0 || d === 2 || d === 4;
}

/** Which prompt this person gets on a nudge day – chosen from their age group, varying by date. */
export function nudgeFor(member: Pick<Member, 'id' | 'age'>, date: string): Nudge | undefined {
  if (!isNudgeDay(member.id, date)) return undefined;
  const pool = NUDGES.filter((n) => n.age === member.age);
  return pool[hash(`${member.id}:${date}`) % pool.length];
}

/** A prompt waiting to be read: today's or one from the last two days that hasn't been read yet. */
export function pendingNudge(member: Member, today: string): { nudge: Nudge; date: string } | undefined {
  if (!member.nudges) return undefined;
  for (let back = 0; back <= 2; back++) {
    const date = addDays(today, -back);
    const nudge = nudgeFor(member, date);
    if (nudge) return member.nudgeLog.some((l) => l.date === date) ? undefined : { nudge, date };
  }
  return undefined;
}
