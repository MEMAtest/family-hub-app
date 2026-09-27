import {
  applyStockNote,
  createStaple,
  flagStaple,
  looksLikeStockCount,
  recordPurchase,
  setStockCount,
  stapleStatus,
  stockUpList,
} from '@/utils/staples';
import type { StockNoteItem } from '@/types/kitchen.types';

const day = (n: number) => new Date(Date.UTC(2026, 8, 27 + n, 9));

const note = (patch: Partial<StockNoteItem>): StockNoteItem => ({
  name: 'Toilet roll', usual: null, status: 'count', quantity: 20, unit: 'roll', unitContents: null,
  daysPerUnit: 2, rateSource: 'stated', assumption: null, question: null, category: 'household', ...patch,
});

describe('counted stock', () => {
  const rolls = setStockCount(createStaple('Toilet roll', {}, day(0)), { quantity: 20, unit: 'roll', daysPerUnit: 2, rateSource: 'stated' }, day(0));

  test('20 rolls at 2 days each last 40 days, counting down', () => {
    expect(stapleStatus(rolls, day(0))).toMatchObject({ state: 'ok', daysLeft: 40, unitsLeft: 20, runsOutOn: '2026-11-06' });
    expect(stapleStatus(rolls, day(0)).label).toBe('About 20 rolls left · 40 days');
    expect(stapleStatus(rolls, day(10))).toMatchObject({ daysLeft: 30, unitsLeft: 15 });
    expect(stapleStatus(rolls, day(38))).toMatchObject({ state: 'soon', daysLeft: 2 });
    expect(stapleStatus(rolls, day(41))).toMatchObject({ state: 'due', label: 'Probably run out' });
  });

  test('shows up in the stock-up list only once it is within the week', () => {
    expect(stockUpList([rolls], day(0))).toHaveLength(0);
    expect(stockUpList([rolls], day(34)).map((e) => e.staple.name)).toEqual(['Toilet roll']);
  });

  test('buying adds units without forgetting the count, so the rate can still learn', () => {
    const bought = recordPurchase(rolls, day(10), 9);
    expect(bought.stock).toMatchObject({ countedQuantity: 20, addedSince: 9, lastBoughtUnits: 9 });
    expect(stapleStatus(bought, day(10))).toMatchObject({ unitsLeft: 24, daysLeft: 48 });
  });

  test('"Bought" with no number adds a usual shop (first count by default)', () => {
    expect(recordPurchase(rolls, day(5)).stock?.addedSince).toBe(20);
  });

  test('buying after running out starts afresh instead of charging the empty days', () => {
    const bought = recordPurchase(rolls, day(60), 9);
    expect(stapleStatus(bought, day(60))).toMatchObject({ unitsLeft: 9, daysLeft: 18 });
  });

  test('a receipt from before the count adds nothing: the count already includes it', () => {
    const counted = setStockCount(createStaple('Toilet roll', {}, day(0)), { quantity: 20, unit: 'roll', daysPerUnit: 2 }, day(5));
    const oldReceipt = recordPurchase(counted, day(4), 9);
    expect(oldReceipt.stock).toEqual(counted.stock);
    expect(oldReceipt.purchases).toHaveLength(1);
    const outToday = flagStaple(counted, 'out', day(6));
    expect(recordPurchase(outToday, day(4), 9).stock?.countedAt).toBe(outToday.stock?.countedAt);
  });

  test('a recount teaches the real rate, halfway from the old one', () => {
    // 20 rolls, 20 days later 5 are left: 15 used in 20 days = 1.33 days each.
    const recount = setStockCount(rolls, { quantity: 5, rateSource: 'estimated' }, day(20));
    expect(recount.stock).toMatchObject({ rateSource: 'learned', countedQuantity: 5, addedSince: 0 });
    expect(recount.stock!.daysPerUnit).toBeCloseTo(1.7, 1);
  });

  test('a rate they state always wins over learning', () => {
    const recount = setStockCount(rolls, { quantity: 5, daysPerUnit: 3, rateSource: 'stated' }, day(20));
    expect(recount.stock).toMatchObject({ rateSource: 'stated', daysPerUnit: 3 });
  });

  test('running out early also teaches the rate', () => {
    const out = flagStaple(rolls, 'out', day(30));
    expect(out.flag).toBe('out');
    expect(out.stock).toMatchObject({ countedQuantity: 0, rateSource: 'learned' });
    expect(out.stock!.daysPerUnit).toBeCloseTo(1.8, 1); // (2 + 30/20) / 2
    expect(stapleStatus(out, day(30)).state).toBe('out');
  });

  test('too soon to learn: a recount the same day keeps the rate', () => {
    expect(setStockCount(rolls, { quantity: 18 }, day(1)).stock).toMatchObject({ daysPerUnit: 2, rateSource: 'stated' });
  });

  test('low flag wins over the count', () => {
    expect(stapleStatus(flagStaple(rolls, 'low', day(2)), day(2)).state).toBe('low');
  });
});

describe('applyStockNote', () => {
  const staples = [createStaple('Toilet roll', { aliases: ['loo roll'] }, day(0)), createStaple('Baby wipes', { category: 'kids' }, day(0))];

  test('the three-item note: counts set, a new usual created, nothing on the list', () => {
    const result = applyStockNote(staples, [
      note({}),
      note({ name: 'Baby wipes', usual: 'Baby wipes', quantity: 12, unit: 'pack', daysPerUnit: 3, rateSource: 'estimated', category: 'kids' }),
      note({ name: 'Nappies', quantity: 2, unit: 'pack', daysPerUnit: 9, rateSource: 'estimated', category: 'kids' }),
    ], day(0));
    expect(result.staples.map((s) => s.name)).toEqual(['Toilet roll', 'Baby wipes', 'Nappies']);
    expect(result.forTopUps).toHaveLength(0);
    const byName = Object.fromEntries(result.staples.map((s) => [s.name, stapleStatus(s, day(0))]));
    expect(byName['Toilet roll'].daysLeft).toBe(40);
    expect(byName['Baby wipes'].daysLeft).toBe(36);
    expect(byName.Nappies).toMatchObject({ daysLeft: 18, runsOutOn: '2026-10-15' });
    expect(result.staples[2].category).toBe('kids');
  });

  test('a count of none is out, and goes on the list', () => {
    const result = applyStockNote(staples, [note({ quantity: 0 })], day(0));
    expect(result.forTopUps.map((s) => s.name)).toEqual(['Toilet roll']);
    expect(result.staples[0].flag).toBe('out');
  });

  test('low and out go on the list; a matched name reuses the usual', () => {
    const result = applyStockNote(staples, [note({ name: 'loo roll', status: 'out', quantity: null })], day(0));
    expect(result.staples).toHaveLength(2);
    expect(result.forTopUps.map((s) => s.name)).toEqual(['Toilet roll']);
    expect(result.staples[0]).toMatchObject({ flag: 'out' });
    expect(result.staples[0].onListAt).toBeDefined();
  });
});

test('one full container reads as one left, and only later as the last one going', () => {
  const tub = setStockCount(createStaple('Laundry pods', {}, day(0)), { quantity: 1, unit: 'tub', daysPerUnit: 60 }, day(0));
  expect(stapleStatus(tub, day(1)).label).toBe('About 1 tub left · 59 days');
  expect(stapleStatus(tub, day(10)).label).toBe('Last tub going · 50 days');
});

test('plural units read naturally', () => {
  const { pluralUnit } = jest.requireActual('@/utils/staples');
  expect([pluralUnit('loaf', 2), pluralUnit('box', 2), pluralUnit('roll', 1), pluralUnit('pack', 3)]).toEqual(['loaves', 'boxes', 'roll', 'packs']);
});

describe('looksLikeStockCount', () => {
  test.each([
    ['we have 20 toilet tissue from costco', true],
    ["we've got a box of wipes", true],
    ['two packs of nappies', true],
    ['low on eggs', false],
    ['out of tissues, low on eggs and milk', false],
    ['Milk', false],
  ])('%s -> %s', (text, expected) => {
    expect(looksLikeStockCount(text)).toBe(expected);
  });
});
