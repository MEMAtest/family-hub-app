/**
 * Send one weekly digest to a single address, built from live data.
 *
 * Read-only: it queries events, tasks and members and writes nothing back.
 * The recipient comes from TEST_TO so this can never fan out to a household by
 * accident — the scheduled route is the only thing that mails everyone.
 *
 *   npx tsx --env-file=.env.local scripts/send-digest-test.ts
 */
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { writeFileSync } from 'fs';
import { buildWeeklyDigest, mondayOf } from '@/lib/weeklyDigest';
import {
  renderWeeklyDigestHtml,
  renderWeeklyDigestSubject,
  renderWeeklyDigestText,
} from '@/lib/weeklyDigestEmail';
import { toCalendarEventResponse } from '@/lib/calendarEventMapping';
import type { CalendarEvent, CalendarTask, Person } from '@/types/calendar.types';

const prisma = new PrismaClient();
const toKey = (value: Date) => value.toISOString().slice(0, 10);

async function main() {
  const to = process.env.TEST_TO;
  if (!to) throw new Error('TEST_TO is required');

  const family = await prisma.family.findFirst({
    orderBy: { createdAt: 'asc' },
    include: { members: { orderBy: { createdAt: 'asc' } } },
  });
  if (!family) throw new Error('No family found');

  const [dbEvents, dbTasks] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { familyId: family.id } }),
    prisma.calendarTask.findMany({ where: { familyId: family.id } }).catch(() => [] as unknown[]),
  ]);

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
    assignedDate: toKey(task.assignedDate),
    dueDate: toKey(task.dueDate),
    completedAt: task.completedAt ? task.completedAt.toISOString() : undefined,
    taskType: task.taskType,
    subject: task.subject ?? undefined,
    priority: task.priority,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));

  const weekStart = mondayOf(toKey(new Date()));
  const digest = buildWeeklyDigest(events, tasks, people, weekStart);
  const subject = renderWeeklyDigestSubject(digest, family.familyName);
  const html = renderWeeklyDigestHtml(digest, family.familyName);
  const text = renderWeeklyDigestText(digest, family.familyName);

  const outPath = process.env.DIGEST_OUT;
  if (outPath) writeFileSync(outPath, html);

  console.log(`family: ${family.familyName} | members: ${people.length} | stored events: ${events.length} | tasks: ${tasks.length}`);
  console.log(`week starting ${weekStart}`);
  console.log(`occurrences: ${digest.eventCount} | due: ${digest.tasks.length} | clashes: ${digest.clashes.length}`);
  console.log(`subject: ${subject}`);
  console.log('----');
  console.log(text);
  console.log('----');

  if (process.env.DIGEST_DRY === '1') {
    console.log('dry run: nothing sent');
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: 'Family Hub <onboarding@resend.dev>',
    to,
    subject: `[test] ${subject}`,
    html,
    text,
  });

  console.log('send result:', JSON.stringify(result));
}

main()
  .catch((error) => {
    console.error('failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
