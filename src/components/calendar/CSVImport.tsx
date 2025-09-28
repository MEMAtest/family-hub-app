'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Plus,
  Download,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Settings,
  Info,
  Loader2
} from 'lucide-react'
import { CalendarEvent, Person } from '@/types/calendar.types'
import csvImportService, { CSVColumn, CSVParseResult, CSVEventData } from '@/services/csvImportService'

interface CSVImportProps {
  people: Person[]
  onEventsImport: (events: CalendarEvent[]) => void
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'complete'

const CSVImport: React.FC<CSVImportProps> = ({ people, onEventsImport }) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload')
  const [dragActive, setDragActive] = useState(false)
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [defaultPerson, setDefaultPerson] = useState<string>('all')
  const [mappedColumns, setMappedColumns] = useState<CSVColumn[]>([])
  const [previewEvents, setPreviewEvents] = useState<CSVEventData[]>([])

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
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }

    setIsProcessing(true)
    try {
      const result = await csvImportService.parseCSVFile(file)
      setParseResult(result)
      setMappedColumns(result.columns)

      if (result.success) {
        setCurrentStep('mapping')
      }
    } catch (error) {
      console.error('CSV parsing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleColumnMappingChange = (columnIndex: number, mappedTo: string) => {
    const newMappedColumns = [...mappedColumns]
    newMappedColumns[columnIndex] = {
      ...newMappedColumns[columnIndex],
      mappedTo: mappedTo as any
    }
    setMappedColumns(newMappedColumns)
  }

  const handlePreviewEvents = () => {
    if (!parseResult) return

    setIsProcessing(true)
    try {
      const processResult = csvImportService.processCSVData(
        parseResult.rows,
        mappedColumns,
        defaultPerson
      )

      if (processResult.success) {
        setPreviewEvents(processResult.events)
        setCurrentStep('preview')
      } else {
        alert(`Processing errors:\n${processResult.errors.join('\n')}`)
      }
    } catch (error) {
      console.error('Processing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImportEvents = () => {
    const calendarEvents = csvImportService.convertToCalendarEvents(previewEvents)
    onEventsImport(calendarEvents)
    setCurrentStep('complete')
  }

  const resetImport = () => {
    setCurrentStep('upload')
    setParseResult(null)
    setMappedColumns([])
    setPreviewEvents([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadSampleCSV = () => {
    const sampleContent = csvImportService.generateSampleCSV()
    const blob = new Blob([sampleContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'family-hub-sample.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const getStepIcon = (step: ImportStep) => {
    switch (step) {
      case 'upload': return <Upload className="w-4 h-4" />
      case 'mapping': return <Settings className="w-4 h-4" />
      case 'preview': return <Eye className="w-4 h-4" />
      case 'complete': return <CheckCircle className="w-4 h-4" />
    }
  }

  const isStepComplete = (step: ImportStep) => {
    switch (step) {
      case 'upload': return parseResult !== null
      case 'mapping': return previewEvents.length > 0
      case 'preview': return currentStep === 'complete'
      case 'complete': return currentStep === 'complete'
    }
  }

  const isStepActive = (step: ImportStep) => currentStep === step

  return (
    <div className="bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <FileSpreadsheet className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Import from CSV</h2>
          <p className="text-sm text-gray-600">Import calendar events from spreadsheet files</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          {(['upload', 'mapping', 'preview', 'complete'] as ImportStep[]).map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isStepComplete(step) ? 'bg-green-500 text-white' :
                  isStepActive(step) ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {isStepComplete(step) && step !== currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    getStepIcon(step)
                  )}
                </div>
                <span className={`ml-2 text-sm ${
                  isStepActive(step) ? 'text-blue-600 font-medium' : 'text-gray-600'
                }`}>
                  {step.charAt(0).toUpperCase() + step.slice(1)}
                </span>
              </div>
              {index < 3 && (
                <ArrowRight className="w-4 h-4 text-gray-400" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'upload' && (
        <div className="space-y-6">
          {/* Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <Upload className="w-8 h-8 text-gray-600" />
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {isProcessing ? 'Processing CSV...' : 'Upload CSV File'}
                </h3>
                <p className="text-gray-600 mt-1">
                  {isProcessing
                    ? 'Reading and parsing your spreadsheet'
                    : 'Drag and drop your CSV file here, or click to browse'
                  }
                </p>
              </div>

              {isProcessing ? (
                <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Choose CSV File
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>

          {/* Sample Download */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Need a template?</h4>
                <p className="text-sm text-gray-600">Download our sample CSV file to see the expected format</p>
              </div>
              <button
                onClick={downloadSampleCSV}
                className="flex items-center space-x-2 px-4 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Sample CSV</span>
              </button>
            </div>
          </div>

          {/* Supported Format Info */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• First row should contain column headers</li>
              <li>• At minimum, include Title and Date columns</li>
              <li>• Dates in DD/MM/YYYY or YYYY-MM-DD format</li>
              <li>• Times in HH:MM format (24-hour or with AM/PM)</li>
              <li>• Duration in minutes or "X hours Y minutes" format</li>
            </ul>
          </div>
        </div>
      )}

      {currentStep === 'mapping' && parseResult && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Map CSV Columns</h3>
            <div className="text-sm text-gray-600">
              Found {parseResult.totalRows} data rows
            </div>
          </div>

          {/* Default Person Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default person for events:
            </label>
            <select
              value={defaultPerson}
              onChange={(e) => setDefaultPerson(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All family members</option>
              {people.map(person => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>

          {/* Column Mapping */}
          <div className="space-y-3">
            {mappedColumns.map((column, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 items-center p-3 border border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{column.name}</div>
                  <div className="text-sm text-gray-500">Column {index + 1}</div>
                </div>

                <div className="text-sm text-gray-600">
                  <span className="font-medium">Sample:</span> {column.sample || 'No data'}
                </div>

                <select
                  value={column.mappedTo || 'ignore'}
                  onChange={(e) => handleColumnMappingChange(index, e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="ignore">Ignore</option>
                  <option value="title">Title *</option>
                  <option value="date">Date *</option>
                  <option value="time">Time</option>
                  <option value="duration">Duration</option>
                  <option value="location">Location</option>
                  <option value="person">Person</option>
                  <option value="type">Type</option>
                  <option value="notes">Notes</option>
                  <option value="cost">Cost</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                </select>

                <div className="text-xs text-gray-500">
                  {column.mappedTo === 'title' || column.mappedTo === 'date' ? (
                    <span className="text-red-600">Required</span>
                  ) : (
                    'Optional'
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Validation Messages */}
          {!mappedColumns.some(col => col.mappedTo === 'title') && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800">
                <XCircle className="w-4 h-4" />
                <span className="font-medium">Title column is required</span>
              </div>
            </div>
          )}

          {!mappedColumns.some(col => col.mappedTo === 'date') && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800">
                <XCircle className="w-4 h-4" />
                <span className="font-medium">Date column is required</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <button
              onClick={() => setCurrentStep('upload')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handlePreviewEvents}
              disabled={!mappedColumns.some(col => col.mappedTo === 'title') ||
                       !mappedColumns.some(col => col.mappedTo === 'date') ||
                       isProcessing}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Preview Events</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {currentStep === 'preview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Preview Import</h3>
            <div className="text-sm text-gray-600">
              {previewEvents.length} events ready to import
            </div>
          </div>

          {/* Events Preview */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {previewEvents.map((event, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                      <div>📅 {event.date}</div>
                      {event.time && <div>🕐 {event.time}</div>}
                      {event.location && <div>📍 {event.location}</div>}
                      {event.person && <div>👤 {event.person}</div>}
                      {event.duration && <div>⏱️ {event.duration} min</div>}
                      {event.cost && <div>💰 £{event.cost}</div>}
                    </div>
                    {event.notes && (
                      <div className="mt-2 text-sm text-gray-600 italic">
                        {event.notes}
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      event.type === 'sport' ? 'bg-green-100 text-green-800' :
                      event.type === 'meeting' ? 'bg-blue-100 text-blue-800' :
                      event.type === 'social' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.type || 'other'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <button
              onClick={() => setCurrentStep('mapping')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Mapping</span>
            </button>

            <button
              onClick={handleImportEvents}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Import {previewEvents.length} Events</span>
            </button>
          </div>
        </div>
      )}

      {currentStep === 'complete' && (
        <div className="text-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">Import Complete!</h3>
              <p className="text-gray-600 mt-1">
                Successfully imported {previewEvents.length} events to your calendar
              </p>
            </div>

            <button
              onClick={resetImport}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Import Another File</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSVImport