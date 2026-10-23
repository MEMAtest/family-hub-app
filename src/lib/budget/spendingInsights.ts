import type { RecentSpendingReport } from "./recentSpending";
import { cashFlowDate, cashFlowMoney } from "./cashFlow";

export type SpendingFact = {
  id: string;
  title: string;
  evidence: string;
  action: string;
  category?: string;
};

export function spendingFacts(report: RecentSpendingReport): SpendingFact[] {
  if (report.coverage === "none")
    return [
      {
        id: "coverage",
        title: "Bring your bank data up to date",
        evidence:
          "No imported coverage for this period. This is not zero spending.",
        action: "Open Bank source to check the latest import.",
      },
    ];
  const facts: SpendingFact[] = [];
  if (report.summary.review) {
    const count = report.transactions.filter(
      (row) => row.direction === "debit" && row.kind === "review",
    ).length;
    facts.push({
      id: "review",
      title: "Start with the payments we cannot explain yet",
      evidence: `${cashFlowMoney(report.summary.review)} across ${count} outgoing ${count === 1 ? "payment" : "payments"} needs a purpose.`,
      action: "Review these before deciding which categories to cut.",
      category: "Needs review",
    });
  }
  const largest = report.categories.find((item) => item.count > 0);
  if (largest)
    facts.push({
      id: "category",
      title: `${largest.category} is the largest identified category`,
      evidence: `${cashFlowMoney(largest.amount)} across ${largest.count} payments in this period.`,
      action:
        "Open the payments and separate essential costs from choices you can change.",
      category: largest.category,
    });
  const grocery = report.transactions.filter(
    (row) =>
      row.direction === "debit" &&
      row.kind === "spend" &&
      row.category === "Groceries",
  );
  const groceryDates = new Set(
    grocery.map((row) => row.transactionDate.slice(0, 10)),
  );
  if (grocery.length > 1)
    facts.push({
      id: "groceries",
      title: "Could one grocery plan replace several payments?",
      evidence: `${grocery.length} grocery payments on ${groceryDates.size} recorded ${groceryDates.size === 1 ? "date" : "dates"}, totalling ${cashFlowMoney(grocery.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100)}. Payments do not prove separate shop visits.`,
      action:
        "Check these against your meal plan before your next shop. Combining shops may help, but no saving is assumed.",
      category: "Groceries",
    });
  const daily = (report.daily ?? [])
    .filter((day) => day.outgoing !== null && day.outgoing > 0)
    .sort((a, b) => b.outgoing! - a.outgoing!);
  if (daily[0])
    facts.push({
      id: "pressure",
      title: "When money left fastest",
      evidence: `${cashFlowDate(daily[0].date)} had ${cashFlowMoney(daily[0].outgoing!)} of recorded money out.`,
      action:
        "Review the month around this date and plan cash for clustered bills. A large payment day is not automatically waste.",
    });
  if (report.previous.change !== null)
    facts.push({
      id: "comparison",
      title: "Compared with the previous equal period",
      evidence: `Identified spending is ${cashFlowMoney(Math.abs(report.previous.change))} ${report.previous.change >= 0 ? "higher" : "lower"}. Both periods have full imported coverage.`,
      action: "Check which categories changed before adjusting your targets.",
    });
  else
    facts.push({
      id: "coverage",
      title: "A reliable comparison needs complete periods",
      evidence: `${report.coveredDays} of ${report.days} days covered in this period. A percentage change is not reliable yet.`,
      action: "Update Bank source before treating a drop as a saving.",
    });
  return facts;
}
