"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  RefreshCw,
  Search,
  ShoppingCart,
  Target,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MONEY_CATEGORIES,
  type MoneyKind,
  type MoneyPreferences,
  type MoneyReport,
} from "@/lib/budget/moneyPlanner";
import {
  cashFlowDate,
  cashFlowMoney,
  cashFlowMonth,
} from "@/lib/budget/cashFlow";

type PlannerData = {
  report: MoneyReport;
  preferences: MoneyPreferences;
  accounts: Array<{ id: string; name: string }>;
};
type Props = { familyId: string | null; month: string; refreshKey?: number };
const money = (value: number | null | undefined) =>
  typeof value === "number" ? cashFlowMoney(value) : "Unavailable";
const shortMonth = (value: string) =>
  new Date(`${value}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
const field =
  "min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700";
const colors = ["#a8b0b8", "#4178b5", "#147c72"];

export function FamilyMoneyPlanner({ familyId, month, refreshKey = 0 }: Props) {
  const [result, setResult] = useState<{
    scope: string;
    data: PlannerData;
  } | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState("Needs review");
  const [applyGroup, setApplyGroup] = useState(true);
  const [targetCategory, setTargetCategory] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const scope = `${familyId ?? ""}:${month}`;
  const activeScope = useRef(scope);
  const paymentsRef = useRef<HTMLElement>(null);
  activeScope.current = scope;
  const data = result?.scope === scope ? result.data : null;
  const report = data?.report;
  const current = report?.months.find((item) => item.month === month);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");
    setLoading(true);
    setReviewId(null);
    setTargetCategory("");
    setCategory("All");
    setQuery("");
    setPage(0);
    if (!familyId) {
      setLoading(false);
      return () => controller.abort();
    }
    const reload = () => {
      fetch(
        `/api/families/${encodeURIComponent(familyId)}/budget/money-planner?month=${month}`,
        { cache: "no-store", signal: controller.signal },
      )
        .then(async (response) => {
          const value = await response.json();
          if (!response.ok)
            throw new Error(
              value.error || "Could not load your money planner.",
            );
          if (
            value.report?.month !== month ||
            !Array.isArray(value.report?.months) ||
            value.report.months.length !== 3 ||
            ![
              "transactions",
              "categories",
              "daily",
              "insights",
              "reviewGroups",
              "targets",
            ].every((key) => Array.isArray(value.report?.[key])) ||
            !Array.isArray(value.preferences?.dismissed) ||
            !Array.isArray(value.accounts)
          )
            throw new Error(
              "The planner response was incomplete. Refresh to try again.",
            );
          if (!controller.signal.aborted) {
            setResult({ scope, data: value });
            setError("");
          }
        })
        .catch((reason) => {
          if (!controller.signal.aborted) {
            setResult(null);
            setError(
              reason instanceof Error
                ? reason.message
                : "Could not load the planner.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    };
    reload();
    return () => controller.abort();
  }, [familyId, month, scope, revision, refreshKey]);

  useEffect(() => {
    setNotice("");
    setSaving(false);
  }, [scope]);

  async function save(action: Record<string, unknown>, message: string) {
    if (!familyId || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/families/${encodeURIComponent(familyId)}/budget/money-planner`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        },
      );
      const value = await response.json();
      if (activeScope.current !== scope) return;
      if (!response.ok)
        throw new Error(value.error || "Your change could not be saved.");
      setNotice(message);
      setRevision((value) => value + 1);
    } catch (reason) {
      if (activeScope.current === scope)
        setNotice(
          reason instanceof Error
            ? reason.message
            : "Could not save. Please retry.",
        );
    } finally {
      if (activeScope.current === scope) setSaving(false);
    }
  }

  const transactions = useMemo(
    () =>
      (report?.transactions ?? []).filter(
        (row) =>
          (category === "All" ||
            (category === "Needs review" && row.kind === "review") ||
            row.category === category) &&
          `${row.description} ${row.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [report, category, query],
  );
  const selectedReview = report?.transactions.find(
    (row) => row.id === reviewId,
  );
  const timeline = useMemo(() => {
    if (!report?.daily.length) return [];
    const byDate = new Map(report.daily.map((day) => [day.date, day]));
    const end = report.daily[report.daily.length - 1].date;
    return Array.from({ length: Number(end.slice(8, 10)) }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, "0")}`;
      return byDate.get(date) ?? { date, cumulative: null };
    });
  }, [report, month]);
  const maxAmount = Math.max(
    1,
    ...(report?.categories.flatMap((item) =>
      item.amounts.filter((value): value is number => value !== null),
    ) ?? []),
  );
  const availableTargetCategories =
    current?.coverage === "complete" &&
    month < new Date().toISOString().slice(0, 7)
      ? current.categories.filter((item) => item.amount > 0)
      : [];
  const targetBaseline = availableTargetCategories.find(
    (item) => item.category === targetCategory,
  )?.amount;

  return (
    <section
      aria-labelledby="family-money-planner-title"
      className="min-w-0 bg-white px-4 py-5 text-slate-900 dark:bg-slate-900 dark:text-slate-100 sm:px-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
        <div>
          <h2 id="family-money-planner-title" className="text-xl font-semibold">
            Where your money went
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {cashFlowMonth(month)}
            {current
              ? ` · ${current.coverage === "complete" ? "Full imported month" : current.coverage === "partial" ? "Partial imported month" : "No imported coverage"}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          className={button}
          aria-label="Refresh money planner"
          title="Refresh money planner"
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>
      {loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Loading bank activity and comparisons...
        </p>
      )}
      {!familyId && (
        <p className="py-6">
          Sign in to your household to view your money planner.
        </p>
      )}
      {error && (
        <p role="alert" className="py-6 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="border-b border-slate-200 py-3 text-sm">
          {notice}
        </p>
      )}
      {!loading && !error && report && current && (
        <>
          <div className="grid grid-cols-2 gap-x-4 border-b border-slate-200 sm:grid-cols-3 sm:divide-x dark:border-slate-700 dark:divide-slate-700">
            {[
              ["Money out", current.outgoing],
              ["Categorised spending", current.spending],
              ["Purpose to check", current.reviewAmount],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="min-w-0 py-3 first:col-span-2 first:border-b first:border-slate-200 sm:px-4 sm:first:col-span-1 sm:first:border-0 sm:first:pl-0 dark:first:border-slate-700"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 break-words text-2xl font-semibold tabular-nums">
                  {money(value as number | null)}
                </p>
              </div>
            ))}
          </div>
          {current.transferAmount !== null && current.transferAmount > 0 && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {money(current.transferAmount)} of money out is recorded as
              transfers, not spending.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            {data.accounts.map((account) => account.name).join(", ") ||
              "No active GBP bank source"}
            {report.sourceThrough
              ? ` · latest activity ${cashFlowDate(report.sourceThrough)}`
              : ""}
            . Categories are suggestions until confirmed. Transfers and
            unclassified payments are separate; money out is not all avoidable
            spending.
          </p>

          <section
            aria-label="Three-month category comparison"
            className="mt-7"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-base font-semibold">Spending by category</h3>
              <div className="flex flex-wrap gap-3 text-xs">
                {report.months.map((item, index) => (
                  <span
                    key={item.month}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      className="h-2 w-2"
                      style={{ backgroundColor: colors[index] }}
                    />
                    {shortMonth(item.month)}{" "}
                    {item.coverage !== "complete"
                      ? "(partial / unavailable)"
                      : ""}
                  </span>
                ))}
              </div>
            </div>
            {report.categories.length === 0 && (
              <p className="py-5 text-sm text-slate-500">
                No categorised spending yet. Check the payments below to
                identify their purpose.
              </p>
            )}
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {report.categories.map((item) => (
                <div key={item.category} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      aria-pressed={category === item.category}
                      className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
                      onClick={() => {
                        setCategory(
                          category === item.category ? "All" : item.category,
                        );
                        setPage(0);
                      }}
                    >
                      {item.category}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${item.change !== null && item.change > 0 ? "text-amber-800 dark:text-amber-300" : "text-slate-500"}`}
                    >
                      {item.change === null ? (
                        "Comparable full months needed"
                      ) : item.change === 0 ? (
                        `No change from ${shortMonth(report.months[1].month)}`
                      ) : (
                        <>
                          {item.change > 0 ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          {money(Math.abs(item.change))}{" "}
                          {item.change > 0 ? "more" : "less"} than{" "}
                          {shortMonth(report.months[1].month)}
                          {item.changePercent !== null
                            ? ` (${Math.abs(item.changePercent).toFixed(0)}%)`
                            : ""}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {item.amounts.map((amount, index) => (
                      <div key={index} className="min-w-0">
                        <div className="mb-1 flex flex-wrap justify-between gap-1 text-xs">
                          <span className="text-slate-500">
                            {shortMonth(report.months[index].month)}
                          </span>
                          <span className="font-medium tabular-nums">
                            {money(amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full"
                            style={{
                              width: `${amount === null ? 0 : (amount / maxAmount) * 100}%`,
                              backgroundColor: colors[index],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {category !== "All" && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {category} · {transactions.length} payments
                </span>
                <button
                  className={button}
                  type="button"
                  onClick={() =>
                    paymentsRef.current?.scrollIntoView({ block: "start" })
                  }
                >
                  View payments
                </button>
              </div>
            )}
          </section>

          <section
            aria-label="Money out timeline"
            className="mt-7 border-t border-slate-200 pt-5 dark:border-slate-700"
          >
            <h3 className="text-base font-semibold">When money leaves</h3>
            {report.pressure && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                <strong>{money(report.pressure.amount)}</strong> left between{" "}
                {cashFlowDate(report.pressure.start)} and{" "}
                {cashFlowDate(report.pressure.end)} (
                {report.pressure.share.toFixed(0)}% of this month&apos;s
                outflow). This includes bills and payments still to classify.
              </p>
            )}
            {current.outgoing === null ? (
              <p className="py-5 text-sm text-slate-500">
                No bank coverage for a timeline.
              </p>
            ) : (
              <div
                className="mt-3 h-56 min-w-0"
                role="img"
                aria-label={`Cumulative money out during ${cashFlowMonth(month)}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timeline}
                    margin={{ left: 0, right: 10, bottom: 0, top: 10 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        String(Number(String(value).slice(8, 10)))
                      }
                      minTickGap={24}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      width={60}
                      tickFormatter={(value) =>
                        `£${Number(value).toLocaleString("en-GB", { notation: "compact" })}`
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      labelFormatter={(value) => cashFlowDate(String(value))}
                      formatter={(value: number) => [
                        money(value),
                        "Cumulative money out",
                      ]}
                    />
                    <Area
                      type="linear"
                      dataKey="cumulative"
                      stroke="#147c72"
                      fill="#147c72"
                      fillOpacity={0.12}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section
            aria-label="Spending insights"
            className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700"
          >
            <h3 className="text-base font-semibold">Patterns worth a look</h3>
            {!report.insights.length && (
              <p className="py-4 text-sm text-slate-500">
                No supported patterns to flag for this month. Unclear payments
                are not being turned into savings claims.
              </p>
            )}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.insights.map((insight) => (
                <article key={insight.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold">{insight.title}</h4>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {insight.detail}
                      </p>
                    </div>
                    <button
                      className="shrink-0 p-2 text-slate-500"
                      type="button"
                      title="Not relevant"
                      aria-label={`Dismiss ${insight.title}`}
                      disabled={saving}
                      onClick={() =>
                        void save(
                          { action: "dismiss", insightId: insight.id },
                          "Insight hidden for this household.",
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {insight.type === "shopping" && (
                      <a className={button} href="/?view=shopping">
                        <ShoppingCart className="h-4 w-4" />
                        Plan next shop
                      </a>
                    )}
                    {insight.category &&
                      availableTargetCategories.some(
                        (item) => item.category === insight.category,
                      ) && (
                        <button
                          type="button"
                          className={button}
                          onClick={() => {
                            setTargetCategory(insight.category!);
                            setTargetAmount("");
                          }}
                        >
                          <Target className="h-4 w-4" />
                          Set a target
                        </button>
                      )}
                  </div>
                </article>
              ))}
            </div>
            {data.preferences.dismissed.length > 0 && (
              <details className="py-3 text-xs text-slate-500">
                <summary className="cursor-pointer">
                  Hidden insights ({data.preferences.dismissed.length})
                </summary>
                <div className="flex flex-wrap gap-2 pt-2">
                  {data.preferences.dismissed.map((id, index) => (
                    <button
                      key={id}
                      type="button"
                      className={button}
                      disabled={saving}
                      onClick={() =>
                        void save(
                          { action: "restore", insightId: id },
                          "Insight restored.",
                        )
                      }
                    >
                      Restore insight {index + 1}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </section>

          <section
            aria-label="Savings scenarios"
            className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold">What could we change?</h3>
              <button
                type="button"
                className={button}
                disabled={!availableTargetCategories.length}
                onClick={() => {
                  setTargetCategory(
                    availableTargetCategories[0]?.category ?? "",
                  );
                  setTargetAmount("");
                }}
              >
                <Target className="h-4 w-4" />
                Set spending target
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Targets are scenarios, not guaranteed savings. Lower spending later
              does not prove that a target caused it.
            </p>
            {report.targets.length > 0 && (
              <p className="mt-3 text-lg font-semibold">
                {money(
                  report.targets.reduce(
                    (total, target) => total + target.potentialSaving,
                    0,
                  ),
                )}{" "}
                potential monthly reduction{" "}
                <span className="text-xs font-normal text-slate-500">
                  · your saved target scenarios, not money already saved
                </span>
              </p>
            )}
            {!availableTargetCategories.length && (
              <p className="mt-2 text-xs text-slate-500">
                Choose a finished month with complete bank coverage and
                categorised spending to set a baseline.
              </p>
            )}
            {targetCategory && (
              <form
                aria-label="Set category target"
                className="mt-4 grid gap-3 border-y border-slate-200 py-4 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (targetAmount.trim() !== "")
                    void save(
                      {
                        action: "target",
                        category: targetCategory,
                        amount: Number(targetAmount),
                        month,
                      },
                      "Target saved across your household devices.",
                    );
                }}
              >
                <label className="text-xs font-medium">
                  Category
                  <select
                    className={`${field} mt-1`}
                    value={targetCategory}
                    onChange={(event) => setTargetCategory(event.target.value)}
                  >
                    {availableTargetCategories.map((item) => (
                      <option key={item.category}>{item.category}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium">
                  Monthly target (£)
                  <input
                    className={`${field} mt-1`}
                    aria-label="Monthly target amount"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    max={targetBaseline}
                    value={targetAmount}
                    onChange={(event) => setTargetAmount(event.target.value)}
                  />
                </label>
                <p className="text-sm">
                  Baseline {money(targetBaseline)} in {cashFlowMonth(month)}.
                  Potential reduction:{" "}
                  {targetAmount.trim() && Number.isFinite(Number(targetAmount))
                    ? money(
                        Math.max(
                          0,
                          (targetBaseline ?? 0) - Number(targetAmount),
                        ),
                      )
                    : "Choose a target"}
                  .
                </p>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    className={button}
                    onClick={() => setTargetCategory("")}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    className={`${button} bg-teal-700 text-white`}
                    type="submit"
                  >
                    {saving ? "Saving..." : "Save target"}
                  </button>
                </div>
              </form>
            )}
            {report.targets.map((target) => (
              <div
                key={target.category}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-4 dark:border-slate-800"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {target.category} · {money(target.amount)} monthly target
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Potential reduction {money(target.potentialSaving)} against{" "}
                    {cashFlowMonth(target.baselineMonth)} (
                    {money(target.baselineAmount)}).{" "}
                    {target.observedReduction === null
                      ? "A later complete month with a matching category baseline is needed to compare."
                      : `${money(target.observedReduction)} lower spending observed; not a verified saving.`}
                  </p>
                </div>
                <button
                  type="button"
                  className={button}
                  disabled={saving}
                  onClick={() =>
                    void save(
                      { action: "remove-target", category: target.category },
                      "Target removed. Bank activity is unchanged.",
                    )
                  }
                  aria-label={`Remove ${target.category} target`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </section>

          <section
            aria-label="Review payments"
            ref={paymentsRef}
            className="mt-7 scroll-mt-40 border-t border-slate-200 pt-5 dark:border-slate-700"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  Payments and categories
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {report.reviewGroups.length} repeat-payment groups need a
                  purpose. Confirm once for identical payment descriptions in
                  this account.
                </p>
              </div>
              <button
                className={button}
                type="button"
                onClick={() => {
                  setCategory("Needs review");
                  setPage(0);
                }}
              >
                Check missing categories
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="relative">
                <span className="sr-only">Search payments</span>
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  className={`${field} pl-9`}
                  aria-label="Search planner payments"
                  placeholder="Search payments"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label>
                <span className="sr-only">Payment category</span>
                <select
                  className={field}
                  aria-label="Filter payment category"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(0);
                  }}
                >
                  <option>All</option>
                  {MONEY_CATEGORIES.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.slice(page * 12, (page + 1) * 12).map((row) => (
                <div key={row.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">
                        {row.description}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {cashFlowDate(row.transactionDate)} · {row.category} ·{" "}
                        {row.assignmentSource === "confirmed"
                          ? "Confirmed by household"
                          : row.assignmentSource === "recorded"
                            ? "Recorded transfer"
                            : "Suggested / needs checking"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {row.direction === "credit" ? "+" : "−"}
                      {money(row.amount)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mt-1 inline-flex min-h-10 items-center gap-1 text-xs font-medium text-teal-800 dark:text-teal-300"
                    aria-label={`Categorise ${row.description}`}
                    onClick={() => {
                      setReviewId(reviewId === row.id ? null : row.id);
                      setAssignment(row.category);
                      setApplyGroup(true);
                    }}
                  >
                    Change / confirm category
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {selectedReview?.id === row.id && (
                    <form
                      aria-label="Confirm payment category"
                      className="mt-2 grid gap-3 border-y border-slate-200 py-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const kind: MoneyKind =
                          assignment === "Income"
                            ? "income"
                            : assignment === "Refunds"
                              ? "refund"
                              : assignment === "Transfers"
                                ? "transfer"
                                : assignment === "Needs review"
                                  ? "review"
                                  : "spend";
                        void save(
                          {
                            action: "assign",
                            transactionId: row.id,
                            category: assignment,
                            kind,
                            applyToGroup: applyGroup,
                          },
                          "Category confirmed. Raw bank amounts are unchanged.",
                        );
                      }}
                    >
                      <label className="text-xs font-medium">
                        Category
                        <select
                          aria-label="Confirm category"
                          className={`${field} mt-1`}
                          value={assignment}
                          onChange={(event) =>
                            setAssignment(event.target.value)
                          }
                        >
                          {MONEY_CATEGORIES.filter((value) =>
                            row.transactionType === "transfer"
                              ? value === "Transfers"
                              : row.direction === "credit"
                                ? [
                                    "Income",
                                    "Refunds",
                                    "Transfers",
                                    "Needs review",
                                  ].includes(value)
                                : !["Income", "Refunds"].includes(value),
                          ).map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={applyGroup}
                          onChange={(event) =>
                            setApplyGroup(event.target.checked)
                          }
                        />
                        Remember for identical descriptions in this account
                      </label>
                      <div className="flex gap-2">
                        <button
                          className={button}
                          type="button"
                          onClick={() => setReviewId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className={`${button} bg-teal-700 text-white`}
                          type="submit"
                          disabled={saving}
                        >
                          <Check className="h-4 w-4" />
                          {saving ? "Saving..." : "Confirm category"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">{row.reason}</p>
                    </form>
                  )}
                </div>
              ))}
            </div>
            {!transactions.length && (
              <p className="py-5 text-sm text-slate-500">
                No matching imported payments.
              </p>
            )}
            {transactions.length > 12 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  {page * 12 + 1}–
                  {Math.min((page + 1) * 12, transactions.length)} of{" "}
                  {transactions.length} payments
                </span>
                <div className="flex gap-2">
                  <button
                    className={button}
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className={button}
                    type="button"
                    disabled={(page + 1) * 12 >= transactions.length}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
