import type { AgeGroup, CustomCard, Feeling, GameState, Member } from '../src/lib/types';

/** Everything about one family, as stored on the server. */
export type FamilyDoc = GameState & { id: string; createdAt: string; consentAt: string };

export type Action =
  | { type: 'roll' }
  | { type: 'notToday' }
  | { type: 'send'; letter?: string }
  | { type: 'confirm'; playerId: string; feeling: Feeling; reply?: string }
  | { type: 'notYet'; playerId: string }
  | { type: 'claimReward'; reward: string }
  | { type: 'updateProfile'; memberId: string; patch: Partial<Pick<Member, 'activities' | 'rewards' | 'nudges' | 'avatar'>> }
  | { type: 'approveRewards'; memberId: string }
  | { type: 'bonusRoll'; memberId: string }
  | { type: 'readNudge'; date: string; id: string }
  | { type: 'addMember'; name: string; avatar: string; age: AgeGroup; isParent?: boolean }
  | { type: 'removeMember'; memberId: string }
  | { type: 'renameFamily'; familyName: string }
  | { type: 'saveCustom'; card: CustomCard }
  | { type: 'deleteCustom'; id: string }
  | { type: 'toggleFavourite'; id: string }
  | { type: 'toggleHidden'; id: string }
  | { type: 'unlockPlus' };

/** A push notification to send to every phone of one family member. */
export interface Notify { memberId: string; title: string; body: string; url?: string }

export class ActionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
