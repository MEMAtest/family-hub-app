import React from 'react';
import { render, screen, within } from '@testing-library/react';
import CategoryDrilldownPanel from '../modals/CategoryDrilldownPanel';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

const baseExpense = {
  id: 'expense-0',
  amount: 60,
  category: 'Groceries',
  paymentDate: '2025-10-01',
  createdAt: '2025-10-01',
  isReceiptScan: true,
};

describe('CategoryDrilldownPanel', () => {
  it('returns null when panel closed', () => {
    const { container } = render(
      <CategoryDrilldownPanel
        category="Groceries"
        isOpen={false}
        onClose={jest.fn()}
        matchingExpenses={[]}
        allExpenses={[]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders totals, averages, and transaction count', () => {
    const expenses = [
      { ...baseExpense, id: 'expense-1', amount: 40, paymentDate: '2025-09-10' },
      { ...baseExpense, id: 'expense-2', amount: 60, paymentDate: '2025-10-15' },
      { ...baseExpense, id: 'expense-3', amount: 80, paymentDate: '2025-11-02' },
    ];

    render(
      <CategoryDrilldownPanel
        category="Groceries"
        isOpen
        onClose={jest.fn()}
        matchingExpenses={expenses.slice(0, 2)}
        allExpenses={expenses}
      />
    );

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('£180.00')).toBeInTheDocument(); // total
    expect(screen.getByText(/Across 3 transactions/i)).toBeInTheDocument();

    const averageCard = screen.getByText('Average Spend').closest('div');
    expect(averageCard).not.toBeNull();
    if (averageCard) {
      expect(within(averageCard).getByText('£60.00')).toBeInTheDocument();
      expect(within(averageCard).getByText(/Per transaction/i)).toBeInTheDocument();
    }
    expect(screen.getAllByTestId('line-chart')[0]).toBeInTheDocument();
  });
});
