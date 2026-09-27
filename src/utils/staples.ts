import type { Staple, StapleCategory, StapleFlag, StapleStatus, StapleStock, StockNoteItem } from '@/types/kitchen.types';

// "Usuals": things the household buys again and again. Each one learns how
// long a purchase lasts and predicts when it will run out. "We're low / out"
// taps and receipts correct it. When someone says how many they have ("20
// rolls, one lasts 2 days") the usual switches to counted stock: units left
// come from that count and the usage rate, which learns from later counts.

const DAY_MS = 86_400_000;
const MAX_PURCHASES = 8;
const SOON_DAYS = 3;
const SEEN_FRESH_DAYS = 2;

type StarterStaple = { name: string; category: StapleCategory; intervalDays: number; aliases?: string[] };

// Starting guesses for a family of four with young children. They adjust
// themselves after a couple of purchases, and any can be removed.
export const STARTER_STAPLES: StarterStaple[] = [
  { name: 'Milk', category: 'food', intervalDays: 3, aliases: ['semi skimmed', 'whole milk', 'skimmed'] },
  { name: 'Bread', category: 'food', intervalDays: 4, aliases: ['loaf', 'sourdough', 'wholemeal', 'bloomer'] },
  { name: 'Eggs', category: 'food', intervalDays: 7, aliases: ['free range eggs'] },
  { name: 'Butter', category: 'food', intervalDays: 14, aliases: ['spread', 'lurpak', 'anchor'] },
  { name: 'Cheese', category: 'food', intervalDays: 10, aliases: ['cheddar', 'mozzarella'] },
  { name: 'Yoghurts', category: 'food', intervalDays: 5, aliases: ['yogurt', 'yoghurt', 'petits filous', 'frubes'] },
  { name: 'Yakult', category: 'food', intervalDays: 7 },
  { name: 'Fruit', category: 'food', intervalDays: 5, aliases: ['bananas', 'apples', 'satsumas', 'grapes', 'berries'] },
  { name: 'Cereal', category: 'food', intervalDays: 10, aliases: ['weetabix', 'cheerios', 'porridge oats', 'oats'] },
  { name: 'Pasta', category: 'food', intervalDays: 14, aliases: ['spaghetti', 'penne', 'fusilli'] },
  { name: 'Rice', category: 'food', intervalDays: 21, aliases: ['basmati'] },
  { name: 'Cooking oil', category: 'food', intervalDays: 30, aliases: ['olive oil', 'vegetable oil', 'sunflower oil'] },
  { name: 'Tea bags', category: 'food', intervalDays: 21, aliases: ['tea', 'pg tips', 'yorkshire tea'] },
  { name: 'Coffee', category: 'food', intervalDays: 21 },
  { name: 'Toilet roll', category: 'household', intervalDays: 14, aliases: ['toilet tissue', 'loo roll', 'andrex', 'cushelle', 'toilet paper'] },
  { name: 'Kitchen roll', category: 'household', intervalDays: 14, aliases: ['kitchen towel', 'plenty', 'regina'] },
  { name: 'Tissues', category: 'household', intervalDays: 14, aliases: ['kleenex', 'facial tissues'] },
  { name: 'Washing-up liquid', category: 'household', intervalDays: 30, aliases: ['fairy liquid', 'washing up liquid', 'dish soap'] },
  { name: 'Dishwasher tablets', category: 'household', intervalDays: 30, aliases: ['finish', 'dishwasher tabs'] },
  { name: 'Laundry detergent', category: 'household', intervalDays: 30, aliases: ['washing liquid', 'washing powder', 'persil', 'ariel', 'bold', 'washing pods'] },
  { name: 'Bin bags', category: 'household', intervalDays: 30, aliases: ['bin liners', 'refuse sacks'] },
  { name: 'Hand soap', category: 'toiletries', intervalDays: 30, aliases: ['handwash', 'hand wash', 'carex'] },
  { name: 'Toothpaste', category: 'toiletries', intervalDays: 30, aliases: ['colgate', 'aquafresh', 'sensodyne'] },
  { name: 'Shampoo', category: 'toiletries', intervalDays: 30 },
  { name: 'Shower gel', category: 'toiletries', intervalDays: 30, aliases: ['body wash'] },
  { name: 'Baby wipes', category: 'kids', intervalDays: 14, aliases: ['wipes', 'water wipes', 'pampers wipes'] },
  { name: "Kids' snacks", category: 'kids', intervalDays: 7, aliases: ['snacks', 'crackers', 'breadsticks', 'raisins'] },
];

const CATEGORY_HINTS: Array<[RegExp, StapleCategory]> = [
  [/wipe|nappy|nappies|pull.?ups|calpol|kids|children|baby/i, 'kids'],
  [/toilet|kitchen roll|tissue|bin bag|liner|washing|laundry|detergent|dishwasher|bleach|cleaner|spray|sponge|foil|cling|bag|battery|batteries|bulb|candle/i, 'household'],
  [/soap|shampoo|conditioner|shower|toothpaste|toothbrush|deodorant|razor|sanitary|tampon|cotton|plaster|moisturiser|lotion/i, 'toiletries'],
];

export const guessStapleCategory = (name: string): StapleCategory =>
  CATEGORY_HINTS.find(([pattern]) => pattern.test(name))?.[1] ?? 'food';

export const stapleIdFor = (name: string) =>
  `staple-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'}`;

export const createStaple = (
  name: string,
  options: Partial<Pick<Staple, 'category' | 'intervalDays' | 'aliases'>> = {},
  now: Date = new Date()
): Staple => ({
  id: stapleIdFor(name),
  name: name.trim(),
  aliases: options.aliases ?? [],
  category: options.category ?? guessStapleCategory(name),
  intervalDays: options.intervalDays ?? 14,
  purchases: [],
  flag: 'ok',
  updatedAt: now.toISOString(),
});

export const createStarterStaples = (now: Date = new Date()): Staple[] =>
  STARTER_STAPLES.map((starter) => createStaple(starter.name, starter, now));

const daysBetween = (fromIso: string, to: Date) => (to.getTime() - new Date(fromIso).getTime()) / DAY_MS;

// How long a purchase lasts: the median gap between recent purchases. With a
// single gap, meet the previous estimate halfway so one odd week doesn't swing it.
export const learnInterval = (purchases: string[], fallback: number): number => {
  const times = purchases.map((p) => new Date(p).getTime()).filter((t) => !Number.isNaN(t)).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i += 1) {
    const gap = (times[i] - times[i - 1]) / DAY_MS;
    if (gap >= 1) gaps.push(gap);
  }
  const clamp = (days: number) => Math.min(180, Math.max(1, Math.round(days)));
  if (gaps.length === 0) return clamp(fallback);
  if (gaps.length === 1) return clamp((fallback + gaps[0]) / 2);
  const recent = gaps.slice(-5).sort((a, b) => a - b);
  const mid = Math.floor(recent.length / 2);
  const median = recent.length % 2 ? recent[mid] : (recent[mid - 1] + recent[mid]) / 2;
  return clamp(median);
};

const round1 = (value: number) => Math.round(value * 10) / 10;
export const clampDaysPerUnit = (days: number) => Math.min(365, Math.max(0.1, round1(days)));
const MIN_LEARN_DAYS = 2;

// Units left right now: last count, plus what was bought since, minus usage.
export const stockUnitsLeft = (stock: StapleStock, today: Date = new Date()) => {
  const used = Math.max(0, daysBetween(stock.countedAt, today)) / stock.daysPerUnit;
  return Math.max(0, stock.countedQuantity + stock.addedSince - used);
};

// A real count (or running out) shows how fast it actually went. Meet the old
// rate halfway so one odd week doesn't swing it. Returns null when there is
// too little to learn from.
const observedRate = (stock: StapleStock, unitsNow: number, at: Date): number | null => {
  const elapsed = daysBetween(stock.countedAt, at);
  const used = stock.countedQuantity + stock.addedSince - unitsNow;
  if (elapsed < MIN_LEARN_DAYS || used < 0.5) return null;
  return clampDaysPerUnit((stock.daysPerUnit + elapsed / used) / 2);
};

export interface StockCount {
  quantity: number;
  unit?: string;
  unitContents?: string | null;
  daysPerUnit?: number | null;
  rateSource?: 'stated' | 'estimated';
  assumption?: string | null;
}

export const DEFAULT_DAYS_PER_UNIT = 7;

// Someone counted: "we've got 20". A rate they state wins; otherwise a
// previous count teaches the rate, and a fresh estimate is the fallback.
export const setStockCount = (staple: Staple, count: StockCount, at: Date = new Date()): Staple => {
  const previous = staple.stock;
  const quantity = Math.max(0, round1(count.quantity));
  const learned = previous && count.rateSource !== 'stated' ? observedRate(previous, quantity, at) : null;
  const daysPerUnit = clampDaysPerUnit(
    learned ?? (count.rateSource === 'stated' ? count.daysPerUnit : null) ?? previous?.daysPerUnit ?? count.daysPerUnit ?? DEFAULT_DAYS_PER_UNIT
  );
  const rateSource: StapleStock['rateSource'] = learned
    ? 'learned'
    : count.rateSource === 'stated'
      ? 'stated'
      : previous?.rateSource ?? count.rateSource ?? 'estimated';
  const iso = at.toISOString();
  return {
    ...staple,
    flag: quantity > 0 ? 'ok' : 'out',
    flaggedAt: quantity > 0 ? undefined : iso,
    stock: {
      unit: (count.unit || previous?.unit || 'item').trim().toLowerCase(),
      ...(count.unitContents ?? previous?.unitContents ? { unitContents: (count.unitContents ?? previous?.unitContents)! } : {}),
      daysPerUnit,
      rateSource,
      ...(learned
        ? { assumption: `Learned from your counts: one ${count.unit || previous?.unit || 'item'} lasts about ${daysPerUnit} days.` }
        : count.assumption ?? previous?.assumption ? { assumption: (count.assumption ?? previous?.assumption)! } : {}),
      countedQuantity: quantity,
      countedAt: iso,
      addedSince: 0,
      // Until a purchase says otherwise, assume a shop restocks about what was counted first.
      ...(previous?.lastBoughtUnits ?? (!previous && quantity >= 1 ? quantity : undefined)
        ? { lastBoughtUnits: previous?.lastBoughtUnits ?? quantity }
        : {}),
    },
    updatedAt: iso,
  };
};

export const stopCounting = (staple: Staple): Staple => {
  const { stock: _stock, ...rest } = staple;
  return { ...rest, updatedAt: new Date().toISOString() };
};

const addStock = (stock: StapleStock, units: number, at: Date): StapleStock => {
  // Bought before the last count (an old receipt scanned later): the count already includes it.
  if (at.getTime() < new Date(stock.countedAt).getTime()) return stock;
  // Ran out a while ago? Start afresh rather than charging the empty days as usage.
  if (stockUnitsLeft(stock, at) <= 0) {
    return { ...stock, countedQuantity: units, countedAt: at.toISOString(), addedSince: 0, lastBoughtUnits: units };
  }
  return { ...stock, addedSince: round1(stock.addedSince + units), lastBoughtUnits: units };
};

export const recordPurchase = (staple: Staple, at: Date = new Date(), units?: number): Staple => {
  const iso = at.toISOString();
  const sameDay = staple.purchases.some((p) => p.slice(0, 10) === iso.slice(0, 10));
  const purchases = sameDay ? staple.purchases : [...staple.purchases, iso].slice(-MAX_PURCHASES);
  const addUnits = units ?? staple.stock?.lastBoughtUnits ?? 1;
  return {
    ...staple,
    ...(staple.stock ? { stock: addStock(staple.stock, Math.max(0, addUnits), at) } : {}),
    purchases,
    intervalDays: sameDay ? staple.intervalDays : learnInterval(purchases, staple.intervalDays),
    flag: 'ok',
    flaggedAt: undefined,
    onListAt: undefined,
    updatedAt: iso,
  };
};

export const flagStaple = (staple: Staple, flag: StapleFlag, at: Date = new Date()): Staple => {
  // Running out of counted stock is a count of zero, and shows the real rate.
  if (flag === 'out' && staple.stock) {
    return { ...setStockCount(staple, { quantity: 0 }, at), flag: 'out', flaggedAt: at.toISOString() };
  }
  return {
    ...staple,
    flag,
    flaggedAt: flag === 'ok' ? undefined : at.toISOString(),
    updatedAt: at.toISOString(),
  };
};

export const pluralUnit = (unit: string, count: number) => {
  if (Math.abs(count - 1) < 0.05) return unit;
  if (/(loaf|half|knife)$/.test(unit)) return `${unit.slice(0, -1)}ves`;
  if (/(s|x|ch|sh)$/.test(unit)) return `${unit}es`;
  if (/[^aeiou]y$/.test(unit)) return `${unit.slice(0, -1)}ies`;
  return `${unit}s`;
};

const formatUnits = (units: number) => (units >= 10 || Number.isInteger(units) ? String(Math.round(units)) : String(round1(units)));

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
// Local calendar date: a UTC date is a day early for the first hour of a BST day.
const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const stockStatus = (stock: StapleStock, today: Date): StapleStatus => {
  const unitsLeft = stockUnitsLeft(stock, today);
  // Rounded, not floored: a count made a few seconds ago still reads as the full 40 days.
  const daysLeft = Math.round(unitsLeft * stock.daysPerUnit);
  // The date comes from the exact time left, not the rounded day count.
  const runsOutOn = ymd(addDays(today, unitsLeft * stock.daysPerUnit));
  if (unitsLeft < 0.05) return { state: 'due', label: 'Probably run out', daysLeft: 0, unitsLeft: 0, runsOutOn: ymd(today) };
  // A full single tub just counted is "1 tub left", not "last tub going".
  const amount = unitsLeft < 0.95
    ? `Last ${stock.unit} going`
    : `About ${formatUnits(unitsLeft)} ${pluralUnit(stock.unit, Math.round(unitsLeft))} left`;
  const time = daysLeft < 1 ? 'today or tomorrow' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  return {
    state: daysLeft <= SOON_DAYS ? 'soon' : 'ok',
    label: `${amount} · ${time}`,
    daysLeft,
    unitsLeft: round1(unitsLeft),
    runsOutOn,
  };
};

export const stapleStatus = (staple: Staple, today: Date = new Date()): StapleStatus => {
  if (staple.flag === 'out') return { state: 'out', label: 'Out', daysLeft: 0 };
  if (staple.flag === 'low') return { state: 'low', label: 'Running low', daysLeft: null };
  if (staple.stock) return stockStatus(staple.stock, today);

  const lastBought = staple.purchases[staple.purchases.length - 1];
  const seenRecently = staple.seenAt
    && daysBetween(staple.seenAt, today) <= SEEN_FRESH_DAYS
    && (!lastBought || staple.seenAt >= lastBought);

  if (!lastBought) {
    return seenRecently
      ? { state: 'ok', label: 'Seen in the fridge', daysLeft: null }
      : { state: 'untracked', label: 'Tap “Bought” next time', daysLeft: null };
  }

  const daysLeft = Math.round(staple.intervalDays - daysBetween(lastBought, today));
  if (daysLeft <= 0) {
    return seenRecently
      ? { state: 'ok', label: 'Seen in the fridge', daysLeft }
      : { state: 'due', label: 'Probably running out', daysLeft };
  }
  if (daysLeft <= SOON_DAYS) {
    return { state: 'soon', label: `About ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`, daysLeft };
  }
  return { state: 'ok', label: `About ${daysLeft} days left`, daysLeft };
};

export const needsBuying = (status: StapleStatus) => status.state === 'out' || status.state === 'low' || status.state === 'due';

// Usuals worth buying on a shop within the next `withinDays` days.
export const stockUpList = (staples: Staple[], today: Date = new Date(), withinDays = 7) =>
  staples
    .map((staple) => ({ staple, status: stapleStatus(staple, today) }))
    .filter(({ status }) => needsBuying(status) || (status.daysLeft !== null && status.daysLeft <= withinDays && status.state !== 'untracked'))
    .sort((a, b) => (a.status.daysLeft ?? -1) - (b.status.daysLeft ?? -1));

const normalise = (text: string) =>
  ` ${text.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;

const singular = (word: string) => word.replace(/(ies)$/, 'y').replace(/(?<!s)s$/, '');

const variants = (text: string) => {
  const base = normalise(text).trim();
  if (!base) return [];
  const single = base.split(' ').map(singular).join(' ');
  return Array.from(new Set([base, single]));
};

// Best usual for a free-text name ("loo roll", "ANDREX 9PK", "eggs").
export const matchStaple = (text: string, staples: Staple[]): Staple | null => {
  const haystacks = variants(text).map((v) => ` ${v} `);
  if (haystacks.length === 0) return null;
  let best: { staple: Staple; score: number } | null = null;

  for (const staple of staples) {
    for (const name of [staple.name, ...staple.aliases]) {
      for (const needle of variants(name)) {
        for (const hay of haystacks) {
          let score = 0;
          if (hay.trim() === needle) score = 100 + needle.length;
          else if (hay.includes(` ${needle} `)) score = 50 + needle.length;
          else if (needle.length >= 4 && ` ${needle} `.includes(hay)) score = 20 + hay.length;
          if (score > (best?.score ?? 0)) best = { staple, score };
        }
      }
    }
  }
  return best?.staple ?? null;
};

const OUT_WORDS = /\b(out of|run out of|ran out of|run out|ran out|no more|none left|finished|used up|all gone|gone)\b/i;
const FILLER = /\b(we re|were|we are|we have|weve|we|i m|im|i|us|our|is|are|nearly|almost|running|low on|low|out of|run out of|ran out of|run out|ran out|no more|none left|finished|used up|all gone|gone|need|needs|more|get|buy|some|any|the|a|an|of|on|please|also)\b/gi;

export interface LowNote {
  name: string;
  flag: Exclude<StapleFlag, 'ok'>;
}

// "out of tissues, low on eggs and milk" -> [{tissues, out}, {eggs, low}, {milk, low}]
export const parseLowNote = (text: string): LowNote[] => {
  const notes: LowNote[] = [];
  const clauses = text.split(/\r?\n|[;,.]|\s+(?:and|&|plus)\s+(?=(?:we|out|low|no|need|running|nearly|almost)\b)/i);
  for (const clause of clauses) {
    const flag: LowNote['flag'] = OUT_WORDS.test(clause) ? 'out' : 'low';
    const items = clause.split(/\s+(?:and|&|plus)\s+/i);
    for (const item of items) {
      const cleaned = item.replace(/[’']/g, '').replace(FILLER, ' ').replace(/[^a-zA-Z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length < 2) continue;
      notes.push({ name: cleaned.charAt(0).toUpperCase() + cleaned.slice(1), flag });
    }
  }
  const seen = new Set<string>();
  return notes.filter((note) => {
    const key = note.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export interface StockNoteResult {
  staples: Staple[];
  changed: Staple[]; // the usuals this note touched, after the change
  forTopUps: Staple[]; // said to be low or out: these go on the shopping list
}

// Apply a reviewed stock note: counts set stock, "low"/"out" flag it.
export const applyStockNote = (staples: Staple[], items: StockNoteItem[], at: Date = new Date()): StockNoteResult => {
  let all = [...staples];
  const changed = new Map<string, Staple>();
  const forTopUps = new Map<string, Staple>();

  for (const item of items) {
    const existing = (item.usual && all.find((s) => s.name.toLowerCase() === item.usual!.toLowerCase()))
      || matchStaple(item.name, all);
    let staple = existing ?? createStaple(item.name, { category: item.category }, at);

    if (item.quantity !== null && (item.status === 'count' || item.quantity > 0)) {
      staple = setStockCount(staple, {
        quantity: item.quantity,
        unit: item.unit,
        unitContents: item.unitContents,
        daysPerUnit: item.daysPerUnit,
        rateSource: item.rateSource,
        assumption: item.assumption,
      }, at);
    }
    // "We've got none left" is out, whatever the AI labelled it.
    const status = item.status === 'count' && item.quantity === 0 ? 'out' : item.status;
    if (status !== 'count') {
      staple = { ...flagStaple(staple, status, at), onListAt: at.toISOString() };
      forTopUps.set(staple.id, staple);
    }

    all = existing ? all.map((s) => (s.id === staple.id ? staple : s)) : [...all, staple];
    changed.set(staple.id, staple);
    if (forTopUps.has(staple.id)) forTopUps.set(staple.id, staple);
  }

  return { staples: all, changed: [...changed.values()], forTopUps: [...forTopUps.values()] };
};

const COUNT_WORDS = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|dozen|couple|few|half|box|boxes|pack|packs|multipack|tub|bottles?|lasts?|takes|per day|a day|a week)\b|\b(we (have|ve got|got)|weve got|got|bought|there (are|is)|theres)\b/i;

// Does the note say how many we have (worth an AI read), or is it a plain
// "low on eggs, out of milk" that can be handled instantly on the device?
export const looksLikeStockCount = (text: string) => COUNT_WORDS.test(text.replace(/[’']/g, ''));
