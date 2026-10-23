import {
  buildMoneyReport,
  classifyMoneyTransaction,
  type MoneyImport,
  type MoneyPreferences,
  type MoneyReport,
  type MoneyRow,
} from "./moneyPlanner";

type Payment = MoneyReport["transactions"][number];
export const supplierKey = (row: Payment) =>
  row.merchantName ? `merchant:${row.merchantName}` : row.merchantKey;
export const supplierName = (row: Payment) =>
  row.merchantName ??
  /^(?:direct debit\s+|transfer mob,\s*)([^,]+)/i
    .exec(row.description)?.[1]
    .trim() ??
  row.description;
export type SupplierPattern = {
  key: string;
  name: string;
  timing: string;
  monthly: boolean;
  count: number;
  lastDate: string;
  lastAmount: number;
  months: Array<{
    month: string;
    amount: number | null;
    count: number;
    coverage: "complete" | "partial" | "none";
  }>;
  change: number | null;
  changePercent: number | null;
};
export type PaymentContext = {
  months: MoneyReport["months"];
  suppliers: SupplierPattern[];
};

export function paymentHistoryStart(end: string) {
  return new Date(
    Date.UTC(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 6, 1),
  )
    .toISOString()
    .slice(0, 10);
}

export function buildPaymentContext(input: {
  end: string;
  accountIds: string[];
  transactions: MoneyRow[];
  imports: MoneyImport[];
  preferences: MoneyPreferences;
}): PaymentContext {
  // Reuse the monthly classifier and coverage rules; only return aggregates, not historical raw narratives.
  const report = buildMoneyReport({
    ...input,
    month: input.end.slice(0, 7),
    now: input.end,
    transactions: input.transactions.filter(
      (row) => row.transactionDate.slice(0, 10) <= input.end,
    ),
  });
  const groups = new Map<string, Payment[]>();
  const start = paymentHistoryStart(input.end);
  for (const original of input.transactions) {
    const date = original.transactionDate.slice(0, 10);
    const parsed = new Date(`${date}T00:00:00Z`);
    if (
      !input.accountIds.includes(original.accountId) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date ||
      date < start ||
      date > input.end ||
      original.direction !== "debit" ||
      original.amount <= 0 ||
      !Number.isSafeInteger(Math.round(original.amount * 100))
    )
      continue;
    const row = classifyMoneyTransaction(
      { ...original, transactionDate: date },
      input.preferences,
    );
    const key = supplierKey(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  const suppliers = [...groups.entries()].map(
    ([key, payments]): SupplierPattern => {
      payments.sort((a, b) =>
        a.transactionDate.localeCompare(b.transactionDate),
      );
      const byMonth = new Map<string, Payment[]>();
      for (const row of payments) {
        const month = row.transactionDate.slice(0, 7);
        byMonth.set(month, [...(byMonth.get(month) ?? []), row]);
      }
      const gaps = payments
        .slice(1)
        .map(
          (row, index) =>
            (Date.parse(row.transactionDate) -
              Date.parse(payments[index].transactionDate)) /
            86_400_000,
        );
      const days = payments.map((row) =>
        Number(row.transactionDate.slice(8, 10)),
      );
      const monthly =
        payments.length >= 3 &&
        [...byMonth.values()].every((rows) => rows.length === 1) &&
        gaps.every((gap) => gap >= 21 && gap <= 40);
      const firstDay = Math.min(...days),
        lastDay = Math.max(...days);
      const timing =
        monthly && lastDay - firstDay <= 6
          ? `Usually around day ${firstDay === lastDay ? firstDay : `${firstDay}-${lastDay}`} of the month · ${payments.length} observed payments`
          : monthly && days.every((day) => day >= 25 || day <= 4)
            ? `Usually around month-end · ${payments.length} observed payments`
            : monthly
              ? `Roughly monthly; date varies · ${payments.length} observed payments`
              : payments.length < 3
                ? "Not enough payments to establish a regular pattern"
                : `${payments.length} payments across ${byMonth.size} months · no fixed monthly bill pattern`;
      const months = report.months.map((month) => {
        const rows = byMonth.get(month.month) ?? [];
        return {
          month: month.month,
          coverage: month.coverage,
          count: rows.length,
          amount:
            month.coverage === "none"
              ? null
              : rows.reduce(
                  (sum, row) => sum + Math.round(row.amount * 100),
                  0,
                ) / 100,
        };
      });
      const comparable =
        months[0].coverage === "complete" && months[1].coverage === "complete";
      const change = comparable
        ? Math.round((months[1].amount! - months[0].amount!) * 100) / 100
        : null;
      return {
        key,
        name: supplierName(payments[payments.length - 1]),
        count: payments.length,
        timing,
        monthly,
        lastDate: payments[payments.length - 1].transactionDate,
        lastAmount: payments[payments.length - 1].amount,
        months,
        change,
        changePercent:
          change !== null && months[0].amount! > 0
            ? (change / months[0].amount!) * 100
            : null,
      };
    },
  );
  return { months: report.months, suppliers };
}
