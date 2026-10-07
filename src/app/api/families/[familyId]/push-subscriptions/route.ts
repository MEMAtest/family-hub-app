import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  userAgent: z.string().optional().nullable(),
  deviceLabel: z.string().optional().nullable(),
  enabled: z.boolean().optional().default(true),
});

const deleteSchema = z.object({
  endpoint: z.string().url(),
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const body = subscriptionSchema.parse(await request.json());
    if (!authUser.familyMemberId) return NextResponse.json({ error: 'Link a family member before enabling private push.' }, { status: 403 });

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: body.subscription.endpoint },
      update: {
        familyId,
        personId: authUser.familyMemberId,
        p256dh: body.subscription.keys.p256dh,
        auth: body.subscription.keys.auth,
        userAgent: body.userAgent ?? undefined,
        deviceLabel: body.deviceLabel ?? undefined,
        isActive: body.enabled,
        lastSeenAt: new Date(),
      },
      create: {
        familyId,
        personId: authUser.familyMemberId,
        isActive: body.enabled,
        endpoint: body.subscription.endpoint,
        p256dh: body.subscription.keys.p256dh,
        auth: body.subscription.keys.auth,
        userAgent: body.userAgent ?? undefined,
        deviceLabel: body.deviceLabel ?? undefined,
      },
      select: {
        id: true,
        endpoint: true,
        isActive: true,
        lastSeenAt: true,
      },
    });

    return NextResponse.json({
      id: subscription.id,
      endpoint: subscription.endpoint,
      isActive: subscription.isActive,
      lastSeenAt: subscription.lastSeenAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 });
    }
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const body = deleteSchema.parse(await request.json());

    await prisma.pushSubscription.updateMany({
      where: {
        familyId,
        personId: authUser.familyMemberId,
        endpoint: body.endpoint,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 });
    }
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: 'Failed to delete push subscription' }, { status: 500 });
  }
});
