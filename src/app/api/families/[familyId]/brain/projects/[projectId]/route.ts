import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().min(1).optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
  sortOrder: z.number().int().optional(),
  goalId: z.string().optional().nullable(),
});

export const GET = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId, projectId } = await context.params;

    const project = await prisma.brainProject.findFirst({
      where: { id: projectId, familyId },
      include: {
        nodes: { orderBy: { createdAt: 'asc' } },
        edges: true,
        _count: { select: { nodes: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching brain project:', error);
    return NextResponse.json({ error: 'Failed to fetch brain project' }, { status: 500 });
  }
});

export const PUT = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId, projectId } = await context.params;
    const raw = await request.json();
    const body = updateProjectSchema.parse(raw);

    const project = await prisma.brainProject.updateMany({
      where: { id: projectId, familyId },
      data: body,
    });

    if (project.count === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updated = await prisma.brainProject.findUnique({
      where: { id: projectId },
      include: { _count: { select: { nodes: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid project payload' }, { status: 400 });
    }
    console.error('Error updating brain project:', error);
    return NextResponse.json({ error: 'Failed to update brain project' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId, projectId } = await context.params;

    const result = await prisma.brainProject.deleteMany({
      where: { id: projectId, familyId },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brain project:', error);
    return NextResponse.json({ error: 'Failed to delete brain project' }, { status: 500 });
  }
});
