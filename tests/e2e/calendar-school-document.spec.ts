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

const schoolSource = {
  institution: 'stewart-fleming', institutionName: 'Stewart Fleming Primary School',
  transportSender: 'office@stewartfleming.bromley.sch.uk', originalSenderClaim: null,
  evidence: ['Stewart Fleming Primary School'], links: [], contentRequired: false, isSchool: true,
};

const skipSetupWizard = () => {
  localStorage.setItem('familyHub_setupComplete', 'skipped');
};

const openSchoolInbox = async (page: Page) => {
  await page.goto('/?view=calendar');
  await page.getByRole('button', { name: 'School inbox & quick plan', exact: true }).click();
};

test('phone calendar shows verified bins tomorrow without opening Property or the inbox and survives reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-10-08T19:00:00Z') });
  await page.addInitScript(skipSetupWizard);
  const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
  await stubFamilyApis(page, state, { calendarEvents: [
    { id: 'bin-occurrence', personId: member.id, title: 'Bins: Food waste + Mixed recycling', eventDate: '2026-10-09T00:00:00Z',
      eventTime: '2026-10-09T00:00:00Z', durationMinutes: 0, eventType: 'other', recurringPattern: 'none', isRecurring: false,
      metadata: { calendarTiming: { status: 'unknown' }, binCollection: { verified: true } } },
    { id: 'existing-trip', personId: member.id, title: 'Existing trip', eventDate: '2026-10-08T00:00:00Z',
      eventTime: '2026-10-08T06:00:00Z', durationMinutes: 2880, eventType: 'personal', recurringPattern: 'none', isRecurring: false },
  ] });
  await page.route('**/api/families/*/bin-collections', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    status: 'connected', checkedAt: '2026-10-08T19:00:00Z', sourceUrl: 'https://recyclingservices.bromley.gov.uk/waste/3670007',
    providerName: 'Bromley Council', collections: [
      { date: '2026-10-09', services: ['Food waste', 'Mixed recycling (cans, plastics and glass)'] },
      { date: '2026-10-16', services: ['Food waste', 'Paper and cardboard', 'Non-recyclable refuse'] },
    ],
  }) }));
  await page.goto('/?view=calendar');
  const strip = page.getByRole('region', { name: 'Bin collections', exact: true });
  await expect(strip.getByRole('heading', { name: 'Bins tonight', exact: true })).toBeVisible();
  await expect(strip).toContainText('food waste + mixed recycling');
  await expect(strip).toContainText('Put these out tonight for collection tomorrow.');
  await expect(strip).toContainText('Smart reminder for each parent at 20:00');
  await expect(strip).toContainText('Following: Friday 16 October | food waste + paper and cardboard + non-recyclable refuse');
  await expect(strip).toContainText('Checked automatically with Bromley Council');
  await expect(strip.getByRole('link', { name: 'Council collection calendar' })).toHaveAttribute('href', 'https://recyclingservices.bromley.gov.uk/waste/3670007');
  expect((await strip.boundingBox())!.y).toBeLessThan(400);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/playwright/bins-phone-rehearsal-20261008.png' });
  await page.getByRole('button', { name: 'Friday 9 October', exact: true }).click();
  await expect(page.getByText('Competing events', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Bins: Food waste.*Household/ })).toBeVisible();
  await page.reload();
  await expect(strip.getByRole('heading', { name: 'Bins tonight', exact: true })).toBeVisible();
  expect(state.eventPosts).toHaveLength(0);
});

test('council failures expose retry rather than a guessed collection date on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(skipSetupWizard);
  const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
  await stubFamilyApis(page, state);
  let attempts = 0;
  await page.route('**/api/families/*/bin-collections', route => {
    attempts += 1;
    return route.fulfill({ status: attempts === 1 ? 503 : 200, contentType: 'application/json', body: JSON.stringify(attempts === 1
      ? { status: 'unavailable', collections: [] } : { status: 'connected', collections: [{ date: '2099-10-09', services: ['Paper and cardboard'] }] }) });
  });
  await page.goto('/?view=calendar');
  const strip = page.getByRole('region', { name: 'Bin collections', exact: true });
  await expect(strip.getByRole('heading', { name: 'Bin collections unavailable' })).toBeVisible();
  await strip.getByRole('button', { name: 'Retry bin collections' }).click();
  await expect(strip).toContainText('paper and cardboard');
  await expect(strip.getByRole('heading', { name: 'Next bins' })).toBeVisible();
  expect(attempts).toBe(2);
});

test('Grandir connection verifies Askia, requires consent, survives reload and reconnects on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(skipSetupWizard);
  const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
  await stubFamilyApis(page, state, { supersededNurseryPreviewCount: 4 });
  let connected = false;
  let needsReconnect = false;
  let syncs = 0;
  let expires = false;
  await page.route('**/api/families/*/grandir', async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      expect(body.consent).toBe(true);
      expect(body.email).toBe('parent@example.com');
      expect(body.password).toBe('fixture-password-only');
      connected = true;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ configured: true, connected, needsReconnect,
      childName: 'Askia', nurseryName: 'Test nursery', parentEmail: 'parent@example.com',
      lastSyncAt: syncs ? '2026-10-07T19:00:00Z' : null, lastError: null }) });
  });
  await page.route('**/api/families/*/grandir/sync', async route => {
    syncs += 1;
    if (expires) {
      connected = false; needsReconnect = true;
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Grandir needs reconnection. Sign in again.' }) });
    } else await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ processed: 2, autoCreated: 0, needsReview: 0, duplicates: 0, changedNotices: [] }) });
  });
  await openSchoolInbox(page);
  await expect(page.getByText('4 email previews replaced by verified full Grandir posts.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Connect Grandir', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Parent email').fill('parent@example.com');
  await dialog.getByLabel('Grandir password').fill('fixture-password-only');
  await expect(dialog.getByRole('button', { name: 'Connect nursery intake', exact: true })).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Connect nursery intake', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Connected for Askia', { exact: true })).toBeVisible();
  await expect(page.getByText('2 notices checked', { exact: false })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'School inbox & quick plan', exact: true }).click();
  await expect(page.getByText('Connected for Askia', { exact: true })).toBeVisible();
  expires = true;
  await page.getByRole('button', { name: 'Sync Grandir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reconnect', exact: true })).toBeVisible();
  await expect(page.getByText('Connected for Askia', { exact: true })).toHaveCount(0);
  expect(state.eventPosts).toHaveLength(0);
  await page.reload();
  await page.getByRole('button', { name: 'School inbox & quick plan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reconnect', exact: true })).toBeVisible();
});

test('rejected Gmail authorization offers a persistent reconnect action on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(skipSetupWizard);
  const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
  await stubFamilyApis(page, state);
  let connected = true;
  await page.route('**/calendar-intake/inbox', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      gmail: { connected, googleUserEmail: 'test@example.com', lastSyncAt: null }, intakes: [],
      pendingReviewCount: 0, pendingReviewEmailCount: 0,
    }) });
  });
  await page.route('**/api/families/*/gmail', async (route) => {
    connected = false;
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({
      code: 'GMAIL_RECONNECT_REQUIRED', error: 'Gmail authorization expired or was revoked. Reconnect Gmail to resume automatic checks.',
    }) });
  });
  await openSchoolInbox(page);
  await page.getByRole('button', { name: 'Sync Gmail', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reconnect Gmail', exact: true })).toBeVisible();
  await expect(page.getByText('Gmail needs reconnection.', { exact: false })).toBeVisible();
  await expect(page.getByText('Connected to test@example.com', { exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'School inbox & quick plan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reconnect Gmail', exact: true })).toBeVisible();
  expect(state.eventPosts).toHaveLength(0);
});

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
    autoProcessRequests?: Record<string, unknown>[];
  },
  options: { gmailConnected?: boolean; inboxItems?: unknown[]; calendarEvents?: unknown[];
    supersededNurseryPreviewCount?: number } = {},
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
  await page.route('**/api/families/*/grandir', async route => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ configured: true, connected: false, needsReconnect: false,
      childName: null, nurseryName: null, parentEmail: null, lastSyncAt: null, lastError: null }) });
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
    if (/gyming tomorrow at 6:30am/i.test(command)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          action: 'create',
          summary: 'Add a gym session for Test Child tomorrow at 6:30am.',
          warnings: [],
          draft: {
            title: 'Gyming', person: member.id, date: '2026-10-01', time: '06:30', duration: 60,
            location: '', recurring: 'none', cost: 0, type: 'fitness', isRecurring: false,
            priority: 'medium', status: 'confirmed', notes: '',
          },
        }),
      });
      return;
    }
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
          supersededNurseryPreviewCount: options.supersededNurseryPreviewCount || 0,
          pendingReviewEmailCount: inboxItems.filter((item: any) => item.needsReview > 0).length,
          intakes: inboxItems,
        }),
      });
      return;
    }
    if (route.request().method() === 'PATCH') {
      const patch = route.request().postDataJSON();
      state.inboxPatches?.push(patch);
      inboxItems = inboxItems.map((item: any) => item.id === patch.intakeId ? {
        ...item,
        ...(patch.needsReview !== undefined ? { needsReview: patch.needsReview, status: patch.needsReview > 0 ? 'partial_review' : 'reviewed_imported' } : {}),
        parsedDrafts: (item.parsedDrafts || []).map((draft: any) => {
          const choice = patch.assignments?.find((value: any) => value.draftId === draft.importId);
          return choice ? { ...draft, person: choice.personId, schoolAssignment: {
            basis: 'manual', originalPersonId: draft.person, sourceKey: 'stewart-fleming',
            manualOverride: { personId: choice.personId, actorId: 'school-document-e2e-user', at: '2026-09-30T10:00:00Z' },
          } } : draft;
        }),
      } : item);
      const saved: any = inboxItems.find((item: any) => item.id === patch.intakeId);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: saved?.status || 'reviewed', parsedDrafts: saved?.parsedDrafts || [], outstandingDrafts: saved?.parsedDrafts || [] }) });
      return;
    }
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      state.autoProcessRequests?.push(body);
      const item: any = inboxItems.find((item: any) => item.id === body.intakeId);
      if (body.action === 'add-nursery-task') {
        const next = { ...item, preparationTask: { id: 'nursery-task', dueDate: body.dueDate, completed: false }, actionRequired: false, needsReview: 0 };
        inboxItems = inboxItems.map((item: any) => item.id === body.intakeId ? next : item);
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ taskId: 'nursery-task', dueDate: body.dueDate, completed: false }) });
        return;
      }
      const next = { ...item, parsedDrafts: [], outstandingDrafts: [], pendingAutoCreate: 0, autoProcessEligibleCount: 0,
        autoCreated: 1, newlyCreatedCount: 1, needsReview: 0, conflictCount: 0, status: 'auto_created', actionRequired: false };
      inboxItems = inboxItems.map((item: any) => item.id === body.intakeId ? next : item);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(next) });
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

  await page.route('**/api/families/*/gmail/connect', async (route) => {
    const authUrl = new URL(
      '/oauth-test',
      new URL(route.request().url()).origin,
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
        schoolSource,
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
  test('ordinary upcoming click fetches travel metadata absent from the hydrated personal event', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-30T10:00:00Z'));
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() => {
      localStorage.setItem('familyHub_setupComplete', 'skipped');
      localStorage.setItem('omosanya_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
    const row = { id: 'authoritative-trip', title: 'Family visit', personId: member.id,
      eventDate: '2026-10-01T06:00:00Z', eventTime: '2026-10-01T06:00:00Z', durationMinutes: 60,
      recurringPattern: 'none', isRecurring: false, eventType: 'personal', cost: 0,
      createdAt: '2026-09-30T07:00:00Z', updatedAt: '2026-09-30T07:00:00Z', metadata: {} as Record<string, unknown> };
    await stubFamilyApis(page, state, { calendarEvents: [row] });
    await page.goto('/?view=calendar');
    await expect(page.locator('html')).toHaveClass(/dark/);
    const upcoming = page.getByRole('region', { name: 'Upcoming this week' });
    await expect(upcoming.getByRole('button', { name: /Family visit/ })).toBeVisible();
    // Change only the server response after hydration: a title/category heuristic cannot pass this.
    row.metadata = { travel: { destination: 'Dusseldorf', departureDate: '2026-10-01',
      preparation: [{ id: 'prep', title: 'Check documents', status: 'unknown' }],
      coverage: [{ id: 'cover', title: 'Confirm pickup cover', status: 'unknown' }] } };
    await upcoming.getByRole('button', { name: /Family visit/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Travel details' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Preparation')).toHaveValue('Check documents');
    await expect(dialog.getByLabel('Household cover')).toHaveValue('Confirm pickup cover');
    await expect(dialog.getByLabel('Departure date')).toHaveValue('2026-10-01');
    await expect(dialog.getByLabel('Return date')).toHaveValue('');
    await expect(dialog.locator('input[type="time"]').nth(1)).toHaveValue('');
    const dateWidth = await dialog.getByLabel('Departure date').evaluate((node) => node.getBoundingClientRect().width);
    expect(dateWidth).toBeGreaterThan(150);
    const office = dialog.getByRole('button', { name: 'Office', exact: true });
    const colors = await office.evaluate((node) => ({ text: getComputedStyle(node).color,
      background: getComputedStyle(node.closest('.travel-dialog')!).backgroundColor }));
    const luminance = (color: string) => {
      const channels = color.match(/\d+/g)!.slice(0, 3).map((value) => Number(value) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const textLight = luminance(colors.text), backgroundLight = luminance(colors.background);
    expect((Math.max(textLight, backgroundLight) + 0.05) / (Math.min(textLight, backgroundLight) + 0.05)).toBeGreaterThanOrEqual(4.5);
    await expect(dialog.getByRole('button', { name: 'Close travel details' })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('travel-phone-dark.png'), fullPage: true });
    const save = dialog.getByRole('button', { name: 'Save travel details' });
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeVisible();
    const saveBounds = await save.boundingBox();
    expect(saveBounds!.y + saveBounds!.height).toBeLessThanOrEqual(812);
    await page.screenshot({ path: test.info().outputPath('travel-phone-footer.png'), fullPage: true });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(state.eventPosts).toEqual([]);
  });

  test('school photo edit has canonical fields, explicit unknown time and source-preserving draft', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-30T10:00:00Z'));
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
    const row = { id: 'photo-editor-source', title: 'Individual And Sibling Photographs. All Children Should Wear Their Full School Uniform Today',
      personId: member.id, eventDate: '2026-09-30T00:00:00Z', eventTime: '2026-09-30T00:00:00Z',
      durationMinutes: 1439, recurringPattern: 'none', isRecurring: false, eventType: 'education', cost: 0,
      location: 'school. Come along to discuss our community.', source: 'gmail-school-email',
      notes: 'School email did not specify a time. Please wear full uniform.',
      createdAt: '2026-09-29T07:00:00Z', updatedAt: '2026-09-29T07:00:00Z' };
    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state, { calendarEvents: [row] });
    await page.goto('/?view=calendar');
    await page.getByRole('region', { name: 'Upcoming this week' }).getByRole('button', { name: /Individual and sibling photographs/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Event' });
    await expect(dialog.getByPlaceholder('Enter event title')).toHaveValue('Individual and sibling photographs');
    await expect(dialog.locator('#calendar-event-location')).toHaveValue('School');
    await expect(dialog.locator('input[type="time"]')).toHaveValue('');
    await expect(dialog.locator('input[type="time"]')).toBeDisabled();
    await expect(dialog.getByText('Duration not provided by source')).toBeVisible();
    await dialog.getByRole('button', { name: 'Close event form' }).click();
    expect(state.eventPosts).toEqual([]);
    expect(row.title).toContain('All Children');
  });
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-30T10:00:00Z'));
  });
  test('school review count is visible before opening the collapsed inbox, including on phones', async ({ page }) => {
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
    await page.setViewportSize({ width: 390, height: 844 });
    await stubFamilyApis(page, state, { inboxItems: [{ id: 'pending-school-mail', status: 'partial_review', needsReview: 8, autoCreated: 9, conflictCount: 0, duplicateCount: 0, parsedDrafts: [] }] });
    await page.goto('/?view=calendar');
    const action = page.getByRole('button', { name: 'School inbox & quick plan', exact: true });
    await expect(action).toContainText('Review 8');
    await expect(action.locator('#school-review-count')).toHaveAttribute('title', '8 suggestions across 1 school email need a decision; not added events');
    await expect(action).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('region', { name: 'School inbox and import' })).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await action.click();
    await expect(page.getByRole('heading', { name: 'School & nursery inbox' })).toBeVisible();
  });

  test('conflicting Phonics series is flagged at calendar entry without modifying the saved source', async ({ page }) => {
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
    await stubFamilyApis(page, state, { calendarEvents: [{ id: 'phonics-source-conflict', title: 'Phonics', personId: member.id, eventDate: '2026-09-18T00:00:00Z', eventTime: '2026-09-18T15:30:00Z', durationMinutes: 60, recurringPattern: 'weekly', isRecurring: true, eventType: 'education', notes: 'Screening check June –Friday 18', cost: 0 }] });
    await page.goto('/?view=calendar');
    const warning = page.getByRole('region', { name: 'School dates to confirm' });
    await expect(warning.locator('details')).not.toHaveAttribute('open', '');
    await warning.locator('summary').click();
    await expect(warning).toContainText('Source says June');
    await expect(warning).toContainText('Held from the calendar until confirmed.');
    await expect(page.locator('.rbc-event').filter({ hasText: 'Phonics' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Upcoming this week' })).not.toContainText('Phonics');
    await warning.getByRole('button', { name: /Phonics: check school date/ }).click();
    await expect(page.getByRole('checkbox', { name: 'Stop repeating on save' })).toBeVisible();
    await expect(page.getByLabel('What is this event about? (optional)')).toHaveValue('Screening check June –Friday 18');
    await page.getByRole('button', { name: 'Close event form' }).click();
    await page.getByRole('button', { name: 'School inbox & quick plan', exact: true }).click();
    await expect(page.getByRole('region', { name: 'School inbox and import' })).not.toContainText('Phonics');
    expect(state.eventPosts).toEqual([]);
  });
  test('uploads a school PDF, preserves the source link, and schedules a weekly routine', async ({ page }) => {
    test.setTimeout(120_000);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0, inboxPatches: [] as Record<string, unknown>[] };
    const consoleErrors: string[] = [];

    await page.addInitScript(skipSetupWizard);
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await stubFamilyApis(page, state);

    await openSchoolInbox(page);
    await page.getByRole('button', { name: 'Add document', exact: true }).click();
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
    await openSchoolInbox(page);

    await expect(page.getByText('Gmail school inbox', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/School and nursery mail is checked at 08:00 and 20:00 London time/)).toBeVisible();
    await expect(page.getByText('Connected to ademolaomosanya@gmail.com', { exact: true })).toBeVisible();
    await expect(page.getByText('WhatsApp reminders and delivery-status tracking are active. Send STOP to pause.')).not.toBeVisible();
    await page.getByText('Connection & assignment settings', { exact: true }).click();
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
        id: 'school-meeting-conflict', subject: 'School meeting overlap', status: 'partial_review',
        receivedAt: '2026-09-30T08:30:00.000Z', autoCreated: 0, needsReview: 0,
        duplicateCount: 0, conflictCount: 1,
        parsedDrafts: [{
          importId: 'school-meeting-conflict-draft', title: 'School meeting', person: member.id,
          date: '2026-10-13', time: '16:20', duration: 60, recurring: 'none', cost: 0,
          type: 'meeting', isRecurring: false, priority: 'high', status: 'confirmed', confidence: 0.95,
          source: 'Meeting Booking Confirmation 13 October 2026 16:20', sourceLine: 1,
          importStatus: 'conflict', warnings: ['Overlaps another event for the same family member.'],
        }],
      }, {
        id: 'no-dates-newsletter', subject: 'School newsletter without dated events', status: 'no_events',
        receivedAt: '2026-09-30T09:00:00.000Z', autoCreated: 0, needsReview: 0,
        duplicateCount: 0, conflictCount: 0, parsedDrafts: [],
      }],
    });
    await openSchoolInbox(page);

    await expect(page.getByText('Gmail school inbox', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: /Meeting Booking Confirmation/ })).toHaveCount(0);
    await expect(page.getByText('1 parsed · 1 conflict to check')).toBeVisible();
    await page.getByRole('button', { name: /School meeting overlap/ }).click();
    await expect(page.getByText('Overlaps another event for the same family member.')).toBeVisible();
    await page.getByRole('button', { name: 'Close school update' }).click();
    await page.getByText('Added & reference updates · 2', { exact: true }).click();
    await page.getByRole('button', { name: /School newsletter without dated events/ }).click();
    await expect(page.getByRole('button', { name: 'Mark reviewed' })).toBeVisible();
    await page.getByRole('button', { name: 'Mark reviewed' }).click();
    await expect(page.getByText('Marked this email as reviewed.')).toBeVisible();
    expect(state.inboxPatches).toContainEqual({ intakeId: 'no-dates-newsletter', createdEventIds: [], needsReview: 0, dismissed: true });
  });

  test('quick plan previews and saves a repeating child reminder', async ({ page }) => {
    test.setTimeout(120_000);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0, taskPosts: [] as unknown[], assistantRequests: [] as unknown[] };
    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state);
    await openSchoolInbox(page);

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

  test('phone inbox separates reference mail from decisions and keeps import controls reachable', async ({ page }) => {
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
    await page.setViewportSize({ width: 390, height: 844 });
    await stubFamilyApis(page, state, { inboxItems: [{
      id: 'reference-notice', subject: 'Threadworm', status: 'no_events', receivedAt: '2026-09-30T08:00:00Z',
      autoCreated: 0, needsReview: 0, conflictCount: 0, duplicateCount: 0, parsedDrafts: [],
    }, {
      id: 'weekly-pending', subject: 'Weekly update email', status: 'partial_review', receivedAt: '2026-09-30T08:00:00Z',
      autoCreated: 9, needsReview: 1, conflictCount: 0, duplicateCount: 0,
      parsedDrafts: [{ importId: 'attendee-pending', title: 'PTA AGM', person: '', date: '2026-10-07', time: '17:00', duration: 60,
        recurring: 'none', cost: 0, type: 'education', isRecurring: false, priority: 'high', status: 'planned', confidence: 0.9,
        source: 'Parents welcome to PTA AGM on 7 October at 5pm', sourceLine: 1, importStatus: 'needs_review', warnings: ['Choose the adult attending this school meeting.'] }],
    }] });
    await openSchoolInbox(page);
    await expect(page.getByRole('heading', { name: 'School & nursery inbox' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Threadworm/ })).not.toBeVisible();
    await expect(page.getByPlaceholder('Paste term dates, forwarded ticket emails, school events, CSV rows, or copied PDF text...')).toHaveCount(0);
    await page.getByRole('button', { name: /Weekly update email.*Review/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Weekly update email' });
    await expect(dialog.getByText('9 already added to your calendar.')).toBeVisible();
    await expect(dialog.getByLabel('Assign PTA AGM to')).toHaveValue('');
    await expect(dialog.getByRole('button', { name: 'Import 0' })).toBeDisabled();
    const footer = await dialog.getByRole('button', { name: 'Import 0' }).boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(844);
    await page.screenshot({ path: 'output/playwright/school-intake-decisions-phone.png' });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await page.getByText('Added & reference updates · 1', { exact: true }).click();
    await expect(page.getByRole('button', { name: /Threadworm.*Open/ })).toBeVisible();
    expect(state.eventPosts).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'output/playwright/school-intake-inbox-phone.png' });
  });

  test('opening a trusted ready update processes it once without a second import click', async ({ page }) => {
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0, autoProcessRequests: [] as Record<string, unknown>[] };
    await stubFamilyApis(page, state, { inboxItems: [{ id: 'trusted-ready', subject: 'School assembly', status: 'review_required',
      receivedAt: '2026-09-30T08:00:00Z', autoCreated: 0, needsReview: 1, conflictCount: 0, duplicateCount: 0,
      actionRequired: true, autoProcessEligibleCount: 1, parsedDrafts: [] }] });
    await openSchoolInbox(page);
    await page.getByRole('button', { name: /School assembly.*Review/ }).click();
    const dialog = page.getByRole('dialog', { name: 'School assembly' });
    await expect(dialog.getByText('1 already added to your calendar.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /^Import/ })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByText('No decisions waiting.')).toBeVisible();
    await page.getByText('Added & reference updates · 1', { exact: true }).click();
    await page.getByRole('button', { name: /School assembly.*Open/ }).click();
    await expect(dialog.getByText('1 already added to your calendar.')).toBeVisible();
    expect(state.autoProcessRequests).toEqual([{ action: 'auto-process', intakeId: 'trusted-ready' }]);
    expect(state.eventPosts).toEqual([]);
  });

  test('quick gym suggestion needs one tap to preview and one to add', async ({ page }) => {
    test.setTimeout(120_000);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0, assistantRequests: [] as unknown[] };
    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state);
    await openSchoolInbox(page);

    await expect(page.getByRole('heading', { name: 'Quick plan' })).toBeVisible({ timeout: 60_000 });
    await page.getByText('Routine suggestions', { exact: true }).click();
    await page.getByRole('button', { name: /gyming tomorrow at 6:30am/ }).click();
    await expect.poll(() => state.assistantRequests).toHaveLength(1);
    expect(state.assistantRequests).toEqual(['Add gyming tomorrow at 6:30am for Test']);
    await expect(page.getByText(/Gyming/)).toBeVisible();
    await page.getByRole('button', { name: 'Confirm and add' }).click();

    await expect(page.getByText('Added "Gyming" to the calendar.')).toBeVisible();
    expect(state.eventPosts).toHaveLength(1);
    expect(state.eventPosts[0]).toMatchObject({ title: 'Gyming', time: '06:30', eventType: 'fitness' });
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
    await openSchoolInbox(page);

    const calendarEvent = page.locator('.rbc-event').filter({ hasText: 'Parents workshop' }).first();
    await expect(calendarEvent).toBeVisible({ timeout: 60_000 });
    await calendarEvent.hover();
    await expect(page.getByText('Wed 30 Sep · Time not provided')).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: /^Bring the reading record\. Sign in at the school office\.$/ })).toBeVisible();
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
    const inboxLoaded = page.waitForResponse((response) => response.url().endsWith('/calendar-intake/inbox') && response.ok());
    await openSchoolInbox(page);
    await inboxLoaded;

    await expect(page.getByRole('button', { name: 'Connect Gmail' })).toBeEnabled({ timeout: 60_000 });
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Connect Gmail' }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/oauth-test\?scope=gmail\.readonly/);
  });

  test('holds an older parent meeting incorrectly assigned to a pupil until an adult is selected', async ({ page }) => {
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
    await stubFamilyApis(page, state, { inboxItems: [{
      id: 'legacy-parent-meeting', subject: 'Parent meeting email', status: 'review_required',
      needsReview: 1, autoCreated: 0, conflictCount: 0, duplicateCount: 0,
      parsedDrafts: [{ importId: 'legacy-pta', title: 'Everyone Is Welcome To Join Our PTA AGM',
        person: member.id, date: '2026-10-07', time: '17:00', duration: 60, recurring: 'none',
        cost: 0, type: 'education', notes: 'Parents can discuss school fundraising.', isRecurring: false,
        priority: 'high', status: 'confirmed', confidence: 0.9, source: 'PTA AGM 7 October 2026',
        sourceLine: 1, importStatus: 'ready', warnings: [] }],
    }] });
    await openSchoolInbox(page);
    await page.getByRole('button', { name: /Parent meeting email.*Review/ }).click();
    await expect(page.getByLabel('Assign PTA AGM to')).toHaveValue('');
    await expect(page.getByText('Choose the adult attending this school meeting.')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Select PTA AGM' })).toBeDisabled();
    await expect(page.getByLabel('Assign PTA AGM to').getByRole('option', { name: member.name })).toHaveCount(0);
    expect(state.eventPosts).toEqual([]);
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
        draft('workshop-draft', 'School Workshop', '2026-10-01'),
        draft('book-fair-draft', 'Book Fair', '2026-10-02'),
      ],
      attachments: [],
      documentSummary: null,
    };

    await page.addInitScript(skipSetupWizard);
    await stubFamilyApis(page, state, { inboxItems: [intake] });
    await openSchoolInbox(page);

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
    await page.getByRole('button', { name: 'Close school update' }).click();
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
      schoolSource,
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
    await stubFamilyApis(page, state, { inboxItems: [{ ...intake, outstandingDrafts: intake.parsedDrafts }] });
    await openSchoolInbox(page);

    await page.getByRole('button', { name: /Reading mornings.*Review/ }).click();
    await expect(page.getByText('2026-10-01 · Time not specified')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import 1' })).toHaveCount(0);
    await page.getByLabel('Assign Reading Morning (Key Stage 2) to').selectOption(member.id);
    await expect.poll(() => state.inboxPatches.length).toBe(1);
    expect(state.inboxPatches[0]).toEqual({ intakeId: intake.id, assignments: [{ draftId: 'reading-morning-draft', personId: member.id }] });
    expect(state.eventPosts).toHaveLength(0);
    await expect(page.getByRole('button', { name: 'Import 1' })).toBeEnabled();
    await page.getByRole('button', { name: 'Close school update' }).click();
    await page.getByRole('button', { name: /Reading mornings.*Review/ }).click();
    await expect(page.getByLabel('Assign Reading Morning (Key Stage 2) to')).toHaveValue(member.id);
    await expect(page.getByRole('button', { name: 'Import 1' })).toBeEnabled();
    await page.getByRole('button', { name: 'Import 1' }).click();

    await expect(page.getByText('1 event added to the calendar.')).toBeVisible();
    expect(state.eventPosts).toHaveLength(1);
    expect(state.eventPosts[0]).toMatchObject({ personId: member.id, time: '00:00', durationMinutes: 1439 });
    expect(state.inboxPatches[1]).toMatchObject({ intakeId: intake.id, needsReview: 0 });
  });
});

for (const width of [390, 1280]) {
  test(`nursery preparation is clear, child-scoped and saved once at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(skipSetupWizard);
    const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0, autoProcessRequests: [] as Record<string, unknown>[] };
    const due = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const nursery = { id: 'nursery-books', subject: 'Grandir nursery update', receivedAt: '2026-10-06T13:00:00Z',
      schoolSource: { ...schoolSource, institution: 'grandir', institutionName: 'Test nursery' },
      sourceDate: '2026-10-06T13:00:00Z', nurseryChildId: member.id, originalPortalUrl: 'https://www.app.grandiruk.com/#/account/post/test-post',
      status: 'review_required', autoCreated: 0, needsReview: 1, actionRequired: true, parsedDrafts: [], duplicateCount: 0, conflictCount: 0,
      nurserySummary: { kind: 'preparation', title: 'Book of the Week', purpose: 'Next week is Book of the Week.',
        actions: ['Please bring a favourite book.'], timing: 'Next week', hasAttachments: false } };
    await stubFamilyApis(page, state, { inboxItems: [nursery, { ...nursery, id: 'school-post', nurserySummary: null,
      nurseryChildId: null, subject: 'School photographs', schoolSource }] });
    await page.route('**/api/families/*/tasks', async route => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(state.autoProcessRequests.length ? [{
        id: 'nursery-task', title: 'Prepare: Book of the Week', assignees: [member.id],
        assignedDate: new Date().toISOString().slice(0, 10), dueDate: due, taskType: 'admin', priority: 'medium',
        completedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] : []) });
    });
    await openSchoolInbox(page);
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    await page.getByLabel('Filter school and nursery updates').selectOption('nursery');
    await expect(page.getByRole('button', { name: /School photographs/ })).toHaveCount(0);
    await page.getByRole('button', { name: /Book of the Week.*Review/ }).click();
    const dialog = page.getByRole('dialog');
    const summary = dialog.getByRole('region', { name: 'Nursery notice summary' });
    await expect(summary.getByText(`${member.name} · Things to bring / preparation`, { exact: true })).toBeVisible();
    await expect(summary.getByText('Please bring a favourite book.', { exact: true })).toBeVisible();
    if (width === 390) await page.screenshot({ path: 'output/playwright/nursery-preparation-phone-rehearsal-20261007.png' });
    await expect(summary.getByRole('button', { name: 'Add preparation task', exact: true })).toBeDisabled();
    await summary.getByLabel('Nursery preparation due date').fill(due);
    await summary.getByRole('button', { name: 'Add preparation task', exact: true }).click();
    await expect(dialog.getByText('Nursery preparation added to tasks.', { exact: true })).toBeVisible();
    await expect(summary.getByRole('button', { name: 'Add preparation task', exact: true })).toHaveCount(0);
    expect(state.autoProcessRequests).toEqual([{ action: 'add-nursery-task', intakeId: 'nursery-books', dueDate: due }]);
    expect(state.eventPosts).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Close school update' }).click();
    await expect(page.getByText('Prepare: Book of the Week', { exact: true }).first()).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'School inbox & quick plan', exact: true }).click();
    await page.getByLabel('Filter school and nursery updates').selectOption('nursery');
    await page.getByText('Added & reference updates · 1', { exact: true }).click();
    await page.getByRole('button', { name: /Book of the Week.*Open/ }).click();
    await expect(page.getByRole('region', { name: 'Nursery notice summary' }).getByText(`Added to tasks · due ${due}`, { exact: false })).toBeVisible();
  });
}

test('nursery learning stays reference and unread attachments have an original-content action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(skipSetupWizard);
  const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
  const base = { receivedAt: '2026-10-07T12:00:00Z', schoolSource: { ...schoolSource, institution: 'grandir', institutionName: 'Test nursery' },
    originalPortalUrl: 'https://www.app.grandiruk.com/#/account/post/test-post', nurseryChildId: member.id,
    autoCreated: 0, parsedDrafts: [], duplicateCount: 0, conflictCount: 0 };
  await stubFamilyApis(page, state, { inboxItems: [
    { ...base, id: 'learning', subject: 'Today at nursery', status: 'no_events', needsReview: 0, actionRequired: false,
      nurserySummary: { kind: 'reference', title: 'Today at nursery', purpose: 'Today we enjoyed PE and a reading session.', actions: [], timing: 'Today', hasAttachments: false } },
    { ...base, id: 'attachment', subject: 'Nursery attachment', status: 'content_required', needsReview: 1, actionRequired: true,
      nurserySummary: { kind: 'content_pending', title: 'Nursery attachment to review', purpose: 'The notice has an attachment but no readable text.',
        actions: ['Open the original notice and review its attachment.'], timing: null, hasAttachments: true } },
    { ...base, id: 'account', subject: 'Grandir sign-in notification', status: 'no_events', needsReview: 0, actionRequired: false,
      nurserySummary: { kind: 'reference', title: 'Parent account security notice',
        purpose: 'Grandir sent an account security notification. This is not a nursery activity.', actions: [], timing: null, hasAttachments: false } },
  ] });
  await openSchoolInbox(page);
  await page.getByLabel('Filter school and nursery updates').selectOption('nursery');
  await page.getByRole('button', { name: /Nursery attachment to review.*Review/ }).click();
  await expect(page.getByRole('link', { name: 'Original nursery post', exact: true })).toHaveAttribute('href', base.originalPortalUrl);
  await expect(page.getByText('The full content has not been read.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add preparation task', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close school update' }).click();
  await page.getByText('Added & reference updates · 2', { exact: true }).click();
  await expect(page.getByText('Account notification · not a nursery activity', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Today at nursery.*Open/ }).click();
  await expect(page.getByText('Saved as an update, not a future event.', { exact: true })).toBeVisible();
  expect(state.eventPosts).toHaveLength(0);
});

test('nursery recurring routines use the nursery child and require a chosen time', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(skipSetupWizard);
  const state = { documentRequestBody: '', eventPosts: [] as unknown[], gmailSyncs: 0 };
  await stubFamilyApis(page, state, { inboxItems: [{ id: 'nursery-routine', subject: 'Grandir PE routine', status: 'review_required',
    schoolSource: { ...schoolSource, institution: 'grandir', institutionName: 'Test nursery' }, nurseryChildId: member.id,
    receivedAt: new Date().toISOString(), autoCreated: 0, needsReview: 1, actionRequired: true, parsedDrafts: [], duplicateCount: 0, conflictCount: 0,
    nurserySummary: { kind: 'routine', title: 'Nursery PE', purpose: 'We have PE every Thursday.', timing: null, actions: [], hasAttachments: false } }] });
  await openSchoolInbox(page);
  await page.getByRole('button', { name: /Nursery PE.*Review/ }).click();
  await page.getByRole('button', { name: 'Schedule routine', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Child or family member')).toHaveValue(member.id);
  await expect(dialog.getByRole('button', { name: 'Add weekly routine', exact: true })).toBeDisabled();
  await dialog.getByLabel('Start time').fill('10:00');
  await dialog.getByRole('button', { name: 'Add weekly routine', exact: true }).click();
  await expect(dialog.getByText('1 weekly nursery pe session added.', { exact: true })).toBeVisible();
  expect(state.eventPosts).toHaveLength(1);
  expect(state.eventPosts[0]).toMatchObject({ personId: member.id, time: '10:00' });
});
