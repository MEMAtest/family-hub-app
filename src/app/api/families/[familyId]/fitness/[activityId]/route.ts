import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const updateActivitySchema = z.object({
  activityType: z.string().min(1).optional(),
  durationMinutes: z.number().int().positive().optional(),
  intensityLevel: z.string().min(1).optional(),
  activityDate: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  calories: z.number().int().optional().nullable(),
  exercises: z.any().optional().nullable(),
  workoutName: z.string().optional().nullable(),
  heartRateAvg: z.number().int().optional().nullable(),
  heartRateMax: z.number().int().optional().nullable(),
  imageUrls: z.array(z.string().min(1)).optional().nullable(),
});

const parseFitnessImageIdFromUrl = (familyId: string, url: string): string | null => {
  try {
    const pathname = new URL(url, 'http://localhost').pathname;
    const prefix = `/api/families/${familyId}/fitness/images/`;
    if (!pathname.startsWith(prefix)) return null;
    const id = pathname.slice(prefix.length);
    return id || null;
  } catch {
    return null;
  }
};

export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, activityId } = await context.params;
    const raw = await request.json();
    const updates = updateActivitySchema.parse(raw);

    const existing = await prisma.fitnessTracking.findFirst({
      where: { id: activityId, person: { familyId } },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const activity = await prisma.fitnessTracking.update({
      where: { id: activityId },
      data: {
        ...updates,
        activityDate: updates.activityDate ? new Date(updates.activityDate) : undefined,
        notes: updates.notes === undefined ? undefined : updates.notes,
        workoutName: updates.workoutName === undefined ? undefined : updates.workoutName,
        exercises: updates.exercises === undefined
          ? undefined
          : updates.exercises === null
          ? Prisma.JsonNull
          : (updates.exercises as unknown as Prisma.InputJsonValue),
        imageUrls: updates.imageUrls === undefined
          ? undefined
          : updates.imageUrls === null
          ? Prisma.JsonNull
          : (updates.imageUrls as unknown as Prisma.InputJsonValue),
      },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    if (updates.imageUrls !== undefined) {
      const imageIds = (updates.imageUrls || [])
        .map((url) => parseFitnessImageIdFromUrl(familyId, url))
        .filter((id): id is string => Boolean(id));

      if (imageIds.length) {
        await prisma.fitnessImage.updateMany({
          where: {
            familyId,
            id: { in: imageIds },
            OR: [{ fitnessTrackingId: null }, { fitnessTrackingId: activityId }],
          },
          data: { fitnessTrackingId: activityId },
        });
      }

      await prisma.fitnessImage.deleteMany({
        where: {
          familyId,
          fitnessTrackingId: activityId,
          ...(imageIds.length ? { id: { notIn: imageIds } } : {}),
        },
      });
    }

    return NextResponse.json(activity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid activity payload' }, { status: 400 });
    }
    console.error('Error updating fitness activity:', error);
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, activityId } = await context.params;

    const existing = await prisma.fitnessTracking.findFirst({
      where: { id: activityId, person: { familyId } },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    await prisma.fitnessTracking.delete({ where: { id: activityId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fitness activity:', error);
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
  }
});
