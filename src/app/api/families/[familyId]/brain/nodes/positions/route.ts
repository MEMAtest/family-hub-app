import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const batchPositionSchema = z.object({
  positions: z.array(z.object({
    id: z.string().min(1),
    positionX: z.number(),
    positionY: z.number(),
  })).min(1).max(500),
});

export const PUT = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const raw = await request.json();
    const { positions } = batchPositionSchema.parse(raw);

    // Batch update using transaction
    await prisma.$transaction(
      positions.map((pos) =>
        prisma.brainNode.updateMany({
          where: {
            id: pos.id,
            project: { familyId },
          },
          data: {
            positionX: pos.positionX,
            positionY: pos.positionY,
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: positions.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid positions payload' }, { status: 400 });
    }
    console.error('Error updating node positions:', error);
    return NextResponse.json({ error: 'Failed to update positions' }, { status: 500 });
  }
});
