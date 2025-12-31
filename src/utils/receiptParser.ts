/**
 * Receipt text parser
 * Extracts store name, amount, date, and category from OCR text
 * Reuses patterns from statementImport.ts and email-parser.ts
 */

import { inferCategoryFromDescription, EXPENSE_CATEGORIES } from './statementImport';
import type { ParsedReceipt, ReceiptParseOptions } from '@/types/receipt.types';

// Known UK stores for improved name detection
const KNOWN_STORES = [
  // Supermarkets
  'tesco', 'sainsbury', 'sainsburys', 'asda', 'aldi', 'lidl', 'waitrose',
  'morrisons', 'm&s', 'marks & spencer', 'marks and spencer', 'co-op', 'coop',
  'iceland', 'ocado', 'farmfoods', 'costco', 'booths', 'spar', 'nisa', 'londis',
  // Food & Coffee
  'starbucks', 'costa', 'pret', 'pret a manger', 'caffe nero', 'greggs',
  'mcdonalds', 'mcdonald', 'burger king', 'kfc', 'nandos', 'wagamama',
  'pizza hut', 'dominos', 'pizza express', 'subway', 'five guys', 'itsu',
  // Retail
  'amazon', 'argos', 'john lewis', 'debenhams', 'next', 'primark', 'tk maxx',
  'boots', 'superdrug', 'wilko', 'b&m', 'home bargains', 'poundland',
  // Transport
  'shell', 'bp', 'esso', 'texaco', 'total', 'tesco petrol',
  // Other
  'post office', 'royal mail',
];

// Amount extraction patterns
const AMOUNT_PATTERNS = [
  // Explicit total labels (highest priority)
  /(?:grand\s*)?total[\s:]*[£$€]?\s*([\d,]+\.?\d{0,2})/gi,
  /(?:amount\s*)?(?:due|payable|to pay)[\s:]*[£$€]?\s*([\d,]+\.?\d{0,2})/gi,
  /(?:balance|subtotal)[\s:]*[£$€]?\s*([\d,]+\.?\d{0,2})/gi,
  /(?:card|payment|paid)[\s:]*[£$€]?\s*([\d,]+\.?\d{0,2})/gi,
  // Currency amounts (fallback)
  /[£$€]\s*([\d,]+\.\d{2})/g,
];

// Date patterns
const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
  // DD Mon YYYY
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{2,4})?/i,
  // Mon DD, YYYY
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s*(\d{2,4})?/i,
];

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Parse receipt text and extract structured data
 */
export const parseReceiptText = (
  text: string,
  options?: ReceiptParseOptions
): ParsedReceipt => {
  const warnings: string[] = [];

  const name = extractStoreName(text);
  const amount = extractAmount(text);
  const paymentDate = extractDate(text, options?.defaultDate);
  const category = inferCategory(name, text);

  // Calculate confidence based on extraction quality
  const confidence = calculateConfidence({
    hasName: name !== 'Unknown Store',
    hasAmount: amount > 0,
    hasDate: paymentDate !== getDefaultDate(options?.defaultDate),
    textLength: text.length,
    textQuality: assessTextQuality(text),
  });

  if (confidence < 0.5) {
    warnings.push('Low confidence extraction - please verify all fields');
  }

  if (amount === 0) {
    warnings.push('Could not extract amount - please enter manually');
  }

  return {
    name,
    amount,
    category,
    paymentDate,
    confidence,
    rawText: text,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Extract store/merchant name from receipt text
 */
const extractStoreName = (text: string): string => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const lowerText = text.toLowerCase();

  // Strategy 1: Check for known stores
  for (const store of KNOWN_STORES) {
    if (lowerText.includes(store)) {
      // Capitalize properly
      return store
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace('&', '&')
        .replace('Mcdonalds', "McDonald's")
        .replace('Mcdonald', "McDonald's");
    }
  }

  // Strategy 2: First line is often the store name (if it looks like a name)
  const firstLine = lines[0];
  if (firstLine && firstLine.length >= 3 && firstLine.length <= 50) {
    // Check if it looks like a store name (not a date, number, or generic text)
    const looksLikeName = !firstLine.match(/^\d/) && // Doesn't start with number
      !firstLine.match(/^(date|time|receipt|invoice|order|total|cash|card)/i) &&
      firstLine.match(/[a-zA-Z]{2,}/); // Has at least some letters

    if (looksLikeName) {
      return cleanStoreName(firstLine);
    }
  }

  // Strategy 3: Look for common name patterns
  for (const line of lines.slice(0, 5)) {
    // All caps lines are often store names
    if (line === line.toUpperCase() && line.length >= 3 && line.length <= 40) {
      if (!line.match(/^\d/) && line.match(/[A-Z]{2,}/)) {
        return cleanStoreName(line);
      }
    }
  }

  return 'Unknown Store';
};

/**
 * Clean up extracted store name
 */
const cleanStoreName = (name: string): string => {
  return name
    // Remove common suffixes
    .replace(/\s*(ltd|limited|plc|inc|store|stores|express|local)\.?$/i, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Proper case
    .split(' ')
    .map(word => {
      if (word.length <= 2) return word.toUpperCase(); // Keep short words uppercase (e.g., M&S)
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Extract total amount from receipt text
 */
const extractAmount = (text: string): number => {
  // Try each pattern in priority order
  for (const pattern of AMOUNT_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      // For total patterns, take the last match (final total)
      const lastMatch = matches[matches.length - 1];
      const amountStr = lastMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0 && amount < 100000) {
        return Math.round(amount * 100) / 100; // Round to 2 decimal places
      }
    }
  }

  // Fallback: find all currency amounts and take the largest
  const allAmounts = text.match(/[£$€]?\s*(\d{1,5}(?:,\d{3})*\.\d{2})/g) || [];
  const parsed = allAmounts
    .map(a => parseFloat(a.replace(/[£$€,\s]/g, '')))
    .filter(n => !isNaN(n) && n > 0 && n < 100000);

  if (parsed.length > 0) {
    // Return the largest amount (likely the total)
    return Math.max(...parsed);
  }

  return 0;
};

/**
 * Extract date from receipt text
 */
const extractDate = (text: string, defaultDate?: Date): string => {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseDateMatch(match);
      if (parsed) {
        return parsed;
      }
    }
  }

  return getDefaultDate(defaultDate);
};

/**
 * Parse a date regex match into ISO date string
 */
const parseDateMatch = (match: RegExpMatchArray): string | null => {
  try {
    const fullMatch = match[0];

    // Check if it's a numeric date (DD/MM/YYYY)
    if (fullMatch.match(/^\d{1,2}[\/\-.](\d{1,2})[\/\-.]\d{2,4}$/)) {
      const parts = fullMatch.split(/[\/\-.]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
      let year = parseInt(parts[2], 10);

      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      // Validate
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    // Check if it contains month name
    const monthMatch = fullMatch.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
    if (monthMatch) {
      const month = MONTHS[monthMatch[1].toLowerCase().slice(0, 3)];
      const dayMatch = fullMatch.match(/\d{1,2}/);
      const yearMatch = fullMatch.match(/\d{4}/) || fullMatch.match(/\d{2}$/);

      if (dayMatch !== null && month !== undefined) {
        const day = parseInt(dayMatch[0], 10);
        let year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();

        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }

        if (day >= 1 && day <= 31 && year >= 2000) {
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
      }
    }
  } catch {
    // Date parsing failed
  }

  return null;
};

/**
 * Get default date string
 */
const getDefaultDate = (defaultDate?: Date): string => {
  const date = defaultDate || new Date();
  return date.toISOString().split('T')[0];
};

/**
 * Infer category from store name and receipt text
 * Uses existing inferCategoryFromDescription from statementImport.ts
 */
const inferCategory = (storeName: string, rawText: string): string => {
  // First try the store name
  let category = inferCategoryFromDescription(storeName);

  // If we got a generic category, try the full text
  if (category === 'Other') {
    category = inferCategoryFromDescription(rawText);
  }

  // Map to valid expense categories
  if (!EXPENSE_CATEGORIES.includes(category)) {
    // Try to map common variations
    const categoryMap: Record<string, string> = {
      'Groceries': 'Food & Dining',
      'Shopping': 'Clothing',
      'Transport': 'Transportation',
    };
    category = categoryMap[category] || category;
  }

  return category;
};

/**
 * Calculate confidence score based on extraction quality
 */
const calculateConfidence = (factors: {
  hasName: boolean;
  hasAmount: boolean;
  hasDate: boolean;
  textLength: number;
  textQuality: number;
}): number => {
  let score = 0;

  // Weight factors
  if (factors.hasName) score += 0.25;
  if (factors.hasAmount) score += 0.35; // Amount is most important
  if (factors.hasDate) score += 0.2;

  // Text quality contributes up to 0.2
  score += factors.textQuality * 0.2;

  return Math.min(Math.max(score, 0), 1);
};

/**
 * Assess OCR text quality (0-1)
 */
const assessTextQuality = (text: string): number => {
  if (!text || text.length < 10) return 0;

  const totalChars = text.length;
  const alphanumeric = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const ratio = alphanumeric / totalChars;

  // Good receipts have high alphanumeric ratio
  return Math.min(ratio * 1.5, 1);
};

export default {
  parseReceiptText,
};
