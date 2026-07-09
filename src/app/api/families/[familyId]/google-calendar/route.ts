import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { getAuthedCalendarClient } from '@/lib/googleCalendarServer';

export const runtime = 'nodejs';

export const GET = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { familyId },
      select: {
        enabled: true,
        googleUserEmail: true,
        selectedCalendarId: true,
        selectedCalendarName: true,
        syncDirection: true,
        lastExportAt: true,
        updatedAt: true,
      },
    });

    if (!connection?.enabled) {
      return NextResponse.json({ connected: false, calendars: [] });
    }

    let calendars: Array<{
      id: string;
      summary: string;
      primary: boolean;
      accessRole?: string;
      backgroundColor?: string;
    }> = [];

    try {
      const { calendar } = await getAuthedCalendarClient(familyId);
      const list = await calendar.calendarList.list();
      calendars = (list.data.items || []).map((item) => ({
        id: item.id || '',
        summary: item.summary || 'Untitled calendar',
        primary: Boolean(item.primary),
        accessRole: item.accessRole || undefined,
        backgroundColor: item.backgroundColor || undefined,
      })).filter((item) => item.id);
    } catch (error) {
      console.warn('Failed to load Google Calendar list:', error);
    }

    return NextResponse.json({
      connected: true,
      connection,
      calendars,
    });
  } catch (error) {
    console.error('Google Calendar status error:', error);
    return NextResponse.json({ error: 'Failed to load Google Calendar status' }, { status: 500 });
  }
});

export const PATCH = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    const selectedCalendarId = typeof body.selectedCalendarId === 'string' ? body.selectedCalendarId : null;
    const selectedCalendarName = typeof body.selectedCalendarName === 'string' ? body.selectedCalendarName : null;

    const connection = await prisma.googleCalendarConnection.update({
      where: { familyId },
      data: {
        selectedCalendarId,
        selectedCalendarName,
        syncDirection: 'export',
        enabled: true,
      },
    });

    return NextResponse.json({
      connected: true,
      connection: {
        selectedCalendarId: connection.selectedCalendarId,
        selectedCalendarName: connection.selectedCalendarName,
        lastExportAt: connection.lastExportAt,
      },
    });
  } catch (error) {
    console.error('Google Calendar settings error:', error);
    return NextResponse.json({ error: 'Failed to update Google Calendar settings' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    await prisma.googleCalendarConnection.deleteMany({ where: { familyId } });
    return NextResponse.json({ connected: false });
  } catch (error) {
    console.error('Google Calendar disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect Google Calendar' }, { status: 500 });
  }
});
