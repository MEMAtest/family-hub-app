import { NextResponse } from 'next/server';
import { requireFamilyAccess } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { schoolMetadata } from '@/utils/schoolSources';
import { getSavedSchoolEventMetadata } from '@/lib/schoolIntakeServer';
import { grandirPostUrl } from '@/lib/grandirClient';

export const GET = requireFamilyAccess(async (_request, context) => {
  const { familyId, eventId } = await context.params;
  const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, familyId },
    select: { id: true, sourceId: true, title: true, personId: true, eventDate: true, metadata: true } });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!event.sourceId) return NextResponse.json({ source: null });
  const intake = await prisma.calendarEmailIntake.findFirst({ where: { id: event.sourceId, familyId },
    select: { id: true, familyId: true, subject: true, sender: true, receivedAt: true, metadata: true,
      normalizedText: true, text: true, html: true, parsedDrafts: true } });
  if (!intake) return NextResponse.json({ source: null });
  const metadata = schoolMetadata(intake.metadata);
  const portalPostId = schoolMetadata(metadata.grandirPortal).postId;
  const threadId = metadata.gmailThreadId || metadata.gmailMessageId;
  const trusted = await getSavedSchoolEventMetadata(familyId, event, intake);
  return NextResponse.json({ source: {
    institution: trusted?.schoolProvenance.institutionName || metadata.schoolSource?.institutionName || null,
    schoolAssignment: trusted?.schoolAssignment || null,
    schoolProvenance: trusted?.schoolProvenance || null,
    sender: intake.sender, subject: intake.subject, receivedAt: intake.receivedAt,
    originalText: intake.normalizedText,
    originalPortalUrl: typeof portalPostId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(portalPostId) ? grandirPostUrl(portalPostId) : null,
    messageUrl: typeof threadId === 'string' && /^[a-zA-Z0-9]+$/.test(threadId)
      ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(process.env.GOOGLE_GMAIL_ACCOUNT || '')}#all/${threadId}` : null,
  } });
});
