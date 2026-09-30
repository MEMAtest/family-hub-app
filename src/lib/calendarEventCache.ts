import type { CalendarEvent } from '@/types/calendar.types';

const LOCAL_EVENT_ID_PREFIXES = ['event-', 'school-'];

/** Keep unsynced local drafts, but never resurrect a record deleted from the database. */
export const mergeDatabaseAndCachedEvents = (
  databaseEvents: CalendarEvent[],
  cachedEvents: CalendarEvent[],
) => {
  const databaseIds = new Set(databaseEvents.map((event) => event.id));
  const localDrafts = cachedEvents.filter((event) =>
    !databaseIds.has(event.id) && LOCAL_EVENT_ID_PREFIXES.some((prefix) => event.id.startsWith(prefix))
  );

  return [...databaseEvents, ...localDrafts];
};
