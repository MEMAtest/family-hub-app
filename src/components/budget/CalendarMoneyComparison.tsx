"use client";

import { cashFlowMoney, cashFlowMonth } from "@/lib/budget/cashFlow";
import type {
  PaymentContext,
  SupplierPattern,
} from "@/lib/budget/paymentPatterns";

export function CalendarMoneyComparison({
  months,
}: {
  months: PaymentContext["months"];
}) {
  if (months.length !== 3) return null;
  const [before, last, current] = months;
  const change =
    before.coverage === "complete" && last.coverage === "complete"
      ? Math.round((last.outgoing! - before.outgoing!) * 100) / 100
      : null;
  return (
    <section
      aria-label="Calendar month comparison"
      className="mt-4 border-y border-slate-200 py-3 text-sm dark:border-slate-700"
    >
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-semibold">Calendar months</h3>
        <span>
          {cashFlowMonth(current.month)} so far:{" "}
          <strong>
            {current.outgoing === null
              ? "Unavailable"
              : cashFlowMoney(current.outgoing)}
          </strong>
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Current month is unfinished; not compared with a full month.
      </p>
      <p className="mt-2 text-sm">
        {cashFlowMonth(last.month)}:{" "}
        <strong>
          {last.outgoing === null
            ? "Unavailable"
            : cashFlowMoney(last.outgoing)}
        </strong>{" "}
        · {cashFlowMonth(before.month)}:{" "}
        <strong>
          {before.outgoing === null
            ? "Unavailable"
            : cashFlowMoney(before.outgoing)}
        </strong>
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        {change === null
          ? "Full-month change unavailable: one or both months have incomplete bank coverage."
          : `${cashFlowMoney(Math.abs(change))} ${change === 0 ? "change" : change > 0 ? "higher" : "lower"} in ${cashFlowMonth(last.month)}${before.outgoing! > 0 ? ` (${((Math.abs(change) / before.outgoing!) * 100).toFixed(1)}%)` : ""} · two complete calendar months, recorded money out.`}
      </p>
    </section>
  );
}

export function SupplierHistory({ supplier }: { supplier: SupplierPattern }) {
  const max = Math.max(1, ...supplier.months.map((month) => month.amount ?? 0));
  return (
    <section
      aria-label="Supplier payment pattern"
      className="border-y border-slate-200 py-3 dark:border-slate-700"
    >
      <h3 className="font-semibold">{supplier.name}</h3>
      <p className="mt-1 text-sm text-teal-800 dark:text-teal-200">
        {supplier.timing}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Observed history, not a confirmed due date. Last payment{" "}
        {supplier.lastDate.slice(0, 10)} · {cashFlowMoney(supplier.lastAmount)}.
      </p>
      <div className="mt-3 space-y-2">
        {supplier.months.map((month, index) => (
          <div
            key={month.month}
            className="grid grid-cols-[100px_minmax(0,1fr)_80px] items-center gap-2 text-xs"
          >
            <span>
              {cashFlowMonth(month.month)}
              {index === 2
                ? " so far"
                : month.coverage !== "complete"
                  ? " (partial)"
                  : ""}
            </span>
            <div className="h-2 bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-teal-600"
                style={{ width: `${((month.amount ?? 0) / max) * 100}%` }}
              />
            </div>
            <strong className="text-right tabular-nums">
              {month.amount === null
                ? "Unavailable"
                : cashFlowMoney(month.amount)}
            </strong>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs">
        {supplier.change === null
          ? "A full-month comparison needs two complete prior months."
          : `${cashFlowMonth(supplier.months[1].month)} vs ${cashFlowMonth(supplier.months[0].month)}: ${cashFlowMoney(Math.abs(supplier.change))} ${supplier.change > 0 ? "higher" : supplier.change < 0 ? "lower" : "change"}${supplier.changePercent === null ? "" : ` (${Math.abs(supplier.changePercent).toFixed(1)}%)`}.`}
      </p>
    </section>
  );
}
