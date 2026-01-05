'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar'

type ExtendedView = View | 'YEAR';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import '@/styles/react-big-calendar.css'
import '@/styles/react-big-calendar-dnd.css'
import './calendar-dnd.css'
import {
  CalendarDays,
  Clock,
  Plus,
  Filter,
  Settings,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  MapPin,
  Users,
  DollarSign,
  Bell,
  Star,
  Bookmark,
  X,
  FileDown,
  BarChart3,
  TrendingUp,
  Activity,
  Building2,
  AlertTriangle,
  Brain,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { CalendarEvent, BigCalendarEvent, CalendarView, Person } from '@/types/calendar.types'
import GoogleCalendarSync from './GoogleCalendarSync'
import ICalExport from './ICalExport'
import PDFImport from './PDFImport'
import CSVImport from './CSVImport'
import icalService from '@/services/icalService'
import NotificationBell from '../notifications/NotificationBell'
import YearView from './YearView'
import WorkStatusManager from './WorkStatusManager'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useFamilyStore } from '@/store/familyStore'

// Set up moment localizer and drag-and-drop calendar
const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop(Calendar)

/**
 * Drag and Drop Features:
 *
 * 1. Event Dragging: Click and drag events to move them to different dates/times
 *    - Supports moving between days, weeks, and months
 *    - Automatically updates date, time, and preserves duration
 *    - Shows visual feedback with green success toast
 *
 * 2. Event Resizing: Drag the edges of events to change their duration
 *    - Available in week and day views
 *    - Shows resize handles on hover
 *    - Updates event duration dynamically
 *
 * 3. Visual Enhancements:
 *    - Custom CSS for smooth animations
 *    - Drop zone highlighting
 *    - Drag preview with rotation effect
 *    - Real-time feedback messages
 */

interface CalendarMainProps {
  events: CalendarEvent[]
  people: Person[]
  onEventClick: (event: CalendarEvent) => void
  onEventCreate: (slotInfo: { start: Date; end: Date }) => void
  onEventUpdate: (id: string, updates: Partial<CalendarEvent>) => void // Used for drag & drop updates
  onEventDelete: (eventId: string) => void
  currentDate: Date
  onDateChange: (date: Date) => void
  onTemplateManage?: () => void
  onConflictSettings?: () => void
  onEventsSync?: (importedEvents: CalendarEvent[]) => void
  onWorkEventCreate?: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  familyId?: string
}

const CalendarMain: React.FC<CalendarMainProps> = ({
  events,
  people,
  onEventClick,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  currentDate,
  onDateChange,
  onTemplateManage,
  onConflictSettings,
  onEventsSync,
  onWorkEventCreate,
  familyId: providedFamilyId
}) => {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const storeFamilyId = useFamilyStore((state) => state.databaseStatus.familyId)
  const familyId = providedFamilyId ?? storeFamilyId
  const [view, setView] = useState<ExtendedView>(Views.MONTH)
  const [showFilters, setShowFilters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  // Include all people plus member-4 for school events
  const [selectedPeople, setSelectedPeople] = useState<string[]>(() => {
    const peopleIds = people.map(p => p.id);
    // Always include member-4 for school events even if not in people array yet
    if (!peopleIds.includes('member-4')) {
      peopleIds.push('member-4');
    }
    return peopleIds;
  })

  // Update selectedPeople when people array changes (e.g., after members load)
  useEffect(() => {
    if (people.length > 0) {
      setSelectedPeople(prev => {
        const currentPeopleIds = people.map(p => p.id);
        // Add member-4 if not present
        if (!currentPeopleIds.includes('member-4')) {
          currentPeopleIds.push('member-4');
        }
        // Only update if there are new people not in the current selection
        const newPeople = currentPeopleIds.filter(id => !prev.includes(id));
        if (newPeople.length > 0) {
          return [...prev, ...newPeople];
        }
        // If selectedPeople is empty but people has data, reset to include all
        if (prev.length === 0 || (prev.length === 1 && prev[0] === 'member-4')) {
          return currentPeopleIds;
        }
        return prev;
      });
    }
  }, [people]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'sport', 'meeting', 'fitness', 'social', 'education', 'family', 'other', 'appointment', 'work', 'personal'
  ])
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [settingsTab, setSettingsTab] = useState<'sync' | 'export' | 'import'>('sync')
  const [importType, setImportType] = useState<'pdf' | 'csv'>('pdf')
  const [dragFeedback, setDragFeedback] = useState<string | null>(null)
  const [showWorkStatusManager, setShowWorkStatusManager] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isAIConflictOpen, setIsAIConflictOpen] = useState(false)
  const [isAIScheduleOpen, setIsAIScheduleOpen] = useState(false)
  const [aiConflictForm, setAiConflictForm] = useState({
    title: '',
    date: moment(currentDate).format('YYYY-MM-DD'),
    time: '09:00',
    durationMinutes: 60,
    personId: people[0]?.id ?? '',
    location: ''
  })
  type AIConflictResult = {
    summary: string;
    conflicts: Array<{
      newEvent: { title: string; date: string; time: string };
      conflictingEvents: Array<{ title: string; date: string; time: string; participant: string }>;
      severity: string;
      recommendations: string[];
    }>;
  } | null
  const [aiConflictResult, setAiConflictResult] = useState<AIConflictResult>(null)
  const [aiConflictLoading, setAiConflictLoading] = useState(false)
  const [aiConflictError, setAiConflictError] = useState<string | null>(null)

  type AIScheduleResult = {
    summary: string;
    recommendedSlots: Array<{
      date: string;
      startTime: string;
      endTime: string;
      confidence: number;
      reasons: string[];
      travelBuffer?: string;
      participants: string[];
    }>;
    considerations?: string[];
    followUp?: string[];
  } | null

  const [aiScheduleForm, setAiScheduleForm] = useState({
    title: '',
    durationMinutes: 60,
    participants: people.slice(0, Math.min(2, people.length)).map((p) => p.id),
    dateInput: moment(currentDate).format('YYYY-MM-DD'),
    selectedDates: [moment(currentDate).format('YYYY-MM-DD')]
  })
  const [aiScheduleResult, setAiScheduleResult] = useState<AIScheduleResult>(null)
  const [aiScheduleLoading, setAiScheduleLoading] = useState(false)
  const [aiScheduleError, setAiScheduleError] = useState<string | null>(null)

  useEffect(() => {
    if (isAIConflictOpen) {
      setAiConflictError(null)
      setAiConflictResult(null)
      setAiConflictForm((prev) => ({
        ...prev,
        date: moment(currentDate).format('YYYY-MM-DD'),
        personId: prev.personId || people[0]?.id || '',
      }))
    }
  }, [isAIConflictOpen, currentDate, people])

  useEffect(() => {
    if (isAIScheduleOpen) {
      setAiScheduleError(null)
      setAiScheduleResult(null)
      setAiScheduleForm((prev) => ({
        ...prev,
        dateInput: moment(currentDate).format('YYYY-MM-DD'),
        selectedDates: prev.selectedDates.length ? prev.selectedDates : [moment(currentDate).format('YYYY-MM-DD')],
        participants: prev.participants.length ? prev.participants : people.slice(0, Math.min(2, people.length)).map((p) => p.id)
      }))
    }
  }, [isAIScheduleOpen, currentDate, people])

  const closeAIConflictModal = () => {
    setIsAIConflictOpen(false)
    setAiConflictLoading(false)
  }

  const closeAIScheduleModal = () => {
    setIsAIScheduleOpen(false)
    setAiScheduleLoading(false)
  }

  const handleAIConflictSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!familyId) {
      setAiConflictError('Family ID is not available yet. Please try again soon.')
      return
    }

    if (!aiConflictForm.title.trim()) {
      setAiConflictError('Please provide a title for the new event.')
      return
    }

    setAiConflictLoading(true)
    setAiConflictError(null)
    setAiConflictResult(null)

    try {
      const person = people.find((p) => p.id === aiConflictForm.personId)
      const response = await fetch(`/api/families/${familyId}/events/ai-conflicts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEvent: {
            title: aiConflictForm.title,
            date: aiConflictForm.date,
            time: aiConflictForm.time,
            durationMinutes: aiConflictForm.durationMinutes,
            location: aiConflictForm.location || undefined,
            personName: person?.name ?? 'Family',
          },
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'AI service returned an error')
      }

      setAiConflictResult(payload.suggestions)
    } catch (err) {
      console.error('AI conflict detection failed', err)
      setAiConflictError(err instanceof Error ? err.message : 'Failed to analyse conflicts')
    } finally {
      setAiConflictLoading(false)
    }
  }

  const toggleScheduleParticipant = (participantId: string) => {
    setAiScheduleForm((prev) => {
      const exists = prev.participants.includes(participantId)
      return {
        ...prev,
        participants: exists
          ? prev.participants.filter((id) => id !== participantId)
          : [...prev.participants, participantId],
      }
    })
  }

  const addPreferredDate = () => {
    setAiScheduleForm((prev) => {
      const date = prev.dateInput
      if (!date) return prev
      if (prev.selectedDates.includes(date)) return prev
      return {
        ...prev,
        selectedDates: [...prev.selectedDates, date],
      }
    })
  }

  const removePreferredDate = (date: string) => {
    setAiScheduleForm((prev) => ({
      ...prev,
      selectedDates: prev.selectedDates.filter((d) => d !== date),
    }))
  }

  const handleAIScheduleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!familyId) {
      setAiScheduleError('Family ID is not available yet. Please try again soon.')
      return
    }

    if (!aiScheduleForm.title.trim()) {
      setAiScheduleError('Please provide a meeting title.')
      return
    }

    if (!aiScheduleForm.participants.length) {
      setAiScheduleError('Select at least one participant.')
      return
    }

    if (!aiScheduleForm.selectedDates.length) {
      setAiScheduleError('Add at least one preferred date.')
      return
    }

    setAiScheduleLoading(true)
    setAiScheduleError(null)
    setAiScheduleResult(null)

    try {
      const response = await fetch(`/api/families/${familyId}/events/ai-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: aiScheduleForm.title,
          durationMinutes: aiScheduleForm.durationMinutes,
          preferredDates: aiScheduleForm.selectedDates,
          participants: aiScheduleForm.participants,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'AI service returned an error')
      }

      setAiScheduleResult(payload.suggestions)
    } catch (err) {
      console.error('AI scheduling failed', err)
      setAiScheduleError(err instanceof Error ? err.message : 'Failed to suggest time slots')
    } finally {
      setAiScheduleLoading(false)
    }
  }

  // Ensure all event person IDs are in selectedPeople (fallback for auto-generated IDs)
  useEffect(() => {
    if (events.length > 0 && selectedPeople.length > 0) {
      const eventPersonIds = [...new Set(events.map(e => e.person).filter(Boolean))];
      const missingPersonIds = eventPersonIds.filter(id => !selectedPeople.includes(id));
      if (missingPersonIds.length > 0) {
        console.log('📆 Adding missing event person IDs to selectedPeople:', missingPersonIds);
        setSelectedPeople(prev => [...prev, ...missingPersonIds]);
      }
    }
  }, [events, selectedPeople]);

  // Convert calendar events to Big Calendar format
  const bigCalendarEvents = useMemo((): BigCalendarEvent[] => {
    console.log('📊 CalendarMain rendering with:', {
      totalEvents: events.length,
      selectedPeople: selectedPeople.length,
      selectedCategories: selectedCategories.length,
      selectedPeopleIds: selectedPeople,
    });

    if (events.length > 0) {
      console.log('First event sample:', events[0]);
    }

    const filtered = events.filter(event => {
      const personMatch = selectedPeople.includes(event.person);
      const categoryMatch = selectedCategories.includes(event.type);

      // Debug logging for events not matching
      if (!personMatch || !categoryMatch) {
        console.log('Event filtered out:', {
          title: event.title,
          person: event.person,
          type: event.type,
          personMatch,
          categoryMatch,
          selectedPeople: selectedPeople.slice(0, 3),
        });
      }

      return personMatch && categoryMatch;
    });

    console.log(`🎯 Filtered ${filtered.length} events from ${events.length} total`);

    return filtered.map(event => {
      const eventStart = moment(`${event.date} ${event.time}`, 'YYYY-MM-DD HH:mm').toDate()
      const eventEnd = moment(eventStart).add(event.duration, 'minutes').toDate()

      return {
        id: event.id,
        title: event.title,
        start: eventStart,
        end: eventEnd,
        resource: event,
        allDay: false
      }
    });
  }, [events, selectedPeople, selectedCategories])

  // Get person color for event styling
  const getPersonColor = useCallback((personId: string) => {
    const person = people.find(p => p.id === personId)
    return person?.color || '#6B7280'
  }, [people])

  // Event style function
  const eventStyleGetter = useCallback((event: any) => {
    const personColor = getPersonColor(event.resource!.person)

    return {
      style: {
        backgroundColor: personColor,
        borderColor: personColor,
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        padding: '2px 6px',
        opacity: event.resource!.status === 'cancelled' ? 0.5 : 1
      }
    }
  }, [getPersonColor])

  // Handle slot selection (creating new events)
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    onEventCreate(slotInfo)
  }, [onEventCreate])

  // Handle event selection
  const handleSelectEvent = useCallback((event: any) => {
    onEventClick(event.resource!)
  }, [onEventClick])

  // Handle single event export
  const handleExportEvent = useCallback((event: CalendarEvent) => {
    icalService.exportSingleEvent(event)
  }, [])

  // Handle event drop (drag and drop)
  const handleEventDrop = useCallback((args: any) => {
    const { event, start, end } = args
    const originalEvent = event.resource!
    const newDate = moment(start).format('YYYY-MM-DD')
    const newTime = moment(start).format('HH:mm')
    const duration = moment(end).diff(moment(start), 'minutes')

    // Show feedback
    const oldDateTime = moment(`${originalEvent.date} ${originalEvent.time}`, 'YYYY-MM-DD HH:mm')
    const newDateTime = moment(start)
    const dateChanged = !oldDateTime.isSame(newDateTime, 'day')
    const timeChanged = !oldDateTime.isSame(newDateTime, 'minute')

    let feedbackMessage = `"${originalEvent.title}" moved`
    if (dateChanged) {
      feedbackMessage += ` to ${newDateTime.format('MMM D')}`
    }
    if (timeChanged) {
      feedbackMessage += ` at ${newDateTime.format('HH:mm')}`
    }

    setDragFeedback(feedbackMessage)
    setTimeout(() => setDragFeedback(null), 3000)

    // Debug logging
    console.log('Drag and drop update:', {
      eventId: originalEvent.id,
      originalDate: originalEvent.date,
      originalTime: originalEvent.time,
      newDate,
      newTime,
      duration
    })

    // Call the parent's update function with the correct signature
    onEventUpdate(originalEvent.id, {
      date: newDate,
      time: newTime,
      duration: duration
    })
  }, [onEventUpdate])

  // Handle event resize
  const handleEventResize = useCallback((args: any) => {
    const { event, start, end } = args
    const originalEvent = event.resource!
    const duration = moment(end).diff(moment(start), 'minutes')

    // Show feedback
    const durationChanged = duration !== originalEvent.duration
    if (durationChanged) {
      const hours = Math.floor(duration / 60)
      const minutes = duration % 60
      const durationText = hours > 0
        ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
        : `${minutes}m`

      setDragFeedback(`"${originalEvent.title}" resized to ${durationText.trim()}`)
      setTimeout(() => setDragFeedback(null), 3000)
    }

    // Call the parent's update function with the correct signature
    onEventUpdate(originalEvent.id, {
      duration: duration
    })
  }, [onEventUpdate])

  // Navigate calendar
  const handleNavigate = useCallback((date: Date) => {
    onDateChange(date)
  }, [onDateChange])

  // Toggle person filter
  const togglePersonFilter = (personId: string) => {
    setSelectedPeople(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    )
  }

  // Toggle category filter
  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(cat => cat !== category)
        : [...prev, category]
    )
  }

  const categoryColors = {
    sport: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
    meeting: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
    fitness: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
    social: 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200',
    education: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200',
    family: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
    other: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200',
    appointment: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
    work: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200',
    personal: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200'
  }

  // Month analytics calculations
  const monthAnalytics = useMemo(() => {
    if (view !== Views.MONTH) return null;

    const currentMonth = moment(currentDate);
    const monthStart = currentMonth.clone().startOf('month');
    const monthEnd = currentMonth.clone().endOf('month');

    // Filter events for current month and selected filters
    const monthEvents = events.filter(event => {
      const eventDate = moment(event.date);
      return eventDate.isBetween(monthStart, monthEnd, 'day', '[]') &&
             selectedPeople.includes(event.person) &&
             selectedCategories.includes(event.type);
    });

    // Calculate analytics
    const totalEvents = monthEvents.length;

    // Events by type
    const eventsByType = monthEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Events by person
    const eventsByPerson = monthEvents.reduce((acc, event) => {
      const person = people.find(p => p.id === event.person);
      if (person) {
        acc[person.name] = (acc[person.name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Total cost
    const totalCost = monthEvents.reduce((sum, event) => sum + (event.cost || 0), 0);

    // Busiest person
    const busiestPerson = Object.entries(eventsByPerson).reduce(
      (max, [name, count]) => count > max.count ? { name, count } : max,
      { name: '', count: 0 }
    );

    // Most common event type
    const mostCommonType = Object.entries(eventsByType).reduce(
      (max, [type, count]) => count > max.count ? { type, count } : max,
      { type: '', count: 0 }
    );

    return {
      totalEvents,
      eventsByType,
      eventsByPerson,
      totalCost,
      busiestPerson,
      mostCommonType,
      monthName: currentMonth.format('MMMM YYYY')
    };
  }, [events, currentDate, view, selectedPeople, selectedCategories, people]);

  // Mobile Calendar Header Component
  const renderMobileHeader = () => (
    <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-blue-600" />
          <h1 className="mobile-title">Calendar</h1>
        </div>
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg touch-target"
        >
          <Settings className="w-5 h-5 text-gray-600 dark:text-slate-300" />
        </button>
      </div>

      {/* Mobile Date Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            const unit = view === 'YEAR' ? 'year' : view.toLowerCase() as any;
            handleNavigate(moment(currentDate).subtract(1, unit).toDate());
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg touch-target"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 text-center">
          <span className="mobile-title">
            {view === Views.MONTH && moment(currentDate).format('MMMM YYYY')}
            {view === Views.WEEK && `Week of ${moment(currentDate).startOf('week').format('MMM D')}`}
            {view === Views.DAY && moment(currentDate).format('MMM D, YYYY')}
            {view === Views.AGENDA && 'Agenda'}
            {view === 'YEAR' && moment(currentDate).format('YYYY')}
          </span>
        </div>

        <button
          onClick={() => {
            const unit = view === 'YEAR' ? 'year' : view.toLowerCase() as any;
            handleNavigate(moment(currentDate).add(1, unit).toDate());
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg touch-target"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile View Switcher */}
      <div className="grid grid-cols-4 gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
        {[
          { view: Views.DAY, label: 'Day' },
          { view: Views.WEEK, label: 'Week' },
          { view: Views.MONTH, label: 'Month' },
          { view: Views.AGENDA, label: 'List' }
        ].map(({ view: viewType, label }) => (
          <button
            key={viewType}
            onClick={() => setView(viewType)}
            className={`py-2 px-1 text-sm rounded-md transition-colors touch-target ${
              view === viewType
                ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm font-medium'
                : 'text-gray-600 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mobile Quick Actions */}
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => handleNavigate(new Date())}
          className="mobile-btn-secondary text-sm"
        >
          Today
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg touch-target transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEventCreate({ start: new Date(), end: moment().add(1, 'hour').toDate() })}
            className="mobile-btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Desktop Calendar Header Component
  const renderDesktopHeader = () => (
    <div className="hidden lg:flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-slate-800 gap-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-slate-100">Calendar</h1>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center space-x-2 ml-8">
            <button
              onClick={() => {
                const unit = view === 'YEAR' ? 'year' : view.toLowerCase() as any;
                handleNavigate(moment(currentDate).subtract(1, unit).toDate());
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-md min-w-[200px] text-center">
              <span className="text-lg font-medium text-gray-900 dark:text-slate-100">
                {view === Views.MONTH && moment(currentDate).format('MMMM YYYY')}
                {view === Views.WEEK && `Week of ${moment(currentDate).startOf('week').format('MMM D, YYYY')}`}
                {view === Views.DAY && moment(currentDate).format('dddd, MMMM D, YYYY')}
                {view === Views.AGENDA && 'Agenda View'}
                {view === 'YEAR' && moment(currentDate).format('YYYY')}
              </span>
            </div>

            <button
              onClick={() => {
                const unit = view === 'YEAR' ? 'year' : view.toLowerCase() as any;
                handleNavigate(moment(currentDate).add(1, unit).toDate());
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleNavigate(new Date())}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Today
            </button>
        </div>
      </div>

      {isAIConflictOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-purple-500" /> AI Conflict Review
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Check overlaps before adding a new event</p>
              </div>
              <button
                onClick={closeAIConflictModal}
                className="rounded-full p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Close conflict insights"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <form onSubmit={handleAIConflictSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Event title</label>
                  <input
                    type="text"
                    value={aiConflictForm.title}
                    onChange={(event) => setAiConflictForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="e.g., Piano lesson"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Date</label>
                    <input
                      type="date"
                      value={aiConflictForm.date}
                      onChange={(event) => setAiConflictForm((prev) => ({ ...prev, date: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Start time</label>
                    <input
                      type="time"
                      value={aiConflictForm.time}
                      onChange={(event) => setAiConflictForm((prev) => ({ ...prev, time: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Duration (minutes)</label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={aiConflictForm.durationMinutes}
                      onChange={(event) => setAiConflictForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Who is attending?</label>
                    <select
                      value={aiConflictForm.personId}
                      onChange={(event) => setAiConflictForm((prev) => ({ ...prev, personId: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                    >
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>{person.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Location (optional)</label>
                  <input
                    type="text"
                    value={aiConflictForm.location}
                    onChange={(event) => setAiConflictForm((prev) => ({ ...prev, location: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Home, school, etc."
                  />
                </div>
                {aiConflictError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {aiConflictError}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={aiConflictLoading}
                    className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white ${
                      aiConflictLoading ? 'bg-purple-200 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {aiConflictLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Checking…
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" /> Analyse
                      </>
                    )}
                  </button>
                </div>
              </form>

              {aiConflictResult && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
                    {aiConflictResult.summary}
                  </div>
                  {aiConflictResult.conflicts.length === 0 ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                      No conflicts detected. This slot looks clear!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiConflictResult.conflicts.map((conflict, index) => (
                        <div key={index} className="rounded-lg border border-gray-200 dark:border-slate-800 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{conflict.newEvent.title}</p>
                            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Severity: {conflict.severity}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-slate-300 mb-2">{conflict.newEvent.date} at {conflict.newEvent.time}</p>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Conflicts with:</p>
                            <ul className="space-y-1 text-sm text-gray-700 dark:text-slate-300">
                              {conflict.conflictingEvents.map((event, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-red-400"></span>
                                  <span>{event.title} • {event.date} {event.time} ({event.participant})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {conflict.recommendations.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Recommendations</p>
                              <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-slate-300 space-y-1 mt-1">
                                {conflict.recommendations.map((rec, idx) => (
                                  <li key={idx}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAIScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" /> Smart Scheduling Suggestions
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Find the best time that keeps everyone free</p>
              </div>
              <button
                onClick={closeAIScheduleModal}
                className="rounded-full p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Close scheduling insights"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <form onSubmit={handleAIScheduleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Meeting title</label>
                  <input
                    type="text"
                    value={aiScheduleForm.title}
                    onChange={(event) => setAiScheduleForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., Family budget review"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Duration (minutes)</label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={aiScheduleForm.durationMinutes}
                      onChange={(event) => setAiScheduleForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Preferred date</label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="date"
                        value={aiScheduleForm.dateInput}
                        onChange={(event) => setAiScheduleForm((prev) => ({ ...prev, dateInput: event.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addPreferredDate}
                        className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-800"
                      >
                        Add
                      </button>
                    </div>
                    {aiScheduleForm.selectedDates.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {aiScheduleForm.selectedDates.map((date) => (
                          <span key={date} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                            {date}
                            <button type="button" onClick={() => removePreferredDate(date)} className="text-blue-500 hover:text-blue-700">
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Participants</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {people.map((person) => (
                      <label key={person.id} className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:bg-slate-800">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={aiScheduleForm.participants.includes(person.id)}
                          onChange={() => toggleScheduleParticipant(person.id)}
                        />
                        <span>{person.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {aiScheduleError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {aiScheduleError}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={aiScheduleLoading}
                    className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white ${
                      aiScheduleLoading ? 'bg-blue-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {aiScheduleLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Analysing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Suggest times
                      </>
                    )}
                  </button>
                </div>
              </form>

              {aiScheduleResult && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    {aiScheduleResult.summary}
                  </div>
                  {aiScheduleResult.recommendedSlots.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Recommended slots</h4>
                      <ul className="space-y-2">
                        {aiScheduleResult.recommendedSlots.map((slot, index) => (
                          <li key={index} className="rounded-lg border border-gray-200 dark:border-slate-800 p-3 text-sm text-gray-700 dark:text-slate-300">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-slate-100">{slot.date}</span>
                              <span className="text-xs text-gray-500 dark:text-slate-400">Confidence {Math.round(slot.confidence * 100)}%</span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-slate-200 mt-1">
                              {slot.startTime} - {slot.endTime}
                            </p>
                            {slot.travelBuffer && (
                              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{slot.travelBuffer}</p>
                            )}
                            {slot.reasons.length > 0 && (
                              <ul className="list-disc pl-5 text-xs text-gray-600 dark:text-slate-300 space-y-1 mt-2">
                                {slot.reasons.map((reason, idx) => (
                                  <li key={idx}>{reason}</li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiScheduleResult.considerations && aiScheduleResult.considerations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Considerations</h4>
                      <ul className="list-disc pl-5 text-xs text-gray-600 dark:text-slate-300 space-y-1 mt-1">
                        {aiScheduleResult.considerations.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiScheduleResult.followUp && aiScheduleResult.followUp.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Follow-up actions</h4>
                      <ul className="list-disc pl-5 text-xs text-gray-600 dark:text-slate-300 space-y-1 mt-1">
                        {aiScheduleResult.followUp.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        <div className="flex items-center space-x-2">
          {/* Notification Bell */}
          <NotificationBell />

          {/* View Switcher */}
          <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            {[
              { view: Views.DAY, label: 'Day' },
              { view: Views.WEEK, label: 'Week' },
              { view: Views.MONTH, label: 'Month' },
              { view: Views.AGENDA, label: 'Agenda' },
              { view: 'YEAR' as ExtendedView, label: 'Year' }
            ].map(({ view: viewType, label }) => (
              <button
                key={viewType}
                onClick={() => setView(viewType)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  view === viewType
                    ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-md transition-colors ${
              showFilters
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200'
                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>

          <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors text-gray-600 dark:text-slate-300">
            <Upload className="w-4 h-4" />
          </button>

          <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors text-gray-600 dark:text-slate-300">
            <Download className="w-4 h-4" />
          </button>

          {onTemplateManage && (
            <button
              onClick={onTemplateManage}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors text-gray-600 dark:text-slate-300"
              title="Manage Templates"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowWorkStatusManager(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors text-gray-600 dark:text-slate-300"
            title="Log Work Status"
          >
            <Building2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-md transition-colors ${
              showSettings
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200'
                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => onEventCreate({ start: new Date(), end: moment().add(1, 'hour').toDate() })}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        </div>
    </div>
  );

  // Mobile Menu Overlay
  const renderMobileMenuOverlay = () => (
    showMobileMenu && (
      <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
        <div className="absolute top-0 right-0 w-80 max-w-[90vw] h-full bg-white dark:bg-slate-900 shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-gray-200 dark:border-slate-800 pwa-safe-top">
            <div className="flex items-center justify-between">
              <h2 className="mobile-title">Calendar Settings</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg touch-target"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {onTemplateManage && (
              <button
                onClick={() => {
                  onTemplateManage()
                  setShowMobileMenu(false)
                }}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:bg-slate-800 rounded-lg touch-target"
              >
                <Bookmark className="w-5 h-5 text-gray-600 dark:text-slate-300" />
                <span>Manage Templates</span>
              </button>
            )}

            {onConflictSettings && (
              <button
                onClick={() => {
                  onConflictSettings()
                  setShowMobileMenu(false)
                }}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:bg-slate-800 rounded-lg touch-target"
              >
                <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-slate-300" />
                <span>Conflict Rules</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowWorkStatusManager(true)
                setShowMobileMenu(false)
              }}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:bg-slate-800 rounded-lg touch-target"
            >
              <Building2 className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              <span>Log Work Status</span>
            </button>

            <button
              onClick={() => {
                setShowSettings(!showSettings)
                setShowMobileMenu(false)
              }}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:bg-slate-800 rounded-lg touch-target"
            >
              <Upload className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              <span>Sync & Import</span>
            </button>

            <button
              onClick={() => {
                // Add export functionality
                setShowMobileMenu(false)
              }}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:bg-slate-800 rounded-lg touch-target"
            >
              <Download className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              <span>Export Calendar</span>
            </button>
          </div>
        </div>
      </div>
    )
  )

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Mobile Header */}
      {isMobile && renderMobileHeader()}

      {/* Desktop Header */}
      {!isMobile && renderDesktopHeader()}

      {/* Mobile Menu Overlay */}
      {isMobile && renderMobileMenuOverlay()}

      {/* Filters Panel */}
      {showFilters && (
        <div className={`p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 ${isMobile ? 'pwa-safe-top' : ''}`}>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {/* People Filter */}
            <div>
              <h3 className={`font-medium text-gray-700 dark:text-slate-300 mb-2 ${isMobile ? 'mobile-subtitle' : 'text-sm'}`}>Family Members</h3>
              <div className={`flex flex-wrap gap-2 ${isMobile ? 'gap-3' : ''}`}>
                {people.map(person => (
                  <button
                    key={person.id}
                    onClick={() => togglePersonFilter(person.id)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-colors ${isMobile ? 'py-2 px-4 text-base touch-target' : 'text-sm'} ${
                      selectedPeople.includes(person.id)
                        ? 'text-white'
                        : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                    style={{
                      backgroundColor: selectedPeople.includes(person.id) ? person.color : undefined
                    }}
                  >
                    <span>{person.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Categories Filter */}
            <div>
              <h3 className={`font-medium text-gray-700 dark:text-slate-300 mb-2 ${isMobile ? 'mobile-subtitle' : 'text-sm'}`}>Categories</h3>
              <div className={`flex flex-wrap gap-2 ${isMobile ? 'gap-3' : ''}`}>
                {Object.entries(categoryColors).map(([category, colorClass]) => (
                  <button
                    key={category}
                    onClick={() => toggleCategoryFilter(category)}
                    className={`px-3 py-1 rounded-full transition-colors ${isMobile ? 'py-2 px-4 text-base touch-target' : 'text-sm'} ${
                      selectedCategories.includes(category)
                        ? colorClass
                        : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Calendar Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg dark:bg-slate-800">
              <button
                onClick={() => setSettingsTab('sync')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  settingsTab === 'sync'
                    ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-slate-100'
                }`}
              >
                Google Calendar
              </button>
              <button
                onClick={() => setSettingsTab('export')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  settingsTab === 'export'
                    ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-slate-100'
                }`}
              >
                Export
              </button>
              <button
                onClick={() => setSettingsTab('import')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  settingsTab === 'import'
                    ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-slate-100'
                }`}
              >
                Import
              </button>
            </div>

            <div className="max-w-4xl">
              {settingsTab === 'sync' && (
                <GoogleCalendarSync
                  events={events}
                  onSyncComplete={(result) => {
                    if (result.success && result.imported > 0 && onEventsSync) {
                      // Handle imported events - this would need the actual imported events
                      console.log('Sync completed:', result)
                    }
                  }}
                />
              )}

              {settingsTab === 'export' && (
                <ICalExport
                  events={events}
                  people={people}
                />
              )}

              {settingsTab === 'import' && (
                <div className="space-y-6">
                  {/* Import Type Selection */}
                  <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit dark:bg-slate-800">
                    <button
                      onClick={() => setImportType('pdf')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        importType === 'pdf'
                          ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
                          : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-slate-100'
                      }`}
                    >
                      PDF Import
                    </button>
                    <button
                      onClick={() => setImportType('csv')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        importType === 'csv'
                          ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
                          : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-slate-100'
                      }`}
                    >
                      CSV Import
                    </button>
                  </div>

                  {/* Import Content */}
                  {importType === 'pdf' && (
                    <PDFImport
                      people={people}
                      onEventsImport={(importedEvents) => {
                        if (onEventsSync) {
                          onEventsSync(importedEvents)
                        }
                      }}
                    />
                  )}

                  {importType === 'csv' && (
                    <CSVImport
                      people={people}
                      onEventsImport={(importedEvents) => {
                        if (onEventsSync) {
                          onEventsSync(importedEvents)
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Month Analytics Panel */}
      {view === Views.MONTH && monthAnalytics && !isMobile && (
        <div className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {monthAnalytics.monthName} Analytics
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-300">AI Assistant</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Analyse conflicts or suggest scheduling slots</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAIConflictOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:hover:bg-purple-500/30"
                >
                  <AlertTriangle className="w-4 h-4" /> Conflicts
                </button>
                <button
                  onClick={() => setIsAIScheduleOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:hover:bg-blue-500/30"
                >
                  <Sparkles className="w-4 h-4" /> Smart Scheduling
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
            {/* Total Events */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Total Events</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-600">{monthAnalytics.totalEvents}</p>
                </div>
                <CalendarDays className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            {/* Busiest Person */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Busiest Person</p>
                  <p className="text-lg font-bold text-green-600">{monthAnalytics.busiestPerson.name || 'None'}</p>
                  {monthAnalytics.busiestPerson.count > 0 && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">{monthAnalytics.busiestPerson.count} events</p>
                  )}
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </div>

            {/* Most Common Type */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Most Common</p>
                  <p className="text-lg font-bold text-purple-600">{monthAnalytics.mostCommonType.type || 'None'}</p>
                  {monthAnalytics.mostCommonType.count > 0 && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">{monthAnalytics.mostCommonType.count} events</p>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            {/* Total Cost */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Total Cost</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-600">£{monthAnalytics.totalCost.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Event Type Breakdown */}
          {Object.keys(monthAnalytics.eventsByType).length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Event Types Breakdown</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(monthAnalytics.eventsByType).map(([type, count]) => (
                  <div
                    key={type}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      categoryColors[type as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {type}: {count}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar Component */}
      <div className={`flex-1 ${isMobile ? 'p-2 pwa-safe-bottom' : 'p-6'}`}>
        <div className={`h-full relative ${isMobile ? 'mobile-calendar-container' : ''}`}>
          {view === 'YEAR' ? (
            <YearView
              events={events}
              people={people}
              currentDate={currentDate}
              onDateChange={handleNavigate}
              onEventClick={handleSelectEvent}
              onDateClick={(date) => {
                setView(Views.DAY);
                handleNavigate(date);
              }}
            />
          ) : (
            <DnDCalendar
            localizer={localizer}
            events={bigCalendarEvents}
            startAccessor={(event: any) => event.start}
            endAccessor={(event: any) => event.end}
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={handleNavigate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={!isMobile ? handleEventDrop : undefined}
            onEventResize={!isMobile ? handleEventResize : undefined}
            onDragStart={!isMobile ? (args) => {
              console.log('Drag started:', args)
            } : undefined}
            selectable
            resizable={!isMobile}
            draggableAccessor={() => !isMobile}
            eventPropGetter={eventStyleGetter}
            popup={!isMobile}
            popupOffset={isMobile ? 0 : 30}
            toolbar={false}
            className={`family-hub-calendar ${isMobile ? 'mobile-calendar' : ''}`}
            formats={{
              timeGutterFormat: isMobile ? 'HH:mm' : 'HH:mm',
              eventTimeRangeFormat: ({ start, end }) =>
                `${moment(start).format(isMobile ? 'HH:mm' : 'HH:mm')} - ${moment(end).format(isMobile ? 'HH:mm' : 'HH:mm')}`,
              agendaTimeFormat: 'HH:mm',
              agendaDateFormat: isMobile ? 'MMM DD' : 'ddd MMM DD',
              dayHeaderFormat: isMobile ? 'ddd' : 'dddd MMM DD',
              monthHeaderFormat: isMobile ? 'MMM YYYY' : 'MMMM YYYY'
            }}
            min={moment().hour(6).minute(0).toDate()}
            max={moment().hour(23).minute(59).toDate()}
            step={isMobile ? 30 : 15}
            timeslots={isMobile ? 2 : 4}
            dayLayoutAlgorithm="no-overlap"
            components={{
              event: ({ event }: { event: any }) => (
                <div
                  onMouseEnter={!isMobile ? (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredEvent((event as any).resource!);
                    setTooltipPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 10
                    });
                  } : undefined}
                  onMouseLeave={!isMobile ? () => {
                    setHoveredEvent(null);
                    setTooltipPosition(null);
                  } : undefined}
                  onTouchStart={isMobile ? () => {
                    setHoveredEvent((event as any).resource!);
                  } : undefined}
                  className={`h-full w-full cursor-pointer ${isMobile ? 'mobile-event touch-target' : ''}`}
                >
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>
                    {(event as any).title}
                  </span>
                </div>
              )
            }}
          />
          )}

          {/* Event Tooltip */}
          {hoveredEvent && ((!isMobile && tooltipPosition) || isMobile) && view !== 'YEAR' && (
            <div
              className={`fixed z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-lg p-4 max-w-sm ${
                isMobile ? 'bottom-0 left-0 right-0 m-4 rounded-t-2xl pwa-safe-bottom' : ''
              }`}
              style={isMobile ? {} : {
                left: tooltipPosition!.x - 150,
                top: tooltipPosition!.y - 10,
                transform: 'translateY(-100%)'
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100">{hoveredEvent.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    categoryColors[hoveredEvent.type as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200'
                  }`}>
                    {hoveredEvent.type}
                  </span>
                </div>

                {(() => {
                  const person = people.find(p => p.id === hoveredEvent.person);
                  return person ? (
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: person.color }}
                      />
                      <span className="text-sm text-gray-600 dark:text-slate-300">{person.name}</span>
                    </div>
                  ) : null;
                })()}

                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
                  <Clock className="w-4 h-4" />
                  <span>{hoveredEvent.time} ({hoveredEvent.duration} min)</span>
                </div>

                {hoveredEvent.location && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
                    <MapPin className="w-4 h-4" />
                    <span>{hoveredEvent.location}</span>
                  </div>
                )}

                {hoveredEvent.cost > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
                    <DollarSign className="w-4 h-4" />
                    <span>£{hoveredEvent.cost}</span>
                  </div>
                )}

                {hoveredEvent.attendees && hoveredEvent.attendees.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
                    <Users className="w-4 h-4" />
                    <span>{hoveredEvent.attendees.length} attendee{hoveredEvent.attendees.length !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {hoveredEvent.reminders && hoveredEvent.reminders.some(r => r.enabled) && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
                    <Bell className="w-4 h-4" />
                    <span>Reminders set</span>
                  </div>
                )}

                {/* Work Status Information */}
                {hoveredEvent.type === 'work' && hoveredEvent.workStatus && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                    <div className="flex items-center space-x-2 text-blue-800 font-medium mb-1">
                      <Building2 className="w-4 h-4" />
                      <span>
                        {hoveredEvent.workStatus.type === 'office' && 'Office Work'}
                        {hoveredEvent.workStatus.type === 'remote' && 'Working from Home'}
                        {hoveredEvent.workStatus.type === 'travel' && 'Business Travel'}
                        {hoveredEvent.workStatus.type === 'client_site' && 'Client Site'}
                      </span>
                    </div>
                    {hoveredEvent.workStatus.location && (
                      <div className="text-blue-700 mb-1">
                        Location: {hoveredEvent.workStatus.location}
                      </div>
                    )}
                    {hoveredEvent.workStatus.affectsPickup && (
                      <div className="text-yellow-700 text-xs flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>
                          Affects pickup times
                          {hoveredEvent.workStatus.pickupTimeAdjustment &&
                            ` (${hoveredEvent.workStatus.pickupTimeAdjustment > 0 ? '+' : ''}${hoveredEvent.workStatus.pickupTimeAdjustment} min)`
                          }
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {hoveredEvent.notes && (
                  <div className="text-sm text-gray-600 dark:text-slate-300 border-t pt-2 mt-2">
                    {hoveredEvent.notes}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-2 mt-2 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExportEvent(hoveredEvent)
                    }}
                    className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Export as iCal"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tooltip arrow - only on desktop */}
              {!isMobile && (
                <div
                  className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"
                />
              )}

              {/* Mobile close button */}
              {isMobile && (
                <button
                  onClick={() => setHoveredEvent(null)}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg touch-target"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-slate-300" />
                </button>
              )}
            </div>
          )}

          {/* Drag and Drop Feedback Toast */}
          {dragFeedback && view !== 'YEAR' && (
            <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transition-all duration-300 drag-feedback-toast">
              <div className="w-2 h-2 bg-white dark:bg-slate-900 rounded-full animate-pulse" />
              <span className="text-sm font-medium">{dragFeedback}</span>
            </div>
          )}

          {/* Work Status Manager Modal */}
          {showWorkStatusManager && (
            <WorkStatusManager
              people={people}
              events={events}
              onAddWorkEvent={(event) => {
                if (onWorkEventCreate) {
                  onWorkEventCreate(event);
                }
                setShowWorkStatusManager(false);
              }}
              onClose={() => setShowWorkStatusManager(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default CalendarMain
