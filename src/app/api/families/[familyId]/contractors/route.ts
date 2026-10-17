import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { contractorResponse, writeContractorMetadata } from '@/lib/contractors/contractorStorage';
import { createContractorSchema, isSameOriginRequest, readBoundedJson, RequestBodyError } from '@/lib/contractors/contractorValidation';
import { z } from 'zod';

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
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Use Family Hub to save contractors.' }, { status: 403 });
  }
  try {
    const { familyId } = await context.params;
    const raw = await readBoundedJson(request);
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
      if (existing) {
        contractor = await prisma.contractor.update({ where: { id: body.id }, data });
      } else {
        try {
          contractor = await prisma.contractor.create({ data: { id: body.id, ...data } });
        } catch (error) {
          // Treat a repeated client POST as an idempotent save. A concurrent row
          // belonging to another household must never be updated.
          if ((error as { code?: string }).code !== 'P2002') throw error;
          const concurrent = await prisma.contractor.findUnique({ where: { id: body.id }, select: { familyId: true } });
          if (!concurrent || concurrent.familyId !== familyId) {
            return NextResponse.json({ error: 'Contractor id is already in use' }, { status: 409 });
          }
          contractor = await prisma.contractor.update({ where: { id: body.id }, data });
        }
      }
    } else {
      contractor = await prisma.contractor.create({ data });
    }

    return NextResponse.json(contractorResponse(contractor), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof RequestBodyError) {
      return NextResponse.json({ error: 'Invalid contractor payload' }, { status: 400 });
    }
    console.error('Error creating contractor:', error);
    return NextResponse.json({ error: 'Failed to create contractor' }, { status: 500 });
  }
});
