import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const createProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366F1'),
  icon: z.string().min(1).default('brain'),
  status: z.enum(['active', 'archived', 'completed']).default('active'),
  sortOrder: z.number().int().optional(),
  goalId: z.string().optional().nullable(),
});

export const GET = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, any> = { familyId };
    if (status) where.status = status;

    const projects = await prisma.brainProject.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { nodes: true } } },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching brain projects:', error);
    return NextResponse.json({ error: 'Failed to fetch brain projects' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const raw = await request.json();
    const body = createProjectSchema.parse(raw);

    const project = await prisma.brainProject.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        familyId,
        name: body.name,
        description: body.description,
        color: body.color,
        icon: body.icon,
        status: body.status,
        sortOrder: body.sortOrder ?? 0,
        goalId: body.goalId ?? null,
      },
      include: { _count: { select: { nodes: true } } },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid project payload' }, { status: 400 });
    }
    console.error('Error creating brain project:', error);
    return NextResponse.json({ error: 'Failed to create brain project' }, { status: 500 });
  }
});
