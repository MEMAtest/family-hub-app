import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export const GET = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, imageId } = await context.params;

    const image = await prisma.fitnessImage.findFirst({
      where: { id: imageId, familyId },
      select: { data: true, mimeType: true, sizeBytes: true },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Next's route handler types don't accept Uint8Array directly as BodyInit.
    // Copy into a fresh ArrayBuffer (avoids SharedArrayBuffer typing issues).
    const body = new Uint8Array(image.data).buffer;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': image.mimeType || 'application/octet-stream',
        'Content-Length': String(image.sizeBytes || image.data.length),
        // Immutable per-image ID, but keep it private since access is auth-scoped.
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching fitness image:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, imageId } = await context.params;

    const existing = await prisma.fitnessImage.findFirst({
      where: { id: imageId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    await prisma.fitnessImage.delete({ where: { id: imageId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fitness image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
});
