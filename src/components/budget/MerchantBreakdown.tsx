"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Store } from "lucide-react";
import type { MoneyReport } from "@/lib/budget/moneyPlanner";
import { cashFlowMoney } from "@/lib/budget/cashFlow";

export function MerchantBreakdown({
  transactions,
  onSelect,
}: {
  transactions: MoneyReport["transactions"];
  onSelect: (merchant: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const merchants = useMemo(() => {
    const groups = new Map<
      string,
      { name: string; pence: number; count: number; categories: Set<string> }
    >();
    for (const row of transactions) {
      if (
        !row.merchantName ||
        row.kind !== "spend" ||
        row.direction !== "debit"
      )
        continue;
      const group = groups.get(row.merchantName) ?? {
        name: row.merchantName,
        pence: 0,
        count: 0,
        categories: new Set<string>(),
      };
      group.pence += Math.round(row.amount * 100);
      group.count++;
      group.categories.add(row.category);
      groups.set(row.merchantName, group);
    }
    return [...groups.values()].sort(
      (a, b) => b.pence - a.pence || a.name.localeCompare(b.name),
    );
  }, [transactions]);
  if (!merchants.length) return null;
  return (
    <section
      aria-label="Shops and providers"
      className="mt-6 min-w-0 border-t border-slate-200 pt-5 dark:border-slate-700"
    >
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Store className="h-4 w-4 text-teal-700" />
        Shops and providers{" "}
        <span className="text-sm font-normal text-slate-500">
          {merchants.length}
        </span>
      </h3>
      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {(expanded ? merchants : merchants.slice(0, 8)).map((merchant) => (
          <button
            key={merchant.name}
            type="button"
            onClick={() => onSelect(merchant.name)}
            aria-label={`View ${merchant.name} payments`}
            className="flex min-h-14 w-full items-center gap-3 py-3 text-left hover:bg-teal-50 dark:hover:bg-teal-950"
          >
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm font-medium">
                {merchant.name}
              </span>
              <span className="mt-1 block break-words text-xs text-slate-500">
                {[...merchant.categories].sort().join(" / ")} · {merchant.count}{" "}
                {merchant.count === 1 ? "payment" : "payments"}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {cashFlowMoney(merchant.pence / 100)}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-teal-700"
            />
          </button>
        ))}
      </div>
      {merchants.length > 8 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-teal-800 dark:text-teal-300"
        >
          {expanded
            ? "Show fewer shops"
            : `Show all ${merchants.length} shops and providers`}
          <ChevronDown className={`h-4 w-4 ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </section>
  );
}
