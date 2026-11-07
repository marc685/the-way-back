import type { Member, WedgeId } from '../src/lib/types';
import { WEDGES, wedgeById } from '../src/lib/wedges';
import { drawCard } from '../src/lib/cardEngine';
import { deckFor } from '../src/lib/catalogue';
import { confirmCard, handOver, sendBack } from '../src/lib/confirm';
import { needsApproval } from '../src/lib/profile';
import { ActionError, type Action, type FamilyDoc, type Notify } from './types';

export interface Ctx { today: string; rng?: () => number; newId: () => string }

const fail = (status: number, msg: string): never => { throw new ActionError(status, msg); };
const clean = (s: unknown, max = 2000) => (typeof s === 'string' ? s.trim().slice(0, max) : '');
const cleanList = (v: unknown, maxItems = 40, max = 80) =>
  Array.isArray(v) ? [...new Set(v.map((x) => clean(x, max)).filter(Boolean))].slice(0, maxItems) : [];

/**
 * Apply one action from one family member. All the game's fairness rules live here,
 * on the server: nobody can confirm their own card, approve their own rewards or pick their own card.
 */
export function apply(doc: FamilyDoc, actorId: string, action: Action, ctx: Ctx): { doc: FamilyDoc; notify: Notify[] } {
  const actor = doc.members.find((m) => m.id === actorId) ?? fail(403, 'You are not in this family.');
  const find = (id: string) => doc.members.find((m) => m.id === id) ?? fail(404, 'Family member not found.');
  const parents = doc.members.filter((m) => m.isParent && m.id !== actorId);
  const setMember = (d: FamilyDoc, id: string, f: (m: Member) => Member): FamilyDoc =>
    ({ ...d, members: d.members.map((m) => (m.id === id ? f(m) : m)) });
  const requireParent = () => { if (!actor.isParent) fail(403, 'Only a parent can do that.'); };
  const recent = doc.journal.filter((j) => j.memberId === actorId).slice(-15).map((j) => j.cardId);
  const draw = (wedge: WedgeId, avoid: string[]) =>
    drawCard(deckFor(doc, wedge), wedge, actor, doc.members, {
      plus: doc.plus, avoid, hidden: doc.hidden, favourites: doc.favourites, rng: ctx.rng,
    });
  const notify: Notify[] = [];
  let next = doc;

  switch (action.type) {
    case 'roll': {
      if (actor.currentCard) fail(409, 'You already have a card.');
      if (actor.wedges.length >= 5) fail(409, 'Claim your reward first.');
      if (actor.lastRollDate === ctx.today) fail(409, "You've already played today.");
      if (doc.members.length < 2) fail(409, 'Invite someone else in your household first.');
      const missing = WEDGES.filter((w) => !actor.wedges.includes(w.id)).map((w) => w.id);
      const rng = ctx.rng ?? Math.random;
      // Try the wedges in random order until one has a card that fits this player.
      const order = missing.map((w) => ({ w, k: rng() })).sort((a, b) => a.k - b.k).map((x) => x.w);
      const card = order.map((w) => draw(w, recent)).find(Boolean) ?? fail(409, 'No cards fit right now – try adding ideas.');
      next = setMember(doc, actorId, (m) => ({ ...m, lastRollDate: ctx.today, currentCard: card! }));
      break;
    }
    case 'notToday': {
      const c = actor.currentCard;
      if (!c || c.status !== 'todo') fail(409, 'No card to swap.');
      const card = draw(c!.wedge, [...recent, c!.cardId]) ?? fail(409, 'No other card fits right now.');
      next = setMember(doc, actorId, (m) => ({ ...m, currentCard: card! }));
      break;
    }
    case 'send': {
      const c = actor.currentCard;
      if (!c || c.status !== 'todo') fail(409, 'No card to send.');
      const letter = clean(action.letter, 5000);
      if (c!.type === 'letter' && !letter) fail(400, 'Write your letter first.');
      next = handOver(doc, actorId, c!.type === 'letter' ? letter : undefined) as FamilyDoc;
      notify.push(c!.type === 'letter'
        ? { memberId: c!.withMemberId, title: `✉️ ${actor.name} sent you a letter`, body: 'Open FamJam to read it.', url: '/inbox' }
        : { memberId: c!.withMemberId, title: `🔔 ${actor.name} did a card with you`, body: 'Please confirm it in FamJam.', url: '/inbox' });
      break;
    }
    case 'confirm':
    case 'notYet': {
      const player = find(action.playerId);
      const c = player.currentCard;
      if (!c || c.status !== 'awaiting') fail(409, 'There is nothing to confirm.');
      // The heart of fairness: only the person named on the card can confirm it – never the player.
      if (c!.withMemberId !== actorId || player.id === actorId) fail(403, `Only ${find(c!.withMemberId).name} can confirm this.`);
      if (action.type === 'confirm') {
        if (!['loved', 'nice', 'ok'].includes(action.feeling)) fail(400, 'Choose how it was for you.');
        next = confirmCard(doc, player.id, { feeling: action.feeling, reply: clean(action.reply, 1000) }) as FamilyDoc;
        const w = wedgeById(c!.wedge);
        notify.push({ memberId: player.id, title: `🎉 ${actor.name} confirmed!`, body: `You earned the ${w.name} wedge.`, url: '/journal' });
      } else {
        next = sendBack(doc, player.id) as FamilyDoc;
        notify.push({ memberId: player.id, title: `↩️ ${actor.name} says “not yet”`, body: 'Your card is back with you – no penalty.', url: '/' });
      }
      break;
    }
    case 'claimReward': {
      if (actor.wedges.length < 5) fail(409, 'Complete all five wedges first.');
      const reward = clean(action.reward, 120);
      if (actor.rewards.length && !actor.rewards.includes(reward)) fail(400, 'Choose one of your rewards.');
      next = setMember(doc, actorId, (m) => ({ ...m, wedges: [], rounds: m.rounds + 1 }));
      next = { ...next, journal: [...next.journal, {
        id: ctx.newId(), cardId: 'reward', memberId: actorId, wedge: 'play', cardText: `🏆 Completed the circle and claimed: ${reward}`, date: ctx.today,
      }] };
      for (const p of parents) notify.push({ memberId: p.id, title: `🏆 ${actor.name} completed the circle!`, body: `They're claiming: ${reward}`, url: '/journal' });
      break;
    }
    case 'updateProfile': {
      const target = find(action.memberId);
      if (target.id !== actorId && !actor.isParent) fail(403, 'You can only edit your own profile.');
      const p = action.patch ?? {};
      const rewards = p.rewards !== undefined ? cleanList(p.rewards, 30, 120) : target.rewards;
      const rewardsChanged = JSON.stringify(rewards) !== JSON.stringify(target.rewards);
      let approved = target.rewardApproved;
      if (!needsApproval(target)) approved = true;
      else if (rewardsChanged) approved = !!actor.isParent && actor.id !== target.id;
      next = setMember(doc, target.id, (m) => ({
        ...m,
        activities: p.activities !== undefined ? cleanList(p.activities) : m.activities,
        avatar: p.avatar !== undefined ? clean(p.avatar, 8) || m.avatar : m.avatar,
        nudges: p.nudges !== undefined ? !!p.nudges : m.nudges,
        rewards,
        rewardApproved: approved,
      }));
      if (rewardsChanged && needsApproval(target) && !approved) {
        for (const par of doc.members.filter((m) => m.isParent && m.id !== target.id)) {
          notify.push({ memberId: par.id, title: `🏆 ${target.name} chose rewards`, body: 'Please approve them in FamJam.', url: '/inbox' });
        }
      }
      break;
    }
    case 'approveRewards': {
      requireParent();
      const target = find(action.memberId);
      if (target.id === actorId) fail(403, 'Another parent needs to approve your rewards.');
      next = setMember(doc, target.id, (m) => ({ ...m, rewardApproved: true }));
      notify.push({ memberId: target.id, title: '🏆 Your rewards were approved', body: `${actor.name} said yes!`, url: '/' });
      break;
    }
    case 'bonusRoll': {
      requireParent();
      next = setMember(doc, find(action.memberId).id, (m) => ({ ...m, lastRollDate: undefined }));
      if (action.memberId !== actorId) notify.push({ memberId: action.memberId, title: '🎲 Bonus roll!', body: `${actor.name} gave you an extra roll today.`, url: '/' });
      break;
    }
    case 'readNudge': {
      // The private note is never sent to the server – only that the prompt was read.
      if (actor.nudgeLog.some((l) => l.date === action.date)) break;
      next = setMember(doc, actorId, (m) => ({ ...m, nudgeLog: [...m.nudgeLog, { date: clean(action.date, 10), id: clean(action.id, 20) }].slice(-200) }));
      break;
    }
    case 'addMember': {
      requireParent();
      const name = clean(action.name, 30) || fail(400, 'Add a name.');
      if (doc.members.length >= 12) fail(409, 'A family can have up to 12 people.');
      if (!['child', 'teen', 'adult'].includes(action.age)) fail(400, 'Choose an age group.');
      next = { ...doc, members: [...doc.members, {
        id: ctx.newId(), name: name!, avatar: clean(action.avatar, 8) || '🙂', age: action.age,
        isParent: action.age === 'adult' && !!action.isParent,
        activities: [], rewards: [], rewardApproved: action.age === 'adult', wedges: [], rounds: 0, nudges: true, nudgeLog: [],
      }] };
      break;
    }
    case 'removeMember': {
      requireParent();
      if (action.memberId === actorId) fail(409, "You can't remove yourself.");
      find(action.memberId);
      next = {
        ...doc,
        members: doc.members.filter((m) => m.id !== action.memberId)
          // Cards waiting on the removed person go back to their players.
          .map((m) => (m.currentCard?.withMemberId === action.memberId ? { ...m, currentCard: undefined, lastRollDate: undefined } : m)),
        customCards: doc.customCards.map((c) => (c.withId === action.memberId ? { ...c, withId: undefined } : c)),
      };
      break;
    }
    case 'renameFamily': {
      requireParent();
      next = { ...doc, familyName: clean(action.familyName, 60) || doc.familyName };
      break;
    }
    case 'saveCustom': {
      const c = action.card;
      const text = clean(c?.text, 160);
      if (text.length < 3) fail(400, 'Describe the activity.');
      const ages = (c.ages ?? []).filter((a) => ['child', 'teen', 'adult'].includes(a));
      if (!ages.length) fail(400, 'Choose who can draw it.');
      if (!WEDGES.some((w) => w.id === c.wedge)) fail(400, 'Choose a wedge.');
      const withId = c.withId && doc.members.some((m) => m.id === c.withId) ? c.withId : undefined;
      const id = /^own-[a-z0-9]{4,20}$/.test(c.id ?? '') ? c.id : `own-${ctx.newId()}`;
      const card = { id, wedge: c.wedge, text, ages, withId };
      next = { ...doc, customCards: doc.customCards.some((x) => x.id === id)
        ? doc.customCards.map((x) => (x.id === id ? card : x)) : [...doc.customCards, card].slice(-200) };
      break;
    }
    case 'deleteCustom':
      next = { ...doc, customCards: doc.customCards.filter((c) => c.id !== action.id) };
      break;
    case 'toggleFavourite':
    case 'toggleHidden': {
      const key = action.type === 'toggleFavourite' ? 'favourites' : 'hidden';
      const id = clean(action.id, 40);
      next = { ...doc, [key]: doc[key].includes(id) ? doc[key].filter((x) => x !== id) : [...doc[key], id].slice(-500) };
      break;
    }
    case 'unlockPlus':
      requireParent();
      next = { ...doc, plus: true };
      break;
    default:
      fail(400, 'Unknown action.');
  }
  return { doc: next, notify: notify.filter((n) => n.memberId !== actorId) };
}
