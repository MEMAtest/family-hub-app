import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const createAppointmentSchema = z.object({
  id: z.string().min(1).optional(),
  contractorId: z.string().min(1),
  date: dateSchema,
  time: timeSchema,
  durationMinutes: z.number().int().positive(),
  purpose: z.string().min(1),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  calendarEventId: z.string().optional().nullable(),
});

export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const contractorId = searchParams.get('contractorId');

    const where: Record<string, any> = { familyId };
    if (contractorId) {
      where.contractorId = contractorId;
    }
    if (status) {
      where.status = status;
    }
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }

    const appointments = await prisma.contractorAppointment.findMany({
      where,
      include: { contractor: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    const transformed = appointments.map(({ durationMinutes, ...rest }) => ({
      ...rest,
      duration: durationMinutes,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching contractor appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const raw = await request.json();
    const body = createAppointmentSchema.parse(raw);

    const contractor = await prisma.contractor.findFirst({
      where: { id: body.contractorId, familyId },
      select: { id: true },
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const appointment = await prisma.contractorAppointment.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        familyId,
        contractorId: body.contractorId,
        date: body.date,
        time: body.time,
        durationMinutes: body.durationMinutes,
        purpose: body.purpose,
        location: body.location ?? undefined,
        notes: body.notes ?? undefined,
        cost: body.cost ?? undefined,
        status: body.status ?? 'scheduled',
        calendarEventId: body.calendarEventId ?? undefined,
      },
      include: { contractor: true },
    });

    const { durationMinutes, ...rest } = appointment;
    return NextResponse.json({ ...rest, duration: durationMinutes }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid appointment payload' }, { status: 400 });
    }
    console.error('Error creating contractor appointment:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
});
