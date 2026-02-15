import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = { familyId };

    if (type === 'income' || type === 'expense') {
      where.categoryType = type;
    }

    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await prisma.budgetCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { categoryName: 'asc' }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching budget categories:', error);
    return NextResponse.json({ error: 'Failed to fetch budget categories' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();

    if (!body?.categoryName || !body?.categoryType) {
      return NextResponse.json(
        { error: 'Missing required fields: categoryName, categoryType' },
        { status: 400 }
      );
    }

    if (body.categoryType !== 'income' && body.categoryType !== 'expense') {
      return NextResponse.json(
        { error: "Invalid categoryType. Must be 'income' or 'expense'." },
        { status: 400 }
      );
    }

    const created = await prisma.budgetCategory.create({
      data: {
        familyId,
        categoryName: String(body.categoryName),
        categoryType: body.categoryType,
        budgetLimit: body.budgetLimit === null || body.budgetLimit === undefined ? null : Number(body.budgetLimit),
        colorCode: body.colorCode ? String(body.colorCode) : null,
        iconName: body.iconName ? String(body.iconName) : null,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
        sortOrder: body.sortOrder === undefined ? 0 : Number(body.sortOrder),
      },
    });

    return NextResponse.json(created);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    }

    console.error('Error creating budget category:', error);
    return NextResponse.json({ error: 'Failed to create budget category' }, { status: 500 });
  }
});

