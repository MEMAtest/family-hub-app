import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const testUrl =
  "postgresql://playwright:playwright@127.0.0.1:5432/family_hub_test";

test("project money persists across Money, Contractors and devices without touching bank records", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const stamp = Date.now();
  const family = await db.family.create({
    data: {
      familyName: "Synthetic funding household",
      familyCode: `funding-${stamp}`,
      members: {
        create: {
          name: "Fixture parent",
          role: "parent",
          ageGroup: "adult",
          color: "#168b7d",
          icon: "home",
        },
      },
    },
    include: { members: true },
  });
  const project = (id: string, title: string) => ({
    id,
    title,
    category: "Other",
    status: "planning",
    currency: "GBP",
    budgetMin: 1000,
    budgetMax: 9000,
    milestones: [],
    emails: [],
    tasks: [],
    contacts: [],
    scheduledVisits: [],
    followUps: [],
    attachments: [],
    quotes:
      id === "windows"
        ? [
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
          ]
        : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const prepare = async (target: Page) => {
    await target.route("**/api/families", (route) =>
      route.fulfill({ json: [family] }),
    );
    await target.route("**/api/auth/me", (route) =>
      route.fulfill({
        json: {
          user: { id: "synthetic-user", email: "fixture@example.test" },
          family: null,
          familyMember: null,
          needsOnboarding: false,
        },
      }),
    );
    await target.addInitScript((id) => {
      localStorage.setItem("familyHub_setupComplete", "skipped");
      localStorage.setItem("familyId", id);
    }, family.id);
  };
  const endpoint = `/api/families/${family.id}/budget/project-funding`;
  try {
    await db.familyDocument.create({
      data: {
        familyId: family.id,
        key: "property.projects",
        data: [project("windows", "Windows"), project("bathroom", "Bathroom")],
      },
    });
    await prepare(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?view=budget&moneyView=projects");
    const planner = page.getByRole("region", { name: "Project money planner" });
    const modal = page.getByRole("dialog");
    await expect(
      planner.getByRole("button", { name: "Set project fund", exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Previous month', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Next month', exact: true })).not.toBeVisible();
    await planner
      .getByRole("button", { name: "Set project fund", exact: true })
      .click();
    await modal.getByLabel("Allocation amount", { exact: true }).fill("10000");
    await modal
      .getByRole("button", { name: "Save allocation", exact: true })
      .click();
    await expect(modal).not.toBeVisible();
    await expect(
      planner.getByRole("button", { name: "Edit fund", exact: true }),
    ).toBeVisible();
    await planner
      .getByRole("button", { name: "Allocate money to Windows" })
      .click();
    await modal.getByLabel("Allocation amount", { exact: true }).fill("3000");
    await modal.getByLabel("Project contingency percent").fill("10");
    const failSave = async (route: import("@playwright/test").Route) => {
      if (route.request().method() === "PUT")
        await route.fulfill({
          status: 503,
          json: { error: "Synthetic save unavailable." },
        });
      else await route.continue();
    };
    await page.route(`**${endpoint}`, failSave);
    await modal
      .getByRole("button", { name: "Save allocation", exact: true })
      .click();
    await expect(modal.getByRole("alert")).toHaveText(
      "Synthetic save unavailable.",
    );
    await expect(
      modal.getByLabel("Allocation amount", { exact: true }),
    ).toHaveValue("3000");
    await page.unroute(`**${endpoint}`, failSave);
    await modal
      .getByRole("button", { name: "Save allocation", exact: true })
      .click();
    await expect(modal).not.toBeVisible();
    const windows = planner.getByRole("article", { name: "Windows funding" });
    await expect(windows.getByText("£1,200.00", { exact: true })).toBeVisible();
    await expect(windows.getByText("£300.00", { exact: true })).toBeVisible();
    await expect(
      planner
        .getByRole("img", { name: "Project fund allocation chart" })
        .locator("path.recharts-sector"),
    ).not.toHaveCount(0);
    await planner
      .getByRole("button", { name: "Allocate money to Bathroom" })
      .click();
    await modal.getByLabel("Allocation amount", { exact: true }).fill("8000");
    await modal
      .getByRole("button", { name: "Save allocation", exact: true })
      .click();
    await expect(modal).not.toBeVisible();
    await expect(planner.getByRole("alert")).toHaveText(
      "Allocations exceed the project fund by £1,000.00.",
    );

    await planner
      .getByRole("button", { name: "Allocate money to Windows" })
      .click();
    await modal.getByLabel("Allocation amount", { exact: true }).fill("3500");
    const current = await (await page.request.get(endpoint)).json();
    expect(
      (
        await page.request.put(endpoint, {
          data: { action: "fund", amount: 12000, baseVersion: current.version },
        })
      ).status(),
    ).toBe(200);
    await modal
      .getByRole("button", { name: "Save allocation", exact: true })
      .click();
    await expect(modal.getByRole("alert")).toContainText(
      "changed on another device",
    );
    await expect(
      modal.getByLabel("Allocation amount", { exact: true }),
    ).toHaveValue("3500");
    await modal.getByRole("button", { name: "Review latest plan" }).click();
    await expect(modal).not.toBeVisible();
    await expect(
      planner.getByText("£12,000.00", { exact: true }).first(),
    ).toBeVisible();
    await page.reload();
    await expect(windows.getByText("£3,000.00", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await planner.getByRole('button', { name: 'New project', exact: true }).click();
    await page.getByPlaceholder('e.g., Bathroom Renovation').fill('Guttering');
    await page.getByRole('button', { name: 'Create Project', exact: true }).click();
    await expect(planner.getByRole('article', { name: 'Guttering funding' })).toBeVisible({ timeout: 15_000 });
    await expect(planner.getByRole('status')).toContainText('Project synced. Ready to allocate.');
    await planner.getByRole('button', { name: 'Allocate money to Guttering' }).click();
    await modal.getByRole('button', { name: 'Allocate remaining project fund' }).click();
    await expect(modal.getByLabel('Allocation amount', { exact: true })).toHaveValue('1000');
    await modal.getByLabel('Adjust project allocation').fill('500');
    await modal.getByRole('button', { name: 'Save allocation', exact: true }).click();
    await expect(modal).not.toBeVisible();
    await expect(planner.getByRole('article', { name: 'Guttering funding' }).getByText('£500.00', { exact: true }).first()).toBeVisible();

    const device = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    try {
      const other = await device.newPage();
      await prepare(other);
      await other.goto(
        "/?view=contractors&contractorTab=money&projectId=windows",
      );
      const shared = other.getByRole("region", {
        name: "Project money planner",
      });
      await expect(
        shared
          .getByRole("article", { name: "Windows funding" })
          .getByText("£3,000.00", { exact: true }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        shared
          .getByRole("article", { name: "Bathroom funding" })
          .getByText("£8,000.00", { exact: true }).first(),
      ).toBeVisible();
      expect(
        await other.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    } finally {
      await device.close();
    }
    const saved = await (await page.request.get(endpoint)).json();
    expect(saved).toMatchObject({
      fund: 12000,
      allocated: 11500,
      unallocated: 500,
    });
    expect(
      (
        await page.request.put(endpoint, {
          data: {
            action: "allocate",
            projectId: "not-this-family",
            amount: 1,
            reservePercent: 0,
            baseVersion: saved.version,
          },
        })
      ).status(),
    ).toBe(404);
    expect(
      await db.budgetTransaction.count({ where: { familyId: family.id } }),
    ).toBe(0);
    expect(
      await db.familyDocument.findUnique({
        where: {
          familyId_key: { familyId: family.id, key: "money.project-funding" },
        },
      }),
    ).not.toBeNull();
  } finally {
    await page.close();
    await db.family.delete({ where: { id: family.id } });
    await db.$disconnect();
  }
});
