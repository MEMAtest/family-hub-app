import {
  getKidsActivities,
  nextAvailableDate,
  pickWeeklyIdeas,
  seasonOf,
  toDateKey,
} from '../kidsActivitiesService';
import { KIDS_ACTIVITIES } from '@/data/kidsActivities';
import type { KidsActivity } from '@/types/kidsEvents.types';

// Saturday 26 September 2026
const TODAY = new Date(2026, 8, 26);

describe('nextAvailableDate', () => {
  test('open every day means today', () => {
    expect(nextAvailableDate({ type: 'open', pattern: '' }, TODAY)).toBe('2026-09-26');
  });

  test('respects opening days and months', () => {
    expect(nextAvailableDate({ type: 'open', pattern: '', days: [3] }, TODAY)).toBe('2026-09-30'); // next Wednesday
    expect(nextAvailableDate({ type: 'open', pattern: '', months: [10] }, TODAY)).toBe('2026-10-01');
  });

  test('returns null when nothing is available soon', () => {
    expect(nextAvailableDate({ type: 'open', pattern: '', months: [6] }, TODAY)).toBeNull();
  });
});

describe('seasonOf', () => {
  test('uses meteorological seasons', () => {
    expect(seasonOf(TODAY)).toBe('autumn');
    expect(seasonOf(new Date(2026, 6, 1))).toBe('summer');
    expect(seasonOf(new Date(2026, 0, 1))).toBe('winter');
  });
});

describe('getKidsActivities', () => {
  test('ids are stable so saved places keep matching', () => {
    const first = getKidsActivities({}, TODAY).map((e) => e.id);
    const later = getKidsActivities({}, new Date(2027, 2, 1)).map((e) => e.id).sort();
    expect([...first].sort()).toEqual(later);
    expect(new Set(first).size).toBe(first.length);
    expect(first).toContain('crystal-palace-park');
  });

  test('never shows a date in the past', () => {
    for (const event of getKidsActivities({}, TODAY)) {
      expect(event.timing.date >= toDateKey(TODAY)).toBe(true);
    }
  });

  test('local places come first', () => {
    const events = getKidsActivities({}, TODAY);
    const firstLondon = events.findIndex((e) => !e.isLocal);
    expect(events.slice(firstLondon).every((e) => !e.isLocal)).toBe(true);
    expect(firstLondon).toBeGreaterThan(0);
  });

  test('filters by age, cost, distance and search', () => {
    const catalogue: KidsActivity[] = [
      { ...KIDS_ACTIVITIES[0], slug: 'toddler-only', suitableForToddlers: true, suitableForPreschool: false },
      { ...KIDS_ACTIVITIES[0], slug: 'older-only', suitableForToddlers: false, suitableForPreschool: true, pricing: { isFree: false }, costBracket: 'high' },
    ];
    const ids = (filters: Parameters<typeof getKidsActivities>[0]) => getKidsActivities(filters, TODAY, catalogue).map((e) => e.id);
    expect(ids({ ageRange: 'toddler' })).toEqual(['toddler-only']);
    expect(ids({ ageRange: 'preschool' })).toEqual(['older-only']);
    expect(ids({ ageRange: 'all-ages' })).toEqual([]);
    expect(ids({ isFree: true })).toEqual(['toddler-only']);
    expect(getKidsActivities({ isLocal: true }, TODAY).every((e) => e.isLocal)).toBe(true);
    expect(getKidsActivities({ maxDistance: 3 }, TODAY).every((e) => (e.location.distanceFromSE20 ?? 0) <= 3)).toBe(true);
    expect(getKidsActivities({ search: 'dinosaur' }, TODAY).map((e) => e.id)).toContain('natural-history-museum');
  });

  test('every catalogue entry links to its own site to check details', () => {
    for (const activity of KIDS_ACTIVITIES) {
      expect(activity.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});

describe('pickWeeklyIdeas', () => {
  test('gives a varied shortlist without repeats', () => {
    const ideas = pickWeeklyIdeas(TODAY);
    expect(ideas).toHaveLength(4);
    expect(new Set(ideas.map((e) => e.id)).size).toBe(4);
    expect(ideas.filter((e) => e.isLocal && e.pricing.isFree).length).toBeGreaterThanOrEqual(2);
    expect(ideas.some((e) => !e.weatherDependent)).toBe(true);
    expect(ideas.some((e) => !e.isLocal)).toBe(true);
  });

  test('rotates from week to week', () => {
    const thisWeek = pickWeeklyIdeas(TODAY).map((e) => e.id);
    const nextWeek = pickWeeklyIdeas(new Date(2026, 9, 3)).map((e) => e.id);
    expect(nextWeek).not.toEqual(thisWeek);
  });
});
