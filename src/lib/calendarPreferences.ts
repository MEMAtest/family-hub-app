export type PresencePlace = { place: 'office' | 'home' | 'other'; customPlace: string };
export type CalendarPreferences = {
  memberId?: string;
  hiddenUpcoming: string[];
  acceptedOverlaps: string[];
  lastPlace: PresencePlace | null;
};

export const emptyCalendarPreferences = (): CalendarPreferences => ({ hiddenUpcoming: [], acceptedOverlaps: [], lastPlace: null });

export type CalendarPreferenceAction =
  | { action: 'hide'; occurrenceId: string }
  | { action: 'restore'; occurrenceId: string }
  | { action: 'accept-overlap'; insightId: string }
  | { action: 'place'; place: PresencePlace };

export function applyCalendarPreference(current: CalendarPreferences, action: CalendarPreferenceAction): CalendarPreferences {
  if (action.action === 'hide') return { ...current, hiddenUpcoming: [...new Set([...current.hiddenUpcoming, action.occurrenceId])].slice(-1000) };
  if (action.action === 'restore') return { ...current, hiddenUpcoming: current.hiddenUpcoming.filter(id => id !== action.occurrenceId) };
  if (action.action === 'accept-overlap') return { ...current, acceptedOverlaps: [...new Set([...current.acceptedOverlaps, action.insightId])].slice(-500) };
  return { ...current, lastPlace: action.place };
}
