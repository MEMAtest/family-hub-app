import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { sendFamilyPushNotification } from '@/lib/webPush';

const promptSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  dedupeKey: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('high'),
  category: z.enum(['event', 'sync', 'system', 'error', 'conflict']).default('event'),
  url: z.string().default('/?view=dashboard'),
  actionLabel: z.string().default('Open'),
});

const hasDedupeKey = (metadata: unknown, dedupeKey: string) => {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as { dedupeKey?: string }).dedupeKey === dedupeKey;
};

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const body = promptSchema.parse(await request.json());

    const recent = await prisma.notification.findMany({
      where: {
        familyId,
        createdAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true, metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const existing = recent.find((notification) => hasDedupeKey(notification.metadata, body.dedupeKey));
    if (existing) {
      return NextResponse.json({ created: false, notificationId: existing.id });
    }

    const notification = await prisma.notification.create({
      data: {
        familyId,
        type: 'reminder',
        title: body.title,
        message: body.message,
        icon: '🔔',
        priority: body.priority,
        category: body.category,
        read: false,
        actionRequired: true,
        actions: [
          {
            id: 'open',
            label: body.actionLabel,
            type: 'primary',
            action: body.url.includes('view=brain') ? 'view_brain_node' : 'view_calendar',
            data: { url: body.url },
          },
          {
            id: 'dismiss',
            label: 'Dismiss',
            type: 'secondary',
            action: 'dismiss',
          },
        ],
        metadata: {
          dedupeKey: body.dedupeKey,
          url: body.url,
          source: 'reactive-prompts',
        },
      },
      select: { id: true },
    });

    const push = await sendFamilyPushNotification(familyId, {
      title: body.title,
      body: body.message,
      tag: body.dedupeKey,
      data: {
        familyId,
        type: 'reactive-prompt',
        url: body.url,
        notificationId: notification.id,
      },
      actions: [
        { action: 'view', title: body.actionLabel },
        { action: 'snooze', title: 'Snooze 10m' },
      ],
    });

    return NextResponse.json({ created: true, notificationId: notification.id, push });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid reactive prompt payload' }, { status: 400 });
    }

    console.error('Reactive prompt error:', error);
    return NextResponse.json({ error: 'Failed to create reactive prompt' }, { status: 500 });
  }
});
