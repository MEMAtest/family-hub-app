import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const updateAppointmentSchema = z.object({
  contractorId: z.string().min(1).optional(),
  date: dateSchema.optional(),
  time: timeSchema.optional(),
  durationMinutes: z.number().int().positive().optional(),
  purpose: z.string().min(1).optional(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  calendarEventId: z.string().optional().nullable(),
});

export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, appointmentId } = await context.params;
    const raw = await request.json();
    const updates = updateAppointmentSchema.parse(raw);

    const existing = await prisma.contractorAppointment.findFirst({
      where: { id: appointmentId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (updates.contractorId) {
      const contractor = await prisma.contractor.findFirst({
        where: { id: updates.contractorId, familyId },
        select: { id: true },
      });
      if (!contractor) {
        return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
      }
    }

    const appointment = await prisma.contractorAppointment.update({
      where: { id: appointmentId },
      data: {
        ...updates,
        location: updates.location ?? undefined,
        notes: updates.notes ?? undefined,
        cost: updates.cost ?? undefined,
        calendarEventId: updates.calendarEventId ?? undefined,
      },
      include: { contractor: true },
    });

    const { durationMinutes, ...rest } = appointment;
    return NextResponse.json({ ...rest, duration: durationMinutes });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid appointment payload' }, { status: 400 });
    }
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, appointmentId } = await context.params;

    const existing = await prisma.contractorAppointment.findFirst({
      where: { id: appointmentId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    await prisma.contractorAppointment.delete({ where: { id: appointmentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
  }
});
