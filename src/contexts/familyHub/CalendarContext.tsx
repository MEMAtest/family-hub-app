'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarEvent, EventTemplate, Person } from '@/types/calendar.types';
import { ConflictResolution, DetectedConflict } from '@/services/conflictDetectionService';
import conflictDetectionService from '@/services/conflictDetectionService';
import databaseService from '@/services/databaseService';
import { useFamilyStore } from '@/store/familyStore';
import { createId } from '@/utils/id';
import { useNotifications } from '@/contexts/NotificationContext';

interface CalendarContextValue {
  events: CalendarEvent[];
  eventTemplates: EventTemplate[];
  selectedEvent: CalendarEvent | null;
  defaultSlot: { start: Date; end: Date } | null;
  isEventFormOpen: boolean;
  openCreateForm: (slot?: { start: Date; end: Date }) => void;
  openEditForm: (event: CalendarEvent) => void;
  closeEventForm: () => void;
  createEvent: (options: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<'conflict' | 'created'>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<true | 'conflict'>;
  deleteEvent: (id: string) => Promise<void>;
  showTemplateManager: boolean;
  openTemplateManager: () => void;
  closeTemplateManager: () => void;
  saveTemplate: (template: Omit<EventTemplate, 'id'>) => void;
  updateTemplate: (id: string, updates: Partial<EventTemplate>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (template: EventTemplate) => void;
  detectedConflicts: DetectedConflict[];
  isConflictModalOpen: boolean;
  openConflictModal: (conflicts: DetectedConflict[]) => void;
  closeConflictModal: () => void;
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => Promise<void>;
  ignoreConflict: (conflictId: string) => Promise<void>;
  conflictRules: ReturnType<typeof conflictDetectionService.getRules>;
  setConflictRules: (rules: ReturnType<typeof conflictDetectionService.getRules>) => void;
  isConflictSettingsOpen: boolean;
  openConflictSettings: () => void;
  closeConflictSettings: () => void;
  saveConflictSettings: () => void;
}

const CalendarContext = createContext<CalendarContextValue | undefined>(undefined);

const mapMembersToPeople = (members: ReturnType<typeof useFamilyStore.getState>['people']): Person[] => {
  return members.map((member) => {
    const memberRecord = member as Record<string, any>;
    const fallbackName =
      memberRecord.displayName ||
      (memberRecord.firstName && memberRecord.lastName
        ? `${memberRecord.firstName} ${memberRecord.lastName}`
        : member.name);

    return {
      id: member.id,
      name: fallbackName || 'Family Member',
      color: member.color,
      icon: memberRecord.avatar || member.icon || '👤',
      role:
        typeof memberRecord.role === 'object' && memberRecord.role !== null
          ? memberRecord.role.name ?? 'Family Member'
          : (memberRecord.role as string) || 'Family Member',
    };
  });
};

type CalendarDraft = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<CalendarEvent, 'createdAt' | 'updatedAt'>>;

const buildEvent = (draft: CalendarDraft, id?: string): CalendarEvent => ({
  ...draft,
  id: id ?? createId('event'),
  createdAt: draft.createdAt ?? new Date(),
  updatedAt: new Date(),
  reminders: draft.reminders ?? [
    { id: 'reminder-15', type: 'notification', time: 15, enabled: true },
  ],
  attendees: draft.attendees ?? [],
  priority: draft.priority ?? 'medium',
  status: draft.status ?? 'confirmed',
});

export const CalendarProvider = ({ children }: PropsWithChildren) => {
  const events = useFamilyStore((state) => state.events);
  const setEvents = useFamilyStore((state) => state.setEvents);
  const eventTemplates = useFamilyStore((state) => state.eventTemplates);
  const addEventTemplate = useFamilyStore((state) => state.addEventTemplate);
  const updateEventTemplateStore = useFamilyStore((state) => state.updateEventTemplate);
  const deleteEventTemplateStore = useFamilyStore((state) => state.deleteEventTemplate);
  const members = useFamilyStore((state) => state.people);

  // Debug logging
  console.log('📆 CalendarContext: events from store:', events.length);

  const { scheduleEventReminders, cancelEventReminders, showNotification } = useNotifications();

  // Track if we've already hydrated to prevent duplicate loads
  const hasHydrated = useRef(false);

  // Hydrate events from database/localStorage on mount
  useEffect(() => {
    if (hasHydrated.current) return;
    if (events.length > 0) {
      hasHydrated.current = true;
      return;
    }

    const loadEvents = async () => {
      hasHydrated.current = true;
      console.log('📆 CalendarContext: Hydrating events...');

      // Try database first
      const familyId = typeof window !== 'undefined' ? localStorage.getItem('familyId') : null;
      if (familyId) {
        try {
          const response = await fetch(`/api/families/${familyId}/events`);
          if (response.ok) {
            const dbEvents = await response.json();
            if (Array.isArray(dbEvents) && dbEvents.length > 0) {
              // Convert database events to app format
              const formattedEvents = dbEvents.map((e: any) => {
                const eventTime = new Date(e.eventTime);
                const hours = eventTime.getUTCHours().toString().padStart(2, '0');
                const minutes = eventTime.getUTCMinutes().toString().padStart(2, '0');

                return {
                  id: e.id,
                  title: e.title,
                  person: e.personId,
                  date: e.eventDate ? e.eventDate.split('T')[0] : new Date().toISOString().split('T')[0],
                  time: `${hours}:${minutes}`,
                  duration: e.durationMinutes,
                  location: e.location,
                  recurring: e.recurringPattern,
                  cost: e.cost,
                  type: e.eventType,
                  notes: e.notes,
                  isRecurring: e.isRecurring,
                  priority: 'medium' as const,
                  status: 'confirmed' as const,
                  createdAt: e.createdAt,
                  updatedAt: e.updatedAt,
                  reminders: [{ id: 'reminder-15', type: 'notification' as const, time: 15, enabled: true }],
                  attendees: [],
                };
              });
              console.log('📆 CalendarContext: Loaded', formattedEvents.length, 'events from database');
              setEvents(formattedEvents);
              // Also update localStorage for offline access
              localStorage.setItem('calendarEvents', JSON.stringify(formattedEvents));
              return;
            }
          }
        } catch (error) {
          console.error('📆 CalendarContext: Failed to load events from database:', error);
        }
      }

      // Fallback to localStorage
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('calendarEvents') : null;
        if (stored) {
          const storedEvents = JSON.parse(stored);
          if (Array.isArray(storedEvents) && storedEvents.length > 0) {
            console.log('📆 CalendarContext: Loaded', storedEvents.length, 'events from localStorage');
            setEvents(storedEvents);
          }
        }
      } catch (error) {
        console.error('📆 CalendarContext: Failed to load events from localStorage:', error);
      }
    };

    loadEvents();
  }, [events.length, setEvents]);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [defaultSlot, setDefaultSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [detectedConflicts, setDetectedConflicts] = useState<DetectedConflict[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isConflictSettingsOpen, setIsConflictSettingsOpen] = useState(false);
  const [conflictRules, setConflictRules] = useState(conflictDetectionService.getRules());

  const openCreateForm = useCallback((slot?: { start: Date; end: Date }) => {
    setDefaultSlot(slot ?? null);
    setSelectedEvent(null);
    setIsEventFormOpen(true);
  }, []);

  const openEditForm = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setDefaultSlot(null);
    setIsEventFormOpen(true);
  }, []);

  const closeEventForm = useCallback(() => {
    setIsEventFormOpen(false);
    setSelectedEvent(null);
    setDefaultSlot(null);
  }, []);

  const detectConflicts = useCallback((event: CalendarEvent, existingEvents: CalendarEvent[]) => {
    const people = mapMembersToPeople(members);
    return conflictDetectionService.detectConflicts(event, existingEvents, people);
  }, [members]);

  const openConflictModal = useCallback((conflicts: DetectedConflict[]) => {
    setDetectedConflicts(conflicts);
    setIsConflictModalOpen(true);
  }, []);

  const closeConflictModal = useCallback(() => {
    setIsConflictModalOpen(false);
    setDetectedConflicts([]);
  }, []);

  const createEvent = useCallback(async (
    draft: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<'conflict' | 'created'> => {
    const eventToSave = buildEvent(draft);
    const conflicts = detectConflicts(eventToSave, events);

    if (conflicts.length > 0) {
      openConflictModal(conflicts);
      return 'conflict';
    }

    const savedEvent = await databaseService.saveEvent(eventToSave) ?? eventToSave;
    setEvents([...events, savedEvent]);

    try {
      const eventDateTime = new Date(`${savedEvent.date}T${savedEvent.time}`);
      await scheduleEventReminders(savedEvent.id, eventDateTime, savedEvent.type);
      await showNotification({
        type: 'system',
        title: 'Event Created',
        message: `"${savedEvent.title}" has been added to your calendar with reminders.`,
        priority: 'medium',
        category: 'event',
        read: false,
        actionRequired: false,
      });
    } catch (error) {
      console.error('Failed to schedule reminders for created event', error);
    }

    closeEventForm();
    return 'created';
  }, [
    closeEventForm,
    detectConflicts,
    events,
    openConflictModal,
    scheduleEventReminders,
    setEvents,
    showNotification,
  ]);

  const updateEvent = useCallback(async (
    id: string,
    updates: Partial<CalendarEvent>
  ): Promise<true | 'conflict'> => {
    const existingEvent = events.find((event) => event.id === id);
    if (!existingEvent) {
      return true;
    }

    const updatedEvent = buildEvent({ ...existingEvent, ...updates }, id);
    const otherEvents = events.filter((event) => event.id !== id);

    const conflicts = detectConflicts(updatedEvent, otherEvents);
    if (conflicts.length > 0) {
      openConflictModal(conflicts);
      return 'conflict';
    }

    const success = await databaseService.updateEvent(id, updatedEvent);
    if (success) {
      setEvents(events.map((event) => (event.id === id ? updatedEvent : event)));
    }

    if (updates.date || updates.time) {
      try {
        await cancelEventReminders(id);
        const eventDateTime = new Date(`${updatedEvent.date}T${updatedEvent.time}`);
        await scheduleEventReminders(id, eventDateTime, updatedEvent.type);
        await showNotification({
          type: 'system',
          title: 'Event Updated',
          message: `"${updatedEvent.title}" has been updated with new reminders.`,
          priority: 'medium',
          category: 'event',
          read: false,
          actionRequired: false,
        });
      } catch (error) {
        console.error('Failed to reschedule reminders for updated event', error);
      }
    }

    closeEventForm();
    return true;
  }, [
    cancelEventReminders,
    closeEventForm,
    detectConflicts,
    events,
    openConflictModal,
    scheduleEventReminders,
    setEvents,
    showNotification,
  ]);

  const deleteEvent = useCallback(async (id: string) => {
    const eventToDelete = events.find((event) => event.id === id);
    const success = await databaseService.deleteEvent(id);

    if (success) {
      setEvents(events.filter((event) => event.id !== id));
      if (eventToDelete) {
        await showNotification({
          type: 'system',
          title: 'Event Deleted',
          message: `"${eventToDelete.title}" has been removed from your calendar.`,
          priority: 'medium',
          category: 'event',
          read: false,
          actionRequired: false,
        });
      }
    }

    try {
      await cancelEventReminders(id);
    } catch (error) {
      console.error('Failed to cancel reminders for deleted event', error);
    }

    if (selectedEvent?.id === id) {
      closeEventForm();
    }
  }, [
    cancelEventReminders,
    closeEventForm,
    events,
    selectedEvent,
    setEvents,
    showNotification,
  ]);

  const openTemplateManager = useCallback(() => setShowTemplateManager(true), []);
  const closeTemplateManager = useCallback(() => setShowTemplateManager(false), []);

  const saveTemplate = useCallback((template: Omit<EventTemplate, 'id'>) => {
    const newTemplate: EventTemplate = {
      ...template,
      id: createId('template'),
    };
    addEventTemplate(newTemplate);
  }, [addEventTemplate]);

  const updateTemplate = useCallback((id: string, updates: Partial<EventTemplate>) => {
    updateEventTemplateStore(id, updates);
  }, [updateEventTemplateStore]);

  const deleteTemplate = useCallback((id: string) => {
    deleteEventTemplateStore(id);
  }, [deleteEventTemplateStore]);

  const duplicateTemplate = useCallback((template: EventTemplate) => {
    const duplicated: EventTemplate = {
      ...template,
      id: createId('template'),
      name: `${template.name} Copy`,
    };
    addEventTemplate(duplicated);
  }, [addEventTemplate]);

  const resolveConflict = useCallback(async (conflictId: string, resolution: ConflictResolution) => {
    const conflict = detectedConflicts.find((item) => item.id === conflictId);
    if (!conflict) return;

    const currentEvents = useFamilyStore.getState().events;

    switch (resolution.type) {
      case 'cancel':
        setEvents(currentEvents.filter((event) => event.id !== conflict.newEvent.id));
        await showNotification({
          type: 'system',
          title: 'Event Cancelled',
          message: `"${conflict.newEvent.title}" has been cancelled to resolve the conflict.`,
          priority: 'medium',
          category: 'conflict',
          read: false,
          actionRequired: false,
        });
        break;
      case 'reschedule':
        await showNotification({
          type: 'system',
          title: 'Manual Rescheduling Required',
          message: `Please reschedule "${conflict.newEvent.title}" to resolve the conflict.`,
          priority: 'high',
          category: 'conflict',
          read: false,
          actionRequired: true,
        });
        break;
      case 'relocate':
        await showNotification({
          type: 'system',
          title: 'Location Change Recommended',
          message: `Consider changing the location for "${conflict.newEvent.title}".`,
          priority: 'medium',
          category: 'conflict',
          read: false,
          actionRequired: true,
        });
        break;
      default:
        await showNotification({
          type: 'system',
          title: 'Resolution Applied',
          message: `Applied ${resolution.type} resolution for "${conflict.newEvent.title}".`,
          priority: 'medium',
          category: 'conflict',
          read: false,
          actionRequired: false,
        });
    }

    setDetectedConflicts((prev) => prev.filter((item) => item.id !== conflictId));
    if (detectedConflicts.length <= 1) {
      closeConflictModal();
    }
  }, [closeConflictModal, detectedConflicts, setEvents, showNotification]);

  const ignoreConflict = useCallback(async (conflictId: string) => {
    const conflict = detectedConflicts.find((item) => item.id === conflictId);
    if (!conflict) return;

    const currentEvents = useFamilyStore.getState().events;
    setEvents([...currentEvents, conflict.newEvent]);
    await showNotification({
      type: 'system',
      title: 'Conflict Ignored',
      message: `"${conflict.newEvent.title}" has been added despite the conflict.`,
      priority: 'medium',
      category: 'conflict',
      read: false,
      actionRequired: false,
    });

    setDetectedConflicts((prev) => prev.filter((item) => item.id !== conflictId));
    if (detectedConflicts.length <= 1) {
      closeConflictModal();
    }
  }, [closeConflictModal, detectedConflicts, setEvents, showNotification]);

  const openConflictSettings = useCallback(() => setIsConflictSettingsOpen(true), []);
  const closeConflictSettings = useCallback(() => setIsConflictSettingsOpen(false), []);

  const saveConflictSettings = useCallback(() => {
    setConflictRules(conflictRules.map((rule) => ({ ...rule })));
    showNotification({
      type: 'system',
      title: 'Settings Saved',
      message: 'Conflict detection settings have been updated.',
      priority: 'medium',
      category: 'system',
      read: false,
      actionRequired: false,
    });
    closeConflictSettings();
  }, [closeConflictSettings, conflictRules, showNotification]);

  const value = useMemo<CalendarContextValue>(() => ({
    events,
    eventTemplates,
    selectedEvent,
    defaultSlot,
    isEventFormOpen,
    openCreateForm,
    openEditForm,
    closeEventForm,
    createEvent,
    updateEvent,
    deleteEvent,
    showTemplateManager,
    openTemplateManager,
    closeTemplateManager,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    detectedConflicts,
    isConflictModalOpen,
    openConflictModal,
    closeConflictModal,
    resolveConflict,
    ignoreConflict,
    conflictRules,
    setConflictRules,
    isConflictSettingsOpen,
    openConflictSettings,
    closeConflictSettings,
    saveConflictSettings,
  }), [
    closeConflictModal,
    closeConflictSettings,
    closeEventForm,
    closeTemplateManager,
    conflictRules,
    createEvent,
    defaultSlot,
    deleteEvent,
    detectedConflicts,
    duplicateTemplate,
    eventTemplates,
    events,
    ignoreConflict,
    isConflictModalOpen,
    isConflictSettingsOpen,
    isEventFormOpen,
    openConflictModal,
    openConflictSettings,
    openCreateForm,
    openEditForm,
    openTemplateManager,
    resolveConflict,
    saveConflictSettings,
    saveTemplate,
    selectedEvent,
    setConflictRules,
    updateEvent,
    updateTemplate,
  ]);

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
};
