'use client';

import { useEffect } from 'react';
import { schoolTerms2025_2026 } from '@/data/schoolTerms';
import { convertSchoolTermsToEvents } from '@/utils/schoolTermsToEvents';

export default function DataInitializer() {
  useEffect(() => {
    // Check if this is first load or if we need to add school terms
    const existingEvents = localStorage.getItem('calendarEvents');

    if (!existingEvents) {
      // First time - initialize with school terms
      const schoolEvents = convertSchoolTermsToEvents(schoolTerms2025_2026);
      localStorage.setItem('calendarEvents', JSON.stringify(schoolEvents));
      console.log('Initialized with school term events:', schoolEvents.length);
      console.log('October events:', schoolEvents.filter(e => e.date.startsWith('2025-10')));
    } else {
      // Check if school events are already there
      const events = JSON.parse(existingEvents);
      const hasSchoolEvents = events.some((e: any) => e.id && e.id.startsWith('school-'));

      if (!hasSchoolEvents) {
        // Add school events to existing events
        const schoolEvents = convertSchoolTermsToEvents(schoolTerms2025_2026);
        const updatedEvents = [...events, ...schoolEvents];
        localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
        console.log('Added school term events to existing data');
        console.log('October events:', schoolEvents.filter(e => e.date.startsWith('2025-10')));
      } else {
        console.log('School events already present');
        const octoberEvents = events.filter((e: any) => e.date && e.date.startsWith('2025-10'));
        console.log('Existing October events:', octoberEvents);
      }
    }

  }, []);

  return null;
}
