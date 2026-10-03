'use client'

import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Import, Settings, LayoutGrid, Plus, CalendarDays, Loader2 } from 'lucide-react';
import CalendarMain from '@/components/calendar/CalendarMain';
import CalendarCopilotPanel from '@/components/calendar/CalendarCopilotPanel';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { useFamilyContext } from '@/contexts/familyHub/FamilyContext';
import { useAppView } from '@/contexts/familyHub/AppViewContext';
import type { CalendarEvent } from '@/types/calendar.types';
import { addDays, expandEvents } from '@/utils/recurrence';
import { formatDateForInput } from '@/utils/formatDate';
import toast from 'react-hot-toast';
import { hasUnspecifiedEventTime } from '@/utils/eventSemantics';

export const CalendarView = () => {
  const { events, tasks, openEditForm, openCreateForm, createEvent, createTask, updateEvent, deleteEvent,
    openTemplateManager, openConflictSettings, toggleTaskComplete } = useCalendarContext();
  const { members } = useFamilyContext();
  const { currentDate, setCurrentDate } = useAppView();
  const [showImport, setShowImport] = useState(false);
  const [title, setTitle] = useState('');
  const [personId, setPersonId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('15:30');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState<'none' | 'weekly'>('none');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const importRef = useRef<HTMLElement>(null);
  const people = useMemo(() => members.map(({ id, name, icon, color, role, ageGroup }) => ({ id, name, icon, color, role, ageGroup })), [members]);
  const dateKey = formatDateForInput(currentDate);
  const upcoming = useMemo(() => expandEvents(events, dateKey, addDays(dateKey, 6))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 5), [events, dateKey]);
  const handleEventsSync = useCallback(async (importedEvents: CalendarEvent[]) => {
    for (const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } of importedEvents) await createEvent(draft);
  }, [createEvent]);
  const saveQuickEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !title.trim() || !people.length) return;
    setSaving(true); setMessage('');
    try {
      const result = await createEvent({ title: title.trim(), person: personId || people[0].id, date: date || dateKey,
        time, duration, notes: notes.trim(), recurring, isRecurring: recurring !== 'none',
        type: 'other', priority: 'medium', status: 'confirmed', cost: 0, location: '',
        reminders: [{ id: 'quick-reminder', type: 'notification', time: 15, enabled: true }] });
      if (result.status === 'conflict') { setMessage('This overlaps another event. Resolve the conflict to continue.'); return; }
      setCurrentDate(new Date(`${date || dateKey}T12:00:00`));
      setTitle(''); setNotes(''); setRecurring('none'); setMessage('Added to your calendar.');
    } catch { setMessage('Could not save this event. Please try again.'); }
    finally { setSaving(false); }
  };
  const field = 'mt-1 min-h-11 w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

  return <div className="min-w-0 bg-[#f5f8f7] pb-[calc(env(safe-area-inset-bottom)+6rem)] dark:bg-slate-950 lg:pb-6">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
      <h2 className="text-xl font-semibold sm:text-2xl">Family Calendar</h2>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { setShowImport(!showImport); if (!showImport) requestAnimationFrame(() => importRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }} aria-expanded={showImport} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-medium dark:border-slate-700"><Import className="h-4 w-4" />School inbox &amp; quick plan {showImport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
        <button type="button" onClick={openTemplateManager} title="Event templates" aria-label="Event templates" className="min-h-10 rounded-md border border-gray-200 p-2.5 dark:border-slate-700"><LayoutGrid className="h-4 w-4" /></button>
        <button type="button" onClick={openConflictSettings} title="Conflict rules" aria-label="Conflict rules" className="min-h-10 rounded-md border border-gray-200 p-2.5 dark:border-slate-700"><Settings className="h-4 w-4" /></button>
      </div>
    </header>
    <div className="grid min-w-0 gap-5 px-3 py-4 sm:px-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CalendarMain events={events} tasks={tasks} onTaskToggle={(id, occurrenceDate) => { void toggleTaskComplete(id, undefined, occurrenceDate).catch(() => toast.error('Could not update this reminder. Please try again.')); }} people={people} onEventClick={openEditForm} onEventCreate={openCreateForm}
          onEventUpdate={updateEvent} onEventDelete={deleteEvent} currentDate={currentDate} onDateChange={setCurrentDate}
          onTemplateManage={openTemplateManager} onConflictSettings={openConflictSettings} onEventsSync={handleEventsSync} />
      </div>
      <aside className="flex min-w-0 flex-col gap-5">
        <section className="order-2 border-t border-gray-200 pt-5 dark:border-slate-800" aria-label="Quick add event">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><Plus className="h-5 w-5 text-[#147c72]" />Quick add</h3>
          <form onSubmit={saveQuickEvent} className="space-y-3">
            <label className="block text-xs font-medium">What's happening?<input required aria-label="Quick event title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Club, appointment or family plan" className={field} /></label>
            <label className="block text-xs font-medium">Person<select aria-label="Quick event person" value={personId || people[0]?.id || ''} onChange={(e) => setPersonId(e.target.value)} className={field}>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0 text-xs font-medium">Date<input required aria-label="Quick event date" type="date" value={date || dateKey} onChange={(e) => setDate(e.target.value)} className={field} /></label>
              <label className="min-w-0 text-xs font-medium">Time<input required aria-label="Quick event time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium">Duration<select aria-label="Quick event duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={field}>{[15, 30, 45, 60, 90, 120].map((min) => <option key={min} value={min}>{min} min</option>)}</select></label>
              <label className="text-xs font-medium">Repeats<select aria-label="Quick event repeats" value={recurring} onChange={(e) => setRecurring(e.target.value as 'none' | 'weekly')} className={field}><option value="none">Once</option><option value="weekly">Weekly</option></select></label>
            </div>
            <label className="block text-xs font-medium">Context<textarea aria-label="Quick event context" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Where, what to bring, pickup details" className={field} /></label>
            <button disabled={saving || !people.length || !title.trim()} type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#147c72] px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{saving ? 'Saving...' : 'Add to calendar'}</button>
            {message && <p role="status" className="text-sm text-[#147c72] dark:text-teal-300">{message}</p>}
            <button type="button" onClick={() => openCreateForm()} className="min-h-10 text-sm font-medium text-gray-500 dark:text-slate-400">Full event options</button>
          </form>
        </section>
        <section className="order-1" aria-label="Upcoming this week">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><CalendarDays className="h-5 w-5 text-violet-500" />Coming up this week</h3>
          {upcoming.length ? <div className="divide-y divide-gray-200 dark:divide-slate-800">{upcoming.map((item) => <button key={item.occurrenceId} type="button" onClick={() => openEditForm({ ...item.event, date: item.date, time: item.time, duration: item.duration, endDate: item.endDate, occurrenceDate: item.date, seriesStartDate: item.event.isRecurring ? item.event.date : undefined })} className="flex w-full items-start gap-3 py-3 text-left">
            <span className="w-11 shrink-0 text-center text-xs text-gray-500 dark:text-slate-400">{new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(`${item.date}T12:00:00`))}<strong className="mt-1 block text-base text-gray-800 dark:text-slate-200">{item.date.slice(8)}</strong></span>
            <span className="min-w-0"><span className="block text-sm font-semibold">{item.event.title}</span><span className="mt-1 block text-xs text-gray-500 dark:text-slate-400">{hasUnspecifiedEventTime(item.event) ? 'All day' : item.time} · {people.find((person) => person.id === item.event.person)?.name || 'Family'}</span>{item.event.location && <span className="mt-1 block truncate text-xs text-gray-500">{item.event.location}</span>}</span>
          </button>)}</div> : <p className="text-sm text-gray-500 dark:text-slate-400">No events in the next seven days.</p>}
        </section>
      </aside>
    </div>
    {showImport && <section ref={importRef} className="scroll-mt-4 border-t border-gray-200 dark:border-slate-800" aria-label="School inbox and import">
      <CalendarCopilotPanel events={events} tasks={tasks} people={people} currentDate={currentDate} createEvent={createEvent} createTask={createTask} onOpenCalendar={() => setCurrentDate(currentDate)} />
    </section>}
  </div>;
};
