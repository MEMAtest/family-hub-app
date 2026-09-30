import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { isDateKey, parseDateKey } from '@/utils/recurrence';

const toTaskResponse = (task: any) => ({
  id: task.id,
  title: task.title,
  assignees: task.assignees,
  assignedDate: task.assignedDate.toISOString().slice(0, 10),
  dueDate: task.dueDate.toISOString().slice(0, 10),
  dueTime: task.dueTime ?? undefined,
  completedAt: task.completedAt?.toISOString() ?? null,
  completedBy: task.completedBy ?? null,
  taskType: task.taskType,
  subject: task.subject ?? undefined,
  notes: task.notes ?? undefined,
  priority: task.priority,
  effortMinutes: task.effortMinutes ?? undefined,
  sourceEventId: task.sourceEventId ?? undefined,
  recurringPattern: task.recurrenceRule ?? undefined,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const dateValue = (value: unknown) =>
  typeof value === 'string' && isDateKey(value) && parseDateKey(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : null;

export const GET = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const tasks = await prisma.calendarTask.findMany({
      where: { familyId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 500,
    });
    return NextResponse.json(tasks.map(toTaskResponse));
  } catch (error) {
    console.error('Calendar tasks fetch failed:', error);
    return NextResponse.json({ error: 'Could not load family reminders' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    const assignedDate = dateValue(body.assignedDate);
    const dueDate = dateValue(body.dueDate);
    const assignees = Array.isArray(body.assignees)
      ? Array.from(new Set<string>(body.assignees.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)))
      : [];

    if (typeof body.title !== 'string' || !body.title.trim() || !assignedDate || !dueDate || dueDate < assignedDate) {
      return NextResponse.json({ error: 'A title and valid task dates are required' }, { status: 400 });
    }

    if (assignees.length > 0) {
      const validMembers = await prisma.familyMember.findMany({
        where: { id: { in: assignees }, familyId },
        select: { id: true },
      });
      if (validMembers.length !== assignees.length) {
        return NextResponse.json({ error: 'Choose a family member from this household' }, { status: 400 });
      }
    }

    const task = await prisma.calendarTask.create({
      data: {
        familyId,
        title: body.title.trim(),
        assignees,
        assignedDate,
        dueDate,
        dueTime: typeof body.dueTime === 'string' ? body.dueTime : null,
        taskType: typeof body.taskType === 'string' ? body.taskType : 'other',
        subject: typeof body.subject === 'string' ? body.subject : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        priority: ['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium',
        effortMinutes: Number.isInteger(body.effortMinutes) ? body.effortMinutes : null,
        sourceEventId: typeof body.sourceEventId === 'string' ? body.sourceEventId : null,
        recurrenceRule: body.recurringPattern && typeof body.recurringPattern === 'object'
          ? body.recurringPattern
          : undefined,
      },
    });
    return NextResponse.json(toTaskResponse(task), { status: 201 });
  } catch (error) {
    console.error('Calendar task create failed:', error);
    return NextResponse.json({ error: 'Could not save this family reminder' }, { status: 500 });
  }
});

export const PATCH = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: 'A task id is required' }, { status: 400 });
    }
    const existing = await prisma.calendarTask.findFirst({ where: { id: body.id, familyId } });
    if (!existing) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });

    const assignedDate = body.assignedDate === undefined ? existing.assignedDate : dateValue(body.assignedDate);
    const dueDate = body.dueDate === undefined ? existing.dueDate : dateValue(body.dueDate);
    if (!assignedDate || !dueDate || dueDate < assignedDate) {
      return NextResponse.json({ error: 'Task dates are invalid' }, { status: 400 });
    }
    const data: Record<string, unknown> = { assignedDate, dueDate };
    for (const key of ['title', 'taskType', 'subject', 'notes', 'priority', 'dueTime', 'completedBy', 'sourceEventId']) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.completedAt !== undefined) data.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    if (body.recurringPattern !== undefined) data.recurrenceRule = body.recurringPattern;
    if (Array.isArray(body.assignees)) {
      const assignees = Array.from(new Set<string>(body.assignees.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)));
      const validMembers = await prisma.familyMember.findMany({
        where: { id: { in: assignees }, familyId },
        select: { id: true },
      });
      if (validMembers.length !== assignees.length) {
        return NextResponse.json({ error: 'Choose a family member from this household' }, { status: 400 });
      }
      data.assignees = assignees;
    }

    const task = await prisma.calendarTask.update({ where: { id: body.id }, data });
    return NextResponse.json(toTaskResponse(task));
  } catch (error) {
    console.error('Calendar task update failed:', error);
    return NextResponse.json({ error: 'Could not update this family reminder' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: 'A task id is required' }, { status: 400 });
    }
    const deleted = await prisma.calendarTask.deleteMany({ where: { id: body.id, familyId } });
    if (deleted.count === 0) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Calendar task delete failed:', error);
    return NextResponse.json({ error: 'Could not delete this family reminder' }, { status: 500 });
  }
});
