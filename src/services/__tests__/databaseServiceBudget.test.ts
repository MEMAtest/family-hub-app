import databaseService from '../databaseService';

describe('databaseService budget updates', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('familyId', 'family-1');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('updates income with PUT and replaces the household-scoped local row', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'income-1', incomeName: 'Updated salary', amount: 3200 }),
    }) as typeof fetch;
    localStorage.setItem('budgetIncome:family-1', JSON.stringify([{ id: 'income-1', incomeName: 'Old salary', amount: 3000 }]));

    await databaseService.updateBudgetIncome({ id: 'income-1', incomeName: 'Updated salary', amount: 3200 });

    expect(global.fetch).toHaveBeenCalledWith('/api/families/family-1/budget/income', expect.objectContaining({ method: 'PUT' }));
    expect(JSON.parse(localStorage.getItem('budgetIncome:family-1') || '[]')).toEqual([
      expect.objectContaining({ id: 'income-1', incomeName: 'Updated salary', amount: 3200 }),
    ]);
  });

  it('updates expenses with PUT instead of creating another row', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'expense-1', expenseName: 'Updated bill', amount: 90 }),
    }) as typeof fetch;

    await databaseService.updateBudgetExpense({ id: 'expense-1', expenseName: 'Updated bill', amount: 90 });

    expect(global.fetch).toHaveBeenCalledWith('/api/families/family-1/budget/expenses', expect.objectContaining({ method: 'PUT' }));
  });
});
