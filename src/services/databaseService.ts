// Database Service - Handles all database operations and syncs with localStorage
import { CalendarEvent, Person } from '@/types/calendar.types';

const API_BASE = '/api/families';

class DatabaseService {
  private familyId: string | null = null;
  private syncEnabled = true;

  async initialize() {
    try {
      // Get or create family
      const families = await this.fetchAPI('/families');
      if (families && families.length > 0) {
        this.familyId = families[0].id;
        localStorage.setItem('familyId', this.familyId);
        console.log('Database connected: Family ID', this.familyId);

        // Sync initial data from database
        await this.syncFromDatabase();
        return true;
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
      console.log('Falling back to localStorage only');
      this.syncEnabled = false;
      return false;
    }
  }

  private async fetchAPI(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Sync data from database to localStorage
  async syncFromDatabase() {
    if (!this.familyId || !this.syncEnabled) return;

    try {
      // Fetch family members
      const members = await this.fetchAPI(`${API_BASE}/${this.familyId}/members`);
      if (members) {
        localStorage.setItem('familyMembers', JSON.stringify(members));
      }

      // Fetch calendar events
      const events = await this.fetchAPI(`${API_BASE}/${this.familyId}/events`);
      if (events) {
        // Convert database events to app format
        const formattedEvents = events.map((e: any) => {
          // Extract time from eventTime DateTime
          const eventTime = new Date(e.eventTime);
          const hours = eventTime.getUTCHours().toString().padStart(2, '0');
          const minutes = eventTime.getUTCMinutes().toString().padStart(2, '0');

          return {
            id: e.id,
            title: e.title,
            person: e.personId,
            date: e.eventDate.split('T')[0],
            time: `${hours}:${minutes}`,
            duration: e.durationMinutes,
            location: e.location,
            recurring: e.recurringPattern,
            cost: e.cost,
            type: e.eventType,
            notes: e.notes,
            isRecurring: e.isRecurring,
            priority: 'medium',
            status: 'confirmed',
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          };
        });
        localStorage.setItem('calendarEvents', JSON.stringify(formattedEvents));
      }

      console.log('Data synced from database');
    } catch (error) {
      console.error('Sync from database failed:', error);
    }
  }

  // Save event to database
  async saveEvent(event: CalendarEvent): Promise<CalendarEvent | null> {
    if (!this.familyId || !this.syncEnabled) {
      // Just save to localStorage
      const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
      events.push(event);
      localStorage.setItem('calendarEvents', JSON.stringify(events));
      return event;
    }

    try {
      const dbEvent = await this.fetchAPI(`${API_BASE}/${this.familyId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          personId: event.person,
          title: event.title,
          description: '',
          eventDate: event.date,
          eventTime: event.time,
          durationMinutes: event.duration,
          location: event.location,
          cost: event.cost,
          eventType: event.type,
          recurringPattern: event.recurring,
          isRecurring: event.isRecurring,
          notes: event.notes,
        }),
      });

      if (dbEvent) {
        // Update localStorage as well
        const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
        events.push(event);
        localStorage.setItem('calendarEvents', JSON.stringify(events));
        return event;
      }
    } catch (error) {
      console.error('Failed to save event to database:', error);
      // Fall back to localStorage
      const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
      events.push(event);
      localStorage.setItem('calendarEvents', JSON.stringify(events));
      return event;
    }

    return null;
  }

  // Update event in database
  async updateEvent(id: string, event: Partial<CalendarEvent>): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      // Just update localStorage
      const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
      const index = events.findIndex((e: any) => e.id === id);
      if (index !== -1) {
        events[index] = { ...events[index], ...event };
        localStorage.setItem('calendarEvents', JSON.stringify(events));
        return true;
      }
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/events`, {
        method: 'PUT',
        body: JSON.stringify({
          id,
          ...event,
        }),
      });

      // Update localStorage as well
      const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
      const index = events.findIndex((e: any) => e.id === id);
      if (index !== -1) {
        events[index] = { ...events[index], ...event };
        localStorage.setItem('calendarEvents', JSON.stringify(events));
      }
      return true;
    } catch (error) {
      console.error('Failed to update event in database:', error);
      return false;
    }
  }

  // Delete event from database
  async deleteEvent(id: string): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      // Just delete from localStorage
      const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
      const filtered = events.filter((e: any) => e.id !== id);
      localStorage.setItem('calendarEvents', JSON.stringify(filtered));
      return true;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/events?id=${id}`, {
        method: 'DELETE',
      });

      // Update localStorage as well
      const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
      const filtered = events.filter((e: any) => e.id !== id);
      localStorage.setItem('calendarEvents', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to delete event from database:', error);
      return false;
    }
  }

  // Save family member to database
  async saveMember(member: Person): Promise<Person | null> {
    if (!this.familyId || !this.syncEnabled) {
      // Just save to localStorage
      const members = JSON.parse(localStorage.getItem('familyMembers') || '[]');
      members.push(member);
      localStorage.setItem('familyMembers', JSON.stringify(members));
      return member;
    }

    try {
      const dbMember = await this.fetchAPI(`${API_BASE}/${this.familyId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          name: member.name,
          role: member.role || 'Family Member',
          ageGroup: member.age || 'Adult',
          color: member.color,
          icon: member.icon,
          fitnessGoals: member.fitnessGoals || {},
        }),
      });

      if (dbMember) {
        // Update localStorage as well
        const members = JSON.parse(localStorage.getItem('familyMembers') || '[]');
        members.push({
          ...member,
          id: dbMember.id,
        });
        localStorage.setItem('familyMembers', JSON.stringify(members));
        return { ...member, id: dbMember.id };
      }
    } catch (error) {
      console.error('Failed to save member to database:', error);
      // Fall back to localStorage
      const members = JSON.parse(localStorage.getItem('familyMembers') || '[]');
      members.push(member);
      localStorage.setItem('familyMembers', JSON.stringify(members));
      return member;
    }

    return null;
  }

  // Check if database is connected
  isConnected(): boolean {
    return this.syncEnabled && this.familyId !== null;
  }

  // Get connection status
  getStatus(): { connected: boolean; familyId: string | null; mode: string } {
    return {
      connected: this.isConnected(),
      familyId: this.familyId,
      mode: this.syncEnabled ? 'database' : 'localStorage',
    };
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;