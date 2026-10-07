import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { sendMemberPushNotification } from '@/lib/webPush';

const pushTestSchema = z.object({
  title: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const body = pushTestSchema.parse(await request.json().catch(() => ({})));
    const title = body.title ?? 'Omosanya Home notifications are on';
    const message = body.message ?? 'Check this device for your Family Hub test notification.';

    const result = await sendMemberPushNotification(familyId, authUser.familyMemberId, {
      title,
      body: message,
      tag: `push-test-${familyId}`,
      data: {
        familyId,
        type: 'push-test',
        url: '/',
      },
      actions: [
        { action: 'view', title: 'Open' },
      ],
    });

    return NextResponse.json({ success: result.sent > 0, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid push test payload' }, { status: 400 });
    }
    console.error('Error sending push test:', error);
    return NextResponse.json({ error: 'Failed to send push test' }, { status: 500 });
  }
});
