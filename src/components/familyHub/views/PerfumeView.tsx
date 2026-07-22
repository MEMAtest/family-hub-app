'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { BookOpen, Camera, FlaskConical, Plus, Search, Sparkles, Timer, X } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';

type CatalogSummary = {
  id: string;
  olfactiveFamily?: string | null;
  notes: string[];
  accords: string[];
  sourceName: string;
  sourceUrl?: string | null;
  catalogueStatus: string;
};

type Fragrance = {
  id: string;
  house: string;
  name: string;
  concentration?: string | null;
  photoUrl?: string | null;
  catalog?: CatalogSummary | null;
  wearLogs: Array<{ overallRating?: number | null; longevityHours?: number | null; projectionRating?: number | null }>;
};

type CatalogEntry = {
  id: string;
  house: string;
  name: string;
  concentration?: string | null;
  releaseYear?: number | null;
  olfactiveFamily?: string | null;
  notes: string[];
  accords: string[];
  source: { name: string; url?: string | null; kind: string; status: string };
  isInCollection: boolean;
};

type Draft = {
  id: string;
  suggestedHouse?: string | null;
  suggestedName?: string | null;
  suggestedConcentration?: string | null;
  extractedText?: string | null;
};

const MAX_BOTTLE_PHOTO_SIZE = 4 * 1024 * 1024;

const requestJson = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Something went wrong.');
  return body;
};

const detailText = (values: string[]) => values.slice(0, 4).join(' · ');

export const PerfumeView = () => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [recommendations, setRecommendations] = useState<{ wearToday: any[]; buyNext: any[] }>({ wearToday: [], buyNext: [] });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [form, setForm] = useState({ house: '', name: '', concentration: '' });
  const [selected, setSelected] = useState<Fragrance | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showCandidate, setShowCandidate] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [detailedLog, setDetailedLog] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [candidate, setCandidate] = useState({ house: '', name: '', sourceName: '', sourceUrl: '' });
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!familyId) return;
    try {
      const [collection, recs] = await Promise.all([
        requestJson(`/api/families/${familyId}/perfumes`),
        requestJson(`/api/families/${familyId}/perfumes/recommendations`),
      ]);
      setFragrances(collection);
      setRecommendations(recs);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not load your private collection.');
    }
  };

  const loadCatalog = async (query = catalogQuery) => {
    if (!familyId) return;
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (query.trim()) params.set('q', query.trim());
      const entries = await requestJson(`/api/families/${familyId}/perfumes/catalog?${params}`);
      setCatalogEntries(Array.isArray(entries) ? entries : []);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not search the fragrance catalogue.');
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [familyId]);

  const openCatalog = () => {
    setShowCatalog(true);
    void loadCatalog();
  };

  const addCatalogFragrance = async (entry: CatalogEntry) => {
    if (!familyId) return;
    setBusy(true);
    try {
      await requestJson(`/api/families/${familyId}/perfumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogEntryId: entry.id }),
      });
      setCatalogEntries((entries) => entries.map((item) => item.id === entry.id ? { ...item, isInCollection: true } : item));
      setNotice(`${entry.house} ${entry.name} added to your private collection.`);
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not add that catalogue fragrance.');
    } finally {
      setBusy(false);
    }
  };

  const addFragrance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!familyId) return;
    setBusy(true);
    try {
      const endpoint = draft
        ? `/api/families/${familyId}/perfumes/photo-drafts/${draft.id}/confirm`
        : `/api/families/${familyId}/perfumes`;
      await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setDraft(null);
      setForm({ house: '', name: '', concentration: '' });
      setShowAdd(false);
      setNotice('Fragrance saved to your private collection.');
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not add this fragrance.');
    } finally {
      setBusy(false);
    }
  };

  const validateBottlePhoto = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setNotice('Choose an image file for the bottle photo.');
      return false;
    }
    if (file.size > MAX_BOTTLE_PHOTO_SIZE) {
      setNotice('Bottle photos must be 4 MB or smaller.');
      return false;
    }
    return true;
  };

  const uploadBottle = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !familyId || !validateBottlePhoto(file)) return;
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append('file', file);
      const photoDraft = await requestJson(`/api/families/${familyId}/perfumes/photo-drafts`, { method: 'POST', body: payload });
      setDraft(photoDraft);
      setForm({
        house: photoDraft.suggestedHouse || '',
        name: photoDraft.suggestedName || '',
        concentration: photoDraft.suggestedConcentration || '',
      });
      setShowAdd(true);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not read that bottle photo.');
    } finally {
      setBusy(false);
    }
  };

  const uploadFragrancePhoto = async (event: ChangeEvent<HTMLInputElement>, fragrance: Fragrance) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !familyId || !validateBottlePhoto(file)) return;
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append('file', file);
      await requestJson(`/api/families/${familyId}/perfumes/${fragrance.id}/photo`, { method: 'POST', body: payload });
      setNotice(`${fragrance.name} bottle photo saved.`);
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not save that bottle photo.');
    } finally {
      setBusy(false);
    }
  };

  const logWear = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!familyId || !selected) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await requestJson(`/api/families/${familyId}/perfumes/${selected.id}/wear-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallRating: Number(values.get('overallRating')),
          longevityHours: Number(values.get('longevityHours')),
          projectionRating: Number(values.get('projectionRating')),
          notes: values.get('notes'),
          context: detailedLog ? {
            sprays: values.get('sprays'),
            occasion: values.get('occasion'),
            weather: values.get('weather'),
          } : {},
        }),
      });
      setShowLog(false);
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not save this wear test.');
    } finally {
      setBusy(false);
    }
  };

  const addCandidate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!familyId) return;
    setBusy(true);
    try {
      await requestJson(`/api/families/${familyId}/perfumes/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate),
      });
      setCandidate({ house: '', name: '', sourceName: '', sourceUrl: '' });
      setShowCandidate(false);
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not add that candidate.');
    } finally {
      setBusy(false);
    }
  };

  if (!familyId) return <div className="p-6 text-sm text-slate-500">Loading your private perfume area...</div>;

  return (
    <div className="min-h-full bg-[#f6f7f3] px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe7e0] pb-5 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-[#147c72]">Private collection</p>
            <h1 className="mt-1 font-serif text-3xl text-[#18221f] dark:text-slate-100">Perfume Hub</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">Your collection, real wear tests, and source-aware recommendations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openCatalog} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c8d8ce] bg-white px-3 text-sm font-semibold text-[#147c72] hover:bg-[#ecf3ee] dark:border-slate-700 dark:bg-slate-900">
              <BookOpen className="h-4 w-4" />Browse catalogue
            </button>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#c8d8ce] bg-white px-3 text-sm font-semibold text-[#147c72] hover:bg-[#ecf3ee] dark:border-slate-700 dark:bg-slate-900">
              <Camera className="h-4 w-4" />{busy ? 'Reading...' : 'Read bottle label'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={uploadBottle} />
            </label>
            <button type="button" onClick={() => { setDraft(null); setForm({ house: '', name: '', concentration: '' }); setShowAdd(true); }} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#147c72] px-3 text-sm font-semibold text-white hover:bg-[#0f625a]">
              <Plus className="h-4 w-4" />Add fragrance
            </button>
          </div>
        </div>

        {notice && <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{notice}</p>}

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="mb-3 flex items-center gap-2"><FlaskConical className="h-4 w-4 text-[#147c72]" /><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Collection</h2></div>
            <div className="grid gap-px overflow-hidden border border-[#dfe7e0] bg-[#dfe7e0] sm:grid-cols-2 xl:grid-cols-3 dark:border-slate-800 dark:bg-slate-800">
              {fragrances.map((fragrance) => (
                <div key={fragrance.id} className="relative min-h-44 bg-white dark:bg-slate-900">
                  <button type="button" onClick={() => { setSelected(fragrance); setShowLog(true); }} className="block min-h-44 w-full p-4 pr-12 text-left hover:bg-[#f3f7f2] dark:hover:bg-slate-800" aria-label={`Log a wear test for ${fragrance.house} ${fragrance.name}`}>
                    {fragrance.photoUrl ? <img src={fragrance.photoUrl} alt={`Bottle of ${fragrance.house} ${fragrance.name}`} className="mb-3 h-20 w-full object-contain" /> : <div className="mb-3 flex h-20 items-center justify-center bg-[#eef3ee] text-[#147c72] dark:bg-slate-800"><FlaskConical className="h-7 w-7" /></div>}
                    <p className="text-xs font-semibold text-[#147c72]">{fragrance.house}</p>
                    <p className="mt-1 text-sm font-semibold text-[#18221f] dark:text-slate-100">{fragrance.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{fragrance.concentration || 'Concentration not set'} · {fragrance.wearLogs.length} tests</p>
                    {fragrance.catalog?.olfactiveFamily && <p className="mt-2 text-xs text-slate-500">{fragrance.catalog.olfactiveFamily}</p>}
                    {fragrance.catalog && fragrance.catalog.notes.length > 0 && <p className="mt-1 line-clamp-1 text-xs text-slate-500">{detailText(fragrance.catalog.notes)}</p>}
                  </button>
                  <label title={`Add or replace bottle photo for ${fragrance.name}`} className="absolute right-3 top-3 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#c8d8ce] bg-white text-[#147c72] shadow-sm hover:bg-[#ecf3ee] dark:border-slate-700 dark:bg-slate-900">
                    <Camera className="h-4 w-4" /><span className="sr-only">Add or replace bottle photo for {fragrance.name}</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => uploadFragrancePhoto(event, fragrance)} />
                  </label>
                </div>
              ))}
              {fragrances.length === 0 && <div className="col-span-full bg-white p-8 text-sm text-slate-500 dark:bg-slate-900">Browse the catalogue, add a bottle manually, or photograph its label to start your collection.</div>}
            </div>
          </div>

          <div className="border-l border-[#dfe7e0] pl-0 dark:border-slate-800 lg:pl-5">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#d8527d]" /><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Today&apos;s evidence</h2></div>
            <div className="mt-3 space-y-3">
              {recommendations.wearToday.slice(0, 3).map((item) => <div key={item.id} className="border-b border-[#e4ebe6] pb-3 dark:border-slate-800"><p className="text-sm font-semibold">{item.house} {item.name}</p><p className="mt-1 text-xs text-slate-500">{item.sampleCount ? `${item.sampleCount} personal tests` : 'No personal tests yet'}{item.personalRating ? ` · ${item.personalRating.toFixed(1)}/5` : ''}</p>{item.benchmark && <a href={item.benchmark.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#147c72] underline">Source: {item.benchmark.sourceName}</a>}</div>)}
              {recommendations.wearToday.length === 0 && <p className="text-sm text-slate-500">Your recommendations improve after a few wear tests.</p>}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Buy next</h2><button type="button" onClick={() => setShowCandidate(true)} className="text-xs font-semibold text-[#147c72] underline">Add sourced candidate</button></div>
            <div className="mt-3 space-y-3">
              {recommendations.buyNext.slice(0, 3).map((item) => <div key={item.id} className="border-b border-[#e4ebe6] pb-3 dark:border-slate-800"><p className="text-sm font-semibold">{item.house} {item.name}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-[#147c72] underline">{item.sourceName}</a></div>)}
              {recommendations.buyNext.length === 0 && <p className="text-sm text-slate-500">Add a sourced candidate when you want to compare a possible next bottle.</p>}
            </div>
          </div>
        </section>
      </div>

      {showCatalog && <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-6"><div role="dialog" aria-modal="true" aria-label="Fragrance catalogue" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-white p-5 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-[#147c72]">Source-aware library</p><h2 className="font-serif text-2xl">Browse catalogue</h2></div><button type="button" onClick={() => setShowCatalog(false)} aria-label="Close catalogue"><X className="h-5 w-5" /></button></div><form onSubmit={(event) => { event.preventDefault(); void loadCatalog(); }} className="mt-4 flex gap-2"><label className="sr-only" htmlFor="catalogue-search">Search catalogue</label><input id="catalogue-search" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Search house, fragrance, concentration or family" className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /><button type="submit" className="inline-flex h-11 items-center gap-2 rounded-md bg-[#147c72] px-3 text-sm font-semibold text-white"><Search className="h-4 w-4" />Search</button></form><div className="mt-5 divide-y divide-[#dfe7e0] border-y border-[#dfe7e0] dark:divide-slate-800 dark:border-slate-800">{catalogLoading && <p className="py-5 text-sm text-slate-500">Searching catalogue...</p>}{!catalogLoading && catalogEntries.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="text-xs font-semibold text-[#147c72]">{entry.house}</p><p className="mt-1 text-sm font-semibold">{entry.name}{entry.concentration ? ` · ${entry.concentration}` : ''}</p><p className="mt-1 text-xs text-slate-500">{[entry.olfactiveFamily, detailText(entry.notes), entry.releaseYear ? String(entry.releaseYear) : ''].filter(Boolean).join(' · ') || 'Profile-confirmed catalogue entry'}</p>{entry.source.url && <a href={entry.source.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#147c72] underline">Source: {entry.source.name}</a>}</div><button type="button" disabled={busy || entry.isInCollection} onClick={() => void addCatalogFragrance(entry)} className="h-9 rounded-md border border-[#147c72] px-3 text-xs font-semibold text-[#147c72] disabled:cursor-default disabled:border-slate-300 disabled:text-slate-400">{entry.isInCollection ? 'In collection' : 'Add bottle'}</button></div>)}{!catalogLoading && catalogEntries.length === 0 && <p className="py-5 text-sm text-slate-500">No matching catalogue release yet. Add the bottle manually or photograph its label, then confirm it to grow your private library.</p>}</div></div></div>}

      {showAdd && <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-6"><form onSubmit={addFragrance} className="w-full max-w-md bg-white p-5 dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl">{draft ? 'Confirm bottle label' : 'Add fragrance'}</h2><button type="button" onClick={() => setShowAdd(false)} aria-label="Close"><X className="h-5 w-5" /></button></div>{draft?.extractedText && <p className="mt-3 text-xs text-slate-500">Label text was read from the photo. Confirm the details before saving.</p>}<div className="mt-4 grid gap-3"><input required value={form.house} onChange={(event) => setForm({ ...form, house: event.target.value })} placeholder="House, e.g. Kilian" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Fragrance name" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /><input value={form.concentration} onChange={(event) => setForm({ ...form, concentration: event.target.value })} placeholder="Concentration, optional" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /></div><button disabled={busy} className="mt-5 h-11 w-full rounded-md bg-[#147c72] text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Saving...' : 'Confirm and save'}</button></form></div>}

      {showLog && selected && <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-6"><form onSubmit={logWear} className="w-full max-w-md bg-white p-5 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-[#147c72]">Wear test</p><h2 className="font-serif text-2xl">{selected.name}</h2></div><button type="button" onClick={() => setShowLog(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><div className="mt-4 grid grid-cols-3 gap-3"><label className="text-xs">Enjoyment<input name="overallRating" type="number" min="1" max="5" defaultValue="4" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs">Hours<input name="longevityHours" type="number" min="0" step="0.5" defaultValue="6" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs">Projection<input name="projectionRating" type="number" min="1" max="5" defaultValue="3" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 dark:border-slate-700 dark:bg-slate-950" /></label></div><button type="button" onClick={() => setDetailedLog(!detailedLog)} className="mt-4 text-xs font-semibold text-[#147c72]">{detailedLog ? 'Quick log' : 'Add detail'}</button>{detailedLog && <div className="mt-3 grid grid-cols-3 gap-2"><input name="sprays" placeholder="Sprays" className="h-10 rounded-md border border-slate-300 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" /><input name="occasion" placeholder="Occasion" className="h-10 rounded-md border border-slate-300 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" /><input name="weather" placeholder="Weather" className="h-10 rounded-md border border-slate-300 px-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>}<textarea name="notes" className="mt-3 min-h-20 w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Anything worth remembering?" /><button disabled={busy} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#147c72] text-sm font-semibold text-white"><Timer className="h-4 w-4" />Save wear test</button></form></div>}

      {showCandidate && <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-6"><form onSubmit={addCandidate} className="w-full max-w-md bg-white p-5 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-[#147c72]">Evidence-led shortlist</p><h2 className="font-serif text-2xl">Add a candidate</h2></div><button type="button" onClick={() => setShowCandidate(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><p className="mt-3 text-xs text-slate-500">Every candidate needs a source, so recommendations remain traceable.</p><div className="mt-4 grid gap-3"><input required value={candidate.house} onChange={(event) => setCandidate({ ...candidate, house: event.target.value })} placeholder="House" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /><input required value={candidate.name} onChange={(event) => setCandidate({ ...candidate, name: event.target.value })} placeholder="Fragrance name" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /><input required value={candidate.sourceName} onChange={(event) => setCandidate({ ...candidate, sourceName: event.target.value })} placeholder="Source name, e.g. Parfumo" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /><input required type="url" value={candidate.sourceUrl} onChange={(event) => setCandidate({ ...candidate, sourceUrl: event.target.value })} placeholder="Source link" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /></div><button disabled={busy} className="mt-5 h-11 w-full rounded-md bg-[#147c72] text-sm font-semibold text-white disabled:opacity-60">Save candidate</button></form></div>}
    </div>
  );
};
