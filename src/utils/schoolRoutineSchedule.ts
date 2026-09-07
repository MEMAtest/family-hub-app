const weekdayNames = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const extractRoutineWeekdays = (detail: string) => {
  const lower = detail.toLowerCase();
  return weekdayNames
    .map((name, day) => (new RegExp(`\\b${name}\\b`, 'i').test(lower) ? day : null))
    .filter((day): day is number => day !== null);
};

export const nextDateForWeekday = (from: Date, weekday: number) => {
  const next = new Date(from);
  next.setHours(12, 0, 0, 0);
  const offset = (weekday - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + offset);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const date = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};
