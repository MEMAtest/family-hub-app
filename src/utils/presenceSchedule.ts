export type PresenceDurationPreset = 'all-day' | 'morning' | 'afternoon' | 'until-5' | 'custom';

export type PresenceTimeRange = {
  start: string;
  end: string;
};
const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const durationMinutesBetween = (start: string, end: string) =>
  Math.max(15, toMinutes(end) - toMinutes(start));

const roundedCurrentTime = (now: Date) => {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;
  const bounded = Math.min(rounded, 16 * 60 + 45);
  return `${String(Math.floor(bounded / 60)).padStart(2, '0')}:${String(bounded % 60).padStart(2, '0')}`;
};

export const presenceTimeRange = (
  preset: Exclude<PresenceDurationPreset, 'custom'>,
  now = new Date()
): PresenceTimeRange => {
  if (preset === 'morning') return { start: '09:00', end: '13:00' };
  if (preset === 'afternoon') return { start: '13:00', end: '17:00' };
  if (preset === 'until-5') return { start: roundedCurrentTime(now), end: '17:00' };
  return { start: '09:00', end: '17:00' };
};
