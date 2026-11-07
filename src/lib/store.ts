import { useEffect, useState } from 'react';
import type { GameState } from './types';
import { upgradeMember } from './profile';

const KEY = 'famjam-state-v1';
// Saves from before the app was renamed, read so families keep their progress.
const OLD_KEYS = ['the-way-back-state-v1', 'kin-circle-state-v1'];

export const emptyState = (): GameState => ({
  version: 1, safetyAccepted: false, familyName: '', members: [], journal: [], plus: false,
});

export function loadState(): GameState {
  try {
    const raw = [KEY, ...OLD_KEYS].map((k) => localStorage.getItem(k)).find((v) => v != null);
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.version === 1) return { ...emptyState(), ...s, members: (s.members ?? []).map(upgradeMember) };
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
