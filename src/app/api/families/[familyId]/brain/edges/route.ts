import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const createEdgeSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  label: z.string().optional().nullable(),
  edgeType: z.enum(['default', 'dependency', 'related', 'sequence']).default('default'),
  animated: z.boolean().default(false),
});

export const GET = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where: Record<string, any> = {
      project: { familyId },
    };

    if (projectId) where.projectId = projectId;

    const edges = await prisma.brainEdge.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(edges);
  } catch (error) {
    console.error('Error fetching brain edges:', error);
    return NextResponse.json({ error: 'Failed to fetch brain edges' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const raw = await request.json();
    const body = createEdgeSchema.parse(raw);

    // Verify project belongs to family
    const project = await prisma.brainProject.findFirst({
      where: { id: body.projectId, familyId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const edge = await prisma.brainEdge.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        projectId: body.projectId,
        sourceNodeId: body.sourceNodeId,
        targetNodeId: body.targetNodeId,
        label: body.label,
        edgeType: body.edgeType,
        animated: body.animated,
      },
    });

    return NextResponse.json(edge, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid edge payload' }, { status: 400 });
    }
    // Handle unique constraint violation
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Edge already exists between these nodes' }, { status: 409 });
    }
    console.error('Error creating brain edge:', error);
    return NextResponse.json({ error: 'Failed to create brain edge' }, { status: 500 });
  }
});
