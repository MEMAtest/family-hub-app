import {
  createStaple,
  createStarterStaples,
  flagStaple,
  guessStapleCategory,
  learnInterval,
  matchStaple,
  parseLowNote,
  recordPurchase,
  stapleStatus,
  stockUpList,
} from '../staples';

const day = (d: number) => new Date(Date.UTC(2026, 8, d, 12));

describe('learnInterval', () => {
  test('uses the fallback until there is history', () => {
    expect(learnInterval([], 14)).toBe(14);
    expect(learnInterval([day(1).toISOString()], 14)).toBe(14);
  });

  test('meets a single gap halfway, then follows the median', () => {
    expect(learnInterval([day(1).toISOString(), day(7).toISOString()], 14)).toBe(10);
    const purchases = [1, 8, 15, 29, 36].map((d) => day(d).toISOString()); // gaps 7,7,14,7
    expect(learnInterval(purchases, 14)).toBe(7);
  });

  test('ignores same-day duplicates', () => {
    expect(learnInterval([day(1).toISOString(), new Date(day(1).getTime() + 3600e3).toISOString()], 10)).toBe(10);
  });
});

describe('stapleStatus', () => {
  const milk = createStaple('Milk', { intervalDays: 4 }, day(1));

  test('is untracked until first bought', () => {
    expect(stapleStatus(milk, day(2)).state).toBe('untracked');
  });

  test('counts down from the last purchase', () => {
    const bought = recordPurchase(milk, day(1));
    expect(stapleStatus(bought, day(1))).toMatchObject({ state: 'ok', daysLeft: 4 });
    expect(stapleStatus(bought, day(3))).toMatchObject({ state: 'soon', daysLeft: 2 });
    expect(stapleStatus(bought, day(6)).state).toBe('due');
  });

  test('flags win, and buying clears them', () => {
    const low = flagStaple(recordPurchase(milk, day(1)), 'low', day(2));
    expect(stapleStatus(low, day(2)).state).toBe('low');
    expect(stapleStatus(flagStaple(low, 'out', day(2)), day(2)).state).toBe('out');
    const rebought = recordPurchase(low, day(3));
    expect(rebought.flag).toBe('ok');
    expect(['ok', 'soon']).toContain(stapleStatus(rebought, day(3)).state);
  });

  test('a recent fridge sighting holds off a "running out" guess', () => {
    const bought = recordPurchase(milk, day(1));
    const seen = { ...bought, seenAt: day(6).toISOString() };
    expect(stapleStatus(seen, day(7))).toMatchObject({ state: 'ok', label: 'Seen in the fridge' });
    expect(stapleStatus(seen, day(10)).state).toBe('due');
  });
});

describe('recordPurchase', () => {
  test('learns how long things last', () => {
    let rolls = createStaple('Toilet roll', { intervalDays: 14 }, day(1));
    for (const d of [1, 11, 21, 31]) rolls = recordPurchase(rolls, day(d));
    expect(rolls.intervalDays).toBe(10);
    expect(rolls.purchases).toHaveLength(4);
  });

  test('buying twice on the same day counts once', () => {
    const once = recordPurchase(createStaple('Eggs', {}, day(1)), day(2));
    expect(recordPurchase(once, day(2)).purchases).toHaveLength(1);
  });
});

describe('matchStaple', () => {
  const staples = createStarterStaples(day(1));

  test.each([
    ['loo roll', 'Toilet roll'],
    ['ANDREX 9PK SOFT', 'Toilet roll'],
    ['eggs', 'Eggs'],
    ['egg', 'Eggs'],
    ['Fairy Liquid Original 820ml', 'Washing-up liquid'],
    ['semi skimmed milk 4pt', 'Milk'],
    ['Tissues', 'Tissues'],
    ['kitchen towel', 'Kitchen roll'],
    ['water wipes', 'Baby wipes'],
  ])('%s -> %s', (text, expected) => {
    expect(matchStaple(text, staples)?.name).toBe(expected);
  });

  test('returns null for things that are not usuals', () => {
    expect(matchStaple('birthday candles', staples)).toBeNull();
  });
});

describe('parseLowNote', () => {
  test('splits a note and tells out from low', () => {
    expect(parseLowNote('out of tissues, low on eggs and milk')).toEqual([
      { name: 'Tissues', flag: 'out' },
      { name: 'Eggs', flag: 'low' },
      { name: 'Milk', flag: 'low' },
    ]);
  });

  test('handles speech-style phrasing', () => {
    expect(parseLowNote("we're nearly out of toilet roll and we need more yakult")).toEqual([
      { name: 'Toilet roll', flag: 'out' },
      { name: 'Yakult', flag: 'low' },
    ]);
    expect(parseLowNote('bin bags')).toEqual([{ name: 'Bin bags', flag: 'low' }]);
  });
});

describe('stockUpList', () => {
  test('lists what will run out within the week, most urgent first', () => {
    const milk = recordPurchase(createStaple('Milk', { intervalDays: 3 }, day(1)), day(1)); // due day 4
    const rice = recordPurchase(createStaple('Rice', { intervalDays: 30 }, day(1)), day(1));
    const tissues = flagStaple(createStaple('Tissues', {}, day(1)), 'out', day(1));
    const list = stockUpList([rice, milk, tissues], day(2), 7).map((entry) => entry.staple.name);
    expect(list).toEqual(['Tissues', 'Milk']);
  });
});

test('guesses categories for new usuals', () => {
  expect(guessStapleCategory('Bin bags')).toBe('household');
  expect(guessStapleCategory('Nappies size 5')).toBe('kids');
  expect(guessStapleCategory('Deodorant')).toBe('toiletries');
  expect(guessStapleCategory('Chickpeas')).toBe('food');
});
