import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { syncPrivateCyclePeriod } from '@/lib/googleCalendarServer';

const asDate = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000);

const cycleInsights = (periods: Array<{ startDate: Date; endDate: Date | null }>) => {
  const ordered = [...periods].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  const intervals = ordered.slice(0, -1).map((period, index) => daysBetween(ordered[index + 1].startDate, period.startDate));
  const averageCycleLength = intervals.length ? Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length) : null;
  const periodLengths = ordered.filter((period) => period.endDate).map((period) => daysBetween(period.startDate, period.endDate!) + 1);
  const averagePeriodLength = periodLengths.length ? Math.round(periodLengths.reduce((sum, value) => sum + value, 0) / periodLengths.length) : null;
  const variance = intervals.length > 1 ? Math.max(...intervals) - Math.min(...intervals) : 0;
  const lastPeriod = ordered[0];
  const predictedNextPeriod = lastPeriod && averageCycleLength
    ? new Date(lastPeriod.startDate.getTime() + averageCycleLength * 86_400_000)
    : null;
  const fertileWindow = predictedNextPeriod
    ? {
        start: new Date(predictedNextPeriod.getTime() - 19 * 86_400_000),
        end: new Date(predictedNextPeriod.getTime() - 14 * 86_400_000),
      }
    : null;
  const confidence = intervals.length >= 5 && variance <= 5 ? 'high' : intervals.length >= 3 ? 'medium' : 'low';
  return { averageCycleLength, averagePeriodLength, predictedNextPeriod, fertileWindow, confidence, irregular: intervals.length > 2 && variance > 7, loggedCycles: ordered.length };
};

export const GET = requireFamilyAccess(async (request: NextRequest, _context, authUser) => {
  try {
    const url = new URL(request.url);
    const [profile, periods, logs, reminders, calendarConnection] = await Promise.all([
      prisma.cycleProfile.findUnique({ where: { personId: authUser.familyMemberId } }),
      prisma.cyclePeriod.findMany({ where: { personId: authUser.familyMemberId }, orderBy: { startDate: 'desc' } }),
      prisma.cycleDailyLog.findMany({ where: { personId: authUser.familyMemberId }, orderBy: { logDate: 'desc' }, take: 180 }),
      prisma.cycleReminder.findMany({ where: { personId: authUser.familyMemberId }, orderBy: { reminderType: 'asc' } }),
      prisma.personalGoogleCalendarConnection.findUnique({ where: { personId: authUser.familyMemberId }, select: { googleUserEmail: true, selectedCalendarName: true, enabled: true } }),
    ]);
    const insights = cycleInsights(periods);
    if (url.searchParams.get('export') === '1') {
      return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), periods, logs, reminders, settings: profile }, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="private-cycle-data.json"' },
      });
    }
    return NextResponse.json({ profile, periods, logs, reminders, calendarConnection, insights });
  } catch (error) {
    console.error('Load cycle data error:', error);
    return NextResponse.json({ error: 'Could not load your private cycle data.' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, _context, authUser) => {
  try {
    const body = await request.json();
    const action = body.action;
    if (action === 'settings') {
      const profile = await prisma.cycleProfile.upsert({
        where: { personId: authUser.familyMemberId },
        update: {
          reminderEnabled: typeof body.reminderEnabled === 'boolean' ? body.reminderEnabled : undefined,
          reminderTime: typeof body.reminderTime === 'string' ? body.reminderTime : undefined,
          personalCalendarEnabled: typeof body.personalCalendarEnabled === 'boolean' ? body.personalCalendarEnabled : undefined,
        },
        create: {
          personId: authUser.familyMemberId,
          reminderEnabled: body.reminderEnabled !== false,
          reminderTime: typeof body.reminderTime === 'string' ? body.reminderTime : '20:00',
          personalCalendarEnabled: Boolean(body.personalCalendarEnabled),
        },
      });
      return NextResponse.json(profile);
    }
    if (action === 'period') {
      const startDate = asDate(body.startDate);
      const endDate = body.endDate ? asDate(body.endDate) : null;
      if (!startDate || (body.endDate && !endDate) || (endDate && endDate < startDate)) {
        return NextResponse.json({ error: 'Enter valid period start and end dates.' }, { status: 400 });
      }
      const period = await prisma.cyclePeriod.upsert({
        where: { personId_startDate: { personId: authUser.familyMemberId, startDate } },
        update: { endDate, notes: typeof body.notes === 'string' ? body.notes : undefined },
        create: { personId: authUser.familyMemberId, startDate, endDate, notes: typeof body.notes === 'string' ? body.notes : null },
      });
      const profile = await prisma.cycleProfile.findUnique({ where: { personId: authUser.familyMemberId }, select: { personalCalendarEnabled: true } });
      if (profile?.personalCalendarEnabled) {
        try {
          await syncPrivateCyclePeriod(authUser.familyMemberId, period);
        } catch (error) {
          console.warn('Private cycle calendar sync deferred:', error);
        }
      }
      return NextResponse.json(period, { status: 201 });
    }
    if (action === 'daily-log') {
      const logDate = asDate(body.logDate);
      if (!logDate) return NextResponse.json({ error: 'Enter a valid log date.' }, { status: 400 });
      const log = await prisma.cycleDailyLog.upsert({
        where: { personId_logDate: { personId: authUser.familyMemberId, logDate } },
        update: {
          flow: typeof body.flow === 'string' ? body.flow : null,
          symptoms: Array.isArray(body.symptoms) ? body.symptoms as Prisma.InputJsonValue : Prisma.JsonNull,
          mood: typeof body.mood === 'string' ? body.mood : null,
          energy: Number.isFinite(Number(body.energy)) ? Math.max(1, Math.min(5, Math.round(Number(body.energy)))) : null,
          sleepHours: Number.isFinite(Number(body.sleepHours)) ? Number(body.sleepHours) : null,
          painLevel: Number.isFinite(Number(body.painLevel)) ? Math.max(0, Math.min(10, Math.round(Number(body.painLevel)))) : null,
          medication: typeof body.medication === 'string' ? body.medication : null,
          tags: Array.isArray(body.tags) ? body.tags as Prisma.InputJsonValue : Prisma.JsonNull,
          notes: typeof body.notes === 'string' ? body.notes : null,
        },
        create: {
          personId: authUser.familyMemberId,
          logDate,
          flow: typeof body.flow === 'string' ? body.flow : null,
          symptoms: Array.isArray(body.symptoms) ? body.symptoms as Prisma.InputJsonValue : Prisma.JsonNull,
          mood: typeof body.mood === 'string' ? body.mood : null,
          energy: Number.isFinite(Number(body.energy)) ? Math.max(1, Math.min(5, Math.round(Number(body.energy)))) : null,
          sleepHours: Number.isFinite(Number(body.sleepHours)) ? Number(body.sleepHours) : null,
          painLevel: Number.isFinite(Number(body.painLevel)) ? Math.max(0, Math.min(10, Math.round(Number(body.painLevel)))) : null,
          medication: typeof body.medication === 'string' ? body.medication : null,
          tags: Array.isArray(body.tags) ? body.tags as Prisma.InputJsonValue : Prisma.JsonNull,
          notes: typeof body.notes === 'string' ? body.notes : null,
        },
      });
      return NextResponse.json(log, { status: 201 });
    }
    if (action === 'reminder') {
      const reminderType = typeof body.reminderType === 'string' ? body.reminderType : '';
      if (!reminderType) return NextResponse.json({ error: 'Choose a reminder type.' }, { status: 400 });
      const reminder = await prisma.cycleReminder.upsert({
        where: { personId_reminderType: { personId: authUser.familyMemberId, reminderType } },
        update: { enabled: body.enabled !== false, daysBefore: Number.isFinite(Number(body.daysBefore)) ? Math.max(0, Math.round(Number(body.daysBefore))) : 0, timeOfDay: typeof body.timeOfDay === 'string' ? body.timeOfDay : null },
        create: { personId: authUser.familyMemberId, reminderType, enabled: body.enabled !== false, daysBefore: Number.isFinite(Number(body.daysBefore)) ? Math.max(0, Math.round(Number(body.daysBefore))) : 0, timeOfDay: typeof body.timeOfDay === 'string' ? body.timeOfDay : null },
      });
      return NextResponse.json(reminder, { status: 201 });
    }
    return NextResponse.json({ error: 'Unknown cycle action.' }, { status: 400 });
  } catch (error) {
    console.error('Save cycle data error:', error);
    return NextResponse.json({ error: 'Could not save your private cycle data.' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (request: NextRequest, _context, authUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const id = searchParams.get('id');
    if (resource === 'all') {
      await prisma.$transaction([
        prisma.cycleReminder.deleteMany({ where: { personId: authUser.familyMemberId } }),
        prisma.cycleDailyLog.deleteMany({ where: { personId: authUser.familyMemberId } }),
        prisma.cyclePeriod.deleteMany({ where: { personId: authUser.familyMemberId } }),
        prisma.cycleProfile.deleteMany({ where: { personId: authUser.familyMemberId } }),
      ]);
      return NextResponse.json({ success: true });
    }
    if (resource === 'period' && id) {
      await prisma.cyclePeriod.deleteMany({ where: { id, personId: authUser.familyMemberId } });
      return NextResponse.json({ success: true });
    }
    if (resource === 'daily-log' && id) {
      await prisma.cycleDailyLog.deleteMany({ where: { id, personId: authUser.familyMemberId } });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Choose private data to delete.' }, { status: 400 });
  } catch (error) {
    console.error('Delete cycle data error:', error);
    return NextResponse.json({ error: 'Could not delete your private cycle data.' }, { status: 500 });
  }
});
