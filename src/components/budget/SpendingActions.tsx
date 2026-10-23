"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import type { RecentSpendingReport } from "@/lib/budget/recentSpending";
import { spendingFacts } from "@/lib/budget/spendingInsights";

export function SpendingActions({
  report,
  familyId,
  onCategory,
  onReview,
}: {
  report: RecentSpendingReport;
  familyId: string;
  onCategory: (category: string) => void;
  onReview: (month?: string) => void;
}) {
  const facts = spendingFacts(report);
  const [actions, setActions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    controller.current?.abort();
    controller.current = null;
    setActions({});
    setError("");
    setLoading(false);
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, [report, familyId]);
  const explain = async () => {
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => request.abort(), 50000);
    try {
      const response = await fetch(
        `/api/families/${encodeURIComponent(familyId)}/budget/recent-insights`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ days: report.days }),
          signal: request.signal,
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "AI actions unavailable.");
      if (!request.signal.aborted)
        setActions(
          Object.fromEntries(
            body.actions.map((action: { factId: string; action: string }) => [
              action.factId,
              action.action,
            ]),
          ),
        );
    } catch (reason) {
      if (controller.current === request)
        setError(
          request.signal.aborted
            ? "AI took too long. The verified observations below are still available."
            : reason instanceof Error
              ? reason.message
              : "AI unavailable.",
        );
    } finally {
      clearTimeout(timer);
      if (controller.current === request) setLoading(false);
    }
  };
  return (
    <section
      aria-label="Spending insights and next steps"
      className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">What to do next</h3>
          <p className="mt-1 text-xs text-slate-500">
            Based on recorded payments, not saved plans or assumed savings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void explain()}
          disabled={loading || report.coverage === "none"}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-teal-200 px-3 text-sm font-medium text-teal-800 disabled:opacity-50 dark:text-teal-200"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Suggest next steps
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-amber-800 dark:text-amber-300"
        >
          {error}
        </p>
      )}
      {Object.keys(actions).length > 0 && (
        <p
          role="status"
          className="mt-3 text-xs text-teal-700 dark:text-teal-300"
        >
          AI suggestions generated from the aggregate facts below. Suggestions
          are not confirmed savings.
        </p>
      )}
      <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
        {facts.map((fact, index) => (
          <article
            key={fact.id}
            className="min-w-0 border-b border-slate-100 py-4 dark:border-slate-800"
          >
            <p className="text-xs font-medium text-teal-700 dark:text-teal-300">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h4 className="mt-1 text-sm font-semibold">{fact.title}</h4>
            <p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-300">
              {fact.evidence}
            </p>
            <p className="mt-2 break-words text-sm leading-6">
              {actions[fact.id] || fact.action}
            </p>
            {fact.id !== "coverage" && (
              <button
                type="button"
                onClick={() =>
                    fact.category ? onCategory(fact.category) : onReview(fact.reviewMonth)
                }
                className="mt-1 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-teal-800 dark:text-teal-300"
              >
                {fact.category ? "See payments" : "Review month"}
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
