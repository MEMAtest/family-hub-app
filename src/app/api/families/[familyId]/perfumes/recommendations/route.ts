import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const average = (values: Array<number | null | undefined>) => {
  const usable = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
};

export const GET = requireFamilyAccess(async (_request: NextRequest, _context, authUser) => {
  const [fragrances, candidates] = await Promise.all([
    prisma.fragrance.findMany({
      where: { personId: authUser.familyMemberId },
      include: { wearLogs: true, benchmarks: { orderBy: { capturedAt: 'desc' } } },
    }),
    prisma.fragranceCandidate.findMany({
      where: { personId: authUser.familyMemberId },
      orderBy: { capturedAt: 'desc' },
    }),
  ]);

  const wearToday = fragrances.map((fragrance) => {
    const personalRating = average(fragrance.wearLogs.map((log) => log.overallRating));
    const longevity = average(fragrance.wearLogs.map((log) => log.longevityHours));
    const projection = average(fragrance.wearLogs.map((log) => log.projectionRating));
    const benchmark = fragrance.benchmarks[0];
    const score = (personalRating ?? 0) * 100 + (longevity ?? 0) * 8 + (projection ?? 0) * 12 + (benchmark?.longevityRating ?? 0) * 2;
    return {
      id: fragrance.id,
      house: fragrance.house,
      name: fragrance.name,
      sampleCount: fragrance.wearLogs.length,
      personalRating,
      longevity,
      projection,
      score,
      benchmark: benchmark ? { sourceName: benchmark.sourceName, sourceUrl: benchmark.sourceUrl, capturedAt: benchmark.capturedAt } : null,
    };
  }).sort((a, b) => b.score - a.score);

  const buyNext = candidates.map((candidate) => ({
    id: candidate.id,
    house: candidate.house,
    name: candidate.name,
    rating: candidate.rating,
    longevityRating: candidate.longevityRating,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
    capturedAt: candidate.capturedAt,
    score: (candidate.rating || 0) * 10 + (candidate.longevityRating || 0) * 5,
  })).sort((a, b) => b.score - a.score);

  return NextResponse.json({ wearToday, buyNext });
});
