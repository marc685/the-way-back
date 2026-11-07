import type { Action } from '../../server/types';
import type { FamilyView } from '../../server/views';
import type { AgeGroup } from './types';

export type { Action, FamilyView };

const TOKEN_KEY = 'famjam-device';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No internet connection. Check your signal and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong.', data.code);
  return data as T;
}

export interface NewMember { name: string; avatar: string; age: AgeGroup; isParent?: boolean }

export const api = {
  config: () => request<{ vapidPublicKey: string | null }>('GET', '/api/config'),
  createFamily: (familyName: string, members: NewMember[], meIndex: number) =>
    request<{ token: string; view: FamilyView }>('POST', '/api/family', { familyName, members, meIndex, consent: true }),
  join: (code: string) => request<{ token: string; view: FamilyView }>('POST', '/api/join', { code }),
  state: () => request<{ view: FamilyView }>('GET', '/api/state'),
  act: (action: Action) => request<{ view: FamilyView }>('POST', '/api/action', { action }),
  invite: (memberId: string) => request<{ code: string; expiresAt: string }>('POST', '/api/invite', { memberId }),
  savePush: (subscription: PushSubscriptionJSON | null) => request<{ saved: boolean }>('POST', '/api/push', { subscription }),
};
