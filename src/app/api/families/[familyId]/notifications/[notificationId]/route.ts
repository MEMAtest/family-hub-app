import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const patchSchema = z.object({
  read: z.boolean().optional(),
  snoozedUntil: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const PATCH = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, notificationId } = await context.params;
    const raw = await request.json();
    const updates = patchSchema.parse(raw);

    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        ...(updates.read === undefined ? {} : { read: updates.read }),
        ...(updates.snoozedUntil === undefined
          ? {}
          : updates.snoozedUntil === null
          ? { snoozedUntil: null }
          : { snoozedUntil: new Date(updates.snoozedUntil) }),
        ...(updates.expiresAt === undefined
          ? {}
          : updates.expiresAt === null
          ? { expiresAt: null }
          : { expiresAt: new Date(updates.expiresAt) }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      icon: updated.icon,
      priority: updated.priority,
      category: updated.category,
      timestamp: updated.timestamp.toISOString(),
      read: updated.read,
      actionRequired: updated.actionRequired,
      actions: updated.actions,
      relatedEventId: updated.relatedEventId,
      relatedPersonId: updated.relatedPersonId,
      expiresAt: updated.expiresAt?.toISOString(),
      snoozedUntil: updated.snoozedUntil?.toISOString(),
      metadata: updated.metadata,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid notification payload' }, { status: 400 });
    }
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, notificationId } = await context.params;

    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await prisma.notification.delete({ where: { id: notificationId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
});
