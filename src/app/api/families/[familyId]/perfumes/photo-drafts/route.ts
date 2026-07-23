import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { recognitionSearchTerms } from '@/lib/fragranceRecognition';
import { FRAGRANCE_VISION_MODEL, readFragranceBottleLabel } from '@/lib/fragranceVision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type DraftMatch = {
  id: string;
  house: string;
  name: string;
  concentration: string | null;
  source: 'catalogue' | 'household';
};

const findMatches = async (input: {
  familyId: string;
  house: string | null;
  name: string | null;
  extractedText: string | null;
}) => {
  const terms = recognitionSearchTerms(input.house, input.name, input.extractedText);
  if (!terms.length) return [] as DraftMatch[];

  const [catalogue, householdMemory] = await Promise.all([
    prisma.fragranceCatalogEntry.findMany({
      where: {
        OR: terms.flatMap((term) => [
          { house: { contains: term, mode: 'insensitive' as const } },
          { name: { contains: term, mode: 'insensitive' as const } },
        ]),
      },
      select: { id: true, house: true, name: true, concentration: true },
      take: 6,
    }),
    prisma.fragranceRecognitionMemory.findMany({
      where: { familyId: input.familyId },
      include: { catalogEntry: { select: { id: true, house: true, name: true, concentration: true } } },
      orderBy: [{ confirmationCount: 'desc' }, { lastConfirmedAt: 'desc' }],
      take: 120,
    }),
  ]);
  const label = terms.join(' ');
  const remembered = householdMemory
    .filter((memory) => memory.normalizedLabel && (label.includes(memory.normalizedLabel) || memory.normalizedLabel.includes(label)))
    .map((memory) => ({
      id: memory.catalogEntry?.id || `memory-${memory.id}`,
      house: memory.house,
      name: memory.name,
      concentration: memory.concentration,
      source: 'household' as const,
    }));
  const deduped = new Map<string, DraftMatch>();
  [...remembered, ...catalogue.map((entry) => ({ ...entry, source: 'catalogue' as const }))].forEach((entry) => {
    deduped.set(`${entry.house}|${entry.name}|${entry.concentration || ''}`.toLowerCase(), entry);
  });
  return Array.from(deduped.values()).slice(0, 6);
};

export const GET = requireFamilyAccess(async (_request: NextRequest, _context, authUser) => {
  const drafts = await prisma.fragranceDraft.findMany({
    where: { personId: authUser.familyMemberId, confirmedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      suggestedHouse: true,
      suggestedName: true,
      suggestedConcentration: true,
      extractedText: true,
      ocrStatus: true,
      ocrConfidence: true,
      ocrError: true,
      ocrUsage: true,
      matchCandidates: true,
      createdAt: true,
    },
  });
  return NextResponse.json(drafts);
});

export const POST = requireFamilyAccess(async (request: NextRequest, _context, authUser) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Upload a photo of the fragrance bottle label.' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: 'Bottle photo must be 5MB or smaller.' }, { status: 400 });

    const data = Buffer.from(await file.arrayBuffer());
    let result: Awaited<ReturnType<typeof readFragranceBottleLabel>> | null = null;
    let scanError: string | null = null;
    try {
      result = await readFragranceBottleLabel({ image: data, mimeType: file.type });
    } catch (error) {
      scanError = error instanceof Error ? error.message : 'The bottle reader could not finish.';
      console.warn('Fragrance label vision failed:', scanError);
    }
    const matches = result ? await findMatches({
      familyId: authUser.familyId,
      house: result.house,
      name: result.name,
      extractedText: result.extractedText,
    }) : [];
    const ready = Boolean(result?.house && result?.name && (result.confidence || 0) >= 0.65);
    const draft = await prisma.fragranceDraft.create({
      data: {
        personId: authUser.familyMemberId,
        suggestedHouse: result?.house || null,
        suggestedName: result?.name || null,
        suggestedConcentration: result?.concentration || null,
        extractedText: result?.extractedText || null,
        ocrStatus: ready ? 'ready' : 'needs_manual_review',
        ocrConfidence: result?.confidence || null,
        ocrProvider: result ? `openrouter:${FRAGRANCE_VISION_MODEL}` : null,
        ocrError: scanError,
        ocrUsage: result?.usage || undefined,
        matchCandidates: matches,
        photoData: data,
        photoMimeType: file.type,
        photoSizeBytes: file.size,
      },
      select: {
        id: true,
        suggestedHouse: true,
        suggestedName: true,
        suggestedConcentration: true,
        extractedText: true,
        ocrStatus: true,
        ocrConfidence: true,
        ocrError: true,
        ocrUsage: true,
        matchCandidates: true,
        createdAt: true,
      },
    });
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error('Create fragrance draft error:', error);
    return NextResponse.json({ error: 'Could not read that bottle photo.' }, { status: 500 });
  }
});
