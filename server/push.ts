import webpush from 'web-push';
import type { Store } from './store';
import type { Notify } from './types';

/** Sends notifications with Web Push. Does nothing until the VAPID keys are set in Vercel. */
export function makeSendPush(store: Store, env: { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string; VAPID_SUBJECT?: string }) {
  const enabled = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  if (enabled) webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:hello@famjam.app', env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  return async (familyId: string, n: Notify) => {
    if (!enabled) return;
    for (const t of await store.pushTargets(familyId, n.memberId)) {
      try {
        await webpush.sendNotification(t.push, JSON.stringify({ title: n.title, body: n.body, url: n.url ?? '/' }), { TTL: 60 * 60 * 24 });
      } catch (e: any) {
        // The phone unsubscribed or the app was removed – forget that subscription.
        if (e?.statusCode === 404 || e?.statusCode === 410) await store.setPush(t.tokenHash, null);
      }
    }
  };
}
