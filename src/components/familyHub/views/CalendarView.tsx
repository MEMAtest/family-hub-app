'use client'

import { useMemo } from 'react';
import { Settings, LayoutGrid } from 'lucide-react';
import CalendarMain from '@/components/calendar/CalendarMain';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { useFamilyContext } from '@/contexts/familyHub/FamilyContext';
import { useAppView } from '@/contexts/familyHub/AppViewContext';

export const CalendarView = () => {
  const {
    events,
    openEditForm,
    openCreateForm,
    updateEvent,
    deleteEvent,
    openTemplateManager,
    openConflictSettings,
  } = useCalendarContext();
  const { members } = useFamilyContext();
  const { currentDate, setCurrentDate } = useAppView();

  const people = useMemo(() => members.map((member) => ({
    id: member.id,
    name: member.name,
    icon: member.icon,
    color: member.color,
    role: member.role,
  })), [members]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Family Calendar</h2>
          <p className="text-sm text-gray-500">Drag, drop, and manage your events in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openTemplateManager}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <LayoutGrid className="h-4 w-4" /> Templates
          </button>
          <button
            onClick={openConflictSettings}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" /> Conflict rules
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <CalendarMain
          events={events}
          people={people}
          onEventClick={openEditForm}
          onEventCreate={openCreateForm}
          onEventUpdate={updateEvent}
          onEventDelete={deleteEvent}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onTemplateManage={openTemplateManager}
        />
      </div>
    </div>
  );
};
