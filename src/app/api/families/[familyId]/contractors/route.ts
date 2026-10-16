import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { contractorResponse, writeContractorMetadata } from '@/lib/contractors/contractorStorage';

const createContractorSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  company: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  address: z.string().optional().nullable(),
  specialty: z.string().min(1),
  notes: z.string().optional().nullable(),
  rating: z.number().int().min(0).max(5).optional().nullable(),
  website: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  imageUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  serviceArea: z.string().max(300).optional().nullable(),
  companyNumber: z.string().max(30).optional().nullable(),
  status: z.string().max(40).optional().nullable(),
  profile: z.record(z.unknown()).optional().nullable(),
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
      // Extended contractor fields are stored in the existing notes column for
      // backwards-compatible deployments, so filter the household-sized list below.
    }

    const contractors = await prisma.contractor.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    const responses = contractors.map(contractorResponse);
    const query = q?.toLowerCase();
    return NextResponse.json(query
      ? responses.filter((contractor) => [
          contractor.name,
          contractor.company,
          contractor.email,
          contractor.phone,
          contractor.website,
          contractor.serviceArea,
          contractor.companyNumber,
        ].some((value) => value?.toLowerCase().includes(query)))
      : responses);
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

    const data = {
      familyId,
      name: body.name,
      company: body.company || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      specialty: body.specialty,
      notes: writeContractorMetadata({
        notes: body.notes,
        website: body.website,
        imageUrl: body.imageUrl,
        serviceArea: body.serviceArea,
        companyNumber: body.companyNumber,
        status: body.status,
        profile: body.profile,
      }),
      rating: body.rating || null,
    };
    let contractor;
    if (body.id) {
      const existing = await prisma.contractor.findUnique({ where: { id: body.id }, select: { familyId: true } });
      if (existing && existing.familyId !== familyId) {
        return NextResponse.json({ error: 'Contractor id is already in use' }, { status: 409 });
      }
      contractor = existing
        ? await prisma.contractor.update({ where: { id: body.id }, data })
        : await prisma.contractor.create({ data: { id: body.id, ...data } });
    } else {
      contractor = await prisma.contractor.create({ data });
    }

    return NextResponse.json(contractorResponse(contractor), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid contractor payload' }, { status: 400 });
    }
    console.error('Error creating contractor:', error);
    return NextResponse.json({ error: 'Failed to create contractor' }, { status: 500 });
  }
});
