'use client'

import React, { useState } from 'react'
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Save,
  Bookmark,
  Clock,
  MapPin,
  DollarSign,
  FileText,
  Bell,
  Star,
  Copy,
  Calendar
} from 'lucide-react'
import { EventTemplate, Reminder } from '@/types/calendar.types'

interface EventTemplatesProps {
  isOpen: boolean
  onClose: () => void
  templates: EventTemplate[]
  onSave: (template: Omit<EventTemplate, 'id'>) => void
  onUpdate: (id: string, updates: Partial<EventTemplate>) => void
  onDelete: (id: string) => void
  onDuplicate: (template: EventTemplate) => void
}

const EventTemplates: React.FC<EventTemplatesProps> = ({
  isOpen,
  onClose,
  templates,
  onSave,
  onUpdate,
  onDelete,
  onDuplicate
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EventTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState<Partial<EventTemplate>>({
    name: '',
    title: '',
    duration: 60,
    location: '',
    type: 'other',
    notes: '',
    category: 'personal',
    defaultReminders: [
      { id: '1', type: 'notification', time: 15, enabled: true }
    ]
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form
  const resetForm = () => {
    setTemplateForm({
      name: '',
      title: '',
      duration: 60,
      location: '',
      type: 'other',
      notes: '',
      category: 'personal',
      defaultReminders: [
        { id: '1', type: 'notification', time: 15, enabled: true }
      ]
    })
    setErrors({})
    setEditingTemplate(null)
    setShowCreateForm(false)
  }

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!templateForm.name?.trim()) {
      newErrors.name = 'Template name is required'
    }

    if (!templateForm.title?.trim()) {
      newErrors.title = 'Event title is required'
    }

    if (!templateForm.duration || templateForm.duration < 5) {
      newErrors.duration = 'Duration must be at least 5 minutes'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = () => {
    if (!validateForm()) return

    const templateData = {
      ...templateForm,
      id: editingTemplate?.id || Date.now().toString()
    } as EventTemplate

    if (editingTemplate) {
      onUpdate(editingTemplate.id, templateData)
    } else {
      onSave(templateData)
    }

    resetForm()
  }

  // Handle edit
  const handleEdit = (template: EventTemplate) => {
    setEditingTemplate(template)
    setTemplateForm(template)
    setShowCreateForm(true)
  }

  // Handle duplicate
  const handleDuplicate = (template: EventTemplate) => {
    const duplicatedTemplate = {
      ...template,
      name: `${template.name} (Copy)`,
      id: undefined
    }
    setTemplateForm(duplicatedTemplate)
    setEditingTemplate(null)
    setShowCreateForm(true)
  }

  // Handle delete
  const handleDelete = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      onDelete(templateId)
    }
  }

  // Update reminder
  const updateReminder = (index: number, updates: Partial<Reminder>) => {
    setTemplateForm(prev => ({
      ...prev,
      defaultReminders: prev.defaultReminders?.map((reminder, i) =>
        i === index ? { ...reminder, ...updates } : reminder
      ) || []
    }))
  }

  // Add reminder
  const addReminder = () => {
    setTemplateForm(prev => ({
      ...prev,
      defaultReminders: [
        ...(prev.defaultReminders || []),
        {
          id: Date.now().toString(),
          type: 'notification',
          time: 15,
          enabled: true
        }
      ]
    }))
  }

  // Remove reminder
  const removeReminder = (index: number) => {
    setTemplateForm(prev => ({
      ...prev,
      defaultReminders: prev.defaultReminders?.filter((_, i) => i !== index) || []
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bookmark className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Event Templates</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!showCreateForm ? (
            <>
              {/* Templates List */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Your Templates</h3>
                  <p className="text-sm text-gray-600">Manage your event templates for quick creation</p>
                </div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Template</span>
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Bookmark className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
                  <p className="text-gray-500 mb-4">Create your first template to speed up event creation</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{template.title}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEdit(template)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(template)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>{template.duration} minutes</span>
                        </div>

                        {template.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{template.location}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            template.category === 'work' ? 'bg-blue-100 text-blue-800' :
                            template.category === 'personal' ? 'bg-green-100 text-green-800' :
                            template.category === 'family' ? 'bg-purple-100 text-purple-800' :
                            template.category === 'health' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {template.category}
                          </span>

                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            template.type === 'sport' ? 'bg-green-100 text-green-800' :
                            template.type === 'meeting' ? 'bg-blue-100 text-blue-800' :
                            template.type === 'fitness' ? 'bg-purple-100 text-purple-800' :
                            template.type === 'social' ? 'bg-pink-100 text-pink-800' :
                            template.type === 'education' ? 'bg-yellow-100 text-yellow-800' :
                            template.type === 'family' ? 'bg-red-100 text-red-800' :
                            template.type === 'appointment' ? 'bg-orange-100 text-orange-800' :
                            template.type === 'work' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {template.type}
                          </span>
                        </div>

                        {template.defaultReminders && template.defaultReminders.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <Bell className="w-4 h-4" />
                            <span>{template.defaultReminders.length} reminder{template.defaultReminders.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Create/Edit Form */
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingTemplate ? 'Edit Template' : 'Create New Template'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {editingTemplate ? 'Modify your existing template' : 'Create a reusable template for quick event creation'}
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateForm.name || ''}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Doctor Appointment"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Event Title *
                    </label>
                    <input
                      type="text"
                      value={templateForm.title || ''}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.title ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Doctor Appointment"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={templateForm.duration || 60}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Type
                    </label>
                    <select
                      value={templateForm.type || 'other'}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, type: e.target.value as any }))}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={templateForm.category || 'personal'}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="work">Work</option>
                      <option value="personal">Personal</option>
                      <option value="family">Family</option>
                      <option value="health">Health</option>
                      <option value="education">Education</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Location
                  </label>
                  <input
                    type="text"
                    value={templateForm.location || ''}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Community Health Center"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Notes
                  </label>
                  <textarea
                    value={templateForm.notes || ''}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Bring insurance card and ID"
                  />
                </div>

                {/* Default Reminders */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Reminders
                  </label>
                  <div className="space-y-2">
                    {templateForm.defaultReminders?.map((reminder, index) => (
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
                          onChange={(e) => updateReminder(index, { type: e.target.value as any })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="notification">Notification</option>
                          <option value="email">Email</option>
                          <option value="sms">SMS</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeReminder(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
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
                    <span>{editingTemplate ? 'Update' : 'Create'} Template</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventTemplates