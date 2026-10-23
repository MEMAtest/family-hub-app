import { fireEvent, render, screen } from '@testing-library/react';
import { MerchantBreakdown } from './MerchantBreakdown';
import { classifyMoneyTransaction, emptyMoneyPreferences } from '@/lib/budget/moneyPlanner';

const row = (id: string, description: string, amount: number, direction = 'debit', transactionType = 'normal') => classifyMoneyTransaction({
  id, accountId: 'synthetic', transactionDate: '2026-10-05', description, amount, direction, transactionType,
}, emptyMoneyPreferences());

test('groups branch aliases, reconciles pence and opens the named merchant without counting transfers/refunds', () => {
  const onSelect = jest.fn();
  render(<MerchantBreakdown transactions={[
    row('one', 'Card WLT 1234, Tesco Stores 012', 0.1), row('two', 'Tesco Stores 345', 0.2),
    row('three', 'Tesco refund', 10, 'credit'), row('four', 'Tesco', 100, 'debit', 'transfer'),
    row('five', 'Private payee', 900),
  ]} onSelect={onSelect} />);
  const button = screen.getByRole('button', { name: 'View Tesco payments' });
  expect(button).toHaveTextContent('2 payments');
  expect(button).toHaveTextContent('£0.30');
  expect(screen.queryByText(/Private payee/)).not.toBeInTheDocument();
  fireEvent.click(button);
  expect(onSelect).toHaveBeenCalledWith('Tesco');
});

test('does not mix different local merchants into a generic local-shop bucket', () => {
  render(<MerchantBreakdown transactions={[
    row('one', 'United Butchers', 20), row('two', 'Murray Bros Butchers', 30),
  ]} onSelect={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'View United Butchers payments' })).toHaveTextContent('£20.00');
  expect(screen.getByRole('button', { name: 'View Murray Bros Butchers payments' })).toHaveTextContent('£30.00');
});

test('keeps confirmed category choices and excludes confirmed transfers from shop spending', () => {
  const preferences = emptyMoneyPreferences();
  preferences.overrides.one = { kind: 'spend', category: 'Home improvements' };
  preferences.overrides.two = { kind: 'transfer', category: 'Transfers' };
  const transactions = ['one', 'two'].map(id => classifyMoneyTransaction({ id, accountId: 'a', transactionDate: '2026-10-05',
    description: 'IKEA Greenwich', amount: 50, direction: 'debit', transactionType: 'normal' }, preferences));
  render(<MerchantBreakdown transactions={transactions} onSelect={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'View IKEA payments' })).toHaveTextContent('Home improvements · 1 payment£50.00');
});

test('offers the complete merchant list without an unbounded first render', () => {
  render(<MerchantBreakdown transactions={['Tesco', 'Aldi', 'Lidl', 'IKEA', 'Argos', 'Netflix', 'Spotify', 'Grandir', 'Homebase'].map(
    (description, index) => row(String(index), description, index + 1),
  )} onSelect={jest.fn()} />);
  expect(screen.queryByRole('button', { name: 'View Tesco payments' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show all 9 shops and providers' }));
  expect(screen.getByRole('button', { name: 'View Tesco payments' })).toBeVisible();
});
