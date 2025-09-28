import { CalendarEvent } from '@/types/calendar.types';

// Google Calendar Configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

// OAuth 2.0 Scopes for Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

export interface GoogleCalendarSettings {
  enabled: boolean;
  selectedCalendars: string[];
  syncDirection: 'import' | 'export' | 'both';
  autoSync: boolean;
  syncInterval: number; // minutes
  lastSync?: Date;
  accessToken?: string;
  refreshToken?: string;
}

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  description?: string;
  primary: boolean;
  accessRole: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  recurrence?: string[];
  status: string;
  created: string;
  updated: string;
  etag: string;
}

export interface SyncResult {
  success: boolean;
  imported: number;
  exported: number;
  updated: number;
  errors: string[];
  conflicts: Array<{
    familyHubEvent: CalendarEvent;
    googleEvent: GoogleCalendarEvent;
    conflictType: 'time_mismatch' | 'content_mismatch' | 'deletion_conflict';
  }>;
}

class GoogleCalendarService {
  private accessToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadStoredTokens();
    }
  }

  private async makeApiRequest(endpoint: string, options: RequestInit = {}) {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Calendar');
    }

    const response = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, need to re-authenticate
        this.clearTokens();
        throw new Error('Authentication expired. Please reconnect.');
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate OAuth 2.0 authorization URL
   */
  getAuthUrl(): string {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured');
    }

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{accessToken: string, refreshToken: string}> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokens = await response.json();
      this.accessToken = tokens.access_token;

      await this.storeTokens(tokens);

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  /**
   * Store tokens securely (implement based on your auth system)
   */
  private async storeTokens(tokens: any): Promise<void> {
    // Store in localStorage for now - in production, use secure backend storage
    if (typeof window !== 'undefined') {
      localStorage.setItem('google_calendar_tokens', JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      }));
    }

    // TODO: Store in backend with encryption
    // await api.post('/api/auth/google-calendar/tokens', { tokens });
  }

  /**
   * Load stored tokens
   */
  private loadStoredTokens(): any {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('google_calendar_tokens');
      if (stored) {
        const tokens = JSON.parse(stored);
        this.accessToken = tokens.access_token;
        return tokens;
      }
    }
    return null;
  }

  /**
   * Clear stored tokens
   */
  private clearTokens(): void {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('google_calendar_tokens');
    }
  }

  /**
   * Set credentials from stored tokens
   */
  async setStoredCredentials(): Promise<boolean> {
    const tokens = this.loadStoredTokens();
    if (!tokens) {
      return false;
    }

    // Check if token needs refresh
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      try {
        await this.refreshAccessToken();
        return true;
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.clearTokens();
        return false;
      }
    }

    return true;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    const tokens = this.loadStoredTokens();
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const newTokens = await response.json();
    this.accessToken = newTokens.access_token;

    // Update stored tokens
    const updatedTokens = {
      ...tokens,
      access_token: newTokens.access_token,
      expiry_date: Date.now() + (newTokens.expires_in * 1000)
    };

    await this.storeTokens(updatedTokens);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const tokens = this.loadStoredTokens();
    return !!(tokens?.access_token && this.accessToken);
  }

  /**
   * Get list of user's calendars
   */
  async getCalendarList(): Promise<GoogleCalendarInfo[]> {
    try {
      const isAuth = await this.setStoredCredentials();
      if (!isAuth) {
        throw new Error('Not authenticated with Google Calendar');
      }

      const response = await this.makeApiRequest('/users/me/calendarList');

      return response.items.map((calendar: any) => ({
        id: calendar.id,
        summary: calendar.summary,
        description: calendar.description,
        primary: calendar.primary || false,
        accessRole: calendar.accessRole,
        backgroundColor: calendar.backgroundColor,
        foregroundColor: calendar.foregroundColor
      }));
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      throw new Error('Failed to fetch Google Calendar list');
    }
  }

  /**
   * Import events from Google Calendar
   */
  async importEvents(
    calendarIds: string[],
    timeMin?: Date,
    timeMax?: Date
  ): Promise<CalendarEvent[]> {
    try {
      const isAuth = await this.setStoredCredentials();
      if (!isAuth) {
        throw new Error('Not authenticated with Google Calendar');
      }

      const allEvents: CalendarEvent[] = [];

      for (const calendarId of calendarIds) {
        const params = new URLSearchParams({
          timeMin: timeMin?.toISOString() || new Date().toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '1000'
        });

        if (timeMax) {
          params.append('timeMax', timeMax.toISOString());
        }

        const response = await this.makeApiRequest(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);

        const events = response.items.map((event: GoogleCalendarEvent) =>
          this.convertGoogleEventToFamilyHub(event, calendarId)
        );

        allEvents.push(...events);
      }

      return allEvents;
    } catch (error) {
      console.error('Error importing events:', error);
      throw new Error('Failed to import events from Google Calendar');
    }
  }

  /**
   * Export event to Google Calendar
   */
  async exportEvent(event: CalendarEvent, calendarId: string): Promise<string> {
    try {
      const isAuth = await this.setStoredCredentials();
      if (!isAuth) {
        throw new Error('Not authenticated with Google Calendar');
      }

      const googleEvent = this.convertFamilyHubEventToGoogle(event);

      const response = await this.makeApiRequest(`/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        body: JSON.stringify(googleEvent)
      });

      return response.id;
    } catch (error) {
      console.error('Error exporting event:', error);
      throw new Error('Failed to export event to Google Calendar');
    }
  }

  /**
   * Update event in Google Calendar
   */
  async updateEvent(
    event: CalendarEvent,
    calendarId: string,
    googleEventId: string
  ): Promise<void> {
    try {
      const isAuth = await this.setStoredCredentials();
      if (!isAuth) {
        throw new Error('Not authenticated with Google Calendar');
      }

      const googleEvent = this.convertFamilyHubEventToGoogle(event);

      await this.makeApiRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`, {
        method: 'PUT',
        body: JSON.stringify(googleEvent)
      });
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event in Google Calendar');
    }
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEvent(calendarId: string, googleEventId: string): Promise<void> {
    try {
      const isAuth = await this.setStoredCredentials();
      if (!isAuth) {
        throw new Error('Not authenticated with Google Calendar');
      }

      await this.makeApiRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event from Google Calendar');
    }
  }

  /**
   * Perform bi-directional sync with conflict resolution
   */
  async syncCalendars(
    familyHubEvents: CalendarEvent[],
    settings: GoogleCalendarSettings
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      imported: 0,
      exported: 0,
      updated: 0,
      errors: [],
      conflicts: []
    };

    try {
      const isAuth = await this.setStoredCredentials();
      if (!isAuth) {
        throw new Error('Not authenticated with Google Calendar');
      }

      // Step 1: Get Google Calendar events for comparison
      let googleEvents: CalendarEvent[] = [];
      if (settings.syncDirection === 'import' || settings.syncDirection === 'both') {
        googleEvents = await this.importEvents(
          settings.selectedCalendars,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)  // 90 days ahead
        );
      }

      // Step 2: Detect conflicts and resolve them
      if (settings.syncDirection === 'both') {
        await this.resolveConflicts(familyHubEvents, googleEvents, result, settings);
      }

      // Step 3: Import new events from Google (only events not in Family Hub)
      if (settings.syncDirection === 'import' || settings.syncDirection === 'both') {
        const newGoogleEvents = googleEvents.filter(gEvent =>
          !familyHubEvents.find(fEvent => fEvent.googleEventId === gEvent.googleEventId)
        );
        result.imported = newGoogleEvents.length;
      }

      // Step 4: Export new Family Hub events to Google
      if (settings.syncDirection === 'export' || settings.syncDirection === 'both') {
        for (const event of familyHubEvents) {
          if (!event.googleEventId && settings.selectedCalendars.length > 0) {
            try {
              const googleEventId = await this.exportEvent(event, settings.selectedCalendars[0]);
              event.googleEventId = googleEventId;
              result.exported++;
            } catch (error) {
              result.errors.push(`Failed to export event "${event.title}": ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
      }

      // Step 5: Update last sync time
      settings.lastSync = new Date();

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      return result;
    }
  }

  /**
   * Resolve conflicts between Family Hub and Google Calendar events
   */
  private async resolveConflicts(
    familyHubEvents: CalendarEvent[],
    googleEvents: CalendarEvent[],
    result: SyncResult,
    settings: GoogleCalendarSettings
  ): Promise<void> {
    for (const fEvent of familyHubEvents) {
      if (!fEvent.googleEventId) continue;

      const gEvent = googleEvents.find(g => g.googleEventId === fEvent.googleEventId);
      if (!gEvent) {
        // Event deleted in Google Calendar
        result.conflicts.push({
          familyHubEvent: fEvent,
          googleEvent: null as any,
          conflictType: 'deletion_conflict'
        });
        continue;
      }

      // Check for content conflicts
      const hasTimeConflict =
        fEvent.date !== gEvent.date ||
        fEvent.time !== gEvent.time ||
        fEvent.duration !== gEvent.duration;

      const hasContentConflict =
        fEvent.title !== gEvent.title ||
        fEvent.location !== gEvent.location ||
        fEvent.notes !== gEvent.notes;

      if (hasTimeConflict) {
        result.conflicts.push({
          familyHubEvent: fEvent,
          googleEvent: gEvent as any, // TODO: Fix type mismatch - should store original Google event
          conflictType: 'time_mismatch'
        });

        // Auto-resolve: Google Calendar takes precedence for time conflicts
        try {
          if (fEvent.updatedAt && gEvent.updatedAt && new Date(gEvent.updatedAt) > new Date(fEvent.updatedAt)) {
            // Google event is newer, update Family Hub event
            await this.updateFamilyHubFromGoogle(fEvent, gEvent);
            result.updated++;
          } else {
            // Family Hub event is newer, update Google event
            await this.updateEvent(fEvent, settings.selectedCalendars[0], fEvent.googleEventId!);
            result.updated++;
          }
        } catch (error) {
          result.errors.push(`Failed to resolve time conflict for "${fEvent.title}": ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (hasContentConflict && !hasTimeConflict) {
        result.conflicts.push({
          familyHubEvent: fEvent,
          googleEvent: gEvent as any, // TODO: Fix type mismatch - should store original Google event
          conflictType: 'content_mismatch'
        });

        // Auto-resolve: Most recently updated takes precedence
        try {
          if (fEvent.updatedAt && gEvent.updatedAt && new Date(gEvent.updatedAt) > new Date(fEvent.updatedAt)) {
            await this.updateFamilyHubFromGoogle(fEvent, gEvent);
            result.updated++;
          } else {
            await this.updateEvent(fEvent, settings.selectedCalendars[0], fEvent.googleEventId!);
            result.updated++;
          }
        } catch (error) {
          result.errors.push(`Failed to resolve content conflict for "${fEvent.title}": ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  /**
   * Update Family Hub event from Google Calendar event
   */
  private async updateFamilyHubFromGoogle(
    familyHubEvent: CalendarEvent,
    googleEvent: CalendarEvent
  ): Promise<void> {
    // Update the Family Hub event with Google Calendar data
    // Note: This would need to be handled by the parent component
    // For now, we'll just log the update that should happen
    console.log('Should update Family Hub event:', familyHubEvent.id, 'with Google data:', googleEvent);
  }

  /**
   * Convert Google Calendar event to Family Hub format
   */
  private convertGoogleEventToFamilyHub(
    googleEvent: GoogleCalendarEvent,
    calendarId: string
  ): CalendarEvent {
    const startDate = googleEvent.start.dateTime || googleEvent.start.date;
    const endDate = googleEvent.end.dateTime || googleEvent.end.date;

    if (!startDate || !endDate) {
      throw new Error('Invalid date range in Google Calendar event');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    return {
      id: `google-${googleEvent.id}`,
      title: googleEvent.summary || 'Untitled Event',
      person: 'all', // Default assignment - could be smarter based on attendees
      date: start.toISOString().split('T')[0],
      time: start.toTimeString().slice(0, 5),
      duration: Math.max(15, duration),
      location: googleEvent.location || '',
      type: this.inferEventType(googleEvent.summary || ''),
      notes: googleEvent.description || '',
      cost: 0,
      recurring: googleEvent.recurrence ? 'weekly' : 'none',
      isRecurring: !!googleEvent.recurrence,
      priority: 'medium',
      status: googleEvent.status === 'confirmed' ? 'confirmed' : 'tentative',
      googleEventId: googleEvent.id,
      reminders: this.convertGoogleReminders(googleEvent.reminders),
      attendees: googleEvent.attendees?.map(a => a.email) || [],
      createdAt: new Date(googleEvent.created),
      updatedAt: new Date(googleEvent.updated)
    };
  }

  /**
   * Convert Family Hub event to Google Calendar format
   */
  private convertFamilyHubEventToGoogle(event: CalendarEvent): any {
    const startDateTime = new Date(`${event.date}T${event.time}`);
    const endDateTime = new Date(startDateTime.getTime() + event.duration * 60 * 1000);

    return {
      summary: event.title,
      description: event.notes || '',
      location: event.location || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Europe/London'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Europe/London'
      },
      reminders: {
        useDefault: false,
        overrides: event.reminders?.filter(r => r.enabled).map(r => ({
          method: r.type === 'email' ? 'email' : 'popup',
          minutes: r.time
        })) || []
      },
      status: event.status === 'confirmed' ? 'confirmed' : 'tentative'
    };
  }

  /**
   * Convert Google reminders to Family Hub format
   */
  private convertGoogleReminders(googleReminders: any): any[] {
    if (!googleReminders?.overrides) {
      return [{ id: '1', type: 'notification', time: 15, enabled: true }];
    }

    return googleReminders.overrides.map((reminder: any, index: number) => ({
      id: (index + 1).toString(),
      type: reminder.method === 'email' ? 'email' : 'notification',
      time: reminder.minutes,
      enabled: true
    }));
  }

  /**
   * Infer event type from title (simple heuristic)
   */
  private inferEventType(title: string): CalendarEvent['type'] {
    const lower = title.toLowerCase();

    if (lower.includes('doctor') || lower.includes('dentist') || lower.includes('medical')) {
      return 'appointment';
    }
    if (lower.includes('meeting') || lower.includes('call') || lower.includes('conference')) {
      return 'meeting';
    }
    if (lower.includes('sport') || lower.includes('football') || lower.includes('swim')) {
      return 'sport';
    }
    if (lower.includes('school') || lower.includes('class') || lower.includes('lesson')) {
      return 'education';
    }
    if (lower.includes('birthday') || lower.includes('party') || lower.includes('social')) {
      return 'social';
    }
    if (lower.includes('family') || lower.includes('dinner') || lower.includes('visit')) {
      return 'family';
    }

    return 'other';
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(): Promise<void> {
    try {
      // Revoke tokens if we have an access token
      if (this.accessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${this.accessToken}`, {
            method: 'POST'
          });
        } catch (error) {
          // Ignore revocation errors as the token might already be invalid
          console.warn('Token revocation failed:', error);
        }
      }

      // Clear stored tokens
      this.clearTokens();
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      throw new Error('Failed to disconnect Google Calendar');
    }
  }
}

export default new GoogleCalendarService();