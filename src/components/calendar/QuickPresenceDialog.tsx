'use client';

import { useMemo, useState } from 'react';
import { Building2, Home, MapPin, X } from 'lucide-react';
import type { CalendarEvent, Person, WorkStatus } from '@/types/calendar.types';
import {
  durationMinutesBetween,
  presenceTimeRange,
  type PresenceDurationPreset,
} from '@/utils/presenceSchedule';

type PlacePreset = 'office' | 'home' | 'other';

type QuickPresenceDialogProps = {
  people: Person[];
  date: string;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<'created' | 'conflict'>;
};

const places: Array<{ id: PlacePreset; label: string; icon: typeof Building2 }> = [
  { id: 'office', label: 'Office', icon: Building2 },
  { id: 'home', label: 'Home', icon: Home },
  { id: 'other', label: 'Other place', icon: MapPin },
];

const durations: Array<{ id: Exclude<PresenceDurationPreset, 'custom'>; label: string }> = [
  { id: 'all-day', label: 'Working day' },
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'until-5', label: 'Until 5pm' },
];

export function QuickPresenceDialog({ people, date, onClose, onSave }: QuickPresenceDialogProps) {
  const defaultPerson = people.find((person) => person.ageGroup === 'Adult' || person.role === 'Parent') ?? people[0];
  const [personId, setPersonId] = useState(defaultPerson?.id ?? '');
  const [presenceDate, setPresenceDate] = useState(date);
  const [place, setPlace] = useState<PlacePreset>('office');
  const [customPlace, setCustomPlace] = useState('');
  const [durationPreset, setDurationPreset] = useState<PresenceDurationPreset>('all-day');
  const initialRange = useMemo(() => presenceTimeRange('all-day'), []);
  const [start, setStart] = useState(initialRange.start);
  const [end, setEnd] = useState(initialRange.end);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const chooseDuration = (preset: Exclude<PresenceDurationPreset, 'custom'>) => {
    const range = presenceTimeRange(preset);
    setDurationPreset(preset);
    setStart(range.start);
    setEnd(range.end);
  };

  const handleSave = async () => {
    if (!personId) return setError('Choose who this is for.');
    if (!presenceDate) return setError('Choose a day.');
    if (place === 'other' && !customPlace.trim()) return setError('Add the place name.');
    if (!start || !end || end <= start) return setError('End time must be after start time.');
    const selectedPerson = people.find((person) => person.id === personId);
    const location = place === 'office' ? 'Office' : place === 'home' ? 'Home' : customPlace.trim();
    const workType: WorkStatus['type'] = place === 'office' ? 'office' : place === 'home' ? 'remote' : 'client_site';
    const title = place === 'office' ? 'Going to the office' : place === 'home' ? 'Working from home' : `At ${location}`;

    setSaving(true);
    setError('');
    try {
      const result = await onSave({
        title,
        person: personId,
        date: presenceDate,
        time: start,
        duration: durationMinutesBetween(start, end),
        location,
        recurring: 'none',
        cost: 0,
        type: 'work',
        notes: `${selectedPerson?.name ?? 'Family member'} marked their location from Quick presence.`,
        isRecurring: false,
        priority: 'medium',
        status: 'confirmed',
        workStatus: { type: workType, location, affectsPickup: false },
        metadata: { quickPresence: true, durationPreset },
        reminders: [],
        attendees: [],
      });
      if (result === 'conflict') {
        setError('This overlaps another plan for the same person. Check the calendar before saving.');
        return;
      }
      onClose();
    } catch {
      setError('Could not save this location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[110] flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="quick-presence-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white p-4 shadow-xl dark:bg-slate-900 sm:max-w-lg sm:rounded-lg sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div><h2 id="quick-presence-title" className="text-lg font-semibold">Where are you today?</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Share a location in a few taps.</p></div>
        <button type="button" onClick={onClose} aria-label="Close quick presence" className="min-h-11 min-w-11 rounded-md p-2"><X className="h-5 w-5" /></button>
      </header>

      <div className="mt-5 space-y-5">
        <label className="block text-sm font-medium">Who
          <select aria-label="Presence person" value={personId} onChange={(event) => setPersonId(event.target.value)} className="mt-1 min-h-12 w-full rounded-md border border-gray-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Day
          <input required aria-label="Presence date" type="date" value={presenceDate} onChange={(event) => setPresenceDate(event.target.value)} className="mt-1 min-h-12 w-full rounded-md border border-gray-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
        </label>

        <fieldset><legend className="text-sm font-medium">Place</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">{places.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={place === id} onClick={() => setPlace(id)} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border px-2 text-sm font-medium ${place === id ? 'border-teal-700 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-100' : 'border-gray-200 dark:border-slate-700'}`}><Icon className="h-5 w-5" />{label}</button>)}</div>
        </fieldset>
        {place === 'other' && <label className="block text-sm font-medium">Place name
          <input autoFocus aria-label="Custom place" value={customPlace} onChange={(event) => setCustomPlace(event.target.value)} placeholder="Client, café, site or town" className="mt-1 min-h-12 w-full rounded-md border border-gray-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
        </label>}

        <fieldset><legend className="text-sm font-medium">How long?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{durations.map(({ id, label }) => <button key={id} type="button" aria-pressed={durationPreset === id} onClick={() => chooseDuration(id)} className={`min-h-11 rounded-md border px-2 text-sm ${durationPreset === id ? 'border-teal-700 bg-teal-50 font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-100' : 'border-gray-200 dark:border-slate-700'}`}>{label}</button>)}</div>
          <button type="button" aria-pressed={durationPreset === 'custom'} onClick={() => setDurationPreset('custom')} className={`mt-2 min-h-11 w-full rounded-md border px-3 text-sm ${durationPreset === 'custom' ? 'border-teal-700 bg-teal-50 font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-100' : 'border-gray-200 dark:border-slate-700'}`}>Custom time</button>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">Start<input aria-label="Presence start time" type="time" step="900" value={start} onChange={(event) => { setStart(event.target.value); setDurationPreset('custom'); }} className="mt-1 min-h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" /></label>
          <label className="text-sm font-medium">End<input aria-label="Presence end time" type="time" step="900" value={end} onChange={(event) => { setEnd(event.target.value); setDurationPreset('custom'); }} className="mt-1 min-h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950" /></label>
        </div>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <button type="button" disabled={saving || !people.length} onClick={handleSave} className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : presenceDate === date ? 'Add to today' : 'Add location'}</button>
      </div>
    </section>
  </div>;
}
