'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Star,
  Heart,
  Bookmark,
  ExternalLink,
  Filter,
  RefreshCw,
  Users,
  Ticket,
  Baby,
  TreePine,
  Palette,
  Music,
  Microscope,
  Building2,
  Theater,
  Dumbbell,
  Waves,
  Tent,
  Warehouse,
  Sparkles,
  ChevronRight,
  Mail,
  Bell,
  Settings,
  CheckCircle2
} from 'lucide-react';
import {
  KidsEvent,
  EventCategory,
  AgeRange,
  CostBracket,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  COST_BRACKET_LABELS,
  COST_BRACKET_COLORS,
  AGE_RANGE_LABELS,
  DISTANCE_THRESHOLDS
} from '@/types/kidsEvents.types';

interface KidsEventsSectionProps {
  onSubscribe?: (eventId: string) => void;
  onSave?: (eventId: string) => void;
}

const getCategoryIcon = (category: EventCategory) => {
  const icons: Record<EventCategory, React.ComponentType<any>> = {
    'free': Sparkles,
    'museum': Building2,
    'theatre': Theater,
    'sports': Dumbbell,
    'arts': Palette,
    'swimming': Waves,
    'nature': TreePine,
    'science': Microscope,
    'music': Music,
    'festival': Sparkles,
    'workshop': Palette,
    'outdoor': Tent,
    'indoor': Warehouse,
    'other': Calendar
  };
  return icons[category] || Calendar;
};

const getCategoryColor = (category: EventCategory): string => {
  const colors: Record<EventCategory, string> = {
    'free': 'emerald',
    'museum': 'amber',
    'theatre': 'purple',
    'sports': 'blue',
    'arts': 'pink',
    'swimming': 'cyan',
    'nature': 'green',
    'science': 'indigo',
    'music': 'rose',
    'festival': 'orange',
    'workshop': 'violet',
    'outdoor': 'lime',
    'indoor': 'slate',
    'other': 'gray'
  };
  return colors[category] || 'gray';
};

export const KidsEventsSection: React.FC<KidsEventsSectionProps> = ({
  onSubscribe,
  onSave
}) => {
  const [events, setEvents] = useState<KidsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [selectedAgeRange, setSelectedAgeRange] = useState<AgeRange | 'all'>('all');
  const [showLocalOnly, setShowLocalOnly] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const [subscribedEvents, setSubscribedEvents] = useState<Set<string>>(new Set());
  const [showDigestSettings, setShowDigestSettings] = useState(false);

  useEffect(() => {
    fetchEvents();
    loadSavedState();
  }, []);

  const loadSavedState = () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('kidsEvents_saved');
      const subscribed = localStorage.getItem('kidsEvents_subscribed');
      if (saved) setSavedEvents(new Set<string>(JSON.parse(saved)));
      if (subscribed) setSubscribedEvents(new Set<string>(JSON.parse(subscribed)));
    } catch (e) {
      console.warn('Failed to load saved state:', e);
    }
  };

  const saveSavedState = (saved: Set<string>, subscribed: Set<string>) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('kidsEvents_saved', JSON.stringify([...saved]));
      localStorage.setItem('kidsEvents_subscribed', JSON.stringify([...subscribed]));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('categories', selectedCategory);
      if (selectedAgeRange !== 'all') params.set('ageRange', selectedAgeRange);
      if (showLocalOnly) params.set('isLocal', 'true');
      if (showFreeOnly) params.set('isFree', 'true');

      const response = await fetch(`/api/events/kids?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/events/kids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      });
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to refresh events:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSave = (eventId: string) => {
    const newSaved = new Set(savedEvents);
    if (newSaved.has(eventId)) {
      newSaved.delete(eventId);
    } else {
      newSaved.add(eventId);
    }
    setSavedEvents(newSaved);
    saveSavedState(newSaved, subscribedEvents);
    onSave?.(eventId);
  };

  const toggleSubscribe = (eventId: string) => {
    const newSubscribed = new Set(subscribedEvents);
    if (newSubscribed.has(eventId)) {
      newSubscribed.delete(eventId);
    } else {
      newSubscribed.add(eventId);
    }
    setSubscribedEvents(newSubscribed);
    saveSavedState(savedEvents, newSubscribed);
    onSubscribe?.(eventId);
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, selectedAgeRange, showLocalOnly, showFreeOnly]);

  const filteredEvents = events;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes}${ampm}`;
  };

  const EventCard: React.FC<{ event: KidsEvent; featured?: boolean }> = ({ event, featured }) => {
    const CategoryIcon = getCategoryIcon(event.category);
    const categoryColor = getCategoryColor(event.category);
    const isSaved = savedEvents.has(event.id);
    const isSubscribed = subscribedEvents.has(event.id);

    return (
      <article className={`bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 ${
        featured ? 'md:col-span-2 md:row-span-2' : ''
      }`}>
        {event.imageUrl && (
          <div className="relative">
            <img
              src={event.imageUrl}
              alt={event.title}
              className={`w-full object-cover ${featured ? 'h-64' : 'h-48'}`}
            />
            <div className="absolute top-3 left-3 flex gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${categoryColor}-100 dark:bg-${categoryColor}-900/50 text-${categoryColor}-700 dark:text-${categoryColor}-300 flex items-center gap-1`}>
                <CategoryIcon className="w-3 h-3" />
                {CATEGORY_LABELS[event.category]}
              </span>
              {event.pricing.isFree && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  FREE
                </span>
              )}
            </div>
            {event.isLocal && (
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Local
                </span>
              </div>
            )}
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className={`font-semibold text-gray-900 dark:text-slate-100 line-clamp-2 ${featured ? 'text-xl' : 'text-lg'}`}>
              {event.title}
            </h3>
            {event.averageRating && (
              <div className="flex items-center gap-1 text-amber-500 shrink-0">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-medium">{event.averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <p className={`text-gray-600 dark:text-slate-400 mb-4 ${featured ? 'line-clamp-3' : 'line-clamp-2'} text-sm`}>
            {event.shortDescription || event.description}
          </p>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>{formatDate(event.timing.date)}</span>
              {event.timing.startTime && (
                <>
                  <Clock className="w-4 h-4 text-blue-500 ml-2" />
                  <span>{formatTime(event.timing.startTime)}</span>
                </>
              )}
              {event.timing.isRecurring && (
                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                  {event.timing.recurringPattern}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span className="truncate">{event.location.name}</span>
              {event.location.distanceFromSE20 !== undefined && (
                <span className="text-xs text-gray-500 dark:text-slate-500">
                  ({event.location.distanceFromSE20.toFixed(1)} miles)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-gray-600 dark:text-slate-400">
                  {AGE_RANGE_LABELS[event.ageRange]}
                </span>
              </div>

              <div className={`px-2 py-0.5 rounded text-xs font-medium ${COST_BRACKET_COLORS[event.costBracket]}`}>
                {event.pricing.isFree
                  ? 'Free'
                  : event.pricing.familyPrice
                    ? `Family: £${event.pricing.familyPrice}`
                    : event.pricing.childPrice
                      ? `Child: £${event.pricing.childPrice}`
                      : COST_BRACKET_LABELS[event.costBracket]
                }
              </div>
            </div>
          </div>

          {event.features && event.features.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {event.features.slice(0, 3).map((feature, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full"
                >
                  {feature}
                </span>
              ))}
              {event.features.length > 3 && (
                <span className="text-xs px-2 py-1 text-gray-500 dark:text-slate-400">
                  +{event.features.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleSave(event.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isSaved
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
                title={isSaved ? 'Remove from saved' : 'Save for later'}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => toggleSubscribe(event.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isSubscribed
                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
                title={isSubscribed ? 'Unsubscribe from updates' : 'Get email updates'}
              >
                <Bell className={`w-4 h-4 ${isSubscribed ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {event.pricing.bookingUrl && (
                <a
                  href={event.pricing.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Ticket className="w-4 h-4" />
                  Book
                </a>
              )}
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Details
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const DigestSettingsModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Weekly Digest Settings
          </h3>
          <button
            onClick={() => setShowDigestSettings(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Email Addresses
            </label>
            <input
              type="text"
              defaultValue="ademola@memaconsultants.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              placeholder="Enter email addresses (comma separated)"
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Separate multiple emails with commas
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Send Day
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday" selected>Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Send Time
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                <option value="07:00">7:00 AM</option>
                <option value="08:00" selected>8:00 AM</option>
                <option value="09:00">9:00 AM</option>
                <option value="10:00">10:00 AM</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm text-gray-700 dark:text-slate-300">Include local events (SE20 area)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm text-gray-700 dark:text-slate-300">Include wider London events</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm text-gray-700 dark:text-slate-300">Only show free events</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setShowDigestSettings(false)}
              className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowDigestSettings(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const localEvents = filteredEvents.filter(e => e.isLocal);
  const londonEvents = filteredEvents.filter(e => !e.isLocal);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Baby className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Summer Kids Events</h2>
              <p className="text-purple-100">
                Fun activities for ages 2.5-5.5 in London & SE20 area
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDigestSettings(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <Mail className="w-4 h-4" />
              Weekly Digest
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedAgeRange}
            onChange={(e) => setSelectedAgeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          >
            <option value="all">All Ages</option>
            {Object.entries(AGE_RANGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLocalOnly}
              onChange={(e) => setShowLocalOnly(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-slate-300">Local only</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFreeOnly}
              onChange={(e) => setShowFreeOnly(e.target.checked)}
              className="rounded text-emerald-600"
            />
            <span className="text-sm text-gray-700 dark:text-slate-300">Free only</span>
          </label>

          <div className="ml-auto flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Bookmark className="w-4 h-4" />
              {savedEvents.size} saved
            </span>
            <span className="flex items-center gap-1">
              <Bell className="w-4 h-4" />
              {subscribedEvents.size} subscribed
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 animate-pulse">
              <div className="h-48 bg-gray-200 dark:bg-slate-700" />
              <div className="p-5 space-y-3">
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {localEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Local Events (SE20 Area)
                </h3>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full">
                  {localEvents.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {localEvents.map((event, idx) => (
                  <EventCard key={event.id} event={event} featured={idx === 0} />
                ))}
              </div>
            </section>
          )}

          {londonEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  London Events
                </h3>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full">
                  {londonEvents.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {londonEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No Events Found
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                Try adjusting your filters or check back later for new events.
              </p>
            </div>
          )}
        </>
      )}

      {showDigestSettings && <DigestSettingsModal />}
    </div>
  );
};

export default KidsEventsSection;
