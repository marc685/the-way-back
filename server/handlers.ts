import type { AgeGroup } from '../src/lib/types';
import { isNudgeDay } from '../src/lib/nudges';
import { todayIn } from '../src/lib/dates';
import { apply } from './reducer';
import { viewFor } from './views';
import { hashToken, JOIN_CODE_DAYS, MAX_FAILED_JOINS, newDeviceToken, newId, newJoinCode, normaliseCode } from './auth';
import type { Store, PushSubscriptionJSON } from './store';
import { ActionError, type Action, type FamilyDoc, type Notify } from './types';

export interface Req { method: string; path: string; headers: Record<string, string | undefined>; body: any; ip: string }
export interface Res { status: number; body: unknown }
export interface Deps {
  store: Store;
  /** Send one notification to every phone of one person. */
  sendPush: (familyId: string, n: Notify) => Promise<void>;
  now?: () => Date;
  vapidPublicKey?: string;
  cronSecret?: string;
}

const ok = (body: unknown): Res => ({ status: 200, body });
const err = (status: number, error: string, code?: string): Res => ({ status, body: { error, code } });
const AGES: AgeGroup[] = ['child', 'teen', 'adult'];

async function authed(req: Req, deps: Deps) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const tokenHash = hashToken(token);
  const device = await deps.store.findDevice(tokenHash);
  if (!device) return null;
  const fam = await deps.store.getFamily(device.familyId);
  if (!fam || !fam.doc.members.some((m) => m.id === device.memberId)) return null;
  return { tokenHash, device, ...fam };
}

export async function handle(req: Req, deps: Deps): Promise<Res> {
  const now = deps.now?.() ?? new Date();
  const today = todayIn(now);
  const { store } = deps;
  try {
    switch (`${req.method} ${req.path}`) {
      case 'GET /api/config':
        return ok({ vapidPublicKey: deps.vapidPublicKey ?? null });

      case 'POST /api/family': {
        const b = req.body ?? {};
        if (b.consent !== true) return err(400, 'Please agree to how FamJam stores your family’s information.');
        const familyName = String(b.familyName ?? '').trim().slice(0, 60);
        const list = Array.isArray(b.members) ? b.members.slice(0, 12) : [];
        const meIndex = Number(b.meIndex);
        if (!familyName) return err(400, 'Add your family name.');
        if (list.length < 2) return err(400, 'Add at least two people.');
        if (!list[meIndex] || list[meIndex].age !== 'adult') return err(400, 'The person setting up the family must be an adult.');
        const members = list.map((m: any, i: number) => {
          const age: AgeGroup = AGES.includes(m.age) ? m.age : 'adult';
          return {
            id: newId(), name: String(m.name ?? '').trim().slice(0, 30) || `Person ${i + 1}`, avatar: String(m.avatar ?? '🙂').slice(0, 8), age,
            isParent: i === meIndex || (age === 'adult' && !!m.isParent),
            activities: [], rewards: [], rewardApproved: age === 'adult', wedges: [], rounds: 0, nudges: true, nudgeLog: [],
          };
        });
        const doc: FamilyDoc = {
          id: newId(), version: 1, safetyAccepted: true, familyName, members, journal: [], plus: false,
          customCards: [], favourites: [], hidden: [], createdAt: now.toISOString(), consentAt: now.toISOString(),
        };
        await store.createFamily(doc);
        const token = newDeviceToken();
        await store.addDevice(hashToken(token), doc.id, members[meIndex].id);
        return ok({ token, view: viewFor(doc, members[meIndex].id, today, [members[meIndex].id]) });
      }

      case 'POST /api/join': {
        if ((await store.failedJoins(req.ip)) >= MAX_FAILED_JOINS) return err(429, 'Too many tries. Please wait 15 minutes and try again.');
        const code = normaliseCode(req.body?.code);
        const used = code ? await store.useJoinCode(code) : null;
        const fam = used && (await store.getFamily(used.familyId));
        if (!used || !fam || !fam.doc.members.some((m) => m.id === used.memberId)) {
          await store.recordFailedJoin(req.ip);
          return err(404, 'That code didn’t work. It may have been used already or expired – ask a parent for a new one.');
        }
        const token = newDeviceToken();
        const tokenHash = hashToken(token);
        await store.addDevice(tokenHash, used.familyId, used.memberId);
        // One phone per person: joining on a new phone disconnects the old one.
        await store.removeDevices(used.familyId, used.memberId, tokenHash);
        return ok({ token, view: viewFor(fam.doc, used.memberId, today, await store.connectedMembers(used.familyId)) });
      }

      case 'GET /api/state': {
        const a = await authed(req, deps);
        if (!a) return err(401, 'This phone is no longer connected to a family.', 'signed_out');
        return ok({ view: viewFor(a.doc, a.device.memberId, today, await store.connectedMembers(a.doc.id)) });
      }

      case 'POST /api/action': {
        const action = req.body?.action as Action;
        if (!action || typeof action.type !== 'string') return err(400, 'Missing action.');
        for (let attempt = 0; attempt < 4; attempt++) {
          const a = await authed(req, deps);
          if (!a) return err(401, 'This phone is no longer connected to a family.', 'signed_out');
          const { doc, notify } = apply(a.doc, a.device.memberId, action, { today, newId });
          if (doc === a.doc) return ok({ view: viewFor(doc, a.device.memberId, today, await store.connectedMembers(doc.id)) });
          if (await store.saveFamily(doc, a.version)) {
            if (action.type === 'removeMember') await store.removeDevices(doc.id, action.memberId);
            await Promise.all(notify.map((n) => deps.sendPush(doc.id, n).catch(() => undefined)));
            return ok({ view: viewFor(doc, a.device.memberId, today, await store.connectedMembers(doc.id)) });
          }
          // Someone else saved at the same moment – reload and try again.
        }
        return err(409, 'Lots happening at once – please try again.');
      }

      case 'POST /api/invite': {
        const a = await authed(req, deps);
        if (!a) return err(401, 'This phone is no longer connected to a family.', 'signed_out');
        const me = a.doc.members.find((m) => m.id === a.device.memberId)!;
        if (!me.isParent) return err(403, 'Only a parent can create join codes.');
        const target = a.doc.members.find((m) => m.id === req.body?.memberId);
        if (!target) return err(404, 'Family member not found.');
        const code = newJoinCode();
        const expiresAt = new Date(now.getTime() + JOIN_CODE_DAYS * 86400000);
        await store.addJoinCode(code, a.doc.id, target.id, expiresAt);
        return ok({ code, expiresAt: expiresAt.toISOString() });
      }

      case 'POST /api/push': {
        const a = await authed(req, deps);
        if (!a) return err(401, 'This phone is no longer connected to a family.', 'signed_out');
        const sub = req.body?.subscription as PushSubscriptionJSON | null;
        const valid = sub && typeof sub.endpoint === 'string' && sub.endpoint.startsWith('https://') && sub.keys?.p256dh && sub.keys?.auth;
        await store.setPush(a.tokenHash, valid ? { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } } : null);
        return ok({ saved: !!valid });
      }

      case 'GET /api/cron-nudges':
      case 'POST /api/cron-nudges': {
        if (!deps.cronSecret || req.headers.authorization !== `Bearer ${deps.cronSecret}`) return err(401, 'Not allowed.');
        let sent = 0;
        for (const id of await store.familyIds()) {
          const fam = await store.getFamily(id);
          for (const m of fam?.doc.members ?? []) {
            if (!m.nudges || !isNudgeDay(m.id, today)) continue;
            // The lock screen never shows the prompt itself – only the person sees it, inside the app.
            await deps.sendPush(id, { memberId: m.id, title: '💭 Something just for you', body: 'A little moment for yourself – open FamJam.', url: '/' }).catch(() => undefined);
            sent++;
          }
        }
        return ok({ sent });
      }

      default:
        return err(404, 'Not found.');
    }
  } catch (e) {
    if (e instanceof ActionError) return err(e.status, e.message);
    console.error(e);
    return err(500, 'Something went wrong on our side. Please try again.');
  }
}
