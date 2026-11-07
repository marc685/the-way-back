import type { FamilyView } from './api';
import type { Member } from './types';
import { needsApproval } from './profile';

/** What's waiting for this phone's person: cards and letters to confirm, and (for parents) rewards to approve. */
export function inboxFor(view: FamilyView) {
  const me = view.members.find((m) => m.id === view.me)!;
  const toConfirm = view.members.filter((m) => m.id !== me.id && m.currentCard?.status === 'awaiting' && m.currentCard.withMemberId === me.id);
  const toApprove: Member[] = me.isParent
    ? view.members.filter((m) => m.id !== me.id && needsApproval(m) && m.rewards.length > 0 && !m.rewardApproved)
    : [];
  return { toConfirm, toApprove, count: toConfirm.length + toApprove.length };
}
