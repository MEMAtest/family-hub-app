import { classifyMoneyTransaction, emptyMoneyPreferences, moneyMerchantKey, type MoneyRow } from './moneyPlanner';
import { readMoneyPreferences } from './moneyPlannerService';

const row: MoneyRow = { id: 'old', accountId: 'joint', transactionDate: '2024-08-01', description: 'Direct Debit Halifax, 1234567890', direction: 'debit', transactionType: 'normal', amount: 900 };
test('a saved household mortgage confirmation covers history and the same mandate in future imports, not other accounts or products', () => {
  const preferences = readMoneyPreferences({ rules: { [moneyMerchantKey(row.accountId, row.description)]: { category: 'Mortgage', kind: 'spend' } } });
  for (const item of [row, { ...row, id: 'future', transactionDate: '2026-11-01' }]) {
    expect(classifyMoneyTransaction(item, preferences)).toMatchObject({ category: 'Mortgage', assignmentSource: 'confirmed', merchantName: 'Halifax mortgage' });
  }
  expect(classifyMoneyTransaction(row, emptyMoneyPreferences()).kind).toBe('review');
  expect(classifyMoneyTransaction({ ...row, accountId: 'other-account' }, preferences).kind).toBe('review');
  expect(classifyMoneyTransaction({ ...row, description: 'Card payment Halifax' }, preferences).kind).toBe('review');
  preferences.overrides.old = { category: 'Housing', kind: 'spend' };
  expect(classifyMoneyTransaction(row, preferences).category).toBe('Housing');
  expect(classifyMoneyTransaction({ ...row, transactionType: 'transfer' }, preferences).kind).toBe('transfer');
  expect(classifyMoneyTransaction({ ...row, direction: 'credit' }, preferences).kind).toBe('review');
});
test('recognises documented childcare funding without treating all HMRC, credits or matched transfers as childcare spending', () => {
  const funding = { ...row, description: 'Transfer MOB, HMRC, 1100123456789' };
  expect(classifyMoneyTransaction(funding, emptyMoneyPreferences())).toMatchObject({ category: 'Childcare', kind: 'spend', merchantName: 'HMRC childcare account', assignmentSource: 'suggested', reason: expect.stringContaining('funding, not a provider bill') });
  for (const description of ['Transfer MOB, HMRC, 123456', 'Transfer MOB, Friend HMRC, 1100123456789', 'Transfer MOB, HMRC, 11001234567890', 'Transfer MOB, HMRC, 110012345678', 'Transfer MOB, HMRC, Amari']) {
    expect(classifyMoneyTransaction({ ...row, description }, emptyMoneyPreferences()).kind).toBe('review');
  }
  expect(classifyMoneyTransaction({ ...funding, transactionType: 'transfer' }, emptyMoneyPreferences()).kind).toBe('transfer');
  expect(classifyMoneyTransaction({ ...funding, direction: 'credit' }, emptyMoneyPreferences()).kind).toBe('review');
  const preferences = emptyMoneyPreferences();
  preferences.overrides.old = { category: 'Tax & government', kind: 'spend' };
  expect(classifyMoneyTransaction(funding, preferences).category).toBe('Tax & government');
});

test('recognises the nursery payee, not a child name embedded in an unrelated payment', () => {
  const nursery = { ...row, description: 'Transfer MOB, Sunnyfields Day Nu, Amari' };
  const preferences = emptyMoneyPreferences();
  expect(classifyMoneyTransaction(nursery, preferences)).toMatchObject({ category: 'Childcare', assignmentSource: 'suggested', merchantName: 'Sunnyfields Day Nursery', merchantEvidence: { url: 'https://www.sunnyfields.net/' } });
  preferences.rules[moneyMerchantKey(nursery.accountId, nursery.description)] = { category: 'Childcare', kind: 'spend' };
  expect(classifyMoneyTransaction(nursery, preferences).assignmentSource).toBe('confirmed');
  for (const description of ['Transfer MOB, Friend, Sunnyfields Day Nursery', 'Transfer MOB, Friend Sunnyfields Day Nu, Amari', 'Transfer MOB, Friend, Amari', 'Transfer MOB, Friend, Askia']) {
    expect(classifyMoneyTransaction({ ...row, description }, preferences).kind).toBe('review');
  }
  expect(classifyMoneyTransaction({ ...nursery, direction: 'credit' }, preferences).kind).toBe('review');
  expect(classifyMoneyTransaction({ ...nursery, transactionType: 'transfer' }, preferences).kind).toBe('transfer');
});
