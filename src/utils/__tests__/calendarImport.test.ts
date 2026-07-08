import { normalizeCalendarEmailText, parseCalendarImportText } from '@/utils/calendarImport';
import type { Person } from '@/types/calendar.types';

const people: Person[] = [
  { id: 'child-1', name: 'Angela', color: '#147c72', icon: '👧', role: 'Child' },
];

describe('calendar import parser', () => {
  it('extracts school date ranges from pasted term text', () => {
    const drafts = parseCalendarImportText({
      text: 'Summer Holiday: Monday 20 July 2026 - Friday 28 August 2026',
      people,
      today: new Date('2026-07-06T09:00:00Z'),
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      title: 'Summer Holiday',
      date: '2026-07-20',
      endDate: '2026-08-28',
      type: 'education',
      importStatus: 'ready',
    });
  });

  it('marks exact title/date/time matches as duplicates', () => {
    const drafts = parseCalendarImportText({
      text: 'Sports Day, 2026-07-14, 09:00',
      people,
      existingEvents: [
        {
          id: 'event-1',
          title: 'Sports Day',
          person: 'child-1',
          date: '2026-07-14',
          time: '09:00',
          duration: 60,
          recurring: 'none',
          cost: 0,
          type: 'education',
          isRecurring: false,
          priority: 'high',
          status: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      today: new Date('2026-07-06T09:00:00Z'),
    });

    expect(drafts[0].importStatus).toBe('duplicate');
    expect(drafts[0].duplicateOf).toBe('event-1');
  });

  it('extracts only the key dates from a Stewart Fleming transition letter', () => {
    const drafts = parseCalendarImportText({
      text: `
Key dates

    •   Meet the Teacher (pupil transition lesson): Monday 13 July 2026 (in school)
    •   Informal Parents’ Evening (no appointments needed): Tuesday 14 July 2026, 3:45pm–5:30pm — meet current and new teachers
    •   Last day of this term: Wednesday 22 July 2026 (usual finish times)
    •   First day of the 2026/27 school year: Tuesday 1 September 2026
    •   Curriculum meetings with new class teachers: first week of term (dates to follow)

Staff leaving and those on leave
    •     Monday 13 July: children will spend a planned session with their new class teacher in school.
      `,
      people,
      today: new Date('2026-07-07T09:00:00Z'),
    });

    expect(drafts).toHaveLength(4);
    expect(drafts.map((draft) => draft.title)).toEqual([
      'Meet The Teacher (Pupil Transition Lesson)',
      'Informal Parents’ Evening (No Appointments Needed)',
      'Last Day Of This Term',
      'First Day Of The 2026/27 School Year',
    ]);
    expect(drafts.map((draft) => draft.date)).toEqual([
      '2026-07-13',
      '2026-07-14',
      '2026-07-22',
      '2026-09-01',
    ]);
    expect(drafts[1].time).toBe('15:45');
    expect(drafts[1].duration).toBe(105);
  });

  it('extracts show and cinema dates from forwarded ticket emails', () => {
    const normalized = normalizeCalendarEmailText({
      from: 'tickets@example.com',
      subject: 'Cinema booking confirmation: The Wild Robot',
      text: `
Booking confirmation
The Wild Robot
Vue Bromley
Saturday 18 July 2026
7:30pm - 9:15pm
Seats: E4, E5
Manage your booking
      `,
    });

    const drafts = parseCalendarImportText({
      text: normalized,
      people,
      today: new Date('2026-07-08T09:00:00Z'),
    });

    expect(drafts[0]).toMatchObject({
      title: 'Cinema Booking Confirmation: The Wild Robot',
      date: '2026-07-18',
      time: '19:30',
      duration: 105,
      type: 'social',
      importStatus: 'ready',
    });
  });
});
