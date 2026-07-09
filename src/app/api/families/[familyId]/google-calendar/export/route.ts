import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { getAuthedCalendarClient, googlePayloadFromFamilyEvent } from '@/lib/googleCalendarServer';
import { toCalendarEventResponse } from '@/lib/calendarEventMapping';

export const runtime = 'nodejs';

export const POST = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const { calendar, connection } = await getAuthedCalendarClient(familyId);

    let selectedCalendarId = connection.selectedCalendarId || '';
    if (!selectedCalendarId) {
      const list = await calendar.calendarList.list();
      const primary = (list.data.items || []).find((item) => item.primary) || list.data.items?.[0];
      selectedCalendarId = primary?.id || '';
      if (!selectedCalendarId) {
        return NextResponse.json({ error: 'No writable Google calendar found' }, { status: 400 });
      }
      await prisma.googleCalendarConnection.update({
        where: { familyId },
        data: {
          selectedCalendarId,
          selectedCalendarName: primary?.summary || null,
        },
      });
    }

    const events = await prisma.calendarEvent.findMany({
      where: { familyId },
      orderBy: { eventDate: 'asc' },
    });

    let exported = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const dbEvent of events) {
      const familyEvent = toCalendarEventResponse(dbEvent);
      const payload = googlePayloadFromFamilyEvent(familyEvent);

      try {
        if (dbEvent.googleEventId && dbEvent.googleCalendarId === selectedCalendarId) {
          await calendar.events.update({
            calendarId: selectedCalendarId,
            eventId: dbEvent.googleEventId,
            requestBody: payload,
          });
          updated += 1;
        } else {
          const created = await calendar.events.insert({
            calendarId: selectedCalendarId,
            requestBody: payload,
          });
          await prisma.calendarEvent.update({
            where: { id: dbEvent.id },
            data: {
              googleCalendarId: selectedCalendarId,
              googleEventId: created.data.id || null,
            },
          });
          exported += 1;
        }
      } catch (error) {
        errors.push(`${dbEvent.title}: ${error instanceof Error ? error.message : 'export failed'}`);
      }
    }

    await prisma.googleCalendarConnection.update({
      where: { familyId },
      data: {
        selectedCalendarId,
        lastExportAt: new Date(),
      },
    });

    return NextResponse.json({
      success: errors.length === 0,
      imported: 0,
      exported,
      updated,
      conflicts: [],
      errors,
    });
  } catch (error) {
    console.error('Google Calendar export error:', error);
    return NextResponse.json({
      success: false,
      imported: 0,
      exported: 0,
      updated: 0,
      conflicts: [],
      errors: [error instanceof Error ? error.message : 'Failed to export Google Calendar events'],
    }, { status: 500 });
  }
});
