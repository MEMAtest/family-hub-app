'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  Repeat,
  DollarSign,
  FileText,
  Star,
  AlertTriangle,
  Save,
  Trash2,
  Sparkles,
  Loader2
} from 'lucide-react'
import { CalendarEvent, Reminder, RecurringPattern, EventTemplate, Person } from '@/types/calendar.types'
import AIEnhancedField from '@/components/common/AIEnhancedField'

type CreateEventResult =
  | { status: 'conflict' }
  | { status: 'created'; event: CalendarEvent };

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const toTimeInputValue = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const buildEmptyFormData = (defaultPersonId = ''): Partial<CalendarEvent> => ({
  title: '',
  person: defaultPersonId,
  date: '',
  endDate: undefined,
  time: '',
  duration: 60,
  location: '',
  type: 'other',
  notes: '',
  cost: 0,
  recurring: 'none',
  isRecurring: false,
  priority: 'medium',
  status: 'confirmed',
  reminders: [
    { id: '1', type: 'notification', time: 15, enabled: true }
  ],
  attendees: []
});

const isAfterDate = (endDate?: string, startDate?: string) =>
  Boolean(endDate && startDate && endDate > startDate);

const calculateMultiDayDuration = (date?: string, time?: string, endDate?: string, fallbackDuration = 60) => {
  if (!isAfterDate(endDate, date)) return fallbackDuration;

  const start = new Date(`${date}T${time || '00:00'}:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const minutes = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60));
  return Number.isFinite(minutes) ? Math.max(5, minutes) : fallbackDuration;
};

interface EventFormProps {
  event?: CalendarEvent
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CreateEventResult>
  onUpdate: (id: string, updates: Partial<CalendarEvent>) => Promise<true | 'conflict'>
  onDelete?: (id: string) => Promise<void>
  people: Person[]
  templates: EventTemplate[]
  defaultSlot?: { start: Date; end: Date }
}

const EventForm: React.FC<EventFormProps> = ({
  event,
  isOpen,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  people,
  templates,
  defaultSlot
}) => {
  const defaultPersonId = people[0]?.id || ''
  const initializedFormKeyRef = useRef<string | null>(null)
  const [formData, setFormData] = useState<Partial<CalendarEvent>>(() => buildEmptyFormData(defaultPersonId))

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [enhancingTitle, setEnhancingTitle] = useState(false)

  // Initialize form data
  useEffect(() => {
    if (!isOpen) {
      initializedFormKeyRef.current = null
      return
    }

    const defaultSlotKey = defaultSlot
      ? `${defaultSlot.start.toISOString()}-${defaultSlot.end.toISOString()}`
      : 'none'
    const formKey = event ? `event:${event.id}` : `new:${defaultSlotKey}`

    if (initializedFormKeyRef.current === formKey) return
    initializedFormKeyRef.current = formKey

    setErrors({})
    setSelectedTemplate('')

    if (event) {
      // Edit mode
      const multiDay = Boolean(event.endDate && event.endDate !== event.date)
      setFormData({
        ...buildEmptyFormData(defaultPersonId),
        ...event,
        attendees: event.attendees || []
      })
      setShowRecurring(event.isRecurring)
      setIsMultiDay(multiDay)
    } else if (defaultSlot) {
      // New event from slot selection
      const startDate = new Date(defaultSlot.start)
      const duration = Math.round((defaultSlot.end.getTime() - defaultSlot.start.getTime()) / (1000 * 60))

      setFormData({
        ...buildEmptyFormData(defaultPersonId),
        date: toDateInputValue(startDate),
        endDate: undefined,
        time: toTimeInputValue(startDate),
        duration: Math.max(15, duration)
      })
      setShowRecurring(false)
      setIsMultiDay(false)
    } else {
      // New event
      const now = new Date()
      setFormData({
        ...buildEmptyFormData(defaultPersonId),
        date: toDateInputValue(now),
        endDate: undefined,
        time: toTimeInputValue(now)
      })
      setShowRecurring(false)
      setIsMultiDay(false)
    }
  }, [event, defaultSlot, isOpen, defaultPersonId])

  // Auto-select first person when people become available
  useEffect(() => {
    if (!isOpen || event || !defaultPersonId) return

    setFormData(prev => (prev.person ? prev : { ...prev, person: defaultPersonId }))
  }, [defaultPersonId, event, isOpen])

  // Apply template
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setFormData(prev => ({
        ...prev,
        title: template.title,
        duration: template.duration,
        location: template.location || '',
        type: template.type,
        notes: template.notes || '',
        reminders: template.defaultReminders
      }))
    }
  }

  const enhanceTitle = async () => {
    const text = formData.title?.trim()
    if (!text || enhancingTitle) return

    setEnhancingTitle(true)
    try {
      const response = await fetch('/api/ai/text-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          context: 'Calendar event title',
          mode: 'polish',
        }),
      })
      const payload = await response.json()
      if (response.ok && typeof payload?.enhanced === 'string') {
        setFormData(prev => ({ ...prev, title: payload.enhanced }))
      }
    } catch (error) {
      console.warn('Failed to enhance event title:', error)
    } finally {
      setEnhancingTitle(false)
    }
  }

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.date) {
      newErrors.date = 'Date is required'
    }

    if (isMultiDay && !formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (isMultiDay && formData.endDate && formData.date && formData.endDate < formData.date) {
      newErrors.endDate = 'End date must be on or after the start date'
    }

    if (!formData.time) {
      newErrors.time = 'Time is required'
    }

    if (!formData.person) {
      newErrors.person = 'Person is required'
    }

    if (formData.duration && formData.duration < 5) {
      newErrors.duration = 'Duration must be at least 5 minutes'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return

    const duration = isMultiDay
      ? calculateMultiDayDuration(formData.date, formData.time, formData.endDate, formData.duration || 60)
      : formData.duration || 60

    const eventData = {
      ...formData,
      endDate: isMultiDay ? (formData.endDate || formData.date) : undefined,
      duration,
      isRecurring: formData.recurring !== 'none',
      attendees: formData.attendees || []
    } as Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>

    if (event) {
      const result = await onUpdate(event.id, eventData)
      if (result === 'conflict') return
    } else {
      const result = await onSave(eventData)
      if (result.status === 'conflict') return
    }

    onClose()
  }

  // Handle delete
  const handleDelete = async () => {
    if (event && onDelete) {
      if (confirm('Are you sure you want to delete this event?')) {
        await onDelete(event.id)
        onClose()
      }
    }
  }

  // Toggle attendee
  const toggleAttendee = (personId: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees?.includes(personId)
        ? prev.attendees.filter(id => id !== personId)
        : [...(prev.attendees || []), personId]
    }))
  }

  // Update reminder
  const updateReminder = (index: number, updates: Partial<Reminder>) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders?.map((reminder, i) =>
        i === index ? { ...reminder, ...updates } : reminder
      ) || []
    }))
  }

  // Add reminder
  const addReminder = () => {
    setFormData(prev => ({
      ...prev,
      reminders: [
        ...(prev.reminders || []),
        {
          id: Date.now().toString(),
          type: 'notification',
          time: 15,
          enabled: true
        }
      ]
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-gray-900 dark:bg-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-[#147c72] dark:text-[#56c6b8]" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {event ? 'Edit Event' : 'New Event'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Template Selection */}
          {!event && templates.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                Start from template (optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value)
                  if (e.target.value) applyTemplate(e.target.value)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Custom event...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              {/* Title */}
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                  Event Title *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(event) => setFormData(prev => ({ ...prev, title: event.target.value }))}
                    placeholder="Enter event title"
                    spellCheck
                    lang="en-GB"
                    className={`w-full px-3 py-2 pr-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => void enhanceTitle()}
                    disabled={!formData.title?.trim() || enhancingTitle}
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-[#147c72] transition hover:bg-[#eaf1e7] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#56c6b8] dark:hover:bg-slate-800"
                    title="AI enhance"
                    aria-label="AI enhance"
                  >
                    {enhancingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </button>
                </div>
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Person */}
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                  Assigned to *
                </label>
                {people.length === 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-700">
                      No family members found. Please add family members first in the Family section.
                    </p>
                  </div>
                ) : (
                  <select
                    value={formData.person || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, person: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.person ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select person</option>
                    {people.map(person => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.person && (
                  <p className="mt-1 text-sm text-red-600">{errors.person}</p>
                )}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      date: e.target.value,
                      endDate: prev.endDate && prev.endDate < e.target.value ? e.target.value : prev.endDate
                    }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.time || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.time ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.time && (
                    <p className="mt-1 text-sm text-red-600">{errors.time}</p>
                  )}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isMultiDay}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setIsMultiDay(checked)
                    setFormData(prev => ({
                      ...prev,
                      endDate: checked ? (prev.endDate || prev.date) : undefined
                    }))
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Multi-day event
              </label>

              {isMultiDay && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate || formData.date || ''}
                    min={formData.date || undefined}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.endDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                  )}
                </div>
              )}

              {/* Duration and Type */}
              <div className="grid grid-cols-2 gap-4">
                {!isMultiDay ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={formData.duration || 60}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
                    Ends {formData.endDate || formData.date || 'after start date'}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={formData.type || 'other'}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as CalendarEvent['type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="family">Family</option>
                    <option value="social">Social</option>
                    <option value="education">Education</option>
                    <option value="fitness">Fitness</option>
                    <option value="sport">Sport</option>
                    <option value="meeting">Meeting</option>
                    <option value="appointment">Appointment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <AIEnhancedField
                  value={formData.location || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                  multiline={false}
                  context="Calendar event location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter location"
                />
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>{showAdvanced ? 'Hide' : 'Show'} advanced options</span>
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-800">
                {/* Priority and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                      Priority
                    </label>
                    <select
                      value={formData.priority || 'medium'}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                      Status
                    </label>
                    <select
                      value={formData.status || 'confirmed'}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'confirmed' | 'tentative' | 'cancelled' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="tentative">Tentative</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Cost (£)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Attendees */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                    <Users className="w-4 h-4 inline mr-1" />
                    Additional Attendees
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {people
                      .filter(person => person.id !== formData.person)
                      .map(person => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => toggleAttendee(person.id)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            formData.attendees?.includes(person.id)
                              ? 'text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          style={{
                            backgroundColor: formData.attendees?.includes(person.id) ? person.color : undefined
                          }}
                        >
                          {person.name}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Reminders */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                    <Bell className="w-4 h-4 inline mr-1" />
                    Reminders
                  </label>
                  <div className="space-y-2">
                    {formData.reminders?.map((reminder, index) => (
                      <div key={reminder.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={reminder.enabled}
                          onChange={(e) => updateReminder(index, { enabled: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <select
                          value={reminder.time}
                          onChange={(e) => updateReminder(index, { time: parseInt(e.target.value) })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value={5}>5 minutes before</option>
                          <option value={15}>15 minutes before</option>
                          <option value={30}>30 minutes before</option>
                          <option value={60}>1 hour before</option>
                          <option value={1440}>1 day before</option>
                        </select>
                        <select
                          value={reminder.type}
                          onChange={(e) => updateReminder(index, { type: e.target.value as 'notification' | 'email' | 'sms' })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="notification">Notification</option>
                          <option value="email">Email</option>
                          <option value="sms">SMS</option>
                        </select>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addReminder}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add reminder
                    </button>
                  </div>
                </div>

                {/* Recurring */}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showRecurring}
                      onChange={(e) => {
                        setShowRecurring(e.target.checked)
                        if (!e.target.checked) {
                          setFormData(prev => ({ ...prev, recurring: 'none', isRecurring: false }))
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      <Repeat className="w-4 h-4 inline mr-1" />
                      Recurring event
                    </span>
                  </label>

                  {showRecurring && (
                    <div className="mt-2">
                      <select
                        value={formData.recurring || 'weekly'}
                        onChange={(e) => setFormData(prev => ({ ...prev, recurring: e.target.value as 'weekly' | 'monthly' | 'yearly' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Notes
                  </label>
                  <AIEnhancedField
                    value={formData.notes || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
                    rows={3}
                    context="Calendar event notes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6 dark:border-slate-800">
            <div>
              {event && onDelete && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{event ? 'Update' : 'Save'} Event</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventForm
