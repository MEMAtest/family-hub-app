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
  const [family, dbEvents, dbTasks] = await Promise.all([
    prisma.family.findUnique({
      where: { id: familyId },
      include: { members: { orderBy: { createdAt: 'asc' }, include: { user: true } } },
    }),
    prisma.calendarEvent.findMany({ where: { familyId } }),
    prisma.calendarTask.findMany({ where: { familyId } }).catch(() => []),
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

  // Only adults with a linked account have somewhere to send it.
  const recipients = family.members
    .filter((member) => member.user?.email)
    .map((member) => ({ email: member.user!.email, name: member.name }));

  return { family, digest, recipients };
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

      const { family, digest } = loaded;
      const recipients = only
        ? loaded.recipients.filter((r) => r.email.toLowerCase() === only)
        : loaded.recipients;

      if (only && recipients.length === 0) {
        results.push({ familyId: id, skipped: `"${only}" is not a recipient of this household` });
        continue;
      }
      const subject = renderWeeklyDigestSubject(digest, family.familyName);
      const html = renderWeeklyDigestHtml(digest, family.familyName);
      const text = renderWeeklyDigestText(digest, family.familyName);

      if (preview) {
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }

      if (dryRun) {
        results.push({ familyId: id, subject, recipients: recipients.map((r) => r.email), events: digest.eventCount, tasks: digest.tasks.length, clashes: digest.clashes.length, sent: false });
        continue;
      }

      let sent = 0;
      for (const recipient of recipients) {
        const ok = await emailService.sendRawEmail(recipient, subject, html, text);
        if (ok) sent += 1;
      }

      results.push({ familyId: id, subject, sent, of: recipients.length, events: digest.eventCount, tasks: digest.tasks.length, clashes: digest.clashes.length });
    }

    return NextResponse.json({ weekStart, families: results.length, results });
  } catch (error) {
    console.error('Weekly digest failed:', error);
    return NextResponse.json({ error: 'Weekly digest failed' }, { status: 500 });
  }
}
