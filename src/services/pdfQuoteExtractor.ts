import DOMPurify from 'dompurify';
import {
  ExtractedQuote,
  QuoteLineItem,
  QuoteCategory,
  PDFQuoteExtractionResult,
  QUOTE_PATTERNS,
  CATEGORY_KEYWORDS,
  CONFIDENCE_THRESHOLDS,
} from '@/types/quote.types';

interface PDFExtractionResponse {
  success: boolean;
  text?: string;
  numPages?: number;
  error?: string;
}

class PDFQuoteExtractorService {
  // Maximum file size: 10MB
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  // Allowed MIME types
  private static readonly ALLOWED_TYPES = ['application/pdf'];
  // API timeout: 30 seconds
  private static readonly API_TIMEOUT = 30000;
  // Stricter email pattern (RFC 5322 simplified)
  private static readonly EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  /**
   * Sanitize text to prevent XSS attacks
   */
  private sanitizeText(text: string | undefined): string | undefined {
    if (!text) return undefined;
    // Remove potential HTML/script tags and dangerous characters
    const sanitized = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
    // Also remove javascript: protocol and other dangerous patterns
    return sanitized
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * Validate email format strictly
   */
  private isValidEmail(email: string): boolean {
    return PDFQuoteExtractorService.EMAIL_PATTERN.test(email) && email.length <= 254;
  }

  /**
   * Extract quote data from a PDF file
   */
  async extractFromPDF(file: File): Promise<PDFQuoteExtractionResult> {
    const result: PDFQuoteExtractionResult = {
      success: false,
      extractedText: '',
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Validate file size
    if (file.size > PDFQuoteExtractorService.MAX_FILE_SIZE) {
      result.errors.push('File too large. Maximum size is 10MB.');
      result.suggestions.push('Try compressing the PDF or splitting it into smaller files.');
      return result;
    }

    // Validate file type
    if (!PDFQuoteExtractorService.ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
      result.errors.push('Invalid file type. Please upload a PDF file.');
      result.suggestions.push('Ensure the file has a .pdf extension and is a valid PDF document.');
      return result;
    }

    try {
      // Extract text from PDF using server-side API
      const text = await this.extractTextFromFile(file);
      result.extractedText = text;

      if (!text || text.trim().length < 50) {
        result.errors.push('Could not extract sufficient text from PDF. The file may be image-based or corrupted.');
        result.suggestions.push('Try a text-based PDF or manually enter the quote details.');
        return result;
      }

      // Parse the extracted text
      const quote = this.parseQuoteText(text, file.name);

      if (quote) {
        result.quote = quote;
        result.success = true;

        // Add warnings for low confidence
        if (quote.confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
          result.warnings.push('Low confidence extraction - please verify all amounts');
        }
        if (quote.lineItems.length === 0) {
          result.warnings.push('No itemised breakdown found - only totals extracted');
        }
        if (!quote.vatAmount && quote.total > 100) {
          result.suggestions.push('VAT amount not detected - verify if quote includes VAT');
        }
      } else {
        result.errors.push('Could not extract quote information from the PDF');
        result.suggestions.push('Ensure the PDF contains pricing information with pound symbols (£)');
      }

      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error processing PDF');
      return result;
    }
  }

  /**
   * Extract text from PDF file using server-side API
   */
  private async extractTextFromFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PDFQuoteExtractorService.API_TIMEOUT);

    let response: Response;
    try {
      response = await fetch('/api/quotes/extract', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('PDF extraction timed out. Please try a smaller file or check your connection.');
      }
      throw new Error('Network error. Please check your connection and try again.');
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication required. Please log in and try again.');
      }
      if (response.status === 413) {
        throw new Error('File too large for server. Please compress the PDF.');
      }
      throw new Error(errorData.error || `Server error (${response.status}). Please try again.`);
    }

    const data: PDFExtractionResponse = await response.json();

    if (!data.success || !data.text) {
      throw new Error(data.error || 'No text extracted from PDF');
    }

    return data.text;
  }

  /**
   * Parse quote text and extract structured data
   */
  private parseQuoteText(text: string, fileName: string): ExtractedQuote | null {
    let confidence = 0.5;
    const lines = text.split(/[\n\r]+/).filter(l => l.trim());

    // Extract basic info
    const contractor = this.extractContractorInfo(text);
    const reference = this.extractReference(text);
    const dates = this.extractDates(text);
    const totals = this.extractTotals(text);
    const lineItems = this.extractLineItems(text);

    // Must have at least a total to be valid
    if (!totals.total && lineItems.length === 0) {
      return null;
    }

    // Calculate confidence based on extracted data
    if (contractor.name) confidence += 0.1;
    if (totals.total) confidence += 0.15;
    if (totals.subtotal) confidence += 0.1;
    if (totals.vatAmount) confidence += 0.1;
    if (lineItems.length > 0) confidence += 0.15;
    if (lineItems.length > 5) confidence += 0.1;
    if (reference) confidence += 0.05;
    if (contractor.email) confidence += 0.05;
    if (contractor.phone) confidence += 0.05;

    // Calculate category totals (before adding VAT as line item)
    const categoryTotals = this.calculateCategoryTotals(lineItems);

    // Validate line items sum to subtotal (sanity check)
    const lineItemsSum = this.sumLineItems(lineItems);
    const expectedSubtotal = totals.subtotal || (totals.total ? totals.total - (totals.vatAmount || 0) : 0);
    if (lineItems.length > 0 && expectedSubtotal > 0) {
      const discrepancy = Math.abs(lineItemsSum - expectedSubtotal);
      const discrepancyPercent = (discrepancy / expectedSubtotal) * 100;
      // Penalize confidence if line items don't match subtotal (within 2% tolerance)
      if (discrepancyPercent > 2) {
        confidence -= Math.min(0.15, discrepancyPercent / 100);
      }
    }

    // Final safety filter - remove any marketing "worth" items that slipped through
    const filteredLineItems = lineItems.filter(item => {
      const desc = item.description.toLowerCase();
      if (desc.includes('worth') && (
        desc.endsWith('worth') ||
        /worth\s*£/.test(desc) ||
        /£[\d,]+\.?\d*\s*worth/.test(desc) ||
        desc.includes('worth of')
      )) {
        console.log('[PDF Parser] Final filter removing marketing item:', item.description);
        return false;
      }
      return true;
    });

    // Sanitize line item descriptions to prevent XSS
    const sanitizedLineItems = filteredLineItems.map(item => ({
      ...item,
      description: this.sanitizeText(item.description) || item.description,
    }));

    // Line items are exc VAT - VAT is shown separately in totals
    // Apply sanitization to all text fields to prevent XSS attacks
    const quote: ExtractedQuote = {
      id: `quote-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      contractorName: this.sanitizeText(contractor.name) || 'Unknown Contractor',
      company: this.sanitizeText(contractor.company),
      contactName: this.sanitizeText(contractor.contactName),
      phone: this.sanitizeText(contractor.phone),
      email: contractor.email && this.isValidEmail(contractor.email) ? contractor.email : undefined,
      address: this.sanitizeText(contractor.address),
      quoteDate: dates.quoteDate,
      validUntil: dates.validUntil,
      reference: this.sanitizeText(reference),
      lineItems: sanitizedLineItems,
      subtotal: totals.subtotal || lineItemsSum || (totals.total ? totals.total - (totals.vatAmount || 0) : 0),
      vatRate: totals.vatRate,
      vatAmount: totals.vatAmount,
      total: totals.total || this.sumLineItems(lineItems),
      labourTotal: categoryTotals.labour,
      materialsTotal: categoryTotals.materials,
      fixturesTotal: categoryTotals.fixtures,
      otherTotal: categoryTotals.other + categoryTotals.sundries,
      sourceFileName: this.sanitizeText(fileName) || fileName,
      rawText: text, // Keep raw text for debugging but don't render it directly
      extractedAt: new Date().toISOString(),
      confidence: Math.min(confidence, 1),
    };

    return quote;
  }

  /**
   * Extract contractor information
   */
  private extractContractorInfo(text: string): {
    name?: string;
    company?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
  } {
    const result: { name?: string; company?: string; contactName?: string; phone?: string; email?: string; address?: string } = {};

    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      result.email = emailMatch[1];
    }

    // Extract phone - UK formats
    const phonePatterns = [
      /(?:T|Tel|Phone|Mobile|Call)[:\s]*([0-9\s\-\+\(\)]{10,})/i,
      /(?:^|\s)(0[0-9]{2,4}[\s\-]?[0-9]{3}[\s\-]?[0-9]{3,4})/m,
      /(?:^|\s)(\+44[\s\-]?[0-9\s\-]{9,})/m,
    ];

    for (const pattern of phonePatterns) {
      const phoneMatch = text.match(pattern);
      if (phoneMatch) {
        result.phone = phoneMatch[1].trim().replace(/\s+/g, ' ');
        break;
      }
    }

    // Try to extract company name from first few lines or common patterns
    const lines = text.split(/[\n\r]+/).slice(0, 20);

    // Look for company indicators
    const companyPatterns = [
      /^([A-Z][A-Za-z\s&]+(?:LTD|LIMITED|PLC|Ltd|Limited|plc|Services|Contractors?|Plumbing|Electrical|Builders?|Trading|Solutions|Group))/im,
      /([A-Z][A-Za-z\s&]+(?:LTD|LIMITED|PLC|Ltd|Limited|plc))/i,
    ];

    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match) {
        let companyName = match[1].trim();
        // Clean up common prefixes like "About Us"
        companyName = companyName.replace(/^(About\s*Us\s*)/i, '').trim();
        result.company = companyName;
        result.name = companyName;
        break;
      }
    }

    // Fallback: look in first lines for capitalized text
    if (!result.company) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 3 && trimmed.length < 100) {
          // Skip common non-company lines
          if (/^(date|estimate|quote|invoice|tel|phone|email|address|to:|from:|ref)/i.test(trimmed)) {
            continue;
          }
          // Look for lines with mostly capital letters (likely company name)
          if (/^[A-Z][A-Za-z\s&\-\.]+$/.test(trimmed) && trimmed.length > 5) {
            result.company = trimmed;
            result.name = trimmed;
            break;
          }
        }
      }
    }

    // Extract contact names from text
    // Look for patterns like "Pauline is our customer liaison manager" or "Jack is our installation manager"
    const contactPatterns = [
      /([A-Z][a-z]+)\s+is\s+our\s+(?:customer\s+)?(?:liaison|installation|project|site)\s*manager/gi,
      /(?:contact|speak\s+to|call)\s+([A-Z][a-z]+)/gi,
      /(?:manager|supervisor|foreman)[:\s]+([A-Z][a-z]+)/gi,
      /([A-Z][a-z]+)\s+will\s+(?:be\s+)?(?:your|the)\s+(?:main\s+)?(?:contact|point)/gi,
    ];

    const contactNames: string[] = [];
    for (const pattern of contactPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1];
        // Filter out common false positives
        if (!['The', 'Our', 'Your', 'This', 'That', 'Please', 'Thank', 'Dear', 'Any'].includes(name)) {
          if (!contactNames.includes(name)) {
            contactNames.push(name);
          }
        }
      }
    }

    if (contactNames.length > 0) {
      result.contactName = contactNames.join(', ');
    }

    // Extract address - look for UK postcode and surrounding lines
    const address = this.extractAddress(text);
    if (address) {
      result.address = address;
    }

    return result;
  }

  /**
   * Extract UK address from text
   * Looks for UK postcode pattern and extracts surrounding address lines
   */
  private extractAddress(text: string): string | undefined {
    // UK postcode pattern: e.g., SE20 7UA, SW1A 1AA, EC1A 1BB
    const postcodePattern = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/gi;

    // Find all postcodes
    const postcodes: { postcode: string; index: number }[] = [];
    let match;
    while ((match = postcodePattern.exec(text)) !== null) {
      postcodes.push({ postcode: match[1], index: match.index });
    }

    if (postcodes.length === 0) return undefined;

    // Try to find the contractor's postcode (usually appears early in document, not the customer's)
    // The customer address often appears after "To:" or "Customer:" or the contractor's address
    const lines = text.split(/[\n\r]+/);

    for (const { postcode, index } of postcodes) {
      // Find which line contains this postcode
      let charCount = 0;
      let postcodeLineIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        charCount += lines[i].length + 1; // +1 for newline
        if (charCount > index) {
          postcodeLineIndex = i;
          break;
        }
      }

      if (postcodeLineIndex === -1) continue;

      // Collect address lines (look back up to 3 lines for street address)
      const addressLines: string[] = [];
      const startLine = Math.max(0, postcodeLineIndex - 3);

      for (let i = startLine; i <= postcodeLineIndex; i++) {
        const line = lines[i].trim();

        // Skip empty lines, headers, dates
        if (!line) continue;
        if (/^(date|estimate|quote|invoice|tel|phone|email|to:|from:|ref|about\s*us)/i.test(line)) continue;

        // Look for address indicators
        const isAddressLine =
          // Contains numbers (street number)
          /^\d+/.test(line) ||
          // Contains road/street keywords
          /\b(road|street|avenue|lane|drive|close|way|court|place|grove|crescent|gardens?|terrace|square|hill|park|view|walk)\b/i.test(line) ||
          // Contains city/area names or is the postcode line
          line.includes(postcode) ||
          // Contains town/city patterns
          /\b(london|manchester|birmingham|leeds|glasgow|liverpool|bristol|sheffield|newcastle|nottingham)\b/i.test(line) ||
          // Short lines that could be part of address (city, county)
          (line.length > 3 && line.length < 40 && /^[A-Z]/.test(line) && !/^(mr|mrs|ms|miss|dr|dear)/i.test(line));

        if (isAddressLine) {
          addressLines.push(line);
        }
      }

      // If we found address lines, join them
      if (addressLines.length >= 2) {
        // Clean up and format the address
        const address = addressLines
          .map(l => l.trim())
          .filter(l => l.length > 0)
          .join(', ')
          .replace(/,\s*,/g, ',')
          .replace(/\s+/g, ' ')
          .trim();

        if (address.length > 10) {
          console.log('[PDF Parser] Extracted address:', address);
          return address;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract reference number
   */
  private extractReference(text: string): string | undefined {
    const patterns = [
      /(?:Estimate|Quote|Invoice)\s*(?:no\.?|number|#|ref)?[:\s]*([A-Za-z0-9\-\/]+)/i,
      /(?:Ref(?:erence)?|No\.?)[:\s#]*([A-Za-z0-9\-\/]+)/i,
      /(?:number)[:\s]*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const ref = match[1].trim();
        // Filter out dates and very short refs
        if (ref.length >= 3 && !/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(ref)) {
          return ref;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract dates
   */
  private extractDates(text: string): { quoteDate?: string; validUntil?: string } {
    const result: { quoteDate?: string; validUntil?: string } = {};

    // Date patterns - UK format DD/MM/YY or DD/MM/YYYY
    const datePatterns = [
      /(?:Date|Dated)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.quoteDate = this.parseDate(match[1]);
        break;
      }
    }

    // Valid until
    const validPatterns = [
      /(?:Valid\s*(?:until|to|for)|Expires?|Expiry)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(?:Valid\s*for)[:\s]*(\d+)\s*days?/i,
    ];

    for (const pattern of validPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (/days?/i.test(match[0])) {
          // Calculate date from days
          const days = parseInt(match[1], 10);
          const validDate = new Date();
          validDate.setDate(validDate.getDate() + days);
          result.validUntil = validDate.toISOString().split('T')[0];
        } else {
          result.validUntil = this.parseDate(match[1]);
        }
        break;
      }
    }

    return result;
  }

  /**
   * Parse date string to ISO format
   */
  private parseDate(dateStr: string): string {
    const parts = dateStr.split(/[\/-]/);
    if (parts.length === 3) {
      const [day, month, yearPart] = parts.map(p => parseInt(p, 10));
      const year = yearPart < 100 ? yearPart + 2000 : yearPart;
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    return dateStr;
  }

  /**
   * Extract totals (subtotal, VAT, total)
   */
  private extractTotals(text: string): {
    subtotal?: number;
    vatRate?: number;
    vatAmount?: number;
    total?: number;
  } {
    const result: { subtotal?: number; vatRate?: number; vatAmount?: number; total?: number } = {};

    // Extract total - look for the final/grand total
    // PDF text often has no spaces: "Total£9,340.00"
    // NOTE: Use the LAST match, not the max - grand total typically appears at bottom
    const totalPatterns = [
      /(?:Grand\s*)?Total[:\s]*£([\d,]+\.?\d*)/gi,
      /(?:Grand\s*)?Total£([\d,]+\.?\d*)/gi,  // No space version
      /(?:Amount\s*Due|Balance\s*Due|Invoice\s*Total)[:\s]*£?\s*([\d,]+\.?\d*)/gi,
    ];

    // Find all potential totals and use the LAST one (typically the grand total at the bottom)
    // This is better than using max(), which could pick a section total that's larger
    let lastTotalMatch: { amount: number; position: number } | null = null;
    for (const pattern of totalPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amount = this.parseAmount(match[1]);
        if (amount && amount > 0) {
          // Track position in text to find the last occurrence
          if (!lastTotalMatch || match.index > lastTotalMatch.position) {
            lastTotalMatch = { amount, position: match.index };
          }
        }
      }
    }

    if (lastTotalMatch) {
      result.total = lastTotalMatch.amount;
      console.log('[PDF Parser] Extracted total from PDF:', result.total, '(last match at position', lastTotalMatch.position + ')');
    }

    // Extract subtotal - look for ex VAT or sub total
    // PDF text often has no spaces: "Sub total£7,645.00" or "Exc VAT£7,645.00"
    // IMPORTANT:
    // 1. "Exc" must be REQUIRED for VAT patterns, not optional! Otherwise they match plain "VAT£"
    // 2. Prioritize "Exc VAT" over "Sub total" - some PDFs have multiple "Sub total" section totals
    //    but only one final "Exc VAT" total

    // First, try patterns that only appear once (final summary)
    const prioritySubtotalPatterns = [
      /Exc\s*VAT£([\d,]+\.?\d*)/gi,  // "Exc VAT£7,645.00" - most reliable
      /Ex\s*VAT£([\d,]+\.?\d*)/gi,  // "Ex VAT£7,645.00"
      /Exc\s*VAT[:\s]*£([\d,]+\.?\d*)/gi,  // "Exc VAT: £7,645.00"
      /Ex\s*VAT[:\s]*£([\d,]+\.?\d*)/gi,  // "Ex VAT: £7,645.00"
      /Net\s*Total[:\s]*£?\s*([\d,]+\.?\d*)/gi,
      /Total\s*(?:ex|excl?|excluding|before)\s*VAT[:\s]*£?\s*([\d,]+\.?\d*)/gi,
      /(?:excl?|excluding)\s*VAT[:\s]*£([\d,]+\.?\d*)/gi,
    ];

    // Fallback patterns - may have multiple matches in the document
    const fallbackSubtotalPatterns = [
      /Sub\s*-?\s*total£([\d,]+\.?\d*)/gi,  // "Sub total£7,645.00"
      /Sub\s*-?\s*total[:\s]*£([\d,]+\.?\d*)/gi,  // "Sub total: £7,645.00"
    ];

    console.log('[PDF Parser] Searching for subtotal patterns (priority first)...');

    // Try priority patterns first
    for (const pattern of prioritySubtotalPatterns) {
      const match = pattern.exec(text);
      if (match) {
        result.subtotal = this.parseAmount(match[1]);
        console.log('[PDF Parser] Extracted subtotal from PDF:', result.subtotal, 'using priority pattern:', pattern.source);
        break;
      }
    }

    // If no priority pattern matched, try fallback patterns and take the LAST match
    if (!result.subtotal) {
      console.log('[PDF Parser] No priority subtotal found, trying fallback patterns...');
      for (const pattern of fallbackSubtotalPatterns) {
        let match;
        let lastMatch = null;
        while ((match = pattern.exec(text)) !== null) {
          lastMatch = match;
          console.log('[PDF Parser] Found fallback subtotal match:', match[1]);
        }
        if (lastMatch) {
          result.subtotal = this.parseAmount(lastMatch[1]);
          console.log('[PDF Parser] Using LAST subtotal match:', result.subtotal);
          break;
        }
      }
    }

    if (!result.subtotal) {
      console.log('[PDF Parser] WARNING: No subtotal found in PDF text. Searching for relevant patterns...');
      // Log what patterns we might have in the text for debugging
      const subTotalMatches = text.match(/sub\s*-?\s*total/gi);
      const excVatMatches = text.match(/exc?\s*vat/gi);
      console.log('[PDF Parser] Found "sub total" variations:', subTotalMatches);
      console.log('[PDF Parser] Found "exc vat" variations:', excVatMatches);
    }

    // Extract VAT amount
    // PDF text often has no spaces: "VAT£1,695.00"
    // IMPORTANT: Must NOT match "Exc VAT£" or "Ex VAT£" - those are subtotals!
    // Strategy: Use line-start anchor (most reliable) and patterns that look for standalone VAT
    const vatPatterns = [
      /^\s*VAT£([\d,]+\.?\d*)/gim,  // "VAT£1,695.00" at start of line (most reliable)
      /^\s*VAT[:\s]+£([\d,]+\.?\d*)/gim,  // "VAT: £1,695" or "VAT £1,695" at line start
      /\bVAT\s*@?\s*20%?[:\s]*£([\d,]+\.?\d*)/gi,  // "VAT @ 20%: £1,695" or "VAT 20% £1,695"
      /\bVAT\s*\(?20%?\)?[:\s]*£([\d,]+\.?\d*)/gi,  // "VAT (20%): £1,695"
    ];

    // NOTE: We intentionally avoid patterns that could match "Exc VAT" or "Ex VAT"
    // Instead, we rely on line-start anchors since VAT amounts typically appear on their own line

    console.log('[PDF Parser] Searching for VAT patterns...');
    for (const pattern of vatPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // VAT amount is in first capture group
        const vatAmount = this.parseAmount(match[1]);
        // VAT should be less than subtotal (roughly 20% of subtotal)
        const maxExpectedVat = (result.subtotal || result.total || Infinity) * 0.3;
        console.log('[PDF Parser] VAT pattern match:', match[0], '-> amount:', vatAmount, 'max expected:', maxExpectedVat);
        if (vatAmount && vatAmount > 0 && vatAmount < maxExpectedVat) {
          result.vatAmount = vatAmount;
          console.log('[PDF Parser] Extracted VAT from PDF:', result.vatAmount, 'using pattern:', pattern.source);
          break;
        }
      }
      if (result.vatAmount) break;
    }

    // Try to infer VAT rate from context
    if (!result.vatRate && /20(?:\.\d+)?%/.test(text)) {
      result.vatRate = 20;
    }

    // Calculate VAT rate from amounts if we have both
    if (!result.vatRate && result.subtotal && result.vatAmount) {
      result.vatRate = Math.round((result.vatAmount / result.subtotal) * 1000) / 10;
    }

    // Only calculate VAT if not found in PDF and we have subtotal and total
    if (result.subtotal && result.total && !result.vatAmount) {
      const calculatedVat = result.total - result.subtotal;
      if (calculatedVat > 0 && calculatedVat < result.total) {
        result.vatAmount = calculatedVat;
        console.log('[PDF Parser] Calculated VAT from total-subtotal:', result.vatAmount);
      }
    }

    console.log('[PDF Parser] Final extracted totals:', {
      subtotal: result.subtotal || 'NOT FOUND',
      vatAmount: result.vatAmount || 'NOT FOUND',
      total: result.total || 'NOT FOUND',
      vatRate: result.vatRate || 'NOT FOUND'
    });

    // Sanity check: if subtotal + VAT doesn't equal total, log warning
    if (result.subtotal && result.vatAmount && result.total) {
      const calculatedTotal = result.subtotal + result.vatAmount;
      const diff = Math.abs(calculatedTotal - result.total);
      if (diff > 1) {  // Allow £1 tolerance for rounding
        console.log('[PDF Parser] WARNING: Totals don\'t add up!', {
          subtotal: result.subtotal,
          vatAmount: result.vatAmount,
          expectedTotal: calculatedTotal,
          actualTotal: result.total,
          difference: diff
        });
      }
    }

    return result;
  }

  /**
   * Extract line items from text
   * Handles both simple list formats and table formats
   */
  private extractLineItems(text: string): QuoteLineItem[] {
    const lines = text.split(/[\n\r]+/);

    // Detect table format using multiple signals:
    // 1. Traditional headers like "Unit price", "Quantity", "Total"
    // 2. Concatenated headers like "UnitpriceQuantityVAT"
    // 3. Data patterns like "£700.007.0020.00%£4,900.00" (no-space table rows)
    const hasTableHeaders = /Unit\s*price|Quantity|Total\s*\(exc\s*VAT\)/i.test(text);
    const hasConcatenatedHeaders = /UnitpriceQuantity|DescriptionUnit|VAT\s*\(%?\)/i.test(text);
    const hasNoSpaceTableData = /£[\d,]+\.\d{2}\d+\.\d{2}\d+\.\d{2}%£[\d,]+\.\d{2}/.test(text);

    const isTableFormat = hasTableHeaders || hasConcatenatedHeaders || hasNoSpaceTableData;

    console.log('[PDF Parser] Format detection:', {
      hasTableHeaders,
      hasConcatenatedHeaders,
      hasNoSpaceTableData,
      isTableFormat,
      textLength: text.length
    });

    // Try table extraction first if we detect table format
    if (isTableFormat) {
      const tableItems = this.extractTableLineItems(lines);
      if (tableItems.length > 0) {
        return tableItems;
      }
    }

    // Fall back to simple extraction
    const listItems = this.extractSimpleLineItems(lines);

    // If simple extraction gives suspicious results (only marketing items or very few),
    // try table extraction as a fallback
    if (listItems.length <= 3) {
      const tableItems = this.extractTableLineItems(lines);
      if (tableItems.length > listItems.length) {
        return tableItems;
      }
    }

    return listItems;
  }

  /**
   * Extract line items from table format (like AA Cooper estimates)
   */
  private extractTableLineItems(lines: string[]): QuoteLineItem[] {
    const items: QuoteLineItem[] = [];

    // Pattern for table rows: Description, Unit price (£X.XX), Quantity, VAT%, Total
    // PDF text often has NO SPACES between columns, e.g.:
    // "Bathroom preparation and product installation£700.007.0020.00%£4,900.00"

    // Debug: Log some potential table rows
    const potentialRows = lines.filter(l => /£[\d,]+\.\d{2}.*%.*£[\d,]+\.\d{2}/.test(l));
    if (potentialRows.length > 0) {
      console.log('[PDF Parser] Found', potentialRows.length, 'potential table rows');
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 10) continue;

      // Skip header rows, footer rows, and summary lines
      if (/^(Description|Unit\s*price|Quantity|VAT|Sub\s*total|Total|Exc\s*VAT|About\s*Us|Installation\s*Service)/i.test(line)) {
        continue;
      }

      // Skip lines that are just headers run together
      if (/^DescriptionUnit\s*price/i.test(line)) {
        continue;
      }

      // Pattern 1: No-space table format (AA Cooper style)
      // "Description£unitPrice quantity vat%£total" - no spaces between columns
      // Example: "Bathroom preparation£700.007.0020.00%£4,900.00"
      // = £700.00 (unit price) + 7.00 (qty) + 20.00% (VAT) + £4,900.00 (total)
      // Each number has exactly 2 decimal places
      const noSpacePattern = /^(.+?)£(-?[\d,]+\.\d{2})(\d+\.\d{2})(\d+\.\d{2})%£(-?[\d,]+\.\d{2})$/;
      const noSpaceMatch = line.match(noSpacePattern);

      // Also try a more flexible pattern that allows some variations
      const flexiblePattern = /^(.+?)£(-?[\d,]+\.?\d{0,2})(\d+\.?\d{0,2})(\d+\.?\d{0,2})%£(-?[\d,]+\.?\d{0,2})$/;

      // Try the strict pattern first, then flexible as fallback
      const match = noSpaceMatch || line.match(flexiblePattern);

      if (match) {
        const description = match[1].trim();
        const unitPrice = this.parseAmount(match[2]);
        const quantity = parseFloat(match[3]);
        const total = this.parseAmount(match[5]);

        // Skip VAT lines - VAT is handled separately in totals
        if (/^VAT\s*(@|at)?\s*\d*%?$/i.test(description)) {
          console.log('[PDF Parser] Skipping VAT line:', description);
          continue;
        }

        // Skip summary rows and headers
        if (/^(sub\s*-?\s*total|total|exc\s*vat|inc\s*vat|description)/i.test(description)) continue;

        // Skip marketing/promotional items - these are not actual charges
        // Patterns: "worth £X", "complimentary", "bonus", "included", "no charge", etc.
        if (/worth\s*$/i.test(description) ||           // ends with "worth"
            /worth\s*£/i.test(description) ||           // "worth £500"
            /£[\d,]+\.?\d*\s*worth/i.test(description) ||  // "£500 worth"
            /worth\s+of/i.test(description) ||          // "worth of extras"
            /that'?s\s+worth/i.test(description) ||     // "that's worth"
            /free\s+.*worth/i.test(description) ||      // "free upgrade worth"
            /\b(complimentary|bonus|included|no\s*charge|FOC)\b/i.test(description)) {  // other promotional terms
          console.log('[PDF Parser] Skipping marketing item:', description);
          continue;
        }

        // Skip notes/disclaimers (lines starting with parentheses or "this is")
        if (/^\(.*\)$/.test(description) || /^this\s+is\s+/i.test(description)) {
          console.log('[PDF Parser] Skipping note/disclaimer:', description);
          continue;
        }

        if (description.length >= 3 && total !== 0) {
          console.log('[PDF Parser] Matched table row:', description.substring(0, 50));
          items.push({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            description: description,
            category: this.categorizeItem(description),
            amount: total,
            quantity: quantity !== 1 ? quantity : undefined,
            unitPrice: unitPrice !== total ? unitPrice : undefined,
          });
        }
        continue;
      }

      // Log potential table rows that didn't match for debugging
      if (/£[\d,]+\.?\d*.*%.*£[\d,]+/.test(line) && !match) {
        console.log('[PDF Parser] Potential row did NOT match:', line.substring(0, 80));
      }

      // Pattern 1b: Row starting with £ (no description) - look back for description
      // Example: "£256.661.0020.00%£256.66" where description was on previous line
      const noDescPattern = /^£(-?[\d,]+\.\d{2})(\d+\.\d{2})(\d+\.\d{2})%£(-?[\d,]+\.\d{2})$/;
      const noDescMatch = line.match(noDescPattern);

      if (noDescMatch && i > 0) {
        // Look back for a description line (text only, no £ signs)
        let descriptionLine = '';
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const prevLine = lines[j].trim();
          // Skip empty lines and lines with prices/numbers
          if (prevLine && !/^[£\d\s\.\-%,]+$/.test(prevLine) && !prevLine.includes('£')) {
            // Skip header/summary lines and marketing items
            if (!/^(Description|Unit\s*price|Quantity|VAT|Sub\s*total|Total)/i.test(prevLine)) {
              // Skip marketing/promotional items
              if (/worth\s*$/i.test(prevLine) ||
                  /worth\s*£/i.test(prevLine) ||
                  /£[\d,]+\.?\d*\s*worth/i.test(prevLine) ||
                  /worth\s+of/i.test(prevLine) ||
                  /that'?s\s+worth/i.test(prevLine) ||
                  /free\s+.*worth/i.test(prevLine) ||
                  /\b(complimentary|bonus|included|no\s*charge|FOC)\b/i.test(prevLine)) continue;
              // Skip notes/disclaimers
              if (/^\(.*\)$/.test(prevLine) || /^this\s+is\s+/i.test(prevLine)) continue;
              descriptionLine = prevLine;
              break;
            }
          }
        }

        if (descriptionLine) {
          const unitPrice = this.parseAmount(noDescMatch[1]);
          const quantity = parseFloat(noDescMatch[2]);
          const total = this.parseAmount(noDescMatch[4]);

          // Skip VAT amounts
          if (/^VAT/i.test(descriptionLine)) continue;

          if (total !== 0) {
            console.log('[PDF Parser] Matched row with lookback desc:', descriptionLine.substring(0, 40));
            items.push({
              id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              description: descriptionLine,
              category: this.categorizeItem(descriptionLine),
              amount: total,
              quantity: quantity !== 1 ? quantity : undefined,
              unitPrice: unitPrice !== total ? unitPrice : undefined,
            });
          }
        }
        continue;
      }

      // Pattern 2: Full table row with spaces between columns
      // "Description £unit_price quantity vat% £total"
      const fullRowPattern = /^(.+?)\s+£([\d,]+\.?\d*)\s+([\d.]+)\s+[\d.]+%\s+£([\d,]+\.?\d*)$/;
      const fullMatch = line.match(fullRowPattern);

      if (fullMatch) {
        const description = fullMatch[1].trim();
        const unitPrice = this.parseAmount(fullMatch[2]);
        const quantity = parseFloat(fullMatch[3]);
        const total = this.parseAmount(fullMatch[4]);

        // Skip if this looks like a summary row
        if (/^(sub\s*total|total|vat|exc\s*vat)/i.test(description)) continue;

        if (description.length >= 3 && total !== 0) {
          items.push({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            description: description,
            category: this.categorizeItem(description),
            amount: total,
            quantity: quantity !== 1 ? quantity : undefined,
            unitPrice: unitPrice !== total ? unitPrice : undefined,
          });
        }
        continue;
      }

      // Pattern 2: Line with just description and final amount
      // "Some description £1,234.56"
      const simplePattern = /^(.+?)\s+£([\d,]+\.?\d*)$/;
      const simpleMatch = line.match(simplePattern);

      if (simpleMatch) {
        const description = simpleMatch[1].trim();
        const amount = this.parseAmount(simpleMatch[2]);

        // Skip if this looks like a summary row
        if (/^(sub\s*-?\s*total|^total|^vat|exc\s*vat|grand\s*total)/i.test(description)) continue;

        // Skip very short descriptions or pure numbers
        if (description.length < 5 || /^[\d\s\.\-%]+$/.test(description)) continue;

        if (amount !== 0) {
          // Check if there's quantity info in the description
          const qtyMatch = description.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(.+)$/i);

          items.push({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            description: qtyMatch ? qtyMatch[2].trim() : description,
            category: this.categorizeItem(description),
            amount: amount,
            quantity: qtyMatch ? parseFloat(qtyMatch[1]) : undefined,
          });
        }
        continue;
      }

      // Pattern 3: Handle multi-line descriptions by looking ahead
      // Check if next line contains price info
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const priceOnlyPattern = /^£([\d,]+\.?\d*)\s+([\d.]+)\s+[\d.]+%\s+£([\d,]+\.?\d*)$/;
        const priceMatch = nextLine.match(priceOnlyPattern);

        if (priceMatch && line.length > 10 && !/^[£\d\s\.\-%]+$/.test(line)) {
          const unitPrice = this.parseAmount(priceMatch[1]);
          const quantity = parseFloat(priceMatch[2]);
          const total = this.parseAmount(priceMatch[3]);

          items.push({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            description: line,
            category: this.categorizeItem(line),
            amount: total,
            quantity: quantity !== 1 ? quantity : undefined,
            unitPrice: unitPrice !== total ? unitPrice : undefined,
          });
          i++; // Skip the next line since we consumed it
        }
      }
    }

    return items;
  }

  /**
   * Extract line items from simple list format
   */
  private extractSimpleLineItems(lines: string[]): QuoteLineItem[] {
    const items: QuoteLineItem[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) continue;

      // Skip header/total lines
      if (/^(sub\s*-?\s*total|total|vat|grand\s*total|description|amount)/i.test(trimmed)) continue;

      // Skip VAT lines - VAT is handled separately in totals
      if (/^VAT\s*(@|at)?\s*\d*%?/i.test(trimmed)) continue;

      // Skip marketing/promotional items (not actual billable items)
      if (/worth\s*$/i.test(trimmed) ||
          /worth\s*£/i.test(trimmed) ||
          /£[\d,]+\.?\d*\s*worth/i.test(trimmed) ||
          /worth\s+of/i.test(trimmed) ||
          /that'?s\s+worth/i.test(trimmed) ||
          /free\s+.*worth/i.test(trimmed) ||
          /\b(complimentary|bonus|included|no\s*charge|FOC)\b/i.test(trimmed)) continue;

      // Skip notes/disclaimers (lines in parentheses or starting with "this is")
      if (/^\(.*\)$/.test(trimmed) || /^this\s+is\s+/i.test(trimmed) || /^\(this\s+is/i.test(trimmed)) continue;

      // Look for lines with amounts at the end
      const amountMatch = trimmed.match(/^(.+?)\s+£?\s*([\d,]+\.?\d{0,2})\s*$/);
      if (amountMatch) {
        const amount = this.parseAmount(amountMatch[2]);
        if (amount && amount > 0) {
          const description = amountMatch[1].trim();

          // Skip very short descriptions or obvious non-items
          if (description.length < 3 || /^[\d\s\-\.]+$/.test(description)) continue;

          // Skip marketing/promotional items
          if (/worth\s*$/i.test(description) ||
              /worth\s*£/i.test(description) ||
              /£[\d,]+\.?\d*\s*worth/i.test(description) ||
              /worth\s+of/i.test(description) ||
              /that'?s\s+worth/i.test(description) ||
              /free\s+.*worth/i.test(description) ||
              /\b(complimentary|bonus|included|no\s*charge|FOC)\b/i.test(description)) continue;

          // Check for quantity pattern (e.g., "2 x Basin £50.00" or "Tiles (5m²) £150")
          const qtyMatch = description.match(/^(\d+)\s*[x×]\s*(.+)$/i);
          const qtyMatch2 = description.match(/\((\d+)\s*(?:m²|m2|sqm|pcs?|units?|hrs?|hours?)\)/i);

          const item: QuoteLineItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            description: qtyMatch ? qtyMatch[2].trim() : description,
            category: this.categorizeItem(description),
            amount: amount,
          };

          if (qtyMatch) {
            item.quantity = parseInt(qtyMatch[1], 10);
            item.unitPrice = amount / item.quantity;
          } else if (qtyMatch2) {
            item.quantity = parseInt(qtyMatch2[1], 10);
          }

          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Categorize line item based on description
   */
  private categorizeItem(description: string): QuoteCategory {
    const descLower = description.toLowerCase();

    // Check for discount/credit
    if (/discount|credit|deduction|off\s*$/i.test(description)) {
      return 'other';
    }

    // Check each category
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (category === 'other' || category === 'vat') continue;
      if (keywords.some(keyword => descLower.includes(keyword))) {
        return category as QuoteCategory;
      }
    }

    // Additional category detection based on common terms
    if (/plaster|skim|render/i.test(descLower)) return 'labour';
    if (/tile|tiling/i.test(descLower)) return 'labour';
    if (/install|fitting|preparation|fix\b/i.test(descLower)) return 'labour';
    if (/spot\s*light|extractor|mirror|shower|bath|toilet|basin|towel\s*rail/i.test(descLower)) return 'fixtures';
    if (/underfloor|heating|wiring|electric/i.test(descLower)) return 'fixtures';
    if (/sundries|waste|disposal|delivery|skip/i.test(descLower)) return 'sundries';

    return 'other';
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    const cleaned = amountStr.replace(/[£,\s]/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  }

  /**
   * Sum all line items
   */
  private sumLineItems(items: QuoteLineItem[]): number {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }

  /**
   * Calculate totals by category
   */
  private calculateCategoryTotals(items: QuoteLineItem[]): Record<string, number> {
    const totals: Record<string, number> = {
      labour: 0,
      materials: 0,
      fixtures: 0,
      sundries: 0,
      other: 0,
    };

    for (const item of items) {
      if (item.category in totals) {
        totals[item.category] += item.amount;
      } else {
        totals.other += item.amount;
      }
    }

    return totals;
  }

  /**
   * Parse text directly (for manual paste)
   */
  parseTextDirectly(text: string, contractorName: string = 'Unknown'): ExtractedQuote | null {
    const quote = this.parseQuoteText(text, 'manual-entry');
    if (quote) {
      quote.contractorName = contractorName;
    }
    return quote;
  }

  /**
   * Update line item category
   */
  updateItemCategory(quote: ExtractedQuote, itemId: string, newCategory: QuoteCategory): ExtractedQuote {
    const updatedItems = quote.lineItems.map(item =>
      item.id === itemId ? { ...item, category: newCategory } : item
    );

    const categoryTotals = this.calculateCategoryTotals(updatedItems);

    return {
      ...quote,
      lineItems: updatedItems,
      labourTotal: categoryTotals.labour,
      materialsTotal: categoryTotals.materials,
      fixturesTotal: categoryTotals.fixtures,
      otherTotal: categoryTotals.other + categoryTotals.sundries,
    };
  }

  /**
   * Add manual line item
   * Note: Preserves extracted PDF totals, only updates category breakdowns
   */
  addLineItem(quote: ExtractedQuote, item: Omit<QuoteLineItem, 'id'>): ExtractedQuote {
    const newItem: QuoteLineItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    };

    const updatedItems = [...quote.lineItems, newItem];
    const categoryTotals = this.calculateCategoryTotals(updatedItems);

    // Preserve extracted PDF totals - don't recalculate
    return {
      ...quote,
      lineItems: updatedItems,
      labourTotal: categoryTotals.labour,
      materialsTotal: categoryTotals.materials,
      fixturesTotal: categoryTotals.fixtures,
      otherTotal: categoryTotals.other + categoryTotals.sundries,
    };
  }

  /**
   * Remove line item
   * Note: Preserves extracted PDF totals, only updates category breakdowns
   */
  removeLineItem(quote: ExtractedQuote, itemId: string): ExtractedQuote {
    const updatedItems = quote.lineItems.filter(item => item.id !== itemId);
    const categoryTotals = this.calculateCategoryTotals(updatedItems);

    // Preserve extracted PDF totals - don't recalculate
    return {
      ...quote,
      lineItems: updatedItems,
      labourTotal: categoryTotals.labour,
      materialsTotal: categoryTotals.materials,
      fixturesTotal: categoryTotals.fixtures,
      otherTotal: categoryTotals.other + categoryTotals.sundries,
    };
  }
}

export const pdfQuoteExtractor = new PDFQuoteExtractorService();
export default pdfQuoteExtractor;
