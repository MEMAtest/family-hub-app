import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const updateEdgeSchema = z.object({
  label: z.string().optional().nullable(),
  edgeType: z.enum(['default', 'dependency', 'related', 'sequence']).optional(),
  animated: z.boolean().optional(),
});

export const PUT = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId, edgeId } = await context.params;
    const raw = await request.json();
    const body = updateEdgeSchema.parse(raw);

    const existing = await prisma.brainEdge.findFirst({
      where: { id: edgeId, project: { familyId } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Edge not found' }, { status: 404 });
    }

    const edge = await prisma.brainEdge.update({
      where: { id: edgeId },
      data: body,
    });

    return NextResponse.json(edge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid edge payload' }, { status: 400 });
    }
    console.error('Error updating brain edge:', error);
    return NextResponse.json({ error: 'Failed to update brain edge' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId, edgeId } = await context.params;

    const existing = await prisma.brainEdge.findFirst({
      where: { id: edgeId, project: { familyId } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Edge not found' }, { status: 404 });
    }

    await prisma.brainEdge.delete({ where: { id: edgeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brain edge:', error);
    return NextResponse.json({ error: 'Failed to delete brain edge' }, { status: 500 });
  }
});
