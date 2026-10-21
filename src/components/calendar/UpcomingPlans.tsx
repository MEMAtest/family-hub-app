'use client';
import { useState } from 'react';
import { CalendarDays, X, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CalendarEvent, CalendarTask, Person } from '@/types/calendar.types';
import { weeklyCalendarPriorities } from '@/utils/weeklyCalendarPriorities';
import { hasUnspecifiedEventTime } from '@/utils/eventSemantics';
import { schoolEventTitle } from '@/utils/schoolEventPresentation';
import type { CalendarPreferenceAction } from '@/lib/calendarPreferences';
import { addDays } from '@/utils/recurrence';
import { eventPeopleLabel } from '@/utils/schoolEventPeople';

type Props = {
  events: CalendarEvent[]; tasks: CalendarTask[]; date: string; people: Person[];
  hidden: string[]; ready: boolean; onPreference: (action: CalendarPreferenceAction) => Promise<void>;
  onOpen: (event: CalendarEvent) => void;
  onComplete: (id: string, occurrenceDate?: string) => void;
};

export function UpcomingPlans({ events, tasks, date, people, hidden, ready, onPreference, onOpen, onComplete }: Props) {
  const [showHidden, setShowHidden] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
  const entries = weeklyCalendarPriorities(events, tasks, date, Infinity).filter(entry => entry.kind !== 'event' ||
    !(entry.occurrence.event.metadata?.binCollection || entry.occurrence.event.sourceId === 'council-bin-calendar') || entry.date <= addDays(today, 1));
  const visible = showHidden ? entries : entries.filter(entry => !hidden.includes(entry.occurrence.occurrenceId)).slice(0, 8);
  const hiddenCount = entries.filter(entry => hidden.includes(entry.occurrence.occurrenceId)).length;
  const change = async (id: string, restore: boolean) => {
    setBusy(id);
    try {
      await onPreference({ action: restore ? 'restore' : 'hide', occurrenceId: id });
      if (!restore) toast(t => <span className="flex items-center gap-3">Hidden from Coming up<button className="min-h-10 font-semibold underline" onClick={() => { toast.dismiss(t.id); void change(id, true); }}>Undo</button></span>);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save. Please retry.'); }
    finally { setBusy(null); }
  };
  return <section className="order-1" aria-label="Upcoming this week">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-base font-semibold"><CalendarDays className="h-5 w-5 text-violet-500" />Coming up this week</h3>{hiddenCount > 0 && <button onClick={() => setShowHidden(value => !value)} className="min-h-10 text-xs font-medium text-teal-700 underline">{showHidden ? 'Hide dismissed' : `Show hidden (${hiddenCount})`}</button>}</div>
    {!ready && <p role="status" className="text-xs text-gray-500">Loading your calendar choices...</p>}
    {visible.length ? <div className="divide-y divide-gray-200 dark:divide-slate-800">{visible.map(entry => {
      const id = entry.occurrence.occurrenceId;
      const isHidden = hidden.includes(id);
      const title = entry.kind === 'event' ? entry.occurrence.event.source === 'gmail-school-email' ? schoolEventTitle(entry.occurrence.event.title) : entry.occurrence.event.title : entry.occurrence.task.title;
      const names = entry.kind === 'event' ? eventPeopleLabel(entry.occurrence.event, people) : entry.occurrence.task.assignees.map(id => people.find(p => p.id === id)?.name).filter(Boolean).join(', ');
      return <div key={`${entry.kind}:${id}`} className={`flex items-start gap-2 py-3 ${isHidden ? 'opacity-60' : ''}`}>
        {entry.kind === 'task' ? <label className="flex min-h-11 min-w-0 flex-1 items-start gap-3 text-sm"><input type="checkbox" aria-label={`Complete ${title} on ${entry.occurrence.assignedDate}`} checked={Boolean(entry.occurrence.completedAt)} onChange={() => onComplete(entry.occurrence.task.id, entry.occurrence.isRecurring ? entry.occurrence.assignedDate : undefined)} className="mt-1 h-5 w-5" /><span className="min-w-0"><strong className="block">{title}</strong><span className="mt-1 block text-xs text-gray-500">Due {entry.date} · {names || 'Family'} · Reminder</span></span></label> : <button type="button" onClick={() => { const item = entry.occurrence; onOpen({ ...item.event, date: item.date, time: item.time, duration: item.duration, endDate: item.endDate, occurrenceDate: item.date, seriesStartDate: item.isRecurring ? item.event.date : undefined }); }} className="flex min-h-11 min-w-0 flex-1 items-start gap-3 text-left"><span className="w-10 shrink-0 text-center text-xs text-gray-500">{new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(`${entry.date}T12:00:00`))}<strong className="mt-1 block text-base">{entry.date.slice(8)}</strong></span><span className="min-w-0"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs text-gray-500">{hasUnspecifiedEventTime(entry.occurrence.event) ? 'Time not provided' : entry.time} · {names || 'Family'}</span></span></button>}
        <button type="button" disabled={!ready || busy === id} title={isHidden ? `Restore ${title}` : `Hide ${title} from Coming up`} aria-label={isHidden ? `Restore ${title}` : `Hide ${title} from Coming up`} onClick={() => void change(id, isHidden)} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40">{isHidden ? <Undo2 className="h-4 w-4" /> : <X className="h-4 w-4" />}</button>
      </div>;
    })}</div> : <p className="text-sm text-gray-500">No upcoming plans to show.</p>}
  </section>;
}
