import type { DrawnCard, JournalEntry, Member } from '../src/lib/types';
import type { FamilyDoc } from './types';

export type FamilyView = Omit<FamilyDoc, 'consentAt'> & { me: string; today: string; connected: string[] };

/**
 * What one phone is allowed to see.
 * - Letters: only the writer and the person they're written to.
 * - Self-care prompt history: only your own.
 */
export function viewFor(doc: FamilyDoc, me: string, today: string, connected: string[] = []): FamilyView {
  const canSeeLetter = (writer: string, to?: string) => me === writer || me === to;
  const card = (owner: Member, c?: DrawnCard): DrawnCard | undefined =>
    c && c.letter && !canSeeLetter(owner.id, c.withMemberId) ? { ...c, letter: undefined } : c;
  const entry = (j: JournalEntry): JournalEntry =>
    j.letter && !canSeeLetter(j.memberId, j.confirmedBy) ? { ...j, letter: undefined, privateLetter: true } as JournalEntry : j;
  const { consentAt: _c, ...rest } = doc;
  return {
    ...rest,
    me,
    today,
    connected,
    members: doc.members.map((m) => ({ ...m, currentCard: card(m, m.currentCard), nudgeLog: m.id === me ? m.nudgeLog : [] })),
    journal: doc.journal.map(entry),
  };
}
