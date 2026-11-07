import type { WedgeId } from './types';

export interface WedgeInfo {
  id: WedgeId;
  name: string;
  tagline: string;
  color: string;
  icon: string;
}

export const WEDGES: WedgeInfo[] = [
  { id: 'self', name: 'Finding Myself', tagline: 'Reconnecting with yourself', color: '#8e7dbe', icon: '🌱' },
  { id: 'words', name: 'Finding Words', tagline: 'When talking is too hard', color: '#4fa3a5', icon: '✉️' },
  { id: 'together', name: 'Finding Each Other', tagline: 'Rebuilding everyday connection', color: '#f4a259', icon: '🤝' },
  { id: 'wayback', name: 'Coming Back Together', tagline: 'Repair after rupture', color: '#e26d5c', icon: '🧭' },
  { id: 'play', name: 'Play', tagline: 'Building something together', color: '#7cb518', icon: '🎈' },
];

export const wedgeById = (id: WedgeId) => WEDGES.find((w) => w.id === id)!;
