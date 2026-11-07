import type { Card, WedgeId } from './types';
import self from '../data/decks/self.json';
import words from '../data/decks/words.json';
import together from '../data/decks/together.json';
import wayback from '../data/decks/wayback.json';
import play from '../data/decks/play.json';

export const DECKS: Record<WedgeId, Card[]> = {
  self: self as Card[],
  words: words as Card[],
  together: together as Card[],
  wayback: wayback as Card[],
  play: play as Card[],
};
