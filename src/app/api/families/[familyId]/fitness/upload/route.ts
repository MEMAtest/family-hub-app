import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;

const safeExt = (filename: string, fallback: string) => {
  const ext = path.extname(filename || '').toLowerCase();
  if (ext && ext.length <= 10) return ext;
  return fallback;
};

export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'fitness', familyId);
    await mkdir(uploadDir, { recursive: true });

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
      const ext = safeExt(item.name, item.type === 'image/png' ? '.png' : '.jpg');
      const filename = `${crypto.randomUUID()}${ext}`;
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, buffer);
      urls.push(`/uploads/fitness/${familyId}/${filename}`);
    }

    return NextResponse.json({ urls }, { status: 201 });
  } catch (error) {
    console.error('Fitness upload error:', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
});
