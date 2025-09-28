import { CalendarEvent } from '@/types/calendar.types'

export interface CSVColumn {
  index: number
  name: string
  sample: string
  mappedTo?: keyof CSVEventData | 'ignore'
}

export interface CSVEventData {
  title: string
  date: string
  time?: string
  duration?: number
  location?: string
  person?: string
  type?: string
  notes?: string
  cost?: number
  priority?: string
  status?: string
}

export interface CSVParseResult {
  success: boolean
  columns: CSVColumn[]
  rows: string[][]
  events: CSVEventData[]
  errors: string[]
  warnings: string[]
  totalRows: number
  validRows: number
}

export interface CSVImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  events: CalendarEvent[]
}

class CSVImportService {
  private dateFormats = [
    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/,
    // YYYY-MM-DD, YYYY/MM/DD
    /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
    // DD Month YYYY, DD Month
    /^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i,
    // Month DD, YYYY
    /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/i
  ]

  private timeFormats = [
    // HH:MM AM/PM, HH:MM
    /^\d{1,2}:\d{2}\s*(AM|PM|am|pm)?$/,
    // HH.MM AM/PM, HH.MM
    /^\d{1,2}\.\d{2}\s*(AM|PM|am|pm)?$/
  ]

  private eventTypes = [
    'sport', 'meeting', 'fitness', 'social', 'education',
    'family', 'other', 'appointment', 'work', 'personal'
  ]

  private priorities = ['low', 'medium', 'high']
  private statuses = ['tentative', 'confirmed', 'cancelled']

  /**
   * Parse CSV file content into structured data
   */
  async parseCSVFile(file: File): Promise<CSVParseResult> {
    const result: CSVParseResult = {
      success: false,
      columns: [],
      rows: [],
      events: [],
      errors: [],
      warnings: [],
      totalRows: 0,
      validRows: 0
    }

    try {
      const content = await this.readFileContent(file)
      const rows = this.parseCSVContent(content)

      if (rows.length === 0) {
        result.errors.push('CSV file is empty')
        return result
      }

      // Extract columns from first row (headers)
      const headers = rows[0]
      result.columns = headers.map((header, index) => ({
        index,
        name: header.trim(),
        sample: rows[1]?.[index]?.trim() || '',
        mappedTo: this.suggestColumnMapping(header.trim(), rows[1]?.[index]?.trim() || '')
      }))

      // Parse data rows
      const dataRows = rows.slice(1)
      result.rows = dataRows
      result.totalRows = dataRows.length

      result.success = true
      return result

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error parsing CSV')
      return result
    }
  }

  /**
   * Read file content as text
   */
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Parse CSV content into rows and columns
   */
  private parseCSVContent(content: string): string[][] {
    const rows: string[][] = []
    const lines = content.split(/\r?\n/)

    for (const line of lines) {
      if (line.trim() === '') continue

      // Simple CSV parsing - handles basic comma separation
      // For production, consider using a proper CSV parsing library
      const row = this.parseCSVLine(line)
      if (row.length > 0) {
        rows.push(row)
      }
    }

    return rows
  }

  /**
   * Parse a single CSV line, handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    // Add the last field
    result.push(current.trim())

    return result
  }

  /**
   * Suggest column mapping based on header name and sample data
   */
  private suggestColumnMapping(header: string, sample: string): keyof CSVEventData | 'ignore' {
    const headerLower = header.toLowerCase()

    // Title/Subject/Name mappings
    if (headerLower.includes('title') || headerLower.includes('subject') ||
        headerLower.includes('name') || headerLower.includes('event')) {
      return 'title'
    }

    // Date mappings
    if (headerLower.includes('date') || headerLower.includes('when') ||
        headerLower.includes('day')) {
      return 'date'
    }

    // Time mappings
    if (headerLower.includes('time') || headerLower.includes('start') ||
        headerLower.includes('begin')) {
      return 'time'
    }

    // Duration mappings
    if (headerLower.includes('duration') || headerLower.includes('length') ||
        headerLower.includes('minutes') || headerLower.includes('hours')) {
      return 'duration'
    }

    // Location mappings
    if (headerLower.includes('location') || headerLower.includes('venue') ||
        headerLower.includes('place') || headerLower.includes('where')) {
      return 'location'
    }

    // Person mappings
    if (headerLower.includes('person') || headerLower.includes('who') ||
        headerLower.includes('assigned') || headerLower.includes('member')) {
      return 'person'
    }

    // Type/Category mappings
    if (headerLower.includes('type') || headerLower.includes('category') ||
        headerLower.includes('kind')) {
      return 'type'
    }

    // Notes/Description mappings
    if (headerLower.includes('notes') || headerLower.includes('description') ||
        headerLower.includes('details') || headerLower.includes('comment')) {
      return 'notes'
    }

    // Cost mappings
    if (headerLower.includes('cost') || headerLower.includes('price') ||
        headerLower.includes('fee') || headerLower.includes('amount')) {
      return 'cost'
    }

    // Priority mappings
    if (headerLower.includes('priority') || headerLower.includes('importance')) {
      return 'priority'
    }

    // Status mappings
    if (headerLower.includes('status') || headerLower.includes('state')) {
      return 'status'
    }

    // Check sample data for patterns
    if (sample) {
      if (this.looksLikeDate(sample)) return 'date'
      if (this.looksLikeTime(sample)) return 'time'
      if (this.looksLikeNumber(sample)) return 'duration'
    }

    return 'ignore'
  }

  /**
   * Check if value looks like a date
   */
  private looksLikeDate(value: string): boolean {
    return this.dateFormats.some(format => format.test(value.trim()))
  }

  /**
   * Check if value looks like a time
   */
  private looksLikeTime(value: string): boolean {
    return this.timeFormats.some(format => format.test(value.trim()))
  }

  /**
   * Check if value looks like a number
   */
  private looksLikeNumber(value: string): boolean {
    return /^\d+(\.\d+)?$/.test(value.trim())
  }

  /**
   * Process CSV data with column mappings to create events
   */
  processCSVData(
    rows: string[][],
    columns: CSVColumn[],
    defaultPerson: string = 'all'
  ): CSVParseResult {
    const result: CSVParseResult = {
      success: true,
      columns,
      rows,
      events: [],
      errors: [],
      warnings: [],
      totalRows: rows.length,
      validRows: 0
    }

    // Create mapping index
    const mapping: Record<keyof CSVEventData, number> = {} as any
    columns.forEach(col => {
      if (col.mappedTo && col.mappedTo !== 'ignore') {
        mapping[col.mappedTo] = col.index
      }
    })

    // Check required fields
    if (mapping.title === undefined) {
      result.errors.push('Title column is required')
    }
    if (mapping.date === undefined) {
      result.errors.push('Date column is required')
    }

    if (result.errors.length > 0) {
      result.success = false
      return result
    }

    // Process each row
    rows.forEach((row, index) => {
      try {
        const event = this.processRow(row, mapping, defaultPerson)
        if (event) {
          result.events.push(event)
          result.validRows++
        }
      } catch (error) {
        result.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })

    result.success = result.errors.length === 0
    return result
  }

  /**
   * Process a single row into an event
   */
  private processRow(
    row: string[],
    mapping: Record<keyof CSVEventData, number>,
    defaultPerson: string
  ): CSVEventData | null {
    const event: Partial<CSVEventData> = {}

    // Extract title (required)
    const title = row[mapping.title]?.trim()
    if (!title) {
      throw new Error('Title is required')
    }
    event.title = title

    // Extract date (required)
    const dateStr = row[mapping.date]?.trim()
    if (!dateStr) {
      throw new Error('Date is required')
    }

    const parsedDate = this.parseDate(dateStr)
    if (!parsedDate) {
      throw new Error(`Invalid date format: ${dateStr}`)
    }
    event.date = parsedDate

    // Extract optional fields
    if (mapping.time !== undefined) {
      const timeStr = row[mapping.time]?.trim()
      if (timeStr) {
        const parsedTime = this.parseTime(timeStr)
        if (parsedTime) {
          event.time = parsedTime
        }
      }
    }

    if (mapping.duration !== undefined) {
      const durationStr = row[mapping.duration]?.trim()
      if (durationStr) {
        const duration = this.parseDuration(durationStr)
        if (duration) {
          event.duration = duration
        }
      }
    }

    if (mapping.location !== undefined) {
      event.location = row[mapping.location]?.trim() || undefined
    }

    if (mapping.person !== undefined) {
      event.person = row[mapping.person]?.trim() || defaultPerson
    } else {
      event.person = defaultPerson
    }

    if (mapping.type !== undefined) {
      const type = row[mapping.type]?.trim().toLowerCase()
      if (type && this.eventTypes.includes(type)) {
        event.type = type
      }
    }

    if (mapping.notes !== undefined) {
      event.notes = row[mapping.notes]?.trim() || undefined
    }

    if (mapping.cost !== undefined) {
      const costStr = row[mapping.cost]?.trim()
      if (costStr) {
        const cost = this.parseCost(costStr)
        if (cost !== null) {
          event.cost = cost
        }
      }
    }

    if (mapping.priority !== undefined) {
      const priority = row[mapping.priority]?.trim().toLowerCase()
      if (priority && this.priorities.includes(priority)) {
        event.priority = priority
      }
    }

    if (mapping.status !== undefined) {
      const status = row[mapping.status]?.trim().toLowerCase()
      if (status && this.statuses.includes(status)) {
        event.status = status
      }
    }

    return event as CSVEventData
  }

  /**
   * Parse date string to YYYY-MM-DD format
   */
  private parseDate(dateStr: string): string | null {
    try {
      // Try different date formats
      let date: Date | null = null

      // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
      const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
      if (dmyMatch) {
        const [, day, month, year] = dmyMatch
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }

      // YYYY-MM-DD, YYYY/MM/DD
      const ymdMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
      if (ymdMatch) {
        const [, year, month, day] = ymdMatch
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }

      // Try native Date parsing as fallback
      if (!date) {
        date = new Date(dateStr)
      }

      if (isNaN(date.getTime())) {
        return null
      }

      return date.toISOString().split('T')[0]
    } catch {
      return null
    }
  }

  /**
   * Parse time string to HH:MM format
   */
  private parseTime(timeStr: string): string | null {
    try {
      const timeMatch = timeStr.match(/^(\d{1,2})[:\.](\d{2})\s*(AM|PM|am|pm)?$/)
      if (!timeMatch) return null

      let hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2])
      const ampm = timeMatch[3]?.toLowerCase()

      if (ampm === 'pm' && hours !== 12) {
        hours += 12
      } else if (ampm === 'am' && hours === 12) {
        hours = 0
      }

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    } catch {
      return null
    }
  }

  /**
   * Parse duration from various formats
   */
  private parseDuration(durationStr: string): number | null {
    try {
      // Just a number (assume minutes)
      if (/^\d+$/.test(durationStr)) {
        return parseInt(durationStr)
      }

      // Number with "min" or "minutes"
      const minMatch = durationStr.match(/^(\d+)\s*(min|minutes?)$/i)
      if (minMatch) {
        return parseInt(minMatch[1])
      }

      // Number with "h" or "hours"
      const hourMatch = durationStr.match(/^(\d+)\s*(h|hours?)$/i)
      if (hourMatch) {
        return parseInt(hourMatch[1]) * 60
      }

      // "X hours Y minutes" format
      const fullMatch = durationStr.match(/^(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:utes?)?)?$/i)
      if (fullMatch) {
        return parseInt(fullMatch[1]) * 60 + parseInt(fullMatch[2])
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Parse cost from string
   */
  private parseCost(costStr: string): number | null {
    try {
      // Remove currency symbols and parse
      const cleaned = costStr.replace(/[£$€,]/g, '').trim()
      const cost = parseFloat(cleaned)
      return isNaN(cost) ? null : cost
    } catch {
      return null
    }
  }

  /**
   * Convert CSV events to Family Hub calendar events
   */
  convertToCalendarEvents(csvEvents: CSVEventData[]): CalendarEvent[] {
    return csvEvents.map((csvEvent, index) => ({
      id: `csv-import-${Date.now()}-${index}`,
      title: csvEvent.title,
      person: csvEvent.person || 'all',
      date: csvEvent.date,
      time: csvEvent.time || '09:00',
      duration: csvEvent.duration || 60,
      location: csvEvent.location || '',
      type: (csvEvent.type as CalendarEvent['type']) || 'other',
      notes: csvEvent.notes || '',
      cost: csvEvent.cost || 0,
      recurring: 'none',
      isRecurring: false,
      priority: (csvEvent.priority as CalendarEvent['priority']) || 'medium',
      status: (csvEvent.status as CalendarEvent['status']) || 'tentative',
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
   * Generate sample CSV content for user reference
   */
  generateSampleCSV(): string {
    const headers = [
      'Title',
      'Date',
      'Time',
      'Duration',
      'Location',
      'Person',
      'Type',
      'Notes',
      'Cost',
      'Priority'
    ]

    const sampleRows = [
      [
        'Swimming Lesson',
        '2025-09-25',
        '10:00',
        '45',
        'Aquatic Centre',
        'amari',
        'sport',
        'Bring swimming kit',
        '15.00',
        'medium'
      ],
      [
        'Parent Evening',
        '2025-10-15',
        '18:30',
        '90',
        'School Hall',
        'all',
        'meeting',
        'Year 2 parent evening',
        '0',
        'high'
      ],
      [
        'Birthday Party',
        '2025-10-20',
        '14:00',
        '180',
        'Community Centre',
        'amari',
        'social',
        "Maya's birthday party",
        '25.00',
        'medium'
      ]
    ]

    const csvLines = [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ]

    return csvLines.join('\n')
  }
}

export default new CSVImportService()