import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { canActOnNotification } from '@/lib/notificationRecipients';
import { isFamilyReminder } from '@/lib/familyReminderContract';
import { applyFamilyReminderAction, ReminderActionError } from '@/lib/familyReminders';

const patchSchema = z.object({
  read: z.boolean().optional(),
  snoozedUntil: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const PATCH = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId, notificationId } = await context.params;
    const rawText = await request.text();
    if (!rawText.trim()) {
      return NextResponse.json({ error: 'Notification update body required' }, { status: 400 });
    }
    const raw = JSON.parse(rawText);
    const updates = patchSchema.parse(raw);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No notification updates provided' }, { status: 400 });
    }

    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, familyId },
      select: { id: true, recipientPersonId: true, metadata: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    if (!canActOnNotification(existing.recipientPersonId, authUser)) return NextResponse.json({ error: 'Sign in as the recipient.' }, { status: 403 });
    if (isFamilyReminder(existing) && updates.expiresAt !== undefined) {
      return NextResponse.json({ error: 'Reminder expiry is managed by the server.' }, { status: 400 });
    }
    if (isFamilyReminder(existing) && updates.snoozedUntil !== undefined) {
      if (!updates.snoozedUntil) return NextResponse.json({ error: 'Use the reminder action to change snooze.' }, { status: 400 });
      return NextResponse.json(await applyFamilyReminderAction(familyId, authUser.familyMemberId,
        notificationId, 'snooze', new Date(updates.snoozedUntil)));
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
    if (error instanceof ReminderActionError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid notification payload' }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, authUser) => {
  try {
    const { familyId, notificationId } = await context.params;

    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, familyId },
      select: { id: true, recipientPersonId: true, metadata: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    if (!canActOnNotification(existing.recipientPersonId, authUser)) return NextResponse.json({ error: 'Sign in as the recipient.' }, { status: 403 });
    if (isFamilyReminder(existing)) return NextResponse.json({ error: 'Use Done or Not needed to resolve a reminder.' }, { status: 409 });

    await prisma.notification.delete({ where: { id: notificationId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
});
