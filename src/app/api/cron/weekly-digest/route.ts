import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { toCalendarEventResponse } from '@/lib/calendarEventMapping';
import { buildWeeklyDigest, mondayOf } from '@/lib/weeklyDigest';
import {
  renderWeeklyDigestHtml,
  renderWeeklyDigestSubject,
  renderWeeklyDigestText,
} from '@/lib/weeklyDigestEmail';
import type { CalendarEvent, CalendarTask, Person } from '@/types/calendar.types';
import { emailService } from '@/services/emailService';
import { GmailSendUnavailable, sendViaGmail } from '@/lib/gmailSend';
import { buildDigestExtras } from '@/lib/weeklyDigestExtras';
import { normalizeDigestPreferences, type KidsEventMark } from '@/lib/sharedDocuments';
import type { PropertyIssue } from '@/types/property.types';

/**
 * Monday morning digest.
 *
 * Scheduled by Vercel Cron. Also callable by hand with `?preview=1` to render
 * the email for a family without sending anything, which is how you check what
 * it looks like before letting it loose on a household.
 *
 * Authorisation: `Authorization: Bearer $CRON_SECRET`. Vercel Cron sends that
 * header automatically. Without CRON_SECRET set the route refuses rather than
 * running open, because it sends mail to real people.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const authorised = (request: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${secret}`;
};

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

const loadFamilyDigest = async (familyId: string, weekStart: string) => {
  const [family, dbEvents, dbTasks, documents] = await Promise.all([
    prisma.family.findUnique({
      where: { id: familyId },
      include: { members: { orderBy: { createdAt: 'asc' }, include: { user: true } } },
    }),
    prisma.calendarEvent.findMany({ where: { familyId } }),
    prisma.calendarTask.findMany({ where: { familyId } }).catch(() => []),
    // Shared household data; missing until the family_documents table exists.
    prisma.familyDocument
      .findMany({ where: { familyId, key: { in: ['digest.preferences', 'property.issues', 'kids.marks'] } }, select: { key: true, data: true } })
      .catch(() => [] as Array<{ key: string; data: unknown }>),
  ]);

  if (!family) return null;

  const people: Person[] = family.members.map((member) => ({
    id: member.id,
    name: member.name,
    color: member.color,
    icon: member.icon,
    role: member.role,
    ageGroup: member.ageGroup,
  }));

  const events = dbEvents.map(toCalendarEventResponse) as unknown as CalendarEvent[];

  const tasks: CalendarTask[] = (dbTasks as any[]).map((task) => ({
    id: task.id,
    title: task.title,
    assignees: task.assignees ?? [],
    assignedDate: toDateKey(task.assignedDate),
    dueDate: toDateKey(task.dueDate),
    dueTime: task.dueTime ?? undefined,
    completedAt: task.completedAt ? task.completedAt.toISOString() : undefined,
    taskType: task.taskType,
    subject: task.subject ?? undefined,
    notes: task.notes ?? undefined,
    priority: task.priority,
    effortMinutes: task.effortMinutes ?? undefined,
    sourceEventId: task.sourceEventId ?? undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));

  const digest = buildWeeklyDigest(events, tasks, people, weekStart);

  const doc = (key: string) => documents.find((d) => d.key === key)?.data;
  const preferences = normalizeDigestPreferences(doc('digest.preferences'));
  const asList = <T,>(value: unknown) => (Array.isArray(value) ? (value as T[]) : []);
  const extras = buildDigestExtras({
    preferences,
    issues: asList<PropertyIssue>(doc('property.issues')),
    marks: asList<KidsEventMark>(doc('kids.marks')),
    weekStart,
  });

  // Adults with a linked account, plus any extra addresses the household added.
  const recipients = family.members
    .filter((member) => member.user?.email)
    .map((member) => ({ email: member.user!.email, name: member.name }));
  const known = new Set(recipients.map((r) => r.email.toLowerCase()));
  for (const email of preferences.extraRecipients) {
    if (!known.has(email)) {
      recipients.push({ email, name: email });
      known.add(email);
    }
  }

  return { family, digest, extras, recipients };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const preview = searchParams.get('preview') === '1';
  const dryRun = preview || searchParams.get('dry') === '1';
  const familyId = searchParams.get('familyId');
  // Narrow a real send to one person — for trying it out without mailing the
  // whole household. It can only ever *filter* the recipients the digest had
  // already resolved, so it cannot be used to send to an arbitrary address.
  const only = searchParams.get('only')?.toLowerCase() ?? null;
  const weekStart = mondayOf(searchParams.get('week') || toDateKey(new Date()));

  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const familyIds = familyId
      ? [familyId]
      : (await prisma.family.findMany({ select: { id: true } })).map((f) => f.id);

    const results: Array<Record<string, unknown>> = [];

    for (const id of familyIds) {
      const loaded = await loadFamilyDigest(id, weekStart);
      if (!loaded) {
        results.push({ familyId: id, skipped: 'family not found' });
        continue;
      }

      const { family, digest, extras } = loaded;
      const recipients = only
        ? loaded.recipients.filter((r) => r.email.toLowerCase() === only)
        : loaded.recipients;

      if (only && recipients.length === 0) {
        results.push({ familyId: id, skipped: `"${only}" is not a recipient of this household` });
        continue;
      }
      const subject = renderWeeklyDigestSubject(digest, family.familyName, extras);
      const html = renderWeeklyDigestHtml(digest, family.familyName, extras);
      const text = renderWeeklyDigestText(digest, family.familyName, extras);

      if (preview) {
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }

      if (dryRun) {
        results.push({ familyId: id, subject, recipients: recipients.map((r) => r.email), events: digest.eventCount, tasks: digest.tasks.length, clashes: digest.clashes.length, kidsIdeas: extras.kidsIdeas.length, homeJobs: extras.homeJobsTotal, sent: false });
        continue;
      }

      // Prefer the household's own Gmail. It arrives from an address the family
      // recognises and needs no verified domain; Resend is the fallback for
      // households that have not connected Google.
      let sent = 0;
      let via = 'resend';
      let gmailNote: string | undefined;
      // A count alone hides the interesting case: nothing arrived and nobody
      // said why. Record each failure so the response explains itself.
      const failures: string[] = [];

      for (const recipient of recipients) {
        try {
          await sendViaGmail(id, { to: recipient.email, subject, html, text });
          via = 'gmail';
          sent += 1;
          continue;
        } catch (error) {
          if (!(error instanceof GmailSendUnavailable)) throw error;
          gmailNote = error.message;
        }

        const ok = await emailService.sendRawEmail(recipient, subject, html, text);
        if (ok) {
          sent += 1;
        } else {
          failures.push(`${recipient.email}: Resend did not accept the message (see server logs)`);
        }
      }

      results.push({
        familyId: id,
        subject,
        sent,
        of: recipients.length,
        via,
        ...(gmailNote ? { gmailNote } : {}),
        ...(failures.length ? { failures } : {}),
        events: digest.eventCount,
        tasks: digest.tasks.length,
        clashes: digest.clashes.length,
        kidsIdeas: extras.kidsIdeas.length,
        homeJobs: extras.homeJobsTotal,
      });
    }

    return NextResponse.json({ weekStart, families: results.length, results });
  } catch (error) {
    console.error('Weekly digest failed:', error);
    return NextResponse.json({ error: 'Weekly digest failed' }, { status: 500 });
  }
}
