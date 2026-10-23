"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowLeftRight,
  Search,
  ShieldCheck,
  Wallet,
  ShoppingBag,
} from "lucide-react";
import type { RecentSpendingReport } from "@/lib/budget/recentSpending";
import { cashFlowDate, cashFlowMoney } from "@/lib/budget/cashFlow";

const colours = [
  "#087f73",
  "#2985d3",
  "#e6a321",
  "#8b5bc1",
  "#38aaa3",
  "#dd657b",
  "#597d98",
];
const amount = (value: number | null) =>
  value === null ? "Unavailable" : cashFlowMoney(value);

export function MoneyVisualOverview({
  report,
  onCategory,
  onReview,
}: {
  report: RecentSpendingReport;
  onCategory: (category: string) => void;
  onReview: () => void;
}) {
  const id = useId().replace(/:/g, "");
  const categories = report.categories.filter((item) => item.count > 0);
  const segments = [
    ...categories.map((item, index) => ({
      name: item.category,
      value: item.amount,
      colour: colours[index % colours.length],
    })),
    ...(report.summary.review
      ? [
          {
            name: "Needs review",
            value: report.summary.review,
            colour: "#c7cfd9",
          },
        ]
      : []),
    ...(report.summary.transfers
      ? [
          {
            name: "Transfers",
            value: report.summary.transfers,
            colour: "#b9b0df",
          },
        ]
      : []),
  ];
  const stats = [
    {
      label: "Recorded money out",
      value: report.summary.outgoing,
      icon: Wallet,
      style: "bg-teal-800 text-white",
      detail: "All recorded outgoing payments",
    },
    {
      label: "Identified spending",
      value: report.summary.spending,
      icon: ShoppingBag,
      style:
        "bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100",
      detail: "Confirmed or recognisable purposes",
    },
    {
      label: "Purpose to check",
      value: report.summary.review,
      icon: Search,
      style: "bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
      detail: report.summary.outgoing
        ? `${(((report.summary.review ?? 0) / report.summary.outgoing) * 100).toFixed(1)}% of recorded money out`
        : "Review imported payments",
    },
    {
      label: "Transfers, not spending",
      value: report.summary.transfers,
      icon: ArrowLeftRight,
      style:
        "bg-indigo-50 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-100",
      detail: "Kept out of category spending",
    },
  ];
  return (
    <div className="mt-5 space-y-5">
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, style, detail }) => (
          <div key={label} className={`min-w-0 rounded-lg p-3 sm:p-5 ${style}`}>
            <dt className="flex items-center gap-2 text-xs font-medium sm:text-sm"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 opacity-80" />{label}</dt>
            <dd className="mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl">
              {amount(value)}
            </dd>
            <p className="mt-2 text-[11px] leading-4 opacity-80 sm:text-xs sm:leading-5">{detail}</p>
          </div>
        ))}
      </dl>
      <div className="grid min-w-0 gap-6 border-y border-slate-200 py-5 dark:border-slate-700 lg:grid-cols-2">
        <section className="min-w-0" aria-label="Recorded outgoing trend">
          <h3 className="font-semibold">When money went out</h3>
          <p className="mt-1 text-xs text-slate-500">
            Daily recorded outgoings · gaps mean missing coverage
          </p>
          <div
            className="mt-4 h-56 w-full min-w-0"
            role="img"
            aria-label={`Daily recorded outgoing payments from ${cashFlowDate(report.start)} to ${cashFlowDate(report.end)}. Exact payments are listed below.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={report.daily ?? []}
                margin={{ top: 10, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#12998b" stopOpacity={0.4} />
                    <stop
                      offset="100%"
                      stopColor="#12998b"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="date"
                  minTickGap={48}
                  tickFormatter={(date) => cashFlowDate(date)}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  width={48}
                  tickFormatter={(value) =>
                    `£${value >= 1000 ? `${value / 1000}k` : value}`
                  }
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  labelFormatter={(value) => cashFlowDate(String(value))}
                  formatter={(value) => [
                    cashFlowMoney(Number(value)),
                    "Recorded money out",
                  ]}
                />
                <Area
                  type="linear"
                  dataKey="outgoing"
                  stroke="#087f73"
                  strokeWidth={2}
                dot={{ r: 2 }}
                  fill={`url(#${id})`}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="min-w-0" aria-label="Where recorded money went">
          <h3 className="font-semibold">Where the money went</h3>
          <p className="mt-1 text-xs text-slate-500">
            Includes unreviewed purposes, not guessed categories
          </p>
          {segments.length ? (
            <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div
                className="relative mx-auto h-48 w-48 sm:w-full"
                role="img"
                aria-label={`Recorded outgoing total ${amount(report.summary.outgoing)}. Breakdown follows.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segments}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {segments.map((item) => (
                        <Cell key={item.name} fill={item.colour} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => cashFlowMoney(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-sm tabular-nums">
                    {amount(report.summary.outgoing)}
                  </strong>
                  <span className="mt-1 text-[11px] text-slate-500">
                    Recorded out
                  </span>
                </div>
              </div>
              <div className="min-w-0 divide-y divide-slate-100 dark:divide-slate-800">
                {segments.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => onCategory(item.name)}
                    className="flex min-h-11 w-full min-w-0 items-center gap-2 py-2 text-left text-xs"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.colour }}
                    />
                    <span className="min-w-0 flex-1 break-words">
                      {item.name}
                    </span>
                    <span className="text-slate-500">
                      {report.summary.outgoing
                        ? (
                            (item.value / report.summary.outgoing) *
                            100
                          ).toFixed(1)
                        : "0"}
                      %
                    </span>
                    <strong className="tabular-nums">
                      {amount(item.value)}
                    </strong>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">
              No recorded outgoing payments in this period.
            </p>
          )}
        </section>
      </div>
      <section
        className="grid gap-4 border-b border-slate-200 pb-5 dark:border-slate-700 sm:grid-cols-2"
        aria-label="Bank coverage and next action"
      >
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-teal-700" />
            Bank coverage
          </h3>
          <p className="mt-2 text-lg font-semibold">
            {report.coveredDays} of {report.days} days
          </p>
          <div
            role="progressbar"
            aria-label="Imported bank coverage"
            aria-valuemin={0}
            aria-valuemax={report.days}
            aria-valuenow={report.coveredDays}
            className="mt-2 h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700"
          >
            <div
              className="h-full bg-teal-600"
              style={{ width: `${(report.coveredDays / report.days) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {report.sourceThrough
              ? `Source through ${cashFlowDate(report.sourceThrough)}.`
              : "No bank data imported."}{" "}
            {report.coverage !== "complete"
              ? "Missing days are not treated as zero."
              : "All connected accounts covered."}
          </p>
        </div>
        <div className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-5 dark:sm:border-slate-700">
          <h3 className="text-sm font-semibold">Your next step</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {report.summary.review
              ? `${amount(report.summary.review)} needs a purpose before the spending picture is complete.`
              : "Review the month to confirm categories and set your own spending targets."}
          </p>
          <button
            type="button"
            onClick={onReview}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"
          >
            Review transactions
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
