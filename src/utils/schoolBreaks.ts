import type { SchoolTerm } from '@/data/schoolTerms';

export interface SchoolBreakSummary {
  isCurrentlyOnBreak: boolean;
  breakName: string;
  breakStartDate: string;
  breakEndDate: string;
  breakUpDate: string;
  breakUpName: string;
  returnDate: string;
  daysUntilBreak: number;
  daysRemaining: number;
  breakDuration: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const dateKey = (value: Date | string) => {
  if (typeof value === 'string') return value.split('T')[0];
  return value.toISOString().split('T')[0];
};

const parseDateParts = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
};

const toUtcDate = (value: string) => {
  const { year, month, day } = parseDateParts(value);
  return new Date(Date.UTC(year, month - 1, day));
};

const addDays = (value: string, days: number) => {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
};

const dayOfWeek = (value: string) => toUtcDate(value).getUTCDay();

const daysBetween = (from: string, to: string) =>
  Math.ceil((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / MS_PER_DAY);

const inclusiveDaysBetween = (from: string, to: string) => daysBetween(from, to) + 1;

const isWeekend = (value: string) => {
  const day = dayOfWeek(value);
  return day === 0 || day === 6;
};

const previousSchoolDay = (value: string) => {
  let candidate = addDays(value, -1);
  while (isWeekend(candidate)) {
    candidate = addDays(candidate, -1);
  }
  return candidate;
};

const nextSchoolDay = (value: string) => {
  let candidate = addDays(value, 1);
  while (isWeekend(candidate)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
};

const getStart = (term: SchoolTerm) => term.startDate ?? term.start;
const getEnd = (term: SchoolTerm) => term.endDate ?? term.end ?? getStart(term);

const findReturnDate = (terms: SchoolTerm[], breakEnd: string) => {
  const nextTermStart = terms
    .filter((term) => term.type === 'term' && term.name.toLowerCase().includes('start'))
    .map(getStart)
    .filter((start) => start > breakEnd && daysBetween(breakEnd, start) <= 14)
    .sort()[0];

  return nextTermStart ?? nextSchoolDay(breakEnd);
};

export const getNextSchoolBreak = (
  terms: SchoolTerm[],
  today: Date | string = new Date()
): SchoolBreakSummary | null => {
  const todayStr = dateKey(today);
  const breaks = terms
    .filter((term) => term.type === 'break' || term.type === 'half-term')
    .sort((a, b) => getStart(a).localeCompare(getStart(b)));

  const currentBreak = breaks.find((term) => todayStr >= getStart(term) && todayStr <= getEnd(term));
  if (currentBreak) {
    const start = getStart(currentBreak);
    const end = getEnd(currentBreak);
    const returnDate = findReturnDate(terms, end);

    return {
      isCurrentlyOnBreak: true,
      breakName: currentBreak.name,
      breakStartDate: start,
      breakEndDate: end,
      breakUpDate: previousSchoolDay(start),
      breakUpName: currentBreak.name,
      returnDate,
      daysUntilBreak: 0,
      daysRemaining: Math.max(0, inclusiveDaysBetween(todayStr, end)),
      breakDuration: inclusiveDaysBetween(start, end),
    };
  }

  const upcomingBreak = breaks.find((term) => getStart(term) > todayStr);
  if (!upcomingBreak) return null;

  const start = getStart(upcomingBreak);
  const end = getEnd(upcomingBreak);
  const breakUpDate = previousSchoolDay(start);
  const returnDate = findReturnDate(terms, end);

  return {
    isCurrentlyOnBreak: false,
    breakName: upcomingBreak.name,
    breakStartDate: start,
    breakEndDate: end,
    breakUpDate,
    breakUpName: upcomingBreak.name.replace(/\s+Break$/i, ''),
    returnDate,
    daysUntilBreak: Math.max(0, daysBetween(todayStr, breakUpDate)),
    daysRemaining: 0,
    breakDuration: inclusiveDaysBetween(start, end),
  };
};
