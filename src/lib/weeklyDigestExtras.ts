import { getKidsActivities, pickWeeklyIdeas } from '@/services/kidsActivitiesService';
import { ISSUE_URGENCY_LABELS } from '@/utils/propertyIssueRules';
import type { DigestPreferences, KidsEventMark } from '@/lib/sharedDocuments';
import type { PropertyIssue, PropertyIssueUrgency } from '@/types/property.types';
import type { KidsEvent } from '@/types/kidsEvents.types';

// Optional sections for the Monday email, built from the household's shared
// documents: a few ideas for the kids and the open home jobs.

export interface DigestIdea {
  id: string;
  title: string;
  summary: string;
  where: string;
  free: boolean;
  pattern: string;
  url: string;
  pinned: boolean; // someone tapped the bell on it
}

export interface DigestHomeJob {
  title: string;
  urgency: PropertyIssueUrgency;
  urgencyLabel: string;
  who: string;
  when?: string; // "Thu 1 Oct" when scheduled or suggested
  overdue: boolean;
  safety: boolean;
}

export interface DigestExtras {
  kidsIdeas: DigestIdea[];
  homeJobs: DigestHomeJob[];
  homeJobsTotal: number;
  urgentHomeJobs: number;
}

export const EMPTY_DIGEST_EXTRAS: DigestExtras = { kidsIdeas: [], homeJobs: [], homeJobsTotal: 0, urgentHomeJobs: 0 };

const MAX_IDEAS = 5;
const MAX_HOME_JOBS = 5;
const URGENCY_RANK: Record<PropertyIssueUrgency, number> = { urgent: 0, soon: 1, routine: 2, someday: 3 };

const parseDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const shortDate = (ymd: string) =>
  parseDate(ymd).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' });

const toIdea = (event: KidsEvent, pinned: boolean): DigestIdea => ({
  id: event.id,
  title: event.title,
  summary: event.shortDescription || event.description,
  where: [event.location.name, event.location.postcode].filter(Boolean).join(', '),
  free: event.pricing.isFree,
  pattern: event.timing.recurringPattern || '',
  url: event.sourceUrl,
  pinned,
});

export const buildDigestExtras = ({
  preferences,
  issues,
  marks,
  weekStart,
}: {
  preferences: DigestPreferences;
  issues: PropertyIssue[];
  marks: KidsEventMark[];
  weekStart: string; // Monday, YYYY-MM-DD
}): DigestExtras => {
  const monday = parseDate(weekStart);

  let kidsIdeas: DigestIdea[] = [];
  if (preferences.kidsIdeas) {
    const filters = {
      isLocal: preferences.kidsLocalOnly || undefined,
      isFree: preferences.kidsFreeOnly || undefined,
    };
    const available = new Map(getKidsActivities(filters, monday).map((event) => [event.id, event]));
    const pinnedIds = marks.filter((mark) => mark.kind === 'subscribed').map((mark) => mark.eventId);
    const pinned = pinnedIds.map((id) => available.get(id)).filter((event): event is KidsEvent => !!event);
    const suggestions = pickWeeklyIdeas(monday, MAX_IDEAS + pinned.length)
      .filter((event) => available.has(event.id) && !pinnedIds.includes(event.id));
    const chosen = [...pinned, ...suggestions];
    // Filters (e.g. free only) can thin the rotation out, so top up from what's left.
    for (const event of available.values()) {
      if (chosen.length >= MAX_IDEAS) break;
      if (!chosen.includes(event)) chosen.push(event);
    }
    kidsIdeas = chosen.slice(0, MAX_IDEAS).map((event) => toIdea(event, pinnedIds.includes(event.id)));
  }

  const open = issues
    .filter((issue) => issue.status === 'open' || issue.status === 'scheduled')
    .sort((a, b) => {
      const rank = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
      if (rank !== 0) return rank;
      return (a.scheduledDate || a.suggestedDate || '9999').localeCompare(b.scheduledDate || b.suggestedDate || '9999');
    });

  const homeJobs: DigestHomeJob[] = preferences.homeJobs
    ? open.slice(0, MAX_HOME_JOBS).map((issue) => {
        const due = issue.scheduledDate || issue.suggestedDate;
        return {
          title: issue.title,
          urgency: issue.urgency,
          urgencyLabel: ISSUE_URGENCY_LABELS[issue.urgency],
          who: issue.diy ? 'DIY' : issue.trade,
          when: due ? `${issue.status === 'scheduled' ? '' : 'suggested '}${shortDate(due)}` : undefined,
          overdue: !!due && due < weekStart,
          safety: !!issue.safetyNote,
        };
      })
    : [];

  return {
    kidsIdeas,
    homeJobs,
    homeJobsTotal: preferences.homeJobs ? open.length : 0,
    urgentHomeJobs: preferences.homeJobs ? open.filter((issue) => issue.urgency === 'urgent').length : 0,
  };
};
