import type { CalendarEvent } from '@/types/calendar.types';

const schoolTitles: Array<[RegExp, string]> = [
  [/\bAfrican storytelling assembly\b/i, 'African storytelling assembly'],
  [/\bindividual and sibling photographs?\b/i, 'Individual and sibling photographs'],
  [/\bPTA AGM\b/i, 'PTA AGM'],
];

export const schoolEventTitle = (title: string) =>
  schoolTitles.find(([pattern]) => pattern.test(title))?.[1] ?? title;

export const hasSchoolSource = (event: Pick<CalendarEvent, 'source' | 'metadata'>) => {
  const provenance = event.metadata?.schoolProvenance;
  return event.source === 'gmail-school-email' || Boolean(provenance && typeof provenance === 'object' &&
    'institutionKey' in provenance && provenance.institutionKey);
};

export const displayEventTitle = (event: Pick<CalendarEvent, 'title' | 'source' | 'metadata'>) =>
  hasSchoolSource(event) ? schoolEventTitle(event.title) : event.title;

export const schoolEventContext = (event: Pick<CalendarEvent, 'title' | 'notes'>) => {
  const text = event.notes || '';
  const pattern = schoolTitles.find(([candidate]) => candidate.test(event.title))?.[0];
  const match = pattern?.exec(text);
  if (!match) return text;
  const section = text.slice(match.index).split(/[•\n]/)[0];
  return section.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ');
};

export const isAdultSchoolEvent = (title: string) =>
  /\b(?:PTA AGM|parent(?:s)?['’]? (?:evening|workshop|meeting)|parent workshop)\b/i.test(title);

export const isChildProfile = (person: { role: string; ageGroup?: string }) =>
  /child|kid|son|daughter|student/i.test(person.role) || /child|primary|secondary|preschool|toddler|teen/i.test(person.ageGroup || '');

export const schoolEventLocation = (location?: string) => location && /^school\.\s/i.test(location) ? 'School' : location;

export const schoolEventAction = (source: string) => {
  const instruction = source.replace(/Imported from calendar intake:\s*/i, '').split(/[.!?•]\s*/)
    .find((sentence) => /\b(?:wear|bring|return|complete|submit|collect|arrive|please)\b/i.test(sentence));
  if (!instruction) return null;
  const clean = instruction.trim();
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
};

/** A source month that disagrees with the series anchor is a review signal, not a replacement date. */
export const recurringSourceDateWarning = (event: Pick<CalendarEvent, 'title' | 'date' | 'notes' | 'isRecurring'>) => {
  if (!event.isRecurring || !/\bphonics\b/i.test(event.title)) return null;
  const month = event.notes?.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s*[-–—:,]?\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s+\d{1,2}\b/i)?.[1];
  if (!month) return null;
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  if (months.indexOf(month.toLowerCase()) + 1 === Number(event.date.slice(5, 7))) return null;
  return `Source says ${month}; this series starts ${event.date}. Confirm the school date before using this weekly reminder.`;
};
