import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const GET = requireFamilyAccess(async (_request: NextRequest, context, authUser) => {
  const { fragranceId } = await context.params;
  const logs = await prisma.fragranceWearLog.findMany({
    where: { fragranceId, personId: authUser.familyMemberId },
    orderBy: { wornAt: 'desc' },
  });
  return NextResponse.json(logs);
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { fragranceId } = await context.params;
    const body = await request.json();
    const fragrance = await prisma.fragrance.findFirst({ where: { id: fragranceId, personId: authUser.familyMemberId }, select: { id: true } });
    if (!fragrance) return NextResponse.json({ error: 'This fragrance is not in your private collection.' }, { status: 404 });
    const rating = Number(body.overallRating);
    const projection = Number(body.projectionRating);
    const longevity = Number(body.longevityHours);
    const log = await prisma.fragranceWearLog.create({
      data: {
        personId: authUser.familyMemberId,
        fragranceId,
        wornAt: body.wornAt ? new Date(body.wornAt) : new Date(),
        overallRating: Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : null,
        projectionRating: Number.isFinite(projection) ? Math.min(5, Math.max(1, Math.round(projection))) : null,
        longevityHours: Number.isFinite(longevity) && longevity >= 0 ? longevity : null,
        context: body.context && typeof body.context === 'object' ? body.context as Prisma.InputJsonValue : Prisma.JsonNull,
        notes: typeof body.notes === 'string' ? body.notes : null,
      },
    });
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Create wear log error:', error);
    return NextResponse.json({ error: 'Could not save this wear test.' }, { status: 500 });
  }
});
