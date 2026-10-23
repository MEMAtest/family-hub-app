"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RecentSpendingReport } from "@/lib/budget/recentSpending";
import { supplierKey, supplierName } from "@/lib/budget/paymentPatterns";
import {
  cashFlowDate,
  cashFlowMoney,
  cashFlowMonth,
} from "@/lib/budget/cashFlow";

export function MoneyExtraCharts({
  report,
  mode,
  onMonth,
  onSupplier,
  onDate,
}: {
  report: RecentSpendingReport;
  mode: "months" | "payees" | "calendar";
  onMonth: (month: string) => void;
  onSupplier: (key: string) => void;
  onDate: (date: string) => void;
}) {
  if (mode === "months") {
    const months = report.context?.months ?? [];
    return (
      <section aria-label="Calendar month money chart">
        <h3 className="font-semibold">Calendar-month money out</h3>
        <p className="mt-1 text-xs text-slate-500">
          Completed months and the unfinished current month. Missing bank
          coverage is not treated as zero.
        </p>
        <div
          className="mt-3 h-44 min-w-0"
          role="img"
          aria-label="Three calendar months of recorded outgoing payments, split by purpose"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={months}
              margin={{ left: 0, right: 8, top: 4, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={(value) => cashFlowMonth(String(value))}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                width={52}
                tickFormatter={(value) =>
                  `£${Number(value).toLocaleString("en-GB", { notation: "compact" })}`
                }
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                labelFormatter={(value) => cashFlowMonth(String(value))}
                formatter={(value) => cashFlowMoney(Number(value))}
              />
              <Bar
                dataKey="spending"
                name="Identified spending"
                stackId="out"
                fill="#168b7d"
                isAnimationActive={false}
              />
              <Bar
                dataKey="reviewAmount"
                name="Purpose to check"
                stackId="out"
                fill="#e0ab43"
                isAnimationActive={false}
              />
              <Bar
                dataKey="transferAmount"
                name="Transfers"
                stackId="out"
                fill="#608ad1"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 bg-teal-600" />
            Identified
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 bg-amber-400" />
            Purpose to check
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 bg-blue-400" />
            Transfers
          </span>
        </div>
        <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {months.map((month, index) => (
            <button
              key={month.month}
              type="button"
              aria-label={`Review ${cashFlowMonth(month.month)} payments`}
              onClick={() => onMonth(month.month)}
              className="flex min-h-11 w-full items-center justify-between gap-2 py-2 text-left text-xs"
            >
              <span>
                {cashFlowMonth(month.month)}
                {index === 2
                  ? " so far"
                  : month.coverage !== "complete"
                    ? " (partial)"
                    : ""}
              </span>
              <strong className="tabular-nums">
                {month.outgoing === null
                  ? "Unavailable"
                  : cashFlowMoney(month.outgoing)}
              </strong>
            </button>
          ))}
        </div>
      </section>
    );
  }
  if (mode === "payees") {
    const groups = new Map<
      string,
      { key: string; name: string; pence: number; count: number }
    >();
    for (const row of report.transactions.filter(
      (row) => row.direction === "debit",
    )) {
      const key = supplierKey(row),
        group = groups.get(key) ?? {
          key,
          name: supplierName(row),
          pence: 0,
          count: 0,
        };
      group.pence += Math.round(row.amount * 100);
      group.count++;
      groups.set(key, group);
    }
    const payees = [...groups.values()]
      .sort((a, b) => b.pence - a.pence)
      .slice(0, 5)
      .map((group) => ({ ...group, amount: group.pence / 100 }));
    return (
      <section aria-label="Top payees chart">
        <h3 className="font-semibold">Largest payees</h3>
        <p className="mt-1 text-xs text-slate-500">
          Top five by recorded money out, including bills awaiting a purpose.
        </p>
        {payees.length ? (
          <>
            <div
              className="mt-3 h-40 min-w-0"
              role="img"
              aria-label="Top five payees by outgoing amount"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={payees}
                  layout="vertical"
                  margin={{ left: 0, right: 12, top: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(value) =>
                      `£${Number(value).toLocaleString("en-GB", { notation: "compact" })}`
                    }
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    tickFormatter={(value) =>
                      String(value).length > 13
                        ? `${String(value).slice(0, 12)}…`
                        : String(value)
                    }
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value) => cashFlowMoney(Number(value))}
                  />
                  <Bar
                    dataKey="amount"
                    name="Recorded money out"
                    fill="#3486c6"
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {payees.map((payee) => (
                <button
                  key={payee.key}
                  type="button"
                  aria-label={`Open ${payee.name} supplier history`}
                  onClick={() => onSupplier(payee.key)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-xs"
                >
                  <span className="min-w-0 break-words">
                    {payee.name} · {payee.count}{" "}
                    {payee.count === 1 ? "payment" : "payments"}
                  </span>
                  <strong className="shrink-0 tabular-nums">
                    {cashFlowMoney(payee.amount)}
                  </strong>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="py-8 text-sm text-slate-500">
            No outgoing payees recorded for this period.
          </p>
        )}
      </section>
    );
  }
  const month = report.end.slice(0, 7),
    year = Number(month.slice(0, 4)),
    index = Number(month.slice(5, 7)) - 1;
  const offset = (new Date(Date.UTC(year, index, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const max = Math.max(1, ...report.daily.map((day) => day.outgoing ?? 0));
  return (
    <section aria-label="Bill payment calendar">
      <h3 className="font-semibold">Payment days · {cashFlowMonth(month)}</h3>
      <p className="mt-1 text-xs text-slate-500">
        Recorded daily money out within the selected period. Darker squares mean
        larger outgoings.
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span key={day}>{day}</span>
        ))}
        {Array.from({ length: offset }, (_, day) => (
          <span key={`empty-${day}`} aria-hidden="true" />
        ))}
        {Array.from({ length: days }, (_, day) => {
          const date = `${month}-${String(day + 1).padStart(2, "0")}`,
            row = report.daily.find((row) => row.date === date),
            value = row?.outgoing;
          const strength =
            value === null || value === undefined ? 0 : Math.sqrt(value / max);
          const label =
            value === null
              ? "Bank coverage missing"
              : value === undefined
                ? date > report.end
                  ? "Future day"
                  : "Outside selected period"
                : cashFlowMoney(value);
          return (
            <button
              key={date}
              type="button"
              disabled={value === null || value === undefined}
              aria-label={`${cashFlowDate(date)}: ${label}`}
              title={`${cashFlowDate(date)}: ${label}`}
              onClick={() => onDate(date)}
              className={`flex h-12 min-w-0 flex-col items-center justify-center rounded-sm border text-xs disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-800 ${strength > 0.6 ? "text-white" : "text-slate-800 dark:text-slate-200"}`}
              style={
                value && value > 0
                  ? {
                      backgroundColor: `rgba(15,130,118,${0.16 + 0.84 * strength})`,
                      borderColor: "transparent",
                    }
                  : {}
              }
            >
              <span className="font-semibold">{day + 1}</span>
              <span className="mt-1 text-[9px]">
                {value === null || value === undefined
                  ? "—"
                  : value > 0
                    ? `£${value.toLocaleString("en-GB", { notation: "compact", maximumFractionDigits: 1 })}`
                    : "£0"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
