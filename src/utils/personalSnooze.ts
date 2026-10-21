export type PersonalSnoozePreset = '10min' | '1h' | 'tomorrow';
export const PERSONAL_SNOOZE_PRESETS = [
  { value: '10min', label: '10 minutes' },
  { value: '1h', label: '1 hour' },
  { value: 'tomorrow', label: 'Tomorrow, 9am' },
] as const;

export const personalSnoozeUntil = (preset: PersonalSnoozePreset, now = new Date()): Date => {
  if (preset !== 'tomorrow') return new Date(now.getTime() + (preset === '1h' ? 60 : 10) * 60_000);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const tomorrow = new Date(`${parts.year}-${parts.month}-${parts.day}T09:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23',
  }).format(tomorrow));
  tomorrow.setUTCHours(tomorrow.getUTCHours() + 9 - hour);
  return tomorrow;
};

export type PersonalTaskReminderState = { taskId: string; resolution?: 'not_needed' | null; snoozedUntil?: string | null };
export const parseTaskReminderStates = (value: unknown): PersonalTaskReminderState[] => {
  if (!Array.isArray(value) || !value.every(state => state && typeof state === 'object' &&
      typeof state.taskId === 'string' && state.taskId.length > 0 &&
      (state.resolution === undefined || state.resolution === null || state.resolution === 'not_needed') &&
      (state.snoozedUntil === undefined || state.snoozedUntil === null ||
        (typeof state.snoozedUntil === 'string' && Number.isFinite(Date.parse(state.snoozedUntil)))))) {
    throw new Error('Personal task reminder state is invalid. Retry before taking action.');
  }
  return value;
};
export const taskReminderVisible = (state: PersonalTaskReminderState | undefined, now: Date) =>
  state?.resolution !== 'not_needed' && !(state?.snoozedUntil && Date.parse(state.snoozedUntil) > now.getTime());
