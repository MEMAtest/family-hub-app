'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Import, Settings, LayoutGrid, Plus, Loader2, MapPin, Sparkles, AlertTriangle, Clock3, UserRoundCheck, Check } from 'lucide-react';
import CalendarMain from '@/components/calendar/CalendarMain';
import CalendarCopilotPanel from '@/components/calendar/CalendarCopilotPanel';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { useFamilyContext } from '@/contexts/familyHub/FamilyContext';
import { useAppView } from '@/contexts/familyHub/AppViewContext';
import type { CalendarEvent } from '@/types/calendar.types';
import { useFamilyStore } from '@/store/familyStore';
import { recurringSourceDateWarning } from '@/utils/schoolEventPresentation';
import { formatDateForInput } from '@/utils/formatDate';
import toast from 'react-hot-toast';
import { useCalendarReminderLink } from '@/hooks/useCalendarReminderLink';
import WorkStatusManager from '@/components/calendar/WorkStatusManager';
import { BinCollectionStrip } from '@/components/calendar/BinCollectionStrip';
import { QuickPresenceDialog } from '@/components/calendar/QuickPresenceDialog';
import { getScheduleHealthInsights } from '@/utils/scheduleHealth';
import { addDays, expandEvents } from '@/utils/recurrence';
import { useSearchParams } from 'next/navigation';
import { UpcomingPlans } from '@/components/calendar/UpcomingPlans';
import { useCalendarPreferences } from '@/hooks/useCalendarPreferences';

export const CalendarView = () => {
  const searchParams = useSearchParams();
  const { events, tasks, refreshEvents, refreshTasks, isEventFormOpen, openEditForm, openCreateForm, createEvent, createTask, updateEvent, deleteEvent,
    openTemplateManager, openConflictSettings, toggleTaskComplete } = useCalendarContext();
  const { members } = useFamilyContext();
  const { currentDate, setCurrentDate } = useAppView();
  const [showImport, setShowImport] = useState(() => searchParams.get('homeFocus') === 'school');
  const [title, setTitle] = useState('');
  const [personId, setPersonId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('15:30');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState<'none' | 'weekly'>('none');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showPresence, setShowPresence] = useState(false);
  const [pendingReview, setPendingReview] = useState<number | null>(null);
  const [pendingReviewEmails, setPendingReviewEmails] = useState<number | null>(null);
  const [waitingSources, setWaitingSources] = useState(0);
  const [confirmingSource, setConfirmingSource] = useState<string | null>(null);
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const { preferences, status: preferenceStatus, update: updatePreference, retry: retryPreferences } = useCalendarPreferences(familyId);
  const [reviewReasons, setReviewReasons] = useState<Record<string, number>>({});
  const returnScroll = useRef<{ top: number; main: HTMLElement | null } | null>(null);
  const captureScroll = () => { const main = document.querySelector<HTMLElement>('.kinboard-main'); returnScroll.current = { top: main?.scrollTop ?? window.scrollY, main }; };
  const openSavedEvent = useCallback((event: CalendarEvent) => {
    const main = document.querySelector<HTMLElement>('.kinboard-main');
    returnScroll.current = { top: main?.scrollTop ?? window.scrollY, main };
    openEditForm(event);
  }, [openEditForm]);
  const importRef = useRef<HTMLElement>(null);
  const people = useMemo(() => members.map(({ id, name, icon, color, role, ageGroup }) => ({ id, name, icon, color, role, ageGroup })), [members]);
  const [travelEvent, setTravelEvent] = useState<CalendarEvent | null>(null);
  const openTravel = useCallback((event: CalendarEvent) => {
    const main = document.querySelector<HTMLElement>('.kinboard-main');
    returnScroll.current = { top: main?.scrollTop ?? window.scrollY, main };
    setTravelEvent(event);
  }, []);
  const eventEditor = useCalendarReminderLink(events, openTravel, openSavedEvent, familyId, false);
  const dateKey = formatDateForInput(currentDate);
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
  const upcomingEvents = useMemo(() => expandEvents(
    events.filter((event) => event.status !== 'cancelled' && !recurringSourceDateWarning(event) && !event.metadata?.schoolImportReview),
    dateKey,
    addDays(dateKey, 6)
  ).map((occurrence) => ({
    ...occurrence.event,
    date: occurrence.date,
    time: occurrence.time,
    duration: occurrence.duration,
    endDate: occurrence.endDate,
    occurrenceDate: occurrence.date,
    seriesStartDate: occurrence.isRecurring ? occurrence.event.date : undefined,
  })), [dateKey, events]);
  const scheduleInsights = useMemo(() => getScheduleHealthInsights(upcomingEvents, people).filter(insight => !preferences.acceptedOverlaps.includes(insight.id)), [upcomingEvents, people, preferences.acceptedOverlaps]);
  useEffect(() => {
    if (!isEventFormOpen && !travelEvent && !showPresence && returnScroll.current !== null) {
      const scroll = returnScroll.current;
      returnScroll.current = null;
      requestAnimationFrame(() => (scroll.main ?? window).scrollTo({ top: scroll.top, behavior: 'instant' }));
    }
  }, [isEventFormOpen, travelEvent, showPresence]);
  const dateWarnings = events.filter((event) => recurringSourceDateWarning(event));
  const sourceWarnings = events.filter(event => event.metadata?.schoolImportReview && event.status !== 'cancelled');
  const confirmedDateEvents = useMemo(() => events.filter((event) => !recurringSourceDateWarning(event) && !event.metadata?.schoolImportReview), [events]);
  const loadReviewCount = useCallback(async () => {
    if (!familyId) { setPendingReview(null); return; }
    try {
      const response = await fetch(`/api/families/${familyId}/calendar-intake/inbox`);
      if (!response.ok) throw new Error('Inbox unavailable');
      const payload = await response.json();
      setPendingReview(payload.pendingDecisionCount ?? payload.pendingReviewCount ?? (payload.intakes || []).reduce((count: number, item: { needsReview?: number }) => count + (item.needsReview || 0), 0));
      setPendingReviewEmails(payload.pendingDecisionEmailCount ?? payload.pendingReviewEmailCount ?? null);
      setWaitingSources(payload.waitingContentCount ?? 0);
      setReviewReasons(payload.reviewReasons ?? {});
    } catch { setPendingReview(null); setPendingReviewEmails(null); }
  }, [familyId]);
  useEffect(() => { void loadReviewCount(); }, [loadReviewCount]);
  const schoolFocus = searchParams.get('homeFocus') === 'school';
  useEffect(() => {
    if (!schoolFocus) return;
    setShowImport(true);
    requestAnimationFrame(() => importRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [schoolFocus]);
  const openImport = () => { setShowImport((value) => !value); if (!showImport) requestAnimationFrame(() => importRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const handleEventsSync = useCallback(async (importedEvents: CalendarEvent[]) => {
    for (const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } of importedEvents) await createEvent(draft);
  }, [createEvent]);
  const refreshPlanning = useCallback(async () => { await refreshEvents(); await refreshTasks(); }, [refreshEvents, refreshTasks]);
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
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button type="button" disabled={!['saved', 'saving'].includes(preferenceStatus)} onClick={() => { captureScroll(); setShowPresence(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#147c72] px-3 text-sm font-semibold text-white disabled:opacity-50"><MapPin className="h-4 w-4" />Where are you today?</button>
        {preferenceStatus === 'error' && <button type="button" onClick={retryPreferences} className="min-h-10 text-sm text-red-700 underline">Retry calendar connection</button>}
        <button type="button" onClick={openImport} aria-label="School items to check" aria-describedby={pendingReview ? 'school-review-count' : undefined} aria-expanded={showImport} className="inline-flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-medium dark:border-slate-700"><Import className="h-4 w-4" />School items to check {pendingReview !== null && pendingReview > 0 && <span id="school-review-count" title={`${pendingReview} items from ${pendingReviewEmails ?? 'your'} school emails need checking`} className="rounded bg-amber-100 px-1.5 text-xs text-amber-900">{pendingReview}</span>}{showImport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
        <button type="button" onClick={openTemplateManager} title="Event templates" aria-label="Event templates" className="min-h-10 rounded-md border border-gray-200 p-2.5 dark:border-slate-700"><LayoutGrid className="h-4 w-4" /></button>
        <button type="button" onClick={openConflictSettings} title="Conflict rules" aria-label="Conflict rules" className="min-h-10 rounded-md border border-gray-200 p-2.5 dark:border-slate-700"><Settings className="h-4 w-4" /></button>
      </div>
    </header>
    {waitingSources > 0 && <button onClick={openImport} className="min-h-10 px-4 text-left text-xs text-gray-500">{waitingSources} updates waiting for original content · separate from decisions</button>}
    <BinCollectionStrip familyId={familyId} onSynced={refreshEvents} />
    {sourceWarnings.length > 0 && <section aria-label="Imported plans to confirm" className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm dark:bg-sky-950/30"><details>
      <summary className="min-h-10 cursor-pointer py-2 font-medium">{sourceWarnings.length} imported plan{sourceWarnings.length === 1 ? '' : 's'} need confirmation</summary>
      {sourceWarnings.map(event => <div key={event.id} className="flex flex-wrap items-center gap-2 border-t border-sky-100 py-3">
        <div className="min-w-0 flex-1"><strong>{event.title}</strong><p className="text-xs">{event.date} · {String((event.metadata?.schoolImportReview as { reason?: string })?.reason || '')} Held outside your confirmed calendar.</p></div>
        <button onClick={() => eventEditor.open(event)} className="min-h-11 px-2 text-teal-700 underline">Review details</button>
        <button disabled={Boolean(confirmingSource)} onClick={async () => {
          setConfirmingSource(event.id);
          try {
            const response = await fetch(`/api/families/${familyId}/calendar-intake/inbox`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'confirm-plan', eventId: event.id, expectedUpdatedAt: new Date(event.updatedAt).toISOString() }),
            });
            if (!response.ok) throw new Error('Confirmation failed');
            await refreshEvents(); toast.success('Plan confirmed');
          } catch { toast.error('Could not confirm this plan. Please retry.'); }
          finally { setConfirmingSource(null); }
        }} className="inline-flex min-h-11 items-center gap-1 px-2 font-medium text-teal-700"><Check className="h-4 w-4" />Confirm my plan</button>
      </div>)}
    </details></section>}
    {dateWarnings.length > 0 && <section aria-label="School dates to confirm" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"><details>
      <summary className="cursor-pointer py-1 font-medium">{dateWarnings.length} school date{dateWarnings.length === 1 ? '' : 's'} to confirm</summary>
      {dateWarnings.map((event) => <button key={event.id} onClick={() => eventEditor.open(event)} className="block min-h-10 w-full text-left"><strong>{event.title}: check school date</strong><span className="mt-1 block text-xs">{recurringSourceDateWarning(event)} Held from the calendar until confirmed.</span></button>)}
    </details></section>}
    {eventEditor.loading && <p role="status" className="px-4 py-2 text-sm">Loading current event details...</p>}
    {eventEditor.error && <div role="alert" className="flex items-center gap-3 px-4 py-2 text-sm text-amber-800 dark:text-amber-200"><span>{eventEditor.error}</span><button onClick={eventEditor.retry} className="min-h-11 underline">Retry</button></div>}
    {showImport && <section ref={importRef} className="scroll-mt-4 border-t border-gray-200 dark:border-slate-800" aria-label="School inbox and import">
      {Object.keys(reviewReasons).length > 0 && <p className="px-4 pt-4 text-sm text-gray-600">{Object.entries(reviewReasons).filter(([, count]) => count > 0).map(([reason, count]) => `${count} ${reason}`).join(' · ')}</p>}
      <CalendarCopilotPanel events={confirmedDateEvents} tasks={tasks} people={people} currentDate={currentDate} createEvent={createEvent} createTask={createTask} onOpenCalendar={() => setCurrentDate(currentDate)} onEventsImported={refreshPlanning} onInboxChanged={(count, emails, waiting) => { setPendingReview(count); setPendingReviewEmails(emails); setWaitingSources(waiting ?? 0); }} />
    </section>}
    <div className="grid min-w-0 gap-5 px-3 py-4 sm:px-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CalendarMain events={confirmedDateEvents} tasks={tasks} onTaskToggle={(id, occurrenceDate) => { void toggleTaskComplete(id, undefined, occurrenceDate).catch(() => toast.error('Could not update this reminder. Please try again.')); }} people={people} onEventClick={eventEditor.open} onEventCreate={openCreateForm}
          onEventUpdate={updateEvent} onEventDelete={deleteEvent} currentDate={currentDate} onDateChange={setCurrentDate}
          onTemplateManage={openTemplateManager} onConflictSettings={openConflictSettings} onEventsSync={handleEventsSync} />
      </div>
      <aside className="flex min-w-0 flex-col gap-5">
        <section className="order-3 border-t border-gray-200 pt-5 dark:border-slate-800" aria-label="Quick add event">
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
        <UpcomingPlans events={confirmedDateEvents} tasks={tasks} date={dateKey} people={people} hidden={preferences.hiddenUpcoming} ready={preferenceStatus === 'saved' || preferenceStatus === 'saving'} onPreference={updatePreference} onOpen={eventEditor.open} onComplete={(id, occurrenceDate) => { void toggleTaskComplete(id, undefined, occurrenceDate).catch(() => toast.error('Could not update this reminder.')); }} />
        <section className="order-2 border-t border-gray-200 pt-5 dark:border-slate-800" aria-label="Schedule check">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-5 w-5 text-teal-600" />Schedule check</h3></div>
            <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-300">Next 7 days</span>
          </div>
          {scheduleInsights.length ? <div className="mt-3 divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-slate-800 dark:border-slate-700">{scheduleInsights.slice(0, 5).map((insight) => {
            const Icon = insight.kind === 'conflict' || insight.kind === 'coverage' ? AlertTriangle : insight.kind === 'time' ? Clock3 : UserRoundCheck;
            const event = upcomingEvents.find((item) => item.id === insight.eventId && (!insight.occurrenceDate || item.date === insight.occurrenceDate));
            return <div key={insight.id} className="px-3 py-3">
              <button type="button" onClick={() => event && eventEditor.open(event)} className="flex min-h-11 w-full items-start gap-3 text-left">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${['conflict', 'coverage', 'availability'].includes(insight.kind) ? 'text-amber-600' : 'text-teal-600'}`} />
                <span className="min-w-0"><strong className="block text-sm">{insight.title}</strong><span className="mt-0.5 block text-xs text-gray-500 dark:text-slate-400">{insight.detail}</span><span className="mt-1 block text-xs font-semibold text-teal-700">{insight.kind === 'coverage' ? 'Confirm cover' : 'Review details'}</span></span>
              </button>
              {insight.relatedEventIds && <div className="ml-7 flex flex-wrap gap-x-3">{insight.relatedEventIds.map(id => {
                const plan = upcomingEvents.find(item => item.id === id && (!insight.occurrenceDate || item.date === insight.occurrenceDate)) ?? upcomingEvents.find(item => item.id === id);
                return plan && <button key={id} type="button" onClick={() => eventEditor.open(plan)} className="min-h-10 text-left text-xs font-semibold text-teal-700 underline">Edit {plan.title}</button>;
              })}</div>}
              {['conflict', 'availability'].includes(insight.kind) && <button type="button" disabled={preferenceStatus !== 'saved'} onClick={() => void updatePreference({ action: 'accept-overlap', insightId: insight.id }).catch(() => toast.error('Could not save. Please retry.'))} className="ml-7 min-h-10 text-xs font-semibold text-teal-700 underline disabled:opacity-50">These can overlap</button>}
            </div>;
          })}</div> : <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">No clashes or missing details found in saved events this week.</p>}
        </section>
      </aside>
    </div>
    {travelEvent && <WorkStatusManager event={travelEvent} people={people} events={events}
      onClose={() => setTravelEvent(null)} onAddWorkEvent={async (draft) => {
        const result = await updateEvent(travelEvent.id, draft);
        if (result === 'conflict') throw new Error('Resolve the event conflict before saving travel details.');
      }} />}
    <div role="status" className="px-4 py-2 text-xs text-gray-500">{preferenceStatus === 'error' ? <>Calendar choices could not sync. <button onClick={retryPreferences} className="min-h-10 font-semibold underline">Retry</button></> : preferenceStatus === 'saving' ? 'Saving your calendar choices...' : preferenceStatus === 'saved' ? 'Calendar choices saved' : ''}</div>
    {showPresence && <QuickPresenceDialog people={people} date={todayKey} memberId={preferences.memberId} lastPlace={preferences.lastPlace} onClose={() => setShowPresence(false)} onSave={async (draft) => {
      const result = await createEvent(draft);
      if (result.status === 'conflict') return 'conflict';
      const place = draft.workStatus?.type === 'office' ? 'office' : draft.workStatus?.type === 'remote' ? 'home' : 'other';
      void updatePreference({ action: 'place', place: { place, customPlace: place === 'other' ? draft.location || '' : '' } }).catch(() => toast.error('Location saved, but the shortcut preference could not sync.'));
      setCurrentDate(new Date(`${draft.date}T12:00:00`));
      toast.success(`${people.find((person) => person.id === draft.person)?.name ?? 'Family member'} location added.`);
      return 'created';
    }} />}
  </div>;
};
