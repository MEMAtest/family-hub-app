import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all families or create initial family
export async function GET() {
  try {
    const families = await prisma.family.findMany({
      include: {
        members: true,
      },
    });

    // If no families exist, create a default one
    if (families.length === 0) {
      const defaultFamily = await prisma.family.create({
        data: {
          familyName: 'My Family',
          familyCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        },
        include: {
          members: true,
        },
      });
      return NextResponse.json([defaultFamily]);
    }

    return NextResponse.json(families);
  } catch (error) {
    console.error('Error fetching families:', error);
    return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 });
  }
}

// POST - Create new family
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { familyName } = body;

    const family = await prisma.family.create({
      data: {
        familyName,
        familyCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error creating family:', error);
    return NextResponse.json({ error: 'Failed to create family' }, { status: 500 });
  }
}