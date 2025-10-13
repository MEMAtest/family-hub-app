import React from 'react'
import { Calendar, Clock, MapPin, Users, ChevronRight } from 'lucide-react'
import { CalendarEvent } from '@/types'
import { formatEventDate } from '@/utils/dateUtils'
import { formatDate } from '@/utils/formatDate'

interface CalendarPreviewProps {
  events: CalendarEvent[]
  onViewCalendar: () => void
}

export default function CalendarPreview({ events, onViewCalendar }: CalendarPreviewProps) {
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Get upcoming events for the next 7 days
  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.date)
      return eventDate >= today && eventDate <= nextWeek
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'sport':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'education':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'social':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'meeting':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'appointment':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Use the imported utility function for consistent date formatting

  if (upcomingEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming events</h3>
        <p className="text-gray-500 mb-4">
          Your calendar is clear for the next week.
        </p>
        <button
          onClick={onViewCalendar}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Add Event
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Today's date */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
          <p className="text-sm text-gray-500">
            This week's schedule
          </p>
        </div>
        <button
          onClick={onViewCalendar}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
        >
          View All
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* Events list */}
      <div className="space-y-3">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            className="group p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-start space-x-4">
              {/* Date indicator */}
              <div className="flex-shrink-0 text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex flex-col items-center justify-center border border-blue-100">
                  <span className="text-xs font-medium text-blue-600">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][new Date(event.date).getMonth()]}
                  </span>
                  <span className="text-sm font-bold text-blue-700">
                    {new Date(event.date).getDate()}
                  </span>
                </div>
              </div>

              {/* Event details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {event.title}
                    </h4>
                    {event.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getEventTypeColor(event.type)}`}>
                    {event.type}
                  </span>
                </div>

                {/* Event metadata */}
                <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>{event.time}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span className="truncate max-w-24">{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    <span>{formatEventDate(event.date)}</span>
                  </div>
                  {event.cost > 0 && (
                    <div className="flex items-center">
                      <span className="font-medium">£{event.cost}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {events.length} total events this month
          </span>
          <button
            onClick={onViewCalendar}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Add Event
          </button>
        </div>
      </div>
    </div>
  )
}