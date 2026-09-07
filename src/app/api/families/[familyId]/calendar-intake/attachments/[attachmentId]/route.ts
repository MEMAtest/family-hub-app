import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export const GET = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId, attachmentId } = await context.params;
    const attachment = await prisma.calendarIntakeAttachment.findFirst({
      where: {
        id: attachmentId,
        intake: { familyId },
      },
      select: {
        fileName: true,
        mimeType: true,
        data: true,
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Document attachment was not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(attachment.data), {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `inline; filename="${attachment.fileName.replace(/["\r\n]/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Calendar intake attachment error:', error);
    return NextResponse.json({ error: 'Failed to load document attachment' }, { status: 500 });
  }
});
