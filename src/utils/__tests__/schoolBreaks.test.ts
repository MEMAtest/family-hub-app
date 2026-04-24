import { stewartFleming2025To2026 } from '@/data/schoolTerms';
import { getNextSchoolBreak } from '@/utils/schoolBreaks';

describe('getNextSchoolBreak', () => {
  it('returns the correct Stewart Fleming summer half-term dates for April 2026', () => {
    const nextBreak = getNextSchoolBreak(stewartFleming2025To2026, '2026-04-23');

    expect(nextBreak).toMatchObject({
      isCurrentlyOnBreak: false,
      breakName: 'Summer Half Term Break',
      breakStartDate: '2026-05-25',
      breakEndDate: '2026-05-29',
      breakUpDate: '2026-05-22',
      returnDate: '2026-06-01',
      breakDuration: 5,
    });
  });
});
