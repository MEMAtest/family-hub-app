'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, CalendarDays, Check, Clock3, Download, HeartPulse, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';

type CyclePeriod = { id: string; startDate: string; endDate?: string | null; notes?: string | null };
type CycleLog = { id: string; logDate: string; flow?: string | null; mood?: string | null; energy?: number | null; painLevel?: number | null; sleepHours?: number | null; medication?: string | null; notes?: string | null; symptoms?: string[] | null };
type CycleReminder = { id: string; reminderType: string; daysBefore: number; timeOfDay?: string | null; enabled: boolean };
type CycleData = {
  periods: CyclePeriod[];
  logs: CycleLog[];
  reminders: CycleReminder[];
  profile?: { reminderEnabled: boolean; reminderTime?: string | null; personalCalendarEnabled: boolean } | null;
  calendarConnection?: { googleUserEmail?: string | null; selectedCalendarName?: string | null; enabled: boolean } | null;
  insights: { averageCycleLength?: number | null; averagePeriodLength?: number | null; predictedNextPeriod?: string | null; confidence: string; irregular: boolean; loggedCycles: number };
};

type DailyCheckIn = { logDate: string; flow: string; mood: string; energy: number; painLevel: number; sleepHours: number; medication: string; notes: string; symptoms: string[] };
type ReminderDraft = { enabled: boolean; daysBefore: number; timeOfDay: string };
type PeriodDraft = { startDate: string; endDate: string; notes: string };

const flowOptions = ['None', 'Spotting', 'Light', 'Medium', 'Heavy'];
const moodOptions = ['Low', 'Flat', 'Steady', 'Good', 'Great'];
const symptomOptions = ['Cramps', 'Headache', 'Bloating', 'Tenderness', 'Fatigue'];
const reminderLabels: Record<string, { title: string; detail: string }> = {
  period: { title: 'Period estimate', detail: 'A private prompt before the next estimate.' },
  wellbeing: { title: 'Daily check-in', detail: 'A gentle prompt to capture how you feel.' },
  supplies: { title: 'Supplies', detail: 'A private reminder to prepare what you need.' },
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const dateKey = (value: string | Date) => new Date(value).toISOString().slice(0, 10);
const isoDate = (value: string | Date | null | undefined) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Still learning';
const shortDate = (value: Date) => value.toLocaleDateString('en-GB', { day: 'numeric' });
const weekday = (value: Date) => value.toLocaleDateString('en-GB', { weekday: 'narrow' });
const dateRange = (period: CyclePeriod) => `${isoDate(period.startDate)}${period.endDate ? ` to ${isoDate(period.endDate)}` : ' · In progress'}`;
const emptyDaily = (logDate = todayKey()): DailyCheckIn => ({ logDate, flow: '', mood: '', energy: 3, painLevel: 0, sleepHours: 7, medication: '', notes: '', symptoms: [] });
const dailyFromLog = (log: CycleLog | undefined, logDate: string): DailyCheckIn => log ? {
  logDate,
  flow: log.flow || '',
  mood: log.mood || '',
  energy: log.energy ?? 3,
  painLevel: log.painLevel ?? 0,
  sleepHours: log.sleepHours ?? 7,
  medication: log.medication || '',
  notes: log.notes || '',
  symptoms: log.symptoms || [],
} : emptyDaily(logDate);
const periodDraft = (period?: CyclePeriod | null): PeriodDraft => ({
  startDate: period ? dateKey(period.startDate) : todayKey(),
  endDate: period?.endDate ? dateKey(period.endDate) : '',
  notes: period?.notes || '',
});

const rangeField = (label: string, value: number, min: number, max: number, onChange: (value: number) => void, text: string) => <div>
  <div className="flex items-baseline justify-between gap-3"><label className="text-sm font-semibold text-[#18221f] dark:text-slate-100">{label}</label><output className="text-sm font-semibold text-[#b84368]">{text}</output></div>
  <input aria-label={label} type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 h-2 w-full cursor-pointer accent-[#d8527d]" />
</div>;

export const CycleView = () => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const [data, setData] = useState<CycleData | null>(null);
  const [hasCycleAccess, setHasCycleAccess] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [showPeriod, setShowPeriod] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<CyclePeriod | null>(null);
  const [periodForm, setPeriodForm] = useState<PeriodDraft>(() => periodDraft());
  const [busy, setBusy] = useState(false);
  const [daily, setDaily] = useState<DailyCheckIn>(() => emptyDaily());
  const [reminders, setReminders] = useState<Record<string, ReminderDraft>>({});
  const checkInRequestRef = useRef(0);

  const load = async () => {
    if (!familyId) return;
    try {
      const [authResponse, cycleResponse] = await Promise.all([fetch('/api/auth/me'), fetch(`/api/families/${familyId}/cycles`)]);
      const auth = await authResponse.json();
      const canAccessCycle = Boolean(auth?.familyMember?.privateCycleAccess);
      setHasCycleAccess(canAccessCycle);
      if (!canAccessCycle) {
        setData(null);
        return;
      }
      if (!cycleResponse.ok) throw new Error((await cycleResponse.json()).error || 'Could not load private cycle data.');
      const nextData = await cycleResponse.json() as CycleData;
      setData(nextData);
      setDaily((current) => {
        const selectedDate = current.logDate || todayKey();
        return dailyFromLog(nextData.logs.find((log) => dateKey(log.logDate) === selectedDate), selectedDate);
      });
      const reminderMap = Object.fromEntries(Object.keys(reminderLabels).map((type) => {
        const existing = nextData.reminders.find((reminder) => reminder.reminderType === type);
        return [type, { enabled: existing?.enabled ?? type === 'period', daysBefore: existing?.daysBefore ?? (type === 'period' ? 1 : 0), timeOfDay: existing?.timeOfDay || nextData.profile?.reminderTime || '20:00' }];
      }));
      setReminders(reminderMap);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not load private cycle data.');
    }
  };

  useEffect(() => { void load(); }, [familyId]);

  const timelineDays = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, []);

  const periodAt = (day: Date) => data?.periods.find((period) => {
    const key = dateKey(day);
    return key >= dateKey(period.startDate) && key <= dateKey(period.endDate || period.startDate);
  });

  const loadDailyForDate = async (logDate: string) => {
    if (!familyId) return;
    const requestId = ++checkInRequestRef.current;
    setDaily(emptyDaily(logDate));
    try {
      const response = await fetch(`/api/families/${familyId}/cycles?logDate=${encodeURIComponent(logDate)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load that private check-in.');
      const fallbackLog = Array.isArray(body.logs) ? body.logs.find((log: CycleLog) => dateKey(log.logDate) === logDate) : undefined;
      if (requestId === checkInRequestRef.current) setDaily(dailyFromLog(body.dailyLog || fallbackLog, logDate));
    } catch (reason) {
      if (requestId === checkInRequestRef.current) setNotice(reason instanceof Error ? reason.message : 'Could not load that private check-in.');
    }
  };

  const selectDailyDate = (logDate: string) => {
    void loadDailyForDate(logDate);
  };

  const openPeriodForm = (period?: CyclePeriod) => {
    setEditingPeriod(period || null);
    setPeriodForm(periodDraft(period));
    setShowPeriod(true);
  };

  const closePeriodForm = () => {
    setShowPeriod(false);
    setEditingPeriod(null);
    setPeriodForm(periodDraft());
  };

  const saveDaily = async () => {
    if (!familyId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/families/${familyId}/cycles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'daily-log', ...daily }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save your daily check-in.');
      setNotice('Private daily check-in saved.');
      await load();
      await loadDailyForDate(daily.logDate);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not save your daily check-in.');
    } finally {
      setBusy(false);
    }
  };

  const savePeriod = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!familyId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/families/${familyId}/cycles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingPeriod ? 'update-period' : 'period',
          ...(editingPeriod ? { id: editingPeriod.id } : {}),
          ...periodForm,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save your period.');
      closePeriodForm();
      setNotice(editingPeriod ? 'Private period updated.' : 'Period saved privately.');
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not save your private period.');
    } finally {
      setBusy(false);
    }
  };

  const saveReminder = async (type: string) => {
    if (!familyId || !reminders[type]) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/families/${familyId}/cycles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reminder', reminderType: type, ...reminders[type] }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save this reminder.');
      setNotice(`${reminderLabels[type].title} reminder updated.`);
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not save this reminder.');
    } finally {
      setBusy(false);
    }
  };

  const updateSettings = async (personalCalendarEnabled: boolean) => {
    if (!familyId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/families/${familyId}/cycles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'settings', reminderEnabled: true, reminderTime: data?.profile?.reminderTime || '20:00', personalCalendarEnabled }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not update preferences.');
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not update preferences.');
    } finally {
      setBusy(false);
    }
  };

  const connectPrivateCalendar = async () => {
    if (!familyId) return;
    const popup = window.open('', 'family-hub-private-calendar', 'width=560,height=720');
    if (!popup) { setNotice('Allow pop-ups to connect your private Google Calendar.'); return; }
    try {
      const response = await fetch(`/api/families/${familyId}/cycles/calendar/connect`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not start the private calendar connection.');
      popup.location.href = body.authUrl;
      const handleResult = (event: MessageEvent<{ type?: string; message?: string }>) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'google_calendar_auth_success') { window.removeEventListener('message', handleResult); void load(); }
        if (event.data?.type === 'google_calendar_auth_error') { window.removeEventListener('message', handleResult); setNotice(event.data.message || 'Could not connect your private Google Calendar.'); }
      };
      window.addEventListener('message', handleResult);
    } catch (reason) {
      popup.close();
      setNotice(reason instanceof Error ? reason.message : 'Could not start the private calendar connection.');
    }
  };

  const deletePeriod = async (period: CyclePeriod) => {
    if (!familyId || !window.confirm(`Remove the private period starting ${isoDate(period.startDate)}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/families/${familyId}/cycles?resource=period&id=${period.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not remove this period.');
      setNotice('Private period removed.');
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not remove this period.');
    } finally {
      setBusy(false);
    }
  };

  const deleteAll = async () => {
    if (!familyId || !window.confirm('Delete all private cycle records from Family Hub? This cannot be undone.')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/families/${familyId}/cycles?resource=all`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not delete private data.');
      setNotice('All private cycle data has been deleted.');
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not delete private data.');
    } finally {
      setBusy(false);
    }
  };

  const toggleSymptom = (symptom: string) => setDaily((current) => ({ ...current, symptoms: current.symptoms.includes(symptom) ? current.symptoms.filter((item) => item !== symptom) : [...current.symptoms, symptom] }));

  if (!familyId) return <div className="p-6 text-sm text-slate-500">Loading private health area...</div>;
  if (hasCycleAccess === null && !data) return <div className="p-6 text-sm text-slate-500">Loading private health area...</div>;
  if (!hasCycleAccess) return <div className="flex min-h-[60vh] items-center justify-center bg-[#f6f7f3] p-6 dark:bg-slate-950"><div className="max-w-sm text-center"><ShieldCheck className="mx-auto h-8 w-8 text-[#d8527d]" /><h1 className="mt-4 font-serif text-3xl">This is another profile&apos;s private area.</h1><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Health and cycle details stay with the profile they belong to.</p></div></div>;

  return <div className="min-h-full bg-[#fbf7f8] px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#eddde3] pb-5 dark:border-slate-800"><div><p className="text-sm font-semibold text-[#d8527d]">Private health area</p><h1 className="mt-1 font-serif text-3xl">Health &amp; Cycle</h1><p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">A calm private timeline, gentle reminders, and your own wellbeing patterns.</p></div><button type="button" onClick={() => openPeriodForm()} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#d8527d] px-3 text-sm font-semibold text-white hover:bg-[#bb3d65]"><Plus className="h-4 w-4" />Log period</button></header>
    {notice && <p role="status" className="mt-4 border border-[#e5becd] bg-white p-3 text-sm text-[#18221f] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{notice}</p>}
    {data && <><section className="mt-6 grid gap-px overflow-hidden border border-[#eddde3] bg-[#eddde3] sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">{[['Next period', isoDate(data.insights.predictedNextPeriod)], ['Average cycle', data.insights.averageCycleLength ? `${data.insights.averageCycleLength} days` : 'Log 3 cycles'], ['Average period', data.insights.averagePeriodLength ? `${data.insights.averagePeriodLength} days` : 'Still learning'], ['History', `${data.insights.loggedCycles} logged`]].map(([label, value]) => <div key={label} className="bg-white p-4 dark:bg-slate-900"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>)}</section><p className="mt-3 text-xs text-slate-500">Period estimates become more useful with consistent history. They are not medical advice or contraception guidance.</p>
      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]"><div><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#d8527d]" /><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Private timeline</h2></div><div className="mt-3 border border-[#eddde3] bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1">{timelineDays.map((day) => { const key = dateKey(day); const period = periodAt(day); const predicted = data.insights.predictedNextPeriod && key === dateKey(data.insights.predictedNextPeriod); const currentMonth = day.getMonth() === new Date().getMonth(); const today = key === todayKey(); return <div key={key} title={period ? `Period: ${dateRange(period)}` : predicted ? 'Estimated next period' : undefined} className={`flex aspect-square items-center justify-center border text-sm ${period ? 'border-[#d8527d] bg-[#fbe9ef] font-semibold text-[#a43659] dark:bg-rose-950/30 dark:text-rose-200' : predicted ? 'border-dashed border-[#d8527d] text-[#b84368]' : 'border-transparent'} ${today ? 'ring-1 ring-[#18221f] ring-offset-1 dark:ring-slate-100 dark:ring-offset-slate-900' : ''} ${currentMonth ? '' : 'text-slate-300 dark:text-slate-700'}`}>{shortDate(day)}</div>; })}</div><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><i className="h-3 w-3 border border-[#d8527d] bg-[#fbe9ef]" /> Logged period</span><span className="inline-flex items-center gap-1"><i className="h-3 w-3 border border-dashed border-[#d8527d]" /> Estimate</span></div></div></div>
      <div><div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-[#d8527d]" /><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Daily check-in</h2></div><div className="mt-3 border border-[#eddde3] bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{daily.logDate === todayKey() ? 'Today' : 'Check-in for'}, {isoDate(daily.logDate)}</p><input aria-label="Check-in date" type="date" value={daily.logDate} onChange={(event) => selectDailyDate(event.target.value)} className="h-9 rounded-md border border-slate-300 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div><p className="mt-2 text-xs text-slate-500">Choosing a previous date loads its saved check-in before you make changes.</p><div className="mt-4"><p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Flow</p><div className="mt-2 flex flex-wrap gap-2">{flowOptions.map((option) => <button key={option} type="button" aria-pressed={daily.flow === option} onClick={() => setDaily({ ...daily, flow: daily.flow === option ? '' : option })} className={`h-8 border px-3 text-xs font-semibold ${daily.flow === option ? 'border-[#d8527d] bg-[#fbe9ef] text-[#a43659] dark:bg-rose-950/30 dark:text-rose-200' : 'border-[#eddde3] text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{option}</button>)}</div></div><div className="mt-4"><p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mood</p><div className="mt-2 flex flex-wrap gap-2">{moodOptions.map((option) => <button key={option} type="button" aria-pressed={daily.mood === option} onClick={() => setDaily({ ...daily, mood: daily.mood === option ? '' : option })} className={`h-8 border px-3 text-xs font-semibold ${daily.mood === option ? 'border-[#d8527d] bg-[#fbe9ef] text-[#a43659] dark:bg-rose-950/30 dark:text-rose-200' : 'border-[#eddde3] text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{option}</button>)}</div></div><div className="mt-5 space-y-5">{rangeField('Energy', daily.energy, 1, 5, (energy) => setDaily({ ...daily, energy }), `${daily.energy}/5`)}{rangeField('Pain', daily.painLevel, 0, 10, (painLevel) => setDaily({ ...daily, painLevel }), daily.painLevel ? `${daily.painLevel}/10` : 'None')}{rangeField('Sleep', daily.sleepHours, 0, 12, (sleepHours) => setDaily({ ...daily, sleepHours }), `${daily.sleepHours} hours`)}</div><div className="mt-5"><p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Symptoms</p><div className="mt-2 flex flex-wrap gap-2">{symptomOptions.map((symptom) => <button key={symptom} type="button" aria-pressed={daily.symptoms.includes(symptom)} onClick={() => toggleSymptom(symptom)} className={`h-8 border px-3 text-xs font-semibold ${daily.symptoms.includes(symptom) ? 'border-[#d8527d] bg-[#fbe9ef] text-[#a43659] dark:bg-rose-950/30 dark:text-rose-200' : 'border-[#eddde3] text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{daily.symptoms.includes(symptom) && <Check className="mr-1 inline h-3 w-3" />}{symptom}</button>)}</div></div><input value={daily.medication} onChange={(event) => setDaily({ ...daily, medication: event.target.value })} placeholder="Medication or supplements, optional" className="mt-5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /><textarea value={daily.notes} onChange={(event) => setDaily({ ...daily, notes: event.target.value })} placeholder="Private note, optional" className="mt-3 min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-950" /><button type="button" disabled={busy} onClick={() => void saveDaily()} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 bg-[#d8527d] text-sm font-semibold text-white disabled:opacity-60"><HeartPulse className="h-4 w-4" />Save private check-in</button></div></div></section>
      <section className="mt-6 grid gap-6 lg:grid-cols-2"><div><h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"><Clock3 className="h-4 w-4 text-[#d8527d]" />Period history</h2><div className="mt-3 divide-y divide-[#eddde3] border-y border-[#eddde3] dark:divide-slate-800 dark:border-slate-800">{data.periods.map((period) => <div key={period.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{dateRange(period)}</p>{period.notes && <p className="mt-1 text-xs text-slate-500">{period.notes}</p>}</div><div className="flex shrink-0 items-center gap-1"><button type="button" disabled={busy} onClick={() => openPeriodForm(period)} aria-label={`Edit period starting ${isoDate(period.startDate)}`} title="Edit private period" className="inline-flex h-8 w-8 items-center justify-center text-[#a43659] hover:bg-[#fbe9ef]"><Pencil className="h-4 w-4" /></button><button type="button" disabled={busy} onClick={() => void deletePeriod(period)} aria-label={`Remove period starting ${isoDate(period.startDate)}`} title="Remove private period" className="inline-flex h-8 w-8 items-center justify-center text-[#b84368] hover:bg-[#fff2f6]"><Trash2 className="h-4 w-4" /></button></div></div>)}{!data.periods.length && <p className="py-5 text-sm text-slate-500">Log your first period to start building your private history.</p>}</div><h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Recent check-ins</h2><div className="mt-3 grid gap-px overflow-hidden border border-[#eddde3] bg-[#eddde3] sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-800">{data.logs.slice(0, 6).map((log) => <button key={log.id} type="button" onClick={() => selectDailyDate(dateKey(log.logDate))} aria-label={`Edit check-in for ${isoDate(log.logDate)}`} className="bg-white p-3 text-left hover:bg-[#fff6f8] dark:bg-slate-900 dark:hover:bg-slate-800"><p className="text-sm font-semibold">{isoDate(log.logDate)}</p><p className="mt-1 text-xs text-slate-500">{[log.flow, log.mood, log.painLevel !== null && log.painLevel !== undefined ? `Pain ${log.painLevel}/10` : null, log.energy ? `Energy ${log.energy}/5` : null].filter(Boolean).join(' · ') || 'No symptoms recorded'}</p><span className="mt-2 block text-xs font-semibold text-[#b84368]">Open to edit</span></button>)}{!data.logs.length && <div className="col-span-full bg-white p-5 text-sm text-slate-500 dark:bg-slate-900">Daily check-ins help you recognise your own patterns over time.</div>}</div></div>
      <div><h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"><BellRing className="h-4 w-4 text-[#d8527d]" />Private reminders</h2><div className="mt-3 divide-y divide-[#eddde3] border-y border-[#eddde3] dark:divide-slate-800 dark:border-slate-800">{Object.entries(reminderLabels).map(([type, label]) => { const reminder = reminders[type]; if (!reminder) return null; return <div key={type} className="py-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold">{label.title}</p><p className="mt-1 text-xs text-slate-500">{label.detail}</p></div><input aria-label={`Enable ${label.title} reminder`} type="checkbox" checked={reminder.enabled} onChange={(event) => setReminders({ ...reminders, [type]: { ...reminder, enabled: event.target.checked } })} className="mt-1 h-4 w-4 rounded border-slate-300 text-[#d8527d]" /></div><div className="mt-3 grid grid-cols-[1fr_110px_auto] gap-2"><label className="text-xs text-slate-500">Days before<input aria-label={`${label.title} days before`} type="number" min="0" max="30" value={reminder.daysBefore} onChange={(event) => setReminders({ ...reminders, [type]: { ...reminder, daysBefore: Math.max(0, Number(event.target.value)) } })} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs text-slate-500">Time<input aria-label={`${label.title} reminder time`} type="time" value={reminder.timeOfDay} onChange={(event) => setReminders({ ...reminders, [type]: { ...reminder, timeOfDay: event.target.value } })} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><button type="button" disabled={busy} onClick={() => void saveReminder(type)} className="mt-5 h-9 border border-[#d8527d] px-3 text-xs font-semibold text-[#b84368]">Save</button></div></div>; })}</div><div className="mt-6 border-y border-[#eddde3] py-4 dark:border-slate-800"><label className="flex items-center justify-between gap-3"><span><span className="block text-sm font-semibold">Personal calendar reminders</span><span className="mt-1 block text-xs text-slate-500">Never added to the shared household calendar.</span></span><input type="checkbox" checked={Boolean(data.profile?.personalCalendarEnabled)} disabled={busy} onChange={(event) => void updateSettings(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#d8527d]" /></label>{data.calendarConnection ? <p className="mt-3 text-xs text-[#147c72]">Connected privately to {data.calendarConnection.selectedCalendarName || data.calendarConnection.googleUserEmail}.</p> : <button type="button" onClick={connectPrivateCalendar} className="mt-3 text-xs font-semibold text-[#d8527d] underline">Connect personal Google Calendar</button>}</div><div className="mt-5 flex flex-wrap gap-3"><a href={`/api/families/${familyId}/cycles?export=1`} className="inline-flex h-9 items-center gap-2 border border-slate-300 px-3 text-xs font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900"><Download className="h-4 w-4" />Export my data</a><button type="button" onClick={deleteAll} disabled={busy} className="inline-flex h-9 items-center gap-2 border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Delete private data</button></div></div></section></>}
    {showPeriod && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-6"><form onSubmit={savePeriod} className="w-full max-w-md bg-white p-5 dark:bg-slate-900 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold text-[#d8527d]">Private timeline</p><h2 className="font-serif text-2xl">{editingPeriod ? 'Edit period' : 'Log a period'}</h2></div><button type="button" onClick={closePeriodForm} aria-label="Close period form"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-3"><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Start date<input aria-label="Start date" name="startDate" type="date" required value={periodForm.startDate} onChange={(event) => setPeriodForm({ ...periodForm, startDate: event.target.value })} className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">End date, optional<input aria-label="End date, optional" name="endDate" type="date" value={periodForm.endDate} onChange={(event) => setPeriodForm({ ...periodForm, endDate: event.target.value })} className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><textarea name="notes" value={periodForm.notes} onChange={(event) => setPeriodForm({ ...periodForm, notes: event.target.value })} placeholder="Private note, optional" className="min-h-24 rounded-md border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></div><button disabled={busy} className="mt-5 h-11 w-full bg-[#d8527d] text-sm font-semibold text-white">{editingPeriod ? 'Save period changes' : 'Save private period'}</button></form></div>}
  </div></div>;
};
