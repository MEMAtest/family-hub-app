export type CashFlowTransaction = {
  id: string; accountName: string; transactionDate: string; description: string;
  amount: number; direction: string; transactionType: string; category: string | null;
};
export type CashFlow = {
  month: string;
  summary: { actualIncome: number; actualSpend: number; actualNet: number; plannedIncome: number; plannedExpenses: number; plannedNet: number };
  coverage: { status: 'complete' | 'partial' | 'none'; firstTransactionDate: string | null; lastTransactionDate: string | null; transactionCount: number; accounts: number; completeAccounts: number };
  categorySpend: Array<{ category: string; amount: number }>;
  reconciliations: Array<{ accountId: string; accountName: string; mismatch: number | null; reconciled: boolean | null }>;
  transactions: CashFlowTransaction[];
  connections: {
    planned: { incomeItems: number; expenseItems: number; excludedQaItems?: number };
    accounts: Array<{ id: string; name: string; institution: string | null; importCount: number; transactionCount: number; lastImportAt: string | null; statementThrough: string | null; latestBalance?: number | null }>;
    property: { projects: Array<{ id: string; title: string; selectedCost: number; unknownCostItems: number; quoteReference: number | null }>; updatedAt: string | null };
  };
};

export const hasKnownActuals = (data: CashFlow | null) => Boolean(data && (
  data.coverage.status === 'complete' || data.coverage.transactionCount > 0
));

export const isCashFlow = (value: unknown): value is CashFlow => {
  if (!value || typeof value !== 'object') return false;
  const data = value as CashFlow;
  return typeof data.month === 'string'
    && ['actualIncome', 'actualSpend', 'actualNet'].every(key => typeof data.summary?.[key as keyof CashFlow['summary']] === 'number' && Number.isFinite(data.summary[key as keyof CashFlow['summary']]))
    && ['complete', 'partial', 'none'].includes(data.coverage?.status)
    && Number.isFinite(data.coverage?.transactionCount)
    && Array.isArray(data.categorySpend) && Array.isArray(data.transactions)
    && Array.isArray(data.reconciliations) && Array.isArray(data.connections?.accounts)
    && Number.isFinite(data.connections?.planned?.incomeItems) && Number.isFinite(data.connections?.planned?.expenseItems)
    && Array.isArray(data.connections?.property?.projects);
};

export const cashFlowMonth = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const cashFlowMoney = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
export const cashFlowDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
