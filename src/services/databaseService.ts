// Database Service - Handles all database operations and syncs with localStorage
import { CalendarEvent, Person } from '@/types/calendar.types';

const API_BASE = '/api/families';

class DatabaseService {
  private familyId: string | null = null;
  private syncEnabled = true;

  async initialize() {
    try {
      // Get or create family with timeout
      const families = await Promise.race([
        this.fetchAPI('/api/families'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database initialization timeout')), 5000)
        )
      ]);
      console.log('Fetched families:', families);

      if (families && families.length > 0) {
        this.familyId = families[0].id;
        if (this.familyId && typeof window !== 'undefined') {
          localStorage.setItem('familyId', this.familyId);
        }
        console.log('Database connected: Family ID', this.familyId);

        // Store family members in localStorage
        if (families[0].members && typeof window !== 'undefined') {
          localStorage.setItem('familyMembers', JSON.stringify(families[0].members));
        }

        // Sync initial data from database with timeout
        try {
          await Promise.race([
            this.syncFromDatabase(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Database sync timeout')), 3000)
            )
          ]);
        } catch (syncError) {
          console.warn('Database sync failed, continuing with localStorage:', syncError);
        }

        this.syncEnabled = true;
        return true;
      } else {
        console.log('No families found in database');
        this.syncEnabled = false;
        return false;
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
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('API request timed out:', endpoint);
        throw new Error(`Request timeout: ${endpoint}`);
      }
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
      if (members && typeof window !== 'undefined') {
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('calendarEvents', JSON.stringify(formattedEvents));
        }
      }

      console.log('Data synced from database');
    } catch (error) {
      console.error('Sync from database failed:', error);
    }
  }

  // Save event to database
  async saveEvent(event: CalendarEvent): Promise<CalendarEvent | null> {
    console.log('saveEvent called with:', event);
    console.log('Database status:', { familyId: this.familyId, syncEnabled: this.syncEnabled });

    if (!this.familyId || !this.syncEnabled) {
      console.log('No database connection, saving to localStorage only');
      // Just save to localStorage
      if (typeof window !== 'undefined') {
        const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
        events.push(event);
        localStorage.setItem('calendarEvents', JSON.stringify(events));
      }
      return event;
    }

    console.log('Attempting to save to database with familyId:', this.familyId);
    try {
      // Combine date and time into ISO 8601 DateTime format
      const eventDateTime = new Date(`${event.date}T${event.time}`).toISOString();
      
      const dbEvent = await this.fetchAPI(`${API_BASE}/${this.familyId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          personId: event.person,
          title: event.title,
          description: '',
          eventDateTime: eventDateTime,
          durationMinutes: event.duration || 60,
          location: event.location || '',
          cost: event.cost || 0,
          eventType: event.type || 'other',
          recurringPattern: event.recurring || 'none',
          isRecurring: event.isRecurring || false,
          notes: event.notes || '',
        }),
      });

      if (dbEvent && dbEvent.id) {
        console.log('Event saved to database successfully:', dbEvent);

        // Create the event in the app format with the database ID
        const savedEvent = {
          ...event,
          id: dbEvent.id,
          createdAt: dbEvent.createdAt,
          updatedAt: dbEvent.updatedAt,
        };

        // Update localStorage as well
        if (typeof window !== 'undefined') {
          const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
          events.push(savedEvent);
          localStorage.setItem('calendarEvents', JSON.stringify(events));
        }
        return savedEvent;
      } else {
        console.warn('Database returned no event, falling back to localStorage');
        if (typeof window !== 'undefined') {
          const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
          events.push(event);
          localStorage.setItem('calendarEvents', JSON.stringify(events));
        }
        return event;
      }
    } catch (error) {
      console.error('Failed to save event to database:', error);
      // Fall back to localStorage
      if (typeof window !== 'undefined') {
        const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
        events.push(event);
        localStorage.setItem('calendarEvents', JSON.stringify(events));
      }
      return event;
    }
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
      // Map UI fields to API/Prisma fields
      const eventData: any = { ...event };

      // Ensure dates are properly formatted
      if (eventData.date) {
        eventData.eventDate = eventData.date;
        delete eventData.date;
      }
      if (eventData.time) {
        eventData.eventTime = eventData.time;
        delete eventData.time;
      }
      if (eventData.person) {
        eventData.personId = eventData.person;
        delete eventData.person;
      }

      await this.fetchAPI(`${API_BASE}/${this.familyId}/events`, {
        method: 'PUT',
        body: JSON.stringify({
          id,
          ...eventData,
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
      const memberData: any = member;
      const dbMember = await this.fetchAPI(`${API_BASE}/${this.familyId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          name: memberData.name,
          role: memberData.role || 'Family Member',
          ageGroup: memberData.age || 'Adult',
          color: memberData.color,
          icon: memberData.icon,
          fitnessGoals: memberData.fitnessGoals || {},
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

  // Save goal to database
  async saveGoal(goal: any): Promise<any | null> {
    if (!this.familyId || !this.syncEnabled) {
      // Just save to localStorage
      if (typeof window !== 'undefined') {
        const goals = JSON.parse(localStorage.getItem('familyGoals') || '[]');
        goals.push(goal);
        localStorage.setItem('familyGoals', JSON.stringify(goals));
      }
      return goal;
    }

    try {
      const dbGoal = await this.fetchAPI(`${API_BASE}/${this.familyId}/goals`, {
        method: 'POST',
        body: JSON.stringify({
          title: goal.title,
          description: goal.description,
          type: goal.type,
          targetValue: goal.targetValue || '',
          deadline: goal.deadline,
          participants: goal.participants || [],
          milestones: goal.milestones || [],
        }),
      });

      if (dbGoal && dbGoal.id) {
        console.log('Goal saved to database successfully:', dbGoal);

        // Update localStorage as well
        if (typeof window !== 'undefined') {
          const goals = JSON.parse(localStorage.getItem('familyGoals') || '[]');
          goals.push({ ...goal, id: dbGoal.id });
          localStorage.setItem('familyGoals', JSON.stringify(goals));
        }
        return { ...goal, id: dbGoal.id };
      }
    } catch (error) {
      console.error('Failed to save goal to database:', error);
      // Fall back to localStorage
      if (typeof window !== 'undefined') {
        const goals = JSON.parse(localStorage.getItem('familyGoals') || '[]');
        goals.push(goal);
        localStorage.setItem('familyGoals', JSON.stringify(goals));
      }
    }
    return goal;
  }

  // Save budget income to database
  async saveBudgetIncome(income: any): Promise<any | null> {
    if (!this.familyId || !this.syncEnabled) {
      // Just save to localStorage
      if (typeof window !== 'undefined') {
        const incomes = JSON.parse(localStorage.getItem('budgetIncome') || '[]');
        incomes.push(income);
        localStorage.setItem('budgetIncome', JSON.stringify(incomes));
      }
      return income;
    }

    try {
      const dbIncome = await this.fetchAPI(`${API_BASE}/${this.familyId}/budget/income`, {
        method: 'POST',
        body: JSON.stringify({
          incomeName: income.incomeName,
          amount: income.amount,
          category: income.category,
          isRecurring: income.isRecurring,
          paymentDate: income.paymentDate,
          personId: income.personId,
        }),
      });

      if (dbIncome && dbIncome.id) {
        console.log('Income saved to database successfully:', dbIncome);

        // Update localStorage as well
        if (typeof window !== 'undefined') {
          const incomes = JSON.parse(localStorage.getItem('budgetIncome') || '[]');
          incomes.push({ ...income, id: dbIncome.id });
          localStorage.setItem('budgetIncome', JSON.stringify(incomes));
        }
        return { ...income, id: dbIncome.id };
      }
    } catch (error) {
      console.error('Failed to save income to database:', error);
      // Fall back to localStorage
      if (typeof window !== 'undefined') {
        const incomes = JSON.parse(localStorage.getItem('budgetIncome') || '[]');
        incomes.push(income);
        localStorage.setItem('budgetIncome', JSON.stringify(incomes));
      }
    }
    return income;
  }

  // Save budget expense to database
  async saveBudgetExpense(expense: any): Promise<any | null> {
    if (!this.familyId || !this.syncEnabled) {
      // Just save to localStorage
      if (typeof window !== 'undefined') {
        const expenses = JSON.parse(localStorage.getItem('budgetExpenses') || '[]');
        expenses.push(expense);
        localStorage.setItem('budgetExpenses', JSON.stringify(expenses));
      }
      return expense;
    }

    try {
      const dbExpense = await this.fetchAPI(`${API_BASE}/${this.familyId}/budget/expenses`, {
        method: 'POST',
        body: JSON.stringify({
          expenseName: expense.expenseName,
          amount: expense.amount,
          category: expense.category,
          budgetLimit: expense.budgetLimit,
          isRecurring: expense.isRecurring,
          paymentDate: expense.paymentDate,
          personId: expense.personId,
        }),
      });

      if (dbExpense && dbExpense.id) {
        console.log('Expense saved to database successfully:', dbExpense);

        // Update localStorage as well
        if (typeof window !== 'undefined') {
          const expenses = JSON.parse(localStorage.getItem('budgetExpenses') || '[]');
          expenses.push({ ...expense, id: dbExpense.id });
          localStorage.setItem('budgetExpenses', JSON.stringify(expenses));
        }
        return { ...expense, id: dbExpense.id };
      }
    } catch (error) {
      console.error('Failed to save expense to database:', error);
      // Fall back to localStorage
      if (typeof window !== 'undefined') {
        const expenses = JSON.parse(localStorage.getItem('budgetExpenses') || '[]');
        expenses.push(expense);
        localStorage.setItem('budgetExpenses', JSON.stringify(expenses));
      }
    }
    return expense;
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