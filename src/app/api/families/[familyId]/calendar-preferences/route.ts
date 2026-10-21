import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { applyCalendarPreference, emptyCalendarPreferences, type CalendarPreferences } from '@/lib/calendarPreferences';

const token = z.string().min(1).max(500);
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('hide'), occurrenceId: token }).strict(),
  z.object({ action: z.literal('restore'), occurrenceId: token }).strict(),
  z.object({ action: z.literal('accept-overlap'), insightId: token }).strict(),
  z.object({ action: z.literal('place'), place: z.object({ place: z.enum(['office', 'home', 'other']), customPlace: z.string().max(200) }).strict() }).strict(),
]);

export const GET = requireFamilyAccess(async (_request, context, auth) => {
  const { familyId } = await context.params;
  const row = await prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key: `calendar.preferences:${auth.familyMemberId}` } } });
  return NextResponse.json({ ...((row?.data as CalendarPreferences | undefined) ?? emptyCalendarPreferences()), memberId: auth.familyMemberId });
});

export const PUT = requireFamilyAccess(async (request: NextRequest, context, auth) => {
  const { familyId } = await context.params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid calendar preference' }, { status: 400 });
  const key = `calendar.preferences:${auth.familyMemberId}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key } } });
    const next = applyCalendarPreference((row?.data as CalendarPreferences | undefined) ?? emptyCalendarPreferences(), parsed.data);
    if (!row) {
      try {
        await prisma.familyDocument.create({ data: { familyId, key, data: next, updatedBy: auth.familyMemberId } });
        return NextResponse.json({ ...next, memberId: auth.familyMemberId });
      } catch (error) { if ((error as { code?: string }).code !== 'P2002') throw error; }
    } else {
      const result = await prisma.familyDocument.updateMany({ where: { familyId, key, version: row.version }, data: { data: next, version: { increment: 1 }, updatedBy: auth.familyMemberId } });
      if (result.count === 1) return NextResponse.json({ ...next, memberId: auth.familyMemberId });
    }
  }
  return NextResponse.json({ error: 'Calendar changed on another device. Please retry.' }, { status: 409 });
});
