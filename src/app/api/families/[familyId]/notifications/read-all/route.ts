import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const POST = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;

    await prisma.notification.updateMany({
      where: { familyId, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    return NextResponse.json({ error: 'Failed to mark notifications read' }, { status: 500 });
  }
});
