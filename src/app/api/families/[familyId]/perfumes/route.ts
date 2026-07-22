import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { catalogTextList, fragranceCatalogSlug } from '@/lib/fragranceCatalog';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export const GET = requireFamilyAccess(async (_request: NextRequest, _context, authUser) => {
  const fragrances = await prisma.fragrance.findMany({
    where: { personId: authUser.familyMemberId },
    include: {
      wearLogs: { orderBy: { wornAt: 'desc' } },
      benchmarks: { orderBy: { capturedAt: 'desc' } },
      catalogEntry: true,
    },
    orderBy: [{ house: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json(fragrances.map(({ photoData, catalogEntry, ...fragrance }) => ({
    ...fragrance,
    photoUrl: photoData ? `/api/families/${authUser.familyId}/perfumes/${fragrance.id}/photo` : null,
    catalog: catalogEntry ? {
      id: catalogEntry.id,
      olfactiveFamily: catalogEntry.olfactiveFamily,
      notes: catalogTextList(catalogEntry.notes),
      accords: catalogTextList(catalogEntry.accords),
      sourceName: catalogEntry.sourceName,
      sourceUrl: catalogEntry.sourceUrl,
      catalogueStatus: catalogEntry.catalogueStatus,
    } : null,
  })));
});

export const POST = requireFamilyAccess(async (request: NextRequest, _context, authUser) => {
  try {
    const body = await request.json();
    const requestedCatalogEntry = typeof body.catalogEntryId === 'string'
      ? await prisma.fragranceCatalogEntry.findUnique({ where: { id: body.catalogEntryId } })
      : null;
    if (typeof body.catalogEntryId === 'string' && !requestedCatalogEntry) {
      return NextResponse.json({ error: 'That catalogue fragrance is unavailable.' }, { status: 404 });
    }
    const house = requestedCatalogEntry?.house || (typeof body.house === 'string' ? body.house.trim() : '');
    const name = requestedCatalogEntry?.name || (typeof body.name === 'string' ? body.name.trim() : '');
    if (!house || !name) return NextResponse.json({ error: 'Confirm both the fragrance house and name.' }, { status: 400 });
    const concentration = requestedCatalogEntry?.concentration || (typeof body.concentration === 'string' ? body.concentration.trim() || null : null);
    const catalogEntry = requestedCatalogEntry || await prisma.fragranceCatalogEntry.upsert({
      where: { slug: fragranceCatalogSlug(house, name, concentration) },
      update: {},
      create: {
        slug: fragranceCatalogSlug(house, name, concentration),
        house,
        name,
        concentration,
        sourceName: 'Profile-confirmed collection',
        sourceKind: 'profile-confirmed',
        catalogueStatus: 'profile-confirmed',
      },
    });

    let draft = null;
    if (typeof body.draftId === 'string') {
      draft = await prisma.fragranceDraft.findFirst({ where: { id: body.draftId, personId: authUser.familyMemberId } });
      if (!draft) return NextResponse.json({ error: 'That photo draft is unavailable in your private area.' }, { status: 404 });
    }

    const fragrance = await prisma.fragrance.upsert({
      where: { personId_house_name_concentration: { personId: authUser.familyMemberId, house, name, concentration } },
      update: {
        notes: typeof body.notes === 'string' ? body.notes : undefined,
        catalogEntryId: catalogEntry.id,
      },
      create: {
        personId: authUser.familyMemberId,
        catalogEntryId: catalogEntry.id,
        house,
        name,
        concentration,
        notes: typeof body.notes === 'string' ? body.notes : null,
        photoData: draft?.photoData,
        photoMimeType: draft?.photoMimeType,
        photoSizeBytes: draft?.photoSizeBytes,
      },
    });
    if (draft) await prisma.fragranceDraft.update({ where: { id: draft.id }, data: { confirmedAt: new Date() } });
    return NextResponse.json({ ...fragrance, photoData: undefined, photoUrl: fragrance.photoData ? `/api/families/${authUser.familyId}/perfumes/${fragrance.id}/photo` : null }, { status: 201 });
  } catch (error) {
    console.error('Create fragrance error:', error);
    return NextResponse.json({ error: 'Could not save this fragrance.' }, { status: 500 });
  }
});
