import { createHash, randomBytes, randomInt } from 'node:crypto';

/** A long random secret for one phone. Only its hash is stored. */
export const newDeviceToken = () => randomBytes(32).toString('base64url');
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

// No 0/O/1/I/L to avoid mix-ups when reading a code aloud.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** A short join code such as "K7Q-4MD" (31^6 ≈ 887 million combinations). */
export const newJoinCode = () => {
  const s = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `${s.slice(0, 3)}-${s.slice(3)}`;
};
export const normaliseCode = (c: string) => {
  const s = (c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 6 ? `${s.slice(0, 3)}-${s.slice(3)}` : '';
};
export const newId = () => randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').toLowerCase();

export const JOIN_CODE_DAYS = 7;
export const MAX_FAILED_JOINS = 10; // per IP per 15 minutes
