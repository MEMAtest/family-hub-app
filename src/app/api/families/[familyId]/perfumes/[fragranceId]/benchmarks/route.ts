import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { fragranceId } = await context.params;
    const body = await request.json();
    const fragrance = await prisma.fragrance.findFirst({ where: { id: fragranceId, personId: authUser.familyMemberId }, select: { id: true } });
    if (!fragrance) return NextResponse.json({ error: 'This fragrance is not in your private collection.' }, { status: 404 });
    const sourceName = typeof body.sourceName === 'string' ? body.sourceName.trim() : '';
    const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
    if (!sourceName || !sourceUrl) return NextResponse.json({ error: 'A benchmark needs a source name and link.' }, { status: 400 });
    const benchmark = await prisma.fragranceBenchmark.create({
      data: {
        fragranceId,
        sourceName,
        sourceUrl,
        rating: Number.isFinite(Number(body.rating)) ? Number(body.rating) : null,
        longevityRating: Number.isFinite(Number(body.longevityRating)) ? Number(body.longevityRating) : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
      },
    });
    return NextResponse.json(benchmark, { status: 201 });
  } catch (error) {
    console.error('Create fragrance benchmark error:', error);
    return NextResponse.json({ error: 'Could not add that source.' }, { status: 500 });
  }
});
