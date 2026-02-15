import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const PATCH = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const params = await context.params;
    const body = await request.json();
    const parsedDate = body.date ? new Date(body.date) : null;
    const dateValue = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;

    const existing = await prisma.familyMilestone.findFirst({
      where: { id: params.milestoneId, familyId: params.familyId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const milestone = await prisma.familyMilestone.update({
      where: { id: params.milestoneId },
      data: {
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        date: body.date === undefined ? existing.date : dateValue ?? existing.date,
        type: body.type ?? existing.type,
        participants: body.participants ?? existing.participants,
        photos: body.photos ?? existing.photos,
        tags: body.tags ?? existing.tags,
        isRecurring: body.isRecurring ?? existing.isRecurring,
        reminderDays: body.reminderDays ?? existing.reminderDays,
        isPrivate: body.isPrivate ?? existing.isPrivate,
        createdBy: body.createdBy ?? existing.createdBy,
      },
    });

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Error updating family milestone:', error);
    return NextResponse.json({ error: 'Failed to update family milestone' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const params = await context.params;
    const existing = await prisma.familyMilestone.findFirst({
      where: { id: params.milestoneId, familyId: params.familyId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    await prisma.familyMilestone.delete({
      where: { id: params.milestoneId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting family milestone:', error);
    return NextResponse.json({ error: 'Failed to delete family milestone' }, { status: 500 });
  }
});
