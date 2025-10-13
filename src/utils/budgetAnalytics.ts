import { BudgetExpense, BudgetIncome } from '@prisma/client';

export interface MonthlySummary {
  monthKey: string; // YYYY-MM
  label: string; // e.g. Oct 2025
  total: number;
  categories: Array<{ category: string; amount: number }>;
}

export interface ForecastContext {
  historicalExpenses: MonthlySummary[];
  historicalIncome: MonthlySummary[];
  averageMonthlySpend: number;
  monthOverMonthChange: number;
  trendDirection: 'up' | 'down' | 'flat';
}

type ExpenseLike = Pick<
  BudgetExpense,
  | 'amount'
  | 'category'
  | 'paymentDate'
  | 'recurringStartDate'
  | 'recurringEndDate'
  | 'createdAt'
  | 'isRecurring'
>;

type IncomeLike = Pick<
  BudgetIncome,
  | 'amount'
  | 'category'
  | 'paymentDate'
  | 'recurringStartDate'
  | 'recurringEndDate'
  | 'createdAt'
  | 'isRecurring'
>;

interface BuildSummaryOptions {
  referenceDate?: Date;
  months: number;
}

interface MonthBucket {
  monthKey: string;
  label: string;
  start: Date;
  end: Date;
  categories: Map<string, number>;
  total: number;
}

const clampMonths = (months: number) => {
  if (Number.isNaN(months) || months <= 0) return 3;
  if (months > 18) return 18;
  return Math.floor(months);
};

const createMonthBuckets = (months: number, referenceDate = new Date()): MonthBucket[] => {
  const buckets: MonthBucket[] = [];
  const refStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  for (let i = months - 1; i >= 0; i -= 1) {
    const start = new Date(refStart.getFullYear(), refStart.getMonth() - (months - 1 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

    buckets.push({
      monthKey,
      label: start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      start,
      end,
      total: 0,
      categories: new Map<string, number>(),
    });
  }

  return buckets;
};

const addToBucket = (bucket: MonthBucket, category: string, amount: number) => {
  if (!Number.isFinite(amount) || amount === 0) {
    return;
  }

  bucket.total += amount;
  const key = category || 'Other';
  bucket.categories.set(key, (bucket.categories.get(key) || 0) + amount);
};

const getEffectiveDateRange = (
  record: ExpenseLike | IncomeLike,
  referenceDate: Date
) => {
  const start =
    record.recurringStartDate ??
    record.paymentDate ??
    record.createdAt ??
    referenceDate;

  const end =
    record.recurringEndDate && record.recurringEndDate < referenceDate
      ? record.recurringEndDate
      : referenceDate;

  return { start, end };
};

const buildMonthlySummariesInternal = <T extends ExpenseLike | IncomeLike>(
  records: T[],
  options: BuildSummaryOptions
): MonthlySummary[] => {
  const months = clampMonths(options.months);
  const referenceDate = options.referenceDate ?? new Date();
  const buckets = createMonthBuckets(months, referenceDate);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.monthKey, bucket]));

  records.forEach((record) => {
    const category = record.category || 'Other';

    if (record.isRecurring) {
      const { start, end } = getEffectiveDateRange(record, referenceDate);

      buckets.forEach((bucket) => {
        if (bucket.start > end || bucket.end < start) {
          return;
        }
        addToBucket(bucket, category, Number(record.amount));
      });
    } else {
      const eventDate =
        record.paymentDate ?? record.createdAt;
      if (!eventDate) {
        return;
      }
      const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      const targetBucket = bucketMap.get(monthKey);
      if (targetBucket) {
        addToBucket(targetBucket, category, Number(record.amount));
      }
    }
  });

  const orderedBuckets = [...buckets].reverse();

  return orderedBuckets.map((bucket) => ({
    monthKey: bucket.monthKey,
    label: bucket.label,
    total: Number(bucket.total.toFixed(2)),
    categories: Array.from(bucket.categories.entries()).map(([cat, amount]) => ({
      category: cat,
      amount: Number(amount.toFixed(2)),
    })),
  }));
};

export const buildExpenseSummaries = (
  expenses: ExpenseLike[],
  options: BuildSummaryOptions
) => buildMonthlySummariesInternal(expenses, options);

export const buildIncomeSummaries = (
  incomes: IncomeLike[],
  options: BuildSummaryOptions
) => buildMonthlySummariesInternal(incomes, options);

export const deriveForecastContext = (
  expenses: ExpenseLike[],
  incomes: IncomeLike[],
  options: BuildSummaryOptions
): ForecastContext => {
  const historicalExpenses = buildExpenseSummaries(expenses, options);
  const historicalIncome = buildIncomeSummaries(incomes, options);

  const lastTwo = historicalExpenses.slice(-2);
  let trendDirection: ForecastContext['trendDirection'] = 'flat';
  let monthOverMonthChange = 0;

  if (lastTwo.length === 2) {
    const [previous, current] = lastTwo;
    if (previous.total === 0) {
      trendDirection = current.total === 0 ? 'flat' : 'up';
      monthOverMonthChange = current.total;
    } else {
      const delta = current.total - previous.total;
      monthOverMonthChange = Number(delta.toFixed(2));
      if (delta > 0) {
        trendDirection = 'up';
      } else if (delta < 0) {
        trendDirection = 'down';
      }
    }
  }

  const averageMonthlySpend =
    historicalExpenses.length === 0
      ? 0
      : Number(
          (
            historicalExpenses.reduce((sum, month) => sum + month.total, 0) /
            historicalExpenses.length
          ).toFixed(2)
        );

  return {
    historicalExpenses,
    historicalIncome,
    averageMonthlySpend,
    monthOverMonthChange,
    trendDirection,
  };
};

export const sumByCategory = (records: Array<{ category?: string | null; amount: number }>) => {
  const map = new Map<string, number>();

  records.forEach((record) => {
    const category = record.category || 'Other';
    map.set(category, (map.get(category) || 0) + Number(record.amount || 0));
  });

  return Array.from(map.entries()).map(([category, amount]) => ({
    category,
    amount: Number(amount.toFixed(2)),
  }));
};
