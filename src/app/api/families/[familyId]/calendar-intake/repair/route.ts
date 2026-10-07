import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { applySchoolRepair, buildSchoolRepairPlan, schoolRepairResponse, SchoolRepairConflict } from '@/lib/schoolIntakeRepair';

export const runtime = 'nodejs';
const requestSchema = z.object({ mode: z.enum(['dry-run', 'apply']).default('dry-run'),
  intakeIds: z.array(z.string().min(1)).min(1).max(50).optional(), afterId: z.string().min(1).optional(),
  planHash: z.string().regex(/^[a-f0-9]{64}$/).optional(), approvedEventIds: z.array(z.string().min(1)).max(1000).default([]),
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const body = requestSchema.parse(await request.json());
    if (body.mode === 'dry-run') return NextResponse.json(schoolRepairResponse(await buildSchoolRepairPlan(familyId, body.intakeIds, body.afterId)));
    if (!body.planHash) return NextResponse.json({ error: 'Preview the repair before applying it' }, { status: 400 });
    return NextResponse.json(await applySchoolRepair(familyId, { ...body, planHash: body.planHash }, authUser.familyMemberId));
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid school repair request' }, { status: 400 });
    if (error instanceof SchoolRepairConflict || ['P2034', 'P2002'].includes((error as { code?: string }).code || '')) {
      return NextResponse.json({ error: 'The repair changed on another device. Preview again.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'School repair could not be completed' }, { status: 500 });
  }
});
