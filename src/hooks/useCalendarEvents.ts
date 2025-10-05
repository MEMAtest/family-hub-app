import useApiData from './useApiData';
import { useFamilyStore } from '@/store/familyStore';
import { CalendarEvent } from '@/types/calendar.types';

// Define the type for the API response
type FetchEventsResponse = CalendarEvent[];

/**
 * Hook for managing calendar events.
 * Fetches events from the API and updates the store.
 */
function useCalendarEvents(familyId?: string, dateRange?: { start: Date; end: Date }) {
  const { setEvents } = useFamilyStore();

  const fetchFunction = async (): Promise<FetchEventsResponse> => {
    // Example API call - adjust the URL and parameters as needed
    // The date range could be passed as query parameters
    const startDate = dateRange?.start ? dateRange.start.toISOString() : '';
    const endDate = dateRange?.end ? dateRange.end.toISOString() : '';
    const response = await fetch(`/api/families/${familyId}/events?start=${startDate}&end=${endDate}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
    }
    return response.json();
  };

  const storeUpdateFunction = (data: FetchEventsResponse) => {
    setEvents(data);
  };

  // The hook will refetch if the familyId or dateRange changes
 return useApiData<FetchEventsResponse>(fetchFunction, storeUpdateFunction, [familyId, dateRange]);
}

export default useCalendarEvents;