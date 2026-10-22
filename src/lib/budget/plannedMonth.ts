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

export const plannedOccurrencesForMonth = (item: PlannedBudgetItem, monthKey: string) => {
  const { start, end } = monthRangeUtc(monthKey);
  const paymentDate = asDate(item.paymentDate);
  const createdAt = asDate(item.createdAt);

  if (!item.isRecurring) {
    const date = paymentDate ?? createdAt;
    return date && date >= start && date < end ? 1 : 0;
  }

  const recurringStart = asDate(item.recurringStartDate) ?? paymentDate ?? createdAt;
  const recurringEnd = asDate(item.recurringEndDate);
  if (recurringStart && recurringStart >= end) return 0;
  if (recurringEnd && recurringEnd < start) return 0;
  const frequency = item.recurringFrequency || 'monthly';
  const anchor = recurringStart ? new Date(recurringStart.toISOString().slice(0, 10)) : null;
  if (!anchor) return 1;
  const endDay = recurringEnd ? new Date(recurringEnd.toISOString().slice(0, 10)) : null;
  if (frequency !== 'weekly') {
    if (frequency === 'yearly' && anchor.getUTCMonth() !== start.getUTCMonth()) return 0;
    const lastDay = new Date(end.getTime() - 1).getUTCDate();
    const occurrence = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), Math.min(anchor.getUTCDate(), lastDay)));
    return occurrence >= anchor && (!endDay || occurrence <= endDay) ? 1 : 0;
  }
  const rangeStart = anchor > start ? anchor : start;
  const rangeEnd = endDay && endDay < end ? new Date(endDay.getTime() + 86_400_000) : end;
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

export const plannedForMonth = (item: PlannedBudgetItem, monthKey: string) =>
  plannedOccurrencesForMonth(item, monthKey) > 0;

export const plannedAmountForMonth = (item: PlannedBudgetItem, monthKey: string) =>
  (Number(item.amount) || 0) * plannedOccurrencesForMonth(item, monthKey);
