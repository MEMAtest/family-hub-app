'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar'

type ExtendedView = View | 'YEAR';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
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
  AlertTriangle
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
  onEventsSync?: (importedEvents: CalendarEvent[]) => void
  onWorkEventCreate?: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
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
  onEventsSync,
  onWorkEventCreate
}) => {
  const [isMobile, setIsMobile] = useState(false)
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

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Convert calendar events to Big Calendar format
  const bigCalendarEvents = useMemo((): BigCalendarEvent[] => {
    return events
      .filter(event => {
        // Debug logging for October events
        if (event.date && event.date.startsWith('2025-10')) {
          console.log('Processing October event:', event.title, 'Person:', event.person, 'Selected?', selectedPeople.includes(event.person));
        }
        return selectedPeople.includes(event.person) &&
               selectedCategories.includes(event.type);
      })
      .map(event => {
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
      })
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
    sport: 'bg-green-100 text-green-800',
    meeting: 'bg-blue-100 text-blue-800',
    fitness: 'bg-purple-100 text-purple-800',
    social: 'bg-pink-100 text-pink-800',
    education: 'bg-yellow-100 text-yellow-800',
    family: 'bg-red-100 text-red-800',
    other: 'bg-gray-100 text-gray-800',
    appointment: 'bg-orange-100 text-orange-800',
    work: 'bg-indigo-100 text-indigo-800',
    personal: 'bg-teal-100 text-teal-800'
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
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-blue-600" />
          <h1 className="mobile-title">Calendar</h1>
        </div>
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="p-2 hover:bg-gray-100 rounded-lg touch-target"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Mobile Date Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            const unit = view === 'YEAR' ? 'year' : view.toLowerCase() as any;
            handleNavigate(moment(currentDate).subtract(1, unit).toDate());
          }}
          className="p-2 hover:bg-gray-100 rounded-lg touch-target"
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
          className="p-2 hover:bg-gray-100 rounded-lg touch-target"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile View Switcher */}
      <div className="grid grid-cols-4 gap-1 bg-gray-100 rounded-lg p-1">
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
                ? 'bg-white text-gray-900 shadow-sm font-medium'
                : 'text-gray-600'
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
              showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
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
    <div className="hidden lg:flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-200 gap-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Calendar</h1>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center space-x-2 ml-8">
            <button
              onClick={() => {
                const unit = view === 'YEAR' ? 'year' : view.toLowerCase() as any;
                handleNavigate(moment(currentDate).subtract(1, unit).toDate());
              }}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-4 py-2 bg-gray-50 rounded-md min-w-[200px] text-center">
              <span className="text-lg font-medium text-gray-900">
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
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
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

        <div className="flex items-center space-x-2">
          {/* Notification Bell */}
          <NotificationBell />

          {/* View Switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1">
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
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
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
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>

          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600">
            <Upload className="w-4 h-4" />
          </button>

          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600">
            <Download className="w-4 h-4" />
          </button>

          {onTemplateManage && (
            <button
              onClick={onTemplateManage}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600"
              title="Manage Templates"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowWorkStatusManager(true)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600"
            title="Log Work Status"
          >
            <Building2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-md transition-colors ${
              showSettings
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-gray-100 text-gray-600'
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
        <div className="absolute top-0 right-0 w-80 max-w-[90vw] h-full bg-white shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-gray-200 pwa-safe-top">
            <div className="flex items-center justify-between">
              <h2 className="mobile-title">Calendar Settings</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 hover:bg-gray-100 rounded-lg touch-target"
              >
                <X className="w-5 h-5 text-gray-600" />
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
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg touch-target"
              >
                <Bookmark className="w-5 h-5 text-gray-600" />
                <span>Manage Templates</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowWorkStatusManager(true)
                setShowMobileMenu(false)
              }}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg touch-target"
            >
              <Building2 className="w-5 h-5 text-gray-600" />
              <span>Log Work Status</span>
            </button>

            <button
              onClick={() => {
                setShowSettings(!showSettings)
                setShowMobileMenu(false)
              }}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg touch-target"
            >
              <Upload className="w-5 h-5 text-gray-600" />
              <span>Sync & Import</span>
            </button>

            <button
              onClick={() => {
                // Add export functionality
                setShowMobileMenu(false)
              }}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg touch-target"
            >
              <Download className="w-5 h-5 text-gray-600" />
              <span>Export Calendar</span>
            </button>
          </div>
        </div>
      </div>
    )
  )

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Mobile Header */}
      {isMobile && renderMobileHeader()}

      {/* Desktop Header */}
      {!isMobile && renderDesktopHeader()}

      {/* Mobile Menu Overlay */}
      {isMobile && renderMobileMenuOverlay()}

      {/* Filters Panel */}
      {showFilters && (
        <div className={`p-4 border-b border-gray-200 bg-gray-50 ${isMobile ? 'pwa-safe-top' : ''}`}>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {/* People Filter */}
            <div>
              <h3 className={`font-medium text-gray-700 mb-2 ${isMobile ? 'mobile-subtitle' : 'text-sm'}`}>Family Members</h3>
              <div className={`flex flex-wrap gap-2 ${isMobile ? 'gap-3' : ''}`}>
                {people.map(person => (
                  <button
                    key={person.id}
                    onClick={() => togglePersonFilter(person.id)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-colors ${isMobile ? 'py-2 px-4 text-base touch-target' : 'text-sm'} ${
                      selectedPeople.includes(person.id)
                        ? 'text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
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
              <h3 className={`font-medium text-gray-700 mb-2 ${isMobile ? 'mobile-subtitle' : 'text-sm'}`}>Categories</h3>
              <div className={`flex flex-wrap gap-2 ${isMobile ? 'gap-3' : ''}`}>
                {Object.entries(categoryColors).map(([category, colorClass]) => (
                  <button
                    key={category}
                    onClick={() => toggleCategoryFilter(category)}
                    className={`px-3 py-1 rounded-full transition-colors ${isMobile ? 'py-2 px-4 text-base touch-target' : 'text-sm'} ${
                      selectedCategories.includes(category)
                        ? colorClass
                        : 'bg-white text-gray-600 hover:bg-gray-100'
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
        <div className="border-b border-gray-200 bg-white">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Calendar Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setSettingsTab('sync')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  settingsTab === 'sync'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Google Calendar
              </button>
              <button
                onClick={() => setSettingsTab('export')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  settingsTab === 'export'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Export
              </button>
              <button
                onClick={() => setSettingsTab('import')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  settingsTab === 'import'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
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
                  <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                    <button
                      onClick={() => setImportType('pdf')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        importType === 'pdf'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      PDF Import
                    </button>
                    <button
                      onClick={() => setImportType('csv')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        importType === 'csv'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
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
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {monthAnalytics.monthName} Analytics
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
            {/* Total Events */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-600">{monthAnalytics.totalEvents}</p>
                </div>
                <CalendarDays className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            {/* Busiest Person */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Busiest Person</p>
                  <p className="text-lg font-bold text-green-600">{monthAnalytics.busiestPerson.name || 'None'}</p>
                  {monthAnalytics.busiestPerson.count > 0 && (
                    <p className="text-xs text-gray-500">{monthAnalytics.busiestPerson.count} events</p>
                  )}
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </div>

            {/* Most Common Type */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Most Common</p>
                  <p className="text-lg font-bold text-purple-600">{monthAnalytics.mostCommonType.type || 'None'}</p>
                  {monthAnalytics.mostCommonType.count > 0 && (
                    <p className="text-xs text-gray-500">{monthAnalytics.mostCommonType.count} events</p>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            {/* Total Cost */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cost</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-600">£{monthAnalytics.totalCost.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Event Type Breakdown */}
          {Object.keys(monthAnalytics.eventsByType).length > 0 && (
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Event Types Breakdown</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(monthAnalytics.eventsByType).map(([type, count]) => (
                  <div
                    key={type}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      categoryColors[type as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'
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
              className={`fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm ${
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
                  <h3 className="font-semibold text-gray-900">{hoveredEvent.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    categoryColors[hoveredEvent.type as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'
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
                      <span className="text-sm text-gray-600">{person.name}</span>
                    </div>
                  ) : null;
                })()}

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{hoveredEvent.time} ({hoveredEvent.duration} min)</span>
                </div>

                {hoveredEvent.location && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{hoveredEvent.location}</span>
                  </div>
                )}

                {hoveredEvent.cost > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>£{hoveredEvent.cost}</span>
                  </div>
                )}

                {hoveredEvent.attendees && hoveredEvent.attendees.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{hoveredEvent.attendees.length} attendee{hoveredEvent.attendees.length !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {hoveredEvent.reminders && hoveredEvent.reminders.some(r => r.enabled) && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
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
                  <div className="text-sm text-gray-600 border-t pt-2 mt-2">
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
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
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
                  className="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded-lg touch-target"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
          )}

          {/* Drag and Drop Feedback Toast */}
          {dragFeedback && view !== 'YEAR' && (
            <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transition-all duration-300 drag-feedback-toast">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
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