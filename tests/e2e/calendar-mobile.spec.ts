import { expect, test, type Page } from '@playwright/test';

/**
 * Mobile calendar journeys.
 *
 * Two faults this covers, both reported from a phone and both reproduced here
 * before being fixed:
 *
 *  - Tapping a repeat booking sent the day panel to the day the series STARTED
 *    rather than the day tapped. Tap the last swimming lesson of the month and
 *    the panel jumped back to the first one.
 *  - The quick-add panel was wider than the screen. Because the page does not
 *    scroll sideways the excess was clipped, not reachable: "Connect Gmail" was
 *    cut mid-word and the quick-create "Run" button sat entirely off screen.
 */

const family = { id: 'mobile-family', familyName: 'Mobile family', familyCode: 'mobile' };
const child = { id: 'mobile-child', familyId: family.id, name: 'Kayode', role: 'Child', ageGroup: 'Child', color: '#147c72', icon: 'K' };

/** Monday 14 September 2026 — pinned so these keep meaning the same thing. */
const TODAY = new Date('2026-09-14T09:00:00.000Z');

/** Wednesdays: 2, 9, 16, 23, 30 September. */
const swimming = {
  id: 'mobile-swim', title: 'Swimming lesson', person: child.id, date: '2026-09-02', time: '17:00', duration: 60,
  recurring: 'weekly', isRecurring: true, cost: 0, type: 'sport', priority: 'medium', status: 'confirmed',
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
};

/** Sundays: 6, 13, 20, 27 September. */
const sundayClub = { ...swimming, id: 'mobile-sunday', title: 'Sunday swimming', date: '2026-09-06', time: '10:00' };

/** 50 unread, so the bell badge is two digits — one digit hid the overflow. */
const unread = Array.from({ length: 50 }, (_, i) => ({
  id: `n${i}`, familyId: family.id, type: 'reminder', title: `Reminder ${i}`, message: 'x', icon: 'bell',
  priority: 'medium', category: 'calendar', timestamp: '2026-09-14T08:00:00.000Z', read: false,
  actionRequired: false, actions: [], createdAt: '2026-09-14T08:00:00.000Z', updatedAt: '2026-09-14T08:00:00.000Z',
}));

const stubApis = async (page: Page) => {
  await page.route('**/api/families/**', (route) =>
    route.request().url().includes('/notifications')
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(unread) })
      : route.fulfill({ status: 200, contentType: 'application/json', body: route.request().method() === 'GET' ? '[]' : '{}' })
  );
  await page.route('**/api/families', (route) =>
    route.request().method() !== 'GET'
      ? route.fallback()
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ ...family, members: [child] }]) })
  );
  await page.route('**/api/families/*/members', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([child]) })
  );
  await page.route('**/api/families/*/events', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: route.request().method() === 'GET' ? '[]' : '{}' })
  );
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'mobile-user', email: 'mobile@example.com', displayName: 'E2E User' },
        family: null,
        familyMember: null,
        needsOnboarding: false,
      }),
    })
  );
};

const PHONES = [
  { name: 'iPhone', width: 390, height: 844 },
  { name: 'small Android', width: 360, height: 800 },
];

const openCalendar = async (page: Page, events: unknown[], width: number, height: number) => {
  await page.setViewportSize({ width, height });
  await page.clock.setFixedTime(TODAY);
  await page.addInitScript((seed) => {
    localStorage.setItem('familyHub_setupComplete', 'skipped');
    localStorage.setItem('familyId', 'mobile-family');
    localStorage.setItem('calendarEvents', JSON.stringify(seed));
  }, events);
  await stubApis(page);
  await page.goto('/');
  await page.getByRole('button', { name: /^Calendar$/ }).last().click();
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_000);
};

/**
 * Controls whose box falls outside the viewport while the page has no sideways
 * scroll — i.e. genuinely unreachable rather than merely needing a swipe.
 * The suggestion-chip row is excluded: it is a deliberate horizontal scroller.
 */
const clippedControls = (page: Page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth) return ['PAGE SCROLLS SIDEWAYS'];
    const out: string[] = [];
    document.querySelectorAll<HTMLElement>('button, a[href], input, textarea').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;
      if (el.closest('.overflow-x-auto')) return;
      if (rect.right > doc.clientWidth + 1 || rect.left < -1) {
        out.push((el.textContent || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '?').trim().slice(0, 40));
      }
    });
    return out;
  });

for (const phone of PHONES) {
  test.describe(`${phone.name}`, () => {
    test('tapping a later occurrence selects the day tapped, not the day the series began', async ({ page }) => {
      await openCalendar(page, [swimming], phone.width, phone.height);

      const blocks = page.locator('.rbc-event', { hasText: 'Swimming lesson' });
      await expect(blocks).toHaveCount(5);

      // The last Wednesday of the month, four weeks after the series started.
      await blocks.last().click({ force: true });

      const panel = page.getByTestId('selected-day-agenda');
      // Was "Wednesday, 2 September" — the stored row's date.
      await expect(panel).toContainText('Wednesday, 30 September', { timeout: 10_000 });
      await expect(panel).toContainText('Swimming lesson');
    });

    test('a Sunday repeat opens on that Sunday', async ({ page }) => {
      await openCalendar(page, [sundayClub], phone.width, phone.height);

      const blocks = page.locator('.rbc-event', { hasText: 'Sunday swimming' });
      await expect(blocks).toHaveCount(4);
      await blocks.nth(2).click({ force: true });

      const panel = page.getByTestId('selected-day-agenda');
      await expect(panel).toContainText('Sunday, 20 September', { timeout: 10_000 });
      await expect(panel).toContainText('Sunday swimming');
    });

    // Deliberately no "scroll to the Run button and check it is in view" test:
    // scrollIntoViewIfNeeded moves an ancestor programmatically even when the
    // overflow is not user-scrollable, so it passed while the button was in
    // fact unreachable. The clipping check below is the one that distinguishes.
    test('no control is clipped off the side of the screen', async ({ page }) => {
      await openCalendar(page, [swimming], phone.width, phone.height);

      // "Connect Gmail", "Review events" and the quick-create "Run" all used to
      // sit past the right edge with no way to scroll to them.
      expect(await clippedControls(page)).toEqual([]);
    });

  });
}

/**
 * Nothing at all may stick out past the right edge, at any phone width.
 *
 * Two separate faults were caught this way. The quick-add panel stretched its
 * own grid column; and the notification bell's badge was offset twice — once by
 * `-right-1` and again by `translate-x-1/2`, half its own width — so a
 * two-digit unread count sat 16px beyond a button only 8px from the edge. On a
 * real phone the "50" was sliced in half.
 */
test.describe('nothing overflows the viewport', () => {
  for (const width of [360, 390, 412, 430]) {
    test(`at ${width}px`, async ({ page }) => {
      await openCalendar(page, [swimming], width, 880);

      const overflowing = await page.evaluate(() => {
        const doc = document.documentElement;
        const out: string[] = [];
        document.querySelectorAll<HTMLElement>('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          // A deliberate horizontal scroller may extend past; its children are its business.
          if (el.closest('.overflow-x-auto')) return;
          if (rect.right > doc.clientWidth + 1) {
            out.push(`<${el.tagName.toLowerCase()}> "${(el.textContent || '').trim().slice(0, 20)}" right=${Math.round(rect.right)} > ${doc.clientWidth}`);
          }
        });
        return out.slice(0, 6);
      });

      expect(overflowing).toEqual([]);
      // And the page itself must never scroll sideways.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
});

/**
 * The school-document review card, which only appears once an intake is opened.
 *
 * It was in the reported screenshot with its "Schedule weekly" button cut off
 * at the right edge, and none of the checks above rendered it — they stub the
 * inbox as empty, so the card never existed to be measured. Seeding a real
 * intake payload covers the state the phone was actually in.
 */
test.describe('the school-document review card fits on a phone', () => {
  const intake = {
    id: 'intake-1',
    familyId: family.id,
    subject: 'Phonics screening',
    status: 'review_required',
    needsReview: 2,
    conflictCount: 0,
    receivedAt: '2026-09-14T07:00:00.000Z',
    parsedDrafts: [],
    attachments: [],
    documentSummary: {
      issuer: 'Norwood School',
      issueDate: '2026-09-01',
      documentLabel: 'Autumn term letter',
      subjects: ['Phonics', 'Maths'],
      routines: [
        { label: 'Phonics', detail: 'Screening check June -Friday 18' },
        { label: 'Football club', detail: 'every Tuesday at 4pm' },
      ],
    },
  };

  for (const width of [360, 390, 412]) {
    test(`at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 880 });
      await page.clock.setFixedTime(TODAY);
      await page.addInitScript(() => {
        localStorage.setItem('familyHub_setupComplete', 'skipped');
        localStorage.setItem('familyId', 'mobile-family');
        localStorage.setItem('calendarEvents', '[]');
      });

      // The inbox payload is `{ forwardingAddress, gmail, intakes }` — a bare
      // array silently renders nothing, which is how this state got missed.
      await page.route('**/api/families/**', (route) =>
        route.request().url().includes('calendar-intake/inbox')
          ? route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ forwardingAddress: 'x@family.test', gmail: { connected: false }, intakes: [intake] }),
            })
          : route.fulfill({ status: 200, contentType: 'application/json', body: route.request().method() === 'GET' ? '[]' : '{}' })
      );
      await page.route('**/api/families', (route) =>
        route.request().method() !== 'GET'
          ? route.fallback()
          : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ ...family, members: [child] }]) })
      );
      await page.route('**/api/families/*/members', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([child]) })
      );
      await page.route('**/api/auth/me', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: { id: 'u', email: 'e@e.com', displayName: 'E' }, family: null, familyMember: null, needsOnboarding: false }),
        })
      );

      await page.goto('/');
      await page.getByRole('button', { name: /^Calendar$/ }).last().click();
      await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(1_200);

      await page.getByRole('button', { name: /Review events|Review/i }).first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(800);

      const schedule = page.getByRole('button', { name: /Schedule weekly/i }).first();
      await expect(schedule).toBeVisible();

      const box = await schedule.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    });
  }
});
