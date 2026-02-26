import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const GET = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const nodes = await prisma.brainNode.findMany({
      where: {
        project: { familyId },
        status: { not: 'done' },
        dueDate: { lte: endOfToday },
      },
      include: {
        project: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });

    // Group by project using Map for O(n) performance
    const grouped = new Map<string, { project: typeof nodes[0]['project']; nodes: typeof nodes }>();
    for (const node of nodes) {
      const pid = node.project.id;
      let group = grouped.get(pid);
      if (!group) {
        group = { project: node.project, nodes: [] };
        grouped.set(pid, group);
      }
      group.nodes.push(node);
    }

    return NextResponse.json({
      total: nodes.length,
      groups: Array.from(grouped.values()),
    });
  } catch (error) {
    console.error('Error fetching today brain nodes:', error);
    return NextResponse.json({ error: 'Failed to fetch today nodes' }, { status: 500 });
  }
});
