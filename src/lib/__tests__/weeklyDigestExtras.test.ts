import { buildDigestExtras } from '../weeklyDigestExtras';
import { buildWeeklyDigest } from '../weeklyDigest';
import { renderWeeklyDigestHtml, renderWeeklyDigestSubject, renderWeeklyDigestText } from '../weeklyDigestEmail';
import { DEFAULT_DIGEST_PREFERENCES, normalizeDigestPreferences } from '../sharedDocuments';
import type { PropertyIssue } from '@/types/property.types';

const WEEK = '2026-09-28';

const issue = (over: Partial<PropertyIssue>): PropertyIssue => ({
  id: over.id ?? 'i1',
  title: 'Clear gutters',
  area: 'roof_gutters',
  urgency: 'routine',
  trade: 'Gutter cleaner',
  diy: false,
  steps: [],
  sourceText: 'gutters',
  status: 'open',
  enhancedBy: 'rules',
  createdAt: '2026-09-01',
  updatedAt: '2026-09-01',
  ...over,
});

describe('buildDigestExtras', () => {
  test('lists open home jobs, most urgent first, skipping finished ones', () => {
    const extras = buildDigestExtras({
      preferences: DEFAULT_DIGEST_PREFERENCES,
      issues: [
        issue({ id: 'a', title: 'Window clean', urgency: 'someday' }),
        issue({ id: 'b', title: 'Gas smell', urgency: 'urgent', safetyNote: 'Call 0800 111 999', scheduledDate: '2026-09-29', status: 'scheduled' }),
        issue({ id: 'c', title: 'Done already', status: 'done' }),
        issue({ id: 'd', title: 'Leaky tap', urgency: 'soon', suggestedDate: '2026-09-20' }),
      ],
      marks: [],
      weekStart: WEEK,
    });
    expect(extras.homeJobs.map((j) => j.title)).toEqual(['Gas smell', 'Leaky tap', 'Window clean']);
    expect(extras.homeJobsTotal).toBe(3);
    expect(extras.urgentHomeJobs).toBe(1);
    expect(extras.homeJobs[0].safety).toBe(true);
    expect(extras.homeJobs[1].overdue).toBe(true);
  });

  test('puts places someone asked for first, then a varied selection', () => {
    const extras = buildDigestExtras({
      preferences: DEFAULT_DIGEST_PREFERENCES,
      issues: [],
      marks: [{ id: 'subscribed:kew-gardens', eventId: 'kew-gardens', kind: 'subscribed', at: '2026-09-01' }],
      weekStart: WEEK,
    });
    expect(extras.kidsIdeas[0]).toMatchObject({ id: 'kew-gardens', pinned: true });
    expect(extras.kidsIdeas).toHaveLength(5);
    expect(new Set(extras.kidsIdeas.map((i) => i.id)).size).toBe(5);
  });

  test('respects the family’s choices', () => {
    const none = buildDigestExtras({
      preferences: { ...DEFAULT_DIGEST_PREFERENCES, kidsIdeas: false, homeJobs: false },
      issues: [issue({})],
      marks: [],
      weekStart: WEEK,
    });
    expect(none.kidsIdeas).toEqual([]);
    expect(none.homeJobs).toEqual([]);
    expect(none.homeJobsTotal).toBe(0);

    const freeLocal = buildDigestExtras({
      preferences: { ...DEFAULT_DIGEST_PREFERENCES, kidsFreeOnly: true, kidsLocalOnly: true },
      issues: [],
      marks: [],
      weekStart: WEEK,
    });
    expect(freeLocal.kidsIdeas.length).toBeGreaterThan(0);
    expect(freeLocal.kidsIdeas.every((i) => i.free)).toBe(true);
  });
});

describe('the email with extra sections', () => {
  const digest = buildWeeklyDigest([], [], [], WEEK);
  const extras = buildDigestExtras({
    preferences: DEFAULT_DIGEST_PREFERENCES,
    issues: [issue({ title: 'Burst <pipe>', urgency: 'urgent' })],
    marks: [],
    weekStart: WEEK,
  });

  test('subject flags urgent home jobs', () => {
    expect(renderWeeklyDigestSubject(digest, 'Tremaine Road', extras)).toMatch(/1 urgent home job$/);
  });

  test('text and html include both sections and escape content', () => {
    const text = renderWeeklyDigestText(digest, 'Tremaine Road', extras);
    expect(text).toContain('IDEAS FOR THE KIDS');
    expect(text).toContain('HOME JOBS (1 open)');
    const html = renderWeeklyDigestHtml(digest, 'Tremaine Road', extras);
    expect(html).toContain('Ideas for the kids');
    expect(html).toContain('Burst &lt;pipe&gt;');
    expect(html).not.toContain('Settings &rarr; Notifications');
  });

  test('without extras the email is unchanged apart from the footer', () => {
    expect(renderWeeklyDigestSubject(digest, 'Tremaine Road')).toBe(`Tremaine Road: a clear week (${digest.rangeLabel})`);
    expect(renderWeeklyDigestHtml(digest, 'Tremaine Road')).not.toContain('Ideas for the kids');
  });
});

describe('normalizeDigestPreferences', () => {
  test('keeps valid, unique emails and drops junk', () => {
    const prefs = normalizeDigestPreferences({
      kidsIdeas: 'yes',
      extraRecipients: ['Angela@Example.com', 'angela@example.com', 'not-an-email', 42, 'a@b.co', 'c@d.co', 'e@f.co', 'g@h.co', 'i@j.co'],
    });
    expect(prefs.kidsIdeas).toBe(true);
    expect(prefs.extraRecipients).toEqual(['angela@example.com', 'a@b.co', 'c@d.co', 'e@f.co', 'g@h.co']);
  });
});
