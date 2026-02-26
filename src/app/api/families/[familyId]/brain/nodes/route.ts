import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const createNodeSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  title: z.string().min(1).max(255),
  content: z.string().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'done', 'blocked', 'idea']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().optional().nullable(),
  nodeType: z.enum(['thought', 'task', 'idea', 'note', 'milestone']).default('thought'),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  tags: z.array(z.string()).default([]),
  showOnCalendar: z.boolean().default(false),
});

export const GET = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const dueDateStr = searchParams.get('dueDate');
    const showOnCalendar = searchParams.get('showOnCalendar');

    const where: Record<string, any> = {
      project: { familyId },
    };

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (dueDateStr) {
      const parsed = new Date(dueDateStr);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
      where.dueDate = { lte: parsed };
    }
    if (showOnCalendar === 'true') where.showOnCalendar = true;

    const nodes = await prisma.brainNode.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(nodes);
  } catch (error) {
    console.error('Error fetching brain nodes:', error);
    return NextResponse.json({ error: 'Failed to fetch brain nodes' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const raw = await request.json();
    const body = createNodeSchema.parse(raw);

    // Verify project belongs to family
    const project = await prisma.brainProject.findFirst({
      where: { id: body.projectId, familyId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const node = await prisma.brainNode.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        projectId: body.projectId,
        title: body.title,
        content: body.content,
        status: body.status,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        nodeType: body.nodeType,
        positionX: body.positionX,
        positionY: body.positionY,
        tags: body.tags,
        showOnCalendar: body.showOnCalendar,
      },
    });

    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid node payload' }, { status: 400 });
    }
    console.error('Error creating brain node:', error);
    return NextResponse.json({ error: 'Failed to create brain node' }, { status: 500 });
  }
});
