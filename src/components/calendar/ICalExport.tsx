'use client'

import React, { useState, useMemo } from 'react'
import {
  Download,
  Calendar,
  User,
  Clock,
  Filter,
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  BarChart3
} from 'lucide-react'
import { CalendarEvent, Person } from '@/types/calendar.types'
import icalService from '@/services/icalService'

interface ICalExportProps {
  events: CalendarEvent[]
  people: Person[]
}

const ICalExport: React.FC<ICalExportProps> = ({ events, people }) => {
  const [exportType, setExportType] = useState<'all' | 'person' | 'dateRange' | 'category'>('all')
  const [selectedPerson, setSelectedPerson] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [includeReminders, setIncludeReminders] = useState(true)
  const [customFilename, setCustomFilename] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Get unique categories from events
  const categories = useMemo(() => {
    const cats = new Set(events.map(e => e.type))
    return Array.from(cats).sort()
  }, [events])

  // Filter events based on selected criteria
  const filteredEvents = useMemo(() => {
    let filtered = [...events]

    switch (exportType) {
      case 'person':
        if (selectedPerson) {
          filtered = filtered.filter(e => e.person === selectedPerson || e.person === 'all')
        }
        break
      case 'dateRange':
        if (startDate && endDate) {
          const start = new Date(startDate)
          const end = new Date(endDate)
          filtered = filtered.filter(e => {
            const eventDate = new Date(e.date)
            return eventDate >= start && eventDate <= end
          })
        }
        break
      case 'category':
        if (selectedCategory) {
          filtered = filtered.filter(e => e.type === selectedCategory)
        }
        break
      default:
        // 'all' - no additional filtering
        break
    }

    return filtered
  }, [events, exportType, selectedPerson, startDate, endDate, selectedCategory])

  // Get export summary
  const exportSummary = useMemo(() => {
    return icalService.getExportSummary(filteredEvents)
  }, [filteredEvents])

  const handleExport = async () => {
    if (filteredEvents.length === 0) return

    setIsExporting(true)

    try {
      const options = {
        includeReminders,
        filename: customFilename || undefined
      }

      switch (exportType) {
        case 'person':
          const person = people.find(p => p.id === selectedPerson)
          if (person) {
            icalService.exportEventsByPerson(events, selectedPerson, person.name, options)
          }
          break
        case 'dateRange':
          if (startDate && endDate) {
            icalService.exportEventsByDateRange(
              events,
              new Date(startDate),
              new Date(endDate),
              options
            )
          }
          break
        default:
          icalService.exportEvents(filteredEvents, options)
          break
      }

      // Reset form after successful export
      setTimeout(() => {
        setIsExporting(false)
      }, 1000)

    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
    }
  }

  const getExportTypeLabel = () => {
    switch (exportType) {
      case 'person':
        const person = people.find(p => p.id === selectedPerson)
        return person ? `${person.name}'s Events` : 'Person Events'
      case 'dateRange':
        return startDate && endDate ? `${startDate} to ${endDate}` : 'Date Range'
      case 'category':
        return selectedCategory ? `${selectedCategory} Events` : 'Category Events'
      default:
        return 'All Events'
    }
  }

  const isExportValid = () => {
    if (filteredEvents.length === 0) return false

    switch (exportType) {
      case 'person':
        return selectedPerson !== ''
      case 'dateRange':
        return startDate !== '' && endDate !== '' && startDate <= endDate
      case 'category':
        return selectedCategory !== ''
      default:
        return true
    }
  }

  return (
    <div className="bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <Download className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Export Calendar</h2>
          <p className="text-sm text-gray-600">Export events as iCal (.ics) files</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Export Type Selection */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">What to Export</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'all', label: 'All Events', icon: Calendar, desc: 'Export entire calendar' },
              { value: 'person', label: 'By Person', icon: User, desc: 'Export one person\'s events' },
              { value: 'dateRange', label: 'Date Range', icon: Clock, desc: 'Export specific time period' },
              { value: 'category', label: 'By Category', icon: Filter, desc: 'Export specific event type' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setExportType(option.value as any)}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  exportType === option.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <option.icon className="w-4 h-4" />
                  <span className="font-medium">{option.label}</span>
                </div>
                <p className="text-xs text-gray-600">{option.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Export Options Based on Type */}
        {exportType === 'person' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Person
            </label>
            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Choose person...</option>
              {people.map(person => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {exportType === 'dateRange' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        )}

        {exportType === 'category' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Choose category...</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Export Summary */}
        {filteredEvents.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <BarChart3 className="w-4 h-4 text-gray-600" />
              <h4 className="font-medium text-gray-900">Export Summary</h4>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Events to export:</span>
                <span className="ml-2 font-medium">{exportSummary.totalEvents}</span>
              </div>

              {exportSummary.dateRange && (
                <div>
                  <span className="text-gray-600">Date range:</span>
                  <span className="ml-2 font-medium">
                    {exportSummary.dateRange.start} to {exportSummary.dateRange.end}
                  </span>
                </div>
              )}

              <div className="col-span-2">
                <span className="text-gray-600">Categories:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(exportSummary.categories).map(([category, count]) => (
                    <span key={category} className="inline-block px-2 py-1 bg-white rounded text-xs">
                      {category} ({count})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Options */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-gray-900">Advanced Options</span>
            {showAdvanced ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">Include Reminders</label>
                  <p className="text-sm text-gray-600">Export event reminders as alarms</p>
                </div>
                <input
                  type="checkbox"
                  checked={includeReminders}
                  onChange={(e) => setIncludeReminders(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Filename (optional)
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder="my-calendar.ics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Info className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-medium">Export Format</p>
                  <p>iCal (.ics) files are compatible with Google Calendar, Outlook, Apple Calendar, and most calendar applications.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {getExportTypeLabel()}
            {filteredEvents.length > 0 && (
              <span className="ml-2">• {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <button
            onClick={handleExport}
            disabled={!isExportValid() || isExporting}
            className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Calendar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ICalExport