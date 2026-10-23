"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import type { RecentSpendingReport } from "@/lib/budget/recentSpending";
import { MONEY_CATEGORIES, type MoneyKind } from "@/lib/budget/moneyPlanner";
import { supplierKey, supplierName } from "@/lib/budget/paymentPatterns";
import { cashFlowDate, cashFlowMoney } from "@/lib/budget/cashFlow";
import type { PaymentScope } from "./MoneyVisualOverview";
import { SupplierHistory } from "./CalendarMoneyComparison";
import { MerchantSource } from "./MerchantSource";

export type PaymentSelection = {
  scope?: PaymentScope;
  category?: string;
  view?: "payments" | "suppliers";
  date?: string;
  supplier?: string;
};
const field =
  "min-h-11 max-w-full rounded-md border border-slate-300 bg-transparent px-3 text-sm dark:border-slate-600";
const labels = {
  all: "All payments",
  outgoing: "Recorded money out",
  spend: "Identified spending",
  review: "Purpose to check",
  transfer: "Transfers, not spending",
};

export function PaymentDetailsModal({
  report,
  familyId,
  selection,
  onClose,
  onSaved,
}: {
  report: RecentSpendingReport;
  familyId: string;
  selection: PaymentSelection | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [scope, setScope] = useState<PaymentScope>("all");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"payments" | "suppliers">("payments");
  const [supplier, setSupplier] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [assignment, setAssignment] = useState("Needs review");
  const [remember, setRemember] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const openSupplier = (key: string) => {
    setSupplier(key);
    setView("payments");
    setPage(0);
    requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: 0 }));
  };
  useEffect(() => {
    if (!selection) return;
    setScope(selection.scope ?? "all");
    setCategory(selection.category ?? "All");
    setQuery("");
    setView(selection.view ?? "payments");
    setSupplier(selection.supplier ?? null);
    setPage(0);
    setEditing(null);
    setMessage("");
    setError("");
  }, [selection]);
  const rows = useMemo(
    () =>
      report.transactions.filter(
        (row) =>
          (scope === "all" ||
            (row.direction === "debit" &&
              (scope === "outgoing" || row.kind === scope))) &&
          (category === "All" || row.category === category) &&
          (!supplier || supplierKey(row) === supplier) &&
          (!selection?.date ||
            row.transactionDate.slice(0, 10) === selection.date) &&
          `${row.description} ${row.merchantName ?? ""} ${row.category} ${row.amount}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [report, scope, category, supplier, selection, query],
  );
  const groups = useMemo(() => {
    const values = new Map<
      string,
      { key: string; name: string; count: number; pence: number }
    >();
    for (const row of rows.filter((row) => row.direction === "debit")) {
      const key = supplierKey(row),
        group = values.get(key) ?? {
          key,
          name: supplierName(row),
          count: 0,
          pence: 0,
        };
      group.count++;
      group.pence += Math.round(row.amount * 100);
      values.set(key, group);
    }
    return [...values.values()].sort((a, b) => b.pence - a.pence);
  }, [rows]);
  const pattern = report.context?.suppliers.find(
    (item) => item.key === supplier,
  );
  const total =
    rows.reduce(
      (sum, row) =>
        sum +
        Math.round(row.amount * 100) * (row.direction === "debit" ? 1 : -1),
      0,
    ) / 100;
  const save = async (id: string) => {
    setSaving(true);
    setError("");
    setMessage("");
    let persisted = false;
    try {
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
      const response = await fetch(
        `/api/families/${encodeURIComponent(familyId)}/budget/money-planner`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign",
            transactionId: id,
            category: assignment,
            kind,
            applyToGroup: remember,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not save the category.");
      persisted = true;
      await onSaved();
      setEditing(null);
      setPage(0);
      setMessage("Category saved. Totals updated; bank amounts unchanged.");
    } catch (reason) {
      setError(
        persisted
          ? "Category saved, but totals could not refresh. Close and refresh before making another change."
          : reason instanceof Error
            ? reason.message
            : "Could not save. Your choice is still here.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open={selection !== null}
      onClose={() => {
        if (!saving) onClose();
      }}
      className="fixed inset-0 z-[120]"
    >
      <div className="fixed inset-0 bg-black/35" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-6">
        <DialogPanel className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-100">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold">
                {selection?.date
                  ? `Money out · ${cashFlowDate(selection.date)}`
                  : category !== "All"
                    ? category
                    : labels[scope]}
              </DialogTitle>
              <p className="mt-1 text-xs text-slate-500">
                {cashFlowDate(report.start)}–{cashFlowDate(report.end)}
              </p>
            </div>
            <button
              type="button"
              data-autofocus
              aria-label="Close payment details"
              title="Close payment details"
              disabled={saving}
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div
            ref={bodyRef}
            className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4"
            data-testid="payment-modal-body"
          >
            <div
              className="flex gap-1 border-b border-slate-200 py-2 dark:border-slate-700"
              aria-label="Payment detail views"
            >
              {(["payments", "suppliers"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => {
                    setView(value);
                    setPage(0);
                  }}
                  className={`min-h-11 flex-1 rounded-md px-2 text-sm font-medium ${view === value ? "bg-teal-700 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                >
                  {value === "payments" ? "Payments" : "Suppliers & bills"}
                </button>
              ))}
            </div>
            {message && (
              <p
                role="status"
                className="mt-3 text-sm text-teal-800 dark:text-teal-200"
              >
                {message}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mt-3 text-sm text-red-700 dark:text-red-300"
              >
                {error}
              </p>
            )}
            <div className="my-3 flex flex-wrap gap-2">
              <select
                aria-label="Recent payment type"
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as PaymentScope);
                  setPage(0);
                }}
                className={`${field} min-w-0 flex-1`}
              >
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Recent payment category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(0);
                }}
                className={`${field} min-w-0 flex-1`}
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
              <input
                aria-label="Search recent payments"
                placeholder="Search payee, category or amount"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                className={`${field} w-full`}
              />
            </div>
            {supplier && (
              <>
                <button
                  type="button"
                  className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm text-teal-800 dark:text-teal-200"
                  onClick={() => {
                    setSupplier(null);
                    setPage(0);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  All payees
                </button>
                {pattern && <SupplierHistory supplier={pattern} />}
              </>
            )}
            <p
              role="status"
              className="my-3 text-xs text-slate-600 dark:text-slate-300"
            >
              {rows.length} matching{" "}
              {rows.length === 1 ? "payment" : "payments"} ·{" "}
              {cashFlowMoney(total)} net out
            </p>
            {view === "suppliers" ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {groups.slice(page * 10, (page + 1) * 10).map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    aria-label={`View ${group.name} payments`}
                    onClick={() => {
                      openSupplier(group.key);
                    }}
                    className="flex min-h-16 w-full items-center gap-3 py-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <strong className="block break-words text-sm">
                        {group.name}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        {report.context?.suppliers.find(
                          (pattern) => pattern.key === group.key,
                        )?.timing ?? `${group.count} payments in this period`}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums">
                      {cashFlowMoney(group.pence / 100)}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {rows.slice(page * 10, (page + 1) * 10).map((row) => (
                  <article key={row.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold">
                          {supplierName(row)}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {cashFlowDate(row.transactionDate)} · {row.category}
                        </p>
                      </div>
                      <strong className="shrink-0 text-sm tabular-nums">
                        {row.direction === "credit" ? "+" : "-"}
                        {cashFlowMoney(row.amount)}
                      </strong>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{row.reason}</p>
                    <MerchantSource evidence={row.merchantEvidence} />
                    <div className="flex flex-wrap gap-x-4">
                      <button
                        type="button"
                        onClick={() => {
                          openSupplier(supplierKey(row));
                        }}
                        className="min-h-11 text-xs font-semibold text-teal-800 dark:text-teal-200"
                      >
                        Supplier history
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        aria-label={`Categorise ${row.description}`}
                        onClick={() => {
                          setEditing(row.id);
                          setAssignment(row.category);
                          setRemember(true);
                          setError("");
                        }}
                        className="min-h-11 text-xs font-semibold text-teal-800 dark:text-teal-200"
                      >
                        Confirm / change category
                      </button>
                      <details className="self-center text-xs">
                        <summary className="cursor-pointer py-3 text-slate-500">
                          Original description
                        </summary>
                        <p className="max-w-full break-words py-2">
                          {row.description}
                        </p>
                      </details>
                    </div>
                    {editing === row.id && (
                      <form
                        aria-label="Confirm payment category"
                        className="space-y-3 border-y border-slate-200 py-3 dark:border-slate-700"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void save(row.id);
                        }}
                      >
                        <label className="block text-xs">
                          Category
                          <select
                            aria-label="Confirm category"
                            value={assignment}
                            onChange={(e) => setAssignment(e.target.value)}
                            className={`${field} mt-1 w-full`}
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
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                          />
                          Remember for identical descriptions in this account
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setEditing(null)}
                            className={`${field} px-3`}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm text-white"
                          >
                            <Check className="h-4 w-4" />
                            {saving ? "Saving..." : "Confirm category"}
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            )}
            {!(view === "suppliers" ? groups.length : rows.length) && (
              <p className="py-5 text-sm text-slate-500">
                No matching imported payments.
              </p>
            )}
            {(view === "suppliers" ? groups.length : rows.length) > 10 && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs">
                <button
                  type="button"
                  aria-label="Previous payment page"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                  className={field}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span>Page {page + 1}</span>
                <button
                  type="button"
                  aria-label="Next payment page"
                  disabled={
                    (page + 1) * 10 >=
                    (view === "suppliers" ? groups.length : rows.length)
                  }
                  onClick={() => setPage((value) => value + 1)}
                  className={field}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
