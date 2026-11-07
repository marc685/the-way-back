import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, getToken, setToken, type Action, type FamilyView } from './api';
import { todayIn } from './dates';

export const today = () => todayIn();
export const uid = () => Math.random().toString(36).slice(2, 10);

const POLL_MS = 20000;

/**
 * This phone's view of the family, kept in sync with the server.
 * Refreshes when the app is opened and every 20 seconds while it's on screen.
 */
export function useFamily() {
  const [view, setView] = useState<FamilyView | null>(null);
  const [loading, setLoading] = useState(!!getToken());
  const [signedOut, setSignedOut] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const busy = useRef(false);

  const handle = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.code === 'signed_out') {
      setToken(null);
      setView(null);
      setSignedOut(e.message);
    } else if (e instanceof ApiError && e.status === 0) {
      setOffline(true);
    }
    throw e;
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken() || busy.current) return;
    try {
      const r = await api.state();
      setView(r.view);
      setOffline(false);
    } catch (e) {
      try { handle(e); } catch { /* shown via state */ }
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    refresh();
    const t = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, POLL_MS);
    const onShow = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onShow); window.removeEventListener('focus', onShow); };
  }, [refresh]);

  /** Send one action to the server. Throws ApiError with a friendly message if it's not allowed. */
  const act = useCallback(async (action: Action) => {
    busy.current = true;
    try {
      const r = await api.act(action);
      setView(r.view);
      setOffline(false);
      return r.view;
    } catch (e) {
      return handle(e);
    } finally {
      busy.current = false;
    }
  }, [handle]);

  const signIn = useCallback((token: string, v: FamilyView) => {
    setToken(token);
    setView(v);
    setSignedOut(null);
  }, []);

  return { view, loading, signedOut, offline, act, refresh, signIn };
}

/** Small per-phone settings that never leave this phone. */
export const local = {
  get<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem(`famjam-${key}`); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(`famjam-${key}`, JSON.stringify(value)); } catch { /* ignore */ }
  },
};
