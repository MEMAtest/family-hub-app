import { test, expect } from "@playwright/test";

test("Brain phone editor fits a short screen, auto-titles, preserves manual titles, supports AI and persists edits", async ({
  page,
}) => {
  const family = {
    id: "brain-phone-fixture",
    familyName: "Synthetic household",
    familyCode: "brain",
    members: [],
  };
  const project = {
    id: "phone-project",
    familyId: family.id,
    name: "Phone notes",
    color: "#087f73",
    icon: "book",
    status: "active",
    sortOrder: 0,
    createdAt: "2026-10-23T12:00:00Z",
    updatedAt: "2026-10-23T12:00:00Z",
    _count: { nodes: 0 },
  };
  const nodes: Array<Record<string, unknown>> = [];
  let failAI = false;
  await page.route("**/api/families/**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/families", (route) =>
    route.fulfill({ json: [family] }),
  );
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        user: { id: "synthetic", email: "fixture@example.test" },
        family: null,
        familyMember: null,
        needsOnboarding: false,
      },
    }),
  );
  await page.route("**/brain/projects", (route) =>
    route.fulfill({ json: [project] }),
  );
  await page.route("**/brain/today", (route) => route.fulfill({ json: { total: 0, groups: [] } }));
  await page.route("**/brain/nodes?*", (route) =>
    route.fulfill({ json: nodes }),
  );
  await page.route("**/brain/nodes", async (route) => {
    const node = route.request().postDataJSON();
    nodes.push(node);
    await route.fulfill({ json: node });
  });
  await page.route("**/brain/nodes/*", async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    const node = nodes.find((item) => item.id === id)!;
    Object.assign(node, route.request().postDataJSON());
    await route.fulfill({ json: node });
  });
  await page.route("**/api/ai/text-enhance", (route) =>
    route.fulfill(
      failAI
        ? {
            status: 503,
            json: { error: "Synthetic AI temporarily unavailable" },
          }
        : {
            json: {
              enhanced:
                route.request().postDataJSON().mode === "title"
                  ? "Kitchen shopping plan"
                  : "Remember to buy milk tomorrow.",
              source: "ai",
            },
          },
    ),
  );
  await page.addInitScript(() => {
    localStorage.setItem("familyHub_setupComplete", "skipped");
    localStorage.setItem("familyId", "brain-phone-fixture");
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=brain");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /interactive-widget=resizes-content/);
  await page.getByRole("button", { name: "Phone notes", exact: true }).click();
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add note" });
  const body = dialog.getByPlaceholder(
    "Write the note, checklist, or linked thought...",
  );
  await body.fill("Buy milk tomorrow. Check the fridge first.");
  await expect(dialog.getByLabel("Note title", { exact: true })).toHaveValue(
    "Buy milk tomorrow.",
  );
  await dialog
    .getByLabel("Note title", { exact: true })
    .fill("My shopping note");
  await body.fill("remeber to buy milk tomorow");
  await expect(dialog.getByLabel("Note title", { exact: true })).toHaveValue(
    "My shopping note",
  );
  await dialog.getByRole("button", { name: "AI enhance", exact: true }).click();
  await expect(body).toHaveValue("Remember to buy milk tomorrow.");
  await expect(dialog.getByText("AI updated the wording.")).toBeVisible();
  await dialog.getByRole("button", { name: "Undo AI changes" }).click();
  await expect(body).toHaveValue("remeber to buy milk tomorow");
  await dialog.getByRole("button", { name: "Suggest note title" }).click();
  await expect(dialog.getByLabel("Note title", { exact: true })).toHaveValue(
    "Kitchen shopping plan",
  );
  failAI = true;
  await dialog.getByRole("button", { name: "AI enhance", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Synthetic AI temporarily unavailable",
  );
  await expect(body).toHaveValue("remeber to buy milk tomorow");
  await page.setViewportSize({ width: 360, height: 500 });
  const save = dialog.getByRole("button", { name: "Create Note", exact: true });
  await expect(save).toBeInViewport();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  await save.click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Phone notes", exact: true }).click();
  const note = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Kitchen shopping plan",
        exact: true,
      }),
    });
  await note.getByRole("button").first().click();
  const details = page.getByRole("dialog", { name: "Note details" });
  await details
    .getByLabel("Note title", { exact: true })
    .fill("Updated shopping plan");
  await details
    .getByPlaceholder("Add notes (markdown supported)...")
    .fill("Buy milk and eggs");
  await details.getByRole("button", { name: "Close note details" }).click();
  await expect
    .poll(() => nodes[0])
    .toMatchObject({
      title: "Updated shopping plan",
      content: "Buy milk and eggs",
    });
  await page.reload();
  await page.getByRole("button", { name: "Phone notes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Updated shopping plan", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "output/playwright/brain-phone-release.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Updated shopping plan', exact: true }) }).getByRole('button').first().click();
  expect(await page.getByLabel('Note title', { exact: true }).first().evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
});
