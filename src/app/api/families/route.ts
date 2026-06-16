import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getOrCreateOpenFamily } from '@/lib/defaultFamilyPersistence';

// GET all families or create initial family
export const GET = requireAuth(async (_request: NextRequest, _context, authUser) => {
  try {
    const family = await getOrCreateOpenFamily(authUser.familyId);

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
