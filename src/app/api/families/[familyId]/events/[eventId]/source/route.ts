import { NextResponse } from 'next/server';
import { requireFamilyAccess } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { schoolMetadata } from '@/utils/schoolSources';

export const GET = requireFamilyAccess(async (_request, context) => {
  const { familyId, eventId } = await context.params;
  const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, familyId }, select: { sourceId: true } });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!event.sourceId) return NextResponse.json({ source: null });
  const intake = await prisma.calendarEmailIntake.findFirst({ where: { id: event.sourceId, familyId },
    select: { subject: true, sender: true, receivedAt: true, metadata: true, normalizedText: true } });
  if (!intake) return NextResponse.json({ source: null });
  const metadata = schoolMetadata(intake.metadata);
  const threadId = metadata.gmailThreadId || metadata.gmailMessageId;
  return NextResponse.json({ source: {
    institution: metadata.schoolSource?.institutionName || null,
    sender: intake.sender, subject: intake.subject, receivedAt: intake.receivedAt,
    originalText: intake.normalizedText,
    messageUrl: typeof threadId === 'string' && /^[a-zA-Z0-9]+$/.test(threadId)
      ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(process.env.GOOGLE_GMAIL_ACCOUNT || '')}#all/${threadId}` : null,
  } });
});
