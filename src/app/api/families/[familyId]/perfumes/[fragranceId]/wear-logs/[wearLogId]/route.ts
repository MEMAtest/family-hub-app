import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const wearLogValues = (body: Record<string, unknown>) => {
  const rating = Number(body.overallRating);
  const projection = Number(body.projectionRating);
  const longevity = Number(body.longevityHours);
  const wornAt = typeof body.wornAt === 'string' ? new Date(`${body.wornAt}T12:00:00.000Z`) : null;
  return {
    wornAt: wornAt && !Number.isNaN(wornAt.getTime()) ? wornAt : null,
    overallRating: Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : null,
    projectionRating: Number.isFinite(projection) ? Math.min(5, Math.max(1, Math.round(projection))) : null,
    longevityHours: Number.isFinite(longevity) && longevity >= 0 ? longevity : null,
    context: body.context && typeof body.context === 'object' ? body.context as Prisma.InputJsonValue : Prisma.JsonNull,
    notes: typeof body.notes === 'string' ? body.notes : null,
  };
};

export const PUT = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { fragranceId, wearLogId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const values = wearLogValues(body);
    if (!values.wornAt) return NextResponse.json({ error: 'Enter a valid wear date.' }, { status: 400 });
    const { wornAt, ...updateValues } = values;
    const log = await prisma.fragranceWearLog.findFirst({
      where: { id: wearLogId, fragranceId, personId: authUser.familyMemberId },
      select: { id: true },
    });
    if (!log) return NextResponse.json({ error: 'That private wear test is unavailable.' }, { status: 404 });
    const updated = await prisma.fragranceWearLog.update({
      where: { id: log.id },
      data: { ...updateValues, wornAt },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update wear log error:', error);
    return NextResponse.json({ error: 'Could not update this wear test.' }, { status: 500 });
  }
});
