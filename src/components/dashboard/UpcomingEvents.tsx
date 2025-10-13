import React from 'react'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { CalendarEvent } from '@/types'
import { formatDate } from '@/utils/formatDate'

interface UpcomingEventsProps {
  events: CalendarEvent[]
  onViewAll: () => void
}

export default function UpcomingEvents({ events, onViewAll }: UpcomingEventsProps) {
  const today = new Date()
  const upcomingEvents = events
    .filter(event => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  if (upcomingEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming events</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first family event.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {upcomingEvents.map((event) => (
        <div
          key={event.id}
          className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
        >
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {event.title}
            </p>
            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDate(event.date)}
              </div>
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {event.time}
              </div>
              {event.location && (
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {event.location}
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${event.type === 'sport' ? 'bg-green-100 text-green-800' :
                event.type === 'education' ? 'bg-blue-100 text-blue-800' :
                event.type === 'social' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }
            `}>
              {event.type}
            </span>
          </div>
        </div>
      ))}

      {events.length > 5 && (
        <button
          onClick={onViewAll}
          className="w-full text-center py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all events ({events.length})
        </button>
      )}
    </div>
  )
}