import { buildPaymentContext, paymentHistoryStart } from "./paymentPatterns";
import { emptyMoneyPreferences, type MoneyRow } from "./moneyPlanner";

const row = (
  date: string,
  amount = 100,
  description = "Direct Debit Netflix",
  accountId = "a",
  direction = "debit",
): MoneyRow => ({
  id: `${date}-${amount}`,
  accountId,
  description,
  amount,
  direction,
  transactionType: "normal",
  transactionDate: date,
});
const base = {
  end: "2026-10-23",
  accountIds: ["a"],
  preferences: emptyMoneyPreferences(),
  imports: [
    {
      accountId: "a",
      statementStart: "2026-01-01",
      statementEnd: "2026-10-20",
    },
  ],
};

test("shows observed monthly timing and compares completed calendar months, never an unfinished current month", () => {
  const result = buildPaymentContext({
    ...base,
    transactions: [
      row("2026-08-01", 10),
      row("2026-09-02", 12),
      row("2026-10-01", 11),
    ],
  });
  expect(result.suppliers[0]).toMatchObject({
    monthly: true,
    timing: "Usually around day 1-2 of the month · 3 observed payments",
    change: 2,
    changePercent: 20,
  });
  expect(
    result.months.map((month) => [month.month, month.outgoing, month.coverage]),
  ).toEqual([
    ["2026-08", 10, "complete"],
    ["2026-09", 12, "complete"],
    ["2026-10", 11, "partial"],
  ]);
});

test("does not promise a monthly due date for a supermarket with several payments in a month", () => {
  const result = buildPaymentContext({
    ...base,
    transactions: [
      row("2026-08-01", 20, "Tesco"),
      row("2026-09-01", 30, "Tesco"),
      row("2026-09-03", 40, "Tesco"),
    ],
  });
  expect(result.suppliers[0]).toMatchObject({
    monthly: false,
    timing: "3 payments across 2 months · no fixed monthly bill pattern",
  });
});

test("irregular gaps and multiple payments in one month do not become a monthly bill", () => {
  const irregular = buildPaymentContext({
    ...base,
    transactions: [row("2026-06-01"), row("2026-08-01"), row("2026-09-01")],
  });
  expect(irregular.suppliers[0].monthly).toBe(false);
  const end = buildPaymentContext({
    ...base,
    transactions: [row("2026-07-31"), row("2026-09-01"), row("2026-09-30")],
  });
  expect(end.suppliers[0].monthly).toBe(false);
});

test("unknown bank payments stay unresolved even with a regular pattern; other accounts, credits and future rows are excluded", () => {
  const result = buildPaymentContext({
    ...base,
    transactions: [
      row("2026-08-01", 300, "Direct Debit Halifax, reference"),
      row("2026-09-01", 300, "Direct Debit Halifax, reference"),
      row("2026-10-01", 300, "Direct Debit Halifax, reference"),
      row("2026-10-24", 999),
      row("2026-09-01", 999, "Tesco", "other"),
      row("2026-09-01", 999, "Netflix", "a", "credit"),
    ],
  });
  expect(result.suppliers).toHaveLength(1);
  expect(result.suppliers[0]).toMatchObject({
    name: "Halifax",
    monthly: true,
    count: 3,
  });
  expect(result.months[1]).toMatchObject({
    outgoing: 300,
    spending: 0,
    reviewAmount: 300,
  });
});

test("missing account coverage suppresses full-month change and does not imply zero supplier spending", () => {
  const result = buildPaymentContext({
    ...base,
    accountIds: ["a", "b"],
    imports: [],
    transactions: [row("2026-09-01")],
  });
  expect(result.suppliers[0].change).toBeNull();
  expect(result.suppliers[0].months[0]).toMatchObject({
    amount: null,
    coverage: "none",
  });
});

test("uses integer pence, bounds six-month history, and handles the year boundary", () => {
  expect(paymentHistoryStart("2026-02-10")).toBe("2025-09-01");
  const result = buildPaymentContext({
    ...base,
    transactions: [
      row("2026-09-01", 0.1),
      row("2026-09-01", 0.2),
      row("2026-04-30", 999),
      row("invalid", 5),
    ],
  });
  expect(result.suppliers[0].months[1].amount).toBe(0.3);
  expect(result.suppliers[0].count).toBe(2);
});
