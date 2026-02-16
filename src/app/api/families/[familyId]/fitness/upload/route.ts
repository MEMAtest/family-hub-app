import { NextRequest, NextResponse } from 'next/server';
import { requireFamilyAccess } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 6;

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Too many files (max ${MAX_FILES})` }, { status: 400 });
    }

    const urls: string[] = [];

    for (const item of files) {
      if (!(item instanceof File)) {
        continue;
      }

      if (!item.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 });
      }

      if (item.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 });
      }

      const buffer = Buffer.from(await item.arrayBuffer());

      const image = await prisma.fitnessImage.create({
        data: {
          familyId,
          uploadedById: authUser.familyMemberId,
          mimeType: item.type,
          sizeBytes: item.size,
          data: buffer,
        },
        select: { id: true },
      });

      urls.push(`/api/families/${familyId}/fitness/images/${image.id}`);
    }

    return NextResponse.json({ urls }, { status: 201 });
  } catch (error) {
    console.error('Fitness upload error:', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
});
