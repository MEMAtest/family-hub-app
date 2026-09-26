'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  Bookmark,
  CalendarDays,
  CloudSun,
  ExternalLink,
  Home,
  Mail,
  MapPin,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { getKidsActivities, seasonOf, SEASON_LABELS, toDateKey } from '@/services/kidsActivitiesService';
import type { KidsEventMark } from '@/lib/sharedDocuments';
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  COST_BRACKET_COLORS,
  COST_BRACKET_LABELS,
  type AgeRange,
  type EventCategory,
  type KidsEvent,
} from '@/types/kidsEvents.types';
import { SharedSyncBadge } from '@/components/common/SharedSyncBadge';
import { MondayEmailSettingsModal } from '@/components/common/MondayEmailSettingsModal';

// Soft gradients per category for the card header (no stock photos, which
// would suggest the place looks like something it may not).
const CATEGORY_GRADIENTS: Record<EventCategory, string> = {
  free: 'from-emerald-200 to-teal-200 dark:from-emerald-900/60 dark:to-teal-900/60',
  museum: 'from-amber-200 to-orange-200 dark:from-amber-900/60 dark:to-orange-900/60',
  theatre: 'from-purple-200 to-fuchsia-200 dark:from-purple-900/60 dark:to-fuchsia-900/60',
  sports: 'from-sky-200 to-blue-200 dark:from-sky-900/60 dark:to-blue-900/60',
  arts: 'from-pink-200 to-rose-200 dark:from-pink-900/60 dark:to-rose-900/60',
  swimming: 'from-cyan-200 to-sky-200 dark:from-cyan-900/60 dark:to-sky-900/60',
  nature: 'from-green-200 to-lime-200 dark:from-green-900/60 dark:to-lime-900/60',
  science: 'from-indigo-200 to-violet-200 dark:from-indigo-900/60 dark:to-violet-900/60',
  music: 'from-rose-200 to-pink-200 dark:from-rose-900/60 dark:to-pink-900/60',
  festival: 'from-orange-200 to-yellow-200 dark:from-orange-900/60 dark:to-yellow-900/60',
  workshop: 'from-violet-200 to-purple-200 dark:from-violet-900/60 dark:to-purple-900/60',
  outdoor: 'from-lime-200 to-emerald-200 dark:from-lime-900/60 dark:to-emerald-900/60',
  indoor: 'from-slate-200 to-gray-200 dark:from-slate-800 dark:to-gray-800',
  other: 'from-gray-200 to-slate-200 dark:from-gray-800 dark:to-slate-800',
};

const AGE_FILTERS: Array<{ value: AgeRange | 'all'; label: string }> = [
  { value: 'all', label: 'Any age' },
  { value: 'toddler', label: 'Good for toddlers' },
  { value: 'preschool', label: 'Good for 3–6s' },
  { value: 'all-ages', label: 'Good for both' },
];

const CHILD_AGE_GROUPS = new Set(['Toddler', 'Preschool', 'Child']);

const ageInYears = (dateOfBirth: string, today: Date) => {
  const dob = new Date(`${dateOfBirth.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  let years = today.getFullYear() - dob.getFullYear();
  const beforeBirthday = today.getMonth() < dob.getMonth()
    || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) years -= 1;
  return years >= 0 ? years : null;
};

const listNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

const nextDateLabel = (date: string, today: Date) => {
  const todayKey = toDateKey(today);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (date === todayKey) return 'Today';
  if (date === toDateKey(tomorrow)) return 'Tomorrow';
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

const markId = (kind: KidsEventMark['kind'], eventId: string) => `${kind}:${eventId}`;

export const KidsEventsSection = () => {
  const people = useFamilyStore((state) => state.people);
  const marks = useFamilyStore((state) => state.kidsEventMarks);
  const toggleMark = useFamilyStore((state) => state.toggleKidsEventMark);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EventCategory | 'all'>('all');
  const [ageRange, setAgeRange] = useState<AgeRange | 'all'>('all');
  const [localOnly, setLocalOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [showDigestSettings, setShowDigestSettings] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const today = useMemo(() => new Date(), []);
  const season = SEASON_LABELS[seasonOf(today)];

  const kids = useMemo(() => people
    .filter((person) => CHILD_AGE_GROUPS.has(person.ageGroup))
    .map((person) => {
      const age = person.dateOfBirth ? ageInYears(person.dateOfBirth, today) : null;
      return age === null ? person.name : `${person.name} (${age})`;
    }), [people, today]);

  const markSet = useMemo(() => new Set(marks.map((mark) => mark.id)), [marks]);
  const isMarked = (kind: KidsEventMark['kind'], eventId: string) => markSet.has(markId(kind, eventId));

  const events = useMemo(() => getKidsActivities({
    search: search || undefined,
    categories: category === 'all' ? undefined : [category],
    ageRange: ageRange === 'all' ? undefined : ageRange,
    isLocal: localOnly || undefined,
    isFree: freeOnly || undefined,
  }, today).filter((event) => !savedOnly || markSet.has(markId('saved', event.id))), [search, category, ageRange, localOnly, freeOnly, savedOnly, markSet, today]);

  const categoriesInUse = useMemo(() => {
    const used = new Set(getKidsActivities({}, today).flatMap((event) => event.categories || [event.category]));
    return (Object.keys(CATEGORY_LABELS) as EventCategory[]).filter((cat) => used.has(cat));
  }, [today]);

  const savedCount = marks.filter((mark) => mark.kind === 'saved').length;
  const emailCount = marks.filter((mark) => mark.kind === 'subscribed').length;
  const localEvents = events.filter((event) => event.isLocal);
  const londonEvents = events.filter((event) => !event.isLocal);

  const handleToggle = (event: KidsEvent, kind: KidsEventMark['kind']) => {
    const wasMarked = isMarked(kind, event.id);
    toggleMark(event.id, kind);
    if (kind === 'subscribed') {
      toast.success(wasMarked ? 'Removed from the Monday email' : 'Will feature in the Monday email');
    }
  };

  const EventCard = ({ event }: { event: KidsEvent }) => {
    const saved = isMarked('saved', event.id);
    const inEmail = isMarked('subscribed', event.id);
    return (
      <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
        <div className={`relative flex h-28 items-end bg-gradient-to-br p-4 ${CATEGORY_GRADIENTS[event.category]}`}>
          <span className="absolute right-4 top-3 text-4xl" aria-hidden>{CATEGORY_ICONS[event.category]}</span>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-slate-900/70 dark:text-slate-100">
              {CATEGORY_LABELS[event.category]}
            </span>
            {event.pricing.isFree && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">Free</span>
            )}
            {event.isLocal && (
              <span className="flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                <MapPin className="h-3 w-3" /> Local
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h4 className="text-base font-semibold text-gray-900 dark:text-slate-100">{event.title}</h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{event.description}</p>

          <dl className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-500" />
              <dd>
                {event.timing.isAllDay ? (
                  <><span className="font-medium text-gray-900 dark:text-slate-100">{nextDateLabel(event.timing.date, today)}</span> · {event.timing.recurringPattern}</>
                ) : (
                  event.timing.recurringPattern
                )}
              </dd>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500" />
              <dd>
                {event.location.name}, {event.location.postcode}
                {event.location.distanceFromSE20 !== undefined && (
                  <span className="text-gray-400 dark:text-slate-500"> · about {event.location.distanceFromSE20} mi</span>
                )}
              </dd>
            </div>
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
              <dd>
                {event.suitableForToddlers && event.suitableForPreschool
                  ? 'Toddlers and older'
                  : event.suitableForPreschool ? 'Better for 3+' : 'Best for toddlers'}
                {event.maxAge !== undefined ? ` · up to ${event.maxAge}` : ''}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${COST_BRACKET_COLORS[event.costBracket]}`}>
              {event.pricing.isFree ? 'Free' : COST_BRACKET_LABELS[event.costBracket]}
            </span>
            {event.weatherDependent && (
              <span className="flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                <CloudSun className="h-3 w-3" /> Best on a dry day
              </span>
            )}
            {(event.features || []).slice(0, 3).map((feature) => (
              <span key={feature} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                {feature}
              </span>
            ))}
          </div>
          {event.pricing.priceNotes && (
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{event.pricing.priceNotes}</p>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-slate-700">
            <div className="flex gap-1.5">
              <button
                onClick={() => handleToggle(event, 'saved')}
                className={`rounded-lg p-2 transition-colors ${saved ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300'}`}
                aria-pressed={saved}
                aria-label={saved ? `Unsave ${event.title}` : `Save ${event.title}`}
                title={saved ? 'Saved for the family' : 'Save for the family'}
              >
                <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => handleToggle(event, 'subscribed')}
                className={`rounded-lg p-2 transition-colors ${inEmail ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300'}`}
                aria-pressed={inEmail}
                aria-label={inEmail ? `Remove ${event.title} from the Monday email` : `Add ${event.title} to the Monday email`}
                title={inEmail ? 'In the Monday email' : 'Add to the Monday email'}
              >
                <Bell className={`h-4 w-4 ${inEmail ? 'fill-current' : ''}`} />
              </button>
            </div>
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-medium text-purple-700 hover:text-purple-800 dark:text-purple-300"
            >
              Check times &amp; prices
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </article>
    );
  };

  const section = (title: string, icon: typeof Home, items: KidsEvent[]) => {
    if (items.length === 0) return null;
    const Icon = icon;
    return (
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
          <Icon className="h-5 w-5 text-purple-600 dark:text-purple-300" />
          {title}
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-sm text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">{items.length}</span>
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-purple-100">{season} · things to do</p>
            <h2 className="mt-1 text-2xl font-bold">
              {kids.length > 0 ? `Ideas for ${listNames(kids)}` : 'Ideas for the little ones'}
            </h2>
            <p className="mt-1 text-sm text-purple-100">
              Near SE20 first, then further afield in London. Times and prices change, so check before you go.
            </p>
          </div>
          <button
            onClick={() => setShowDigestSettings(true)}
            className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/30"
          >
            <Mail className="h-4 w-4" />
            Monday email
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search places..."
              aria-label="Search places"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory | 'all')}
            aria-label="Type of activity"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="all">All types</option>
            {categoriesInUse.map((cat) => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
          </select>
          <select
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value as AgeRange | 'all')}
            aria-label="Age"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            {AGE_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {[
            { label: 'Local only', checked: localOnly, set: setLocalOnly },
            { label: 'Free only', checked: freeOnly, set: setFreeOnly },
            { label: `Saved (${savedCount})`, checked: savedOnly, set: setSavedOnly },
          ].map(({ label, checked, set }) => (
            <label key={label} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="rounded text-purple-600" />
              {label}
            </label>
          ))}
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><Bell className="h-3.5 w-3.5" /> {emailCount} in Monday email</span>
            <SharedSyncBadge />
          </div>
        </div>
      </div>

      {section('Near home', Home, localEvents)}
      {section('Further afield in London', Sparkles, londonEvents)}

      {events.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center dark:border-slate-700">
          <CalendarDays className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-slate-600" />
          <p className="font-medium text-gray-700 dark:text-slate-200">
            {savedOnly ? 'Nothing saved yet' : 'No matches'}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {savedOnly ? 'Tap the bookmark on a place to save it for the family.' : 'Try clearing a filter.'}
          </p>
        </div>
      )}

      {showDigestSettings && <MondayEmailSettingsModal onClose={() => setShowDigestSettings(false)} />}
    </div>
  );
};

export default KidsEventsSection;
