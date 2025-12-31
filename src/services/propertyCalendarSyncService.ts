/**
 * Property Calendar Sync Service
 *
 * Synchronizes property project items (scheduled visits, follow-ups, tasks)
 * with the main family calendar and notification system.
 */

import { CalendarEvent, Reminder } from '@/types/calendar.types';
import {
  PropertyProject,
  TaskScheduledVisit,
  TaskFollowUp,
  ProjectTask,
  ProjectMilestone,
} from '@/types/property.types';

// Prefix for property-sourced calendar events
const PROPERTY_EVENT_PREFIX = 'property-';

/**
 * Event source types for tracking origin of calendar events
 */
export type PropertyEventSource = 'visit' | 'followup' | 'task' | 'milestone' | 'project';

interface PropertyCalendarEvent extends Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> {
  sourceType: PropertyEventSource;
  sourceId: string;
  projectId: string;
}

/**
 * Generate a unique event ID for property-sourced events
 */
function generateEventId(sourceType: PropertyEventSource, sourceId: string): string {
  return `${PROPERTY_EVENT_PREFIX}${sourceType}-${sourceId}`;
}

/**
 * Default reminders for property events
 */
function getDefaultReminders(eventType: PropertyEventSource): Reminder[] {
  const dayBefore: Reminder = {
    id: 'reminder-1day',
    type: 'notification',
    time: 1440, // 24 hours = 1440 minutes
    enabled: true,
  };

  const hourBefore: Reminder = {
    id: 'reminder-1hour',
    type: 'notification',
    time: 60,
    enabled: true,
  };

  // Visits get both reminders, others just day before
  if (eventType === 'visit') {
    return [dayBefore, hourBefore];
  }

  return [dayBefore];
}

/**
 * Convert a scheduled visit to a calendar event
 */
export function visitToCalendarEvent(
  visit: TaskScheduledVisit,
  projectId: string,
  projectTitle: string,
  defaultPersonId: string
): PropertyCalendarEvent {
  return {
    title: `${visit.contractorName}${visit.company ? ` (${visit.company})` : ''} - ${visit.purpose}`,
    person: defaultPersonId,
    date: visit.date,
    time: visit.time || '09:00',
    duration: 60, // Default 1 hour for visits
    location: projectTitle, // Use project as location context
    recurring: 'none',
    cost: 0,
    type: 'appointment',
    notes: visit.notes ? `${projectTitle}\n\n${visit.notes}` : `Property project: ${projectTitle}`,
    isRecurring: false,
    reminders: getDefaultReminders('visit'),
    attendees: [],
    priority: 'high',
    status: visit.completed ? 'confirmed' : 'tentative',
    sourceType: 'visit',
    sourceId: visit.id,
    projectId,
  };
}

/**
 * Convert a follow-up to a calendar event
 */
export function followUpToCalendarEvent(
  followUp: TaskFollowUp,
  projectId: string,
  projectTitle: string,
  defaultPersonId: string
): PropertyCalendarEvent {
  return {
    title: `Follow-up: ${followUp.description}`,
    person: defaultPersonId,
    date: followUp.dueDate,
    time: '09:00', // Default morning for follow-ups
    duration: 30, // 30 min default
    recurring: 'none',
    cost: 0,
    type: 'meeting',
    notes: `Property project: ${projectTitle}`,
    isRecurring: false,
    reminders: getDefaultReminders('followup'),
    attendees: [],
    priority: 'medium',
    status: followUp.completed ? 'confirmed' : 'tentative',
    sourceType: 'followup',
    sourceId: followUp.id,
    projectId,
  };
}

/**
 * Convert a project task to a calendar event
 */
export function taskToCalendarEvent(
  task: ProjectTask,
  projectId: string,
  projectTitle: string,
  defaultPersonId: string
): PropertyCalendarEvent | null {
  // Only create event if task has a due date
  if (!task.dueDate) {
    return null;
  }

  return {
    title: task.title,
    person: task.assignedTo || defaultPersonId,
    date: task.dueDate,
    time: '09:00',
    duration: 60,
    recurring: 'none',
    cost: 0,
    type: 'other',
    notes: `Property project: ${projectTitle}`,
    isRecurring: false,
    reminders: getDefaultReminders('task'),
    attendees: [],
    priority: task.status === 'pending' ? 'medium' : 'low',
    status: task.status === 'completed' ? 'confirmed' : 'tentative',
    sourceType: 'task',
    sourceId: task.id,
    projectId,
  };
}

/**
 * Convert a project milestone to a calendar event
 */
export function milestoneToCalendarEvent(
  milestone: ProjectMilestone,
  projectId: string,
  projectTitle: string,
  defaultPersonId: string
): PropertyCalendarEvent | null {
  // Only create event if milestone has a target date
  if (!milestone.targetDate) {
    return null;
  }

  return {
    title: `Milestone: ${milestone.title}`,
    person: defaultPersonId,
    date: milestone.targetDate,
    time: '09:00',
    duration: 30,
    recurring: 'none',
    cost: 0,
    type: 'meeting',
    notes: `Property project: ${projectTitle}\nMilestone status: ${milestone.status}`,
    isRecurring: false,
    reminders: getDefaultReminders('milestone'),
    attendees: [],
    priority: 'high',
    status: milestone.status === 'completed' ? 'confirmed' : 'tentative',
    sourceType: 'milestone',
    sourceId: milestone.id,
    projectId,
  };
}

/**
 * Convert project start/completion dates to calendar events
 */
export function projectDatesToCalendarEvents(
  project: PropertyProject,
  defaultPersonId: string
): PropertyCalendarEvent[] {
  const events: PropertyCalendarEvent[] = [];

  if (project.targetStartDate) {
    events.push({
      title: `${project.title} - Project Start`,
      person: defaultPersonId,
      date: project.targetStartDate,
      time: '09:00',
      duration: 60,
      recurring: 'none',
      cost: 0,
      type: 'meeting',
      notes: `Property project start date\n\nCategory: ${project.category}\nStatus: ${project.status}`,
      isRecurring: false,
      reminders: getDefaultReminders('project'),
      attendees: [],
      priority: 'high',
      status: 'tentative',
      sourceType: 'project',
      sourceId: `${project.id}-start`,
      projectId: project.id,
    });
  }

  if (project.targetCompletionDate) {
    events.push({
      title: `${project.title} - Target Completion`,
      person: defaultPersonId,
      date: project.targetCompletionDate,
      time: '17:00',
      duration: 30,
      recurring: 'none',
      cost: 0,
      type: 'meeting',
      notes: `Property project target completion\n\nCategory: ${project.category}\nStatus: ${project.status}`,
      isRecurring: false,
      reminders: getDefaultReminders('project'),
      attendees: [],
      priority: 'high',
      status: 'tentative',
      sourceType: 'project',
      sourceId: `${project.id}-completion`,
      projectId: project.id,
    });
  }

  return events;
}

/**
 * Extract all calendar events from a property project
 */
export function extractCalendarEventsFromProject(
  project: PropertyProject,
  defaultPersonId: string
): PropertyCalendarEvent[] {
  const events: PropertyCalendarEvent[] = [];

  // Add project dates
  events.push(...projectDatesToCalendarEvents(project, defaultPersonId));

  // Add scheduled visits
  if (project.scheduledVisits) {
    project.scheduledVisits.forEach((visit) => {
      if (!visit.completed) {
        events.push(visitToCalendarEvent(visit, project.id, project.title, defaultPersonId));
      }
    });
  }

  // Add follow-ups
  if (project.followUps) {
    project.followUps.forEach((followUp) => {
      if (!followUp.completed) {
        events.push(followUpToCalendarEvent(followUp, project.id, project.title, defaultPersonId));
      }
    });
  }

  // Add tasks with due dates
  if (project.tasks) {
    project.tasks.forEach((task) => {
      const event = taskToCalendarEvent(task, project.id, project.title, defaultPersonId);
      if (event && task.status !== 'completed') {
        events.push(event);
      }
    });
  }

  // Add milestones
  if (project.milestones) {
    project.milestones.forEach((milestone) => {
      const event = milestoneToCalendarEvent(milestone, project.id, project.title, defaultPersonId);
      if (event && milestone.status !== 'completed') {
        events.push(event);
      }
    });
  }

  return events;
}

/**
 * Extract all calendar events from multiple projects
 */
export function extractCalendarEventsFromProjects(
  projects: PropertyProject[],
  defaultPersonId: string
): PropertyCalendarEvent[] {
  return projects.flatMap((project) =>
    extractCalendarEventsFromProject(project, defaultPersonId)
  );
}

/**
 * Check if a calendar event is from property sync
 */
export function isPropertySyncedEvent(eventId: string): boolean {
  return eventId.startsWith(PROPERTY_EVENT_PREFIX);
}

/**
 * Parse property event ID to get source type and ID
 */
export function parsePropertyEventId(eventId: string): {
  sourceType: PropertyEventSource;
  sourceId: string;
} | null {
  if (!isPropertySyncedEvent(eventId)) {
    return null;
  }

  const withoutPrefix = eventId.slice(PROPERTY_EVENT_PREFIX.length);
  const [sourceType, ...sourceIdParts] = withoutPrefix.split('-');
  const sourceId = sourceIdParts.join('-');

  if (!sourceType || !sourceId) {
    return null;
  }

  return {
    sourceType: sourceType as PropertyEventSource,
    sourceId,
  };
}

/**
 * Convert PropertyCalendarEvent to CalendarEvent with ID and timestamps
 */
export function toCalendarEvent(
  propertyEvent: PropertyCalendarEvent
): Omit<CalendarEvent, 'createdAt' | 'updatedAt'> {
  const { sourceType, sourceId, projectId, ...eventData } = propertyEvent;

  return {
    ...eventData,
    id: generateEventId(sourceType, sourceId),
  };
}

export default {
  visitToCalendarEvent,
  followUpToCalendarEvent,
  taskToCalendarEvent,
  milestoneToCalendarEvent,
  projectDatesToCalendarEvents,
  extractCalendarEventsFromProject,
  extractCalendarEventsFromProjects,
  isPropertySyncedEvent,
  parsePropertyEventId,
  toCalendarEvent,
};
