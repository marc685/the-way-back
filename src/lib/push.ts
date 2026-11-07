import { api } from './api';

export type PushSupport = 'ready' | 'needs-home-screen' | 'unsupported';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export function pushSupport(): PushSupport {
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'ready';
  // iPhones only allow notifications once FamJam is added to the Home Screen (iOS 16.4+).
  if (isIos() && !isStandalone()) return 'needs-home-screen';
  return 'unsupported';
}

const toKey = (base64: string) => {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Ask permission and register this phone for notifications. Returns true when it worked. */
export async function enablePush(): Promise<boolean> {
  const { vapidPublicKey } = await api.config();
  if (!vapidPublicKey) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(vapidPublicKey) }));
  const r = await api.savePush(sub.toJSON() as PushSubscriptionJSON);
  return r.saved;
}

export async function pushEnabled(): Promise<boolean> {
  if (pushSupport() !== 'ready' || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  return !!(await reg?.pushManager.getSubscription());
}
