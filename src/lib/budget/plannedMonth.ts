export type PlannedBudgetItem = {
  isRecurring?: boolean | null;
  recurringFrequency?: string | null;
  recurringStartDate?: Date | string | null;
  recurringEndDate?: Date | string | null;
  paymentDate?: Date | string | null;
  createdAt?: Date | string | null;
};

const asDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const monthRangeUtc = (monthKey: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const month = match ? Number(match[2]) - 1 : now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { start, end, key: start.toISOString().slice(0, 7) };
};

export const plannedForMonth = (item: PlannedBudgetItem, monthKey: string) => {
  const { start, end } = monthRangeUtc(monthKey);
  const paymentDate = asDate(item.paymentDate);
  const createdAt = asDate(item.createdAt);

  if (!item.isRecurring) {
    const date = paymentDate ?? createdAt;
    return Boolean(date && date >= start && date < end);
  }

  const recurringStart = asDate(item.recurringStartDate) ?? paymentDate ?? createdAt;
  const recurringEnd = asDate(item.recurringEndDate);
  if (recurringStart && recurringStart >= end) return false;
  if (recurringEnd && recurringEnd < start) return false;

  if ((item.recurringFrequency || 'monthly') === 'yearly') {
    return recurringStart ? recurringStart.getUTCMonth() === start.getUTCMonth() : true;
  }

  return true;
};
