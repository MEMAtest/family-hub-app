// Database Service - Handles all database operations and syncs with localStorage
import { CalendarEvent, Person } from '@/types/calendar.types';

const API_BASE = '/api/families';

class DatabaseService {
  private familyId: string | null = null;
  private syncEnabled = true;

  private mergeEvents(primary: CalendarEvent[], secondary: CalendarEvent[]) {
    const merged = new Map<string, CalendarEvent>();
    secondary.forEach((event) => {
      if (event?.id) {
        merged.set(event.id, event);
      }
    });
    primary.forEach((event) => {
      if (event?.id) {
        merged.set(event.id, event);
      }
    });
    return Array.from(merged.values());
  }

  async initialize() {
    try {
      // Get or create family with timeout (15s to allow for cold start compilation)
      const families = await Promise.race([
        this.fetchAPI('/api/families'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database initialization timeout')), 15000)
        )
      ]);
      console.log('Fetched families:', families);

      if (families && families.length > 0) {
        this.familyId = families[0].id;
        if (this.familyId && typeof window !== 'undefined') {
          localStorage.setItem('familyId', this.familyId);
        }
        if (families[0].familyName && typeof window !== 'undefined') {
          localStorage.setItem('familyName', families[0].familyName);
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

      // Fetch family milestones
      try {
        const milestones = await this.fetchAPI(`${API_BASE}/${this.familyId}/milestones`);
        if (milestones && typeof window !== 'undefined') {
          localStorage.setItem('familyMilestones', JSON.stringify(milestones));
        }
      } catch (error) {
        console.warn('Failed to fetch milestones:', error);
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
            date: e.eventDate ? e.eventDate.split('T')[0] : new Date().toISOString().split('T')[0],
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
          let storedEvents: CalendarEvent[] = [];
          try {
            const stored = localStorage.getItem('calendarEvents');
            const parsed = stored ? JSON.parse(stored) : [];
            storedEvents = Array.isArray(parsed) ? parsed : [];
          } catch (error) {
            console.warn('Failed to read cached calendar events, resetting cache:', error);
          }
          const mergedEvents = this.mergeEvents(formattedEvents, storedEvents);
          localStorage.setItem('calendarEvents', JSON.stringify(mergedEvents));
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

    // Try to get familyId from localStorage if not set
    if (!this.familyId && typeof window !== 'undefined') {
      const storedFamilyId = localStorage.getItem('familyId');
      if (storedFamilyId) {
        this.familyId = storedFamilyId;
        console.log('Recovered familyId from localStorage:', this.familyId);
      }
    }

    if (!this.familyId || !this.syncEnabled) {
      console.log('❌ NO DATABASE CONNECTION - saving to localStorage only');
      console.log('   familyId:', this.familyId, 'syncEnabled:', this.syncEnabled);
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
      members.push({
        ...member,
        ageGroup: (member as any).ageGroup || (member as any).age || 'Adult',
        dateOfBirth: (member as any).dateOfBirth || null,
        avatarUrl: (member as any).avatarUrl || null,
      });
      localStorage.setItem('familyMembers', JSON.stringify(members));
      return member;
    }

    try {
      const memberData: any = member;
      const ageGroup = memberData.ageGroup || memberData.age || 'Adult';
      const dbMember = await this.fetchAPI(`${API_BASE}/${this.familyId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          name: memberData.name,
          role: memberData.role || 'Family Member',
          ageGroup,
          dateOfBirth: memberData.dateOfBirth || null,
          avatarUrl: memberData.avatarUrl || null,
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
          ageGroup,
          dateOfBirth: memberData.dateOfBirth || null,
          avatarUrl: memberData.avatarUrl || null,
        });
        localStorage.setItem('familyMembers', JSON.stringify(members));
        return { ...member, id: dbMember.id };
      }
    } catch (error) {
      console.error('Failed to save member to database:', error);
      // Fall back to localStorage
      const members = JSON.parse(localStorage.getItem('familyMembers') || '[]');
      members.push({
        ...member,
        ageGroup: (member as any).ageGroup || (member as any).age || 'Adult',
        dateOfBirth: (member as any).dateOfBirth || null,
        avatarUrl: (member as any).avatarUrl || null,
      });
      localStorage.setItem('familyMembers', JSON.stringify(members));
      return member;
    }

    return null;
  }

  // Update family member in database
  async updateMember(id: string, updates: Partial<Person>): Promise<Person | null> {
    if (!this.familyId || !this.syncEnabled) {
      const members = JSON.parse(localStorage.getItem('familyMembers') || '[]');
      const index = members.findIndex((m: any) => m.id === id);
      if (index !== -1) {
        members[index] = { ...members[index], ...updates };
        localStorage.setItem('familyMembers', JSON.stringify(members));
        return members[index];
      }
      return null;
    }

    try {
      const dbMember = await this.fetchAPI(`${API_BASE}/${this.familyId}/members/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: (updates as any).name,
          role: (updates as any).role,
          ageGroup: (updates as any).ageGroup,
          dateOfBirth: (updates as any).dateOfBirth,
          avatarUrl: (updates as any).avatarUrl,
          color: (updates as any).color,
          icon: (updates as any).icon,
          fitnessGoals: (updates as any).fitnessGoals || {},
        }),
      });

      if (dbMember) {
        const members = JSON.parse(localStorage.getItem('familyMembers') || '[]');
        const index = members.findIndex((m: any) => m.id === id);
        if (index !== -1) {
          members[index] = { ...members[index], ...dbMember };
        } else {
          members.push(dbMember);
        }
        localStorage.setItem('familyMembers', JSON.stringify(members));
        return dbMember;
      }
    } catch (error) {
      console.error('Failed to update member in database:', error);
      const members = JSON.parse(localStorage.getItem('familyMembers') || '[]');
      const index = members.findIndex((m: any) => m.id === id);
      if (index !== -1) {
        members[index] = { ...members[index], ...updates };
        localStorage.setItem('familyMembers', JSON.stringify(members));
        return members[index];
      }
    }

    return null;
  }

  // Delete family member from database
  async deleteMember(id: string): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      const members = JSON.parse(localStorage.getItem('familyMembers') || '[]');
      const filtered = members.filter((m: any) => m.id !== id);
      localStorage.setItem('familyMembers', JSON.stringify(filtered));
      return true;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/members/${id}`, {
        method: 'DELETE',
      });

      const members = JSON.parse(localStorage.getItem('familyMembers') || '[]');
      const filtered = members.filter((m: any) => m.id !== id);
      localStorage.setItem('familyMembers', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to delete member from database:', error);
      return false;
    }
  }

  // Save family milestone to database
  async saveMilestone(milestone: any): Promise<any | null> {
    if (!this.familyId || !this.syncEnabled) {
      const milestones = JSON.parse(localStorage.getItem('familyMilestones') || '[]');
      milestones.push(milestone);
      localStorage.setItem('familyMilestones', JSON.stringify(milestones));
      return milestone;
    }

    try {
      const dbMilestone = await this.fetchAPI(`${API_BASE}/${this.familyId}/milestones`, {
        method: 'POST',
        body: JSON.stringify({
          title: milestone.title,
          description: milestone.description || null,
          date: milestone.date,
          type: milestone.type,
          participants: milestone.participants || [],
          photos: milestone.photos || [],
          tags: milestone.tags || [],
          isRecurring: milestone.isRecurring || false,
          reminderDays: milestone.reminderDays || [],
          isPrivate: milestone.isPrivate || false,
          createdBy: milestone.createdBy || null,
        }),
      });

      if (dbMilestone) {
        const milestones = JSON.parse(localStorage.getItem('familyMilestones') || '[]');
        milestones.push(dbMilestone);
        localStorage.setItem('familyMilestones', JSON.stringify(milestones));
        return dbMilestone;
      }
    } catch (error) {
      console.error('Failed to save milestone to database:', error);
      const milestones = JSON.parse(localStorage.getItem('familyMilestones') || '[]');
      milestones.push(milestone);
      localStorage.setItem('familyMilestones', JSON.stringify(milestones));
      return milestone;
    }

    return null;
  }

  // Update family milestone in database
  async updateMilestone(id: string, updates: any): Promise<any | null> {
    if (!this.familyId || !this.syncEnabled) {
      const milestones = JSON.parse(localStorage.getItem('familyMilestones') || '[]');
      const index = milestones.findIndex((m: any) => m.id === id);
      if (index !== -1) {
        milestones[index] = { ...milestones[index], ...updates };
        localStorage.setItem('familyMilestones', JSON.stringify(milestones));
        return milestones[index];
      }
      return null;
    }

    try {
      const dbMilestone = await this.fetchAPI(`${API_BASE}/${this.familyId}/milestones/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (dbMilestone) {
        const milestones = JSON.parse(localStorage.getItem('familyMilestones') || '[]');
        const index = milestones.findIndex((m: any) => m.id === id);
        if (index !== -1) {
          milestones[index] = { ...milestones[index], ...dbMilestone };
        } else {
          milestones.push(dbMilestone);
        }
        localStorage.setItem('familyMilestones', JSON.stringify(milestones));
        return dbMilestone;
      }
    } catch (error) {
      console.error('Failed to update milestone in database:', error);
      const milestones = JSON.parse(localStorage.getItem('familyMilestones') || '[]');
      const index = milestones.findIndex((m: any) => m.id === id);
      if (index !== -1) {
        milestones[index] = { ...milestones[index], ...updates };
        localStorage.setItem('familyMilestones', JSON.stringify(milestones));
        return milestones[index];
      }
    }

    return null;
  }

  // Delete family milestone from database
  async deleteMilestone(id: string): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      const milestones = JSON.parse(localStorage.getItem('familyMilestones') || '[]');
      const filtered = milestones.filter((m: any) => m.id !== id);
      localStorage.setItem('familyMilestones', JSON.stringify(filtered));
      return true;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/milestones/${id}`, {
        method: 'DELETE',
      });

      const milestones = JSON.parse(localStorage.getItem('familyMilestones') || '[]');
      const filtered = milestones.filter((m: any) => m.id !== id);
      localStorage.setItem('familyMilestones', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to delete milestone from database:', error);
      return false;
    }
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
    // Try to recover familyId
    if (!this.familyId && typeof window !== 'undefined') {
      const storedFamilyId = localStorage.getItem('familyId');
      if (storedFamilyId) this.familyId = storedFamilyId;
    }

    if (!this.familyId || !this.syncEnabled) {
      console.log('❌ NO DATABASE - saving income to localStorage only');
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
    // Try to recover familyId
    if (!this.familyId && typeof window !== 'undefined') {
      const storedFamilyId = localStorage.getItem('familyId');
      if (storedFamilyId) this.familyId = storedFamilyId;
    }

    if (!this.familyId || !this.syncEnabled) {
      console.log('❌ NO DATABASE - saving expense to localStorage only');
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

  // =====================
  // MEALS METHODS
  // =====================

  // Get meals for date range
  async getMeals(startDate?: string, endDate?: string): Promise<any[]> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected, returning empty meals array');
      return [];
    }

    try {
      let url = `${API_BASE}/${this.familyId}/meals`;
      const params = new URLSearchParams();

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const meals = await this.fetchAPI(url);
      return meals || [];
    } catch (error) {
      console.error('Failed to fetch meals:', error);
      return [];
    }
  }

  // Create meal
  async createMeal(mealData: {
    mealDate: string;
    mealName: string;
    proteinSource?: string;
    carbohydrateSource?: string;
    vegetableSource?: string;
    estimatedCalories?: number;
    mealNotes?: string;
  }): Promise<any | null> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected');
      return null;
    }

    try {
      const meal = await this.fetchAPI(`${API_BASE}/${this.familyId}/meals`, {
        method: 'POST',
        body: JSON.stringify(mealData),
      });

      return meal;
    } catch (error) {
      console.error('Failed to create meal:', error);
      return null;
    }
  }

  // Update meal
  async updateMeal(mealId: string, mealData: any): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected');
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/meals/${mealId}`, {
        method: 'PUT',
        body: JSON.stringify(mealData),
      });

      return true;
    } catch (error) {
      console.error('Failed to update meal:', error);
      return false;
    }
  }

  // Delete meal
  async deleteMeal(mealId: string): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected');
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/meals/${mealId}`, {
        method: 'DELETE',
      });

      return true;
    } catch (error) {
      console.error('Failed to delete meal:', error);
      return false;
    }
  }

  // Mark meal as eaten
  async markMealAsEaten(mealId: string, isEaten: boolean = true): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected');
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/meals/${mealId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: isEaten ? 'mark-eaten' : 'unmark-eaten' }),
      });

      return true;
    } catch (error) {
      console.error('Failed to mark meal as eaten:', error);
      return false;
    }
  }

  // ==================== GOALS METHODS ====================

  // Get family goals
  async getGoals(): Promise<any[]> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected, returning empty goals array');
      return [];
    }

    try {
      const goals = await this.fetchAPI(`${API_BASE}/${this.familyId}/goals`);
      return goals || [];
    } catch (error) {
      console.error('Failed to fetch goals:', error);
      return [];
    }
  }

  // Create goal
  async createGoal(goalData: {
    title: string;
    description?: string;
    type: string;
    targetValue?: string;
    currentProgress?: number;
    deadline?: string;
    participants?: string[];
    milestones?: any[];
  }): Promise<any | null> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected');
      return null;
    }

    try {
      const goal = await this.fetchAPI(`${API_BASE}/${this.familyId}/goals`, {
        method: 'POST',
        body: JSON.stringify(goalData),
      });
      return goal;
    } catch (error) {
      console.error('Failed to create goal:', error);
      return null;
    }
  }

  // Update goal
  async updateGoal(goalId: string, goalData: any): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/goals/${goalId}`, {
        method: 'PUT',
        body: JSON.stringify(goalData),
      });
      return true;
    } catch (error) {
      console.error('Failed to update goal:', error);
      return false;
    }
  }

  // Delete goal
  async deleteGoal(goalId: string): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/goals/${goalId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Failed to delete goal:', error);
      return false;
    }
  }

  // Update goal progress
  async updateGoalProgress(goalId: string, progress: number): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update-progress', progress }),
      });
      return true;
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      return false;
    }
  }

  // Add goal milestone
  async addGoalMilestone(
    goalId: string,
    milestone: {
      title: string;
      description?: string;
      targetDate?: string;
    }
  ): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'add-milestone', milestone }),
      });
      return true;
    } catch (error) {
      console.error('Failed to add goal milestone:', error);
      return false;
    }
  }

  // Complete goal milestone
  async completeGoalMilestone(goalId: string, milestoneId: string): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'complete-milestone', milestone: { id: milestoneId } }),
      });
      return true;
    } catch (error) {
      console.error('Failed to complete milestone:', error);
      return false;
    }
  }

  // ==================== ACHIEVEMENTS METHODS ====================

  // Get achievements (optionally filtered by person)
  async getAchievements(personId?: string): Promise<any[]> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected, returning empty achievements array');
      return [];
    }

    try {
      let url = `${API_BASE}/${this.familyId}/achievements`;
      if (personId) {
        url += `?personId=${personId}`;
      }

      const achievements = await this.fetchAPI(url);
      return achievements || [];
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      return [];
    }
  }

  // Create achievement
  async createAchievement(achievementData: {
    personId: string;
    title: string;
    description?: string;
    category: string;
    badge?: string;
    pointsAwarded?: number;
    achievedDate?: string;
  }): Promise<any | null> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected');
      return null;
    }

    try {
      const achievement = await this.fetchAPI(`${API_BASE}/${this.familyId}/achievements`, {
        method: 'POST',
        body: JSON.stringify(achievementData),
      });
      return achievement;
    } catch (error) {
      console.error('Failed to create achievement:', error);
      return null;
    }
  }

  // Delete achievement
  async deleteAchievement(achievementId: string): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/achievements/${achievementId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Failed to delete achievement:', error);
      return false;
    }
  }

  // ==================== SHOPPING METHODS ====================

  // Get shopping lists (optionally active only)
  async getShoppingLists(activeOnly: boolean = false): Promise<any[]> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected, returning empty shopping lists array');
      return [];
    }

    try {
      let url = `${API_BASE}/${this.familyId}/shopping-lists`;
      if (activeOnly) {
        url += '?activeOnly=true';
      }

      const lists = await this.fetchAPI(url);
      return lists || [];
    } catch (error) {
      console.error('Failed to fetch shopping lists:', error);
      return [];
    }
  }

  // Create shopping list
  async createShoppingList(listData: {
    listName: string;
    category?: string;
    storeChain?: string;
    customStore?: string;
  }): Promise<any | null> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected');
      return null;
    }

    try {
      const list = await this.fetchAPI(`${API_BASE}/${this.familyId}/shopping-lists`, {
        method: 'POST',
        body: JSON.stringify(listData),
      });
      return list;
    } catch (error) {
      console.error('Failed to create shopping list:', error);
      return null;
    }
  }

  // Update shopping list
  async updateShoppingList(listId: string, listData: any): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/shopping-lists/${listId}`, {
        method: 'PUT',
        body: JSON.stringify(listData),
      });
      return true;
    } catch (error) {
      console.error('Failed to update shopping list:', error);
      return false;
    }
  }

  // Delete shopping list
  async deleteShoppingList(listId: string): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`${API_BASE}/${this.familyId}/shopping-lists/${listId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Failed to delete shopping list:', error);
      return false;
    }
  }

  // Get shopping items for a list
  async getShoppingItems(listId: string): Promise<any[]> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected, returning empty items array');
      return [];
    }

    try {
      const items = await this.fetchAPI(`${API_BASE}/${this.familyId}/shopping-lists/${listId}/items`);
      return items || [];
    } catch (error) {
      console.error('Failed to fetch shopping items:', error);
      return [];
    }
  }

  // Add item to shopping list
  async addShoppingItem(listId: string, itemData: {
    itemName: string;
    estimatedPrice?: number;
    category?: string;
    frequency?: string;
    personId?: string;
  }): Promise<any | null> {
    if (!this.familyId || !this.syncEnabled) {
      console.warn('Database not connected');
      return null;
    }

    try {
      const item = await this.fetchAPI(`${API_BASE}/${this.familyId}/shopping-lists/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify(itemData),
      });
      return item;
    } catch (error) {
      console.error('Failed to add shopping item:', error);
      return null;
    }
  }

  // Update shopping item
  async updateShoppingItem(itemId: string, itemData: any): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`/api/shopping-items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(itemData),
      });
      return true;
    } catch (error) {
      console.error('Failed to update shopping item:', error);
      return false;
    }
  }

  // Delete shopping item
  async deleteShoppingItem(itemId: string): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`/api/shopping-items/${itemId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Failed to delete shopping item:', error);
      return false;
    }
  }

  // Toggle shopping item completion
  async toggleShoppingItem(itemId: string): Promise<boolean> {
    if (!this.familyId || !this.syncEnabled) {
      return false;
    }

    try {
      await this.fetchAPI(`/api/shopping-items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'toggle-complete' }),
      });
      return true;
    } catch (error) {
      console.error('Failed to toggle shopping item:', error);
      return false;
    }
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
