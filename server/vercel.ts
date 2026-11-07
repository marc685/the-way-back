import { neon } from '@neondatabase/serverless';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Store } from './store';
import { handle, type Deps } from './handlers';
import { makeSendPush } from './push';

let deps: Deps | null = null;
function getDeps(): Deps {
  if (deps) return deps;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL is not set – add a Neon Postgres database in Vercel → Storage.');
  const q: any = neon(url);
  const store = new Store((text, params) => (typeof q.query === 'function' ? q.query(text, params ?? []) : q(text, params ?? [])));
  deps = {
    store,
    sendPush: makeSendPush(store, {
      VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY, VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    }),
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    cronSecret: process.env.CRON_SECRET,
  };
  return deps;
}

/** Vercel Node.js function: every /api file uses this same handler. */
export default async function vercelHandler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  try {
    const path = (req.url ?? '').split('?')[0].replace(/\/$/, '');
    const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const out = await handle({ method: req.method ?? 'GET', path, headers: req.headers as Record<string, string>, body, ip }, getDeps());
    res.statusCode = out.status;
    res.end(JSON.stringify(out.body));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'The server is not set up yet.' }));
  }
}
