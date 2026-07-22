import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { catalogTextList } from '@/lib/fragranceCatalog';
import { requireFamilyAccess } from '@/lib/auth-utils';

const resultLimit = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(1, Math.min(50, Math.round(parsed)));
};

export const GET = requireFamilyAccess(async (request: NextRequest, _context, authUser) => {
  const { searchParams } = new URL(request.url);
  const terms = (searchParams.get('q') || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  const entries = await prisma.fragranceCatalogEntry.findMany({
    where: terms.length
      ? {
          AND: terms.map((term) => ({
            OR: [
              { house: { contains: term, mode: 'insensitive' } },
              { name: { contains: term, mode: 'insensitive' } },
              { concentration: { contains: term, mode: 'insensitive' } },
              { olfactiveFamily: { contains: term, mode: 'insensitive' } },
            ],
          })),
        }
      : undefined,
    orderBy: [{ house: 'asc' }, { name: 'asc' }],
    take: resultLimit(searchParams.get('limit')),
  });
  const ownedIds = new Set((await prisma.fragrance.findMany({
    where: { personId: authUser.familyMemberId, catalogEntryId: { in: entries.map((entry) => entry.id) } },
    select: { catalogEntryId: true },
  })).flatMap((fragrance) => fragrance.catalogEntryId ? [fragrance.catalogEntryId] : []));

  return NextResponse.json(entries.map((entry) => ({
    id: entry.id,
    house: entry.house,
    name: entry.name,
    concentration: entry.concentration,
    releaseYear: entry.releaseYear,
    olfactiveFamily: entry.olfactiveFamily,
    notes: catalogTextList(entry.notes),
    accords: catalogTextList(entry.accords),
    description: entry.description,
    imageUrl: entry.imageUrl,
    source: {
      name: entry.sourceName,
      url: entry.sourceUrl,
      kind: entry.sourceKind,
      status: entry.catalogueStatus,
    },
    isInCollection: ownedIds.has(entry.id),
  })));
});
