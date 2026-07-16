import type { CalendarEvent, Person } from '@/types/calendar.types';
import { importDraftToCalendarEventDraft, parseCalendarImportText } from '@/utils/calendarImport';

export type CalendarAssistantAction = 'search' | 'create' | 'unknown';

export interface CalendarAssistantResponse {
  action: CalendarAssistantAction;
  summary: string;
  query?: string;
  results?: CalendarEvent[];
  draft?: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;
  drafts?: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>[];
  warnings: string[];
}

const weekdayLookup: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const pad = (value: number) => String(value).padStart(2, '0');

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const normaliseText = (value: string) =>
  value.toLowerCase().replace(/[^\w\s:/.-]/g, ' ').replace(/\s+/g, ' ').trim();

const titleCase = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());

const parseNaturalDate = (command: string, today: Date): string | undefined => {
  const text = normaliseText(command);

  if (text.includes('today')) return toDateKey(today);
  if (text.includes('tomorrow')) return toDateKey(addDays(today, 1));

  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;

  const slashDate = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (slashDate) return `${slashDate[3]}-${pad(Number(slashDate[2]))}-${pad(Number(slashDate[1]))}`;

  const weekday = Object.entries(weekdayLookup).find(([name]) => text.includes(`next ${name}`));
  if (weekday) {
    const current = today.getDay();
    const target = weekday[1];
    const daysUntil = ((target - current + 7) % 7) || 7;
    return toDateKey(addDays(today, daysUntil));
  }

  return undefined;
};

const parseTime = (command: string) => {
  const text = normaliseText(command);
  const match = text.match(/\b(?:at\s*)?(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\b/) ?? text.match(/\b(?:at\s*)?(\d{1,2})\s*(am|pm)\b/);
  if (!match) return '09:00';

  let hours = Number(match[1]);
  const minutes = Number(match[2] && /^\d{2}$/.test(match[2]) ? match[2] : 0);
  const period = (match[3] || match[2] || '').toLowerCase();

  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return `${pad(hours)}:${pad(minutes)}`;
};

const inferType = (text: string): CalendarEvent['type'] => {
  const lower = text.toLowerCase();
  if (/swim|football|gym|sport|training/.test(lower)) return 'sport';
  if (/school|term|holiday|inset|parents|exam|lesson|club/.test(lower)) return 'education';
  if (/doctor|dentist|appointment/.test(lower)) return 'appointment';
  if (/meal|dinner|lunch/.test(lower)) return 'family';
  if (/meeting|review/.test(lower)) return 'meeting';
  return 'family';
};

const extractTitle = (command: string) => {
  let text = command
    .replace(/\b(add|create|book|schedule|put|make)\b/gi, '')
    .replace(/\b(today|tomorrow|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi, '')
    .replace(/\b(on|at|for)\b\s*\d{1,2}([:.]\d{2})?\s*(am|pm)?\b/gi, '')
    .replace(/\b\d{1,2}\/\d{1,2}\/20\d{2}\b/g, '')
    .replace(/\b20\d{2}-\d{1,2}-\d{1,2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  text = text.replace(/^(an?|the)\s+/i, '');
  return titleCase(text || 'Family event');
};

const extractDateRange = (query: string, today: Date): { start?: string; end?: string } => {
  const text = normaliseText(query);
  if (text.includes('today')) {
    const date = toDateKey(today);
    return { start: date, end: date };
  }
  if (text.includes('tomorrow')) {
    const date = toDateKey(addDays(today, 1));
    return { start: date, end: date };
  }
  if (text.includes('next week') || text.includes('in x week') || text.includes('in a week')) {
    return { start: toDateKey(today), end: toDateKey(addDays(today, 14)) };
  }
  if (text.includes('summer')) {
    const year = today.getFullYear();
    return { start: `${year}-06-01`, end: `${year}-09-15` };
  }
  return {};
};

const eventMatches = (event: CalendarEvent, query: string, today: Date) => {
  const text = normaliseText(query);
  const haystack = normaliseText([
    event.title,
    event.location || '',
    event.notes || '',
    event.type,
    event.date,
  ].join(' '));
  const { start, end } = extractDateRange(query, today);
  const dateMatches = (!start || event.date >= start) && (!end || event.date <= end);

  if (!dateMatches) return false;
  if (/summer|holiday|school break/.test(text)) {
    return /summer|holiday|break|term|school/.test(haystack);
  }

  const queryTokens = text
    .replace(/\b(find|search|show|what|events|event|family|calendar|for|are|coming|up|next|week|today|tomorrow)\b/g, '')
    .split(/\s+/)
    .filter((token) => token.length > 2);

  if (queryTokens.length === 0) return dateMatches;
  return queryTokens.some((token) => haystack.includes(token));
};

const isCreateIntent = (command: string) => /^(add|create|book|schedule|put|make)\b/i.test(command.trim());
const isSearchIntent = (command: string) => /^(find|search|show|what|when|list)\b/i.test(command.trim()) || /coming up|summer holiday|summer holidays/i.test(command);

export const runCalendarAssistant = ({
  command,
  events,
  people,
  today = new Date(),
}: {
  command: string;
  events: CalendarEvent[];
  people: Person[];
  today?: Date;
}): CalendarAssistantResponse => {
  const trimmed = command.trim();
  if (!trimmed) {
    return {
      action: 'unknown',
      summary: 'Ask me to search or create a family event.',
      warnings: ['No command provided.'],
    };
  }

  if (isCreateIntent(trimmed)) {
    const importedDrafts = parseCalendarImportText({
      text: trimmed,
      people,
      existingEvents: events,
      today,
    }).filter((item) => item.importStatus !== 'duplicate');

    if (importedDrafts.length > 0) {
      const drafts = importedDrafts.map(importDraftToCalendarEventDraft);
      const warnings = importedDrafts.flatMap((item) => item.warnings);
      const firstDraft = drafts[0];

      return {
        action: 'create',
        summary: drafts.length === 1
          ? `Review this event before I add it: ${firstDraft.title} on ${firstDraft.date} at ${firstDraft.time}.`
          : `Review ${drafts.length} daily sessions before I add them to the calendar.`,
        draft: firstDraft,
        drafts,
        warnings: Array.from(new Set(warnings)),
      };
    }

    const date = parseNaturalDate(trimmed, today);
    const warnings: string[] = [];
    if (!date) warnings.push('I could not confidently find a date, so I used today.');

    const draft: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      title: extractTitle(trimmed),
      person: people[0]?.id ?? '',
      date: date ?? toDateKey(today),
      time: parseTime(trimmed),
      duration: 60,
      recurring: 'none',
      cost: 0,
      type: inferType(trimmed),
      notes: `Created from assistant request: ${trimmed}`,
      isRecurring: false,
      priority: inferType(trimmed) === 'education' ? 'high' : 'medium',
      status: warnings.length > 0 ? 'tentative' : 'confirmed',
      reminders: [
        { id: 'assistant-reminder-1-day', type: 'notification', time: 1440, enabled: true },
        { id: 'assistant-reminder-1-hour', type: 'notification', time: 60, enabled: true },
      ],
      attendees: [],
    };

    return {
      action: 'create',
      summary: `Review this event before I add it: ${draft.title} on ${draft.date} at ${draft.time}.`,
      draft,
      warnings,
    };
  }

  if (isSearchIntent(trimmed)) {
    const results = events
      .filter((event) => eventMatches(event, trimmed, today))
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
      .slice(0, 12);

    return {
      action: 'search',
      summary: results.length
        ? `I found ${results.length} matching calendar item${results.length === 1 ? '' : 's'}.`
        : 'I could not find matching events.',
      query: trimmed,
      results,
      warnings: [],
    };
  }

  return {
    action: 'unknown',
    summary: 'I can search family events or prepare a new event for confirmation.',
    warnings: ['Try “find summer holidays” or “create swimming lesson next Tuesday at 5pm”.'],
  };
};
