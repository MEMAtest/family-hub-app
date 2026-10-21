import { binDateInLondon, binReminderMessage, isBinCollectionActionable } from '@/utils/binCollectionPresentation';

describe('bin collection presentation', () => {
  it('uses London dates across BST midnight and GMT', () => {
    expect(binDateInLondon(new Date('2026-10-20T23:30:00Z'))).toBe('2026-10-21');
    expect(binDateInLondon(new Date('2026-10-26T23:30:00Z'))).toBe('2026-10-26');
  });
  it('limits compact presentation to today and tomorrow, including year boundaries', () => {
    expect(isBinCollectionActionable('2027-01-01', '2026-12-31')).toBe(true);
    expect(isBinCollectionActionable('2026-12-31', '2026-12-31')).toBe(true);
    expect(isBinCollectionActionable('2027-01-02', '2026-12-31')).toBe(false);
    expect(isBinCollectionActionable('2026-12-30', '2026-12-31')).toBe(false);
  });
  it('does not invent a council collection time', () => {
    expect(binReminderMessage('2026-10-22', ['Food waste'])).toContain('does not publish a collection time');
  });
});
