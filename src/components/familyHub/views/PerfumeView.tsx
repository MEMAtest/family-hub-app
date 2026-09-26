'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Camera, CheckCircle2, ChevronDown, Circle, FlaskConical, History, ImagePlus, LoaderCircle, Pencil, Plus, Search, Sparkles, Star, Timer, Trash2, X } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';

type WearLog = {
  id?: string;
  wornAt?: string;
  overallRating?: number | null;
  longevityHours?: number | null;
  projectionRating?: number | null;
  context?: { sprays?: string; occasion?: string; weather?: string } | null;
  notes?: string | null;
};

type CatalogSummary = {
  id: string;
  olfactiveFamily?: string | null;
  notes: string[];
  accords: string[];
  imageUrl?: string | null;
  sourceName: string;
  sourceUrl?: string | null;
  catalogueStatus: string;
};

type Fragrance = {
  id: string;
  house: string;
  name: string;
  concentration?: string | null;
  createdAt?: string;
  photoUrl?: string | null;
  catalog?: CatalogSummary | null;
  wearLogs: WearLog[];
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
  imageUrl?: string | null;
  source: { name: string; url?: string | null; kind: string; status: string };
  isInCollection: boolean;
};

type Draft = {
  id: string;
  suggestedHouse?: string | null;
  suggestedName?: string | null;
  suggestedConcentration?: string | null;
  extractedText?: string | null;
  ocrStatus?: 'ready' | 'needs_manual_review' | 'failed' | string;
  ocrConfidence?: number | null;
  ocrError?: string | null;
  ocrUsage?: { inputTokens?: number; outputTokens?: number; estimatedUsd?: number } | null;
  matchCandidates?: Array<{ id: string; house: string; name: string; concentration?: string | null; source: 'catalogue' | 'household' }> | null;
};

type ScanPhase = 'idle' | 'uploading' | 'reading' | 'matching' | 'ready';
type CollectionSort = 'recent' | 'alphabetical' | 'rating' | 'longevity' | 'most-worn';
type WearForm = { wornAt: string; overallRating: number; longevityHours: number; projectionRating: number; showContext: boolean; sprays: string; occasion: string; weather: string; notes: string };

const MAX_BOTTLE_PHOTO_SIZE = 4 * 1024 * 1024;
const CATALOG_PAGE_SIZE = 20;
const CATALOG_SEARCH_DELAY_MS = 260;
const scanStages: Array<{ id: ScanPhase; label: string }> = [
  { id: 'uploading', label: 'Photo uploaded' },
  { id: 'reading', label: 'Reading label' },
  { id: 'matching', label: 'Finding matches' },
  { id: 'ready', label: 'Ready to confirm' },
];
const enjoymentLabels = ['Not for me', 'Okay', 'Good', 'Love it', 'Exceptional'];
const projectionLabels = ['Skin scent', 'Personal bubble', 'Noticeable', 'Strong', 'Room filling'];

const requestJson = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Something went wrong.');
  return body;
};

const requestJsonWithTimeout = async (url: string, options: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await requestJson(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Bottle reading took too long. You can retry or enter the label manually.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};

const average = (values: Array<number | null | undefined>) => {
  const present = values.filter((value): value is number => typeof value === 'number');
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
};

const detailText = (values: string[]) => values.slice(0, 4).join(' · ');
const scanStageIndex = (phase: ScanPhase) => scanStages.findIndex((stage) => stage.id === phase);
const formatUsd = (amount?: number | null) => !amount || amount <= 0 ? null : amount < 0.01 ? '< $0.01' : `$${amount.toFixed(2)}`;
const longevityLabel = (hours: number) => hours >= 12 ? '12+ hours' : `${hours % 1 === 0 ? hours : hours.toFixed(1)} hours`;
const performanceLabel = (fragrance: Fragrance) => {
  if (!fragrance.wearLogs.length) return 'No wear tests yet';
  const rating = average(fragrance.wearLogs.map((log) => log.overallRating));
  const longevity = average(fragrance.wearLogs.map((log) => log.longevityHours));
  return [rating ? `${rating.toFixed(1)}/5 enjoyment` : null, longevity ? longevityLabel(longevity) : null].filter(Boolean).join(' · ') || `${fragrance.wearLogs.length} wear tests`;
};
const dateInputValue = (value?: string) => value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
const formattedWearDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not recorded';
const seasonForWear = (value?: string) => {
  const month = new Date(value || Date.now()).getMonth();
  return month === 11 || month <= 1 ? 'Winter' : month <= 4 ? 'Spring' : month <= 7 ? 'Summer' : 'Autumn';
};
const trendText = (logs: WearLog[]) => {
  const grouped = new Map<string, WearLog[]>();
  logs.forEach((log) => {
    const context = log.context || {};
    const weather = typeof context.weather === 'string' && context.weather.trim() ? context.weather.trim() : null;
    [seasonForWear(log.wornAt), weather ? `Weather: ${weather}` : null].filter((label): label is string => Boolean(label)).forEach((label) => {
      grouped.set(label, [...(grouped.get(label) || []), log]);
    });
  });
  return [...grouped.entries()].map(([label, trendLogs]) => {
    const rating = average(trendLogs.map((log) => log.overallRating));
    const longevity = average(trendLogs.map((log) => log.longevityHours));
    return { label, value: [rating ? `${rating.toFixed(1)}/5 enjoyment` : null, longevity ? longevityLabel(longevity) : null, `${trendLogs.length} ${trendLogs.length === 1 ? 'test' : 'tests'}`].filter(Boolean).join(' · ') };
  }).sort((left, right) => right.value.localeCompare(left.value));
};
const newWearForm = (log?: WearLog): WearForm => ({
  wornAt: dateInputValue(log?.wornAt),
  overallRating: log?.overallRating ?? 4,
  longevityHours: log?.longevityHours ?? 6,
  projectionRating: log?.projectionRating ?? 3,
  showContext: Boolean(log?.context?.sprays || log?.context?.occasion || log?.context?.weather),
  sprays: log?.context?.sprays || '',
  occasion: log?.context?.occasion || '',
  weather: log?.context?.weather || '',
  notes: log?.notes || '',
});

const BottleImage = ({ personalUrl, officialUrl, label, compact = false }: { personalUrl?: string | null; officialUrl?: string | null; label: string; compact?: boolean }) => {
  const [personalFailed, setPersonalFailed] = useState(false);
  const [officialFailed, setOfficialFailed] = useState(false);
  const usePersonal = Boolean(personalUrl && !personalFailed);
  const imageUrl = usePersonal ? personalUrl : (!officialFailed ? officialUrl : null);
  if (imageUrl) {
    return <img src={imageUrl} alt={usePersonal ? `Bottle of ${label}` : `Official bottle image for ${label}`} onError={() => usePersonal ? setPersonalFailed(true) : setOfficialFailed(true)} className={compact ? 'h-16 w-full object-contain' : 'h-28 w-full object-contain'} />;
  }
  return <div aria-label={`No bottle image for ${label}`} className={`${compact ? 'h-16' : 'h-28'} flex w-full items-center justify-center bg-[#edf3ee] text-[#147c72] dark:bg-slate-800`}><FlaskConical className={compact ? 'h-6 w-6' : 'h-9 w-9'} /></div>;
};

const RangeField = ({ label, value, min, max, step = 1, onChange, description, leftLabel, rightLabel }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  description: string;
  leftLabel: string;
  rightLabel: string;
}) => <div>
  <div className="flex items-baseline justify-between gap-3"><label className="text-sm font-semibold text-[#18221f] dark:text-slate-100">{label}</label><output className="text-sm font-semibold text-[#147c72]">{description}</output></div>
  <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 h-2 w-full cursor-pointer accent-[#147c72]" />
  <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{leftLabel}</span><span>{rightLabel}</span></div>
</div>;

export const PerfumeView = () => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [recommendations, setRecommendations] = useState<{ wearToday: any[]; buyNext: any[] }>({ wearToday: [], buyNext: [] });
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogHasMore, setCatalogHasMore] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [collectionSort, setCollectionSort] = useState<CollectionSort>('recent');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [form, setForm] = useState({ house: '', name: '', concentration: '' });
  const [selected, setSelected] = useState<Fragrance | null>(null);
  const [detailFragrance, setDetailFragrance] = useState<Fragrance | null>(null);
  const [editingWearLog, setEditingWearLog] = useState<WearLog | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showCandidate, setShowCandidate] = useState(false);
  const [candidate, setCandidate] = useState({ house: '', name: '', sourceName: '', sourceUrl: '' });
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [manualPhoto, setManualPhoto] = useState<File | null>(null);
  const [manualPhotoPreview, setManualPhotoPreview] = useState<string | null>(null);
  const [wearForm, setWearForm] = useState<WearForm>(() => newWearForm());
  const scanPreviewRef = useRef<string | null>(null);
  const manualPhotoPreviewRef = useRef<string | null>(null);
  const catalogRequestRef = useRef(0);

  const load = useCallback(async () => {
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
  }, [familyId]);

  const loadCatalog = useCallback(async (query: string, offset = 0) => {
    if (!familyId) return;
    const requestId = ++catalogRequestRef.current;
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(CATALOG_PAGE_SIZE), offset: String(offset) });
      if (query.trim()) params.set('q', query.trim());
      const entries = await requestJson(`/api/families/${familyId}/perfumes/catalog?${params.toString()}`);
      if (requestId !== catalogRequestRef.current) return;
      const page = Array.isArray(entries) ? entries as CatalogEntry[] : [];
      setCatalogEntries((current) => offset === 0 ? page : [...current, ...page]);
      setCatalogHasMore(page.length === CATALOG_PAGE_SIZE);
    } catch (reason) {
      if (requestId !== catalogRequestRef.current) return;
      setNotice(reason instanceof Error ? reason.message : 'Could not load the fragrance catalogue.');
    } finally {
      if (requestId === catalogRequestRef.current) setCatalogLoading(false);
    }
  }, [familyId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => {
    if (scanPreviewRef.current) URL.revokeObjectURL(scanPreviewRef.current);
    if (manualPhotoPreviewRef.current) URL.revokeObjectURL(manualPhotoPreviewRef.current);
  }, []);

  const sortedFragrances = useMemo(() => [...fragrances].sort((left, right) => {
    if (collectionSort === 'alphabetical') return `${left.house} ${left.name}`.localeCompare(`${right.house} ${right.name}`);
    if (collectionSort === 'rating') return (average(right.wearLogs.map((log) => log.overallRating)) || 0) - (average(left.wearLogs.map((log) => log.overallRating)) || 0);
    if (collectionSort === 'longevity') return (average(right.wearLogs.map((log) => log.longevityHours)) || 0) - (average(left.wearLogs.map((log) => log.longevityHours)) || 0);
    if (collectionSort === 'most-worn') return right.wearLogs.length - left.wearLogs.length;
    return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
  }), [collectionSort, fragrances]);

  const clearManualPhoto = () => {
    if (manualPhotoPreviewRef.current) URL.revokeObjectURL(manualPhotoPreviewRef.current);
    manualPhotoPreviewRef.current = null;
    setManualPhoto(null);
    setManualPhotoPreview(null);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setDraft(null);
    setScanPhase('idle');
    if (scanPreviewRef.current) URL.revokeObjectURL(scanPreviewRef.current);
    scanPreviewRef.current = null;
    setScanPreviewUrl(null);
    clearManualPhoto();
  };

  const openManualAdd = (name = '') => {
    closeAdd();
    setForm({ house: '', name, concentration: '' });
    setShowAdd(true);
  };

  useEffect(() => {
    if (!showCatalog) return;
    const timeout = window.setTimeout(() => {
      void loadCatalog(catalogQuery, 0);
    }, catalogQuery.trim() ? CATALOG_SEARCH_DELAY_MS : 0);
    return () => window.clearTimeout(timeout);
  }, [catalogQuery, loadCatalog, showCatalog]);

  const openCatalog = () => {
    setCatalogEntries([]);
    setCatalogHasMore(false);
    setCatalogQuery('');
    setShowCatalog(true);
  };

  const uploadManualPreview = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_BOTTLE_PHOTO_SIZE) {
      setNotice('Bottle photos must be image files no larger than 4 MB.');
      return;
    }
    clearManualPhoto();
    const preview = URL.createObjectURL(file);
    manualPhotoPreviewRef.current = preview;
    setManualPhoto(file);
    setManualPhotoPreview(preview);
  };

  const savePhoto = async (fragranceId: string, file: File) => {
    if (!familyId) return;
    const payload = new FormData();
    payload.append('file', file);
    await requestJson(`/api/families/${familyId}/perfumes/${fragranceId}/photo`, { method: 'POST', body: payload });
  };

  const addCatalogFragrance = async (entry: CatalogEntry) => {
    if (!familyId) return;
    setBusy(true);
    try {
      await requestJson(`/api/families/${familyId}/perfumes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ catalogEntryId: entry.id }) });
      setCatalogEntries((entries) => entries.map((item) => item.id === entry.id ? { ...item, isInCollection: true } : item));
      setShowCatalog(false);
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
      const endpoint = draft ? `/api/families/${familyId}/perfumes/photo-drafts/${draft.id}/confirm` : `/api/families/${familyId}/perfumes`;
      const saved = await requestJson(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }) as { id: string };
      if (!draft && manualPhoto) await savePhoto(saved.id, manualPhoto);
      setNotice(draft ? 'Bottle label confirmed and saved to your private collection.' : 'Fragrance saved to your private collection.');
      closeAdd();
      setForm({ house: '', name: '', concentration: '' });
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not save this fragrance.');
    } finally {
      setBusy(false);
    }
  };

  const uploadBottle = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !familyId) return;
    if (!file.type.startsWith('image/') || file.size > MAX_BOTTLE_PHOTO_SIZE) {
      setNotice('Bottle photos must be image files no larger than 4 MB.');
      return;
    }
    closeAdd();
    const previewUrl = URL.createObjectURL(file);
    scanPreviewRef.current = previewUrl;
    setScanPreviewUrl(previewUrl);
    setShowAdd(true);
    setScanPhase('uploading');
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append('file', file);
      setScanPhase('reading');
      const photoDraft = await requestJsonWithTimeout(`/api/families/${familyId}/perfumes/photo-drafts`, { method: 'POST', body: payload }, 28_000) as Draft;
      setScanPhase('matching');
      setDraft(photoDraft);
      setForm({ house: photoDraft.suggestedHouse || '', name: photoDraft.suggestedName || '', concentration: photoDraft.suggestedConcentration || '' });
      setScanPhase('ready');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not read that bottle photo.');
      setScanPhase('ready');
    } finally {
      setBusy(false);
    }
  };

  const uploadFragrancePhoto = async (event: ChangeEvent<HTMLInputElement>, fragrance: Fragrance) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !familyId) return;
    if (!file.type.startsWith('image/') || file.size > MAX_BOTTLE_PHOTO_SIZE) {
      setNotice('Bottle photos must be image files no larger than 4 MB.');
      return;
    }
    setBusy(true);
    try {
      await savePhoto(fragrance.id, file);
      setNotice(`${fragrance.name} bottle photo saved.`);
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not save that bottle photo.');
    } finally {
      setBusy(false);
    }
  };

  const removeFragrancePhoto = async (fragrance: Fragrance) => {
    if (!familyId) return;
    setBusy(true);
    try {
      await requestJson(`/api/families/${familyId}/perfumes/${fragrance.id}/photo`, { method: 'DELETE' });
      setNotice(`${fragrance.name} will now use its official image when one is available.`);
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not remove that bottle photo.');
    } finally {
      setBusy(false);
    }
  };

  const openWearLog = (fragrance: Fragrance, log?: WearLog) => {
    setSelected(fragrance);
    setEditingWearLog(log || null);
    setWearForm(newWearForm(log));
    setShowLog(true);
  };

  const logWear = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!familyId || !selected) return;
    setBusy(true);
    try {
      await requestJson(`/api/families/${familyId}/perfumes/${selected.id}/wear-logs${editingWearLog?.id ? `/${editingWearLog.id}` : ''}`, {
        method: editingWearLog?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wornAt: wearForm.wornAt,
          overallRating: wearForm.overallRating,
          longevityHours: wearForm.longevityHours,
          projectionRating: wearForm.projectionRating,
          notes: wearForm.notes,
          context: wearForm.showContext ? { sprays: wearForm.sprays, occasion: wearForm.occasion, weather: wearForm.weather } : {},
        }),
      });
      setShowLog(false);
      setEditingWearLog(null);
      setNotice(editingWearLog ? `Wear test updated for ${selected.name}.` : `Wear test saved for ${selected.name}.`);
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
      await requestJson(`/api/families/${familyId}/perfumes/candidates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(candidate) });
      setCandidate({ house: '', name: '', sourceName: '', sourceUrl: '' });
      setShowCandidate(false);
      setNotice('Candidate saved to your sourced shortlist.');
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not add that candidate.');
    } finally {
      setBusy(false);
    }
  };

  if (!familyId) return <div className="p-6 text-sm text-slate-500">Loading your private perfume area...</div>;

  return <div className="min-h-full bg-[#f6f7f3] px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe7e0] pb-5 dark:border-slate-800">
      <div><p className="text-sm font-semibold text-[#147c72]">Private collection</p><h1 className="mt-1 font-serif text-3xl text-[#18221f] dark:text-slate-100">Perfume Hub</h1><p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">Your own bottle photos, useful wear evidence, and sourced discovery.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={openCatalog} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c8d8ce] bg-white px-3 text-sm font-semibold text-[#147c72] hover:bg-[#ecf3ee] dark:border-slate-700 dark:bg-slate-900"><BookOpen className="h-4 w-4" />Browse catalogue</button><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#c8d8ce] bg-white px-3 text-sm font-semibold text-[#147c72] hover:bg-[#ecf3ee] dark:border-slate-700 dark:bg-slate-900"><Camera className="h-4 w-4" />{scanPhase === 'reading' ? 'Reading bottle...' : 'Read bottle label'}<input type="file" accept="image/*" capture="environment" className="hidden" onChange={uploadBottle} /></label><button type="button" onClick={() => openManualAdd()} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#147c72] px-3 text-sm font-semibold text-white hover:bg-[#0f625a]"><Plus className="h-4 w-4" />Add fragrance</button></div>
    </header>
    {notice && <p role="status" className="mt-4 border border-[#c8d8ce] bg-white p-3 text-sm text-[#18221f] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{notice}</p>}

    <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
      <div><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-[#147c72]" /><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Collection</h2></div><label className="relative text-xs font-semibold text-slate-600 dark:text-slate-300"><span className="sr-only">Sort collection</span><select aria-label="Sort collection" value={collectionSort} onChange={(event) => setCollectionSort(event.target.value as CollectionSort)} className="h-9 appearance-none rounded-md border border-[#c8d8ce] bg-white py-1 pl-3 pr-8 text-xs font-semibold text-[#147c72] dark:border-slate-700 dark:bg-slate-900"><option value="recent">Recently added</option><option value="alphabetical">A–Z</option><option value="rating">Best enjoyment</option><option value="longevity">Longest lasting</option><option value="most-worn">Most worn</option></select><ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-[#147c72]" /></label></div>
        <div className="grid gap-px overflow-hidden border border-[#dfe7e0] bg-[#dfe7e0] sm:grid-cols-2 xl:grid-cols-3 dark:border-slate-800 dark:bg-slate-800">{sortedFragrances.map((fragrance) => <article key={fragrance.id} className="relative min-h-64 bg-white dark:bg-slate-900"><button type="button" onClick={() => openWearLog(fragrance)} className="block h-full w-full p-4 pr-12 text-left hover:bg-[#f3f7f2] dark:hover:bg-slate-800" aria-label={`Log a wear test for ${fragrance.house} ${fragrance.name}`}><BottleImage personalUrl={fragrance.photoUrl} officialUrl={fragrance.catalog?.imageUrl} label={`${fragrance.house} ${fragrance.name}`} /><p className="mt-4 text-xs font-semibold text-[#147c72]">{fragrance.house}</p><p className="mt-1 text-sm font-semibold text-[#18221f] dark:text-slate-100">{fragrance.name}</p><p className="mt-1 text-xs text-slate-500">{fragrance.concentration || 'Concentration not set'}</p>{fragrance.catalog?.olfactiveFamily && <p className="mt-2 line-clamp-1 text-xs text-slate-500">{[fragrance.catalog.olfactiveFamily, detailText(fragrance.catalog.notes)].filter(Boolean).join(' · ')}</p>}<p className="mt-3 flex items-center gap-1 text-xs text-slate-500"><Star className="h-3.5 w-3.5 text-[#d68b36]" />{performanceLabel(fragrance)}</p></button><div className="absolute right-3 top-3 flex gap-1"><button type="button" onClick={() => setDetailFragrance(fragrance)} title={`View wear history for ${fragrance.name}`} aria-label={`View wear history for ${fragrance.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#c8d8ce] bg-white text-[#147c72] shadow-sm hover:bg-[#ecf3ee] dark:border-slate-700 dark:bg-slate-900"><History className="h-4 w-4" /></button><label title={`Add or replace bottle photo for ${fragrance.name}`} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#c8d8ce] bg-white text-[#147c72] shadow-sm hover:bg-[#ecf3ee] dark:border-slate-700 dark:bg-slate-900"><Camera className="h-4 w-4" /><span className="sr-only">Add or replace bottle photo for {fragrance.name}</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => uploadFragrancePhoto(event, fragrance)} /></label>{fragrance.photoUrl && <button type="button" disabled={busy} onClick={() => void removeFragrancePhoto(fragrance)} title={`Remove bottle photo for ${fragrance.name}`} aria-label={`Remove bottle photo for ${fragrance.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e6c9cf] bg-white text-[#b84368] hover:bg-[#fff2f6] dark:border-rose-900 dark:bg-slate-900"><Trash2 className="h-4 w-4" /></button>}</div></article>)}{!sortedFragrances.length && <div className="col-span-full bg-white p-8 text-sm text-slate-500 dark:bg-slate-900">Start with a bottle photo, scan a label, or browse the catalogue.</div>}</div>
      </div>
      <aside className="border-t border-[#dfe7e0] pt-5 dark:border-slate-800 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#d8527d]" /><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Top performers</h2></div><p className="mt-2 text-xs text-slate-500">Ranked from your own wear tests and any cited benchmark. Weather and occasion are shown in history, not inferred here.</p><div className="mt-3 space-y-3">{recommendations.wearToday.slice(0, 3).map((item) => <div key={item.id} className="border-b border-[#e4ebe6] pb-3 dark:border-slate-800"><p className="text-sm font-semibold">{item.house} {item.name}</p><p className="mt-1 text-xs text-slate-500">{item.evidence?.join(' · ')}</p>{item.benchmark && <a href={item.benchmark.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#147c72] underline">Source: {item.benchmark.sourceName}</a>}</div>)}{!recommendations.wearToday.length && <p className="text-sm text-slate-500">Log a few wear tests to see personal top performers here.</p>}</div><div className="mt-6 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sourced shortlist</h2><button type="button" onClick={() => setShowCandidate(true)} className="text-xs font-semibold text-[#147c72] underline">Add sourced candidate</button></div><div className="mt-3 space-y-3">{recommendations.buyNext.slice(0, 3).map((item) => <div key={item.id} className="border-b border-[#e4ebe6] pb-3 dark:border-slate-800"><p className="text-sm font-semibold">{item.house} {item.name}</p>{item.evidence?.length ? <p className="mt-1 text-xs text-slate-500">{item.evidence.join(' · ')}</p> : null}<a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#147c72] underline">{item.sourceName}</a></div>)}{!recommendations.buyNext.length && <p className="text-sm text-slate-500">Add a sourced candidate when you want to compare a possible next bottle.</p>}</div></aside>
    </section>

    {showCatalog && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-6"><div role="dialog" aria-modal="true" aria-label="Fragrance catalogue" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto bg-white p-5 dark:bg-slate-900 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold text-[#147c72]">Source-aware library</p><h2 className="font-serif text-2xl">Browse catalogue</h2></div><button type="button" onClick={() => setShowCatalog(false)} aria-label="Close catalogue"><X className="h-5 w-5" /></button></div><div className="relative mt-5"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><label className="sr-only" htmlFor="catalogue-search">Search catalogue</label><input id="catalogue-search" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} autoFocus placeholder="Search the full library by house or fragrance" className="h-11 w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></div><p aria-live="polite" className="mt-2 text-xs text-slate-500">{catalogLoading ? 'Searching the full catalogue...' : `${catalogEntries.length} ${catalogEntries.length === 1 ? 'result' : 'results'}${catalogQuery.trim() ? ` for “${catalogQuery.trim()}”` : ''}`}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{catalogEntries.map((entry) => <article key={entry.id} className="flex min-h-36 gap-4 border border-[#dfe7e0] p-3 dark:border-slate-800"><BottleImage officialUrl={entry.imageUrl} label={`${entry.house} ${entry.name}`} compact /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#147c72]">{entry.house}</p><p className="mt-1 text-sm font-semibold">{entry.name}{entry.concentration ? ` · ${entry.concentration}` : ''}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{[entry.olfactiveFamily, detailText(entry.notes), entry.releaseYear ? String(entry.releaseYear) : ''].filter(Boolean).join(' · ') || 'Source-attributed catalogue identity'}</p>{entry.source.url && <a href={entry.source.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#147c72] underline">{entry.source.name}</a>}<button type="button" disabled={busy || entry.isInCollection} onClick={() => void addCatalogFragrance(entry)} className="mt-3 h-8 border border-[#147c72] px-2 text-xs font-semibold text-[#147c72] disabled:cursor-default disabled:border-slate-300 disabled:text-slate-400">{entry.isInCollection ? 'In collection' : 'Add bottle'}</button></div></article>)}{!catalogLoading && !catalogEntries.length && <div className="col-span-full border-y border-[#dfe7e0] py-8 text-center dark:border-slate-800"><p className="text-sm text-slate-500">No matching release found yet.</p><button type="button" onClick={() => { setShowCatalog(false); openManualAdd(catalogQuery.trim()); }} className="mt-3 text-sm font-semibold text-[#147c72] underline">Add this bottle with your own photo</button></div>}</div>{catalogHasMore && <div className="mt-5 text-center"><button type="button" disabled={catalogLoading} onClick={() => void loadCatalog(catalogQuery, catalogEntries.length)} className="h-10 border border-[#147c72] px-4 text-sm font-semibold text-[#147c72] disabled:opacity-60">{catalogLoading ? 'Loading more...' : 'Show more results'}</button></div>}</div></div>}

    {showAdd && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-6"><form onSubmit={addFragrance} role="dialog" aria-modal="true" aria-label="Bottle reader" className="max-h-[92vh] w-full max-w-lg overflow-y-auto bg-white p-5 dark:bg-slate-900 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold text-[#147c72]">{scanPreviewUrl ? 'Guided bottle scan' : 'Private collection'}</p><h2 className="font-serif text-2xl">{scanPreviewUrl ? 'Confirm bottle label' : 'Add fragrance'}</h2></div><button type="button" onClick={closeAdd} aria-label="Close bottle reader"><X className="h-5 w-5" /></button></div>{scanPreviewUrl && <div className="mt-5 grid gap-4 border-y border-[#dfe7e0] py-4 dark:border-slate-800 sm:grid-cols-[120px_1fr]"><img src={scanPreviewUrl} alt="Bottle label selected for reading" className="h-36 w-full object-contain" /><div aria-live="polite" className="space-y-2">{scanStages.map((stage, index) => { const currentIndex = scanStageIndex(scanPhase); const complete = currentIndex > index || scanPhase === 'ready' && index < scanStages.length - 1; const current = scanPhase === stage.id && scanPhase !== 'ready'; return <div key={stage.id} className="flex items-center gap-2 text-sm">{current ? <LoaderCircle className="h-4 w-4 animate-spin text-[#147c72]" /> : complete || scanPhase === 'ready' && stage.id === 'ready' ? <CheckCircle2 className="h-4 w-4 text-[#147c72]" /> : <Circle className="h-4 w-4 text-slate-300" />}<span className={current ? 'font-semibold text-[#18221f] dark:text-slate-100' : 'text-slate-500'}>{stage.label}</span></div>; })}</div></div>}{!scanPreviewUrl && <div className="mt-5 border-y border-[#dfe7e0] py-4 dark:border-slate-800"><div className="flex items-center gap-4">{manualPhotoPreview ? <img src={manualPhotoPreview} alt="Bottle photo selected for collection" className="h-20 w-20 object-contain" /> : <div className="flex h-20 w-20 items-center justify-center bg-[#edf3ee] text-[#147c72] dark:bg-slate-800"><ImagePlus className="h-7 w-7" /></div>}<div><p className="text-sm font-semibold">Your bottle photo</p><p className="mt-1 text-xs text-slate-500">Private to this profile. It will take priority over an official image.</p><div className="mt-2 flex gap-3"><label className="cursor-pointer text-xs font-semibold text-[#147c72] underline">{manualPhoto ? 'Replace photo' : 'Add photo'}<input aria-label="Add bottle photo while creating fragrance" type="file" accept="image/*" capture="environment" className="hidden" onChange={uploadManualPreview} /></label>{manualPhoto && <button type="button" onClick={clearManualPhoto} className="text-xs font-semibold text-[#b84368] underline">Remove</button>}</div></div></div></div>}{draft?.ocrError && <p className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">{draft.ocrError} You can enter the label below instead.</p>}{draft?.ocrStatus === 'needs_manual_review' && !draft.ocrError && <p className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">The label was not clear enough to save automatically. Check the details below.</p>}{draft?.extractedText && <div className="mt-4 border border-[#dfe7e0] p-3 text-sm dark:border-slate-800"><p className="text-xs font-semibold text-[#147c72]">Label text read</p><p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{draft.extractedText}</p>{draft.ocrConfidence != null && <p className="mt-2 text-xs text-slate-500">Recognition confidence: {Math.round(draft.ocrConfidence * 100)}%</p>}</div>}{draft?.ocrUsage && formatUsd(draft.ocrUsage.estimatedUsd) && <p className="mt-3 text-xs text-slate-500">This scan used {formatUsd(draft.ocrUsage.estimatedUsd)} of vision processing.</p>}{draft?.matchCandidates && draft.matchCandidates.length > 0 && <div className="mt-4"><p className="text-xs font-semibold text-[#147c72]">Possible matches</p><div className="mt-2 grid gap-2">{draft.matchCandidates.map((match) => <button key={`${match.id}-${match.house}-${match.name}`} type="button" onClick={() => setForm({ house: match.house, name: match.name, concentration: match.concentration || '' })} className="flex items-center justify-between border border-[#dfe7e0] p-3 text-left hover:bg-[#f3f7f2] dark:border-slate-800 dark:hover:bg-slate-800"><span><span className="block text-xs font-semibold text-[#147c72]">{match.source === 'household' ? 'Household recognition' : 'Catalogue match'}</span><span className="block text-sm font-semibold">{match.house} {match.name}</span></span><span className="text-xs text-slate-500">Use match</span></button>)}</div></div>}<fieldset disabled={scanPreviewUrl !== null && scanPhase !== 'ready'} className="mt-5 grid gap-3 disabled:opacity-60"><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">House<input aria-label="Fragrance house" required value={form.house} onChange={(event) => setForm({ ...form, house: event.target.value })} placeholder="e.g. Kilian" className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fragrance name<input aria-label="Fragrance name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Fragrance name" className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Concentration<input aria-label="Fragrance concentration" value={form.concentration} onChange={(event) => setForm({ ...form, concentration: event.target.value })} placeholder="Optional, e.g. Eau de Parfum" className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label></fieldset><button disabled={busy || scanPreviewUrl !== null && scanPhase !== 'ready'} className="mt-5 h-11 w-full rounded-md bg-[#147c72] text-sm font-semibold text-white disabled:opacity-60">{busy && scanPhase === 'ready' ? 'Saving...' : scanPreviewUrl !== null && scanPhase !== 'ready' ? 'Reading bottle label...' : 'Save to collection'}</button></form></div>}

    {showLog && selected && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-6"><form onSubmit={logWear} className="max-h-[92vh] w-full max-w-md overflow-y-auto bg-white p-5 dark:bg-slate-900 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold text-[#147c72]">{editingWearLog ? 'Edit wear test' : 'Wear test'}</p><h2 className="font-serif text-2xl">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">Move the sliders to capture how it actually wore for you.</p></div><button type="button" onClick={() => { setShowLog(false); setEditingWearLog(null); }} aria-label="Close wear test"><X className="h-5 w-5" /></button></div><label className="mt-5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Date worn<input aria-label="Date worn" type="date" value={wearForm.wornAt} onChange={(event) => setWearForm({ ...wearForm, wornAt: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><div className="mt-6 space-y-6"><RangeField label="Enjoyment" value={wearForm.overallRating} min={1} max={5} onChange={(overallRating) => setWearForm({ ...wearForm, overallRating })} description={enjoymentLabels[wearForm.overallRating - 1]} leftLabel="Not for me" rightLabel="Exceptional" /><RangeField label="Longevity" value={wearForm.longevityHours} min={0} max={12} step={0.5} onChange={(longevityHours) => setWearForm({ ...wearForm, longevityHours })} description={longevityLabel(wearForm.longevityHours)} leftLabel="Faded quickly" rightLabel="12+ hours" /><RangeField label="Projection" value={wearForm.projectionRating} min={1} max={5} onChange={(projectionRating) => setWearForm({ ...wearForm, projectionRating })} description={projectionLabels[wearForm.projectionRating - 1]} leftLabel="Close to skin" rightLabel="Room filling" /></div><button type="button" onClick={() => setWearForm({ ...wearForm, showContext: !wearForm.showContext })} className="mt-6 text-sm font-semibold text-[#147c72] underline">{wearForm.showContext ? 'Hide context' : 'Add optional context'}</button>{wearForm.showContext && <div className="mt-3 grid gap-3 sm:grid-cols-3"><input value={wearForm.sprays} onChange={(event) => setWearForm({ ...wearForm, sprays: event.target.value })} placeholder="Sprays" className="h-10 rounded-md border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-950" /><input value={wearForm.occasion} onChange={(event) => setWearForm({ ...wearForm, occasion: event.target.value })} placeholder="Occasion" className="h-10 rounded-md border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-950" /><input value={wearForm.weather} onChange={(event) => setWearForm({ ...wearForm, weather: event.target.value })} placeholder="Weather" className="h-10 rounded-md border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></div>}<textarea value={wearForm.notes} onChange={(event) => setWearForm({ ...wearForm, notes: event.target.value })} className="mt-4 min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Anything worth remembering?" /><button disabled={busy} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#147c72] text-sm font-semibold text-white"><Timer className="h-4 w-4" />{editingWearLog ? 'Save wear test changes' : 'Save wear test'}</button></form></div>}

    {detailFragrance && <div className="fixed inset-0 z-40 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-6"><section role="dialog" aria-modal="true" aria-label={`Wear history for ${detailFragrance.house} ${detailFragrance.name}`} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-white p-5 dark:bg-slate-900 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-[#147c72]">Personal wear history</p><h2 className="mt-1 font-serif text-2xl">{detailFragrance.house} {detailFragrance.name}</h2><p className="mt-2 text-xs text-slate-500">Edit a test whenever you record a later longevity follow-up or want to correct context.</p></div><button type="button" onClick={() => setDetailFragrance(null)} aria-label="Close wear history"><X className="h-5 w-5" /></button></div><div className="mt-5 flex justify-end"><button type="button" onClick={() => openWearLog(detailFragrance)} className="inline-flex h-9 items-center gap-2 border border-[#147c72] px-3 text-xs font-semibold text-[#147c72]"><Plus className="h-4 w-4" />Log another wear</button></div><div className="mt-6"><h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Patterns from your own tests</h3><div className="mt-3 grid gap-px overflow-hidden border border-[#dfe7e0] bg-[#dfe7e0] sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-800">{trendText(detailFragrance.wearLogs).slice(0, 6).map((trend) => <div key={trend.label} className="bg-white p-3 dark:bg-slate-900"><p className="text-xs font-semibold text-[#147c72]">{trend.label}</p><p className="mt-1 text-xs text-slate-500">{trend.value}</p></div>)}{!detailFragrance.wearLogs.length && <div className="col-span-full bg-white p-4 text-sm text-slate-500 dark:bg-slate-900">Your first wear test will create the beginning of this history.</div>}</div></div><div className="mt-6"><h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Wear tests</h3><div className="mt-3 divide-y divide-[#dfe7e0] border-y border-[#dfe7e0] dark:divide-slate-800 dark:border-slate-800">{detailFragrance.wearLogs.map((log, index) => <div key={log.id || `${log.wornAt}-${index}`} className="py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{formattedWearDate(log.wornAt)}</p><p className="mt-1 text-xs text-slate-500">{[log.overallRating ? `${log.overallRating}/5 enjoyment` : null, log.longevityHours != null ? longevityLabel(log.longevityHours) : null, log.projectionRating ? `${log.projectionRating}/5 projection` : null].filter(Boolean).join(' · ') || 'No ratings recorded'}</p>{log.context && <p className="mt-1 text-xs text-slate-500">{[log.context.occasion ? `Occasion: ${log.context.occasion}` : null, log.context.weather ? `Weather: ${log.context.weather}` : null, log.context.sprays ? `${log.context.sprays} sprays` : null].filter(Boolean).join(' · ')}</p>}{log.notes && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{log.notes}</p>}</div><button type="button" onClick={() => openWearLog(detailFragrance, log)} aria-label={`Edit wear test from ${formattedWearDate(log.wornAt)}`} className="inline-flex h-8 items-center gap-1 border border-[#c8d8ce] px-2 text-xs font-semibold text-[#147c72]"><Pencil className="h-3.5 w-3.5" />{log.longevityHours == null ? 'Add longevity follow-up' : 'Edit'}</button></div></div>)}</div></div></section></div>}

    {showCandidate && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-6"><form onSubmit={addCandidate} className="w-full max-w-md bg-white p-5 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-[#147c72]">Evidence-led shortlist</p><h2 className="font-serif text-2xl">Add a candidate</h2></div><button type="button" onClick={() => setShowCandidate(false)} aria-label="Close candidate form"><X className="h-5 w-5" /></button></div><p className="mt-3 text-xs text-slate-500">Every candidate needs a source, so recommendations remain traceable.</p><div className="mt-4 grid gap-3"><input required value={candidate.house} onChange={(event) => setCandidate({ ...candidate, house: event.target.value })} placeholder="House" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /><input required value={candidate.name} onChange={(event) => setCandidate({ ...candidate, name: event.target.value })} placeholder="Fragrance name" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /><input required value={candidate.sourceName} onChange={(event) => setCandidate({ ...candidate, sourceName: event.target.value })} placeholder="Source name" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /><input required type="url" value={candidate.sourceUrl} onChange={(event) => setCandidate({ ...candidate, sourceUrl: event.target.value })} placeholder="Source link" className="h-11 rounded-md border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /></div><button disabled={busy} className="mt-5 h-11 w-full rounded-md bg-[#147c72] text-sm font-semibold text-white disabled:opacity-60">Save candidate</button></form></div>}
  </div></div>;
};
