import { useEffect, useState } from 'react';
import type { GameState } from './types';

const KEY = 'kin-circle-state-v1';

export const emptyState = (): GameState => ({
  version: 1, safetyAccepted: false, familyName: '', members: [], journal: [], plus: false,
});

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.version === 1) return { ...emptyState(), ...s };
    }
  } catch { /* storage unavailable – start fresh */ }
  return emptyState();
}

export function saveState(s: GameState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function useGameState() {
  const [state, setState] = useState<GameState>(loadState);
  useEffect(() => saveState(state), [state]);
  return [state, setState] as const;
}

export const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
export const uid = () => Math.random().toString(36).slice(2, 10);
