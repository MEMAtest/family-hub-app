"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  ArrowDownToLine,
  ArrowRight,
  Pencil,
  Plus,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useFamilyStore } from "@/store/familyStore";
import { CreateProjectModal } from "@/components/property/projects/CreateProjectModal";
import { cashFlowMoney } from "@/lib/budget/cashFlow";
import type {
  FundedProject,
  ProjectFundingReport,
} from "@/lib/budget/projectFunding";

const colours = [
  "#168b7d",
  "#2985d3",
  "#d69a24",
  "#9862b6",
  "#d6657b",
  "#547b95",
];
const field =
  "mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-transparent px-3 text-sm dark:border-slate-600";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-600";
const cash = (value: number | null) =>
  value === null ? "Not set" : cashFlowMoney(value);

export function ProjectFundingPanel({
  familyId,
  initialProjectId = "",
}: {
  familyId: string | null;
  initialProjectId?: string;
}) {
  const [result, setResult] = useState<{
    familyId: string;
    report: ProjectFundingReport;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<{
    id: string;
    version: number;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [reserve, setReserve] = useState("0");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(initialProjectId);
  const projects = useFamilyStore((state) => state.propertyProjects);
  const sharedStatus = useFamilyStore((state) => state.sharedSyncStatus);
  const addProject = useFamilyStore((state) => state.addPropertyProject);
  const projectIds = projects.map((project) => project.id).join("|");
  const report = result?.familyId === familyId ? result.report : null;
  const endpoint = familyId
    ? `/api/families/${encodeURIComponent(familyId)}/budget/project-funding`
    : "";
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!familyId) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/families/${encodeURIComponent(familyId)}/budget/project-funding`,
          { cache: "no-store", signal },
        );
        const value = await response.json();
        if (
          !response.ok ||
          !Array.isArray(value.projects) ||
          !Number.isInteger(value.version)
        )
          throw new Error(value.error || "Project money could not be loaded.");
        if (!signal?.aborted) setResult({ familyId, report: value });
      } catch (reason) {
        if (!signal?.aborted) {
          setResult(null);
          setError(
            reason instanceof Error
              ? reason.message
              : "Project money unavailable.",
          );
        }
        throw reason;
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [familyId],
  );
  useEffect(() => {
    const controller = new AbortController();
    if (sharedStatus !== "syncing")
      void load(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [load, sharedStatus, projectIds]);
  useEffect(() => {
    setEditing(null);
    setResult(null);
  }, [familyId]);
  useEffect(() => {
    setSelectedId(initialProjectId);
  }, [initialProjectId]);
  useEffect(() => {
    if (
      message === "Project created. Waiting for household project sync..." &&
      report?.projects.some((project) => project.id === selectedId)
    ) {
      setMessage("Project synced. Ready to allocate.");
    }
  }, [message, report, selectedId]);
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) void load().catch(() => {});
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);
  const project = report?.projects.find(
    (project) => project.id === editing?.id,
  );
  const openEditor = (row?: FundedProject) => {
    if (!report) return;
    setEditing({ id: row?.id ?? "fund", version: report.version });
    setAmount(
      row
        ? row.allocated === null
          ? ""
          : String(row.allocated)
        : report.fund === null
          ? ""
          : String(report.fund),
    );
    setReserve(String(row?.reservePercent ?? 0));
    setSaveError("");
    setConflict(false);
    setMessage("");
  };
  const maximum =
    report?.fund === null || !report
      ? null
      : Math.max(
          0,
          Math.round(
            (report.fund - report.allocated + (project?.allocated ?? 0)) * 100,
          ) / 100,
        );
  const draft = amount.trim() === "" ? null : Number(amount);
  const remaining =
    report?.fund === null || !report || editing?.id === "fund" || draft === null
      ? null
      : Math.round(
          (report.fund - report.allocated + (project?.allocated ?? 0) - draft) *
            100,
        ) / 100;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !report || saving) return;
    setSaving(true);
    setSaveError("");
    setConflict(false);
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing.id === "fund"
            ? { action: "fund", amount: draft, baseVersion: editing.version }
            : {
                action: "allocate",
                projectId: editing.id,
                amount: draft,
                reservePercent: Number(reserve),
                baseVersion: editing.version,
              },
        ),
      });
      const body = await response.json();
      if (!response.ok) {
        setConflict(response.status === 409);
        throw new Error(body.error || "Could not save the allocation.");
      }
      setEditing(null);
      setMessage(
        "Project money saved across household devices. No bank money was moved.",
      );
      await load();
    } catch (reason) {
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "Could not save. Your draft is still here.",
      );
    } finally {
      setSaving(false);
    }
  };
  const segments = useMemo(
    () =>
      report
        ? [
            ...report.projects
              .map((project, index) => ({
                name: project.title,
                value: project.allocated ?? 0,
                colour: colours[index % colours.length],
              }))
              .filter((segment) => segment.value > 0),
            ...(report.unallocated !== null && report.unallocated > 0
              ? [
                  {
                    name: "Unallocated",
                    value: report.unallocated,
                    colour: "#d8e1e7",
                  },
                ]
              : []),
          ]
        : [],
    [report],
  );
  const orderedProjects =
    report?.projects
      .slice()
      .sort(
        (a, b) =>
          Number(b.id === selectedId) - Number(a.id === selectedId) ||
          a.title.localeCompare(b.title),
      ) ?? [];

  return (
    <section
      aria-label="Project money planner"
      className="min-w-0 bg-white px-4 py-5 text-slate-900 dark:bg-slate-900 dark:text-slate-100 sm:px-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Project money</h2>
          <p className="mt-1 text-sm text-slate-500">
            Allocations, quote commitments and contingency.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className={button}
          >
            <Plus className="h-4 w-4" />
            New project
          </button>
          <button
            type="button"
            aria-label="Refresh project money"
            title="Refresh project money"
            onClick={() => void load().catch(() => {})}
            className={button}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>
      {message && (
        <p
          role="status"
          className="mt-3 text-sm text-teal-700 dark:text-teal-300"
        >
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {!familyId && (
        <p className="mt-3 text-sm">
          Sign in to your household to plan project money.
        </p>
      )}
      {loading && !report && (
        <p role="status" className="py-5 text-sm text-slate-500">
          Loading project money...
        </p>
      )}
      {sharedStatus === "syncing" && !report && (
        <p role="status" className="py-4 text-sm text-slate-500">
          Syncing household projects...
        </p>
      )}
      {report && (
        <>
          <div className="mt-5 grid min-w-0 gap-4 border-y border-slate-200 py-4 dark:border-slate-700 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">
                    Your total project fund
                  </p>
                  <strong className="text-2xl tabular-nums">
                    {cash(report.fund)}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => openEditor()}
                  className={button}
                >
                  <Wallet className="h-4 w-4" />
                  {report.fund === null ? "Set project fund" : "Edit fund"}
                </button>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-slate-500">
                    Allocated to projects
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums">
                    {cash(report.allocated)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">
                    {report.unallocated !== null && report.unallocated < 0
                      ? "Overallocated"
                      : "Unallocated"}
                  </dt>
                  <dd
                    className={`mt-1 text-lg font-semibold tabular-nums ${report.unallocated !== null && report.unallocated < 0 ? "text-red-700 dark:text-red-300" : "text-teal-700 dark:text-teal-300"}`}
                  >
                    {report.unallocated === null
                      ? "Set a fund first"
                      : cashFlowMoney(Math.abs(report.unallocated))}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">
                Planning allocations, not a bank balance or reserved cash. No
                money is moved.
              </p>
              {report.unallocated !== null && report.unallocated < 0 && (
                <p
                  role="alert"
                  className="mt-2 text-sm font-medium text-red-700 dark:text-red-300"
                >
                  Allocations exceed the project fund by{" "}
                  {cashFlowMoney(-report.unallocated)}.
                </p>
              )}
            </div>
            {segments.length > 0 ? (
              <div
                className="relative mx-auto h-40 w-44"
                role="img"
                aria-label="Project fund allocation chart"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segments}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={70}
                      isAnimationActive={false}
                    >
                      {segments.map((segment, index) => (
                        <Cell
                          key={`${segment.name}-${index}`}
                          fill={segment.colour}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => cashFlowMoney(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-500">Allocated</span>
                  <strong className="text-sm tabular-nums">
                    {cash(report.allocated)}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-center text-sm text-slate-500">
                No allocations set
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {segments.map((segment, index) => (
              <span
                key={`${segment.name}-${index}`}
                className="inline-flex items-center gap-2"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.colour }}
                />
                {segment.name}: {cashFlowMoney(segment.value)}
              </span>
            ))}
          </div>
          <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-700">
            {orderedProjects.map((row) => {
              const maximum = Math.max(
                row.allocated ?? 0,
                (row.committed ?? 0) + row.reserve,
                1,
              );
              return (
                <article
                  key={row.id}
                  aria-label={`${row.title} funding`}
                  className="py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-base font-semibold">
                        <span
                          className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              colours[
                                report.projects.findIndex(
                                  (project) => project.id === row.id,
                                ) % colours.length
                              ],
                          }}
                        />
                        {row.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.category} ·{" "}
                        {row.available
                          ? row.status.replace(/_/g, " ")
                          : "Project unavailable; its allocation remains counted"}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Allocate money to ${row.title}`}
                      title="Edit allocation"
                      onClick={() => openEditor(row)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 dark:border-slate-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-slate-500">Allocated</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {cash(row.allocated)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        Accepted quotes
                      </dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {row.committed === null
                          ? "Amount incomplete"
                          : cash(row.committed)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Contingency</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {row.allocated === null ? "Not set" : cash(row.reserve)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        Headroom after quotes & reserve
                      </dt>
                      <dd
                        className={`mt-1 font-semibold tabular-nums ${row.quoteHeadroom !== null && row.quoteHeadroom < 0 ? "text-red-700 dark:text-red-300" : ""}`}
                      >
                        {row.quoteHeadroom === null
                          ? "Unavailable"
                          : cash(row.quoteHeadroom)}
                      </dd>
                    </div>
                  </dl>
                  {row.allocated !== null && (
                    <div
                      className="mt-3 flex h-3 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800"
                      role="img"
                      aria-label={`${row.title}: ${cash(row.committed)} accepted quotes, ${cash(row.reserve)} contingency, ${cash(row.quoteHeadroom)} headroom`}
                    >
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${((row.committed ?? 0) / maximum) * 100}%`,
                        }}
                      />
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${(row.reserve / maximum) * 100}%` }}
                      />
                      <div
                        className="h-full bg-emerald-400"
                        style={{
                          width: `${(Math.max(0, row.quoteHeadroom ?? 0) / maximum) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {row.quoteCount
                        ? `${row.quoteCount} quote${row.quoteCount === 1 ? "" : "s"}: ${cash(row.quotedMin)}${row.quotedMax !== row.quotedMin ? `–${cash(row.quotedMax)}` : ""} · individual quote values`
                        : "No priced quotes yet"}
                    </span>
                    <span>
                      Recorded project spend:{" "}
                      {row.recordedSpend === null
                        ? "Not recorded"
                        : cash(row.recordedSpend)}
                    </span>
                  </div>
                  {row.quoteHeadroom !== null && row.quoteHeadroom < 0 && (
                    <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                      Accepted quotes and contingency exceed this allocation by{" "}
                      {cashFlowMoney(-row.quoteHeadroom)}.
                    </p>
                  )}
                  {row.recordedSpend !== null &&
                    row.allocated !== null &&
                    row.recordedSpend > row.allocated && (
                      <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                        Recorded project spend exceeds the allocation by{" "}
                        {cashFlowMoney(row.recordedSpend - row.allocated)}.
                      </p>
                    )}
                  <details className="mt-2 text-xs">
                    <summary className="min-h-10 cursor-pointer py-2 font-medium">
                      Quote commitments & sources
                    </summary>
                    <p className="mb-2 text-slate-500">
                      Accepted quotes only count as commitments. Other quote
                      options are not added together. Recorded spend may already
                      be included in accepted quotes; it is not added a second
                      time. VAT and delivery are as recorded.
                    </p>
                    {row.acceptedCount > 1 && (
                      <p className="mb-2 text-amber-800 dark:text-amber-300">
                        Several quotes are accepted. Check their scopes do not
                        overlap.
                      </p>
                    )}
                    {row.quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="flex items-start justify-between gap-3 border-t border-slate-100 py-2 dark:border-slate-800"
                      >
                        <span className="min-w-0 break-words">
                          {quote.name} · {quote.status}
                        </span>
                        <strong className="shrink-0">
                          {quote.amount === null
                            ? "Amount unavailable"
                            : cash(quote.amount)}
                        </strong>
                      </div>
                    ))}
                    <div className="mt-2 flex flex-wrap gap-3">
                      {row.available && (
                        <>
                          <a
                            className="inline-flex min-h-10 items-center gap-1 font-semibold text-teal-800 dark:text-teal-200"
                            href={`/?view=property&tab=projects&bathroomProject=${encodeURIComponent(row.id)}`}
                          >
                            Open project
                            <ArrowRight className="h-3 w-3" />
                          </a>
                          <a
                            className="inline-flex min-h-10 items-center gap-1 font-semibold text-blue-700 dark:text-blue-300"
                            href={`/?view=contractors&projectId=${encodeURIComponent(row.id)}`}
                          >
                            Find companies for this project
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
          {!report.projects.length && (
            <p className="py-6 text-sm text-slate-500">No projects yet.</p>
          )}
        </>
      )}
      <Dialog
        open={editing !== null}
        onClose={() => {
          if (!saving) setEditing(null);
        }}
        className="fixed inset-0 z-[120]"
      >
        <div className="fixed inset-0 bg-black/35" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-3">
          <DialogPanel className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-lg bg-white p-4 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="min-w-0 break-words text-lg font-semibold">
                {editing?.id === "fund"
                  ? "Set project fund"
                  : `Allocate to ${project?.title ?? "project"}`}
              </DialogTitle>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing(null)}
                aria-label="Close allocation editor"
                title="Close allocation editor"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(event) => void save(event)}
              className="mt-3 space-y-4"
            >
              <label className="block text-sm">
                {editing?.id === "fund"
                  ? "Total project fund (£)"
                  : "Project allocation (£)"}
                <input
                  aria-label="Allocation amount"
                  type="number"
                  min="0"
                  max="100000000"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className={field}
                />
              </label>
              {editing?.id !== "fund" && (
                <>
                  {maximum !== null && (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span>Available for this project: {cash(maximum)}</span>
                        <button
                          type="button"
                          title="Allocate remaining project fund"
                          aria-label="Allocate remaining project fund"
                          onClick={() => setAmount(String(maximum))}
                          className="flex min-h-10 items-center gap-2 text-teal-800 dark:text-teal-200"
                        >
                          <ArrowDownToLine className="h-4 w-4" />
                          Use available
                        </button>
                      </div>
                      <input
                        type="range"
                        aria-label="Adjust project allocation"
                        min="0"
                        max={Math.max(maximum, draft ?? 0, 1)}
                        step="1"
                        value={draft ?? 0}
                        onChange={(event) => setAmount(event.target.value)}
                        className="mt-2 w-full accent-teal-700"
                      />
                    </div>
                  )}
                  <label className="block text-sm">
                    Contingency inside this allocation (%)
                    <input
                      aria-label="Project contingency percent"
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      value={reserve}
                      onChange={(event) => setReserve(event.target.value)}
                      className={field}
                    />
                  </label>
                  {draft !== null && (
                    <p className="text-sm">
                      {cashFlowMoney(Math.round(draft * Number(reserve)) / 100)}{" "}
                      contingency ·{" "}
                      {cashFlowMoney(
                        Math.round(draft * (100 - Number(reserve))) / 100,
                      )}{" "}
                      working budget.
                    </p>
                  )}
                  {remaining !== null && (
                    <p
                      className={`text-sm font-medium ${remaining < 0 ? "text-red-700 dark:text-red-300" : "text-teal-800 dark:text-teal-200"}`}
                    >
                      {remaining < 0
                        ? `${cashFlowMoney(-remaining)} over the total project fund`
                        : `${cashFlowMoney(remaining)} remains unallocated across all projects`}
                    </p>
                  )}
                  {project && !project.available && (
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      This project is no longer available. Only clearing its
                      allocation is permitted.
                    </p>
                  )}
                </>
              )}
              <p className="text-xs text-slate-500">
                This is a household planning figure, not a bank balance or
                payment.
              </p>
              {saveError && (
                <p
                  role="alert"
                  className="text-sm text-red-700 dark:text-red-300"
                >
                  {saveError}
                </p>
              )}
              {conflict && (
                <button
                  type="button"
                  className={button}
                  onClick={() => {
                    setEditing(null);
                    void load().catch(() => {});
                  }}
                >
                  Review latest plan
                </button>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                  className={button}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || loading || !report}
                  className={`${button} bg-teal-700 text-white`}
                >
                  {saving ? "Saving..." : "Save allocation"}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreateProject={(newProject) => {
          addProject(newProject);
          setSelectedId(newProject.id);
          setMessage("Project created. Waiting for household project sync...");
        }}
      />
    </section>
  );
}
