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

  it('keeps the show time when email date and time are separated by venue text', () => {
    const normalized = normalizeCalendarEmailText({
      from: 'tickets@example.com',
      subject: 'Show tickets: Hamilton',
      text: `
Hamilton
Victoria Palace Theatre
Saturday 18 July 2026
Doors open
7:30pm to 10:00pm
Seats A1 A2
      `,
    });

    const drafts = parseCalendarImportText({
      text: normalized,
      people,
      today: new Date('2026-07-09T09:00:00Z'),
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      title: 'Show Tickets: Hamilton',
      date: '2026-07-18',
      time: '19:30',
      duration: 150,
      type: 'social',
      importStatus: 'ready',
    });
  });

  it('uses title and venue lines before a raw pasted ticket date', () => {
    const drafts = parseCalendarImportText({
      text: `
Cinema booking: Superman
Vue Bromley
Saturday 18 July 2026
7:30pm - 9:15pm
Seats: E4, E5
      `,
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      title: 'Cinema Booking: Superman',
      date: '2026-07-18',
      time: '19:30',
      duration: 105,
      location: 'Vue Bromley',
      type: 'social',
      importStatus: 'ready',
    });
  });

  it('extracts time and location from copied date time location blocks', () => {
    const drafts = parseCalendarImportText({
      text: `
Milestones.

Date:Wednesday, the 12th of AugustTime:
12:00 PM - 2:00 PMLocation:The Ivy City
Garden, 1A Bedford St, London WC2E 9HH
      `,
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      title: 'The Ivy City Garden, 1A Bedford St, London WC2E 9HH',
      date: '2026-08-12',
      time: '12:00',
      duration: 120,
      location: 'The Ivy City Garden, 1A Bedford St, London WC2E 9HH',
      importStatus: 'ready',
    });
  });

  it('understands birthday party text with a natural venue and time', () => {
    const drafts = parseCalendarImportText({
      text: "Maya's 6th bday party at Kidspace Saturday 18 July 2026 9am",
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      title: "Maya's 6th Birthday Party",
      date: '2026-07-18',
      time: '09:00',
      location: 'Kidspace',
      type: 'social',
      importStatus: 'ready',
    });
  });

  it('understands day out text with a natural venue and time', () => {
    const drafts = parseCalendarImportText({
      text: 'Angela day out at Greenwich Park Friday 24 July 2026 09:00',
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      title: 'Angela Day Out',
      date: '2026-07-24',
      time: '09:00',
      location: 'Greenwich Park',
      type: 'family',
      importStatus: 'ready',
    });
  });

  it('does not let one dated event inherit the next event location', () => {
    const drafts = parseCalendarImportText({
      text: `
Sports day Friday 24 July 2026 09:00
Dentist appointment Monday 27 July 2026 16:30 at Smile Clinic
      `,
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      title: 'Sports Day',
      date: '2026-07-24',
      time: '09:00',
      location: undefined,
      type: 'sport',
    });
    expect(drafts[1]).toMatchObject({
      title: 'Dentist Appointment',
      date: '2026-07-27',
      time: '16:30',
      location: 'Smile Clinic',
      type: 'appointment',
    });
  });

  it('keeps title labels in date time location blocks', () => {
    const drafts = parseCalendarImportText({
      text: `
Title: Alice dentist appointment
Date: Thursday 23 July 2026
Time: 15:30 - 16:00
Location: Smile Clinic
      `,
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      title: 'Alice Dentist Appointment',
      date: '2026-07-23',
      time: '15:30',
      duration: 30,
      location: 'Smile Clinic',
      type: 'appointment',
    });
  });

  it('understands compact school ranges and hour-only time ranges', () => {
    const termDrafts = parseCalendarImportText({
      text: 'Half term 26-30 October 2026',
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });
    const cinemaDrafts = parseCalendarImportText({
      text: 'Cinema Friday 31 July 2026 7pm - 9pm at Odeon',
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });
    const campDrafts = parseCalendarImportText({
      text: 'Football camp Friday 31 July 2026 9-11am at Sports Centre',
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });

    expect(termDrafts[0]).toMatchObject({
      title: 'Half Term',
      date: '2026-10-26',
      endDate: '2026-10-30',
      type: 'education',
    });
    expect(cinemaDrafts[0]).toMatchObject({
      time: '19:00',
      duration: 120,
      location: 'Odeon',
      type: 'social',
    });
    expect(campDrafts[0]).toMatchObject({
      time: '09:00',
      duration: 120,
      location: 'Sports Centre',
      type: 'sport',
    });
  });

  it('flags ambiguous or generic date text for review', () => {
    const ambiguous = parseCalendarImportText({
      text: 'School trip 03/04/2026 10am at Science Museum',
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });
    const generic = parseCalendarImportText({
      text: 'Your voucher expires on 18 July 2026. Use code SUMMER20.',
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });
    const birthday = parseCalendarImportText({
      text: "Oscar b-day celebration 5 August 2026 12pm at Grandma's",
      people,
      today: new Date('2026-07-16T09:00:00Z'),
    });

    expect(ambiguous[0]).toMatchObject({
      date: '2026-04-03',
      importStatus: 'needs_review',
    });
    expect(ambiguous[0].warnings).toContain('Ambiguous numeric date. Review day/month before importing.');
    expect(generic[0]).toMatchObject({
      title: 'Your Voucher Expires',
      importStatus: 'needs_review',
    });
    expect(birthday[0]).toMatchObject({
      title: "Oscar's Birthday Party",
      type: 'social',
      importStatus: 'ready',
    });
  });
});
