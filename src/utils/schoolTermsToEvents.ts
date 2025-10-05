import { CalendarEvent } from '@/types/calendar.types';
import { SchoolTerm } from '@/data/schoolTerms';

export function convertSchoolTermsToEvents(terms: SchoolTerm[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  terms.forEach(term => {
    if (term.type === 'inset') {
      // Single day INSET event
      events.push({
        id: `school-${term.id}`,
        title: `🏫 ${term.name}`,
        person: 'member-4', // Default to child member
        date: term.startDate ?? term.start,
        time: '08:00',
        duration: 480, // All day (8 hours)
        location: 'School',
        recurring: 'none',
        cost: 0,
        type: 'education',
        notes: `INSET Day - School closed for ${term.student ?? 'pupils'}`,
        isRecurring: false,
        priority: 'high',
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else if (term.type === 'half-term' || term.type === 'break') {
      // Multi-day break - create an event for the first day with duration info
      const startValue = term.startDate ?? term.start;
      const endValue = term.endDate ?? term.end ?? term.start;
      const startDate = new Date(startValue);
      const endDate = new Date(endValue);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      events.push({
        id: `school-${term.id}`,
        title: `🏖️ ${term.name} (${daysDiff} days)`,
        person: 'member-4', // Default to child member
        date: startValue,
        time: '00:00',
        duration: 1440, // Full day
        location: '',
        recurring: 'none',
        cost: 0,
        type: 'other',
        notes: `School holiday from ${startValue} to ${endValue} for ${term.student ?? 'pupils'}`,
        isRecurring: false,
        priority: 'high',
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Also add end date marker
      if (term.type === 'half-term') {
        events.push({
          id: `school-${term.id}-end`,
          title: `📚 ${term.name} Ends`,
          person: 'member-4', // Default to child member
          date: endValue,
          time: '18:00',
          duration: 60,
          location: '',
          recurring: 'none',
          cost: 0,
          type: 'education',
          notes: `Back to school tomorrow for ${term.student ?? 'pupils'}`,
          isRecurring: false,
          priority: 'medium',
          status: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } else if (term.type === 'term') {
      // Term start/end markers
      const isStart = term.name.toLowerCase().includes('start');

      events.push({
        id: `school-${term.id}`,
        title: isStart ? `🎒 ${term.name}` : `🎉 ${term.name}`,
        person: 'member-4', // Default to child member
        date: term.startDate ?? term.start,
        time: isStart ? '08:30' : '15:30',
        duration: 60,
        location: 'School',
        recurring: 'none',
        cost: 0,
        type: 'education',
        notes: isStart
          ? `First day of term for ${term.student ?? 'pupils'}`
          : `Last day of term for ${term.student ?? 'pupils'}`,
        isRecurring: false,
        priority: 'high',
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  });

  return events;
}
