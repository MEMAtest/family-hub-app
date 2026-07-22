import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

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
      'Cache-Control': 'private, no-store',
    },
  });
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { fragranceId } = await context.params;
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || !file.size || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Choose an image file for the bottle photo.' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Bottle photos must be 4 MB or smaller.' }, { status: 413 });
    }

    const fragrance = await prisma.fragrance.updateMany({
      where: { id: fragranceId, personId: authUser.familyMemberId },
      data: {
        photoData: Buffer.from(await file.arrayBuffer()),
        photoMimeType: file.type,
        photoSizeBytes: file.size,
      },
    });
    if (!fragrance.count) return NextResponse.json({ error: 'Fragrance not found in your private collection.' }, { status: 404 });

    return NextResponse.json({ photoUrl: `/api/families/${authUser.familyId}/perfumes/${fragranceId}/photo` });
  } catch (error) {
    console.error('Save bottle photo error:', error);
    return NextResponse.json({ error: 'Could not save that bottle photo.' }, { status: 500 });
  }
});
