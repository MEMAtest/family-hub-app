import { NextRequest, NextResponse } from 'next/server';
import { MAX_IMAGE_BYTES, VisionUnavailableError, isSupportedImageType, type SupportedImageType } from '@/lib/visionAI';

export type PhotoUpload = { image: Buffer; mimeType: SupportedImageType; form: FormData };

// Reads the `photo` field of a multipart upload, or returns the error response to send.
export const readPhoto = async (request: NextRequest): Promise<PhotoUpload | NextResponse> => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Send the photo as a file upload' }, { status: 400 });
  }
  const file = form.get('photo');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No photo attached' }, { status: 400 });
  }
  if (!isSupportedImageType(file.type)) {
    return NextResponse.json({ error: 'Use a JPEG, PNG or WebP photo' }, { status: 415 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'That photo is too large (max 5MB)' }, { status: 413 });
  }
  return { image: Buffer.from(await file.arrayBuffer()), mimeType: file.type, form };
};

export const visionErrorResponse = (error: unknown, what: string) => {
  if (error instanceof VisionUnavailableError) {
    return NextResponse.json({ error: error.message, unavailable: true }, { status: 503 });
  }
  console.error(`Kitchen ${what} failed:`, error);
  const message = error instanceof Error && /could be (read|made out)/.test(error.message)
    ? error.message
    : `Couldn't read that ${what}. Try again with a clearer, well-lit photo.`;
  return NextResponse.json({ error: message }, { status: 502 });
};
