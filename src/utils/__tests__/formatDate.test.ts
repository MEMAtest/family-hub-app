import { formatDate, formatDateLocale, formatDateTime, formatDateForInput } from '../formatDate';

describe('formatDate', () => {
  describe('formatDate', () => {
    it('should format a Date object correctly', () => {
      const date = new Date('2025-10-13T12:00:00');
      expect(formatDate(date)).toBe('13/10/2025');
    });

    it('should format a date string correctly', () => {
      const dateStr = '2025-10-13';
      expect(formatDate(dateStr)).toBe('13/10/2025');
    });

    it('should handle single-digit days and months with padding', () => {
      const date = new Date('2025-01-05T12:00:00');
      expect(formatDate(date)).toBe('05/01/2025');
    });

    it('should return empty string for null', () => {
      expect(formatDate(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('');
    });

    it('should return empty string for invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('');
    });

    it('should handle dates from different years', () => {
      const date = new Date('2020-12-31T12:00:00');
      expect(formatDate(date)).toBe('31/12/2020');
    });

    it('should format dates consistently regardless of locale parameter', () => {
      const date = new Date('2025-10-13T12:00:00');
      expect(formatDate(date, 'en-US')).toBe('13/10/2025');
      expect(formatDate(date, 'en-GB')).toBe('13/10/2025');
    });
  });

  describe('formatDateLocale', () => {
    it('should format a Date object with locale', () => {
      const date = new Date('2025-10-13T12:00:00');
      const result = formatDateLocale(date, 'en-GB');
      expect(result).toMatch(/13\/10\/2025/);
    });

    it('should use default locale when not specified', () => {
      const date = new Date('2025-10-13T12:00:00');
      const result = formatDateLocale(date);
      expect(result).toMatch(/13\/10\/2025/);
    });

    it('should format a date string correctly', () => {
      const dateStr = '2025-10-13';
      const result = formatDateLocale(dateStr, 'en-GB');
      expect(result).toMatch(/13\/10\/2025/);
    });

    it('should return empty string for null', () => {
      expect(formatDateLocale(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDateLocale(undefined)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateLocale('not-a-date')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('should format a Date object with time', () => {
      const date = new Date('2025-10-13T14:30:00');
      expect(formatDateTime(date)).toBe('13/10/2025 14:30');
    });

    it('should format a date string with time', () => {
      const dateStr = '2025-10-13T09:05:00';
      expect(formatDateTime(dateStr)).toBe('13/10/2025 09:05');
    });

    it('should pad single-digit hours and minutes', () => {
      const date = new Date('2025-01-05T01:05:00');
      expect(formatDateTime(date)).toBe('05/01/2025 01:05');
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2025-10-13T00:00:00');
      expect(formatDateTime(date)).toBe('13/10/2025 00:00');
    });

    it('should handle noon correctly', () => {
      const date = new Date('2025-10-13T12:00:00');
      expect(formatDateTime(date)).toBe('13/10/2025 12:00');
    });

    it('should return empty string for null', () => {
      expect(formatDateTime(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDateTime(undefined)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateTime('invalid')).toBe('');
    });
  });

  describe('formatDateForInput', () => {
    it('should format a Date object for input fields', () => {
      const date = new Date('2025-10-13T12:00:00');
      expect(formatDateForInput(date)).toBe('2025-10-13');
    });

    it('should format a date string for input fields', () => {
      const dateStr = '2025-10-13';
      expect(formatDateForInput(dateStr)).toBe('2025-10-13');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date('2025-01-05T12:00:00');
      expect(formatDateForInput(date)).toBe('2025-01-05');
    });

    it('should handle year boundaries correctly', () => {
      const date = new Date('2020-12-31T23:59:59');
      expect(formatDateForInput(date)).toBe('2020-12-31');
    });

    it('should return empty string for null', () => {
      expect(formatDateForInput(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDateForInput(undefined)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateForInput('not-a-date')).toBe('');
    });

    it('should handle leap year dates', () => {
      const date = new Date('2024-02-29T12:00:00');
      expect(formatDateForInput(date)).toBe('2024-02-29');
    });
  });
});
