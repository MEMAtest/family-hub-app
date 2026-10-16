import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { contractorResponse, readContractorMetadata, writeContractorMetadata } from '@/lib/contractors/contractorStorage';

const updateContractorSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional().nullable(),
  phone: z.string().min(1).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().min(1).optional().nullable(),
  specialty: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  website: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  serviceArea: z.string().max(300).optional().nullable(),
  companyNumber: z.string().max(30).optional().nullable(),
  status: z.string().max(40).optional(),
  profile: z.record(z.unknown()).optional().nullable(),
});

export const GET = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, contractorId } = await context.params;

    const contractor = await prisma.contractor.findFirst({
      where: { id: contractorId, familyId },
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    return NextResponse.json(contractorResponse(contractor));
  } catch (error) {
    console.error('Error fetching contractor:', error);
    return NextResponse.json({ error: 'Failed to fetch contractor' }, { status: 500 });
  }
});

export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, contractorId } = await context.params;
    const raw = await request.json();
    const updates = updateContractorSchema.parse(raw);
    const existing = await prisma.contractor.findFirst({
      where: { id: contractorId, familyId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const currentMetadata = readContractorMetadata(existing.notes);
    const extendedUpdates = {
      notes: updates.notes,
      website: updates.website,
      imageUrl: updates.imageUrl,
      serviceArea: updates.serviceArea,
      companyNumber: updates.companyNumber,
      status: updates.status,
      profile: updates.profile,
    };
    const metadata = Object.fromEntries(Object.entries(extendedUpdates).map(([key, value]) => [
      key,
      value === undefined ? currentMetadata[key as keyof typeof currentMetadata] : value,
    ]));
    const { website, imageUrl, serviceArea, companyNumber, status, profile, ...scalarUpdates } = updates;
    const contractor = await prisma.contractor.update({
      where: { id: contractorId },
      data: {
        ...scalarUpdates,
        notes: writeContractorMetadata(metadata),
      },
    });

    return NextResponse.json(contractorResponse(contractor));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid contractor payload' }, { status: 400 });
    }
    console.error('Error updating contractor:', error);
    return NextResponse.json({ error: 'Failed to update contractor' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, contractorId } = await context.params;

    const existing = await prisma.contractor.findFirst({
      where: { id: contractorId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    await prisma.contractor.delete({ where: { id: contractorId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contractor:', error);
    return NextResponse.json({ error: 'Failed to delete contractor' }, { status: 500 });
  }
});
