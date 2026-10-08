import type { CalendarEvent } from '@/types/calendar.types';
import { schoolMetadata, schoolSavedEventAttendance, type SchoolMember } from './schoolSources';

export const eventPeopleLabel = (event: Pick<CalendarEvent, 'title' | 'person' | 'sourceId' | 'metadata'>, members: SchoolMember[]) => {
  if (schoolMetadata(event.metadata).binCollection) return 'Household';
  const attendance = schoolSavedEventAttendance(event, members);
  const assignment = schoolMetadata(schoolMetadata(event.metadata).schoolAssignment);
  const concerned = Array.isArray(assignment.concernedMemberIds)
    ? members.filter((member) => assignment.concernedMemberIds.includes(member.id)).map((member) => member.name) : [];
  if (attendance.attendeeStatus === 'needs_confirmation') {
    return `${concerned.length ? `Concerns ${concerned.join(', ')}; ` : ''}${event.sourceId ? 'Attendee to confirm' : 'Unassigned'}`;
  }
  return members.find((member) => member.id === attendance.attendeePersonId)?.name || 'Family';
};
