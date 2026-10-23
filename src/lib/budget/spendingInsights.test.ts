import { buildRecentSpending } from "./recentSpending";
import { emptyMoneyPreferences, type MoneyRow } from "./moneyPlanner";
import { spendingFacts } from "./spendingInsights";

const rows: MoneyRow[] = [
  {
    id: "a",
    accountId: "bank",
    transactionDate: "2026-10-20",
    amount: 10.01,
    description: "Tesco",
    direction: "debit",
    transactionType: "normal",
  },
  {
    id: "b",
    accountId: "bank",
    transactionDate: "2026-10-20",
    amount: 3.02,
    description: "Lidl",
    direction: "debit",
    transactionType: "normal",
  },
  {
    id: "c",
    accountId: "bank",
    transactionDate: "2026-10-22",
    amount: 300,
    description: "Private payee",
    direction: "debit",
    transactionType: "normal",
  },
];
const report = (complete = false) =>
  buildRecentSpending({
    days: 7,
    referenceDate: "2026-10-23",
    accountIds: ["bank"],
    transactions: rows,
    imports: [
      {
        accountId: "bank",
        statementStart: "2026-09-01",
        statementEnd: complete ? "2026-10-23" : "2026-10-22",
      },
    ],
    preferences: emptyMoneyPreferences(),
  });

test("actionable facts separate review, groceries, cash timing and incomplete comparisons without exposing narratives", () => {
  const facts = spendingFacts(report());
  expect(facts.find((fact) => fact.id === "review")).toMatchObject({
    category: "Needs review",
    evidence: "£300.00 across 1 outgoing payment needs a purpose.",
  });
  expect(facts.find((fact) => fact.id === "groceries")?.evidence).toContain(
    "2 grocery payments on 1 recorded date, totalling £13.03",
  );
  expect(facts.find((fact) => fact.id === "groceries")?.evidence).toContain(
    "do not prove separate shop visits",
  );
  expect(facts.find((fact) => fact.id === "pressure")?.evidence).toContain(
    "£300.00",
  );
  expect(facts.find((fact) => fact.id === 'pressure')?.reviewMonth).toBe('2026-10');
  expect(facts.find((fact) => fact.id === "comparison")).toBeUndefined();
  expect(JSON.stringify(facts)).not.toContain("Private payee");
  expect(JSON.stringify(facts)).not.toContain("bank");
});
test("only complete periods produce a comparison fact", () => {
  expect(
    spendingFacts(report(true)).find((fact) => fact.id === "comparison"),
  ).toBeDefined();
});

test('a peak-day drill-down follows the actual payment month across a rolling period', () => {
  const value = buildRecentSpending({ days: 90, referenceDate: '2026-10-23', accountIds: ['bank'], transactions: [{ ...rows[2], transactionDate: '2026-09-30' }], imports: [], preferences: emptyMoneyPreferences() });
  expect(spendingFacts(value).find(fact => fact.id === 'pressure')?.reviewMonth).toBe('2026-09');
});
test("no coverage is unavailable rather than a saving opportunity", () => {
  const none = buildRecentSpending({
    days: 7,
    referenceDate: "2026-10-23",
    accountIds: [],
    transactions: [],
    imports: [],
    preferences: emptyMoneyPreferences(),
  });
  expect(spendingFacts(none)).toHaveLength(1);
  expect(spendingFacts(none)[0].evidence).toContain("not zero spending");
});
test("daily chart keeps covered zero days, observed unverified payments, and null missing days distinct", () => {
  const value = report();
  expect(value.daily).toHaveLength(7);
  expect(value.daily.find((day) => day.date === "2026-10-20")).toEqual({
    date: "2026-10-20",
    outgoing: 13.03,
    covered: true,
  });
  expect(value.daily.find((day) => day.date === "2026-10-21")).toEqual({
    date: "2026-10-21",
    outgoing: 0,
    covered: true,
  });
  expect(value.daily.find((day) => day.date === "2026-10-23")).toEqual({
    date: "2026-10-23",
    outgoing: null,
    covered: false,
  });
  expect(
    value.daily.reduce(
      (sum, day) => sum + Math.round((day.outgoing ?? 0) * 100),
      0,
    ) / 100,
  ).toBe(value.summary.outgoing);
});
