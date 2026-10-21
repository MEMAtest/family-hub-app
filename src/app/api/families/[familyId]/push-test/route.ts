import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { sendMemberPushNotification } from '@/lib/webPush';

const pushTestSchema = z.object({
  subscriptionId: z.string().min(1).max(200),
  title: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    if (!authUser.familyMemberId) return NextResponse.json({ error: 'Link a family member before testing private push.' }, { status: 403 });
    const { familyId } = await context.params;
    const body = pushTestSchema.parse(await request.json().catch(() => ({})));
    const title = body.title ?? 'Omosanya Home device test';
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
    }, body.subscriptionId);

    const status = result.configured === false ? 'not_configured' : result.sent > 0 ? 'provider_accepted' :
      result.inactive > 0 ? 'subscription_expired' : result.failed > 0 ? 'provider_failed' : 'device_not_registered';
    return NextResponse.json({ success: result.sent > 0, ...result, status, deviceReceipt: 'unverified' },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid push test payload' }, { status: 400 });
    }
    console.error('Error sending push test');
    return NextResponse.json({ error: 'Failed to send push test' }, { status: 500 });
  }
});
