import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const updateNodeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'done', 'blocked', 'idea']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional().nullable(),
  nodeType: z.enum(['thought', 'task', 'idea', 'note', 'milestone']).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  tags: z.array(z.string()).optional(),
  showOnCalendar: z.boolean().optional(),
});

export const PUT = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId, nodeId } = await context.params;
    const raw = await request.json();
    const body = updateNodeSchema.parse(raw);

    // Verify node belongs to a project in this family
    const existing = await prisma.brainNode.findFirst({
      where: { id: nodeId, project: { familyId } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const data: Record<string, any> = { ...body };
    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    const node = await prisma.brainNode.update({
      where: { id: nodeId },
      data,
    });

    return NextResponse.json(node);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid node payload' }, { status: 400 });
    }
    console.error('Error updating brain node:', error);
    return NextResponse.json({ error: 'Failed to update brain node' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId, nodeId } = await context.params;

    const existing = await prisma.brainNode.findFirst({
      where: { id: nodeId, project: { familyId } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    await prisma.brainNode.delete({ where: { id: nodeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brain node:', error);
    return NextResponse.json({ error: 'Failed to delete brain node' }, { status: 500 });
  }
});
