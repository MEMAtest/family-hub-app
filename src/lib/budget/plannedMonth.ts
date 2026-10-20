export type PlannedBudgetItem = {
  amount?: number | string | null;
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

export const plannedOccurrencesForMonth = (item: PlannedBudgetItem, monthKey: string) => {
  if (!plannedForMonth(item, monthKey)) return 0;
  if (!item.isRecurring) return 1;

  const frequency = item.recurringFrequency || 'monthly';
  if (frequency !== 'weekly') return 1;

  const { start, end } = monthRangeUtc(monthKey);
  const anchor = asDate(item.recurringStartDate) ?? asDate(item.paymentDate) ?? asDate(item.createdAt);
  if (!anchor) return 1;

  const recurringEnd = asDate(item.recurringEndDate);
  const rangeStart = anchor > start ? anchor : start;
  const rangeEnd = recurringEnd && recurringEnd < end ? new Date(recurringEnd.getTime() + 1) : end;
  if (rangeStart >= rangeEnd) return 0;

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Math.max(0, rangeStart.getTime() - anchor.getTime());
  let occurrence = new Date(anchor.getTime() + Math.ceil(elapsed / weekMs) * weekMs);
  let count = 0;
  while (occurrence < rangeEnd) {
    count += 1;
    occurrence = new Date(occurrence.getTime() + weekMs);
  }
  return count;
};

export const plannedAmountForMonth = (item: PlannedBudgetItem, monthKey: string) =>
  (Number(item.amount) || 0) * plannedOccurrencesForMonth(item, monthKey);
