import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { aiService } from '@/services/aiService';

const prisma = new PrismaClient();

interface ParsedConflictSuggestion {
  summary: string;
  conflicts: Array<{
    newEvent: {
      title: string;
      date: string;
      time: string;
    };
    conflictingEvents: Array<{
      title: string;
      date: string;
      time: string;
      participant: string;
    }>;
    severity: string;
    recommendations: string[];
  }>;
}

const parseAiJson = (text: string): ParsedConflictSuggestion => {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI response did not contain JSON object.');
  }

  const jsonString = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonString);
};

export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;
    if (!familyId) {
      return NextResponse.json(
        { error: 'Family ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      newEvent,
    } = body;

    if (!newEvent?.date || !newEvent?.time || !newEvent?.durationMinutes) {
      return NextResponse.json(
        { error: 'newEvent must include date, time, and durationMinutes' },
        { status: 400 }
      );
    }

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: {
        familyName: true,
        members: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Family not found' },
        { status: 404 }
      );
    }

    const dayStart = new Date(`${newEvent.date}T00:00:00`);
    const dayEnd = new Date(`${newEvent.date}T23:59:59`);

    const existingEvents = await prisma.calendarEvent.findMany({
      where: {
        familyId,
        eventDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        person: {
          select: {
            name: true,
          },
        },
      },
    });

    const aiInput = existingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.eventDate.toISOString().split('T')[0],
      time: event.eventTime.toISOString().split('T')[1]?.slice(0, 5) ?? '00:00',
      duration: event.durationMinutes,
      personName: event.person?.name ?? 'Family',
      location: event.location ?? undefined,
    }));

    const aiResponse = await aiService.detectEventConflicts(
      [
        ...aiInput,
        {
          id: newEvent.id ?? 'new-event',
          title: newEvent.title ?? 'New event',
          date: newEvent.date,
          time: newEvent.time,
          duration: newEvent.durationMinutes,
          personName: newEvent.personName ?? 'Family',
          location: newEvent.location,
        },
      ],
    );

    const suggestions = parseAiJson(aiResponse);

    return NextResponse.json(
      {
        suggestions,
        raw: aiResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Calendar conflict AI error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyse event conflicts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
