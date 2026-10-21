import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { applyTaskReminderAction, loadTaskReminderStates, TaskReminderActionError } from '@/lib/taskReminderActions';

const schema = z.object({ taskId: z.string().min(1), action: z.enum(['complete', 'snooze', 'not_needed', 'restore']),
  until: z.string().datetime().optional() }).refine(body => body.action === 'snooze' ? !!body.until : body.until === undefined);

export const GET = requireFamilyAccess(async (_request, context, user) => {
  try {
    const { familyId } = await context.params;
    return NextResponse.json(await loadTaskReminderStates(familyId, user.familyMemberId));
  } catch (error) {
    console.error('Task reminder state fetch failed:', error);
    return NextResponse.json({ error: 'Personal task reminders could not be checked.' }, { status: 503 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, user) => {
  try {
    const { familyId } = await context.params;
    const body = schema.parse(await request.json());
    return NextResponse.json(await applyTaskReminderAction(familyId, user.familyMemberId, body.taskId,
      body.action, body.until ? new Date(body.until) : undefined));
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid task reminder action.' }, { status: 400 });
    if (error instanceof TaskReminderActionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Task reminder action failed:', error);
    return NextResponse.json({ error: 'Could not update this task reminder.' }, { status: 500 });
  }
});
