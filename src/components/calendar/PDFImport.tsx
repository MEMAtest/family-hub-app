'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  User,
  Loader2,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react'
import { CalendarEvent, Person } from '@/types/calendar.types'
import pdfImportService, { ExtractedEvent, PDFImportResult } from '@/services/pdfImportService'

interface PDFImportProps {
  people: Person[]
  onEventsImport: (events: CalendarEvent[]) => void
}

const PDFImport: React.FC<PDFImportProps> = ({ people, onEventsImport }) => {
  const [dragActive, setDragActive] = useState(false)
  const [importResult, setImportResult] = useState<PDFImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set())
  const [defaultPerson, setDefaultPerson] = useState<string>('all')
  const [showExtractedText, setShowExtractedText] = useState(false)
  const [editingEvent, setEditingEvent] = useState<number | null>(null)
  const [editedEvents, setEditedEvents] = useState<Map<number, Partial<ExtractedEvent>>>(new Map())

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      await handleFileUpload(files[0])
    }
  }, [])

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      await handleFileUpload(files[0])
    }
  }, [])

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      alert('Please upload a PDF file')
      return
    }

    setIsProcessing(true)
    try {
      const result = await pdfImportService.parsePDFFile(file)
      setImportResult(result)

      if (result.success && result.events.length > 0) {
        // Select all events by default
        setSelectedEvents(new Set(result.events.map((_, index) => index)))
      }
    } catch (error) {
      console.error('PDF processing error:', error)
      setImportResult({
        success: false,
        extractedText: '',
        events: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        suggestions: ['Please try a different PDF file or check the file format.']
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleEventSelection = (index: number) => {
    const newSelected = new Set(selectedEvents)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedEvents(newSelected)
  }

  const toggleSelectAll = () => {
    if (!importResult) return

    if (selectedEvents.size === importResult.events.length) {
      setSelectedEvents(new Set())
    } else {
      setSelectedEvents(new Set(importResult.events.map((_, index) => index)))
    }
  }

  const handleEditEvent = (index: number) => {
    setEditingEvent(index)
  }

  const handleSaveEdit = (index: number, changes: Partial<ExtractedEvent>) => {
    const newEditedEvents = new Map(editedEvents)
    newEditedEvents.set(index, { ...newEditedEvents.get(index), ...changes })
    setEditedEvents(newEditedEvents)
    setEditingEvent(null)
  }

  const getEffectiveEvent = (event: ExtractedEvent, index: number): ExtractedEvent => {
    const edits = editedEvents.get(index)
    return edits ? { ...event, ...edits } : event
  }

  const handleImportSelected = () => {
    if (!importResult || selectedEvents.size === 0) return

    const selectedExtractedEvents = Array.from(selectedEvents).map(index => {
      const originalEvent = importResult.events[index]
      return getEffectiveEvent(originalEvent, index)
    })

    const calendarEvents = pdfImportService.convertToCalendarEvents(selectedExtractedEvents, defaultPerson)
    onEventsImport(calendarEvents)

    // Reset state
    setImportResult(null)
    setSelectedEvents(new Set())
    setEditedEvents(new Map())
    setEditingEvent(null)
  }

  const resetImport = () => {
    setImportResult(null)
    setSelectedEvents(new Set())
    setEditedEvents(new Map())
    setEditingEvent(null)
    setShowExtractedText(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  return (
    <div className="bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Import from PDF</h2>
          <p className="text-sm text-gray-600">Extract calendar events from PDF documents</p>
        </div>
      </div>

      {!importResult ? (
        /* Upload Section */
        <div className="space-y-6">
          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <Upload className="w-8 h-8 text-gray-600" />
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {isProcessing ? 'Processing PDF...' : 'Upload PDF Document'}
                </h3>
                <p className="text-gray-600 mt-1">
                  {isProcessing
                    ? 'Extracting events from your document'
                    : 'Drag and drop your PDF here, or click to browse'
                  }
                </p>
              </div>

              {isProcessing ? (
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Choose PDF File
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>

          {/* Supported Formats Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Supported PDF Types</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• School term date letters</li>
              <li>• Activity and sports schedules</li>
              <li>• Event timetables and programs</li>
              <li>• Meeting agendas with dates and times</li>
              <li>• Any document with clear date/time information</li>
            </ul>
          </div>
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-6">
          {/* Import Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Import Results</h3>
              <button
                onClick={resetImport}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Start Over</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{importResult.events.length}</div>
                <div className="text-sm text-gray-600">Events Found</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{selectedEvents.size}</div>
                <div className="text-sm text-gray-600">Selected</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {importResult.events.filter(e => e.confidence >= 0.8).length}
                </div>
                <div className="text-sm text-gray-600">High Confidence</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center space-x-2 text-red-800">
                  <XCircle className="w-4 h-4" />
                  <span className="font-medium">Errors:</span>
                </div>
                <ul className="mt-1 text-sm text-red-700">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.suggestions.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Suggestions:</span>
                </div>
                <ul className="mt-1 text-sm text-yellow-700">
                  {importResult.suggestions.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Default Person Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign events to:
            </label>
            <select
              value={defaultPerson}
              onChange={(e) => setDefaultPerson(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All family members</option>
              {people.map(person => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>

          {/* Events List */}
          {importResult.events.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Extracted Events</h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {selectedEvents.size === importResult.events.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={() => setShowExtractedText(!showExtractedText)}
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{showExtractedText ? 'Hide' : 'Show'} Text</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {importResult.events.map((event, index) => {
                  const effectiveEvent = getEffectiveEvent(event, index)
                  const isSelected = selectedEvents.has(index)
                  const isEditing = editingEvent === index

                  return (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEventSelection(index)}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <EditEventForm
                              event={effectiveEvent}
                              onSave={(changes) => handleSaveEdit(index, changes)}
                              onCancel={() => setEditingEvent(null)}
                            />
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-gray-900">{effectiveEvent.title}</h5>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(effectiveEvent.confidence)}`}>
                                    {getConfidenceLabel(effectiveEvent.confidence)}
                                  </span>
                                  <button
                                    onClick={() => handleEditEvent(index)}
                                    className="text-gray-400 hover:text-gray-600"
                                    title="Edit event"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{effectiveEvent.date}</span>
                                </div>
                                {effectiveEvent.time && (
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4" />
                                    <span>{effectiveEvent.time}</span>
                                  </div>
                                )}
                                {effectiveEvent.location && (
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>{effectiveEvent.location}</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                                Source: {effectiveEvent.source}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Extracted Text Viewer */}
          {showExtractedText && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Extracted Text</h4>
              <div className="p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {importResult.extractedText}
                </pre>
              </div>
            </div>
          )}

          {/* Import Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {selectedEvents.size} of {importResult.events.length} events selected
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={resetImport}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSelected}
                disabled={selectedEvents.size === 0}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Import {selectedEvents.size} Events</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Edit Event Form Component
interface EditEventFormProps {
  event: ExtractedEvent
  onSave: (changes: Partial<ExtractedEvent>) => void
  onCancel: () => void
}

const EditEventForm: React.FC<EditEventFormProps> = ({ event, onSave, onCancel }) => {
  const [title, setTitle] = useState(event.title)
  const [date, setDate] = useState(event.date)
  const [time, setTime] = useState(event.time || '')
  const [location, setLocation] = useState(event.location || '')

  const handleSave = () => {
    onSave({
      title,
      date,
      time: time || undefined,
      location: location || undefined
    })
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Event title"
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Optional"
        />
      </div>

      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Location (optional)"
      />

      <div className="flex items-center space-x-2">
        <button
          onClick={handleSave}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-gray-600 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default PDFImport