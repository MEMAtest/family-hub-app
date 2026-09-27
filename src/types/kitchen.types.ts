// Kitchen: household "usuals" (things we buy again and again), fridge photo
// checks, and the log of meals we made.

export type StapleCategory = 'food' | 'household' | 'toiletries' | 'kids';

export type StapleFlag = 'ok' | 'low' | 'out';

export interface Staple {
  id: string;
  name: string;
  aliases: string[]; // other names on receipts/labels, e.g. "loo roll", "andrex"
  category: StapleCategory;
  intervalDays: number; // current estimate of how long one purchase lasts
  purchases: string[]; // ISO dates of recent purchases, newest last (max 8)
  flag: StapleFlag; // set by "we're low / out", cleared by buying
  flaggedAt?: string;
  onListAt?: string; // when it was last put on the Top-ups list
  seenAt?: string; // last spotted in a fridge photo
  stock?: StapleStock; // set once someone says how many they have
  updatedAt: string;
}

// "We've got 20 rolls, one lasts about 2 days." Units left are worked out
// from the last real count, what has been bought since, and the usage rate,
// so nobody has to keep a running tally.
export interface StapleStock {
  unit: string; // singular, e.g. "roll", "pack"
  unitContents?: string; // e.g. "about 80 wipes"
  daysPerUnit: number; // how long one unit lasts this household
  rateSource: 'stated' | 'estimated' | 'learned';
  assumption?: string; // what the estimate rests on, in plain words
  countedQuantity: number; // units at the last real count
  countedAt: string;
  addedSince: number; // units bought since that count
  lastBoughtUnits?: number; // default for the next "Bought"
}

export type StapleState = 'out' | 'low' | 'due' | 'soon' | 'ok' | 'untracked';

export interface StapleStatus {
  state: StapleState;
  label: string; // "Out", "About 3 days left", ...
  daysLeft: number | null;
  unitsLeft?: number; // only for counted stock
  runsOutOn?: string; // YYYY-MM-DD, only for counted stock
}

// One item from a typed or spoken stock note, as read by the AI.
export interface StockNoteItem {
  name: string;
  usual: string | null; // matching tracked usual, if any
  status: 'count' | 'low' | 'out';
  quantity: number | null; // units they have now (null for a bare "low"/"out")
  unit: string;
  unitContents: string | null;
  daysPerUnit: number | null;
  rateSource: 'stated' | 'estimated';
  assumption: string | null;
  question: string | null;
  category: StapleCategory;
}

export interface FridgeItem {
  name: string;
  category: string;
  useSoon: boolean;
  note?: string;
}

export interface FridgeCheck {
  id: string;
  takenAt: string;
  summary: string;
  items: FridgeItem[];
  useFirst: string[];
  mealIdeas: string[];
  stapleIdsSeen: string[];
  updatedAt: string;
}

export interface ReceiptLine {
  name: string;
  quantity: number;
  stapleId: string | null;
}

export interface ReceiptReading {
  store: string | null;
  date: string | null; // YYYY-MM-DD
  total: number | null;
  lines: ReceiptLine[];
}
