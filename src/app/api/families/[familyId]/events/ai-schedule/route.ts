import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/aiService';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

interface ParsedSchedulingSuggestion {
  summary: string;
  recommendedSlots: Array<{
    date: string;
    startTime: string;
    endTime: string;
    confidence: number;
    reasons: string[];
    travelBuffer?: string;
    participants: string[];
  }>;
  considerations?: string[];
  followUp?: string[];
}

const parseAiJson = (text: string): ParsedSchedulingSuggestion => {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI response did not contain JSON object.');
  }

  const jsonString = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonString);
};

export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;

    const body = await request.json();
    const {
      title,
      durationMinutes,
      preferredDates,
      participants: participantIds,
    } = body;

    if (!title || !durationMinutes || !preferredDates?.length || !participantIds?.length) {
      return NextResponse.json(
        { error: 'title, durationMinutes, preferredDates, and participants are required' },
        { status: 400 }
      );
    }

    const [family, participants, upcomingEvents] = await Promise.all([
      prisma.family.findUnique({
        where: { id: familyId },
        select: { familyName: true },
      }),
      prisma.familyMember.findMany({
        where: { id: { in: participantIds }, familyId },
        select: {
          id: true,
          name: true,
          role: true,
        },
      }),
      prisma.calendarEvent.findMany({
        where: {
          familyId,
          eventDate: {
            gte: new Date(),
          },
        },
        include: {
          person: {
            select: { name: true },
          },
        },
        orderBy: {
          eventDate: 'asc',
        },
        take: 200,
      }),
    ]);

    if (!family) {
      return NextResponse.json(
        { error: 'Family not found' },
        { status: 404 }
      );
    }

    const aiResponse = await aiService.suggestMeetingSlots({
      familyName: family.familyName,
      eventTitle: title,
      durationMinutes,
      preferredDates,
      participants: participants.map((person) => ({
        name: person.name,
        role: person.role,
        typicalAvailability: [],
      })),
      existingEvents: upcomingEvents.map((event) => ({
        date: event.eventDate.toISOString().split('T')[0],
        time: event.eventTime.toISOString().split('T')[1]?.slice(0, 5) ?? '00:00',
        durationMinutes: event.durationMinutes,
        title: event.title,
        personName: event.person?.name ?? 'Family',
      })),
    });

    const suggestions = parseAiJson(aiResponse);

    return NextResponse.json(
      {
        suggestions,
        raw: aiResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Calendar scheduling AI error:', error);
    return NextResponse.json(
      {
        error: 'Failed to suggest meeting slots',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
