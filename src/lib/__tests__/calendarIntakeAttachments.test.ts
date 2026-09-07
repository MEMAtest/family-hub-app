import {
  attachmentMetadata,
  extensionForMimeType,
  validateCalendarAttachments,
} from '@/lib/calendarIntakeAttachments';

describe('calendar intake attachments', () => {
  it('accepts one PDF and records its metadata', () => {
    const file = new File(['pdf'], 'school.pdf', { type: 'application/pdf' });
    expect(extensionForMimeType(file)).toBe('pdf');
    expect(validateCalendarAttachments([file])).toBeNull();
    expect(attachmentMetadata(file)).toMatchObject({
      fileName: 'school.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 3,
    });
  });

  it('accepts multiple image pages but rejects mixed PDF batches', () => {
    const firstPage = new File(['one'], 'page-1.jpg', { type: 'image/jpeg' });
    const secondPage = new File(['two'], 'page-2.jpg', { type: 'image/jpeg' });
    const pdf = new File(['pdf'], 'school.pdf', { type: 'application/pdf' });

    expect(validateCalendarAttachments([firstPage, secondPage])).toBeNull();
    expect(validateCalendarAttachments([pdf, firstPage])).toContain('one PDF');
  });
});
