import type { Feeling, GameState, JournalEntry, Member } from './types';
import { today, uid } from './store';

export const FEELINGS: { id: Feeling; icon: string; label: string }[] = [
  { id: 'loved', icon: '😍', label: 'Loved it' },
  { id: 'nice', icon: '🙂', label: 'It was nice' },
  { id: 'ok', icon: '😐', label: 'It was OK' },
];

const mapMember = (s: GameState, id: string, f: (m: Member) => Member): GameState =>
  ({ ...s, members: s.members.map((m) => (m.id === id ? f(m) : m)) });

/** Player says they've done it: the card now waits for the other person. */
export const handOver = (s: GameState, playerId: string, letter?: string): GameState =>
  mapMember(s, playerId, (m) => m.currentCard
    ? { ...m, currentCard: { ...m.currentCard, status: 'awaiting', letter: letter?.trim() || m.currentCard.letter } }
    : m);

/** The other person confirms: the player earns the wedge and the reply goes in the journal. */
export function confirmCard(s: GameState, playerId: string, answer: { feeling: Feeling; reply?: string }): GameState {
  const player = s.members.find((m) => m.id === playerId);
  const card = player?.currentCard;
  if (!player || !card || card.status !== 'awaiting') return s;
  const entry: JournalEntry = {
    id: uid(), cardId: card.cardId, memberId: player.id, wedge: card.wedge, cardText: card.text, date: today(),
    confirmedBy: card.withMemberId, feeling: answer.feeling, reply: answer.reply?.trim() || undefined, letter: card.letter,
  };
  const next = mapMember(s, playerId, (m) => ({
    ...m,
    wedges: m.wedges.includes(card.wedge) ? m.wedges : [...m.wedges, card.wedge],
    currentCard: undefined,
  }));
  return { ...next, journal: [...next.journal, entry] };
}

/** "Not yet": the card goes back to the player to try again. No wedge, no penalty. */
export const sendBack = (s: GameState, playerId: string): GameState =>
  mapMember(s, playerId, (m) => m.currentCard ? { ...m, currentCard: { ...m.currentCard, status: 'todo' } } : m);

/** Cards waiting for this person to confirm. */
export const waitingFor = (s: GameState, confirmerId: string) =>
  s.members.filter((m) => m.currentCard?.status === 'awaiting' && m.currentCard.withMemberId === confirmerId);
