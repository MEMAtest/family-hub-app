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
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">Family Calendar</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 truncate">Drag, drop, and manage your events in one place.</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex flex-shrink-0">
            <button
              onClick={openTemplateManager}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LayoutGrid className="h-4 w-4" /> Templates
            </button>
            <button
              onClick={openConflictSettings}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Settings className="h-4 w-4" /> Conflict rules
            </button>
          </div>
        </div>
        <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-1.5 sm:gap-2 sm:hidden">
          <button
            onClick={openTemplateManager}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 touch-manipulation dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Templates</span>
          </button>
          <button
            onClick={openConflictSettings}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 touch-manipulation dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Settings className="h-4 w-4" />
            <span>Conflicts</span>
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
