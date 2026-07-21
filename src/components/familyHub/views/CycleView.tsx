'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, Download, HeartPulse, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';

type CycleData = {
  periods: Array<{ id: string; startDate: string; endDate?: string | null }>;
  logs: Array<{ id: string; logDate: string; flow?: string | null; mood?: string | null; painLevel?: number | null; symptoms?: string[] | null }>;
  profile?: { reminderEnabled: boolean; reminderTime?: string | null; personalCalendarEnabled: boolean } | null;
  calendarConnection?: { googleUserEmail?: string | null; selectedCalendarName?: string | null; enabled: boolean } | null;
  insights: { averageCycleLength?: number | null; averagePeriodLength?: number | null; predictedNextPeriod?: string | null; fertileWindow?: { start: string; end: string } | null; confidence: string; irregular: boolean; loggedCycles: number };
};

const isoDate = (value: string | Date | null | undefined) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not enough history';

export const CycleView = () => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const [data, setData] = useState<CycleData | null>(null);
  const [profileName, setProfileName] = useState('');
  const [notice, setNotice] = useState('');
  const [showPeriod, setShowPeriod] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!familyId) return;
    try {
      const [authResponse, cycleResponse] = await Promise.all([fetch('/api/auth/me'), fetch(`/api/families/${familyId}/cycles`)]);
      const auth = await authResponse.json();
      setProfileName(auth?.familyMember?.name || '');
      if (!cycleResponse.ok) throw new Error((await cycleResponse.json()).error || 'Could not load private cycle data.');
      setData(await cycleResponse.json());
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not load private cycle data.');
    }
  };

  useEffect(() => { void load(); }, [familyId]);

  const submit = async (event: FormEvent<HTMLFormElement>, action: 'period' | 'daily-log') => {
    event.preventDefault();
    if (!familyId) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await fetch(`/api/families/${familyId}/cycles`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'period' ? { action, startDate: values.get('startDate'), endDate: values.get('endDate'), notes: values.get('notes') } : {
          action,
          logDate: values.get('logDate'),
          flow: values.get('flow'),
          mood: values.get('mood'),
          energy: values.get('energy'),
          painLevel: values.get('painLevel'),
          sleepHours: values.get('sleepHours'),
          medication: values.get('medication'),
          symptoms: String(values.get('symptoms') || '').split(',').map((value) => value.trim()).filter(Boolean),
          notes: values.get('notes'),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save your private entry.');
      setShowPeriod(false); setShowLog(false); await load();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Could not save your private entry.'); }
    finally { setBusy(false); }
  };

  const updateSettings = async (personalCalendarEnabled: boolean) => {
    if (!familyId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/families/${familyId}/cycles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'settings', reminderEnabled: true, reminderTime: data?.profile?.reminderTime || '20:00', personalCalendarEnabled }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not update preferences.');
      await load();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Could not update preferences.'); }
    finally { setBusy(false); }
  };

  const connectPrivateCalendar = async () => {
    if (!familyId) return;
    const popup = window.open('', 'family-hub-private-calendar', 'width=560,height=720');
    if (!popup) {
      setNotice('Allow pop-ups to connect your private Google Calendar.');
      return;
    }
    try {
      const response = await fetch(`/api/families/${familyId}/cycles/calendar/connect`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not start the private calendar connection.');
      popup.location.href = body.authUrl;

      const handleCalendarResult = (event: MessageEvent<{ type?: string; message?: string }>) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'google_calendar_auth_success') {
          window.removeEventListener('message', handleCalendarResult);
          void load();
        }
        if (event.data?.type === 'google_calendar_auth_error') {
          window.removeEventListener('message', handleCalendarResult);
          setNotice(event.data.message || 'Could not connect your private Google Calendar.');
        }
      };
      window.addEventListener('message', handleCalendarResult);
    } catch (reason) {
      popup.close();
      setNotice(reason instanceof Error ? reason.message : 'Could not start the private calendar connection.');
    }
  };

  const deleteAll = async () => {
    if (!familyId || !window.confirm('Delete all private cycle records from Family Hub? This cannot be undone.')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/families/${familyId}/cycles?resource=all`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not delete private data.');
      await load();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Could not delete private data.'); }
    finally { setBusy(false); }
  };

  if (!familyId) return <div className="p-6 text-sm text-slate-500">Loading private health area…</div>;
  if (profileName && profileName.trim().toLowerCase() !== 'angela') {
    return <div className="flex min-h-[60vh] items-center justify-center bg-[#f6f7f3] p-6 dark:bg-slate-950"><div className="max-w-sm text-center"><ShieldCheck className="mx-auto h-8 w-8 text-[#d8527d]" /><h1 className="mt-4 font-serif text-3xl">This is Angela&apos;s private area.</h1><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Health and cycle details stay with the profile they belong to.</p></div></div>;
  }

  return (
    <div className="min-h-full bg-[#fbf7f8] px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#eddde3] pb-5 dark:border-slate-800"><div><p className="text-sm font-semibold text-[#d8527d]">Angela&apos;s private health area</p><h1 className="mt-1 font-serif text-3xl">Health &amp; Cycle</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Personal history, gentle reminders, and estimates based on your own records.</p></div><div className="flex gap-2"><button type="button" onClick={() => setShowLog(true)} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e5becd] bg-white px-3 text-sm font-semibold text-[#b84368] hover:bg-[#fff2f6] dark:border-slate-700 dark:bg-slate-900"><HeartPulse className="h-4 w-4" />Daily log</button><button type="button" onClick={() => setShowPeriod(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#d8527d] px-3 text-sm font-semibold text-white hover:bg-[#bb3d65]"><Plus className="h-4 w-4" />Period</button></div></div>
      {notice && <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{notice}</p>}
      {data && <><section className="mt-6 grid gap-px overflow-hidden rounded-md border border-[#eddde3] bg-[#eddde3] sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">{[['Next period', isoDate(data.insights.predictedNextPeriod)], ['Average cycle', data.insights.averageCycleLength ? `${data.insights.averageCycleLength} days` : 'Log 3 cycles'], ['Average period', data.insights.averagePeriodLength ? `${data.insights.averagePeriodLength} days` : 'Still learning'], ['Prediction confidence', data.insights.confidence]].map(([label, value]) => <div key={label} className="bg-white p-4 dark:bg-slate-900"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>)}</section>
      <p className="mt-4 text-xs text-slate-500">Predictions are estimates from your logged history. They are not medical advice or contraception guidance.</p>
      <section className="mt-6 grid gap-6 lg:grid-cols-2"><div><h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"><CalendarDays className="h-4 w-4 text-[#d8527d]" />Cycle history</h2><div className="mt-3 divide-y divide-[#eddde3] border-y border-[#eddde3] dark:divide-slate-800 dark:border-slate-800">{data.periods.map((period) => <div key={period.id} className="flex justify-between py-3 text-sm"><span className="font-medium">{isoDate(period.startDate)}</span><span className="text-slate-500">{period.endDate ? `to ${isoDate(period.endDate)}` : 'In progress'}</span></div>)}{data.periods.length === 0 && <p className="py-5 text-sm text-slate-500">Log your first period to start building your private history.</p>}</div></div><div><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Private reminders</h2><div className="mt-3 border-y border-[#eddde3] py-3 text-sm dark:border-slate-800"><label className="flex items-center justify-between gap-3"><span><span className="block font-medium">Personal calendar reminders</span><span className="block text-xs text-slate-500">Never added to the shared household calendar.</span></span><input type="checkbox" checked={Boolean(data.profile?.personalCalendarEnabled)} disabled={busy} onChange={(event) => updateSettings(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#d8527d]" /></label>{data.calendarConnection ? <p className="mt-3 text-xs text-[#147c72]">Connected privately to {data.calendarConnection.selectedCalendarName || data.calendarConnection.googleUserEmail}.</p> : <button type="button" onClick={connectPrivateCalendar} className="mt-3 text-xs font-semibold text-[#d8527d] underline">Connect personal Google Calendar</button>}</div><div className="mt-5 flex flex-wrap gap-3"><a href={`/api/families/${familyId}/cycles?export=1`} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900"><Download className="h-4 w-4" />Export my data</a><button type="button" onClick={deleteAll} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Delete private data</button></div></div></section>
      <section className="mt-6"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent daily entries</h2><div className="mt-3 grid gap-px overflow-hidden border border-[#eddde3] bg-[#eddde3] sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-800">{data.logs.slice(0, 6).map((log) => <div key={log.id} className="bg-white p-3 dark:bg-slate-900"><p className="text-sm font-semibold">{isoDate(log.logDate)}</p><p className="mt-1 text-xs text-slate-500">{[log.flow, log.mood, log.painLevel !== null && log.painLevel !== undefined ? `Pain ${log.painLevel}/10` : null].filter(Boolean).join(' · ') || 'No symptoms recorded'}</p></div>)}{data.logs.length === 0 && <div className="col-span-full bg-white p-5 text-sm text-slate-500 dark:bg-slate-900">Daily entries help you see trends in your own history.</div>}</div></section></>}
    </div>
    {showPeriod && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center"><form onSubmit={(event) => submit(event, 'period')} className="w-full max-w-md bg-white p-5 dark:bg-slate-900"><h2 className="font-serif text-2xl">Log a period</h2><div className="mt-4 grid gap-3"><label className="text-xs">Start date<input name="startDate" type="date" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs">End date, optional<input name="endDate" type="date" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 dark:border-slate-700 dark:bg-slate-950" /></label><textarea name="notes" placeholder="Private note, optional" className="min-h-20 rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></div><div className="mt-5 flex gap-2"><button type="button" onClick={() => setShowPeriod(false)} className="h-10 flex-1 rounded-md border border-slate-300 text-sm">Cancel</button><button disabled={busy} className="h-10 flex-1 rounded-md bg-[#d8527d] text-sm font-semibold text-white">Save</button></div></form></div>}
    {showLog && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center"><form onSubmit={(event) => submit(event, 'daily-log')} className="w-full max-w-md bg-white p-5 dark:bg-slate-900"><h2 className="font-serif text-2xl">Daily private log</h2><div className="mt-4 grid gap-3"><label className="text-xs">Date<input name="logDate" type="date" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 dark:border-slate-700 dark:bg-slate-950" /></label><div className="grid grid-cols-3 gap-2"><input name="flow" placeholder="Flow" className="h-10 rounded-md border border-slate-300 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" /><input name="mood" placeholder="Mood" className="h-10 rounded-md border border-slate-300 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" /><input name="symptoms" placeholder="Symptoms" className="h-10 rounded-md border border-slate-300 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div><div className="grid grid-cols-3 gap-2"><input name="energy" type="number" min="1" max="5" placeholder="Energy" className="h-10 rounded-md border border-slate-300 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" /><input name="painLevel" type="number" min="0" max="10" placeholder="Pain" className="h-10 rounded-md border border-slate-300 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" /><input name="sleepHours" type="number" min="0" step="0.5" placeholder="Sleep" className="h-10 rounded-md border border-slate-300 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div><input name="medication" placeholder="Medication or supplements, optional" className="h-10 rounded-md border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-950" /><textarea name="notes" placeholder="Private note, optional" className="min-h-20 rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></div><div className="mt-5 flex gap-2"><button type="button" onClick={() => setShowLog(false)} className="h-10 flex-1 rounded-md border border-slate-300 text-sm">Cancel</button><button disabled={busy} className="h-10 flex-1 rounded-md bg-[#d8527d] text-sm font-semibold text-white">Save log</button></div></form></div>}
    </div>
  );
};
