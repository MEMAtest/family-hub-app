import { resizeImage } from '@/utils/imageResize';

export class PhotoReadError extends Error {
  constructor(message: string, readonly unavailable = false) {
    super(message);
  }
}

// Shrinks the photo, uploads it to a kitchen photo endpoint and returns the JSON reply.
export const uploadKitchenPhoto = async <T,>(
  familyId: string,
  endpoint: 'fridge-check' | 'receipt',
  file: File,
  fields: Record<string, string> = {},
  options: { maxSize?: number; quality?: number } = {}
): Promise<T> => {
  const photo = await resizeImage(file, options.maxSize, options.quality);
  const form = new FormData();
  form.append('photo', photo, 'photo.jpg');
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 70_000);
  try {
    const response = await fetch(`/api/families/${encodeURIComponent(familyId)}/kitchen/${endpoint}`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new PhotoReadError(body?.error || 'Something went wrong reading that photo.', Boolean(body?.unavailable));
    }
    return body as T;
  } catch (error) {
    if (error instanceof PhotoReadError) throw error;
    throw new PhotoReadError((error as Error)?.name === 'AbortError'
      ? 'That took too long. Try again on a better connection.'
      : 'Could not reach the server. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
};
