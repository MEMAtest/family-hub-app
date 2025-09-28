import { CalendarEvent } from '@/types/calendar.types'

// Since pdf-parse is a Node.js library, we'll handle PDF parsing on the client
// using a browser-compatible approach with FileReader and text extraction

export interface ExtractedEvent {
  title: string
  date: string
  time?: string
  duration?: number
  location?: string
  notes?: string
  confidence: number
  source: string
}

export interface PDFImportResult {
  success: boolean
  extractedText: string
  events: ExtractedEvent[]
  errors: string[]
  suggestions: string[]
}

class PDFImportService {
  private datePatterns = [
    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g,
    // DD Month YYYY, DD Month
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})?\b/gi,
    // Month DD, YYYY
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
    // Day DD Month YYYY
    /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/gi
  ]

  private timePatterns = [
    // HH:MM AM/PM, HH:MM
    /\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\b/g,
    // HH.MM AM/PM, HH.MM
    /\b(\d{1,2})\.(\d{2})\s*(AM|PM|am|pm)?\b/g,
    // At HH:MM
    /\bat\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\b/gi
  ]

  private eventKeywords = [
    'lesson', 'class', 'training', 'session', 'meeting', 'appointment',
    'assembly', 'rehearsal', 'practice', 'club', 'activity', 'event',
    'term', 'starts', 'ends', 'break', 'holiday', 'inset', 'day',
    'parent', 'evening', 'sports', 'match', 'tournament', 'exam',
    'test', 'graduation', 'ceremony', 'performance', 'concert'
  ]

  private locationKeywords = [
    'school', 'hall', 'room', 'centre', 'center', 'gym', 'field',
    'pool', 'library', 'auditorium', 'playground', 'court', 'studio',
    'office', 'clinic', 'hospital', 'church', 'park', 'venue'
  ]

  private monthMap = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  }

  /**
   * Parse PDF file and extract calendar events
   */
  async parsePDFFile(file: File): Promise<PDFImportResult> {
    const result: PDFImportResult = {
      success: false,
      extractedText: '',
      events: [],
      errors: [],
      suggestions: []
    }

    try {
      // Extract text from PDF using browser FileReader
      const text = await this.extractTextFromPDF(file)
      result.extractedText = text

      // Extract events from text
      const events = this.extractEventsFromText(text)
      result.events = events
      result.success = true

      if (events.length === 0) {
        result.suggestions.push('No events found. Try uploading a PDF with clearer date and time information.')
      }

      return result

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error parsing PDF')
      return result
    }
  }

  /**
   * Extract text from PDF file using browser APIs
   */
  private async extractTextFromPDF(file: File): Promise<string> {
    // For now, we'll use a simple approach since pdf-parse requires Node.js
    // In a real implementation, you might:
    // 1. Send the file to a backend API for processing
    // 2. Use a browser-compatible PDF library like PDF.js
    // 3. Use a cloud service for PDF text extraction

    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          // This is a simplified version - in reality you'd need PDF.js or similar
          // For demo purposes, we'll simulate text extraction
          const arrayBuffer = e.target?.result as ArrayBuffer

          // Simulate extracted text from a school calendar PDF
          const simulatedText = this.getSimulatedPDFText()
          resolve(simulatedText)

        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Failed to read PDF file'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Simulate extracted PDF text for demonstration
   */
  private getSimulatedPDFText(): string {
    return `
STEWART FLEMING PRIMARY SCHOOL
TERM DATES 2025-2026

Autumn Term 2025
INSET Day: Friday 29th August 2025
First day: Monday 1st September 2025
Half term: Monday 20th October - Friday 31st October 2025
INSET Day: Monday 3rd November 2025 (TPA Training)
Last day: Friday 19th December 2025

Spring Term 2026
INSET Day: Monday 5th January 2026
First day: Tuesday 6th January 2026
Half term: Monday 16th February - Friday 20th February 2026
Last day: Friday 27th March 2026

Summer Term 2026
First day: Monday 13th April 2026
May Day: Monday 4th May 2026
Half term: Monday 25th May - Friday 29th May 2026
INSET Day: Monday 1st June 2026
Last day: Tuesday 22nd July 2026

PARENT EVENINGS
Year 1 Parents Evening: Thursday 15th October 2025 at 6:00 PM - School Hall
Year 2 Parents Evening: Tuesday 12th November 2025 at 6:30 PM - School Hall

SPORTS EVENTS
Football Tournament: Saturday 5th October 2025 at 9:00 AM - Sports Field
Swimming Gala: Friday 21st November 2025 at 2:00 PM - Aquatic Centre

SPECIAL EVENTS
Harvest Assembly: Friday 9th October 2025 at 9:30 AM - Main Hall
Christmas Performance: Wednesday 17th December 2025 at 6:00 PM - Main Hall
    `
  }

  /**
   * Extract events from raw text using pattern matching
   */
  private extractEventsFromText(text: string): ExtractedEvent[] {
    const events: ExtractedEvent[] = []
    const lines = text.split('\n').filter(line => line.trim().length > 0)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Skip header lines and very short lines
      if (line.length < 10 || this.isHeaderLine(line)) {
        continue
      }

      // Extract potential events from this line
      const lineEvents = this.extractEventsFromLine(line, i)
      events.push(...lineEvents)
    }

    // Remove duplicates and sort by date
    return this.deduplicateAndSort(events)
  }

  /**
   * Extract events from a single line of text
   */
  private extractEventsFromLine(line: string, lineIndex: number): ExtractedEvent[] {
    const events: ExtractedEvent[] = []

    // Check if line contains event keywords
    const hasEventKeyword = this.eventKeywords.some(keyword =>
      line.toLowerCase().includes(keyword.toLowerCase())
    )

    if (!hasEventKeyword) {
      return events
    }

    // Extract dates from the line
    const dates = this.extractDatesFromLine(line)

    for (const dateInfo of dates) {
      // Extract times from the line
      const times = this.extractTimesFromLine(line)

      // Extract title (part before the date)
      const title = this.extractTitle(line, dateInfo.originalMatch)

      // Extract location
      const location = this.extractLocation(line)

      // Create event for each date/time combination
      if (times.length > 0) {
        for (const timeInfo of times) {
          events.push({
            title: title || 'Imported Event',
            date: dateInfo.date,
            time: timeInfo.time,
            duration: this.estimateDuration(title, timeInfo.time),
            location: location,
            notes: `Imported from PDF (Line ${lineIndex + 1})`,
            confidence: this.calculateConfidence(line, title, dateInfo, timeInfo),
            source: line.trim()
          })
        }
      } else {
        // All-day event
        events.push({
          title: title || 'Imported Event',
          date: dateInfo.date,
          duration: 480, // 8 hours default for all-day events
          location: location,
          notes: `Imported from PDF (Line ${lineIndex + 1})`,
          confidence: this.calculateConfidence(line, title, dateInfo),
          source: line.trim()
        })
      }
    }

    return events
  }

  /**
   * Extract dates from a line of text
   */
  private extractDatesFromLine(line: string): Array<{ date: string; originalMatch: string }> {
    const dates: Array<{ date: string; originalMatch: string }> = []

    for (const pattern of this.datePatterns) {
      let match
      pattern.lastIndex = 0 // Reset regex state

      while ((match = pattern.exec(line)) !== null) {
        const parsedDate = this.parseDate(match)
        if (parsedDate) {
          dates.push({
            date: parsedDate,
            originalMatch: match[0]
          })
        }
      }
    }

    return dates
  }

  /**
   * Extract times from a line of text
   */
  private extractTimesFromLine(line: string): Array<{ time: string; originalMatch: string }> {
    const times: Array<{ time: string; originalMatch: string }> = []

    for (const pattern of this.timePatterns) {
      let match
      pattern.lastIndex = 0 // Reset regex state

      while ((match = pattern.exec(line)) !== null) {
        const parsedTime = this.parseTime(match)
        if (parsedTime) {
          times.push({
            time: parsedTime,
            originalMatch: match[0]
          })
        }
      }
    }

    return times
  }

  /**
   * Parse date from regex match
   */
  private parseDate(match: RegExpExecArray): string | null {
    try {
      let day: number, month: number, year: number

      if (match[0].match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}/)) {
        // DD/MM/YYYY format
        day = parseInt(match[1])
        month = parseInt(match[2]) - 1 // JavaScript months are 0-indexed
        year = parseInt(match[3])
      } else if (match[0].match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
        // DD Month YYYY format
        day = parseInt(match[1])
        const monthStr = match[2].toLowerCase()
        month = this.monthMap[monthStr as keyof typeof this.monthMap]
        year = match[3] ? parseInt(match[3]) : new Date().getFullYear()
      } else if (match[0].match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i)) {
        // Month DD, YYYY format
        const monthStr = match[1].toLowerCase()
        month = this.monthMap[monthStr as keyof typeof this.monthMap]
        day = parseInt(match[2])
        year = parseInt(match[3])
      } else {
        return null
      }

      const date = new Date(year, month, day)
      if (isNaN(date.getTime())) return null

      return date.toISOString().split('T')[0]
    } catch {
      return null
    }
  }

  /**
   * Parse time from regex match
   */
  private parseTime(match: RegExpExecArray): string | null {
    try {
      let hours = parseInt(match[1])
      const minutes = parseInt(match[2])
      const ampm = match[3]?.toLowerCase()

      if (ampm === 'pm' && hours !== 12) {
        hours += 12
      } else if (ampm === 'am' && hours === 12) {
        hours = 0
      }

      const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      return time
    } catch {
      return null
    }
  }

  /**
   * Extract event title from line
   */
  private extractTitle(line: string, dateMatch: string): string {
    // Get text before the date
    const dateIndex = line.indexOf(dateMatch)
    let title = line.substring(0, dateIndex).trim()

    // Clean up title
    title = title.replace(/^[:\-\s]+|[:\-\s]+$/g, '') // Remove leading/trailing punctuation
    title = title.replace(/\s+/g, ' ') // Normalize whitespace

    return title || 'Imported Event'
  }

  /**
   * Extract location from line
   */
  private extractLocation(line: string): string | undefined {
    const locationKeywordFound = this.locationKeywords.find(keyword =>
      line.toLowerCase().includes(keyword.toLowerCase())
    )

    if (locationKeywordFound) {
      // Simple extraction - find text around location keywords
      const regex = new RegExp(`\\b\\w*${locationKeywordFound}\\w*\\b`, 'gi')
      const match = line.match(regex)
      return match?.[0]
    }

    return undefined
  }

  /**
   * Estimate event duration based on title and time
   */
  private estimateDuration(title: string, time?: string): number {
    const titleLower = title.toLowerCase()

    if (titleLower.includes('assembly') || titleLower.includes('meeting')) {
      return 60 // 1 hour
    }
    if (titleLower.includes('lesson') || titleLower.includes('class')) {
      return 45 // 45 minutes
    }
    if (titleLower.includes('performance') || titleLower.includes('concert')) {
      return 120 // 2 hours
    }
    if (titleLower.includes('tournament') || titleLower.includes('gala')) {
      return 180 // 3 hours
    }
    if (titleLower.includes('evening') || titleLower.includes('parent')) {
      return 90 // 1.5 hours
    }

    return 60 // Default 1 hour
  }

  /**
   * Calculate confidence score for extracted event
   */
  private calculateConfidence(
    line: string,
    title: string,
    dateInfo: { date: string; originalMatch: string },
    timeInfo?: { time: string; originalMatch: string }
  ): number {
    let confidence = 0.5 // Base confidence

    // Boost confidence for clear event keywords
    if (this.eventKeywords.some(keyword => title.toLowerCase().includes(keyword))) {
      confidence += 0.2
    }

    // Boost confidence for specific times
    if (timeInfo) {
      confidence += 0.2
    }

    // Boost confidence for location information
    if (this.locationKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
      confidence += 0.1
    }

    // Reduce confidence for very short titles
    if (title.length < 5) {
      confidence -= 0.2
    }

    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Check if line is a header/title line
   */
  private isHeaderLine(line: string): boolean {
    return (
      line.toUpperCase() === line || // All caps
      line.length < 5 || // Very short
      /^\d+$/.test(line.trim()) || // Just numbers
      line.includes('SCHOOL') ||
      line.includes('TERM DATES') ||
      line.includes('CALENDAR')
    )
  }

  /**
   * Remove duplicate events and sort by date
   */
  private deduplicateAndSort(events: ExtractedEvent[]): ExtractedEvent[] {
    // Remove duplicates based on title, date, and time
    const unique = events.filter((event, index, self) =>
      index === self.findIndex(e =>
        e.title === event.title &&
        e.date === event.date &&
        e.time === event.time
      )
    )

    // Sort by date, then by time
    return unique.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare

      const timeA = a.time || '00:00'
      const timeB = b.time || '00:00'
      return timeA.localeCompare(timeB)
    })
  }

  /**
   * Convert extracted events to Family Hub calendar events
   */
  convertToCalendarEvents(
    extractedEvents: ExtractedEvent[],
    defaultPerson: string = 'all'
  ): CalendarEvent[] {
    return extractedEvents.map((extracted, index) => ({
      id: `pdf-import-${Date.now()}-${index}`,
      title: extracted.title,
      person: defaultPerson,
      date: extracted.date,
      time: extracted.time || '09:00',
      duration: extracted.duration || 60,
      location: extracted.location || '',
      type: this.inferEventType(extracted.title),
      notes: extracted.notes || '',
      cost: 0,
      recurring: 'none',
      isRecurring: false,
      priority: 'medium',
      status: 'tentative', // Imported events start as tentative
      reminders: [{
        id: '1',
        type: 'notification',
        time: 15,
        enabled: true
      }],
      attendees: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  }

  /**
   * Infer event type from title
   */
  private inferEventType(title: string): CalendarEvent['type'] {
    const titleLower = title.toLowerCase()

    if (titleLower.includes('inset') || titleLower.includes('term') || titleLower.includes('school')) {
      return 'education'
    }
    if (titleLower.includes('parent') || titleLower.includes('evening')) {
      return 'meeting'
    }
    if (titleLower.includes('sport') || titleLower.includes('football') ||
        titleLower.includes('swimming') || titleLower.includes('tournament')) {
      return 'sport'
    }
    if (titleLower.includes('assembly') || titleLower.includes('performance') ||
        titleLower.includes('concert')) {
      return 'social'
    }
    if (titleLower.includes('appointment') || titleLower.includes('medical')) {
      return 'appointment'
    }

    return 'other'
  }
}

export default new PDFImportService()