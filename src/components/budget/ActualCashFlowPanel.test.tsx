import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActualCashFlowPanel } from './ActualCashFlowPanel';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>, BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null, Cell: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null,
}));

test('bank statement balance is dated and distinct from monthly net movement', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
    month: '2026-10', summary: { actualIncome: 0, actualSpend: 10, actualNet: -10, plannedIncome: 0, plannedExpenses: 20, plannedNet: -20, forecastNet: null, forecastStatus: 'unreconciled' },
    coverage: { status: 'partial', transactionCount: 1, lastTransactionDate: '2026-10-20', firstTransactionDate: '2026-10-20', accounts: 1, completeAccounts: 0 },
    transactions: [{ id: 'synthetic-row', accountName: 'Synthetic bank', transactionDate: '2026-10-20', description: 'Synthetic payment', amount: 10, direction: 'debit', transactionType: 'normal', category: 'Other' }],
    categorySpend: [], reconciliations: [{ accountId: 'synthetic', accountName: 'Synthetic bank', mismatch: null, reconciled: null }],
    connections: { planned: { incomeItems: 0, expenseItems: 1 }, property: { projects: [], updatedAt: null }, accounts: [{
      id: 'synthetic', name: 'Synthetic bank', institution: null, importCount: 1, transactionCount: 2,
      lastImportAt: '2026-10-22T12:00:00Z', statementThrough: '2026-10-20T12:00:00Z', latestBalance: 45.67,
    }] },
  }) });
  try {
    render(<ActualCashFlowPanel familyId="synthetic-family" month="2026-10" />);
    expect(await screen.findByText('Actual net flow')).toBeInTheDocument();
    expect(screen.queryByText('Actual balance')).not.toBeInTheDocument();
    expect(screen.getByText('Latest statement balance £45.67 · as of 20 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Month not reconciled')).toBeInTheDocument();
  } finally { global.fetch = originalFetch; }
});
