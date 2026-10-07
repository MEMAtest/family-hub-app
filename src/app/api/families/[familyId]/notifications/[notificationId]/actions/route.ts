import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { applyFamilyReminderAction, ReminderActionError } from '@/lib/familyReminders';

const actionSchema = z.object({ action: z.enum(['done', 'not_needed', 'snooze', 'details', 'cover']), until: z.string().datetime().optional() });
export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId, notificationId } = await context.params;
    const body = actionSchema.parse(await request.json());
    const result = await applyFamilyReminderAction(familyId, authUser.familyMemberId, notificationId,
      body.action, body.until ? new Date(body.until) : undefined);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid reminder action' }, { status: 400 });
    if (error instanceof ReminderActionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Reminder action failed:', error);
    return NextResponse.json({ error: 'Could not update reminder' }, { status: 500 });
  }
});
