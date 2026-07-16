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

const dayNamePattern = '(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)';
const monthNamePattern = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

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
    .replace(/(^|[\s([{])([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)
    .replace(/(['’])S\b/g, '$1s');

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

const normalizeCalendarTextLabels = (text: string) =>
  text
    .replace(/([a-z])([A-Z][a-z]+:)/g, '$1\n$2')
    .replace(/\b(AM|PM)(?=(Date|Time|Location|Venue|Where|Place)\s*:)/gi, '$1\n')
    .replace(/\b(Date|Time|Location|Venue|Where|Place)\s*:/gi, '\n$1: ')
    .replace(/\bthe\s+(\d{1,2})(st|nd|rd|th)?\s+of\s+([A-Za-z]+)/gi, '$1 $3')
    .replace(/\b(\d{1,2})(st|nd|rd|th)\s+of\s+([A-Za-z]+)/gi, '$1 $3')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
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
  const text = normalizeCalendarTextLabels(value);

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

  const compactRange = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|to|until|–|—)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(20\d{2}))?\b/i);
  if (compactRange) {
    const month = monthLookup[compactRange[3].toLowerCase()];
    const year = Number(compactRange[4] ?? fallbackYear);
    if (month && year) {
      return {
        date: toDateKey(year, month, Number(compactRange[1])),
        match: compactRange[0].trim(),
      };
    }
  }

  const dayMonthMatches = Array.from(
    text.matchAll(/\b(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?,?\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(20\d{2}))?\b/gi)
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

const toClockParts = (hoursText: string, minutesText?: string, periodText?: string) => {
  let hours = Number(hoursText);
  const minutes = Number(minutesText || 0);
  const period = (periodText || '').toLowerCase();
  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  return { hours, minutes };
};

const parseTimeRange = (line: string) => {
  const normalized = normalizeCalendarTextLabels(line)
    .replace(/[–—]/g, '-')
    // Remove date ranges before looking for clock ranges. Otherwise an input such
    // as "20-24 July 2026, 9am-3pm" can be read as a 20:00-24:00 time range.
    .replace(new RegExp(`\\b${dayNamePattern}\\s+\\d{1,2}(?:st|nd|rd|th)?\\s+${monthNamePattern}(?:\\s+20\\d{2})?\\s*(?:-|to|until)\\s*${dayNamePattern}\\s+\\d{1,2}(?:st|nd|rd|th)?\\s+${monthNamePattern}(?:\\s+20\\d{2})?\\b`, 'gi'), ' ')
    .replace(new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s*(?:-|to|until)\\s*\\d{1,2}(?:st|nd|rd|th)?\\s+${monthNamePattern}(?:\\s+20\\d{2})?\\b`, 'gi'), ' ')
    .replace(/\b(?:20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]20\d{2})\b/g, ' ');
  const range = normalized.match(/\b(\d{1,2})(?:(?::|\.)(\d{2}))?\s*(am|pm)?\s*(?:-|to)\s*(\d{1,2})(?:(?::|\.)(\d{2}))?\s*(am|pm)?\b/i);
  if (!range) return undefined;

  const hasMinutes = Boolean(range[2] || range[5]);
  const hasPeriod = Boolean(range[3] || range[6]);
  if (!hasMinutes && !hasPeriod) return undefined;

  const startPeriod = range[3] || range[6] || '';
  const endPeriod = range[6] || range[3] || '';
  const start = toClockParts(range[1], range[2], startPeriod);
  const end = toClockParts(range[4], range[5], endPeriod);
  const startTotal = start.hours * 60 + start.minutes;
  let endTotal = end.hours * 60 + end.minutes;
  if (endTotal <= startTotal) endTotal += 24 * 60;

  return {
    start: `${pad(start.hours)}:${pad(start.minutes)}`,
    duration: endTotal - startTotal,
  };
};

const parseTime = (line: string) => {
  const range = parseTimeRange(line);
  if (range) return range.start;

  const withoutDates = normalizeCalendarTextLabels(line).replace(/\b(?:20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]20\d{2})\b/g, ' ');
  const match = withoutDates.match(/\b(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\b/i) ?? withoutDates.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (!match) {
    const lower = withoutDates.toLowerCase();
    if (/\bafter\s+school\b/.test(lower)) return '15:30';
    if (/\b(?:morning|breakfast)\b/.test(lower)) return '09:00';
    if (/\b(?:lunchtime|lunch|noon)\b/.test(lower)) return '12:00';
    if (/\bafternoon\b/.test(lower)) return '14:00';
    if (/\bevening\b/.test(lower)) return '18:00';
    if (/\bnight\b/.test(lower)) return '19:00';
    return '09:00';
  }

  const clock = toClockParts(
    match[1],
    match[2] && !Number.isNaN(Number(match[2])) ? match[2] : undefined,
    match[3] || match[2]
  );

  return `${pad(clock.hours)}:${pad(clock.minutes)}`;
};

const parseDurationMinutes = (line: string) => {
  return parseTimeRange(line)?.duration;
};

const inferType = (line: string): CalendarEvent['type'] => {
  const lower = line.toLowerCase();
  if (lower.includes('football') || lower.includes('swim') || lower.includes('sport')) return 'sport';
  if (schoolKeywords.some((keyword) => lower.includes(keyword))) return 'education';
  if (lower.includes('doctor') || lower.includes('dentist') || lower.includes('appointment')) return 'appointment';
  if (entertainmentKeywords.some((keyword) => lower.includes(keyword))) return 'social';
  if (lower.includes('day out') || lower.includes('trip')) return 'family';
  if (lower.includes('party') || lower.includes('birthday') || lower.includes('bday') || lower.includes('b-day')) return 'social';
  if (lower.includes('meeting')) return 'meeting';
  return 'family';
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cleanTitleCandidate = (value: string, dateMatch?: string, location?: string) => {
  let cleaned = value
    .replace(/\b(Title|Event|Subject|From|Date|When|Time|Location|Venue|Where|Place)\s*:/gi, ' ')
    .replace(/\bbday\b/gi, 'birthday')
    .replace(/^\s*(?:can you\s+)?(?:add|create|book|schedule|put|make|save|remember)\s+/i, ' ')
    .replace(/[*`]+/g, ' ')
    .replace(/[•]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (dateMatch) {
    cleaned = cleaned.replace(dateMatch, ' ');
  }
  if (location) {
    cleaned = cleaned.replace(new RegExp(`\\bat\\s+${escapeRegExp(location)}\\b`, 'i'), ' ');
    cleaned = cleaned.replace(new RegExp(escapeRegExp(location), 'i'), ' ');
  }

  return cleaned
    .replace(new RegExp(`\\b${dayNamePattern},?\\s+\\d{1,2}(?:st|nd|rd|th)?\\s+${monthNamePattern}(?:\\s+20\\d{2})?\\b`, 'gi'), ' ')
    .replace(new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${monthNamePattern}(?:\\s+20\\d{2})?\\b`, 'gi'), ' ')
    .replace(/\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}[-/]\d{1,2}[-/]20\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}[:.]\d{2}\s*(am|pm)?\s*(?:-|to|–|—)?\s*\d{0,2}[:.]?\d{0,2}\s*(am|pm)?\b/gi, ' ')
    .replace(/\b\d{1,2}\s*(am|pm)\b/gi, ' ')
    .replace(/\b(on|at)\s*$/gi, ' ')
    .replace(/^[\s,:;.!?-]+|[\s,:;.!?-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractExplicitLocation = (line: string) => {
  const normalized = normalizeCalendarTextLabels(line).replace(/\s*\n\s*/g, ' ');
  const match = normalized.match(/\b(?:Location|Venue|Where|Place)\s*:\s*(.+?)(?=\s+(?:Date|Time|Subject|From)\s*:|$)/i);
  return match?.[1]
    ?.replace(/\s+/g, ' ')
    .replace(/\s*•\s*/g, ' ')
    .replace(/^[\s,:;.-]+|[\s,:;.-]+$/g, '')
    .trim();
};

const cleanLocationCandidate = (value: string, dateMatch?: string) => {
  let cleaned = value.replace(/[*`]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (dateMatch) cleaned = cleaned.replace(dateMatch, ' ');

  cleaned = cleaned
    .replace(/\s+\bfor\s+anyone\b.*$/i, ' ')
    .replace(/\s+\bfor\s+[A-Z][A-Za-z'’ -]{0,40}(?:'s|’s)?\s+(?:\d{1,2}(?:st|nd|rd|th)?\s+)?(?:birthday|bday|b-day)\b.*$/i, ' ')
    .replace(/\s+\bon\s+(?:the\s+)?(?:morning|afternoon|evening|night)\b.*$/i, ' ')
    .replace(/\s+\b(?:morning|afternoon|evening|night)\s+of\b.*$/i, ' ')
    .replace(new RegExp(`\\b${dayNamePattern}\\b,?`, 'gi'), ' ')
    .replace(new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${monthNamePattern}(?:\\s+20\\d{2})?\\b`, 'gi'), ' ')
    .replace(/\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}[-/]\d{1,2}[-/]20\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}[:.]\d{2}\s*(am|pm)?\b/gi, ' ')
    .replace(/\b\d{1,2}\s*(am|pm)\b/gi, ' ')
    .replace(/^[\s,:;.!?-]+|[\s,:;.!?-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!/[A-Za-z]{3,}/.test(cleaned)) return undefined;
  if (/^(on|at|from|to|date|time)$/i.test(cleaned)) return undefined;

  return cleaned;
};

const extractNaturalAtLocation = (line: string, dateMatch?: string) => {
  const normalized = normalizeCalendarTextLabels(line).replace(/[*`]+/g, ' ').replace(/\s*\n\s*/g, ' ');
  const stopPattern = [
    'for\\s+anyone\\b',
    "for\\s+[A-Z][A-Za-z'’ -]{0,40}(?:'s|’s)?\\s+(?:\\d{1,2}(?:st|nd|rd|th)?\\s+)?(?:birthday|bday|b-day)\\b",
    'for\\s+(?:a|the)\\s+(?:birthday|bday|b-day|party|gathering|celebration)\\b',
    'on\\s+(?:the\\s+)?(?:morning|afternoon|evening|night)\\b',
    '(?:morning|afternoon|evening|night)\\s+of\\b',
    `(?:on\\s+)?(?:${dayNamePattern}\\b|\\d{1,2}(?:st|nd|rd|th)?\\s+${monthNamePattern}\\b|20\\d{2}|\\d{1,2}[:.]\\d{2}|\\d{1,2}\\s*(?:am|pm)\\b)`,
  ].join('|');
  const atMatches = Array.from(normalized.matchAll(
    new RegExp(`\\bat\\s+(.+?)(?=\\s+(?:${stopPattern})|$)`, 'gi')
  ));

  for (const match of atMatches) {
    const candidate = cleanLocationCandidate(match[1], dateMatch);
    if (candidate) return candidate;
  }

  return undefined;
};

const extractContextVenue = (line: string, dateMatch?: string) => {
  if (!dateMatch || !line.includes('•')) return undefined;

  const beforeDate = line.split(dateMatch)[0] || '';
  const segments = beforeDate
    .split(/\s•\s/)
    .map((segment) => cleanTitleCandidate(segment))
    .filter((segment) =>
      segment.length >= 4 &&
      !/^(subject|from|booking confirmation)$/i.test(segment) &&
      !entertainmentKeywords.some((keyword) => segment.toLowerCase() === keyword)
    );

  if (segments.length < 2) return undefined;

  const candidate = segments[segments.length - 1];
  if (/\b(confirmation|ticket|booking|subject)\b/i.test(candidate)) return undefined;
  if (candidate.length > 80) return undefined;
  return candidate;
};

const extractLocation = (line: string, dateMatch?: string) => (
  extractExplicitLocation(line) ||
  extractNaturalAtLocation(line, dateMatch) ||
  extractContextVenue(line, dateMatch)
);

const inferSemanticTitle = (line: string, dateMatch: string, location?: string) => {
  const cleaned = cleanTitleCandidate(line, dateMatch, location);
  if (!cleaned) return undefined;

  const birthdayCommand = cleaned.match(/\b(?:add|create|put|save|remember|calendar|book|arrange|organise|organize)\s+([A-Z][A-Za-z'’ -]{1,36}?)(?:'s|’s)?\s+(\d{1,2}(?:st|nd|rd|th)?)?\s*(birthday|bday|b-day)\s*(party|celebration|gathering)?\b/i);
  if (birthdayCommand) {
    const owner = titleCase(birthdayCommand[1] || '').replace(/'s$/i, '');
    const age = birthdayCommand[2] ? `${birthdayCommand[2]} ` : '';
    const party = birthdayCommand[4] ? ' Party' : '';
    return `${owner}'s ${age}Birthday${party}`.trim();
  }

  const birthdayForOwner = cleaned.match(/\bfor\s+([A-Z][A-Za-z'’ -]{1,36}?)(?:'s|’s)?\s+(\d{1,2}(?:st|nd|rd|th)?)?\s*(birthday|bday|b-day)\s*(party|celebration|gathering)?\b/i);
  if (birthdayForOwner) {
    const owner = titleCase(birthdayForOwner[1] || '').replace(/'s$/i, '');
    const age = birthdayForOwner[2] ? `${birthdayForOwner[2]} ` : '';
    const party = birthdayForOwner[4] ? ' Party' : '';
    return `${owner}'s ${age}Birthday${party}`.trim();
  }

  const birthdayOwnerFirst = cleaned.match(/\b([A-Z][A-Za-z'’ -]{1,36}?)(?:'s|’s)?\s+(\d{1,2}(?:st|nd|rd|th)?)?\s*(birthday|bday|b-day)\s*(party|celebration)?\b/i);
  if (birthdayOwnerFirst) {
    const owner = titleCase(birthdayOwnerFirst[1] || '').replace(/'s$/i, '');
    const age = birthdayOwnerFirst[2] ? `${birthdayOwnerFirst[2]} ` : '';
    const party = birthdayOwnerFirst[4] ? ' Party' : '';
    return `${owner}'s ${age}Birthday${party}`.trim();
  }

  const birthdayFor = cleaned.match(/\b(birthday|bday|b-day)\s*(party|celebration)?\s+(?:for\s+)?([A-Z][A-Za-z'’ -]{1,36})\b/i);
  if (birthdayFor) {
    const owner = titleCase(birthdayFor[3] || '').replace(/'s$/i, '');
    const party = birthdayFor[2] ? ' Party' : '';
    return `${owner}'s Birthday${party}`.trim();
  }

  const dayOutMatch = cleaned.match(/\b([A-Z][A-Za-z'’ -]{1,36})\s+day\s+out\b/i);
  if (dayOutMatch) {
    return `${titleCase(dayOutMatch[1])} Day Out`;
  }

  if (/\bday\s+out\b/i.test(cleaned)) {
    return 'Day Out';
  }

  return undefined;
};

const inferTitle = (line: string, dateMatch: string) => {
  const location = extractLocation(line, dateMatch);
  const beforeDate = line.split(dateMatch)[0]?.split(/\s•\s/)[0]?.replace(/[:\-–—]+$/g, '').trim();
  const afterDate = line.split(dateMatch)[1]?.replace(/^[:\-–—]+/g, '').trim();
  const semanticTitle = inferSemanticTitle(beforeDate || line, dateMatch, location);
  const raw = /^(date|when)\s*:?\s*$/i.test(beforeDate || '')
    ? location || afterDate
    : semanticTitle || beforeDate || location || afterDate || line;
  const removableLocation = raw === location ? undefined : location;

  return titleCase(cleanTitleCandidate(raw || '', dateMatch, removableLocation).slice(0, 90)) || 'Imported event';
};

const hasExplicitTime = (line: string) =>
  /\b(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\b/i.test(line) ||
  /\b(\d{1,2})\s*(am|pm)\b/i.test(line);

const hasAmbiguousNumericDate = (line: string) =>
  /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|1[0-2])[-/]20\d{2}\b/.test(line);

const hasCalendarCue = (line: string) => {
  const lower = line.toLowerCase();
  return [
    ...schoolKeywords,
    ...entertainmentKeywords,
    'doctor',
    'dentist',
    'appointment',
    'party',
    'birthday',
    'bday',
    'b-day',
    'day out',
    'trip',
    'football',
    'swim',
    'sport',
    'meeting',
    'camp',
    'pickup',
    'collection',
  ].some((keyword) => lower.includes(keyword));
};

const hasCalendarLabel = (line: string) =>
  /\b(Title|Event|Subject|Date|When|Time|Location|Venue|Where|Place)\s*:/i.test(line);

const confidenceForLine = (line: string) => {
  const lower = line.toLowerCase();
  let confidence = schoolKeywords.some((keyword) => lower.includes(keyword)) ? 0.86 : 0.72;
  if (entertainmentKeywords.some((keyword) => lower.includes(keyword))) confidence = Math.max(confidence, 0.82);
  if (!hasCalendarCue(line) && !hasCalendarLabel(line) && !hasExplicitTime(line)) confidence = 0.62;
  if (hasExplicitTime(line)) confidence = Math.max(confidence, 0.9);
  if (hasAmbiguousNumericDate(line)) confidence = Math.min(confidence, 0.68);
  return confidence;
};

const warningsForLine = (line: string) => {
  const warnings: string[] = [];
  if (hasAmbiguousNumericDate(line)) {
    warnings.push('Ambiguous numeric date. Review day/month before importing.');
  }
  return warnings;
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
  warnings: event.warnings || [],
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
  const rows = parseDelimitedRows(normalizeCalendarTextLabels(text));
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
): CalendarImportDraft[] => drafts.map((draft) => {
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

const addDaysToDateKey = (date: string, days: number) => {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().split('T')[0];
};

const expandTimedDateRanges = (drafts: CalendarImportDraft[]) => drafts.flatMap((draft) => {
  if (!draft.endDate || draft.endDate <= draft.date || draft.duration >= 24 * 60) {
    return [draft];
  }

  const expanded: CalendarImportDraft[] = [];
  for (let date = draft.date; date <= draft.endDate; date = addDaysToDateKey(date, 1)) {
    expanded.push({
      ...draft,
      importId: `${draft.importId}-${date}`,
      date,
      endDate: undefined,
      notes: `${draft.notes || `Imported from calendar intake: ${draft.source}`} (daily session in a timed date range)`,
    });
  }

  return expanded;
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
  const normalizedText = normalizeCalendarTextLabels(text);
  const structured = parseStructuredRows(normalizedText, people, defaultPersonId);
  const fallbackYear = today.getFullYear();

  const sourceLines = (() => {
    const lines = normalizedText.split(/\r?\n/);
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
      const currentLineIndex = index - 1;
      const lineDate = parseDateValue(line, fallbackYear);
      const dateLineRemainder = lineDate ? cleanTitleCandidate(line, lineDate.match) : line;
      const dateOnlyLine = Boolean(
        lineDate && !/[A-Za-z]{3,}/.test(dateLineRemainder.replace(/\b(date|when|on|at|am|pm)\b/gi, ''))
      );
      const dateLabelLine = /^\s*(date|when)\s*:/i.test(line);
      const includeFollowingContext = Boolean(lineDate && (dateOnlyLine || dateLabelLine || !hasExplicitTime(line)));

      const previousLines = (() => {
        if (!lineDate) return [] as string[];
        const candidates = [
          sourceLines[currentLineIndex - 2] || '',
          sourceLines[currentLineIndex - 1] || '',
        ].map((value) => value.trim()).filter(Boolean);

        if (dateLabelLine) {
          return candidates.filter((value) => /^(title|event|subject)\s*:/i.test(value));
        }
        if (dateOnlyLine) {
          return candidates.filter((value) => !parseDateValue(value, fallbackYear));
        }
        return [];
      })();

      const followingLines = (() => {
        if (!includeFollowingContext) return [] as string[];
        const lines: string[] = [];
        for (let offset = 1; offset <= 6; offset += 1) {
          const nextLine = sourceLines[currentLineIndex + offset]?.trim();
          if (!nextLine) continue;
          if (parseDateValue(nextLine, fallbackYear)) break;
          lines.push(nextLine);
        }
        return lines;
      })();

      const neighborhoodParts = lineDate ? [...previousLines, line, ...followingLines] : [line];
      const neighborhood = neighborhoodParts
        .map((value) => value.trim())
        .filter(Boolean)
        .join(previousLines.length > 0 || dateOnlyLine || dateLabelLine ? ' • ' : ' ');
      const candidate = lineDate ? neighborhood : line;
      const parsedDate = parseDateValue(candidate, fallbackYear);
      if (!parsedDate) return [];
      if (!/[A-Za-z]/.test(candidate.replace(parsedDate.match, ''))) return [];

      return toDraft({
        title: inferTitle(candidate, parsedDate.match),
        date: parsedDate.date,
        endDate: parseEndDate(candidate, parsedDate),
        time: parseTime(candidate),
        duration: parseDurationMinutes(candidate),
        location: extractLocation(candidate, parsedDate.match),
        type: inferType(candidate),
        confidence: confidenceForLine(candidate),
        warnings: warningsForLine(candidate),
      }, candidate, index, people, defaultPersonId);
    });

  const drafts = structured.length > 0 ? structured : dedupeImportDrafts(lineDrafts);
  return annotateCalendarImportDrafts(expandTimedDateRanges(drafts), existingEvents);
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
