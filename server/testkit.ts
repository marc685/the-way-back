import { PGlite } from '@electric-sql/pglite';
import { Store } from './store';
import { handle, type Deps, type Req } from './handlers';
import type { Notify } from './types';

/** A whole FamJam server with an in-memory Postgres – for tests and the local multi-phone walkthrough. */
export function makeTestServer(opts: { now?: () => Date } = {}) {
  const db = new PGlite();
  const store = new Store(async (text, params) => (await db.query(text, params as any[])).rows as any[]);
  const sent: (Notify & { familyId: string })[] = [];
  const deps: Deps = {
    store, now: opts.now, cronSecret: 'test-cron-secret', vapidPublicKey: 'test-vapid',
    sendPush: async (familyId, n) => { sent.push({ ...n, familyId }); },
  };
  const call = (method: string, path: string, body?: unknown, token?: string, ip = '1.1.1.1') =>
    handle({ method, path, body, ip, headers: { authorization: token ? `Bearer ${token}` : undefined } } as Req, deps);
  return { store, deps, sent, call };
}
