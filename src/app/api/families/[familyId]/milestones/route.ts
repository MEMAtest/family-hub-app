import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const GET = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const milestones = await prisma.familyMilestone.findMany({
      where: { familyId },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error('Error fetching family milestones:', error);
    return NextResponse.json({ error: 'Failed to fetch family milestones' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    const parsedDate = body.date ? new Date(body.date) : null;
    const dateValue = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    if (!dateValue) {
      return NextResponse.json({ error: 'Valid milestone date is required' }, { status: 400 });
    }

    const milestone = await prisma.familyMilestone.create({
      data: {
        familyId,
        title: body.title,
        description: body.description || null,
        date: dateValue,
        type: body.type,
        participants: body.participants || [],
        photos: body.photos || [],
        tags: body.tags || [],
        isRecurring: body.isRecurring || false,
        reminderDays: body.reminderDays || [],
        isPrivate: body.isPrivate || false,
        createdBy: body.createdBy || null,
      },
    });

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Error creating family milestone:', error);
    return NextResponse.json({ error: 'Failed to create family milestone' }, { status: 500 });
  }
});
