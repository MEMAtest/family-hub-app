import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const GET = requireFamilyAccess(async (_request: NextRequest, _context, authUser) => {
  const candidates = await prisma.fragranceCandidate.findMany({
    where: { personId: authUser.familyMemberId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(candidates);
});

export const POST = requireFamilyAccess(async (request: NextRequest, _context, authUser) => {
  try {
    const body = await request.json();
    const house = typeof body.house === 'string' ? body.house.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const sourceName = typeof body.sourceName === 'string' ? body.sourceName.trim() : '';
    const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
    if (!house || !name || !sourceName || !sourceUrl) {
      return NextResponse.json({ error: 'Candidate, source name, and source link are required.' }, { status: 400 });
    }
    const candidate = await prisma.fragranceCandidate.create({
      data: {
        personId: authUser.familyMemberId,
        house,
        name,
        concentration: typeof body.concentration === 'string' ? body.concentration.trim() || null : null,
        profile: body.profile && typeof body.profile === 'object' ? body.profile as Prisma.InputJsonValue : Prisma.JsonNull,
        sourceName,
        sourceUrl,
        rating: Number.isFinite(Number(body.rating)) ? Number(body.rating) : null,
        longevityRating: Number.isFinite(Number(body.longevityRating)) ? Number(body.longevityRating) : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
      },
    });
    return NextResponse.json(candidate, { status: 201 });
  } catch (error) {
    console.error('Create fragrance candidate error:', error);
    return NextResponse.json({ error: 'Could not add that candidate.' }, { status: 500 });
  }
});
