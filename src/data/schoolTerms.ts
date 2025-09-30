export interface SchoolTerm {
  id: string;
  name: string;
  type: 'term' | 'break' | 'inset' | 'half-term';
  startDate: string;
  endDate: string;
  year: string;
  student: string;
}

export const schoolTerms2025_2026: SchoolTerm[] = [
  // Autumn Term 2025
  {
    id: 'inset-aug-28-2025',
    name: 'INSET Day',
    type: 'inset',
    startDate: '2025-08-28',
    endDate: '2025-08-28',
    year: '2025',
    student: 'Amari'
  },
  {
    id: 'inset-aug-29-2025',
    name: 'INSET Day',
    type: 'inset',
    startDate: '2025-08-29',
    endDate: '2025-08-29',
    year: '2025',
    student: 'Amari'
  },
  {
    id: 'autumn-term-2025',
    name: 'Autumn Term',
    type: 'term',
    startDate: '2025-09-01',
    endDate: '2025-12-19',
    year: '2025',
    student: 'Amari'
  },
  {
    id: 'autumn-half-term-2025',
    name: 'Autumn Half Term',
    type: 'half-term',
    startDate: '2025-10-20',
    endDate: '2025-10-31',
    year: '2025',
    student: 'Amari'
  },
  {
    id: 'inset-nov-3-2025',
    name: 'INSET Day (TPA)',
    type: 'inset',
    startDate: '2025-11-03',
    endDate: '2025-11-03',
    year: '2025',
    student: 'Amari'
  },
  {
    id: 'christmas-break-2025',
    name: 'Christmas Break',
    type: 'break',
    startDate: '2025-12-20',
    endDate: '2026-01-04',
    year: '2025-2026',
    student: 'Amari'
  },

  // Spring Term 2026
  {
    id: 'inset-jan-5-2026',
    name: 'INSET Day',
    type: 'inset',
    startDate: '2026-01-05',
    endDate: '2026-01-05',
    year: '2026',
    student: 'Amari'
  },
  {
    id: 'spring-term-2026',
    name: 'Spring Term',
    type: 'term',
    startDate: '2026-01-06',
    endDate: '2026-03-27',
    year: '2026',
    student: 'Amari'
  },
  {
    id: 'spring-half-term-2026',
    name: 'Spring Half Term',
    type: 'half-term',
    startDate: '2026-02-16',
    endDate: '2026-02-20',
    year: '2026',
    student: 'Amari'
  },
  {
    id: 'easter-break-2026',
    name: 'Easter Break',
    type: 'break',
    startDate: '2026-03-28',
    endDate: '2026-04-12',
    year: '2026',
    student: 'Amari'
  },

  // Summer Term 2026
  {
    id: 'summer-term-2026',
    name: 'Summer Term',
    type: 'term',
    startDate: '2026-04-13',
    endDate: '2026-07-22',
    year: '2026',
    student: 'Amari'
  },
  {
    id: 'summer-half-term-2026',
    name: 'Summer Half Term',
    type: 'half-term',
    startDate: '2026-05-25',
    endDate: '2026-05-29',
    year: '2026',
    student: 'Amari'
  },
  {
    id: 'inset-jun-1-2026',
    name: 'INSET Day',
    type: 'inset',
    startDate: '2026-06-01',
    endDate: '2026-06-01',
    year: '2026',
    student: 'Amari'
  },
  {
    id: 'summer-break-2026',
    name: 'Summer Break',
    type: 'break',
    startDate: '2026-07-23',
    endDate: '2026-08-26',
    year: '2026',
    student: 'Amari'
  },

  // Autumn Term 2026 (start)
  {
    id: 'inset-aug-27-2026',
    name: 'INSET Day',
    type: 'inset',
    startDate: '2026-08-27',
    endDate: '2026-08-27',
    year: '2026',
    student: 'Amari'
  },
  {
    id: 'inset-aug-28-2026',
    name: 'INSET Day',
    type: 'inset',
    startDate: '2026-08-28',
    endDate: '2026-08-28',
    year: '2026',
    student: 'Amari'
  },
  {
    id: 'autumn-term-start-2026',
    name: 'Autumn Term Starts',
    type: 'term',
    startDate: '2026-09-02',
    endDate: '2026-09-02',
    year: '2026',
    student: 'Amari'
  }
];

// Helper function to check if a date is during school time
export function isSchoolDay(date: Date, student: string = 'Amari'): boolean {
  const dateStr = date.toISOString().split('T')[0];

  // Check if it's a weekend
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  // Check against term dates
  for (const term of schoolTerms2025_2026) {
    if (term.student !== student) continue;

    if (term.type === 'term') {
      if (dateStr >= term.startDate && dateStr <= term.endDate) {
        // It's during a term, now check if it's not during a break
        for (const breakPeriod of schoolTerms2025_2026) {
          if (breakPeriod.student !== student) continue;
          if (breakPeriod.type === 'half-term' || breakPeriod.type === 'inset') {
            if (dateStr >= breakPeriod.startDate && dateStr <= breakPeriod.endDate) {
              return false; // It's during a break
            }
          }
        }
        return true; // It's a school day
      }
    }
  }

  return false;
}

// Get current term information
export function getCurrentTerm(date: Date = new Date(), student: string = 'Amari'): SchoolTerm | null {
  const dateStr = date.toISOString().split('T')[0];

  for (const term of schoolTerms2025_2026) {
    if (term.student !== student) continue;
    if (term.type === 'term' && dateStr >= term.startDate && dateStr <= term.endDate) {
      return term;
    }
  }

  return null;
}

// Get next important school date
export function getNextSchoolEvent(student: string = 'Amari'): SchoolTerm | null {
  const today = new Date().toISOString().split('T')[0];

  const upcomingEvents = schoolTerms2025_2026
    .filter(term => term.student === student && term.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return upcomingEvents.length > 0 ? upcomingEvents[0] : null;
}