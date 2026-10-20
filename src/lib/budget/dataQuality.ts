type BudgetRecord = {
  incomeName?: string | null;
  expenseName?: string | null;
  category?: string | null;
};

const exactQaNames = new Set(['test', 'vistra test']);

export const isQaBudgetRecord = (record: BudgetRecord) => {
  const name = String(record.incomeName ?? record.expenseName ?? '').trim().toLowerCase();
  const category = String(record.category ?? '').trim().toLowerCase();
  return category === 'test'
    || category === 'playwright qa'
    || exactQaNames.has(name)
    || name.startsWith('api test ')
    || name.startsWith('playwright ');
};

export const partitionBudgetRecords = <T extends BudgetRecord>(records: T[]) => ({
  operational: records.filter((record) => !isQaBudgetRecord(record)),
  excludedQa: records.filter(isQaBudgetRecord),
});
