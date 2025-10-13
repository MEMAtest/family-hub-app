import { formatDateConsistently, formatEventDate, getCurrentDateString } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDateConsistently', () => {
    it('should format a date in consistent format', () => {
      const date = new Date('2025-10-13T12:00:00');
      const result = formatDateConsistently(date);
      expect(result).toMatch(/Monday, October 13, 2025/);
    });

    it('should handle dates from different months', () => {
      const date = new Date('2025-01-01T00:00:00');
      const result = formatDateConsistently(date);
      expect(result).toMatch(/January 1, 2025/);
    });

    it('should handle dates from different years', () => {
      const date = new Date('2020-12-31T23:59:59');
      const result = formatDateConsistently(date);
      expect(result).toMatch(/December 31, 2020/);
    });

    it('should include weekday in output', () => {
      const date = new Date('2025-10-13T12:00:00');
      const result = formatDateConsistently(date);
      expect(result).toContain('Monday');
    });

    it('should include full month name', () => {
      const date = new Date('2025-10-13T12:00:00');
      const result = formatDateConsistently(date);
      expect(result).toContain('October');
    });
  });

  describe('formatEventDate', () => {
    // Mock the current date for consistent testing
    const mockToday = new Date('2025-10-13T12:00:00');

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockToday);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should return "Today" for today\'s date', () => {
      const todayStr = '2025-10-13';
      expect(formatEventDate(todayStr)).toBe('Today');
    });

    it('should return "Tomorrow" for tomorrow\'s date', () => {
      const tomorrowStr = '2025-10-14';
      expect(formatEventDate(tomorrowStr)).toBe('Tomorrow');
    });

    it('should format future dates with weekday and month', () => {
      const futureStr = '2025-10-20';
      const result = formatEventDate(futureStr);
      expect(result).toMatch(/Mon, Oct 20/);
    });

    it('should format past dates with weekday and month', () => {
      const pastStr = '2025-10-10';
      const result = formatEventDate(pastStr);
      expect(result).toMatch(/Fri, Oct 10/);
    });

    it('should handle dates from different months', () => {
      const dateStr = '2025-11-15';
      const result = formatEventDate(dateStr);
      expect(result).toMatch(/Nov 15/);
    });

    it('should handle January dates', () => {
      const dateStr = '2026-01-01';
      const result = formatEventDate(dateStr);
      expect(result).toMatch(/Jan 1/);
    });
  });

  describe('getCurrentDateString', () => {
    it('should return formatted string for current date', () => {
      const result = getCurrentDateString();
      // Should contain a weekday name
      expect(result).toMatch(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
      // Should contain a month name
      expect(result).toMatch(/(January|February|March|April|May|June|July|August|September|October|November|December)/);
      // Should contain the year
      expect(result).toMatch(/\d{4}/);
    });

    it('should return consistent format', () => {
      const result = getCurrentDateString();
      // Format should be: "Weekday, Month Day, Year"
      expect(result).toMatch(/^\w+, \w+ \d+, \d{4}$/);
    });
  });
});
