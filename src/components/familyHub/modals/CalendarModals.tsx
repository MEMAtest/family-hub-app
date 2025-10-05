'use client'

import EventForm from '@/components/calendar/EventForm';
import EventTemplates from '@/components/calendar/EventTemplates';
import ConflictDetectionModal from '@/components/calendar/ConflictDetectionModal';
import ConflictSettings from '@/components/calendar/ConflictSettings';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { useFamilyContext } from '@/contexts/familyHub/FamilyContext';

export const CalendarModals = () => {
  const {
    isEventFormOpen,
    selectedEvent,
    defaultSlot,
    closeEventForm,
    createEvent,
    updateEvent,
    deleteEvent,
    eventTemplates,
    showTemplateManager,
    closeTemplateManager,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    detectedConflicts,
    isConflictModalOpen,
    closeConflictModal,
    resolveConflict,
    ignoreConflict,
    conflictRules,
    setConflictRules,
    isConflictSettingsOpen,
    closeConflictSettings,
    saveConflictSettings,
  } = useCalendarContext();
  const { members } = useFamilyContext();

  const people = members.map((member) => ({
    id: member.id,
    name: member.name,
    icon: member.icon,
    color: member.color,
    role: member.role,
  }));

  return (
    <>
      <EventForm
        isOpen={isEventFormOpen}
        onClose={closeEventForm}
        event={selectedEvent || undefined}
        onSave={createEvent}
        onUpdate={updateEvent}
        onDelete={selectedEvent ? deleteEvent : undefined}
        people={people}
        templates={eventTemplates}
        defaultSlot={defaultSlot || undefined}
      />

      <EventTemplates
        isOpen={showTemplateManager}
        onClose={closeTemplateManager}
        templates={eventTemplates}
        onSave={saveTemplate}
        onUpdate={updateTemplate}
        onDelete={deleteTemplate}
        onDuplicate={duplicateTemplate}
      />

      <ConflictDetectionModal
        isOpen={isConflictModalOpen}
        onClose={closeConflictModal}
        conflicts={detectedConflicts}
        onResolveConflict={resolveConflict}
        onIgnoreConflict={ignoreConflict}
        people={people}
      />

      <ConflictSettings
        isOpen={isConflictSettingsOpen}
        onClose={closeConflictSettings}
        rules={conflictRules}
        onUpdateRule={(ruleId, updates) => {
          setConflictRules(conflictRules.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule)));
        }}
        onSave={saveConflictSettings}
      />
    </>
  );
};
