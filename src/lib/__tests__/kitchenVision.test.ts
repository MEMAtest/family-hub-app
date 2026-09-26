import { parseFridgeReply, parseReceiptReply } from '../kitchenVision';

describe('parseFridgeReply', () => {
  test('reads a well-formed reply, even inside code fences', () => {
    const reply = '```json\n' + JSON.stringify({
      summary: 'Plenty of meat and two lots of leftovers.',
      items: [
        { name: 'Minced beef', category: 'Meat', useSoon: true, note: 'reduced sticker' },
        { name: 'Yakult', category: 'drinks', useSoon: false },
      ],
      useFirst: ['Leftover stew in the glass dish'],
      mealIdeas: ['Spaghetti bolognese'],
    }) + '\n```';
    expect(parseFridgeReply(reply)).toEqual({
      summary: 'Plenty of meat and two lots of leftovers.',
      items: [
        { name: 'Minced beef', category: 'meat', useSoon: true, note: 'reduced sticker' },
        { name: 'Yakult', category: 'drinks', useSoon: false },
      ],
      useFirst: ['Leftover stew in the glass dish'],
      mealIdeas: ['Spaghetti bolognese'],
    });
  });

  test('drops malformed items and caps the lists', () => {
    const reply = JSON.stringify({
      items: [{ name: '' }, { category: 'veg' }, { name: 'Cucumber', useSoon: 'yes' }],
      useFirst: ['a', 'b', 'c', 'd', 'e', 'f'],
      mealIdeas: 'not a list',
    });
    const reading = parseFridgeReply(reply);
    expect(reading.items).toEqual([{ name: 'Cucumber', category: 'other', useSoon: false }]);
    expect(reading.useFirst).toHaveLength(5);
    expect(reading.mealIdeas).toEqual([]);
    expect(reading.summary).toBe('Spotted 1 item.');
  });

  test('fails honestly when nothing was recognised', () => {
    expect(() => parseFridgeReply('{"items": []}')).toThrow(/No food/);
    expect(() => parseFridgeReply('Sorry, I cannot see a fridge.')).toThrow();
  });
});

describe('parseReceiptReply', () => {
  const usuals = ['Toilet roll', 'Milk', 'Eggs'];
  const today = new Date('2026-09-26T12:00:00Z');

  test('keeps lines and only accepts usuals the household has', () => {
    const reply = JSON.stringify({
      store: 'Tesco',
      date: '2026-09-25',
      total: 42.1,
      lines: [
        { name: 'Andrex toilet roll 9 pack', quantity: 1, usual: 'toilet roll' },
        { name: 'Semi skimmed milk 4 pints', quantity: 2, usual: 'Milk' },
        { name: 'Birthday candles', quantity: 1, usual: 'Candles' },
      ],
    });
    expect(parseReceiptReply(reply, usuals, today)).toEqual({
      store: 'Tesco',
      date: '2026-09-25',
      total: 42.1,
      lines: [
        { name: 'Andrex toilet roll 9 pack', quantity: 1, usual: 'Toilet roll' },
        { name: 'Semi skimmed milk 4 pints', quantity: 2, usual: 'Milk' },
        { name: 'Birthday candles', quantity: 1, usual: null },
      ],
    });
  });

  test('rejects future dates and bad numbers', () => {
    const reply = JSON.stringify({ date: '2031-01-01', total: -5, lines: [{ name: 'Bread', quantity: 0 }] });
    const reading = parseReceiptReply(reply, usuals, today);
    expect(reading.date).toBeNull();
    expect(reading.total).toBeNull();
    expect(reading.lines).toEqual([{ name: 'Bread', quantity: 1, usual: null }]);
  });

  test('fails honestly when no lines were read', () => {
    expect(() => parseReceiptReply('{"lines": []}', usuals, today)).toThrow(/No items/);
  });
});
