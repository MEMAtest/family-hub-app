import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { CreateActivityRequest } from '@/types/fitness.types';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

/**
 * GET /api/families/[familyId]/fitness
 * Fetch fitness activities with optional filters
 * Query params: personId, startDate, endDate, activityType, limit, offset
 */
export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);

    const personId = searchParams.get('personId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const activityType = searchParams.get('activityType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {
      person: { familyId },
    };

    if (personId) {
      where.personId = personId;
    }

    if (activityType) {
      where.activityType = activityType;
    }

    if (startDate || endDate) {
      where.activityDate = {};
      if (startDate) {
        where.activityDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.activityDate.lte = new Date(endDate);
      }
    }

    const activities = await prisma.fitnessTracking.findMany({
      where,
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
      orderBy: { activityDate: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await prisma.fitnessTracking.count({ where });

    return NextResponse.json({
      activities,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + activities.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching fitness activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/families/[familyId]/fitness
 * Create a new fitness activity
 */
export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body: CreateActivityRequest = await request.json();

    // Validate required fields
    if (!body.personId || !body.activityType || !body.durationMinutes) {
      return NextResponse.json(
        { error: 'Missing required fields: personId, activityType, durationMinutes' },
        { status: 400 }
      );
    }

    // Validate person belongs to family
    const person = await prisma.familyMember.findFirst({
      where: { id: body.personId, familyId },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found in family' },
        { status: 404 }
      );
    }

    // Create the activity
    const activity = await prisma.fitnessTracking.create({
      data: {
        personId: body.personId,
        activityType: body.activityType,
        durationMinutes: body.durationMinutes,
        intensityLevel: body.intensityLevel || 'moderate',
        activityDate: body.activityDate ? new Date(body.activityDate) : new Date(),
        notes: body.notes,
        calories: body.calories,
        exercises: body.exercises ? (body.exercises as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        workoutName: body.workoutName,
        heartRateAvg: body.heartRateAvg,
        heartRateMax: body.heartRateMax,
        source: body.source || 'manual',
        externalId: body.externalId,
        imageUrls: body.imageUrls ? (body.imageUrls as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
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

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Error creating fitness activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
});
