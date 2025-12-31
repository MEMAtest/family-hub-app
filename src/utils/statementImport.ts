import { createId } from '@/utils/id';
import type {
  StatementDirection,
  StatementParseResult,
  StatementSource,
  StatementTransaction,
} from '@/types/statementImport.types';

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

export const EXPENSE_CATEGORIES = [
  'Housing',
  'Transportation',
  'Food & Dining',
  'Entertainment',
  'Healthcare',
  'Childcare',
  'Education',
  'Utilities',
  'Insurance',
  'Clothing',
  'Other',
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Rental',
  'Business',
  'Government Benefits',
  'Other',
];

const STARLING_CATEGORY_MAP: Record<string, { category: string; direction: StatementDirection; warning?: string }> = {
  GROCERIES: { category: 'Food & Dining', direction: 'debit' },
  EATING_OUT: { category: 'Food & Dining', direction: 'debit' },
  ENTERTAINMENT: { category: 'Entertainment', direction: 'debit' },
  TRANSPORT: { category: 'Transportation', direction: 'debit' },
  HOLIDAYS: { category: 'Entertainment', direction: 'debit' },
  LIFESTYLE: { category: 'Entertainment', direction: 'debit' },
  SHOPPING: { category: 'Clothing', direction: 'debit' },
  GENERAL: { category: 'Food & Dining', direction: 'debit' }, // Default general spending to Food
  PAYMENTS: { category: 'Utilities', direction: 'debit', warning: 'Likely bill payment - review' },
  TRANSFER: { category: 'Housing', direction: 'debit', warning: 'Transfer - may be rent/mortgage' },
  DEBT_REPAYMENT: { category: 'Housing', direction: 'debit', warning: 'Debt repayment - review' },
  INCOME: { category: 'Salary', direction: 'credit' },
  BILLS: { category: 'Utilities', direction: 'debit' },
  FAMILY: { category: 'Childcare', direction: 'debit' },
  PERSONAL_CARE: { category: 'Healthcare', direction: 'debit' },
  HOME: { category: 'Housing', direction: 'debit' },
  FINANCES: { category: 'Insurance', direction: 'debit' },
  CHARITY: { category: 'Entertainment', direction: 'debit' }, // No charity category, use Entertainment
  PETS: { category: 'Healthcare', direction: 'debit' }, // Pet expenses closest to Healthcare
  SAVINGS: { category: 'Investment', direction: 'credit' },
};

const CREDIT_HINTS = [
  'salary', 'refund', 'reversal', 'interest', 'credit', 'payment received',
  'bacs', 'bgc', 'bank giro', 'transfer in', 'faster payment in', 'cash deposit',
  'dividend', 'income', 'benefit',
];

const DEBIT_HINTS = [
  'dd', 'direct debit', 'standing order', 'card', 'wlt', 'purchase', 'pos',
  'contactless', 'payment', 'transfer', 'tfl', 'uber', 'amazon', 'atm',
];

const CATEGORY_HINTS: Array<{ keywords: string[]; category: string }> = [
  // Food & Dining - Supermarkets
  { keywords: [
    'tesco', 'sainsbury', 'aldi', 'lidl', 'waitrose', 'asda', 'm&s', 'marks & spencer', 'marks and spencer',
    'iceland', 'morrisons', 'co-op', 'coop', 'cooperative', 'ocado', 'booths', 'budgens', 'spar',
    'costco', 'farmfoods', 'jd food', 'nisa', 'londis', 'premier', 'costcutter'
  ], category: 'Food & Dining' },
  // Food & Dining - Restaurants/Takeaway
  { keywords: [
    'restaurant', 'cafe', 'coffee', 'starbucks', 'pret', 'pret a manger', 'mcdonald', 'mcdonalds', 'kfc',
    'burger', 'burger king', 'deliveroo', 'ubereats', 'uber eat', 'just eat', 'justeat', 'dominos',
    'pizza', 'nandos', 'wagamama', 'subway', 'greggs', 'costa', 'caffe nero', 'eat', 'itsu',
    'leon', 'five guys', 'wendys', 'gourmet', 'kitchen', 'chippy', 'fish & chip', 'fish and chip',
    'bakery', 'deli', 'food', 'takeaway', 'takeout', 'dining', 'meals', 'lunch', 'dinner',
    'breakfast', 'brunch', 'snack', 'dessert'
  ], category: 'Food & Dining' },
  // Transportation - Public
  { keywords: [
    'tfl', 'transport for london', 'oyster', 'train', 'rail', 'national rail', 'avanti', 'lner',
    'gwr', 'southwestern', 'thameslink', 'southern rail', 'northern rail', 'southeastern',
    'bus', 'arriva', 'stagecoach', 'first bus', 'megabus', 'national express',
    'tube', 'underground', 'metro', 'tramlink'
  ], category: 'Transportation' },
  // Transportation - Ride services & Fuel
  { keywords: [
    'uber', 'bolt', 'lyft', 'freenow', 'kapten', 'taxi', 'cab', 'minicab',
    'shell', 'bp', 'esso', 'texaco', 'gulf', 'petrol', 'fuel', 'diesel', 'ev charging',
    'pod point', 'charge point', 'parking', 'ncp', 'ringgo', 'paybyphone', 'ringo',
    'car wash', 'mot', 'kwik fit', 'halfords', 'euro car parts', 'dvla', 'car tax', 'congestion',
    'dartford', 'toll', 'motorway', 'bridge toll'
  ], category: 'Transportation' },
  // Entertainment - Streaming
  { keywords: [
    'netflix', 'disney', 'disney+', 'amazon prime', 'prime video', 'apple tv', 'now tv',
    'spotify', 'apple music', 'youtube', 'youtube premium', 'deezer', 'tidal', 'audible',
    'kindle', 'twitch', 'crunchyroll', 'paramount', 'discovery+', 'britbox', 'hayu'
  ], category: 'Entertainment' },
  // Entertainment - Activities
  { keywords: [
    'cinema', 'odeon', 'vue', 'cineworld', 'showcase', 'picturehouse',
    'theatre', 'theater', 'concert', 'ticketmaster', 'eventbrite', 'seetickets', 'dice',
    'museum', 'gallery', 'exhibition', 'zoo', 'aquarium', 'theme park', 'alton towers',
    'thorpe park', 'legoland', 'bowling', 'arcade', 'laser', 'escape room',
    'golf', 'tennis', 'swimming', 'leisure centre', 'gym membership', 'fitness first',
    'pure gym', 'puregym', 'david lloyd', 'virgin active', 'nuffield', 'the gym', 'anytime fitness',
    'playstation', 'xbox', 'nintendo', 'steam', 'game', 'gaming'
  ], category: 'Entertainment' },
  // Healthcare
  { keywords: [
    'pharmacy', 'boots', 'superdrug', 'lloyds pharmacy', 'well pharmacy',
    'nhs', 'clinic', 'dentist', 'dental', 'doctor', 'health', 'hospital', 'medical',
    'optician', 'specsavers', 'vision express', 'optical', 'eye test',
    'physio', 'chiropractor', 'osteopath', 'therapy', 'counselling', 'bupa',
    'prescription', 'medicine', 'vitamins', 'holland & barrett'
  ], category: 'Healthcare' },
  // Childcare
  { keywords: [
    'school', 'nursery', 'childcare', 'daycare', 'creche', 'childminder',
    'tutor', 'tutoring', 'kids club', 'after school', 'breakfast club'
  ], category: 'Childcare' },
  // Education
  { keywords: [
    'university', 'uni', 'college', 'tuition', 'course', 'education', 'student',
    'learning', 'training', 'skillshare', 'coursera', 'udemy', 'masterclass',
    'linkedin learning', 'books', 'textbook', 'stationery', 'whsmith'
  ], category: 'Education' },
  // Utilities - Energy
  { keywords: [
    'british gas', 'bg', 'edf', 'eon', 'e.on', 'scottish power', 'sse', 'bulb',
    'octopus energy', 'ovo', 'utilita', 'utility warehouse', 'shell energy',
    'electric', 'electricity', 'gas bill', 'energy bill', 'heating'
  ], category: 'Utilities' },
  // Utilities - Water & Council
  { keywords: [
    'water', 'thames water', 'severn trent', 'anglian water', 'united utilities',
    'yorkshire water', 'southern water', 'welsh water',
    'council tax', 'council', 'borough', 'city of', 'local authority'
  ], category: 'Utilities' },
  // Utilities - Telecom
  { keywords: [
    'ee', 'vodafone', 'o2', 'three', '3 mobile', 'giffgaff', 'tesco mobile',
    'virgin mobile', 'sky mobile', 'bt mobile', 'lebara', 'lycamobile',
    'sky', 'virgin media', 'bt', 'talktalk', 'plusnet', 'hyperoptic', 'community fibre',
    'broadband', 'wifi', 'internet', 'phone', 'mobile', 'sim'
  ], category: 'Utilities' },
  // Insurance
  { keywords: [
    'insurance', 'insur', 'aviva', 'axa', 'admiral', 'direct line', 'churchill',
    'comparethemarket', 'gocompare', 'moneysupermarket', 'confused.com',
    'car insur', 'home insur', 'life insur', 'travel insur', 'pet insur',
    'premium', 'policy', 'cover', 'protection', 'legal & general', 'prudential'
  ], category: 'Insurance' },
  // Housing
  { keywords: [
    'rent', 'rental', 'mortgage', 'landlord', 'lettings', 'estate agent',
    'halifax', 'nationwide', 'natwest', 'barclays mortgage', 'lloyds mortgage',
    'housing assoc', 'rightmove', 'zoopla', 'openrent', 'spareroom',
    'service charge', 'ground rent', 'maintenance', 'repairs'
  ], category: 'Housing' },
  // Clothing & Personal
  { keywords: [
    'primark', 'hm', 'h&m', 'zara', 'next', 'uniqlo', 'gap', 'river island',
    'topshop', 'asos', 'boohoo', 'prettylittlething', 'missguided', 'shein',
    'tk maxx', 'tkmaxx', 'matalan', 'new look', 'sports direct', 'jd sports',
    'footlocker', 'nike', 'adidas', 'puma', 'dr martens', 'clarks',
    'debenhams', 'john lewis', 'harrods', 'selfridges', 'house of fraser',
    'clothing', 'apparel', 'fashion', 'shoes', 'footwear', 'accessories',
    'jewellery', 'jewelry', 'watch', 'bag', 'handbag'
  ], category: 'Clothing' },
  // Shopping - General/Online (not clothing-specific)
  { keywords: [
    'amazon', 'ebay', 'paypal', 'etsy', 'wish', 'aliexpress',
    'argos', 'currys', 'ao.com', 'appliances online', 'very', 'littlewoods',
    'home bargains', 'b&m', 'poundland', 'wilko', 'the range', 'dunelm',
    'ikea', 'homesense', 'furniture', 'homeware', 'diy', 'b&q', 'screwfix', 'wickes',
    'toolstation', 'homebase', 'robert dyas'
  ], category: 'Other' },
  // Transfers/Payments - flag for review
  { keywords: [
    'transfer', 'payment to', 'payment from', 'standing order', 'direct debit',
    'faster payment', 'bank transfer', 'internal transfer'
  ], category: 'Other' },
];

const normalizeValue = (value?: string | number | null) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const parseNumber = (value?: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const cleaned = value.replace(/[^0-9\.\-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeConfidence = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(1, parsed));
};

export const buildConfidenceWarnings = (confidence?: number) => {
  if (confidence === undefined) return [];
  if (confidence < 0.6) {
    return [`Low AI confidence (${confidence.toFixed(2)})`];
  }
  return [];
};

const toIsoDate = (date: Date) => date.toISOString().split('T')[0];

const parseDateParts = (day: number, month: number, year: number): Date | null => {
  const date = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const parseDateString = (
  value: string,
  options?: { defaultYear?: number; statementMonth?: number }
): Date | null => {
  const trimmed = normalizeValue(value);
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    return parseDateParts(Number(dayStr), Number(monthStr) - 1, Number(yearStr));
  }

  const ukMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ukMatch) {
    const [, dayStr, monthStr, yearStr] = ukMatch;
    return parseDateParts(Number(dayStr), Number(monthStr) - 1, Number(yearStr));
  }

  const monthMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s*(\d{4})?$/);
  if (monthMatch) {
    const [, dayStr, monthName, yearStr] = monthMatch;
    const monthKey = monthName.toLowerCase();
    const month = MONTHS[monthKey];
    if (month === undefined) return null;
    const statementYear = options?.defaultYear ?? new Date().getFullYear();
    let year = yearStr ? Number(yearStr) : statementYear;
    if (!yearStr && typeof options?.statementMonth === 'number' && month > options.statementMonth + 1) {
      year -= 1;
    }
    return parseDateParts(Number(dayStr), month, year);
  }

  return null;
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current);
  return result.map((value) => value.trim());
};

export const parseCsvContent = (content: string): string[][] => {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(parseCsvLine(line));
  }
  return rows;
};

const normalizeHeader = (value: string) => value.trim().toLowerCase();

const findHeaderIndex = (headers: string[], matches: string[]) => {
  const normalized = headers.map(normalizeHeader);
  return normalized.findIndex((header) => matches.some((match) => header.includes(match)));
};

export const inferDirectionFromDescription = (description: string): StatementDirection | null => {
  const lower = description.toLowerCase();
  if (CREDIT_HINTS.some((hint) => lower.includes(hint))) return 'credit';
  if (DEBIT_HINTS.some((hint) => lower.includes(hint))) return 'debit';
  return null;
};

export const inferCategoryFromDescription = (description: string, fallback = 'Other') => {
  const lower = description.toLowerCase();
  const normalized = lower.replace(/[^a-z0-9]/g, '');

  // First pass: check exact keyword matches
  for (const rule of CATEGORY_HINTS) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return rule.category;
    }
    if (rule.keywords.some((keyword) => normalized.includes(keyword.replace(/[^a-z0-9]/g, '')))) {
      return rule.category;
    }
  }

  // Second pass: use broader pattern matching to avoid "Other"
  // Card payments at retail locations
  if (/card\s*(payment|purchase)|contactless|pos|wlt/i.test(lower)) {
    // Try to identify what kind of purchase
    if (/food|eat|drink|coffee|cafe|restaurant|market/i.test(lower)) return 'Food & Dining';
    if (/cloth|shoe|wear|dress|shirt|fashion/i.test(lower)) return 'Clothing';
    if (/pharmacy|health|medical|dental/i.test(lower)) return 'Healthcare';
    if (/petrol|fuel|parking|car|transport/i.test(lower)) return 'Transportation';
    // Default card purchases to Food & Dining (most common retail category)
    return 'Food & Dining';
  }

  // Direct debits - usually utilities, subscriptions, or insurance
  if (/direct debit|dd\s|d\/d|standing order|s\/o/i.test(lower)) {
    if (/insur|cover|premium|protect/i.test(lower)) return 'Insurance';
    if (/energy|gas|electric|water|power|utility/i.test(lower)) return 'Utilities';
    if (/rent|mortgage|property|housing/i.test(lower)) return 'Housing';
    if (/gym|fitness|sport|leisure|entertainment/i.test(lower)) return 'Entertainment';
    if (/phone|mobile|broadband|internet|tv|sky|virgin/i.test(lower)) return 'Utilities';
    // Default DD to Utilities (most common recurring expense type)
    return 'Utilities';
  }

  // Faster payments / bank transfers - often bills or rent
  if (/faster payment|bank transfer|bacs|chaps|internal transfer/i.test(lower)) {
    if (/rent|landlord|property|housing/i.test(lower)) return 'Housing';
    if (/salary|wage|pay|income/i.test(lower)) return 'Salary';
    return 'Housing'; // Many bank transfers are rent payments
  }

  // ATM withdrawals - typically for day-to-day spending
  if (/atm|cash|withdraw/i.test(lower)) {
    return 'Food & Dining'; // Cash typically used for small daily purchases
  }

  // Online purchases
  if (/online|www\.|\.com|\.co\.uk|web/i.test(lower)) {
    return 'Clothing'; // Most online shopping is retail/clothing
  }

  // Subscription patterns
  if (/monthly|subscription|member|annual/i.test(lower)) {
    return 'Entertainment'; // Most subscriptions are entertainment
  }

  return fallback;
};

const getMappedCategory = (bankCategory?: string) => {
  if (!bankCategory) return null;
  const key = bankCategory.toUpperCase().replace(/\s+/g, '_');
  return STARLING_CATEGORY_MAP[key] ?? null;
};

const buildTransaction = (values: Omit<StatementTransaction, 'id'>): StatementTransaction => ({
  id: createId('statement'),
  ...values,
});

const deriveDateRange = (transactions: StatementTransaction[]) => {
  if (transactions.length === 0) return { startDate: undefined, endDate: undefined };
  const dates = transactions.map((item) => item.date).filter(Boolean).sort();
  return { startDate: dates[0], endDate: dates[dates.length - 1] };
};

export const parseStatementRows = (rows: string[][], sourceType: StatementSource = 'csv'): StatementParseResult => {
  const result: StatementParseResult = {
    success: false,
    transactions: [],
    warnings: [],
    errors: [],
    metadata: { sourceType },
  };

  if (rows.length === 0) {
    result.errors.push('Statement file is empty.');
    return result;
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);
  const headerSignature = headers.map(normalizeHeader).join('|');
  if (headerSignature.includes('counter party') && headerSignature.includes('spending category')) {
    result.metadata.bank = 'Starling';
    result.metadata.currency = 'GBP';
  }
  const dateIndex = findHeaderIndex(headers, ['date', 'transaction date', 'value date']);
  const amountIndex = findHeaderIndex(headers, ['amount']);
  const debitIndex = findHeaderIndex(headers, ['debit']);
  const creditIndex = findHeaderIndex(headers, ['credit']);
  const descriptionIndex = findHeaderIndex(headers, ['description', 'details', 'narrative', 'merchant', 'payee']);
  const counterpartyIndex = findHeaderIndex(headers, ['counter party', 'counterparty', 'payee']);
  const referenceIndex = findHeaderIndex(headers, ['reference', 'ref']);
  const categoryIndex = findHeaderIndex(headers, ['category', 'spending category']);
  const typeIndex = findHeaderIndex(headers, ['type']);
  const balanceIndex = findHeaderIndex(headers, ['balance']);

  if (dateIndex === -1 || (amountIndex === -1 && debitIndex === -1 && creditIndex === -1)) {
    result.errors.push('Unable to detect required columns (date/amount).');
    return result;
  }

  const transactions: StatementTransaction[] = [];

  dataRows.forEach((row) => {
    const dateValue = row[dateIndex] ?? '';
    const parsedDate = parseDateString(dateValue);
    const warnings: string[] = [];

    if (!parsedDate) {
      warnings.push('Invalid date');
    }

    const rawAmount = amountIndex >= 0 ? parseNumber(row[amountIndex]) : null;
    const rawDebit = debitIndex >= 0 ? parseNumber(row[debitIndex]) : null;
    const rawCredit = creditIndex >= 0 ? parseNumber(row[creditIndex]) : null;

    let amount = rawAmount;
    let direction: StatementDirection | null = null;

    if (amount !== null) {
      direction = amount < 0 ? 'debit' : 'credit';
      amount = Math.abs(amount);
    } else if (rawDebit !== null) {
      amount = rawDebit;
      direction = 'debit';
    } else if (rawCredit !== null) {
      amount = rawCredit;
      direction = 'credit';
    }

    if (amount === null || amount === undefined) {
      warnings.push('Invalid amount');
      amount = 0;
    }

    const counterparty = counterpartyIndex >= 0 ? normalizeValue(row[counterpartyIndex]) : '';
    const reference = referenceIndex >= 0 ? normalizeValue(row[referenceIndex]) : '';
    const descriptionRaw = descriptionIndex >= 0 ? normalizeValue(row[descriptionIndex]) : '';
    const typeValue = typeIndex >= 0 ? normalizeValue(row[typeIndex]) : '';

    const descriptionParts = [descriptionRaw, counterparty, reference].filter(Boolean);
    const description = descriptionParts.join(' • ') || counterparty || reference || 'Statement item';

    if (!direction) {
      direction = inferDirectionFromDescription(description) ?? 'debit';
      warnings.push('Direction inferred');
    }

    const bankCategory = categoryIndex >= 0 ? normalizeValue(row[categoryIndex]) : '';
    const mapped = getMappedCategory(bankCategory);
    let category = mapped?.category ?? inferCategoryFromDescription(description);
    if (direction === 'credit' && !INCOME_CATEGORIES.includes(category)) {
      category = 'Other';
    }
    if (direction === 'debit' && !EXPENSE_CATEGORIES.includes(category)) {
      category = 'Other';
    }

    if (mapped?.warning) {
      warnings.push(mapped.warning);
    }

    const balance = balanceIndex >= 0 ? parseNumber(row[balanceIndex]) ?? undefined : undefined;

    transactions.push(buildTransaction({
      date: parsedDate ? toIsoDate(parsedDate) : '',
      description: description || 'Statement item',
      amount,
      direction,
      category,
      bankCategory: bankCategory || undefined,
      reference: reference || undefined,
      counterparty: counterparty || undefined,
      balance,
      source: sourceType,
      warnings: warnings.length ? warnings : undefined,
    }));
  });

  const { startDate, endDate } = deriveDateRange(transactions);
  result.metadata.startDate = startDate;
  result.metadata.endDate = endDate;
  result.success = true;
  result.transactions = transactions;
  return result;
};

export const parseCsvStatement = (content: string, sourceType: StatementSource = 'csv'): StatementParseResult => {
  const rows = parseCsvContent(content);
  return parseStatementRows(rows, sourceType);
};

export const detectBankFromText = (text: string) => {
  const rules: Array<{ name: string; pattern: RegExp }> = [
    { name: 'Virgin Money', pattern: /Virgin Money/i },
    { name: 'Lloyds', pattern: /Lloyds/i },
    { name: 'HSBC', pattern: /HSBC/i },
    { name: 'NatWest', pattern: /NatWest/i },
    { name: 'Barclays', pattern: /Barclays/i },
    { name: 'Halifax', pattern: /Halifax/i },
    { name: 'Nationwide', pattern: /Nationwide/i },
    { name: 'Santander', pattern: /Santander/i },
    { name: 'Monzo', pattern: /Monzo/i },
    { name: 'Starling', pattern: /Starling/i },
    { name: 'Revolut', pattern: /Revolut/i },
    { name: 'Chase', pattern: /Chase/i },
  ];
  const match = rules.find((rule) => rule.pattern.test(text));
  return match?.name;
};

export const extractPdfSection = (text: string) => {
  // Remove page headers/footers but keep all transaction content from ALL pages
  const cleaned = text
    .replace(/Page \d+ of \d+/gi, '') // Remove "Page X of Y"
    .replace(/DateDescriptionDebitsCreditsBalance/g, '') // Remove repeated headers
    .replace(/Date\s+Description\s+Debits\s+Credits\s+Balance/gi, '')
    .replace(/Have a think about[^\n]*\n?/gi, '') // Remove "Have a think" lines
    .replace(/Change\s*of\s*address[^\n]*\n?/gi, '') // Remove "Change of address" lines
    .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines

  // Try to find the start of transaction data
  const startPatterns = [
    /\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}/, // "01 Jan 2024"
    /\d{1,2}\s+[A-Z][a-z]{2}\s+/, // "01 Jan"
    /Balance brought forward/i,
  ];

  let startIndex = 0;
  for (const pattern of startPatterns) {
    const match = cleaned.match(pattern);
    if (match && match.index !== undefined) {
      startIndex = match.index;
      break;
    }
  }

  return cleaned.slice(startIndex).trim();
};

const normalizePdfLine = (line: string) => line.replace(/\s+/g, ' ').trim();

const extractGenericPdfLines = (text: string) => {
  const lines = text
    .split('\n')
    .map(normalizePdfLine)
    .filter(Boolean);

  const headerIndex = lines.findIndex((line) => (
    /date/i.test(line) && /balance/i.test(line) && /description|details/i.test(line)
  ));

  let contentLines = headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines;

  const endIndex = contentLines.findIndex((line) => (
    /page\s+\d+\s+of/i.test(line)
    || /important information/i.test(line)
    || /end of statement/i.test(line)
  ));
  if (endIndex >= 0) {
    contentLines = contentLines.slice(0, endIndex);
  }

  return contentLines;
};

export const parseStatementDateFromPdf = (text: string) => {
  const match = text.match(/Statement date\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
  if (!match) return null;
  const [, dayStr, monthName, yearStr] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) return null;
  const date = parseDateParts(Number(dayStr), month, Number(yearStr));
  return date ? toIsoDate(date) : null;
};

export const parseVirginMoneyPdfText = (text: string): StatementParseResult => {
  const result: StatementParseResult = {
    success: false,
    transactions: [],
    warnings: [],
    errors: [],
    metadata: { bank: 'Virgin Money', sourceType: 'pdf' },
  };

  const statementDateIso = parseStatementDateFromPdf(text);
  if (statementDateIso) {
    result.metadata.statementDate = statementDateIso;
  }

  const statementDate = statementDateIso ? new Date(statementDateIso) : null;
  const statementYear = statementDate?.getFullYear() ?? new Date().getFullYear();
  const statementMonth = statementDate?.getMonth();

  const section = extractPdfSection(text);
  const lines = section
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let currentDate: Date | null = null;
  let pendingDescription: string[] = [];
  let lastBalance: number | null = null;
  let lastTransaction: StatementTransaction | null = null;

  const amountRegex = /\d{1,3}(?:,\d{3})*\.\d{2}/g;

  const finalizeDirection = (transaction: StatementTransaction) => {
    if (transaction.balance !== undefined && lastBalance !== null) {
      transaction.direction = transaction.balance >= lastBalance ? 'credit' : 'debit';
      lastBalance = transaction.balance;
      return;
    }

    const inferred = inferDirectionFromDescription(transaction.description);
    if (inferred) {
      transaction.direction = inferred;
    } else {
      transaction.direction = 'debit';
      transaction.warnings = [...(transaction.warnings ?? []), 'Direction inferred'];
    }
  };

  for (const line of lines) {
    if (line.startsWith('DateDescription')) {
      continue;
    }

    const previousMatch = line.match(/Previous statement.*?(\d{1,3}(?:,\d{3})*\.\d{2})/i);
    if (previousMatch) {
      const openingBalance = parseNumber(previousMatch[1]);
      if (openingBalance !== null) {
        lastBalance = openingBalance;
      }
      continue;
    }

    const dateMatch = line.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?\s*(.*)$/);
    if (dateMatch) {
      const [, dayStr, monthName, yearStr, rest] = dateMatch;
      const parsedDate = parseDateString(`${dayStr} ${monthName} ${yearStr ?? ''}`.trim(), {
        defaultYear: statementYear,
        statementMonth: statementMonth ?? undefined,
      });
      if (parsedDate) {
        currentDate = parsedDate;
      }
      if (rest) {
        pendingDescription.push(rest.trim());
      }
      continue;
    }

    const amountMatches = line.match(amountRegex);
    if (!amountMatches) {
      pendingDescription.push(line);
      continue;
    }

    const amounts = amountMatches
      .map((value) => parseNumber(value))
      .filter((value): value is number => value !== null);

    const rawDescription = line.replace(amountRegex, '').replace(/\s+/g, ' ').trim();
    if (amounts.length === 1 && !rawDescription && pendingDescription.length === 0 && lastTransaction && lastTransaction.balance === undefined) {
      lastTransaction.balance = amounts[0];
      finalizeDirection(lastTransaction);
      continue;
    }
    let amount = amounts[0];
    let balance: number | undefined;

    if (amounts.length >= 2) {
      balance = amounts[amounts.length - 1];
      amount = amounts[amounts.length - 2];
    }

    const description = [...pendingDescription, rawDescription].filter(Boolean).join(' ');
    pendingDescription = [];

    if (!currentDate) {
      result.warnings.push(`Missing date for transaction "${description || 'Unknown'}"`);
    }

    const warnings: string[] = [];
    if (!description) {
      warnings.push('Missing description');
    }

    const category = inferCategoryFromDescription(description || 'Statement item');

    const transaction = buildTransaction({
      date: currentDate ? toIsoDate(currentDate) : '',
      description: description || 'Statement item',
      amount: amount ?? 0,
      direction: 'debit',
      category,
      source: 'pdf',
      balance,
      warnings: warnings.length ? warnings : undefined,
    });

    finalizeDirection(transaction);
    lastTransaction = transaction;
    result.transactions.push(transaction);
  }

  if (lastTransaction && lastTransaction.balance === undefined && pendingDescription.length === 0) {
    const lastLine = lines[lines.length - 1];
    const balanceOnly = lastLine?.match(/^\d{1,3}(?:,\d{3})*\.\d{2}$/);
    if (balanceOnly) {
      const parsedBalance = parseNumber(balanceOnly[0]);
      if (parsedBalance !== null) {
        lastTransaction.balance = parsedBalance;
        finalizeDirection(lastTransaction);
      }
    }
  }

  if (result.transactions.length === 0) {
    result.errors.push('No transactions detected in statement text.');
    return result;
  }

  const { startDate, endDate } = deriveDateRange(result.transactions);
  result.metadata.startDate = startDate;
  result.metadata.endDate = endDate;
  result.success = true;
  return result;
};

export const parseGenericPdfText = (text: string): StatementParseResult => {
  const detectedBank = detectBankFromText(text);
  const result: StatementParseResult = {
    success: false,
    transactions: [],
    warnings: [],
    errors: [],
    metadata: { bank: detectedBank, sourceType: 'pdf' },
  };

  const statementDateIso = parseStatementDateFromPdf(text);
  if (statementDateIso) {
    result.metadata.statementDate = statementDateIso;
  }

  const statementDate = statementDateIso ? new Date(statementDateIso) : null;
  const statementYear = statementDate?.getFullYear() ?? new Date().getFullYear();
  const statementMonth = statementDate?.getMonth();

  const lines = extractGenericPdfLines(text);
  if (lines.length === 0) {
    result.errors.push('No statement lines detected.');
    return result;
  }

  let currentDate: Date | null = null;
  let pendingDescription: string[] = [];
  let lastBalance: number | null = null;
  let lastTransaction: StatementTransaction | null = null;

  const amountRegex = /\d{1,3}(?:,\d{3})*\.\d{2}/g;

  const finalizeDirection = (transaction: StatementTransaction) => {
    if (transaction.balance !== undefined && lastBalance !== null) {
      transaction.direction = transaction.balance >= lastBalance ? 'credit' : 'debit';
      lastBalance = transaction.balance;
      return;
    }

    const inferred = inferDirectionFromDescription(transaction.description);
    if (inferred) {
      transaction.direction = inferred;
    } else {
      transaction.direction = 'debit';
      transaction.warnings = [...(transaction.warnings ?? []), 'Direction inferred'];
    }
  };

  for (const line of lines) {
    let workingLine = line;
    const openingMatch = workingLine.match(/(?:opening balance|balance brought forward|previous balance|balance b\/f)[^\d]*?(\d{1,3}(?:,\d{3})*\.\d{2})/i);
    if (openingMatch) {
      const openingBalance = parseNumber(openingMatch[1]);
      if (openingBalance !== null) {
        lastBalance = openingBalance;
      }
      continue;
    }

    const dateMatch = workingLine.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?\s*(.*)$/);
    if (dateMatch) {
      const [, dayStr, monthName, yearStr, rest] = dateMatch;
      const parsedDate = parseDateString(`${dayStr} ${monthName} ${yearStr ?? ''}`.trim(), {
        defaultYear: statementYear,
        statementMonth: statementMonth ?? undefined,
      });
      if (parsedDate) {
        currentDate = parsedDate;
      }
      workingLine = rest?.trim() ?? '';
      if (!workingLine) {
        continue;
      }
    }

    const amountMatches = workingLine.match(amountRegex);
    if (!amountMatches) {
      pendingDescription.push(workingLine);
      continue;
    }

    const amounts = amountMatches
      .map((value) => parseNumber(value))
      .filter((value): value is number => value !== null);

    const rawDescription = workingLine.replace(amountRegex, '').replace(/\s+/g, ' ').trim();
    if (amounts.length === 1 && !rawDescription && pendingDescription.length === 0 && lastTransaction && lastTransaction.balance === undefined) {
      lastTransaction.balance = amounts[0];
      finalizeDirection(lastTransaction);
      continue;
    }

    let amount = amounts[0];
    let balance: number | undefined;

    if (amounts.length >= 2) {
      balance = amounts[amounts.length - 1];
      amount = amounts[amounts.length - 2];
    }

    const description = [...pendingDescription, rawDescription].filter(Boolean).join(' ');
    pendingDescription = [];

    if (!currentDate) {
      result.warnings.push(`Missing date for transaction "${description || 'Unknown'}"`);
    }

    const warnings: string[] = [];
    if (!description) {
      warnings.push('Missing description');
    }

    const category = inferCategoryFromDescription(description || 'Statement item');

    const transaction = buildTransaction({
      date: currentDate ? toIsoDate(currentDate) : '',
      description: description || 'Statement item',
      amount: amount ?? 0,
      direction: 'debit',
      category,
      source: 'pdf',
      balance,
      warnings: warnings.length ? warnings : undefined,
    });

    finalizeDirection(transaction);
    lastTransaction = transaction;
    result.transactions.push(transaction);
  }

  if (result.transactions.length === 0) {
    result.errors.push('No transactions detected in statement text.');
    return result;
  }

  const { startDate, endDate } = deriveDateRange(result.transactions);
  result.metadata.startDate = startDate;
  result.metadata.endDate = endDate;
  result.success = true;
  return result;
};
