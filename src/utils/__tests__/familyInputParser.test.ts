import type { Person } from '@/types/calendar.types';
import { findDueDate, findRecurrence, findTime, parseFamilyInput } from '@/utils/familyInputParser';

const PEOPLE: Person[] = [
  { id: 'p1', name: 'Ade', color: '#111', icon: '👨', role: 'Parent' },
  { id: 'p2', name: 'Tolu', color: '#222', icon: '👩', role: 'Parent' },
  { id: 'k1', name: 'Kayode', color: '#333', icon: '🧒', role: 'Child' },
  { id: 'k2', name: 'Simi', color: '#444', icon: '🧒', role: 'Child' },
];

// Wednesday 2 September 2026
const TODAY = '2026-09-02';
const parse = (text: string) => parseFamilyInput({ text, people: PEOPLE, today: TODAY });

describe('the main complaint: normal sentences should work', () => {
  it('understands a sentence with no command verb at all', () => {
    // The old parser required "add"/"create"/"book" at the start and returned
    // "unknown" for this.
    const r = parse('Kayode has swimming on Tuesdays at 5');
    expect(r.kind).toBe('event');
    expect(r.eventDraft?.title).toBe('Swimming');
    expect(r.eventDraft?.person).toBe('k1');
    expect(r.eventDraft?.time).toBe('17:00');
    expect(r.eventDraft?.recurringPattern).toEqual({
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [2],
    });
  });

  it('still understands the old command style', () => {
    const r = parse('Add swimming for Simi next Tuesday at 5pm');
    expect(r.kind).toBe('event');
    expect(r.eventDraft?.person).toBe('k2');
    expect(r.eventDraft?.date).toBe('2026-09-08');
  });

  it('treats a question as a search, not an attempt to create something', () => {
    expect(parse("what's on next week").kind).toBe('query');
    expect(parse('when is swimming').kind).toBe('query');
  });
});

describe('never silently guesses the child', () => {
  it('flags a missing assignee instead of defaulting to the first person', () => {
    const r = parse('football on Saturday at 10am');
    expect(r.needs).toContain('assignee');
    expect(r.eventDraft?.person).toBe('');
    expect(r.summary).toContain('nobody yet');
  });

  it('assigns the named child and nobody else', () => {
    const r = parse('Simi has a dentist appointment tomorrow at 3pm');
    expect(r.eventDraft?.person).toBe('k2');
    expect(r.needs).not.toContain('assignee');
  });

  it('handles both kids', () => {
    const r = parse('both kids have a party on Saturday at 2pm');
    expect(r.eventDraft?.person).toBe('k1');
    expect(r.eventDraft?.attendees).toEqual(['k2']);
  });
});

describe('a deadline makes it work, not an appointment', () => {
  it('turns "set Wednesday, due Sunday" into a task with a window', () => {
    const r = parse('Kayode has maths homework due Sunday');
    expect(r.kind).toBe('task');
    expect(r.taskDraft?.assignedDate).toBe(TODAY);
    expect(r.taskDraft?.dueDate).toBe('2026-09-06');
    expect(r.taskDraft?.taskType).toBe('homework');
    expect(r.taskDraft?.subject).toBe('Maths');
    expect(r.taskDraft?.assignees).toEqual(['k1']);
  });

  it('does not mistake the start day for the deadline', () => {
    const r = parse('spellings set Wednesday due Friday for Simi');
    expect(r.kind).toBe('task');
    expect(r.taskDraft?.dueDate).toBe('2026-09-04'); // Friday, not Wednesday
  });

  it('recognises other ways of saying a deadline', () => {
    expect(findDueDate('hand in Monday', TODAY)?.date).toBe('2026-09-07');
    expect(findDueDate('return by Friday', TODAY)?.date).toBe('2026-09-04');
    expect(findDueDate('deadline Sunday', TODAY)?.date).toBe('2026-09-06');
  });

  it('treats homework with no stated deadline as a task, and asks for the date', () => {
    const r = parse('Kayode has a history project');
    expect(r.kind).toBe('task');
    expect(r.needs).toContain('date');
  });

  it('handles repeating homework', () => {
    const r = parse('Simi has spellings every Friday due the following Friday');
    expect(r.kind).toBe('task');
    expect(r.taskDraft?.recurringPattern?.frequency).toBe('weekly');
  });
});

describe('times the way people say them', () => {
  it.each([
    ['at 5pm', '17:00'],
    ['at 5', '17:00'],
    ['at 9am', '09:00'],
    ['17:30', '17:30'],
    ['at 8.45am', '08:45'],
    ['half past four', '04:30'],
    ['quarter to six', '05:45'],
    ['at midday', '12:00'],
    ['at teatime', '17:00'],
  ])('reads "%s" as %s', (input, expected) => {
    expect(findTime(input)).toBe(expected);
  });

  it('assumes afternoon for a bare small number, as families mean', () => {
    expect(findTime('at 4')).toBe('16:00');
    expect(findTime('at 11')).toBe('11:00');
  });
});

describe('recurrence phrasing', () => {
  it.each([
    ['every Tuesday', 'weekly', 1],
    ['on Mondays', 'weekly', 1],
    ['fortnightly', 'weekly', 2],
    ['every month', 'monthly', 1],
    ['daily', 'daily', 1],
  ])('reads "%s" as %s every %i', (input, freq, interval) => {
    const r = findRecurrence(input, TODAY);
    expect(r?.frequency).toBe(freq);
    expect(r?.interval).toBe(interval);
  });

  it('picks up several weekdays at once', () => {
    expect(findRecurrence('every Monday and Wednesday', TODAY)?.daysOfWeek).toEqual([1, 3]);
  });

  it('returns nothing for a one-off', () => {
    expect(findRecurrence('dentist on Tuesday', TODAY)).toBeNull();
  });
});

describe('titles come out clean', () => {
  it.each([
    ['Kayode has swimming on Tuesdays at 5', 'Swimming'],
    ['Add football training for Simi every Saturday at 10am', 'Football training'],
    ['book dentist for Kayode tomorrow at 3pm', 'Dentist'],
    ['piano lesson every Thursday at 4', 'Piano lesson'],
  ])('%s -> %s', (input, expected) => {
    const r = parse(input);
    expect(r.eventDraft?.title ?? r.taskDraft?.title).toBe(expected);
  });
});

describe('confidence reflects how much was actually understood', () => {
  it('is high when person, date and time are all present', () => {
    expect(parse('Kayode has swimming on Tuesday at 5pm').confidence).toBeGreaterThan(0.9);
  });

  it('is low when almost nothing is specified', () => {
    expect(parse('swimming').confidence).toBeLessThan(0.5);
  });
});

describe('sensible inference', () => {
  it('guesses duration from the activity', () => {
    expect(parse('Kayode has football on Saturday at 10am').eventDraft?.duration).toBe(90);
    expect(parse('school pickup for Simi tomorrow at 3pm').eventDraft?.duration).toBe(15);
  });

  it('respects an explicit duration', () => {
    expect(parse('Ade gym tomorrow at 7am for 45 minutes').eventDraft?.duration).toBe(45);
  });

  it('categorises the event', () => {
    expect(parse('Kayode has scouts on Wednesday at 6pm').eventDraft?.type).toBe('sport');
    expect(parse('Simi has a dentist appointment Friday at 2pm').eventDraft?.type).toBe('appointment');
    expect(parse('Kayode has piano lesson Thursday at 4pm').eventDraft?.type).toBe('education');
  });
});
