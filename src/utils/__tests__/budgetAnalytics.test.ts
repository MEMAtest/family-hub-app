import { buildExpenseSummaries, deriveForecastContext } from '../budgetAnalytics';

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('budgetAnalytics', () => {
  const referenceDate = toDate('2025-09-01');

  it('aggregates one-off expenses into monthly summaries', () => {
    const expenses = [
      {
        amount: 120,
        category: 'Groceries',
        isRecurring: false,
        paymentDate: toDate('2025-07-12'),
        recurringStartDate: null,
        recurringEndDate: null,
        createdAt: toDate('2025-07-01'),
      },
      {
        amount: 80,
        category: 'Transport',
        isRecurring: false,
        paymentDate: toDate('2025-08-05'),
        recurringStartDate: null,
        recurringEndDate: null,
        createdAt: toDate('2025-08-01'),
      },
    ] as any[];

    const summaries = buildExpenseSummaries(expenses, {
      months: 3,
      referenceDate,
    });

    const july = summaries.find((item) => item.monthKey === '2025-07');
    const august = summaries.find((item) => item.monthKey === '2025-08');

    expect(july?.total).toBeCloseTo(120);
    expect(august?.total).toBeCloseTo(80);
    expect(august?.categories[0]).toMatchObject({ category: 'Transport', amount: 80 });
  });

  it('spreads recurring expenses across analysed months', () => {
    const expenses = [
      {
        amount: 55,
        category: 'Subscriptions',
        isRecurring: true,
        paymentDate: null,
        recurringStartDate: toDate('2025-06-01'),
        recurringEndDate: null,
        createdAt: toDate('2025-06-01'),
      },
    ] as any[];

    const summaries = buildExpenseSummaries(expenses, {
      months: 3,
      referenceDate,
    });

    summaries.forEach((month) => {
      expect(month.total).toBeCloseTo(55);
      expect(month.categories[0]).toMatchObject({ category: 'Subscriptions', amount: 55 });
    });
  });

  it('derives forecast context statistics', () => {
    const expenses = [
      {
        amount: 100,
        category: 'Utilities',
        isRecurring: false,
        paymentDate: toDate('2025-07-10'),
        recurringStartDate: null,
        recurringEndDate: null,
        createdAt: toDate('2025-07-10'),
      },
      {
        amount: 150,
        category: 'Utilities',
        isRecurring: false,
        paymentDate: toDate('2025-08-10'),
        recurringStartDate: null,
        recurringEndDate: null,
        createdAt: toDate('2025-08-10'),
      },
      {
        amount: 200,
        category: 'Utilities',
        isRecurring: false,
        paymentDate: toDate('2025-09-10'),
        recurringStartDate: null,
        recurringEndDate: null,
        createdAt: toDate('2025-09-10'),
      },
    ] as any[];

    const incomes = [
      {
        amount: 500,
        category: 'Salary',
        isRecurring: true,
        paymentDate: null,
        recurringStartDate: toDate('2025-01-01'),
        recurringEndDate: null,
        createdAt: toDate('2025-01-01'),
      },
    ] as any[];

    const context = deriveForecastContext(expenses, incomes, {
      months: 3,
      referenceDate,
    });
    expect(context.historicalExpenses).toHaveLength(3);
    expect(context.historicalIncome[0].total).toBeCloseTo(500);
    expect(context.monthOverMonthChange).toBeCloseTo(50);
    expect(context.trendDirection).toBe('up');
  });
});
