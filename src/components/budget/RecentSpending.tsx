"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import type { RecentSpendingReport } from "@/lib/budget/recentSpending";
import { cashFlowDate, cashFlowMoney } from "@/lib/budget/cashFlow";

type Props = {
  familyId: string | null;
  refreshKey?: number;
  onReviewMonth: (month: string) => void;
};
const money = (value: number | null) =>
  value === null ? "Unavailable" : cashFlowMoney(value);
const presets = [7, 14, 30, 90];
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700";

export function RecentSpending({
  familyId,
  refreshKey = 0,
  onReviewMonth,
}: Props) {
  const [days, setDays] = useState(30);
  const [selection, setSelection] = useState("30");
  const [draft, setDraft] = useState("30");
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    scope: string;
    report: RecentSpendingReport;
    accounts: Array<{ name: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(0);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const scope = `${familyId ?? ""}:${days}`;
  const data = result?.scope === scope ? result : null;
  const report = data?.report;

  useEffect(() => {
    const value = new URL(window.location.href).searchParams.get("moneyDays");
    if (value && /^[1-9]\d{0,2}$/.test(value) && Number(value) <= 365) {
      setDays(Number(value));
      setDraft(value);
      setSelection(presets.includes(Number(value)) ? value : "custom");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("view") !== "budget") return;
    url.searchParams.set("moneyDays", String(days));
    window.history.replaceState(window.history.state, "", url);
  }, [days, ready]);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");
    setLoading(true);
    setCategory("All");
    setPage(0);
    setLedgerOpen(false);
    if (!familyId || !ready) {
      setLoading(false);
      return () => controller.abort();
    }
    fetch(
      `/api/families/${encodeURIComponent(familyId)}/budget/recent-spending?days=${days}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok)
          throw new Error(
            value.error || "Recent spending could not be loaded.",
          );
        if (
          value.report?.days !== days ||
          !value.report.summary ||
          !["complete", "partial", "none"].includes(value.report.coverage) ||
          !Number.isFinite(Date.parse(value.report.start)) ||
          !Number.isFinite(Date.parse(value.report.end)) ||
          !value.report.previous ||
          !["change", "changePercent"].every(
            (key) =>
              value.report.previous[key] === null ||
              Number.isFinite(value.report.previous[key]),
          ) ||
          !Array.isArray(value.report.categories) ||
          !Array.isArray(value.report.transactions) ||
          !Array.isArray(value.accounts) ||
          !["outgoing", "spending", "review", "transfers"].every(
            (key) =>
              value.report.summary[key] === null ||
              Number.isFinite(value.report.summary[key]),
          )
        )
          throw new Error(
            "Recent spending data was incomplete. Please refresh.",
          );
        if (!controller.signal.aborted)
          setResult({ scope, report: value.report, accounts: value.accounts });
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Recent spending is unavailable.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [familyId, days, ready, scope, refreshKey, revision]);

  const transactions = useMemo(
    () =>
      (report?.transactions ?? []).filter(
        (row) =>
          category === "All" ||
          (category === "Needs review" && row.kind === "review") ||
          row.category === category,
      ),
    [report, category],
  );
  const maxAmount = Math.max(
    1,
    ...(report?.categories.map((item) => item.amount) ?? []),
  );

  return (
    <section
      aria-labelledby="recent-spending-title"
      className="min-w-0 bg-white px-4 py-5 text-slate-900 dark:bg-slate-900 dark:text-slate-100 sm:px-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
        <div>
          <h2 id="recent-spending-title" className="text-xl font-semibold">
            Spending in the last {days} {days === 1 ? "day" : "days"}
          </h2>
          {report && (
            <p className="mt-1 text-sm text-slate-500">
              {cashFlowDate(report.start)}–{cashFlowDate(report.end)} ·
              including today
            </p>
          )}
        </div>
        <button
          type="button"
          className={button}
          aria-label="Refresh recent spending"
          title="Refresh recent spending"
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-0 text-xs font-medium">
          Period
          <select
            aria-label="Spending period"
            value={selection}
            onChange={(event) => {
              const value = event.target.value;
              setSelection(value);
              if (value !== "custom") {
                setDays(Number(value));
                setDraft(value);
              }
            }}
            className="mt-1 block min-h-11 max-w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
          >
            {presets.map((value) => (
              <option key={value} value={value}>
                Last {value} days
              </option>
            ))}
            <option value="custom">Custom number of days</option>
          </select>
        </label>
        {selection === "custom" && (
          <form
            className="flex max-w-full flex-wrap items-end gap-2"
            aria-label="Custom spending period"
            onSubmit={(event) => {
              event.preventDefault();
              if (/^[1-9]\d{0,2}$/.test(draft) && Number(draft) <= 365)
                setDays(Number(draft));
            }}
          >
            <label className="text-xs font-medium">
              Days
              <input
                aria-label="Number of spending days"
                className="mt-1 block min-h-11 w-24 rounded-md border border-slate-300 bg-transparent px-3 text-sm dark:border-slate-700"
                required
                type="number"
                step="1"
                min="1"
                max="365"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
            <button type="submit" className={button}>
              Apply
            </button>
          </form>
        )}
      </div>
      {loading && (
        <p role="status" className="py-8 text-sm text-slate-500">
          Loading recorded spending...
        </p>
      )}
      {error && (
        <p role="alert" className="py-6 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {!familyId && (
        <p className="py-6 text-sm">
          Sign in to your household to view its spending.
        </p>
      )}
      {!loading && !error && report && (
        <>
          <dl className="mt-5 border-y border-slate-200 py-4 dark:border-slate-700">
            <dt className="text-sm text-slate-500">Recorded money out</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">
              {money(report.summary.outgoing)}
            </dd>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Identified spending", report.summary.spending],
                ["Purpose to check", report.summary.review],
                ["Transfers, not spending", report.summary.transfers],
              ].map(([label, amount]) => (
                <div key={String(label)} className="min-w-0">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words text-lg font-semibold tabular-nums">
                    {money(amount as number | null)}
                  </dd>
                </div>
              ))}
            </div>
          </dl>
          <p
            className={`mt-3 text-sm ${report.coverage === "complete" ? "text-slate-600 dark:text-slate-300" : "text-amber-800 dark:text-amber-300"}`}
          >
            {report.coverage === "complete"
              ? "Full imported coverage for this period."
              : report.coverage === "partial"
                ? `Partial bank coverage: ${report.coveredDays} of ${report.days} days covered across all connected accounts. Payments may be missing.`
                : "No imported bank coverage. Amounts are unavailable, not zero."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {data.accounts.map((account) => account.name).join(", ") ||
              "No active GBP bank sources"}
            {report.sourceThrough
              ? ` · data through ${cashFlowDate(report.sourceThrough)}`
              : ""}
            . Categories may still need confirmation.
          </p>
          {report.previous.change !== null && (
            <p className="mt-3 text-sm">
              Identified spending was{" "}
              {report.previous.change === 0
                ? "unchanged"
                : `${money(Math.abs(report.previous.change))} ${report.previous.change > 0 ? "higher" : "lower"}`}{" "}
              than the previous {days} days
              {report.previous.changePercent !== null
                ? ` (${Math.abs(report.previous.changePercent).toFixed(0)}%)`
                : ""}
              . This is past spending, not a saving prediction.
            </p>
          )}
          {report.categories.length > 0 && (
            <section aria-label="Recent spending categories" className="mt-6">
              <h3 className="text-base font-semibold">What we spent on</h3>
              <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {report.categories.map((item) => (
                  <div key={item.category} className="py-3">
                    <button
                      type="button"
                      aria-pressed={category === item.category}
                      onClick={() => {
                        setCategory(
                          category === item.category ? "All" : item.category,
                        );
                        setPage(0);
                        setLedgerOpen(true);
                      }}
                      className="flex min-h-10 w-full flex-wrap items-center justify-between gap-2 text-left text-sm"
                    >
                      <span className="font-medium">{item.category}</span>
                      <span className="tabular-nums">
                        {money(item.amount)}{" "}
                        <span className="text-xs text-slate-500">
                          · {item.count} payments
                        </span>
                      </span>
                    </button>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full bg-teal-700"
                        style={{ width: `${(item.amount / maxAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          <details
            open={ledgerOpen}
            onToggle={(event) => setLedgerOpen(event.currentTarget.open)}
            className="mt-6 border-t border-slate-200 pt-3 dark:border-slate-700"
          >
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
              Payments in this period ({report.summary.count})
            </summary>
            <label className="mt-2 block text-xs">
              Category
              <select
                aria-label="Recent payment category"
                className="mt-1 block min-h-11 max-w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(0);
                }}
              >
                <option>All</option>
                {[
                  ...new Set([
                    "Needs review",
                    "Transfers",
                    ...report.transactions.map((row) => row.category),
                  ]),
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.slice(page * 10, (page + 1) * 10).map((row) => (
                <div
                  key={row.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">
                      {row.description}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {cashFlowDate(row.transactionDate)} · {row.category}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        onReviewMonth(row.transactionDate.slice(0, 7))
                      }
                      className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-teal-800 dark:text-teal-300"
                    >
                      Review in month
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {row.direction === "credit" ? "+" : "-"}
                    {money(row.amount)}
                  </span>
                </div>
              ))}
            </div>
            {!transactions.length && (
              <p className="py-4 text-sm text-slate-500">
                No matching imported payments.
              </p>
            )}
            {transactions.length > 10 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs">
                <span>
                  {page * 10 + 1}–
                  {Math.min((page + 1) * 10, transactions.length)} of{" "}
                  {transactions.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={button}
                    disabled={page === 0}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={(page + 1) * 10 >= transactions.length}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </details>
        </>
      )}
    </section>
  );
}
