import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireFamilyAccess } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { loadSchoolRules } from '@/lib/schoolIntakeServer';
import { SCHOOL_RULES_KEY, validateSchoolRules } from '@/utils/schoolSources';

export const GET = requireFamilyAccess(async (_request: NextRequest, context) => {
  const { familyId } = await context.params;
  const members = await prisma.familyMember.findMany({ where: { familyId } });
  return NextResponse.json(await loadSchoolRules(familyId, members));
});

export const PUT = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    if (!Number.isInteger(body.baseVersion) || body.baseVersion < 0) return NextResponse.json({ error: 'A baseVersion is required' }, { status: 400 });
    const members = await prisma.familyMember.findMany({ where: { familyId } });
    const rules = validateSchoolRules(body.rules, members);
    const data = rules as unknown as Prisma.InputJsonValue;
    if (body.baseVersion === 0) {
      const saved = await prisma.familyDocument.create({ data: { familyId, key: SCHOOL_RULES_KEY, data, updatedBy: authUser.familyMemberId } });
      return NextResponse.json({ rules, version: saved.version }, { status: 201 });
    }
    const saved = await prisma.familyDocument.updateMany({ where: { familyId, key: SCHOOL_RULES_KEY, version: body.baseVersion },
      data: { data, updatedBy: authUser.familyMemberId, version: { increment: 1 } } });
    if (!saved.count) return NextResponse.json({ error: 'Source rules changed. Reload before saving.' }, { status: 409 });
    return NextResponse.json({ rules, version: body.baseVersion + 1 });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Source rules changed. Reload before saving.' }, { status: 409 });
    return NextResponse.json({ error: 'Invalid school source rules or unavailable storage' }, { status: 400 });
  }
});
