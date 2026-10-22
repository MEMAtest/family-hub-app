import React from 'react';
import { render, screen } from '@testing-library/react';
import { BankCashFlowSummary } from './BankCashFlowSummary';
import type { CashFlow } from '@/lib/budget/cashFlow';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>, BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null, Cell: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null,
}));
const fixture = (status: CashFlow['coverage']['status'] = 'partial'): CashFlow => ({
  month: '2026-10', summary: { actualIncome: 1000, actualSpend: 123.45, actualNet: 876.55, plannedIncome: 99999, plannedExpenses: 88888, plannedNet: 11111 },
  coverage: { status, transactionCount: status === 'none' ? 0 : 2, firstTransactionDate: null, lastTransactionDate: '2026-10-20', accounts: 1, completeAccounts: status === 'complete' ? 1 : 0 },
  categorySpend: [], transactions: [], reconciliations: [], connections: { planned: { incomeItems: 1, expenseItems: 1 }, accounts: [{ id: 'bank', name: 'Synthetic bank', institution: null, importCount: 1, transactionCount: 2, lastImportAt: null, statementThrough: '2026-10-20' }], property: { projects: [], updatedAt: null } },
});
test('overview uses imported amounts, not saved plans, and labels partial coverage', () => {
  render(<BankCashFlowSummary data={fixture()} loading={false} error="" />);
  expect(screen.getByText('£123.45')).toBeInTheDocument();
  expect(screen.getByText('£876.55')).toBeInTheDocument();
  expect(screen.queryByText(/88,888/)).not.toBeInTheDocument();
  expect(screen.getByText(/Partial imported month/)).toBeInTheDocument();
});
test('uncovered months are unavailable, not zero or a saved-plan substitution', () => {
  render(<BankCashFlowSummary data={fixture('none')} loading={false} error="" />);
  expect(screen.getAllByText('Unavailable')).toHaveLength(3);
  expect(screen.queryByText('£1,000.00')).not.toBeInTheDocument();
});
test('a covered zero-activity month is genuinely zero', () => {
  const data = fixture('complete');
  data.coverage.transactionCount = 0;
  data.summary = { ...data.summary, actualIncome: 0, actualSpend: 0, actualNet: 0 };
  render(<BankCashFlowSummary data={data} loading={false} error="" />);
  expect(screen.getAllByText('£0.00')).toHaveLength(3);
});
test('errors and loading do not retain old financial values', () => {
  const { rerender } = render(<BankCashFlowSummary data={fixture()} loading={false} error="" />);
  rerender(<BankCashFlowSummary data={fixture()} loading={false} error="Source unavailable" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Source unavailable');
  expect(screen.queryByText('£123.45')).not.toBeInTheDocument();
  rerender(<BankCashFlowSummary data={fixture()} loading error="" />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading imported bank figures');
  expect(screen.queryByText('£123.45')).not.toBeInTheDocument();
});
test('privacy hides financial values and the chart', () => {
  render(<BankCashFlowSummary data={fixture()} loading={false} error="" hidden />);
  expect(screen.getAllByText('Hidden')).toHaveLength(3);
  expect(screen.queryByText('£123.45')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Imported monthly cash flow chart')).not.toBeInTheDocument();
});
