import { NextRequest, NextResponse } from 'next/server';
import { kidsEventsScraperService } from '@/services/kidsEventsScraperService';
import { EventFilters, KidsEvent, EventCategory, AgeRange } from '@/types/kidsEvents.types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: EventFilters = {};

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    if (searchParams.get('categories')) {
      filters.categories = searchParams.get('categories')!.split(',') as EventCategory[];
    }

    if (searchParams.get('ageRange')) {
      filters.ageRange = searchParams.get('ageRange') as AgeRange;
    }

    if (searchParams.get('isFree') === 'true') {
      filters.isFree = true;
    }

    if (searchParams.get('maxDistance')) {
      filters.maxDistance = parseFloat(searchParams.get('maxDistance')!);
    }

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = searchParams.get('dateFrom')!;
    }

    if (searchParams.get('dateTo')) {
      filters.dateTo = searchParams.get('dateTo')!;
    }

    if (searchParams.get('isLocal') === 'true') {
      filters.isLocal = true;
    }

    const allEvents = await kidsEventsScraperService.fetchAllEvents(filters);

    let filteredEvents = allEvents;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredEvents = filteredEvents.filter(e =>
        e.title.toLowerCase().includes(searchLower) ||
        e.description.toLowerCase().includes(searchLower)
      );
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const startIndex = (page - 1) * pageSize;
    const paginatedEvents = filteredEvents.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      success: true,
      events: paginatedEvents,
      total: filteredEvents.length,
      page,
      pageSize,
      filters,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch kids events:', error);

    return NextResponse.json(
      {
        success: false,
        events: [],
        total: 0,
        error: 'Failed to fetch events',
        lastUpdated: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'refresh') {
      const events = await kidsEventsScraperService.fetchAllEvents({});

      return NextResponse.json({
        success: true,
        events,
        total: events.length,
        message: 'Events refreshed successfully',
        lastUpdated: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Failed to process request:', error);

    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
