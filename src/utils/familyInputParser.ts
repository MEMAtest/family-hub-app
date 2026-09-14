import type { CalendarEvent, CalendarTask, Person, RecurringPattern } from '@/types/calendar.types';
import { addDays, dayOfWeek, isDateKey, toDateKey } from '@/utils/recurrence';

/**
 * Understanding what a parent typed.
 *
 * The previous parser only fired when a sentence STARTED with a command verb
 * ("add", "create", "book"). "Kayode has swimming on Tuesdays" fell straight
 * through to "I don't understand", which is most of how people actually talk.
 *
 * Three rules this follows:
 *
 * 1. No command verb required. Any sentence naming a thing and a time is an
 *    attempt to schedule something.
 * 2. A deadline means a task, not an event. "due Sunday" / "by Friday" /
 *    "hand in Monday" produces work with a window, not a block at a made-up time.
 * 3. Never silently guess who it is for. The old parser defaulted to the first
 *    child in the list and buried a warning in a summary line — wrong roughly
 *    half the time in a two-child house. If nobody is named, say so and ask.
 */

export type ParsedKind = 'event' | 'task' | 'query' | 'unknown';

export interface ParsedResult {
  kind: ParsedKind;
  /** 0-1. Below ~0.5 the UI should confirm rather than assume. */
  confidence: number;
  /** Things the user must resolve before saving — never silently defaulted. */
  needs: Array<'assignee' | 'date' | 'time'>;
  /** Plain-English account of what was understood, for the confirm step. */
  summary: string;
  eventDraft?: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;
  taskDraft?: Omit<CalendarTask, 'id' | 'createdAt' | 'updatedAt'>;
  query?: string;
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, weds: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');
const norm = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Next occurrence of a weekday, strictly in the future (never "today"). */
const nextWeekday = (from: string, target: number): string => {
  const delta = ((target - dayOfWeek(from) + 7) % 7) || 7;
  return addDays(from, delta);
};

/** Same weekday this week if it hasn't passed, otherwise next week. */
const upcomingWeekday = (from: string, target: number): string => {
  const delta = (target - dayOfWeek(from) + 7) % 7;
  return addDays(from, delta);
};

export interface DateHit {
  date: string;
  /** The matched text, so it can be stripped from the title. */
  matched: string;
}

export const findDate = (text: string, today: string): DateHit | null => {
  const t = norm(text);

  if (/\btoday\b/.test(t)) return { date: today, matched: 'today' };
  if (/\btomorrow\b|\btmrw\b/.test(t)) return { date: addDays(today, 1), matched: 'tomorrow' };
  if (/\bday after tomorrow\b/.test(t)) return { date: addDays(today, 2), matched: 'day after tomorrow' };

  const iso = t.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return { date: `${iso[1]}-${pad(+iso[2])}-${pad(+iso[3])}`, matched: iso[0] };

  // UK order: day/month/year.
  const slash = t.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (slash) return { date: `${slash[3]}-${pad(+slash[2])}-${pad(+slash[1])}`, matched: slash[0] };

  // "on the 15th", "15th of March", "March 15"
  const dayMonth = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)\b/);
  if (dayMonth && MONTHS[dayMonth[2]]) {
    const year = +today.slice(0, 4);
    const candidate = `${year}-${pad(MONTHS[dayMonth[2]])}-${pad(+dayMonth[1])}`;
    const rolled = candidate < today ? `${year + 1}-${pad(MONTHS[dayMonth[2]])}-${pad(+dayMonth[1])}` : candidate;
    if (isDateKey(rolled)) return { date: rolled, matched: dayMonth[0] };
  }
  const monthDay = t.match(/\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (monthDay && MONTHS[monthDay[1]]) {
    const year = +today.slice(0, 4);
    const candidate = `${year}-${pad(MONTHS[monthDay[1]])}-${pad(+monthDay[2])}`;
    const rolled = candidate < today ? `${year + 1}-${pad(MONTHS[monthDay[1]])}-${pad(+monthDay[2])}` : candidate;
    if (isDateKey(rolled)) return { date: rolled, matched: monthDay[0] };
  }

  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\bnext ${name}\\b`).test(t)) {
      return { date: nextWeekday(today, dow), matched: `next ${name}` };
    }
  }
  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b(?:this |on )?${name}s?\\b`).test(t)) {
      return { date: upcomingWeekday(today, dow), matched: name };
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Recurrence
// ---------------------------------------------------------------------------

export const findRecurrence = (text: string, startDate: string): RecurringPattern | null => {
  const t = norm(text);
  const repeats = /\b(every|each|weekly|fortnightly|monthly|yearly|annually|daily)\b/.test(t)
    || /\b(mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays)\b/.test(t);
  if (!repeats) return null;

  const interval = /\bfortnightly\b|\bevery other\b|\bevery 2 weeks\b/.test(t) ? 2 : 1;

  if (/\bdaily\b|\bevery day\b/.test(t)) return { frequency: 'daily', interval };
  if (/\bmonthly\b|\bevery month\b/.test(t)) return { frequency: 'monthly', interval };
  if (/\byearly\b|\bannually\b|\bevery year\b/.test(t)) return { frequency: 'yearly', interval };

  // Collect every weekday mentioned: "every Monday and Wednesday".
  const days = new Set<number>();
  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${name}s?\\b`).test(t)) days.add(dow);
  }

  return {
    frequency: 'weekly',
    interval,
    daysOfWeek: days.size > 0 ? [...days].sort((a, b) => a - b) : [dayOfWeek(startDate)],
  };
};

// ---------------------------------------------------------------------------
// Times
// ---------------------------------------------------------------------------

export const findTime = (text: string): string | null => {
  const t = norm(text);

  const named: Record<string, string> = {
    'midday': '12:00', 'noon': '12:00', 'midnight': '00:00',
    'breakfast': '08:00', 'lunchtime': '12:30', 'teatime': '17:00',
    'dinnertime': '18:30', 'bedtime': '19:30',
  };
  for (const [word, time] of Object.entries(named)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) return time;
  }

  // "half past four", "quarter to six" — people say the hour as a word.
  const fuzzy = t.match(
    /\b(half past|quarter past|quarter to)\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/
  );
  if (fuzzy) {
    const base = WORD_NUMBERS[fuzzy[2]] ?? +fuzzy[2];
    if (Number.isFinite(base)) {
      if (fuzzy[1] === 'half past') return `${pad(base)}:30`;
      if (fuzzy[1] === 'quarter past') return `${pad(base)}:15`;
      return `${pad((base + 23) % 24)}:45`;
    }
  }

  const explicit = t.match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/);
  if (explicit) {
    let h = +explicit[1];
    const period = explicit[3];
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    return `${pad(h)}:${explicit[2]}`;
  }

  const bare = t.match(/\b(?:at\s+)?(\d{1,2})\s*(am|pm)\b/);
  if (bare) {
    let h = +bare[1];
    if (bare[2] === 'pm' && h < 12) h += 12;
    if (bare[2] === 'am' && h === 12) h = 0;
    return `${pad(h)}:00`;
  }

  // A bare "at 5" for a family calendar almost always means the afternoon.
  const loose = t.match(/\bat\s+(\d{1,2})\b/);
  if (loose) {
    const h = +loose[1];
    if (h >= 1 && h <= 7) return `${pad(h + 12)}:00`;
    if (h <= 23) return `${pad(h)}:00`;
  }

  return null;
};

// ---------------------------------------------------------------------------
// Deadlines — the signal that this is work, not an appointment
// ---------------------------------------------------------------------------

const DUE_PHRASE = /\b(due(?:\s+(?:in|back|by|on))?|by|hand(?:ed)?\s+in|return(?:ed)?\s+by|deadline|submit(?:ted)?\s+by)\b/;

export const findDueDate = (text: string, today: string): DateHit | null => {
  const t = norm(text);
  const m = t.match(DUE_PHRASE);
  if (!m || m.index === undefined) return null;
  // Only look at what comes after the deadline word, so "swimming on Tuesday,
  // due Sunday" doesn't read Tuesday as the deadline.
  const tail = t.slice(m.index + m[0].length);
  const hit = findDate(tail, today);
  return hit ? { date: hit.date, matched: `${m[0]} ${hit.matched}` } : null;
};

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export const findAssignees = (text: string, people: Person[]): string[] => {
  const t = norm(text);

  if (/\b(both|all)\s+(kids|children|of them)\b|\bthe kids\b|\beveryone\b|\bwhole family\b/.test(t)) {
    const kids = people.filter((p) => /child|kid|son|daughter/i.test(p.role));
    return (kids.length > 0 ? kids : people).map((p) => p.id);
  }

  const matched = people.filter((person) => {
    const full = norm(person.name);
    const first = full.split(' ')[0];
    if (full && new RegExp(`\\b${escapeRe(full)}\\b`).test(t)) return true;
    return first.length > 2 && new RegExp(`\\b${escapeRe(first)}\\b`).test(t);
  });

  return matched.map((p) => p.id);
};

const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Everything before the first word of `phrase`, so a deadline clause can be ignored. */
const stripFrom = (text: string, phrase: string): string => {
  const firstWord = phrase.split(' ')[0];
  const idx = norm(text).indexOf(firstWord);
  return idx > 0 ? text.slice(0, idx) : idx === 0 ? '' : text;
};

// ---------------------------------------------------------------------------
// Classification and titles
// ---------------------------------------------------------------------------

const QUERY_RE = /^(find|search|show|what|what's|whats|when|when's|whens|who|list|do i|have i|is there|are there|anything)\b/;

const TASK_WORDS = /\b(homework|assignment|revision|spellings?|project|essay|worksheet|reading|practice|coursework|form|permission slip|chore)\b/;

export const inferTaskType = (text: string): CalendarTask['taskType'] => {
  const t = norm(text);
  if (/\bspellings?\b|\bhomework\b|\bworksheet\b|\bessay\b|\bcoursework\b|\bassignment\b/.test(t)) return 'homework';
  if (/\breading\b|\bread\b/.test(t)) return 'reading';
  if (/\bpractice\b|\bpractise\b|\bpiano\b|\bviolin\b/.test(t)) return 'practice';
  if (/\bform\b|\bpermission\b|\bslip\b|\bconsent\b/.test(t)) return 'admin';
  if (/\bchore\b|\btidy\b|\bbins?\b|\bwashing\b/.test(t)) return 'chore';
  return 'other';
};

export const inferSubject = (text: string): string | undefined => {
  const subjects = ['maths', 'math', 'english', 'science', 'history', 'geography', 'french',
    'spanish', 'german', 'art', 'music', 'computing', 'biology', 'chemistry', 'physics', 'pe', 're'];
  const t = norm(text);
  const hit = subjects.find((s) => new RegExp(`\\b${s}\\b`).test(t));
  if (!hit) return undefined;
  return hit === 'math' ? 'Maths' : hit.length <= 2 ? hit.toUpperCase() : hit[0].toUpperCase() + hit.slice(1);
};

export const inferEventType = (text: string): CalendarEvent['type'] => {
  const t = norm(text);
  if (/\bgym\b|\bworkout\b|\bexercise\b|\bfitness\b|\brun\b|\brunning\b/.test(t)) return 'fitness';
  if (/\bswim|football|rugby|cricket|netball|tennis|sport|training|athletics|scouts?|cubs?|beavers?\b/.test(t)) return 'sport';
  if (/\bschool|term|inset|parents evening|assembly|exam|lesson|club|tutor|tuition|piano|violin|drama|choir\b/.test(t)) return 'education';
  if (/\bdoctor|dentist|gp\b|optician|hospital|appointment|jab|vaccination\b/.test(t)) return 'appointment';
  if (/\bdinner|lunch|breakfast|meal|party|birthday\b/.test(t)) return 'family';
  if (/\bmeeting|standup|review|call\b/.test(t)) return 'meeting';
  return 'family';
};

const STRIP = [
  /\b(add|create|book|schedule|put|make|set up|remind me to|remember to|need to|i need|we need)\b/gi,
  /\b(has|have|is|are|will be|goes to|going to|takes|does)\b/gi,
  /\b(every|each|weekly|fortnightly|monthly|yearly|annually|daily|every other)\b/gi,
  /\b(today|tomorrow|tmrw|day after tomorrow)\b/gi,
  /\b(next |this |on )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/gi,
  /\b(mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)s?\b/gi,
  /\b(due(\s+(in|back|by|on))?|by|hand(ed)?\s+in|return(ed)?\s+by|deadline|submit(ted)?\s+by)\b/gi,
  /\b(at\s+)?\d{1,2}([:.]\d{2})?\s*(am|pm)?\b/gi,
  /\b(half past|quarter past|quarter to)\s+\d{1,2}\b/gi,
  /\b(midday|noon|midnight|breakfast|lunchtime|teatime|dinnertime|bedtime)\b/gi,
  /\b\d{1,2}\/\d{1,2}\/20\d{2}\b/g,
  /\b20\d{2}-\d{1,2}-\d{1,2}\b/g,
  /\b\d{1,2}(st|nd|rd|th)\b/gi,
  /\b(of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi,
  /\b(for|with|and)\s*$/gi,
];

export const extractTitle = (text: string, people: Person[]): string => {
  let out = text;
  for (const person of people) {
    const first = norm(person.name).split(' ')[0];
    if (first.length > 2) out = out.replace(new RegExp(`\\b${escapeRe(first)}\\b`, 'gi'), ' ');
    out = out.replace(new RegExp(`\\b${escapeRe(norm(person.name))}\\b`, 'gi'), ' ');
  }
  out = out.replace(/\b(both|all)\s+(kids|children|of them)\b|\bthe kids\b|\beveryone\b/gi, ' ');
  for (const re of STRIP) out = out.replace(re, ' ');

  out = out.replace(/[,;]+/g, ' ').replace(/\s+/g, ' ').replace(/^[\s'"-]+|[\s'"-]+$/g, '').trim();
  out = out.replace(/^(an?|the|for|to)\s+/i, '').trim();

  if (!out) return 'Family event';
  return out[0].toUpperCase() + out.slice(1);
};

// ---------------------------------------------------------------------------
// The parser
// ---------------------------------------------------------------------------

export const parseFamilyInput = ({
  text,
  people,
  today = toDateKey(new Date()),
}: {
  text: string;
  people: Person[];
  today?: string;
}): ParsedResult => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { kind: 'unknown', confidence: 0, needs: [], summary: 'Tell me what to add.' };
  }

  if (QUERY_RE.test(norm(trimmed))) {
    return { kind: 'query', confidence: 0.9, needs: [], summary: 'Searching the calendar.', query: trimmed };
  }

  const assignees = findAssignees(trimmed, people);
  const dueHit = findDueDate(trimmed, today);
  // Look for the start date in the text BEFORE the deadline clause, so
  // "homework due Sunday" doesn't read Sunday as the day it was set.
  const beforeDue = dueHit ? stripFrom(trimmed, dueHit.matched) : trimmed;
  const dateHit = findDate(beforeDue, today);
  const time = findTime(trimmed);
  const title = extractTitle(trimmed, people);
  const needs: ParsedResult['needs'] = [];
  if (assignees.length === 0) needs.push('assignee');

  // A deadline, or homework language, means work with a window.
  const looksLikeTask = Boolean(dueHit) || TASK_WORDS.test(norm(trimmed));

  if (looksLikeTask) {
    const assignedDate = dateHit?.date ?? today;
    const dueDate = dueHit?.date ?? addDays(assignedDate, 7);
    if (!dueHit) needs.push('date');

    const recurrence = findRecurrence(trimmed, assignedDate);
    let confidence = 0.5;
    if (dueHit) confidence += 0.25;
    if (dateHit) confidence += 0.1;
    if (assignees.length > 0) confidence += 0.15;

    return {
      kind: 'task',
      confidence: Math.min(confidence, 1),
      needs,
      summary:
        `${title} for ${describeAssignees(assignees, people)}, ` +
        `set ${assignedDate}, due ${dueDate}.`,
      taskDraft: {
        title,
        assignees,
        assignedDate,
        dueDate: dueDate < assignedDate ? assignedDate : dueDate,
        taskType: inferTaskType(trimmed),
        subject: inferSubject(trimmed),
        priority: /\burgent|asap|important\b/i.test(trimmed) ? 'high' : 'medium',
        notes: `Created from: "${trimmed}"`,
        ...(recurrence ? { recurringPattern: recurrence } : {}),
      },
    };
  }

  // Otherwise it's something that happens at a time.
  const date = dateHit?.date ?? today;
  if (!dateHit) needs.push('date');
  if (!time) needs.push('time');

  const recurrence = findRecurrence(trimmed, date);
  const eventType = inferEventType(trimmed);

  let confidence = 0.4;
  if (dateHit) confidence += 0.25;
  if (time) confidence += 0.2;
  if (assignees.length > 0) confidence += 0.15;

  return {
    kind: 'event',
    confidence: Math.min(confidence, 1),
    needs,
    summary:
      `${title} for ${describeAssignees(assignees, people)} on ${date}` +
      `${time ? ` at ${time}` : ''}${recurrence ? ', repeating' : ''}.`,
    eventDraft: {
      title,
      person: assignees[0] ?? '',
      attendees: assignees.slice(1),
      date,
      time: time ?? '09:00',
      duration: inferDuration(trimmed),
      recurring: recurrence ? (recurrence.frequency === 'daily' ? 'weekly' : recurrence.frequency) : 'none',
      isRecurring: Boolean(recurrence),
      ...(recurrence ? { recurringPattern: recurrence } : {}),
      cost: 0,
      type: eventType,
      notes: `Created from: "${trimmed}"`,
      priority: eventType === 'education' ? 'high' : 'medium',
      status: needs.length > 0 ? 'tentative' : 'confirmed',
      reminders: [
        { id: 'reminder-1-day', type: 'notification', time: 1440, enabled: true },
        { id: 'reminder-1-hour', type: 'notification', time: 60, enabled: true },
      ],
    },
  };
};

const inferDuration = (text: string): number => {
  const t = norm(text);
  const explicit = t.match(/\bfor\s+(\d+)\s*(min|mins|minutes|hour|hours|hr|hrs)\b/);
  if (explicit) {
    const n = +explicit[1];
    return /hour|hr/.test(explicit[2]) ? n * 60 : n;
  }
  if (/\bpick ?up\b|\bdrop ?off\b|\bcollect\b/.test(t)) return 15;
  if (/\bfootball|rugby|netball|cricket|training|scouts?|cubs?\b/.test(t)) return 90;
  if (/\bparty\b/.test(t)) return 120;
  return 60;
};

const describeAssignees = (ids: string[], people: Person[]): string => {
  if (ids.length === 0) return 'nobody yet';
  const names = ids.map((id) => people.find((p) => p.id === id)?.name ?? 'someone');
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};
