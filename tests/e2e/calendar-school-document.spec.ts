import { expect, test, type Page } from '@playwright/test';

const family = {
  id: 'school-document-e2e-family',
  familyName: 'School document test family',
  familyCode: 'school-document-e2e',
};

const member = {
  id: 'school-document-e2e-child',
  familyId: family.id,
  name: 'Test Child',
  role: 'Child',
  ageGroup: 'Child',
  color: '#147c72',
  icon: 'TC',
};

const newsletterSummary = {
  issuer: 'Stewart Fleming Primary School The Pioneer Academy',
  issueDate: '2026-09-04',
  subjects: ['English', 'Maths', 'Science', 'Geography', 'History', 'PE'],
  routines: [{
    label: 'PE timetable',
    detail: 'Test Child - Monday & Friday',
  }],
  documentLabel: 'School newsletter',
};

const skipSetupWizard = () => {
  localStorage.setItem('familyHub_setupComplete', 'skipped');
};

const stubFamilyApis = async (page: Page, state: { documentRequestBody: string; eventPosts: unknown[]; gmailSyncs: number }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'school-document-e2e-user', email: 'school-document-e2e@example.com', displayName: 'E2E User' },
        family: null,
        familyMember: null,
        needsOnboarding: false,
      }),
    });
  });

  // Keep unrelated dashboard hydration quiet while this journey focuses on calendar intake.
  await page.route('**/api/families/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().method() === 'GET' ? '[]' : '{}',
    });
  });
  await page.route('**/api/families/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().method() === 'GET' ? '[]' : '{}',
    });
  });

  await page.route('**/api/families', async (route) => {
    if (route.request().method() !== 'GET' || new URL(route.request().url()).pathname !== '/api/families') {
      return route.fallback();
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ ...family, members: [member] }]) });
  });

  await page.route('**/api/families/*/members', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([member]) });
  });

  await page.route('**/api/families/*/events', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }

    const body = route.request().postDataJSON();
    state.eventPosts.push(body);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: `school-document-event-${state.eventPosts.length}`,
        ...body,
        date: body.date,
        time: body.time,
        person: body.personId,
        type: body.eventType,
        duration: body.durationMinutes,
        recurring: body.recurringPattern,
        isRecurring: body.isRecurring,
        priority: 'medium',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });
  });

  await page.route('**/calendar-intake/inbox', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          forwardingAddress: 'ademolaomosanya+familyhub@gmail.com',
          gmail: { connected: true, googleUserEmail: 'ademolaomosanya@gmail.com', lastSyncAt: null },
          intakes: [],
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'reviewed' }) });
  });

  await page.route('**/api/families/*/gmail', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    state.gmailSyncs += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ processed: 1, matched: 1, autoCreated: 0, needsReview: 1, duplicates: 0, errors: [] }),
    });
  });

  await page.route('**/calendar-intake/document', async (route) => {
    const body = await route.request().postDataBuffer();
    state.documentRequestBody = body?.toString('latin1') || '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        intakeId: 'school-document-e2e-intake',
        text: 'Stewart Fleming Primary School\nPE\nTest Child - Monday & Friday',
        drafts: [],
        documentSummary: newsletterSummary,
        attachments: [{
          id: 'school-document-e2e-attachment',
          fileName: 'stewart-fleming-newsletter.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 128,
          downloadUrl: '/api/families/school-document-e2e-family/calendar-intake/attachments/school-document-e2e-attachment',
        }],
      }),
    });
  });
};

test.describe('school document calendar intake', () => {
  test('uploads a school PDF, preserves the source link, and schedules a weekly routine', async ({ page }) => {
    test.setTimeout(120_000);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
    const consoleErrors: string[] = [];

    await page.addInitScript(skipSetupWizard);
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await stubFamilyApis(page, state);

    await page.goto('/?view=calendar');
    await expect(page.getByRole('heading', { name: 'Add school dates' })).toBeVisible({ timeout: 60_000 });

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'stewart-fleming-newsletter.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-school-document-e2e%'),
    });

    await expect(page.getByText('School newsletter saved for reference')).toBeVisible();
    await expect(page.getByText(newsletterSummary.issuer)).toBeVisible();
    await expect(page.getByText(/No dated calendar events were found/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Open stewart-fleming-newsletter\.pdf/ })).toBeVisible();
    expect(state.documentRequestBody).toContain('stewart-fleming-newsletter.pdf');

    await page.getByRole('button', { name: 'Schedule weekly' }).click();
    await expect(page.getByText('Schedule PE timetable')).toBeVisible();
    await page.getByLabel('Child or family member').selectOption(member.id);
    await page.getByLabel('Start time').fill('16:00');
    await page.getByRole('button', { name: 'Add weekly routine' }).click();

    await expect(page.getByText('2 weekly pe timetable sessions added.')).toBeVisible();
    expect(state.eventPosts).toHaveLength(2);
    expect(state.eventPosts.every((event: any) => event.recurringPattern === 'weekly')).toBe(true);
    expect(state.eventPosts.every((event: any) => event.isRecurring === true)).toBe(true);
    expect(consoleErrors).toEqual([]);
  });

  test('syncs forwarded school email from the connected Gmail account', async ({ page }) => {
    test.setTimeout(120_000);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };

    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state);
    await page.goto('/?view=calendar');

    await expect(page.getByText('Gmail school inbox', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Forward to ademolaomosanya+familyhub@gmail.com')).toBeVisible();
    await page.getByRole('button', { name: 'Sync Gmail' }).click();
    await expect(page.getByText('Synced 1 forwarded email from Gmail.')).toBeVisible();
    expect(state.gmailSyncs).toBe(1);
  });
});
