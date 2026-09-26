import { KIDS_ACTIVITIES } from '@/data/kidsActivities';
import type {
  EventFilters,
  KidsActivity,
  KidsActivitySchedule,
  KidsEvent,
} from '@/types/kidsEvents.types';

// Works on local calendar dates (YYYY-MM-DD) so results don't shift with time zones.

const LOOKAHEAD_DAYS = 60;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const seasonOf = (date: Date): Season => {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

export const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

// First date on or after `from` that the schedule allows, within the lookahead window.
export const nextAvailableDate = (schedule: KidsActivitySchedule, from: Date): string | null => {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i <= LOOKAHEAD_DAYS; i += 1) {
    const monthOk = !schedule.months || schedule.months.includes(cursor.getMonth() + 1);
    const dayOk = !schedule.days || schedule.days.includes(cursor.getDay());
    if (monthOk && dayOk) return toDateKey(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
};

export const activityToEvent = (activity: KidsActivity, today: Date): KidsEvent | null => {
  const date = nextAvailableDate(activity.schedule, today);
  if (!date) return null;
  const stamp = toDateKey(today);
  return {
    id: activity.slug,
    title: activity.title,
    description: activity.description,
    shortDescription: activity.shortDescription,
    category: activity.category,
    categories: activity.categories,
    ageRange: activity.maxAge !== undefined && activity.maxAge <= 5 ? 'preschool' : 'all-ages',
    minAge: activity.minAge,
    maxAge: activity.maxAge,
    suitableForToddlers: activity.suitableForToddlers,
    suitableForPreschool: activity.suitableForPreschool,
    location: activity.location,
    isLocal: activity.isLocal,
    timing: {
      date,
      isAllDay: activity.schedule.type === 'open', // drop-in; sessions have set times to check
      isRecurring: true,
      recurringPattern: activity.schedule.pattern,
    },
    pricing: { ...activity.pricing, bookingUrl: activity.pricing.bookingUrl },
    costBracket: activity.costBracket,
    source: 'manual',
    sourceUrl: activity.sourceUrl,
    features: activity.features,
    highlights: activity.highlights,
    weatherDependent: activity.weatherDependent,
    scrapedAt: stamp,
    updatedAt: stamp,
  };
};

const matchesFilters = (event: KidsEvent, filters: EventFilters) => {
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const haystack = `${event.title} ${event.description} ${event.location.name} ${(event.highlights || []).join(' ')}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  if (filters.categories?.length && !filters.categories.some((cat) => event.category === cat || event.categories?.includes(cat))) {
    return false;
  }
  if (filters.ageRange === 'toddler' && !event.suitableForToddlers) return false;
  if ((filters.ageRange === 'preschool' || filters.ageRange === 'early-years') && !event.suitableForPreschool) return false;
  if (filters.ageRange === 'all-ages' && !(event.suitableForToddlers && event.suitableForPreschool)) return false;
  if (filters.isFree && !event.pricing.isFree) return false;
  if (filters.costBracket?.length && !filters.costBracket.includes(event.costBracket)) return false;
  if (filters.maxDistance !== undefined && (event.location.distanceFromSE20 ?? 0) > filters.maxDistance) return false;
  if (filters.isLocal && !event.isLocal) return false;
  if (filters.dateFrom && event.timing.date < filters.dateFrom) return false;
  if (filters.dateTo && event.timing.date > filters.dateTo) return false;
  return true;
};

export const getKidsActivities = (
  filters: EventFilters = {},
  today: Date = new Date(),
  catalogue: KidsActivity[] = KIDS_ACTIVITIES
): KidsEvent[] =>
  catalogue
    .map((activity) => activityToEvent(activity, today))
    .filter((event): event is KidsEvent => event !== null && matchesFilters(event, filters))
    .sort((a, b) => {
      if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
      return (a.location.distanceFromSE20 ?? 99) - (b.location.distanceFromSE20 ?? 99);
    });

// A short, varied shortlist for the weekly email: two free local outings,
// one rainy-day option and one bigger trip, without repeats.
export const pickWeeklyIdeas = (today: Date = new Date(), count = 4): KidsEvent[] => {
  const all = getKidsActivities({}, today);
  const picks: KidsEvent[] = [];
  const take = (event?: KidsEvent) => {
    if (event && !picks.some((p) => p.id === event.id) && picks.length < count) picks.push(event);
  };
  // Rotate by ISO-ish week number so the email doesn't repeat the same places every Monday.
  const weekNumber = Math.floor(new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / (7 * 86400000));
  const rotate = <T,>(items: T[]) => items.map((_, i) => items[(i + weekNumber) % items.length]);

  rotate(all.filter((e) => e.isLocal && e.pricing.isFree)).slice(0, 2).forEach(take);
  take(rotate(all.filter((e) => !e.weatherDependent)).find((e) => !picks.includes(e)));
  take(rotate(all.filter((e) => !e.isLocal)).find((e) => !picks.includes(e)));
  all.forEach(take);
  return picks;
};
