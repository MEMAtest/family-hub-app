import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const GET = requireFamilyAccess(async (_request: NextRequest, context) => {
  const { familyId } = await context.params;
  const accounts = await prisma.budgetAccount.findMany({
    where: { familyId },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
  return NextResponse.json(accounts);
});

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'Account name is required.' }, { status: 400 });

    const account = await prisma.budgetAccount.create({
      data: {
        familyId,
        name,
        institution: typeof body.institution === 'string' ? body.institution.trim() || null : null,
        accountType: typeof body.accountType === 'string' ? body.accountType : 'current',
        lastFour: typeof body.lastFour === 'string' ? body.lastFour.replace(/\D/g, '').slice(-4) || null : null,
      },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Create budget account error:', error);
    return NextResponse.json({ error: 'Could not create the account.' }, { status: 500 });
  }
});
