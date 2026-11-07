export type WedgeId = 'self' | 'words' | 'together' | 'wayback' | 'play';
export type AgeGroup = 'child' | 'teen' | 'adult';
export type CardType = 'task' | 'letter';
export type Feeling = 'loved' | 'nice' | 'ok';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  age: AgeGroup;
  activities: string[];
  rewards: string[]; // one or more rewards; they pick one to claim when the circle is complete
  rewardApproved: boolean; // parent approval – only needed for children and teens
  wedges: WedgeId[]; // wedges earned this round
  rounds: number; // completed rounds
  lastRollDate?: string; // YYYY-MM-DD
  currentCard?: DrawnCard;
}

export interface Card {
  id: string;
  tier: 'free' | 'plus';
  type: CardType;
  child: string;
  adult: string;
}

export interface DrawnCard {
  cardId: string;
  wedge: WedgeId;
  type: CardType;
  text: string;
  withMemberId: string; // the household member who confirms it
  status: 'todo' | 'awaiting'; // awaiting = handed over, waiting for the other person to confirm
  letter?: string; // for letter cards: what the player wrote
}

export interface JournalEntry {
  id: string;
  cardId: string;
  memberId: string; // who did the card
  wedge: WedgeId;
  cardText: string;
  date: string;
  confirmedBy?: string; // member id of the person who confirmed
  feeling?: Feeling;
  reply?: string; // message back from the person who confirmed
  letter?: string;
  // Older entries (before confirmation existed) may carry these:
  note?: string;
}

export interface GameState {
  version: 1;
  safetyAccepted: boolean;
  familyName: string;
  members: Member[];
  journal: JournalEntry[];
  plus: boolean;
}
