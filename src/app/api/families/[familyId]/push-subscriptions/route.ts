import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { createHash } from 'crypto';
import { isWebPushConfigured } from '@/lib/webPush';

export const GET = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  if (!authUser.familyMemberId) return NextResponse.json({ error: 'Link a family member before checking private push.' }, { status: 403 });
  const endpointHash = new URL(request.url).searchParams.get('endpointHash');
  if (endpointHash && !/^[a-f0-9]{64}$/.test(endpointHash)) {
    return NextResponse.json({ error: 'Invalid device fingerprint' }, { status: 400 });
  }
  try {
    const { familyId } = await context.params;
    const devices = await prisma.pushSubscription.findMany({
      where: { familyId, personId: authUser.familyMemberId },
      select: { id: true, endpoint: true, deviceLabel: true, isActive: true, lastSeenAt: true },
    });
    const current = endpointHash ? devices.find(device =>
      createHash('sha256').update(device.endpoint).digest('hex') === endpointHash) : undefined;
    return NextResponse.json({
      configured: isWebPushConfigured(),
      activeDevices: devices.filter(device => device.isActive).length,
      devices: devices.map(device => ({ id: device.id, label: device.deviceLabel?.slice(0, 80) || 'Registered device',
        isActive: device.isActive, lastSeenAt: device.lastSeenAt.toISOString() })),
      currentDevice: current ? { id: current.id, isActive: current.isActive, lastSeenAt: current.lastSeenAt.toISOString() } : null,
      deviceReceipt: 'unverified',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unable to check device registration' }, { status: 500 });
  }
});

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
      where: { endpoint: body.subscription.endpoint, familyId, personId: authUser.familyMemberId },
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
        isActive: true,
        lastSeenAt: true,
      },
    });

    return NextResponse.json({
      id: subscription.id,
      isActive: subscription.isActive,
      lastSeenAt: subscription.lastSeenAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 });
    }
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'This browser subscription belongs to another member or an older registration. Sign in as the intended member and use Reconnect this device in notification settings.' }, { status: 409 });
    }
    console.error('Error saving push subscription');
    return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const body = deleteSchema.parse(await request.json());
    if (!authUser.familyMemberId) return NextResponse.json({ error: 'Link a family member before changing private push.' }, { status: 403 });

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
    console.error('Error deleting push subscription');
    return NextResponse.json({ error: 'Failed to delete push subscription' }, { status: 500 });
  }
});
