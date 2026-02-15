import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, categoryId } = await context.params;
    const body = await request.json();

    const existing = await prisma.budgetCategory.findFirst({
      where: { id: categoryId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updated = await prisma.budgetCategory.update({
      where: { id: categoryId },
      data: {
        categoryName: body.categoryName ? String(body.categoryName) : undefined,
        categoryType:
          body.categoryType === 'income' || body.categoryType === 'expense'
            ? body.categoryType
            : undefined,
        budgetLimit:
          body.budgetLimit === null
            ? null
            : body.budgetLimit === undefined
              ? undefined
              : Number(body.budgetLimit),
        colorCode: body.colorCode === null ? null : body.colorCode ? String(body.colorCode) : undefined,
        iconName: body.iconName === null ? null : body.iconName ? String(body.iconName) : undefined,
        isActive: body.isActive === undefined ? undefined : Boolean(body.isActive),
        sortOrder: body.sortOrder === undefined ? undefined : Number(body.sortOrder),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating budget category:', error);
    return NextResponse.json({ error: 'Failed to update budget category' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, categoryId } = await context.params;

    const existing = await prisma.budgetCategory.findFirst({
      where: { id: categoryId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await prisma.budgetCategory.delete({ where: { id: categoryId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget category:', error);
    return NextResponse.json({ error: 'Failed to delete budget category' }, { status: 500 });
  }
});

