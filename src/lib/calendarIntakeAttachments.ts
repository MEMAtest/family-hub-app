export const MAX_CALENDAR_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const MAX_CALENDAR_ATTACHMENT_TOTAL = 20 * 1024 * 1024;

export const extensionForMimeType = (file: File) => {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|heic|heif)$/i.test(name)) return 'image';
  return null;
};

export const validateCalendarAttachments = (files: File[]) => {
  if (files.length === 0) return 'At least one PDF or image is required.';
  if (files.some((file) => file.size > MAX_CALENDAR_ATTACHMENT_SIZE)) {
    return 'Each school document must be 10MB or smaller.';
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_CALENDAR_ATTACHMENT_TOTAL) {
    return 'The selected school pages must be 20MB or smaller in total.';
  }
  if (files.some((file) => !extensionForMimeType(file))) {
    return 'Only PDF and image school documents are supported.';
  }
  if (files.some((file) => extensionForMimeType(file) === 'pdf') && files.length > 1) {
    return 'Upload one PDF at a time, or select multiple image pages.';
  }
  return null;
};

export const attachmentMetadata = (file: File) => ({
  fileName: file.name || 'school-document',
  mimeType: file.type || (extensionForMimeType(file) === 'pdf' ? 'application/pdf' : 'image/*'),
  sizeBytes: file.size,
});
