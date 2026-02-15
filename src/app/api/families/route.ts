import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

// GET all families or create initial family
export const GET = requireAuth(async (_request: NextRequest, _context, authUser) => {
  try {
    const family = await prisma.family.findUnique({
      where: { id: authUser.familyId },
      include: {
        members: true,
      },
    });

    return NextResponse.json(family ? [family] : []);
  } catch (error) {
    console.error('Error fetching families:', error);
    return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 });
  }
});

// POST - Create new family
export const POST = requireAuth(async (_request: NextRequest) => {
  return NextResponse.json(
    { error: 'Use /api/onboarding to create your family' },
    { status: 400 }
  );
});
