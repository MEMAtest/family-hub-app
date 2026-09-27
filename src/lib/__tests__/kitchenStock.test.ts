import { describeHousehold, parseStockNoteReply, stockNotePrompt } from '@/lib/kitchenStock';

const today = new Date('2026-09-27T12:00:00Z');

describe('describeHousehold', () => {
  test('ages only, months for babies', () => {
    const text = describeHousehold([
      { role: 'Parent', ageGroup: 'Adult', dateOfBirth: new Date('1988-01-01') },
      { role: 'Parent', ageGroup: 'Adult', dateOfBirth: null },
      { role: 'Child', ageGroup: 'Preschool', dateOfBirth: new Date('2022-05-10') },
      { role: 'Child', ageGroup: 'Toddler', dateOfBirth: new Date('2025-07-20') },
    ], today);
    expect(text).toBe('2 adults; 2 children aged 4, 14 months');
    expect(text).not.toMatch(/1988|2022/);
  });

  test('no members: a stated default, not silence', () => {
    expect(describeHousehold([], today)).toMatch(/assume a family of four/);
  });
});

test('the prompt carries the note, household and usuals', () => {
  const prompt = stockNotePrompt('20 rolls', '2 adults', ['Toilet roll'], '2026-09-27');
  expect(prompt).toContain('"20 rolls"');
  expect(prompt).toContain('Household: 2 adults');
  expect(prompt).toContain('Items they already track: Toilet roll');
});

describe('parseStockNoteReply', () => {
  const reply = (items: unknown[]) => '```json\n' + JSON.stringify({ items }) + '\n```';

  test('reads items and only accepts real usuals', () => {
    const items = parseStockNoteReply(reply([
      { name: 'Toilet roll', usual: 'toilet roll', status: 'count', quantity: 20, unit: 'Roll', daysPerUnit: 2, rateSource: 'stated', assumption: 'You said 2 days', question: null, category: 'household' },
      { name: 'Nappies', usual: 'Invented usual', status: 'count', quantity: 2, unit: 'pack', unitContents: 'about 50', daysPerUnit: 9.04, rateSource: 'estimated', category: 'kids' },
    ]), ['Toilet roll']);
    expect(items[0]).toMatchObject({ usual: 'Toilet roll', unit: 'roll', quantity: 20, daysPerUnit: 2 });
    expect(items[1]).toMatchObject({ usual: null, daysPerUnit: 9, unitContents: 'about 50', category: 'kids' });
  });

  test('bad fields fall back safely; a bare "we have some bread" is dropped', () => {
    const items = parseStockNoteReply(reply([
      { name: 'Milk', status: 'low', quantity: null, unit: 'bottle', daysPerUnit: -3, rateSource: 'guess', category: 'drinks' },
      { name: 'Bread', status: 'count', quantity: null, unit: 'loaf' },
      'junk',
    ]), []);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Milk', status: 'low', daysPerUnit: null, rateSource: 'estimated', category: 'household' });
  });

  test('nothing usable is an error, not an empty success', () => {
    expect(() => parseStockNoteReply(reply([]), [])).toThrow(/could be made out/);
    expect(() => parseStockNoteReply('sorry', [])).toThrow();
  });
});
