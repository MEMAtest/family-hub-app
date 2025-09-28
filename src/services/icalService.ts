import { CalendarEvent } from '@/types/calendar.types'

export interface ICalExportOptions {
  events: CalendarEvent[]
  filename?: string
  includeReminders?: boolean
  timezone?: string
}

class ICalService {
  private timezone: string = 'Europe/London'

  /**
   * Generate iCal content from events
   */
  generateICalContent(events: CalendarEvent[], options?: Partial<ICalExportOptions>): string {
    const { includeReminders = true, timezone = this.timezone } = options || {}

    const lines: string[] = []

    // iCal header
    lines.push('BEGIN:VCALENDAR')
    lines.push('VERSION:2.0')
    lines.push('PRODID:-//Family Hub App//Family Hub Calendar//EN')
    lines.push('CALSCALE:GREGORIAN')
    lines.push('METHOD:PUBLISH')
    lines.push(`X-WR-TIMEZONE:${timezone}`)
    lines.push('')

    // Add timezone information
    lines.push('BEGIN:VTIMEZONE')
    lines.push(`TZID:${timezone}`)
    lines.push('BEGIN:STANDARD')
    lines.push('DTSTART:20231029T020000')
    lines.push('TZOFFSETFROM:+0100')
    lines.push('TZOFFSETTO:+0000')
    lines.push('TZNAME:GMT')
    lines.push('END:STANDARD')
    lines.push('BEGIN:DAYLIGHT')
    lines.push('DTSTART:20240331T010000')
    lines.push('TZOFFSETFROM:+0000')
    lines.push('TZOFFSETTO:+0100')
    lines.push('TZNAME:BST')
    lines.push('END:DAYLIGHT')
    lines.push('END:VTIMEZONE')
    lines.push('')

    // Add each event
    events.forEach(event => {
      lines.push(...this.generateEventLines(event, { includeReminders, timezone }))
      lines.push('')
    })

    // iCal footer
    lines.push('END:VCALENDAR')

    return lines.join('\r\n')
  }

  /**
   * Generate iCal lines for a single event
   */
  private generateEventLines(event: CalendarEvent, options: { includeReminders: boolean; timezone: string }): string[] {
    const lines: string[] = []
    const now = new Date()
    const created = event.createdAt || now
    const modified = event.updatedAt || now

    // Event start and end times
    const startDateTime = new Date(`${event.date}T${event.time}`)
    const endDateTime = new Date(startDateTime.getTime() + event.duration * 60 * 1000)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.id}@familyhub.local`)
    lines.push(`DTSTAMP:${this.formatICalDateTime(now)}`)
    lines.push(`CREATED:${this.formatICalDateTime(created)}`)
    lines.push(`LAST-MODIFIED:${this.formatICalDateTime(modified)}`)

    // Event times
    lines.push(`DTSTART;TZID=${options.timezone}:${this.formatICalDateTime(startDateTime, true)}`)
    lines.push(`DTEND;TZID=${options.timezone}:${this.formatICalDateTime(endDateTime, true)}`)

    // Event details
    lines.push(`SUMMARY:${this.escapeICalText(event.title)}`)

    if (event.notes) {
      lines.push(`DESCRIPTION:${this.escapeICalText(event.notes)}`)
    }

    if (event.location) {
      lines.push(`LOCATION:${this.escapeICalText(event.location)}`)
    }

    // Status
    const status = event.status === 'confirmed' ? 'CONFIRMED' :
                  event.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'
    lines.push(`STATUS:${status}`)

    // Priority
    const priority = event.priority === 'high' ? '1' :
                    event.priority === 'medium' ? '5' : '9'
    lines.push(`PRIORITY:${priority}`)

    // Categories
    lines.push(`CATEGORIES:${event.type.toUpperCase()}`)

    // Cost as custom property
    if (event.cost > 0) {
      lines.push(`X-COST:£${event.cost}`)
    }

    // Attendees
    if (event.attendees && event.attendees.length > 0) {
      event.attendees.forEach(email => {
        lines.push(`ATTENDEE:mailto:${email}`)
      })
    }

    // Reminders/Alarms
    if (options.includeReminders && event.reminders) {
      event.reminders
        .filter(reminder => reminder.enabled)
        .forEach(reminder => {
          lines.push('BEGIN:VALARM')
          lines.push('ACTION:DISPLAY')
          lines.push(`DESCRIPTION:${this.escapeICalText(event.title)} reminder`)
          lines.push(`TRIGGER:-PT${reminder.time}M`)
          lines.push('END:VALARM')
        })
    }

    // Recurrence
    if (event.isRecurring && event.recurring !== 'none') {
      const rrule = this.generateRecurrenceRule(event.recurring)
      if (rrule) {
        lines.push(`RRULE:${rrule}`)
      }
    }

    lines.push('END:VEVENT')

    return lines
  }

  /**
   * Format date for iCal format (YYYYMMDDTHHMMSS)
   */
  private formatICalDateTime(date: Date, local = false): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    const formatted = `${year}${month}${day}T${hours}${minutes}${seconds}`
    return local ? formatted : `${formatted}Z`
  }

  /**
   * Escape special characters for iCal text fields
   */
  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
  }

  /**
   * Generate RRULE for recurring events
   */
  private generateRecurrenceRule(recurring: string): string | null {
    switch (recurring) {
      case 'daily':
        return 'FREQ=DAILY'
      case 'weekly':
        return 'FREQ=WEEKLY'
      case 'monthly':
        return 'FREQ=MONTHLY'
      case 'yearly':
        return 'FREQ=YEARLY'
      case 'weekdays':
        return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
      default:
        return null
    }
  }

  /**
   * Export single event as iCal file
   */
  exportSingleEvent(event: CalendarEvent, options?: Partial<ICalExportOptions>): void {
    const filename = options?.filename || `${this.sanitizeFilename(event.title)}.ics`
    const content = this.generateICalContent([event], options)
    this.downloadICalFile(content, filename)
  }

  /**
   * Export multiple events as iCal file
   */
  exportEvents(events: CalendarEvent[], options?: Partial<ICalExportOptions>): void {
    const filename = options?.filename || `family-hub-calendar-${new Date().toISOString().split('T')[0]}.ics`
    const content = this.generateICalContent(events, options)
    this.downloadICalFile(content, filename)
  }

  /**
   * Export events by person
   */
  exportEventsByPerson(events: CalendarEvent[], personId: string, personName: string, options?: Partial<ICalExportOptions>): void {
    const personEvents = events.filter(event => event.person === personId || event.person === 'all')
    const filename = options?.filename || `${this.sanitizeFilename(personName)}-calendar.ics`
    this.exportEvents(personEvents, { ...options, filename })
  }

  /**
   * Export events by date range
   */
  exportEventsByDateRange(
    events: CalendarEvent[],
    startDate: Date,
    endDate: Date,
    options?: Partial<ICalExportOptions>
  ): void {
    const rangeEvents = events.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate >= startDate && eventDate <= endDate
    })

    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]
    const filename = options?.filename || `family-hub-${startStr}-to-${endStr}.ics`

    this.exportEvents(rangeEvents, { ...options, filename })
  }

  /**
   * Download iCal file in browser
   */
  private downloadICalFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  /**
   * Sanitize filename for safe download
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
  }

  /**
   * Get calendar statistics for export summary
   */
  getExportSummary(events: CalendarEvent[]): {
    totalEvents: number
    dateRange: { start: string; end: string } | null
    categories: Record<string, number>
    people: Record<string, number>
  } {
    if (events.length === 0) {
      return {
        totalEvents: 0,
        dateRange: null,
        categories: {},
        people: {}
      }
    }

    const dates = events.map(e => e.date).sort()
    const categories: Record<string, number> = {}
    const people: Record<string, number> = {}

    events.forEach(event => {
      categories[event.type] = (categories[event.type] || 0) + 1
      people[event.person] = (people[event.person] || 0) + 1
    })

    return {
      totalEvents: events.length,
      dateRange: {
        start: dates[0],
        end: dates[dates.length - 1]
      },
      categories,
      people
    }
  }
}

export default new ICalService()