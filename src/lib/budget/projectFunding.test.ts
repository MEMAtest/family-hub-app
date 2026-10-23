import {
  buildProjectFunding,
  emptyProjectFunding,
  fundingChange,
  readProjectFunding,
} from "./projectFunding";

const projects = [
  {
    id: "windows",
    title: "Windows",
    category: "Other",
    currency: "GBP",
    actualSpend: 500,
    quotes: [
      {
        id: "accepted",
        contractorName: "Glazing company",
        amount: 1500,
        currency: "GBP",
        status: "accepted",
      },
      {
        id: "alternative",
        contractorName: "Other company",
        amount: 1800,
        currency: "GBP",
        status: "pending",
      },
      { id: "rejected", amount: 9999, currency: "GBP", status: "rejected" },
    ],
  },
  { id: "bathroom", title: "Bathroom", category: "Bathroom", quotes: [] },
];
test("keeps allocations, accepted commitments, recorded spend and contingency distinct without double counting", () => {
  const funding = readProjectFunding({
    fund: 10000,
    allocations: {
      windows: { amount: 3000, reservePercent: 10, title: "Windows" },
      bathroom: { amount: 6000, reservePercent: 0, title: "Bathroom" },
    },
  });
  const result = buildProjectFunding(projects, funding, 4);
  expect(result).toMatchObject({
    version: 4,
    fund: 10000,
    allocated: 9000,
    unallocated: 1000,
  });
  expect(result.projects[0]).toMatchObject({
    allocated: 3000,
    reserve: 300,
    workingBudget: 2700,
    committed: 1500,
    acceptedCount: 1,
    recordedSpend: 500,
    quoteHeadroom: 1200,
    quotedMin: 1500,
    quotedMax: 1800,
    quoteCount: 2,
  });
  expect(result.projects[1].recordedSpend).toBeNull();
});
test("does not invent a fund, allocation or spend from a project estimate", () => {
  const result = buildProjectFunding(
    [{ id: "one", title: "Windows", budgetMin: 1000, budgetMax: 9000 }],
    emptyProjectFunding(),
  );
  expect(result).toMatchObject({ fund: null, unallocated: null, allocated: 0 });
  expect(result.projects[0]).toMatchObject({
    allocated: null,
    recordedSpend: null,
    quoteHeadroom: null,
  });
});
test("reports oversubscription and quote shortfalls rather than silently capping them", () => {
  const result = buildProjectFunding(
    projects,
    readProjectFunding({
      fund: 1000,
      allocations: {
        windows: { amount: 1200, reservePercent: 10, title: "Windows" },
      },
    }),
  );
  expect(result.unallocated).toBe(-200);
  expect(result.projects[0].quoteHeadroom).toBe(-420);
});
test("retains reservations for missing projects and handles zero explicitly", () => {
  const result = buildProjectFunding(
    [],
    readProjectFunding({
      fund: 1000,
      allocations: {
        gone: { title: "Roof", amount: 500, reservePercent: 0 },
        zero: { title: "Garden", amount: 0, reservePercent: 0 },
      },
    }),
  );
  expect(result.allocated).toBe(500);
  expect(result.unallocated).toBe(500);
  expect(result.projects[0]).toMatchObject({
    title: "Roof",
    available: false,
    allocated: 500,
  });
  expect(result.projects[1].allocated).toBe(0);
});
test("does not call an invalid or foreign-currency accepted quote zero", () => {
  const result = buildProjectFunding(
    [
      {
        id: "a",
        title: "Roof",
        quotes: [
          { id: "usd", amount: 100, currency: "USD", status: "accepted" },
        ],
      },
    ],
    emptyProjectFunding(),
  );
  expect(result.projects[0]).toMatchObject({
    committed: null,
    unpricedAcceptedCount: 1,
    quotedMin: null,
  });
});
test("uses pence, excludes known QA project names and validates drafts strictly", () => {
  const result = buildProjectFunding(
    [
      {
        id: "a",
        title: "Doors",
        quotes: [
          { id: "q1", amount: 0.1, status: "accepted" },
          { id: "q2", amount: 0.2, status: "accepted" },
        ],
      },
      { id: "qa", title: "Playwright rehearsal" },
    ],
    readProjectFunding({
      fund: 1,
      allocations: { a: { title: "Doors", amount: 0.5, reservePercent: 10 } },
    }),
  );
  expect(result.projects).toHaveLength(1);
  expect(result.projects[0]).toMatchObject({
    committed: 0.3,
    reserve: 0.05,
    quoteHeadroom: 0.15,
  });
  for (const amount of [-1, 0.001, Infinity, "100"])
    expect(
      fundingChange.safeParse({ action: "fund", amount, baseVersion: 0 })
        .success,
    ).toBe(false);
  expect(
    fundingChange.safeParse({
      action: "allocate",
      projectId: "a",
      amount: 100,
      reservePercent: 51,
      baseVersion: 0,
    }).success,
  ).toBe(false);
  expect(
    fundingChange.safeParse({
      action: "fund",
      amount: 100,
      baseVersion: 0,
      extra: true,
    }).success,
  ).toBe(false);
});
