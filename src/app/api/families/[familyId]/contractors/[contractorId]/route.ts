import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { contractorResponse, readContractorMetadata, writeContractorMetadata } from '@/lib/contractors/contractorStorage';
import { isSameOriginRequest, readBoundedJson, RequestBodyError, updateContractorSchema } from '@/lib/contractors/contractorValidation';
import { z } from 'zod';

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
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Use Family Hub to update contractors.' }, { status: 403 });
  }
  try {
    const { familyId, contractorId } = await context.params;
    const raw = await readBoundedJson(request);
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
    if (error instanceof z.ZodError || error instanceof RequestBodyError) {
      return NextResponse.json({ error: 'Invalid contractor payload' }, { status: 400 });
    }
    console.error('Error updating contractor:', error);
    return NextResponse.json({ error: 'Failed to update contractor' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Use Family Hub to remove contractors.' }, { status: 403 });
  }
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
