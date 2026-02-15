import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const dateString = z.string().datetime();

const createNotificationSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  icon: z.string().optional().nullable(),
  priority: z.string().min(1),
  category: z.string().min(1),
  timestamp: dateString.optional(),
  read: z.boolean().optional(),
  actionRequired: z.boolean().optional(),
  actions: z.any().optional().nullable(),
  relatedEventId: z.string().optional().nullable(),
  relatedPersonId: z.string().optional().nullable(),
  expiresAt: dateString.optional().nullable(),
  snoozedUntil: dateString.optional().nullable(),
  metadata: z.any().optional().nullable(),
});

const toClient = (n: any) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  message: n.message,
  icon: n.icon,
  priority: n.priority,
  category: n.category,
  timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp,
  read: n.read,
  actionRequired: n.actionRequired,
  actions: n.actions,
  relatedEventId: n.relatedEventId,
  relatedPersonId: n.relatedPersonId,
  expiresAt: n.expiresAt ? (n.expiresAt instanceof Date ? n.expiresAt.toISOString() : n.expiresAt) : undefined,
  snoozedUntil: n.snoozedUntil ? (n.snoozedUntil instanceof Date ? n.snoozedUntil.toISOString() : n.snoozedUntil) : undefined,
  metadata: n.metadata,
});

export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);

    const read = searchParams.get('read');
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)));
    const offset = Math.max(0, Number(searchParams.get('offset') || 0));

    const where: Record<string, any> = { familyId };
    if (read === 'true') where.read = true;
    if (read === 'false') where.read = false;
    if (category) where.category = category;
    if (type) where.type = type;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }],
      take: limit,
      skip: offset,
    });

    return NextResponse.json(notifications.map(toClient));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const raw = await request.json();
    const body = createNotificationSchema.parse(raw);

    const notification = await prisma.notification.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        familyId,
        type: body.type,
        title: body.title,
        message: body.message,
        icon: body.icon ?? undefined,
        priority: body.priority,
        category: body.category,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        read: body.read ?? false,
        actionRequired: body.actionRequired ?? false,
        actions: body.actions ?? undefined,
        relatedEventId: body.relatedEventId ?? undefined,
        relatedPersonId: body.relatedPersonId ?? undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        snoozedUntil: body.snoozedUntil ? new Date(body.snoozedUntil) : undefined,
        metadata: body.metadata ?? undefined,
      },
    });

    return NextResponse.json(toClient(notification), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid notification payload' }, { status: 400 });
    }
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
});
