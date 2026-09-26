import type { CalendarEvent } from '@/types/calendar.types';

const eventTypeIcons: Record<CalendarEvent['type'], string> = {
  sport: '⚽',
  meeting: '🤝',
  fitness: '💪',
  social: '🎉',
  education: '🎒',
  family: '🏡',
  other: '📌',
  appointment: '🏥',
  work: '💼',
  personal: '⭐',
  brain: '🧠',
};

const eventKeywordIcons: Array<{ pattern: RegExp; icon: string }> = [
  { pattern: /\b(birthday|bday|b-day)\b/i, icon: '🎂' },
  { pattern: /\b(cinema|movie|film|screening)\b/i, icon: '🎬' },
  { pattern: /\b(theatre|theater|show|performance|concert|gig|ticket)\b/i, icon: '🎟️' },
  { pattern: /\b(football|soccer|sports?\s+day)\b/i, icon: '⚽' },
  { pattern: /\b(swim|swimming)\b/i, icon: '🏊' },
  { pattern: /\b(doctor|dentist|hospital|medical|appointment)\b/i, icon: '🏥' },
  { pattern: /\b(school|term|inset|parents|assembly|exam|lesson|club)\b/i, icon: '🎒' },
  { pattern: /\b(holiday|day\s+out|trip|museum|park|zoo|garden)\b/i, icon: '🧭' },
  { pattern: /\b(meeting|catch[-\s]?up)\b/i, icon: '🤝' },
  { pattern: /\b(work|office)\b/i, icon: '💼' },
];

type EventSemanticInput =
  | string
  | Partial<Pick<CalendarEvent, 'title' | 'type' | 'location' | 'notes'>>;

export const getCalendarEventIcon = (input?: EventSemanticInput | null) => {
  if (!input) return eventTypeIcons.other;

  const text =
    typeof input === 'string'
      ? input
      : [input.title, input.location, input.notes, input.type].filter(Boolean).join(' ');

  const keywordMatch = eventKeywordIcons.find(({ pattern }) => pattern.test(text));
  if (keywordMatch) return keywordMatch.icon;

  if (typeof input !== 'string' && input.type) {
    return eventTypeIcons[input.type] ?? eventTypeIcons.other;
  }

  return eventTypeIcons.other;
};

export const getEventNotificationMetadata = (
  event: Partial<Pick<CalendarEvent, 'title' | 'type' | 'date' | 'time' | 'location' | 'notes'>>
) => ({
  eventTitle: event.title,
  eventType: event.type,
  eventIcon: getCalendarEventIcon(event),
  eventDate: event.date,
  eventTime: event.time,
  eventLocation: event.location,
});
