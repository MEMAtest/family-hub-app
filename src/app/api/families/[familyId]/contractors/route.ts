import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const createContractorSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  company: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  address: z.string().min(1).optional(),
  specialty: z.string().min(1),
  notes: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const q = searchParams.get('q');

    const where: Record<string, any> = { familyId };
    if (specialty) {
      where.specialty = specialty;
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const contractors = await prisma.contractor.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return NextResponse.json(contractors);
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const raw = await request.json();
    const body = createContractorSchema.parse(raw);

    const contractor = await prisma.contractor.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        familyId,
        name: body.name,
        company: body.company,
        phone: body.phone,
        email: body.email,
        address: body.address,
        specialty: body.specialty,
        notes: body.notes,
        rating: body.rating,
      },
    });

    return NextResponse.json(contractor, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid contractor payload' }, { status: 400 });
    }
    console.error('Error creating contractor:', error);
    return NextResponse.json({ error: 'Failed to create contractor' }, { status: 500 });
  }
});
