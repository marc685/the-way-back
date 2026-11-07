import type { Member } from './types';

export const needsApproval = (m: Member) => m.age !== 'adult';

/** What still stops this profile from being saved, in plain words. */
export function profileProblems(m: Member): string[] {
  const problems: string[] = [];
  if (!m.rewards.length) problems.push('Choose at least one reward.');
  else if (needsApproval(m) && !m.rewardApproved) problems.push('A parent needs to tick that they agree to the rewards.');
  return problems;
}

export const isProfileComplete = (m: Member) => profileProblems(m).length === 0;

/** Upgrade a member saved by an older version of the app. */
export function upgradeMember(raw: any): Member {
  const rewards: string[] = Array.isArray(raw.rewards)
    ? raw.rewards
    : typeof raw.reward === 'string' && raw.reward.trim() ? [raw.reward.trim()] : [];
  const { reward: _old, ...rest } = raw;
  return { activities: [], extended: [], friends: [], wedges: [], rounds: 0, rewardApproved: false, ...rest, rewards };
}
