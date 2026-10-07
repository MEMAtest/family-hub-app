import { eventPeopleLabel } from '@/utils/schoolEventPeople';
import { displayEventTitle, hasSchoolSource } from '@/utils/schoolEventPresentation';
import { schoolSavedEventAttendance, type SchoolMember } from '@/utils/schoolSources';

type SchoolNotification = {
  title: string; message: string; relatedEventId?: string | null;
  relatedPersonId?: string | null; metadata?: any;
};

export const presentSchoolNotification = <T extends SchoolNotification>(notification: T,
  event: { id: string; title: string; personId: string; sourceId?: string | null;
    source?: string | null; eventDate: Date; metadata?: any } | undefined,
  members: SchoolMember[]): T => {
  if (!event || notification.metadata?.source !== 'notification-sweep') return notification;
  const schoolEvent = { ...event, source: event.source ?? undefined, sourceId: event.sourceId ?? undefined,
    person: event.personId };
  if (!hasSchoolSource(schoolEvent)) return notification;
  const title = displayEventTitle(schoolEvent);
  const people = eventPeopleLabel(schoolEvent, members);
  const attendance = schoolSavedEventAttendance(schoolEvent, members);
  const date = event.eventDate.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London',
  });
  return { ...notification, title: `Upcoming: ${title}`, message: `${title} · ${date} · ${people}`,
    relatedPersonId: attendance.attendeePersonId,
    metadata: { ...notification.metadata, eventTitle: title,
      schoolAssignment: event.metadata?.schoolAssignment,
      schoolProvenance: event.metadata?.schoolProvenance } };
};
