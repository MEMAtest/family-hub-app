'use client'

import React, { useState, useEffect } from 'react'
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
  Trash2
} from 'lucide-react'
import { CalendarEvent, Reminder, RecurringPattern, EventTemplate, Person } from '@/types/calendar.types'

interface EventFormProps {
  event?: CalendarEvent
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdate: (id: string, updates: Partial<CalendarEvent>) => void
  onDelete?: (id: string) => void
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
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    person: people[0]?.id || '',
    date: '',
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
  })

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data
  useEffect(() => {
    if (event) {
      // Edit mode
      setFormData({
        ...event,
        attendees: event.attendees || []
      })
      setShowRecurring(event.isRecurring)
    } else if (defaultSlot) {
      // New event from slot selection
      const startDate = new Date(defaultSlot.start)
      const duration = Math.round((defaultSlot.end.getTime() - defaultSlot.start.getTime()) / (1000 * 60))

      setFormData(prev => ({
        ...prev,
        date: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
        time: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
        duration: Math.max(15, duration)
      }))
    } else {
      // New event
      const now = new Date()
      setFormData(prev => ({
        ...prev,
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      }))
    }
  }, [event, defaultSlot, isOpen])

  // Auto-select first person when people become available
  useEffect(() => {
    if (people.length > 0 && !formData.person && !event) {
      setFormData(prev => ({ ...prev, person: people[0].id }))
    }
  }, [people, formData.person, event])

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

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.date) {
      newErrors.date = 'Date is required'
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
  const handleSave = () => {
    if (!validateForm()) return

    const eventData = {
      ...formData,
      isRecurring: formData.recurring !== 'none',
      attendees: formData.attendees || []
    } as Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>

    if (event) {
      onUpdate(event.id, eventData)
    } else {
      onSave(eventData)
    }

    onClose()
  }

  // Handle delete
  const handleDelete = () => {
    if (event && onDelete) {
      if (confirm('Are you sure you want to delete this event?')) {
        onDelete(event.id)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {event ? 'Edit Event' : 'New Event'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Template Selection */}
          {!event && templates.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter event title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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

              {/* Duration and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
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
              <div className="space-y-4 pt-4 border-t border-gray-200">
                {/* Priority and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <span className="text-sm font-medium text-gray-700">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
            <div>
              {event && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
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
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
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