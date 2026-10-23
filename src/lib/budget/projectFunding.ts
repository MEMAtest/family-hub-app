import { z } from "zod";
import { isQaBudgetRecord } from "./dataQuality";

export const PROJECT_FUNDING_KEY = "money.project-funding";
const cash = z
  .number()
  .finite()
  .min(0)
  .max(100_000_000)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
    "Use pounds and pence.",
  );
export const fundingChange = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("fund"),
      amount: cash.nullable(),
      baseVersion: z.number().int().min(0),
    })
    .strict(),
  z
    .object({
      action: z.literal("allocate"),
      projectId: z.string().min(1).max(240),
      amount: cash.nullable(),
      reservePercent: z.number().finite().min(0).max(50),
      baseVersion: z.number().int().min(0),
    })
    .strict(),
]);
export type ProjectFunding = {
  fund: number | null;
  allocations: Record<
    string,
    { amount: number | null; reservePercent: number; title: string }
  >;
};
export const emptyProjectFunding = (): ProjectFunding => ({
  fund: null,
  allocations: {},
});
export function readProjectFunding(raw: unknown): ProjectFunding {
  const value = raw as Partial<ProjectFunding> | null;
  const allocations: ProjectFunding["allocations"] = Object.create(null);
  if (value?.allocations && typeof value.allocations === "object")
    for (const [id, allocation] of Object.entries(value.allocations)) {
      if (
        !allocation ||
        !cash.nullable().safeParse(allocation.amount).success ||
        !Number.isFinite(allocation.reservePercent) ||
        allocation.reservePercent < 0 ||
        allocation.reservePercent > 50
      )
        continue;
      allocations[id] = {
        amount: allocation.amount,
        reservePercent: allocation.reservePercent,
        title:
          typeof allocation.title === "string"
            ? allocation.title
            : "Unavailable project",
      };
    }
  return {
    fund: cash.nullable().safeParse(value?.fund).success ? value!.fund! : null,
    allocations,
  };
}
export type FundedProject = {
  id: string;
  title: string;
  category: string;
  status: string;
  available: boolean;
  allocated: number | null;
  reservePercent: number;
  reserve: number;
  workingBudget: number | null;
  committed: number | null;
  acceptedCount: number;
  unpricedAcceptedCount: number;
  quotedMin: number | null;
  quotedMax: number | null;
  quoteCount: number;
  recordedSpend: number | null;
  quoteHeadroom: number | null;
  quotes: Array<{
    id: string;
    name: string;
    amount: number | null;
    status: string;
    contractorId: string | null;
  }>;
};
export type ProjectFundingReport = {
  version: number;
  fund: number | null;
  allocated: number;
  unallocated: number | null;
  projects: FundedProject[];
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const amount = (value: unknown) =>
  cash.safeParse(value).success ? (value as number) : null;
const pence = (value: number) => Math.round(value * 100);

export function buildProjectFunding(
  projectData: unknown,
  funding: ProjectFunding,
  version = 0,
): ProjectFundingReport {
  const projects = (Array.isArray(projectData) ? projectData : [])
    .map(record)
    .filter(
      (project) =>
        typeof project.id === "string" &&
        typeof project.title === "string" &&
        !isQaBudgetRecord({
          expenseName: project.title as string,
          category: project.category as string,
        }),
    );
  const ids = new Set(projects.map((project) => project.id));
  const all: Record<string, unknown>[] = [
    ...projects,
    ...Object.entries(funding.allocations)
      .filter(([id]) => !ids.has(id))
      .map(([id, entry]) => ({
        id,
        title: entry.title,
        category: "Unavailable",
        status: "unavailable",
      })),
  ];
  const rows: FundedProject[] = all.map((project) => {
    const id = project.id as string,
      saved = funding.allocations[id];
    const quotes = (Array.isArray(project.quotes) ? project.quotes : [])
      .map(record)
      .filter((quote) => typeof quote.id === "string")
      .map((quote) => ({
        id: quote.id as string,
        name: String(quote.title || quote.contractorName || "Quote"),
        amount:
          quote.currency === "GBP" || quote.currency === undefined
            ? amount(quote.amount)
            : null,
        status: String(quote.status ?? "pending"),
        contractorId:
          typeof quote.contractorId === "string" ? quote.contractorId : null,
      }));
    const accepted = quotes.filter((quote) => quote.status === "accepted");
    const unpricedAcceptedCount = accepted.filter(
      (quote) => quote.amount === null,
    ).length;
    const priced = quotes.filter(
      (quote) => quote.status !== "rejected" && quote.amount !== null,
    );
    const committed = unpricedAcceptedCount
      ? null
      : accepted.reduce((sum, quote) => sum + pence(quote.amount!), 0) / 100;
    const allocated = saved?.amount ?? null,
      reservePercent = saved?.reservePercent ?? 0;
    const reserve =
      allocated === null
        ? 0
        : Math.round((pence(allocated) * reservePercent) / 100) / 100;
    const workingBudget =
      allocated === null ? null : Math.round((allocated - reserve) * 100) / 100;
    return {
      id,
      title: project.title as string,
      category: String(project.category ?? "Other"),
      status: String(project.status ?? "planning"),
      available: ids.has(id),
      allocated,
      reservePercent,
      reserve,
      workingBudget,
      committed,
      acceptedCount: accepted.length,
      unpricedAcceptedCount,
      quotedMin: priced.length
        ? Math.min(...priced.map((quote) => quote.amount!))
        : null,
      quotedMax: priced.length
        ? Math.max(...priced.map((quote) => quote.amount!))
        : null,
      quoteCount: priced.length,
      recordedSpend: amount(project.actualSpend),
      quoteHeadroom:
        workingBudget === null || committed === null
          ? null
          : Math.round((workingBudget - committed) * 100) / 100,
      quotes,
    };
  });
  const allocated =
    rows.reduce((sum, row) => sum + pence(row.allocated ?? 0), 0) / 100;
  return {
    version,
    fund: funding.fund,
    allocated,
    unallocated:
      funding.fund === null
        ? null
        : Math.round((funding.fund - allocated) * 100) / 100,
    projects: rows,
  };
}
