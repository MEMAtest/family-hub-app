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

const stubFamilyApis = async (
  page: Page,
  state: {
    documentRequestBody: string;
    eventPosts: unknown[];
    gmailSyncs: number;
    taskPosts?: unknown[];
    assistantRequests?: unknown[];
    failEventTitles?: string[];
    inboxPatches?: Record<string, unknown>[];
  },
  options: { gmailConnected?: boolean; inboxItems?: unknown[]; calendarEvents?: unknown[] } = {},
) => {
  let inboxItems = options.inboxItems || [];

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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(options.calendarEvents || []) });
      return;
    }

    const body = route.request().postDataJSON();
    state.eventPosts.push(body);
    if (state.failEventTitles?.includes(body.title)) {
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Conflicts with another event.' }) });
      return;
    }
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

  await page.route('**/api/families/*/events/assistant', async (route) => {
    const { command } = route.request().postDataJSON();
    state.assistantRequests?.push(command);
    if (!/Askia brings in toys on Tuesdays and Fridays/i.test(command)) {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Unexpected assistant request' }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        action: 'create',
        summary: 'Add a repeating reminder for Askia.',
        warnings: [],
        taskDraft: {
          title: 'Bring in toys', assignees: [member.id], assignedDate: '2026-10-02', dueDate: '2026-10-02',
          taskType: 'other', priority: 'medium', notes: 'Created from the quick plan.',
          recurringPattern: { frequency: 'weekly', interval: 1, daysOfWeek: [2, 5] },
        },
      }),
    });
  });

  await page.route('**/api/families/*/events/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ summary: 'A school workshop for the family. Bring the reading record and sign in at the school office.' }),
    });
  });

  await page.route('**/api/families/*/tasks', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    const body = route.request().postDataJSON();
    state.taskPosts?.push(body);
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'weekly-toys-task', ...body, completedAt: null, completedBy: null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
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
          gmail: { connected: options.gmailConnected ?? true, googleUserEmail: options.gmailConnected === false ? null : 'ademolaomosanya@gmail.com', lastSyncAt: null },
          whatsappConfigured: true,
          whatsappDeliveryTrackingConfigured: true,
          whatsappConsent: 'opted_in',
          intakes: inboxItems,
        }),
      });
      return;
    }
    if (route.request().method() === 'PATCH') {
      const patch = route.request().postDataJSON();
      state.inboxPatches?.push(patch);
      inboxItems = inboxItems.map((item: any) => item.id === patch.intakeId
        ? { ...item, needsReview: patch.needsReview, status: patch.needsReview > 0 ? 'partial_review' : 'reviewed_imported' }
        : item);
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

  await page.route('**/api/families/*/gmail/connect', async (route) => {
    const authUrl = new URL(
      '/oauth-test',
      process.env.PLAYWRIGHT_BASE_URL || `http://${process.env.PLAYWRIGHT_HOST || '127.0.0.1'}:${process.env.PLAYWRIGHT_PORT || 3101}`,
    );
    authUrl.searchParams.set('scope', 'gmail.readonly');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authUrl: authUrl.toString() }),
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
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0, inboxPatches: [] as Record<string, unknown>[] };
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

  test('shows automatic school monitoring and syncs Gmail on demand', async ({ page }) => {
    test.setTimeout(120_000);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };

    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state);
    await page.goto('/?view=calendar');

    await expect(page.getByText('Gmail school inbox', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Stewart Fleming mail syncs morning and evening/)).toBeVisible();
    await expect(page.getByText('WhatsApp reminders and delivery-status tracking are active. Send STOP to pause.')).toBeVisible();
    await expect(page.getByText('Forward other school emails to ademolaomosanya+familyhub@gmail.com')).toBeVisible();
    await page.getByRole('button', { name: 'Sync Gmail' }).click();
    await expect(page.getByText('Synced 1 email from Gmail; 0 added to the calendar and 1 left for review.')).toBeVisible();
    expect(state.gmailSyncs).toBe(1);
  });

  test('does not put an already-added confirmed meeting back in the review queue', async ({ page }) => {
    test.setTimeout(120_000);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0, inboxPatches: [] as Record<string, unknown>[] };
    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state, {
      inboxItems: [{
        id: 'confirmed-meeting', subject: 'Meeting Booking Confirmation', status: 'review_required',
        receivedAt: '2026-09-30T08:00:00.000Z', autoCreated: 1, needsReview: 0,
        duplicateCount: 0, conflictCount: 0, parsedDrafts: [],
      }, {
        id: 'no-dates-newsletter', subject: 'School newsletter without dated events', status: 'no_events',
        receivedAt: '2026-09-30T09:00:00.000Z', autoCreated: 0, needsReview: 0,
        duplicateCount: 0, conflictCount: 0, parsedDrafts: [],
      }],
    });
    await page.goto('/?view=calendar');

    await expect(page.getByText('Gmail school inbox', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: /Meeting Booking Confirmation/ })).toHaveCount(0);
    await page.getByRole('button', { name: /School newsletter without dated events/ }).click();
    await expect(page.getByRole('button', { name: 'Mark reviewed' })).toBeVisible();
    await page.getByRole('button', { name: 'Mark reviewed' }).click();
    await expect(page.getByText('Marked this email as reviewed.')).toBeVisible();
    expect(state.inboxPatches).toContainEqual({ intakeId: 'no-dates-newsletter', createdEventIds: [], needsReview: 0 });
  });

  test('quick plan previews and saves a repeating child reminder', async ({ page }) => {
    test.setTimeout(120_000);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0, taskPosts: [] as unknown[], assistantRequests: [] as unknown[] };
    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state);
    await page.goto('/?view=calendar');

    await expect(page.getByRole('heading', { name: 'Quick plan' })).toBeVisible({ timeout: 60_000 });
    await page.getByRole('textbox', { name: 'Quick plan' }).fill('Askia brings in toys on Tuesdays and Fridays');
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect.poll(() => state.assistantRequests).toHaveLength(1);
    expect(state.assistantRequests).toEqual(['Askia brings in toys on Tuesdays and Fridays']);
    await expect(page.getByText(/Bring in toys/)).toBeVisible();
    await expect(page.getByText('Every Tue & Fri')).toBeVisible();
    await page.getByRole('button', { name: 'Add repeating reminder' }).click();

    await expect(page.getByText('Saved "Bring in toys" as a family reminder.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Important this week' })).toBeVisible();
    expect(state.taskPosts).toHaveLength(1);
    expect(state.taskPosts[0]).toMatchObject({
      title: 'Bring in toys', assignees: [member.id],
      recurringPattern: { frequency: 'weekly', daysOfWeek: [2, 5] },
    });
  });

  test('shows an all-day event clearly and renders the concise AI summary in its hover details', async ({ page }) => {
    test.setTimeout(120_000);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
    const event = {
      id: 'school-workshop', title: 'Parents workshop', personId: member.id,
      eventDate: '2026-09-30T00:00:00.000Z', eventTime: '2026-09-30T00:00:00.000Z',
      durationMinutes: 1439, location: 'School hall', eventType: 'education',
      recurringPattern: 'none', isRecurring: false, notes: 'School email did not specify a time. Bring the reading record. Sign in at the school office.',
      cost: 0, source: 'gmail-school-email', sourceId: 'confirmed-meeting',
    };
    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state, { calendarEvents: [event] });
    await page.goto('/?view=calendar');

    const calendarEvent = page.getByText('Parents workshop', { exact: true }).nth(2);
    await expect(calendarEvent).toBeVisible({ timeout: 60_000 });
    await calendarEvent.hover();
    await expect(page.getByText('Wed 30 Sep · All day')).toBeVisible();
    await expect(page.getByText('Bring the reading record. Sign in at the school office.', { exact: true })).toBeVisible();
    const aiSummaryButton = page.getByRole('button', { name: 'AI summary' });
    await aiSummaryButton.hover();
    await expect(aiSummaryButton).toBeVisible();
    await aiSummaryButton.click();
    await expect(page.getByText('A school workshop for the family. Bring the reading record and sign in at the school office.')).toBeVisible();
  });

  test('opens Google OAuth when Gmail is not connected', async ({ page }) => {
    test.setTimeout(120_000);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };

    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state, { gmailConnected: false });
    await page.goto('/?view=calendar');

    await expect(page.getByRole('button', { name: 'Connect Gmail' })).toBeEnabled({ timeout: 60_000 });
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Connect Gmail' }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/oauth-test\?scope=gmail\.readonly/);
  });

  test('keeps failed email events in the review queue after a partial import', async ({ page }) => {
    test.setTimeout(120_000);
    const state = {
      documentRequestBody: '',
      eventPosts: [] as unknown[],
      gmailSyncs: 0,
      failEventTitles: ['Book Fair'],
      inboxPatches: [] as Record<string, unknown>[],
    };
    const draft = (importId: string, title: string, date: string) => ({
      importId,
      title,
      person: member.id,
      date,
      time: '09:00',
      duration: 60,
      recurring: 'none',
      cost: 0,
      type: 'education',
      isRecurring: false,
      priority: 'high',
      status: 'confirmed',
      confidence: 0.9,
      source: `${title} ${date}`,
      sourceLine: 1,
      importStatus: 'ready',
      warnings: [],
    });
    const intake = {
      id: 'school-email-e2e-intake',
      sender: 'office@stewartfleming.bromley.sch.uk',
      subject: 'Weekly update email',
      status: 'review_required',
      receivedAt: new Date().toISOString(),
      autoCreated: 0,
      needsReview: 2,
      authenticatedSchoolSender: true,
      duplicateCount: 0,
      conflictCount: 0,
      createdEventIds: [],
      parsedDrafts: [
        draft('workshop-draft', 'Parent Workshop', '2026-10-01'),
        draft('book-fair-draft', 'Book Fair', '2026-10-02'),
      ],
      attachments: [],
      documentSummary: null,
    };

    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state, { inboxItems: [intake] });
    await page.goto('/?view=calendar');

    await page.getByRole('button', { name: /Weekly update email.*Review/ }).click();
    await page.getByRole('button', { name: 'Import 2' }).click();

    await expect(page.getByText('1 event added to the calendar.')).toBeVisible();
    await expect.poll(() => state.inboxPatches.length).toBe(1);
    expect(state.inboxPatches[0]).toMatchObject({
      intakeId: intake.id,
      needsReview: 1,
      createdEventIds: ['school-document-event-1'],
    });
    await expect(page.getByText('Book Fair', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /1 to review/ })).toBeVisible();
  });

  test('requires a child assignment for class-specific all-day email events', async ({ page }) => {
    test.setTimeout(120_000);
    const state = {
      documentRequestBody: '',
      eventPosts: [] as unknown[],
      gmailSyncs: 0,
      inboxPatches: [] as Record<string, unknown>[],
    };
    const intake = {
      id: 'school-cohort-e2e-intake',
      sender: 'office@stewartfleming.bromley.sch.uk',
      subject: 'Reading mornings',
      status: 'review_required',
      receivedAt: new Date().toISOString(),
      autoCreated: 0,
      needsReview: 1,
      authenticatedSchoolSender: true,
      duplicateCount: 0,
      conflictCount: 0,
      createdEventIds: [],
      parsedDrafts: [{
        importId: 'reading-morning-draft',
        title: 'Reading Morning (Key Stage 2)',
        person: '',
        date: '2026-10-01',
        time: '09:00',
        timeSpecified: false,
        duration: 60,
        recurring: 'none',
        cost: 0,
        type: 'education',
        notes: 'Imported from school email',
        isRecurring: false,
        priority: 'high',
        status: 'confirmed',
        confidence: 0.86,
        source: 'Key Stage 2 reading morning Thursday 1 October 2026',
        sourceLine: 1,
        importStatus: 'ready',
        warnings: [],
      }],
      attachments: [],
      documentSummary: null,
    };

    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state, { inboxItems: [intake] });
    await page.goto('/?view=calendar');

    await page.getByRole('button', { name: /Reading mornings.*Review/ }).click();
    await expect(page.getByText('2026-10-01 · Time not specified')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import 1' })).toHaveCount(0);
    await page.getByLabel('Assign Reading Morning (Key Stage 2) to').selectOption(member.id);
    await page.getByRole('button', { name: 'Import 1' }).click();

    await expect(page.getByText('1 event added to the calendar.')).toBeVisible();
    expect(state.eventPosts).toHaveLength(1);
    expect(state.eventPosts[0]).toMatchObject({ personId: member.id, time: '00:00', durationMinutes: 1439 });
    expect(state.inboxPatches[0]).toMatchObject({ intakeId: intake.id, needsReview: 0 });
  });
});
