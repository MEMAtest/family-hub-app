'use client'

import { Dialog } from '@headlessui/react';
import { ArrowRight, Building2, ChevronRight, CircleHelp, ExternalLink, Link2, MapPin, Phone, Plus, Search, ShieldCheck, Star, Trash2, Wrench, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { UpcomingContractorVisits } from '@/components/contractors';
import { useContractorContext } from '@/contexts/familyHub/ContractorContext';
import { useFamilyStore } from '@/store/familyStore';
import {
  CONTRACTOR_SPECIALTIES,
  CONTRACTOR_STATUSES,
  Contractor,
  ContractorCandidate,
  ContractorCheckState,
  ContractorProfile,
  ContractorSpecialty,
  ContractorStatus,
} from '@/types/contractor.types';

const formatMoney = (amount: number) => new Intl.NumberFormat('en-GB', {
  style: 'currency', currency: 'GBP', maximumFractionDigits: 0,
}).format(amount);

const statusStyles: Record<ContractorStatus, string> = {
  candidate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  contacted: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  visit_booked: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  quoted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  shortlisted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  selected: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  completed: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
};

const checkLabels: Record<string, string> = {
  identity: 'Identity and contact details match',
  relevantWork: 'Evidence of similar completed work',
  reviews: 'Recent, source-linked customer feedback',
  insurance: 'Current public liability insurance',
  writtenQuote: 'Written, itemised scope and quote',
  guarantee: 'Guarantee or warranty explained',
  paymentTerms: 'Payment stages and deposit agreed',
  references: 'References checked',
  access: 'Access, scaffolding and waste removal agreed',
};

const tradeChecks = (specialty: string) => [
  'identity', 'relevantWork', 'reviews', 'insurance', 'writtenQuote', 'guarantee', 'paymentTerms', 'references',
  ...(['roofer', 'builder'].includes(specialty) ? ['access'] : []),
];

const statusLabel = (value?: string) => CONTRACTOR_STATUSES.find((item) => item.value === value)?.label ?? 'Considering';
const sourceLabel = (kind: string) => ({
  companies_house: 'Companies House', google: 'Google', checkatrade: 'Checkatrade', trustpilot: 'Trustpilot', community: 'Community', website: 'Website', manual: 'Added manually',
}[kind] ?? kind);

const hostname = (value?: string) => {
  try { return value ? new URL(value).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
};

const contractorKey = (value: Pick<Contractor, 'name' | 'website' | 'phone' | 'companyNumber'>) =>
  value.companyNumber?.toLowerCase() || hostname(value.website) || value.phone?.replace(/\D/g, '') || value.name.trim().toLowerCase();

function EvidenceRating({ rating, count }: { rating?: number; count?: number }) {
  if (rating === undefined) return null;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300"><Star className="h-3.5 w-3.5 fill-current" />{rating.toFixed(1)}{count !== undefined ? ` (${count})` : ''}</span>;
}

function ProfileDialog({ contractor, projects, onClose, onSave, onDelete }: {
  contractor: Contractor | null;
  projects: Array<{ id: string; title: string }>;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Contractor>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Contractor | null>(contractor);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => setDraft(contractor), [contractor]);
  if (!draft) return null;
  const profile = draft.profile ?? {};
  const checks = profile.checks ?? {};
  const setProfile = (updates: Partial<ContractorProfile>) => setDraft({ ...draft, profile: { ...profile, ...updates } });
  const toggleProject = (projectId: string) => {
    const ids = profile.projectIds ?? [];
    setProfile({ projectIds: ids.includes(projectId) ? ids.filter((id) => id !== projectId) : [...ids, projectId] });
  };
  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft.id, {
        name: draft.name.trim(), company: draft.company?.trim() || undefined, phone: draft.phone?.trim() || undefined,
        email: draft.email?.trim() || undefined, address: draft.address?.trim() || undefined,
        website: draft.website?.trim() || undefined, imageUrl: draft.imageUrl?.trim() || undefined,
        serviceArea: draft.serviceArea?.trim() || undefined, companyNumber: draft.companyNumber?.trim() || undefined,
        specialty: draft.specialty, status: draft.status, notes: draft.notes?.trim() || undefined, profile: draft.profile,
      });
      toast.success('Contractor profile updated');
      onClose();
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Remove ${draft.name} from your contractor directory?`)) return;
    setDeleting(true);
    try {
      await onDelete(draft.id);
      toast.success('Contractor removed');
      onClose();
    } finally { setDeleting(false); }
  };
  return <Dialog open={Boolean(contractor)} onClose={onClose} className="relative z-[80]">
    <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
    <div className="fixed inset-0 flex justify-end"><Dialog.Panel className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl dark:bg-slate-950">
      <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-700"><div className="min-w-0"><Dialog.Title className="truncate text-lg font-semibold text-gray-900 dark:text-slate-100">{draft.name}</Dialog.Title><p className="text-xs text-gray-500">Candidate profile and checks</p></div><button type="button" onClick={onClose} aria-label="Close profile" title="Close" className="rounded-md p-3 hover:bg-gray-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[9rem_1fr]"><div className="flex h-36 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800">{draft.imageUrl ? <img src={draft.imageUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-10 w-10 text-gray-400" />}</div><div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-gray-600 dark:text-slate-300">Name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border-gray-300 text-sm dark:bg-slate-900" /></label>
          <label className="text-xs text-gray-600 dark:text-slate-300">Trade<select value={draft.specialty} onChange={(event) => setDraft({ ...draft, specialty: event.target.value as ContractorSpecialty })} className="mt-1 min-h-11 w-full rounded-md border-gray-300 text-sm dark:bg-slate-900">{CONTRACTOR_SPECIALTIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="text-xs text-gray-600 dark:text-slate-300">Status<select value={draft.status ?? 'candidate'} onChange={(event) => setDraft({ ...draft, status: event.target.value as ContractorStatus })} className="mt-1 min-h-11 w-full rounded-md border-gray-300 text-sm dark:bg-slate-900">{CONTRACTOR_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="text-xs text-gray-600 dark:text-slate-300">Company number<input value={draft.companyNumber ?? ''} onChange={(event) => setDraft({ ...draft, companyNumber: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border-gray-300 text-sm dark:bg-slate-900" /></label>
        </div></div>
        <section className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Contact</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-gray-600 dark:text-slate-300">Phone<input value={draft.phone ?? ''} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border-gray-300 text-sm dark:bg-slate-900" /></label><label className="text-xs text-gray-600 dark:text-slate-300">Email<input type="email" value={draft.email ?? ''} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border-gray-300 text-sm dark:bg-slate-900" /></label>
          <label className="text-xs text-gray-600 dark:text-slate-300 sm:col-span-2">Website<input type="url" value={draft.website ?? ''} onChange={(event) => setDraft({ ...draft, website: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border-gray-300 text-sm dark:bg-slate-900" /></label><label className="text-xs text-gray-600 dark:text-slate-300 sm:col-span-2">Address<input value={draft.address ?? ''} onChange={(event) => setDraft({ ...draft, address: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border-gray-300 text-sm dark:bg-slate-900" /></label><label className="text-xs text-gray-600 dark:text-slate-300 sm:col-span-2">Area served<input value={draft.serviceArea ?? ''} onChange={(event) => setDraft({ ...draft, serviceArea: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border-gray-300 text-sm dark:bg-slate-900" /></label>
        </div></section>
        {projects.length > 0 && <section className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Projects</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{projects.map((project) => <label key={project.id} className="flex min-h-11 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm dark:border-slate-700"><input type="checkbox" checked={(profile.projectIds ?? []).includes(project.id)} onChange={() => toggleProject(project.id)} className="rounded" />{project.title}</label>)}</div></section>}
        <section className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">What good looks like</h3><p className="mt-1 text-xs text-gray-500">These are separate checks, not an automatic trust score.</p><div className="mt-3 space-y-2">{tradeChecks(draft.specialty).map((key) => <div key={key} className="flex min-h-11 items-center justify-between gap-3 border-b border-gray-100 py-2 dark:border-slate-800"><span className="text-sm text-gray-700 dark:text-slate-200">{checkLabels[key]}</span><select aria-label={checkLabels[key]} value={checks[key] ?? 'needs_check'} onChange={(event) => setProfile({ checks: { ...checks, [key]: event.target.value as ContractorCheckState } })} className="min-h-10 rounded-md border-gray-300 text-xs dark:bg-slate-900"><option value="needs_check">Needs checking</option><option value="confirmed">Confirmed</option><option value="not_applicable">Not applicable</option></select></div>)}</div></section>
        <section className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Evidence</h3>{(profile.evidence ?? []).length === 0 ? <p className="mt-2 text-sm text-gray-500">No source links yet.</p> : <div className="mt-3 space-y-3">{(profile.evidence ?? []).map((evidence, index) => <a key={`${evidence.url}-${index}`} href={evidence.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-md border border-gray-200 p-3 hover:border-teal-500 dark:border-slate-700"><div><p className="text-sm font-medium text-gray-900 dark:text-slate-100">{sourceLabel(evidence.kind)}</p><p className="mt-1 text-xs text-gray-500">{evidence.summary || evidence.title}</p><EvidenceRating rating={evidence.rating} count={evidence.reviewCount} /></div><ExternalLink className="h-4 w-4 shrink-0 text-gray-400" /></a>)}</div>}</section>
        {(profile.previousWork ?? []).length > 0 && <section className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Previous work links</h3><div className="mt-2 space-y-2">{profile.previousWork?.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between text-sm text-teal-700 hover:underline">{item.title || hostname(item.url)}<ExternalLink className="h-4 w-4" /></a>)}</div></section>}
        <label className="mt-6 block border-t border-gray-200 pt-5 text-xs text-gray-600 dark:border-slate-700 dark:text-slate-300">Household notes<textarea rows={4} value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-1 w-full rounded-md border-gray-300 text-sm dark:bg-slate-900" /></label>
      </div>
      <footer className="flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-slate-700 dark:bg-slate-950"><button type="button" disabled={deleting || saving} onClick={() => void remove()} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-rose-700 disabled:opacity-50 dark:text-rose-300"><Trash2 className="h-4 w-4" />{deleting ? 'Removing...' : 'Remove'}</button><div className="ml-auto flex gap-3"><button type="button" onClick={onClose} className="min-h-11 px-4 text-sm">Cancel</button><button type="button" disabled={saving || deleting || !draft.name.trim()} onClick={() => void save()} className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save profile'}</button></div></footer>
    </Dialog.Panel></div>
  </Dialog>;
}

export const ContractorView = () => {
  const searchParams = useSearchParams();
  const { contractors, appointments, openQuickAppointment, getSpecialtyLabel, createContractor, updateContractor, deleteContractor } = useContractorContext();
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const projects = useFamilyStore((state) => state.propertyProjects);
  const requestedProject = searchParams.get('projectId') ?? '';
  const [mode, setMode] = useState<'name' | 'link'>('name');
  const [lookup, setLookup] = useState('');
  const [location, setLocation] = useState('SE20');
  const [lookupSpecialty, setLookupSpecialty] = useState<ContractorSpecialty>('other');
  const [projectId, setProjectId] = useState(requestedProject);
  const [results, setResults] = useState<ContractorCandidate[]>([]);
  const [providers, setProviders] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState<string>('all');
  const [status, setStatus] = useState<string>('active');
  const [selectedProfile, setSelectedProfile] = useState<Contractor | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  useEffect(() => { if (requestedProject) setProjectId(requestedProject); }, [requestedProject]);

  const filteredContractors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contractors.filter((contractor) => specialty === 'all' || contractor.specialty === specialty)
      .filter((contractor) => status === 'all' || (status === 'active' ? contractor.status !== 'rejected' : contractor.status === status))
      .filter((contractor) => !q || [contractor.name, contractor.company, contractor.email, contractor.phone, contractor.website, contractor.serviceArea].some((value) => value?.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contractors, query, specialty, status]);
  const compared = compareIds.map((id) => contractors.find((contractor) => contractor.id === id)).filter(Boolean) as Contractor[];
  const { history, totalSpend } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const history = appointments.filter((appointment) => appointment.status !== 'scheduled' || appointment.date < today).slice().sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)).map((appointment) => ({ ...appointment, contractor: contractors.find((contractor) => contractor.id === appointment.contractorId) }));
    return { history, totalSpend: appointments.reduce((sum, appointment) => sum + (appointment.cost || 0), 0) };
  }, [appointments, contractors]);

  const runSearch = async () => {
    if (!lookup.trim() || !familyId) return;
    setSearching(true); setSearchError(''); setResults([]); setProviders({});
    try {
      const response = await fetch(`/api/families/${familyId}/contractors/discover`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mode === 'link' ? { url: lookup.trim(), specialty: lookupSpecialty } : { query: lookup.trim(), location: location.trim(), specialty: lookupSpecialty }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Search failed.');
      setResults(payload.candidates ?? []); setProviders(payload.providers ?? {});
      if (!(payload.candidates ?? []).length) setSearchError('No clear match found. Add the company manually or paste its website link.');
    } catch (error) { setSearchError(error instanceof Error ? error.message : 'Search failed.'); }
    finally { setSearching(false); }
  };

  const saveCandidate = async (candidate: ContractorCandidate) => {
    const key = contractorKey(candidate);
    const existing = contractors.find((contractor) => contractorKey(contractor) === key);
    const evidence = [...(existing?.profile?.evidence ?? []), ...(candidate.evidence ?? [])].filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index);
    const projectIds = [...new Set([...(existing?.profile?.projectIds ?? []), ...(projectId ? [projectId] : [])])];
    const profile: ContractorProfile = { ...(existing?.profile ?? {}), summary: candidate.summary || existing?.profile?.summary, companyStatus: candidate.companyStatus || existing?.profile?.companyStatus, projectIds, evidence, previousWork: candidate.previousWork ?? existing?.profile?.previousWork, lastEnrichedAt: new Date().toISOString() };
    if (existing) {
      await updateContractor(existing.id, { company: candidate.company || existing.company, phone: candidate.phone || existing.phone, email: candidate.email || existing.email, address: candidate.address || existing.address, website: candidate.website || existing.website, imageUrl: candidate.imageUrl || existing.imageUrl, serviceArea: candidate.serviceArea || existing.serviceArea, companyNumber: candidate.companyNumber || existing.companyNumber, specialty: candidate.specialty === 'other' ? existing.specialty : candidate.specialty, profile });
      toast.success(`${existing.name} updated with this source`); return;
    }
    const saved = await createContractor({ name: candidate.name, company: candidate.company, phone: candidate.phone, email: candidate.email, address: candidate.address, specialty: candidate.specialty === 'other' ? lookupSpecialty : candidate.specialty, website: candidate.website, imageUrl: candidate.imageUrl, serviceArea: candidate.serviceArea || location, companyNumber: candidate.companyNumber, status: 'candidate', profile });
    toast.success(`${saved.name} saved as a candidate`);
  };
  const saveManual = async () => {
    if (!lookup.trim()) return;
    const isLink = mode === 'link';
    const website = isLink ? lookup.trim() : undefined;
    const host = hostname(website);
    const kind = host.endsWith('checkatrade.com') ? 'checkatrade' : host.endsWith('trustpilot.com') ? 'trustpilot' : host.endsWith('eastdulwichforum.co.uk') ? 'community' : 'website';
    const name = isLink ? host || 'Contractor lead' : lookup.trim();
    const saved = await createContractor({
      name, company: isLink ? undefined : name, website, specialty: lookupSpecialty, status: 'candidate', serviceArea: location,
      profile: {
        projectIds: projectId ? [projectId] : [],
        evidence: website ? [{ kind, title: 'Shared link', url: website, summary: 'The page could not be read automatically. Review it in your browser and confirm the company details.', fetchedAt: new Date().toISOString() }] : [],
        lastEnrichedAt: new Date().toISOString(),
      },
    });
    toast.success(`${saved.name} saved for follow-up`);
    if (isLink) setSelectedProfile(saved);
  };
  const toggleCompare = (id: string) => setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 4 ? [...current, id] : (toast.error('Compare up to four companies'), current));

  return <div className="min-h-full space-y-7 bg-gray-50 p-3 pb-28 dark:bg-slate-950 sm:p-5 lg:p-8">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Contractors & trades</h2><p className="text-sm text-gray-600 dark:text-slate-400">Find, check and compare companies before you appoint them.</p></div><button onClick={openQuickAppointment} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700"><Plus className="h-4 w-4" />Book appointment</button></div>
    <section className="overflow-hidden rounded-lg border border-teal-200 bg-white dark:border-teal-900 dark:bg-slate-900"><div className="border-b border-teal-100 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/30 sm:p-5"><div className="flex items-center gap-2"><Search className="h-5 w-5 text-teal-700" /><h3 className="font-semibold text-gray-900 dark:text-slate-100">Find a trade</h3></div><p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Enter a company name or share its website. You choose the correct match before anything is saved.</p></div><div className="p-4 sm:p-5">
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800" role="group" aria-label="Lookup method"><button onClick={() => { setMode('name'); setLookup(''); setResults([]); setSearchError(''); }} className={`min-h-10 rounded-md px-4 text-sm ${mode === 'name' ? 'bg-white font-medium text-teal-800 shadow-sm dark:bg-slate-700 dark:text-teal-200' : 'text-gray-600 dark:text-slate-300'}`}>Company name</button><button onClick={() => { setMode('link'); setLookup(''); setResults([]); setSearchError(''); }} className={`min-h-10 rounded-md px-4 text-sm ${mode === 'link' ? 'bg-white font-medium text-teal-800 shadow-sm dark:bg-slate-700 dark:text-teal-200' : 'text-gray-600 dark:text-slate-300'}`}>Paste link</button></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(9rem,1fr)_minmax(10rem,1fr)_auto]"><label className="relative block"><span className="sr-only">{mode === 'name' ? 'Company name' : 'Company link'}</span>{mode === 'link' ? <Link2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" /> : <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />}<input value={lookup} onChange={(event) => setLookup(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void runSearch(); }} placeholder={mode === 'name' ? 'e.g. Acme Roofing' : 'Paste company, Checkatrade or forum link'} className="min-h-11 w-full rounded-lg border-gray-300 pl-10 text-sm dark:bg-slate-950" /></label>{mode === 'name' && <label><span className="sr-only">Area or postcode</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Area or postcode" className="min-h-11 w-full rounded-lg border-gray-300 text-sm dark:bg-slate-950" /></label>}<select aria-label="Trade" value={lookupSpecialty} onChange={(event) => setLookupSpecialty(event.target.value as ContractorSpecialty)} className="min-h-11 w-full rounded-lg border-gray-300 text-sm dark:bg-slate-950"><option value="other">Any trade</option>{CONTRACTOR_SPECIALTIES.filter((item) => item.value !== 'other').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button disabled={searching || !lookup.trim() || !familyId} onClick={() => void runSearch()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-medium text-white disabled:opacity-50">{searching ? 'Checking...' : 'Find company'}<ArrowRight className="h-4 w-4" /></button></div>
      {projects.length > 0 && <label className="mt-3 block max-w-md text-xs text-gray-600 dark:text-slate-300">Save to project<select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border-gray-300 text-sm dark:bg-slate-950"><option value="">General directory</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>}
      {providers.google === 'not_configured' && results.length > 0 && <p className="mt-3 text-xs text-gray-500">Registered-company matches are available. Local business ratings will appear when Google Places is connected.</p>}
      {searchError && <div className="mt-4 flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between"><p role="alert" className="text-sm text-amber-900">{searchError}</p><button onClick={() => void saveManual()} className="min-h-10 shrink-0 rounded-md border border-amber-600 px-3 text-sm font-medium text-amber-900">{mode === 'name' ? 'Save name for follow-up' : 'Save link for review'}</button></div>}
      {results.length > 0 && <div className="mt-5"><p className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-100">Possible matches</p><div className="grid gap-3 lg:grid-cols-2">{results.map((candidate) => <article key={candidate.candidateId} className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-lg border border-gray-200 p-3 dark:border-slate-700"><div className="flex h-16 items-center justify-center overflow-hidden rounded-md bg-gray-100 dark:bg-slate-800">{candidate.imageUrl ? <img src={candidate.imageUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-7 w-7 text-gray-400" />}</div><div className="min-w-0"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{candidate.name}</h4><p className="text-xs text-gray-500">{getSpecialtyLabel(candidate.specialty)}</p></div><EvidenceRating rating={candidate.rating} count={candidate.reviewCount} /></div>{candidate.address && <p className="mt-2 line-clamp-2 text-xs text-gray-600 dark:text-slate-300"><MapPin className="mr-1 inline h-3 w-3" />{candidate.address}</p>}<p className="mt-2 text-xs text-gray-500">{candidate.matchReason}</p><div className="mt-3 flex flex-wrap items-center gap-2">{candidate.evidence.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-md bg-gray-100 px-2 text-xs text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200">{sourceLabel(item.kind)}<ExternalLink className="h-3 w-3" /></a>)}<button onClick={() => void saveCandidate(candidate)} className="ml-auto min-h-9 rounded-md bg-teal-700 px-3 text-xs font-medium text-white">Save candidate</button></div></div></article>)}</div></div>}
    </div></section>
    {compared.length > 0 && <section className="rounded-lg border border-indigo-200 bg-white p-4 dark:border-indigo-900 dark:bg-slate-900"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-gray-900 dark:text-slate-100">Compare candidates</h3><p className="text-xs text-gray-500">Evidence is shown separately; unknown does not mean failed.</p></div><button onClick={() => setCompareIds([])} className="min-h-10 px-3 text-sm text-indigo-700">Clear</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[44rem] text-left text-sm"><thead className="border-b border-gray-200 text-xs text-gray-500 dark:border-slate-700"><tr><th className="py-2 pr-4">Company</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Review evidence</th><th className="px-3 py-2">Identity</th><th className="px-3 py-2">Similar work</th><th className="px-3 py-2">Project</th></tr></thead><tbody>{compared.map((contractor) => { const evidence = contractor.profile?.evidence ?? []; const review = evidence.find((item) => item.rating !== undefined); const checks = contractor.profile?.checks ?? {}; return <tr key={contractor.id} className="border-b border-gray-100 dark:border-slate-800"><td className="py-3 pr-4 font-medium">{contractor.name}</td><td className="px-3 py-3">{statusLabel(contractor.status)}</td><td className="px-3 py-3">{review ? <EvidenceRating rating={review.rating} count={review.reviewCount} /> : 'Not found'}</td><td className="px-3 py-3">{checks.identity === 'confirmed' || contractor.companyNumber ? 'Confirmed' : 'Check'}</td><td className="px-3 py-3">{contractor.profile?.previousWork?.length ? `${contractor.profile.previousWork.length} link(s)` : 'Check'}</td><td className="px-3 py-3">{(contractor.profile?.projectIds ?? []).map((id) => projects.find((project) => project.id === id)?.title).filter(Boolean).join(', ') || 'General'}</td></tr>; })}</tbody></table></div></section>}
    <section className="grid gap-5 lg:grid-cols-3"><div className="lg:col-span-2"><UpcomingContractorVisits /></div><div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h3 className="flex items-center gap-2 text-base font-semibold"><Wrench className="h-5 w-5 text-amber-500" />Cost summary</h3><p className="mt-4 text-sm text-gray-500">Recorded appointment spend</p><p className="mt-1 text-2xl font-bold">{formatMoney(totalSpend)}</p></div></section>
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h3 className="font-semibold text-gray-900 dark:text-slate-100">Your directory</h3><p className="text-xs text-gray-500">Saved companies, evidence and household decisions.</p></div><div className="grid gap-2 sm:grid-cols-3"><label className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved companies" className="min-h-11 w-full rounded-lg border-gray-300 pl-9 text-sm dark:bg-slate-950" /></label><select aria-label="Filter by trade" value={specialty} onChange={(event) => setSpecialty(event.target.value)} className="min-h-11 rounded-lg border-gray-300 text-sm dark:bg-slate-950"><option value="all">All trades</option>{CONTRACTOR_SPECIALTIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-lg border-gray-300 text-sm dark:bg-slate-950"><option value="active">Active candidates</option><option value="all">All statuses</option>{CONTRACTOR_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div></div>
      {filteredContractors.length === 0 ? <div className="mt-5 rounded-lg border-2 border-dashed border-gray-200 p-7 text-center dark:border-slate-700"><CircleHelp className="mx-auto h-8 w-8 text-gray-400" /><p className="mt-2 text-sm font-medium">No saved companies match these filters</p><p className="mt-1 text-xs text-gray-500">Use Find a trade above to add the first candidate.</p></div> : <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredContractors.map((contractor) => { const evidence = contractor.profile?.evidence ?? []; const rating = evidence.find((item) => item.rating !== undefined); const confirmedChecks = Object.values(contractor.profile?.checks ?? {}).filter((value) => value === 'confirmed').length; return <article key={contractor.id} className="flex min-h-[13rem] flex-col rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white dark:bg-slate-900">{contractor.imageUrl ? <img src={contractor.imageUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-gray-400" />}</div><div className="min-w-0 flex-1"><h4 className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{contractor.name}</h4><p className="text-xs text-gray-500">{getSpecialtyLabel(contractor.specialty)}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${statusStyles[(contractor.status as ContractorStatus) ?? 'candidate']}`}>{statusLabel(contractor.status)}</span></div><label className="flex min-h-10 items-center gap-1 text-xs text-gray-500"><input type="checkbox" checked={compareIds.includes(contractor.id)} onChange={() => toggleCompare(contractor.id)} className="rounded" />Compare</label></div><div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-slate-300">{contractor.phone && <p><Phone className="mr-1 inline h-3.5 w-3.5" />{contractor.phone}</p>}{contractor.serviceArea && <p><MapPin className="mr-1 inline h-3.5 w-3.5" />{contractor.serviceArea}</p>}<div className="flex flex-wrap items-center gap-2"><EvidenceRating rating={rating?.rating} count={rating?.reviewCount} /><span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />{confirmedChecks} checks confirmed</span><span>{evidence.length} source{evidence.length === 1 ? '' : 's'}</span></div></div><button onClick={() => setSelectedProfile(contractor)} className="mt-auto flex min-h-11 items-center justify-between border-t border-gray-200 pt-3 text-sm font-medium text-teal-700 dark:border-slate-700 dark:text-teal-300">Open profile<ChevronRight className="h-4 w-4" /></button></article>; })}</div>}
    </section>
    <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h3 className="font-semibold text-gray-900 dark:text-slate-100">Appointment history</h3>{history.length === 0 ? <p className="mt-3 text-sm text-gray-500">No past appointments yet.</p> : <div className="mt-4 divide-y divide-gray-100 dark:divide-slate-800">{history.slice(0, 20).map((appointment) => <div key={appointment.id} className="flex min-h-14 items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{appointment.contractor?.name || 'Contractor'}: {appointment.purpose}</p><p className="text-xs text-gray-500">{appointment.date} {appointment.time} · {appointment.status}</p></div>{appointment.cost ? <p className="text-sm font-semibold">{formatMoney(appointment.cost)}</p> : <span className="text-xs text-gray-400">No cost recorded</span>}</div>)}</div>}</section>
    <ProfileDialog contractor={selectedProfile} projects={projects} onClose={() => setSelectedProfile(null)} onSave={updateContractor} onDelete={deleteContractor} />
  </div>;
};

export default ContractorView;
