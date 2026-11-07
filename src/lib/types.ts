export type WedgeId = 'self' | 'words' | 'together' | 'wayback' | 'play';
export type AgeGroup = 'child' | 'teen' | 'adult';
export type CardType = 'task' | 'letter' | 'repair';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  age: AgeGroup;
  activities: string[];
  extended: string[]; // extended family to connect with
  friends: string[]; // family friends to invite over
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
  withMemberId?: string;
}

export interface JournalEntry {
  id: string;
  cardId: string;
  memberId: string;
  wedge: WedgeId;
  cardText: string;
  date: string;
  note?: string;
  letter?: { to: string; body: string; deliver: boolean };
  repair?: { happened: string; felt: string; step: string };
}

export interface GameState {
  version: 1;
  safetyAccepted: boolean;
  familyName: string;
  members: Member[];
  journal: JournalEntry[];
  plus: boolean;
}
