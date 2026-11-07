export type WedgeId = 'self' | 'words' | 'together' | 'wayback' | 'play';
export type AgeGroup = 'child' | 'teen' | 'adult';
export type CardType = 'task' | 'letter';
export type Feeling = 'loved' | 'nice' | 'ok';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  age: AgeGroup;
  isParent?: boolean; // parents approve children's rewards, give bonus rolls and manage the family
  activities: string[];
  rewards: string[]; // one or more rewards; they pick one to claim when the circle is complete
  rewardApproved: boolean; // parent approval – only needed for children and teens
  wedges: WedgeId[]; // wedges earned this round
  rounds: number; // completed rounds
  lastRollDate?: string; // YYYY-MM-DD
  currentCard?: DrawnCard;
  nudges: boolean; // personal self-care prompts on/off
  nudgeLog: NudgeLogEntry[]; // prompts this person has read
}

export interface Card {
  id: string;
  tier: 'free' | 'plus';
  type: CardType;
  child: string;
  adult: string;
  ages?: AgeGroup[]; // who the idea suits (missing = everyone)
  cost?: 'free' | 'low' | 'outing';
  place?: 'home' | 'outside' | 'out';
  time?: 'quick' | 'long';
  withId?: string; // custom activities: a specific household member to do it with
}

/** An activity the family added themselves. Always free, drawn like any other card. */
export interface CustomCard {
  id: string;
  wedge: WedgeId;
  text: string; // e.g. "Go fishing at the dam"
  ages: AgeGroup[];
  withId?: string; // do it with this person (otherwise anyone in the household)
}

export interface NudgeLogEntry { date: string; id: string; note?: string }

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
  privateLetter?: boolean; // a letter was written but this phone may not read it
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
  customCards: CustomCard[];
  favourites: string[]; // card ids starred as "our list"
  hidden: string[]; // card ids marked "not for us"
}
