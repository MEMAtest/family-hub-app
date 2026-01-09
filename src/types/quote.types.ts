// Quote Extraction and Comparison Types

export type QuoteCategory = 'labour' | 'materials' | 'fixtures' | 'sundries' | 'vat' | 'other';

export interface QuoteLineItem {
  id: string;
  description: string;
  category: QuoteCategory;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  notes?: string;
}

export interface ExtractedQuote {
  id: string;
  contractorName: string;
  company?: string;
  contactName?: string;  // Primary contact person (e.g., "Pauline", "Jack")
  phone?: string;
  email?: string;
  address?: string;  // Company address extracted from PDF
  quoteDate?: string;
  validUntil?: string;
  reference?: string;

  // Itemised breakdown
  lineItems: QuoteLineItem[];

  // Calculated totals
  subtotal: number;
  vatRate?: number;
  vatAmount?: number;
  total: number;

  // Category breakdowns
  labourTotal: number;
  materialsTotal: number;
  fixturesTotal: number;
  otherTotal: number;

  // Metadata
  sourceFileName: string;
  rawText: string;
  extractedAt: string;
  confidence: number;
  notes?: string;
}

export interface QuoteComparison {
  id: string;
  projectId: string;
  quotes: ExtractedQuote[];
  recommendedQuoteId?: string;
  notes?: string;
  createdAt: string;
}

// PDF Extraction Result
export interface PDFQuoteExtractionResult {
  success: boolean;
  extractedText: string;
  quote?: ExtractedQuote;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Common regex patterns for UK quotes
export const QUOTE_PATTERNS = {
  // Currency patterns (UK pounds)
  currency: /£\s*([\d,]+\.?\d*)/gi,
  currencyWithLabel: /(?:£|GBP)\s*([\d,]+\.?\d*)/gi,

  // VAT patterns
  vat: /(?:VAT|V\.A\.T\.?)\s*(?:@?\s*(\d+(?:\.\d+)?)\s*%)?[:\s]*(£?\s*[\d,]+\.?\d*)?/gi,
  vatRate: /(\d+(?:\.\d+)?)\s*%\s*VAT/i,

  // Total patterns
  total: /(?:total|grand\s*total|amount\s*due|balance\s*due|invoice\s*total)[:\s]*(£?\s*[\d,]+\.?\d*)/gi,
  subtotal: /(?:sub\s*-?\s*total|net\s*total|total\s*before\s*vat|ex\.?\s*vat)[:\s]*(£?\s*[\d,]+\.?\d*)/gi,

  // Labour patterns
  labour: /(?:labour|labor|work(?:manship)?|installation|fitting)[:\s]*(£?\s*[\d,]+\.?\d*)/gi,

  // Materials patterns
  materials: /(?:materials?|parts?|supplies|goods)[:\s]*(£?\s*[\d,]+\.?\d*)/gi,

  // Date patterns
  date: /(?:date|dated|quote\s*date|valid\s*from)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/gi,
  validUntil: /(?:valid\s*(?:until|to|for)|expires?|expiry)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d+\s*days?)/gi,

  // Reference patterns
  reference: /(?:quote\s*(?:no\.?|number|ref(?:erence)?)|ref(?:erence)?(?:\s*no\.?)?|invoice\s*(?:no\.?|number))[:\s#]*([A-Za-z0-9\-\/]+)/gi,

  // Contact patterns
  phone: /(?:tel(?:ephone)?|phone|mobile|mob|call)[:\s]*([\d\s\-\+\(\)]+)/gi,
  email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,

  // Line item patterns (description followed by price)
  lineItem: /^(.{10,80}?)\s+(£?\s*[\d,]+\.?\d{2})\s*$/gm,
};

// Category keywords for classification
export const CATEGORY_KEYWORDS: Record<QuoteCategory, string[]> = {
  labour: [
    'labour', 'labor', 'work', 'installation', 'fitting', 'removal', 'demolition',
    'hours', 'day rate', 'man hours', 'workmanship', 'skill', 'trade'
  ],
  materials: [
    'materials', 'parts', 'supplies', 'hardware', 'fixings', 'screws', 'nails',
    'timber', 'wood', 'plywood', 'cement', 'plaster', 'tiles', 'paint',
    'silicone', 'adhesive', 'grout', 'copper', 'pipe', 'cable', 'wire'
  ],
  fixtures: [
    'bath', 'shower', 'toilet', 'basin', 'sink', 'tap', 'taps', 'faucet',
    'radiator', 'boiler', 'valve', 'mixer', 'cabinet', 'unit', 'vanity',
    'towel rail', 'mirror', 'light', 'extractor', 'fan', 'socket', 'switch'
  ],
  sundries: [
    'sundries', 'sundry', 'misc', 'miscellaneous', 'consumables', 'skip',
    'waste', 'disposal', 'delivery', 'parking', 'permit', 'access'
  ],
  vat: ['vat', 'v.a.t', 'tax', 'value added tax'],
  other: []
};

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3
};

// Export helper type for quote summary
export interface QuoteSummary {
  contractorName: string;
  total: number;
  labourPercentage: number;
  materialsPercentage: number;
  fixturesPercentage: number;
  itemCount: number;
  hasVat: boolean;
  confidence: number;
}

// Chart data types
export interface QuoteChartData {
  name: string;
  value: number;
  color: string;
  percentage?: number;
  [key: string]: string | number | undefined;
}

export interface QuoteComparisonChartData {
  category: string;
  [contractorName: string]: string | number;
}

// Table column types for sortable tables
export type QuoteSortField = 'description' | 'category' | 'quantity' | 'unitPrice' | 'amount';
export type SortDirection = 'asc' | 'desc';

export interface QuoteTableSort {
  field: QuoteSortField;
  direction: SortDirection;
}
