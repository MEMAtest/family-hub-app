import { validateIncomePlan } from './incomePlan';

const base = { incomeName: 'Monthly pay', amount: 2500, category: 'Salary', isRecurring: true, recurringFrequency: 'monthly', recurringStartDate: '2026-11-28', recurringEndDate: '', paymentDate: '' };
test('preserves the legacy immediate one-off payload without accepting explicitly blank dates', () => {
  expect(validateIncomePlan({ incomeName: 'Legacy one-off', amount: 100, category: 'Other' }, new Date('2026-10-22'))).toMatchObject({ isRecurring: false, paymentDate: new Date('2026-10-22') });
});
test('validates amounts and returns persisted dates, including explicitly cleared end dates', () => {
  const plan = validateIncomePlan({ ...base, amount: '2500.25' });
  expect(plan.amount).toBe(2500.25);
  expect(plan.recurringStartDate?.toISOString()).toBe('2026-11-28T00:00:00.000Z');
  expect(plan.recurringEndDate).toBeNull();
});
test.each([0, -1, NaN, Infinity, '', '1garbage', 1e12])('rejects invalid amount %s', amount => {
  expect(() => validateIncomePlan({ ...base, amount })).toThrow();
});
test.each(['2026-02-30', 'tomorrow', '2026-13-01'])('rejects invalid date %s', recurringStartDate => {
  expect(() => validateIncomePlan({ ...base, recurringStartDate })).toThrow();
});
test('does not lose Date objects on a partial update and validates the merged end date', () => {
  expect(validateIncomePlan({ ...base, recurringStartDate: new Date('2026-11-28') }).recurringStartDate).toEqual(new Date('2026-11-28'));
  expect(() => validateIncomePlan({ ...base, recurringEndDate: '2026-11-01' })).toThrow('End date');
});
test('one-off income requires a payment date and clears irrelevant recurrence fields', () => {
  expect(() => validateIncomePlan({ ...base, isRecurring: false })).toThrow('payment date');
  expect(validateIncomePlan({ ...base, isRecurring: false, paymentDate: '2026-12-01' })).toMatchObject({ paymentDate: new Date('2026-12-01'), recurringFrequency: null, recurringStartDate: null, recurringEndDate: null });
});
