import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const GET = requireFamilyAccess(async (_request: NextRequest, context, authUser) => {
  const { fragranceId } = await context.params;
  const fragrance = await prisma.fragrance.findFirst({
    where: { id: fragranceId, personId: authUser.familyMemberId },
    select: { photoData: true, photoMimeType: true, photoSizeBytes: true },
  });
  if (!fragrance?.photoData) return NextResponse.json({ error: 'Bottle photo not found.' }, { status: 404 });
  return new NextResponse(new Uint8Array(fragrance.photoData).buffer, {
    headers: {
      'Content-Type': fragrance.photoMimeType || 'image/jpeg',
      'Content-Length': String(fragrance.photoSizeBytes || fragrance.photoData.length),
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
});
