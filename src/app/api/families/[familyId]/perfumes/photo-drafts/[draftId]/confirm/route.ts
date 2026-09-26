import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { fragranceCatalogSlug } from '@/lib/fragranceCatalog';
import { recognitionLabelFromFields } from '@/lib/fragranceRecognition';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  const { draftId } = await context.params;
  const body = await request.json();
  const house = typeof body.house === 'string' ? body.house.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!house || !name) return NextResponse.json({ error: 'Confirm the house and fragrance name.' }, { status: 400 });
  const draft = await prisma.fragranceDraft.findFirst({ where: { id: draftId, personId: authUser.familyMemberId } });
  if (!draft) return NextResponse.json({ error: 'This photo draft is not in your private area.' }, { status: 404 });
  const concentration = typeof body.concentration === 'string' ? body.concentration.trim() || null : null;
  const matchedCatalogEntry = await prisma.fragranceCatalogEntry.findFirst({
    where: { house, name, concentration },
  });
  const catalogEntry = matchedCatalogEntry || await prisma.fragranceCatalogEntry.upsert({
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
  const fragrance = await prisma.fragrance.upsert({
    where: { personId_house_name_concentration: { personId: authUser.familyMemberId, house, name, concentration } },
    update: {
      catalogEntryId: catalogEntry.id,
      photoData: draft.photoData,
      photoMimeType: draft.photoMimeType,
      photoSizeBytes: draft.photoSizeBytes,
    },
    create: { personId: authUser.familyMemberId, catalogEntryId: catalogEntry.id, house, name, concentration, photoData: draft.photoData, photoMimeType: draft.photoMimeType, photoSizeBytes: draft.photoSizeBytes },
  });
  const normalizedLabel = recognitionLabelFromFields({
    extractedText: draft.extractedText,
    house,
    name,
    concentration,
  });
  if (normalizedLabel) {
    await prisma.fragranceRecognitionMemory.upsert({
      where: { familyId_normalizedLabel: { familyId: authUser.familyId, normalizedLabel } },
      update: {
        catalogEntryId: catalogEntry.id,
        house,
        name,
        concentration,
        confirmationCount: { increment: 1 },
        lastConfirmedAt: new Date(),
      },
      create: {
        familyId: authUser.familyId,
        catalogEntryId: catalogEntry.id,
        normalizedLabel,
        house,
        name,
        concentration,
      },
    });
  }
  await prisma.fragranceDraft.update({ where: { id: draft.id }, data: { confirmedAt: new Date() } });
  return NextResponse.json({ ...fragrance, photoData: undefined, photoUrl: `/api/families/${authUser.familyId}/perfumes/${fragrance.id}/photo` }, { status: 201 });
});
