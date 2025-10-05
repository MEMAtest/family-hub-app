'use client'

import { useEffect } from 'react';
import databaseService from '@/services/databaseService';
import { useFamilyStore } from '@/store/familyStore';

export const useDatabaseSync = () => {
  const setDatabaseStatus = useFamilyStore(state => state.setDatabaseStatus);
  const setEvents = useFamilyStore(state => state.setEvents);
  const setPeople = useFamilyStore(state => state.setPeople);

  useEffect(() => {
    const initDatabase = async () => {
      if (typeof window === 'undefined') return;

      console.log('🔄 Starting database initialization...');

      try {
        const connected = await databaseService.initialize();
        const status = databaseService.getStatus();
        setDatabaseStatus(status);

        console.log('Database status:', status);

        if (connected && status.familyId) {
          console.log('✅ Database connected, fetching data from API...');

          // Fetch directly from API instead of relying on localStorage
          try {
            const [eventsResponse, membersResponse] = await Promise.all([
              fetch(`/api/families/${status.familyId}/events`),
              fetch(`/api/families/${status.familyId}/members`)
            ]);

            if (eventsResponse.ok && membersResponse.ok) {
              const events = await eventsResponse.json();
              const members = await membersResponse.json();

              console.log(`📅 Loaded ${events.length} events from database`);
              console.log(`👥 Loaded ${members.length} members from database`);

              // Update the Zustand store directly
              setEvents(events);
              setPeople(members);

              // Also update localStorage for offline use
              localStorage.setItem('calendarEvents', JSON.stringify(events));
              localStorage.setItem('familyMembers', JSON.stringify(members));

              console.log('✅ Data loaded and store updated successfully');
            } else {
              console.error('Failed to fetch data from API');
            }
          } catch (fetchError) {
            console.error('Error fetching from API:', fetchError);
          }
        } else {
          console.log('⚠️ Database not connected, using localStorage');
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDatabaseStatus({ connected: false, familyId: null, mode: 'localStorage' });
      }
    };

    initDatabase();
  }, [setDatabaseStatus, setEvents, setPeople]);
};
