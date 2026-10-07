export type PreparationStatus = 'unknown' | 'outstanding' | 'done' | 'not_needed';
export type TravelChecklistItem = { id: string; title: string; status: PreparationStatus };
export type TravelReminderContext = {
  destination?: string;
  departureDate?: string;
  departureTime?: string;
  departureTimeZone?: string;
  returnDate?: string;
  returnTime?: string;
  transportation?: 'flight' | 'train' | 'car' | 'other';
  coordinatorPersonIds?: string[];
  preparation?: TravelChecklistItem[];
  coverage?: TravelChecklistItem[];
};
export type FamilyReminderMetadata = {
  version?: 1;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  workStatus?: { type?: string; affectsPickup?: boolean; travelDetails?: {
    destination?: string; departureTime?: string; returnTime?: string; transportation?: string;
  } };
  reminders?: Array<{ id: string; type: string; time: number; enabled: boolean }>;
  reminderPreferences?: { enabled?: boolean; push?: boolean };
  travel?: TravelReminderContext;
};
export type FamilyReminderAction = 'done' | 'not_needed' | 'snooze' | 'details' | 'cover';
export const FAMILY_REMINDER_SOURCE = 'family-reminder-planner';
export const isFamilyReminder = (notification: { metadata?: unknown }) =>
  Boolean(notification.metadata && typeof notification.metadata === 'object' &&
    (notification.metadata as Record<string, unknown>).source === FAMILY_REMINDER_SOURCE);
