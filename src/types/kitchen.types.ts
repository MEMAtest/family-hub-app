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
  updatedAt: string;
}

export type StapleState = 'out' | 'low' | 'due' | 'soon' | 'ok' | 'untracked';

export interface StapleStatus {
  state: StapleState;
  label: string; // "Out", "About 3 days left", ...
  daysLeft: number | null;
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
