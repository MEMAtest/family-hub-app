import type { CalendarEvent, Person } from '@/types/calendar.types';

export type CalendarImportStatus = 'ready' | 'duplicate' | 'conflict' | 'needs_review';

export interface CalendarImportDraft {
  importId: string;
  title: string;
  person: string;
  date: string;
  endDate?: string;
  time: string;
  duration: number;
  location?: string;
  recurring: CalendarEvent['recurring'];
  cost: number;
  type: CalendarEvent['type'];
  notes?: string;
  isRecurring: boolean;
  priority: CalendarEvent['priority'];
  status: CalendarEvent['status'];
  confidence: number;
  source: string;
  sourceLine: number;
  importStatus: CalendarImportStatus;
  warnings: string[];
  duplicateOf?: string;
  conflictWith?: string[];
}

export interface CalendarEmailInput {
  subject?: string | null;
  from?: string | null;
  text?: string | null;
  html?: string | null;
}

const monthLookup: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const schoolKeywords = [
  'term',
  'half term',
  'holiday',
  'inset',
  'school',
  'parents',
  'assembly',
  'sports',
  'exam',
  'club',
  'lesson',
];

const entertainmentKeywords = [
  'cinema',
  'movie',
  'film',
  'theatre',
  'theater',
  'show',
  'screening',
  'performance',
  'concert',
  'gig',
  'ticket',
  'booking',
];

const pad = (value: number) => String(value).padStart(2, '0');

const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month)}-${pad(day)}`;

const titleCase = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/^[•\s]+/g, '')
    .replace(/^[\s,:;.-]+|[\s,:;.-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());

const parseDelimitedRows = (text: string) => {
  const rows: string[][] = [];
  const delimiter = text.includes('\t') ? '\t' : ',';

  text.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) return;
    const cells: string[] = [];
    let current = '';
    let quoted = false;

    for (const char of line) {
      if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    cells.push(current.trim());
    rows.push(cells);
  });

  return rows;
};

const stripHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

const cleanEmailLine = (line: string) =>
  line
    .replace(/\s+/g, ' ')
    .replace(/^[>*\s-]+/g, '')
    .trim();

const isEmailNoiseLine = (line: string) =>
  /unsubscribe|privacy policy|terms and conditions|view in browser|manage your booking|download app|add to wallet|do not reply/i.test(line);

export const normalizeCalendarEmailText = ({
  subject,
  from,
  text,
  html,
}: CalendarEmailInput) => {
  const cleanSubject = cleanEmailLine(subject || '');
  const body = text?.trim() || (html ? stripHtml(html) : '');
  const lines = body
    .split(/\r?\n/)
    .map(cleanEmailLine)
    .filter((line) => line.length >= 4 && !isEmailNoiseLine(line));

  const candidateLines = new Set<string>();
  if (cleanSubject) candidateLines.add(cleanSubject);

  lines.forEach((line, index) => {
    const previous = lines[index - 1] || '';
    const previousTwo = lines[index - 2] || '';
    const next = lines[index + 1] || '';
    const nextTwo = lines[index + 2] || '';
    const nextThree = lines[index + 3] || '';
    const hasDate = Boolean(parseDateValue(line, new Date().getFullYear()));
    const hasTime = /\b(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\b/i.test(line) || /\b(\d{1,2})\s*(am|pm)\b/i.test(line);
    const hasEventKeyword = [...schoolKeywords, ...entertainmentKeywords].some((keyword) =>
      line.toLowerCase().includes(keyword)
    );

    if (hasDate || hasTime || hasEventKeyword) {
      const context = [cleanSubject, previousTwo, previous, line, next, nextTwo, nextThree]
        .filter(Boolean)
        .join(' • ');
      candidateLines.add(context);
    }
  });

  if (candidateLines.size === 1 && cleanSubject && lines.length > 0) {
    candidateLines.add([cleanSubject, ...lines.slice(0, 8)].join(' • '));
  }

  const metadata = [
    cleanSubject ? `Subject: ${cleanSubject}` : '',
    from ? `From: ${from}` : '',
  ].filter(Boolean);

  return [...metadata, ...candidateLines].join('\n');
};

const parseDateValue = (value: string, fallbackYear?: number): { date: string; match: string } | null => {
  const text = value.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');

  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) {
    return {
      date: toDateKey(Number(iso[1]), Number(iso[2]), Number(iso[3])),
      match: iso[0],
    };
  }

  const numeric = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (numeric) {
    return {
      date: toDateKey(Number(numeric[3]), Number(numeric[2]), Number(numeric[1])),
      match: numeric[0],
    };
  }

  const dayMonthMatches = Array.from(
    text.matchAll(/\b(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?\s*(\d{1,2})\s+([A-Za-z]+)(?:\s+(20\d{2}))?\b/gi)
  );
  for (const dayMonth of dayMonthMatches) {
    const month = monthLookup[dayMonth[2].toLowerCase()];
    const year = Number(dayMonth[3] ?? fallbackYear);
    if (month && year) {
      return {
        date: toDateKey(year, month, Number(dayMonth[1])),
        match: dayMonth[0].trim(),
      };
    }
  }

  const monthDayMatches = Array.from(text.matchAll(/\b([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/gi));
  for (const monthDay of monthDayMatches) {
    const month = monthLookup[monthDay[1].toLowerCase()];
    const year = Number(monthDay[3] ?? fallbackYear);
    if (month && year) {
      return {
        date: toDateKey(year, month, Number(monthDay[2])),
        match: monthDay[0].trim(),
      };
    }
  }

  return null;
};

const parseEndDate = (line: string, start: { date: string; match: string }) => {
  const rangeMatch = line
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
    .match(/(?:-|to|until|–|—)\s*(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?\s*(\d{1,2})\s+([A-Za-z]+)?(?:\s+(20\d{2}))?/i);

  if (!rangeMatch) return undefined;

  const [startYear, startMonth] = start.date.split('-').map(Number);
  const month = rangeMatch[2] ? monthLookup[rangeMatch[2].toLowerCase()] : startMonth;
  const year = Number(rangeMatch[3] ?? startYear);
  if (!month || !year) return undefined;

  const endDate = toDateKey(year, month, Number(rangeMatch[1]));
  return endDate >= start.date ? endDate : undefined;
};

const parseTime = (line: string) => {
  const match = line.match(/\b(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\b/i) ?? line.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (!match) return '09:00';

  let hours = Number(match[1]);
  const minutes = Number(match[2] && !Number.isNaN(Number(match[2])) ? match[2] : 0);
  const period = (match[3] || match[2] || '').toLowerCase();

  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return `${pad(hours)}:${pad(minutes)}`;
};

const parseDurationMinutes = (line: string) => {
  const normalized = line.replace(/[–—]/g, '-');
  const range = normalized.match(/\b(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\s*(?:-|to)\s*(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\b/i);
  if (!range) return undefined;

  let startHours = Number(range[1]);
  const startMinutes = Number(range[2]);
  let endHours = Number(range[4]);
  const endMinutes = Number(range[5]);
  const startPeriod = (range[3] || range[6] || '').toLowerCase();
  const endPeriod = (range[6] || range[3] || '').toLowerCase();

  if (startPeriod === 'pm' && startHours < 12) startHours += 12;
  if (startPeriod === 'am' && startHours === 12) startHours = 0;
  if (endPeriod === 'pm' && endHours < 12) endHours += 12;
  if (endPeriod === 'am' && endHours === 12) endHours = 0;

  const startTotal = startHours * 60 + startMinutes;
  let endTotal = endHours * 60 + endMinutes;
  if (endTotal <= startTotal) endTotal += 24 * 60;

  return endTotal - startTotal;
};

const inferType = (line: string): CalendarEvent['type'] => {
  const lower = line.toLowerCase();
  if (lower.includes('football') || lower.includes('swim') || lower.includes('sport')) return 'sport';
  if (schoolKeywords.some((keyword) => lower.includes(keyword))) return 'education';
  if (lower.includes('doctor') || lower.includes('dentist') || lower.includes('appointment')) return 'appointment';
  if (entertainmentKeywords.some((keyword) => lower.includes(keyword))) return 'social';
  if (lower.includes('party') || lower.includes('birthday')) return 'social';
  if (lower.includes('meeting')) return 'meeting';
  return 'family';
};

const inferTitle = (line: string, dateMatch: string) => {
  const beforeDate = line.split(dateMatch)[0]?.split(/\s•\s/)[0]?.replace(/[:\-–—]+$/g, '').trim();
  const afterDate = line.split(dateMatch)[1]?.replace(/^[:\-–—]+/g, '').trim();
  const raw = beforeDate || afterDate || line;
  return titleCase(raw.replace(/\b(at\s+)?\d{1,2}[:.]\d{2}\s*(am|pm)?\b/gi, '').slice(0, 90)) || 'Imported event';
};

const hasExplicitTime = (line: string) =>
  /\b(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\b/i.test(line) ||
  /\b(\d{1,2})\s*(am|pm)\b/i.test(line);

const confidenceForLine = (line: string) => {
  const lower = line.toLowerCase();
  let confidence = schoolKeywords.some((keyword) => lower.includes(keyword)) ? 0.86 : 0.72;
  if (entertainmentKeywords.some((keyword) => lower.includes(keyword))) confidence = Math.max(confidence, 0.82);
  if (hasExplicitTime(line)) confidence = Math.max(confidence, 0.9);
  return confidence;
};

const getDefaultPerson = (people: Person[], defaultPersonId?: string) =>
  defaultPersonId && defaultPersonId !== 'all'
    ? defaultPersonId
    : people[0]?.id ?? '';

const toDraft = (
  event: Partial<CalendarImportDraft>,
  line: string,
  sourceLine: number,
  people: Person[],
  defaultPersonId?: string
): CalendarImportDraft => ({
  importId: `import-${sourceLine}-${Math.random().toString(36).slice(2, 8)}`,
  title: event.title || 'Imported event',
  person: event.person || getDefaultPerson(people, defaultPersonId),
  date: event.date || new Date().toISOString().split('T')[0],
  endDate: event.endDate,
  time: event.time || '09:00',
  duration: event.duration || (event.endDate ? 1440 : 60),
  location: event.location,
  recurring: 'none',
  cost: 0,
  type: event.type || inferType(line),
  notes: event.notes || `Imported from calendar intake: ${line}`,
  isRecurring: false,
  priority: event.priority || (inferType(line) === 'education' ? 'high' : 'medium'),
  status: 'confirmed',
  confidence: event.confidence ?? 0.78,
  source: line,
  sourceLine,
  importStatus: 'ready',
  warnings: [],
});

const mapHeader = (header: string) => {
  const value = header.toLowerCase();
  if (/(title|event|subject|name)/.test(value)) return 'title';
  if (/(date|day|when)/.test(value)) return 'date';
  if (/(time|start)/.test(value)) return 'time';
  if (/(end)/.test(value)) return 'endDate';
  if (/(location|venue|where|place)/.test(value)) return 'location';
  if (/(type|category)/.test(value)) return 'type';
  if (/(note|description|detail)/.test(value)) return 'notes';
  return 'ignore';
};

const parseStructuredRows = (text: string, people: Person[], defaultPersonId?: string) => {
  const rows = parseDelimitedRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(mapHeader);
  if (!headers.includes('date') || !headers.includes('title')) return [];

  const fallbackYear = new Date().getFullYear();
  return rows.slice(1).flatMap((row, index) => {
    const record = new Map<string, string>();
    row.forEach((cell, cellIndex) => {
      const key = headers[cellIndex];
      if (key !== 'ignore') record.set(key, cell);
    });

    const parsedDate = parseDateValue(record.get('date') || '', fallbackYear);
    if (!parsedDate) return [];

    return toDraft({
      title: record.get('title') || 'Imported event',
      date: parsedDate.date,
      time: record.get('time') ? parseTime(record.get('time') || '') : '09:00',
      endDate: record.get('endDate') ? parseDateValue(record.get('endDate') || '', fallbackYear)?.date : undefined,
      location: record.get('location') || undefined,
      type: inferType(`${record.get('title')} ${record.get('type')}`),
      notes: record.get('notes') || undefined,
      confidence: 0.9,
    }, row.join(', '), index + 2, people, defaultPersonId);
  });
};

const overlaps = (a: CalendarImportDraft, b: Pick<CalendarEvent, 'id' | 'date' | 'time' | 'duration' | 'person'>) => {
  if (a.person && b.person && a.person !== b.person) return false;
  if (a.date !== b.date) return false;
  const startA = new Date(`${a.date}T${a.time}`).getTime();
  const endA = startA + a.duration * 60_000;
  const startB = new Date(`${b.date}T${b.time}`).getTime();
  const endB = startB + (b.duration || 60) * 60_000;
  return startA < endB && startB < endA;
};

export const annotateCalendarImportDrafts = (
  drafts: CalendarImportDraft[],
  existingEvents: CalendarEvent[]
) => drafts.map((draft) => {
  const duplicate = existingEvents.find((event) =>
    event.date === draft.date &&
    event.time === draft.time &&
    event.title.trim().toLowerCase() === draft.title.trim().toLowerCase()
  );
  const conflicts = existingEvents.filter((event) => overlaps(draft, event));
  const warnings = [...draft.warnings];

  if (duplicate) warnings.push('Already appears to exist in the calendar.');
  if (conflicts.length > 0 && !duplicate) warnings.push('Overlaps another event for the same family member.');
  if (draft.confidence < 0.7) warnings.push('Low confidence extraction. Review before importing.');

  return {
    ...draft,
    importStatus: duplicate ? 'duplicate' : conflicts.length > 0 ? 'conflict' : draft.confidence < 0.7 ? 'needs_review' : 'ready',
    duplicateOf: duplicate?.id,
    conflictWith: conflicts.map((event) => event.id),
    warnings,
  };
});

export const parseCalendarImportText = ({
  text,
  people = [],
  existingEvents = [],
  defaultPersonId,
  today = new Date(),
}: {
  text: string;
  people?: Person[];
  existingEvents?: CalendarEvent[];
  defaultPersonId?: string;
  today?: Date;
}) => {
  const structured = parseStructuredRows(text, people, defaultPersonId);
  const fallbackYear = today.getFullYear();

  const sourceLines = (() => {
    const lines = text.split(/\r?\n/);
    const keyDatesIndex = lines.findIndex((line) => line.trim().toLowerCase() === 'key dates');
    if (keyDatesIndex === -1) return lines;

    const afterKeyDates = lines.slice(keyDatesIndex + 1);
    const endIndex = afterKeyDates.findIndex((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (index < 2) return false;
      return !trimmed.startsWith('•') && /^[A-Z][A-Za-z’'&,\s-]+$/.test(trimmed);
    });

    return endIndex === -1 ? afterKeyDates : afterKeyDates.slice(0, endIndex);
  })();

  const lineDrafts = sourceLines
    .map((line, index) => ({ line: line.trim(), index: index + 1 }))
    .filter(({ line }) => line.length >= 8)
    .flatMap(({ line, index }) => {
      const parsedDate = parseDateValue(line, fallbackYear);
      if (!parsedDate) return [];
      if (!/[A-Za-z]/.test(line.replace(parsedDate.match, ''))) return [];

      return toDraft({
        title: inferTitle(line, parsedDate.match),
        date: parsedDate.date,
        endDate: parseEndDate(line, parsedDate),
        time: parseTime(line),
        duration: parseDurationMinutes(line),
        type: inferType(line),
        confidence: confidenceForLine(line),
      }, line, index, people, defaultPersonId);
    });

  const drafts = structured.length > 0 ? structured : dedupeImportDrafts(lineDrafts);
  return annotateCalendarImportDrafts(drafts, existingEvents);
};

const dedupeImportDrafts = (drafts: CalendarImportDraft[]) => {
  const byKey = new Map<string, CalendarImportDraft>();

  drafts.forEach((draft) => {
    const key = [
      draft.person,
      draft.title.trim().toLowerCase(),
      draft.date,
      draft.endDate || '',
    ].join('|');
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, draft);
      return;
    }

    const score = (candidate: CalendarImportDraft) =>
      candidate.confidence +
      (candidate.time !== '09:00' ? 0.2 : 0) +
      (candidate.duration !== 60 ? 0.1 : 0);

    if (score(draft) > score(existing)) {
      byKey.set(key, draft);
    }
  });

  return Array.from(byKey.values());
};

export const importDraftToCalendarEventDraft = (
  draft: CalendarImportDraft
): Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: draft.title,
  person: draft.person,
  date: draft.date,
  endDate: draft.endDate,
  time: draft.time,
  duration: draft.duration,
  location: draft.location,
  recurring: draft.recurring,
  cost: draft.cost,
  type: draft.type,
  notes: draft.notes,
  isRecurring: draft.isRecurring,
  priority: draft.priority,
  status: draft.status,
  reminders: [
    { id: 'reminder-school-1-day', type: 'notification', time: 1440, enabled: true },
    { id: 'reminder-school-1-hour', type: 'notification', time: 60, enabled: true },
  ],
  attendees: [],
});
