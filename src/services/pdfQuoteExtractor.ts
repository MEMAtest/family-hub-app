import {
  ExtractedQuote,
  QuoteLineItem,
  QuoteCategory,
  PDFQuoteExtractionResult,
  QUOTE_PATTERNS,
  CATEGORY_KEYWORDS,
  CONFIDENCE_THRESHOLDS,
} from '@/types/quote.types';

class PDFQuoteExtractorService {
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

    try {
      // Extract text from PDF
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
   * Extract text from PDF file using browser APIs
   * Note: For production, consider using PDF.js or a backend service
   */
  private async extractTextFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;

          // Try to extract text from PDF
          // In a real implementation, you'd use PDF.js or similar
          // For now, we'll attempt basic text extraction
          const uint8Array = new Uint8Array(arrayBuffer);
          const text = this.extractTextFromPDFBytes(uint8Array);

          resolve(text);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Basic PDF text extraction from bytes
   * This is a simplified version - for production use PDF.js
   */
  private extractTextFromPDFBytes(bytes: Uint8Array): string {
    // Convert to string and extract readable text
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawText = decoder.decode(bytes);

    // Try to find text streams in PDF
    const textMatches: string[] = [];

    // Look for text between parentheses (PDF string format)
    const parenRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = parenRegex.exec(rawText)) !== null) {
      const text = match[1];
      if (text.length > 2 && /[a-zA-Z0-9£]/.test(text)) {
        textMatches.push(text);
      }
    }

    // Look for text between BT and ET markers (text blocks)
    const textBlockRegex = /BT\s*([\s\S]*?)\s*ET/g;
    while ((match = textBlockRegex.exec(rawText)) !== null) {
      const block = match[1];
      const innerTextRegex = /\(([^)]+)\)/g;
      let innerMatch;
      while ((innerMatch = innerTextRegex.exec(block)) !== null) {
        if (innerMatch[1].length > 2) {
          textMatches.push(innerMatch[1]);
        }
      }
    }

    // Join and clean up
    let extractedText = textMatches.join(' ');

    // Clean up common PDF artifacts
    extractedText = extractedText
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();

    return extractedText;
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
    if (reference) confidence += 0.05;

    // Calculate category totals
    const categoryTotals = this.calculateCategoryTotals(lineItems);

    const quote: ExtractedQuote = {
      id: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractorName: contractor.name || 'Unknown Contractor',
      company: contractor.company,
      phone: contractor.phone,
      email: contractor.email,
      quoteDate: dates.quoteDate,
      validUntil: dates.validUntil,
      reference: reference,
      lineItems: lineItems,
      subtotal: totals.subtotal || (totals.total ? totals.total - (totals.vatAmount || 0) : 0),
      vatRate: totals.vatRate,
      vatAmount: totals.vatAmount,
      total: totals.total || this.sumLineItems(lineItems),
      labourTotal: categoryTotals.labour,
      materialsTotal: categoryTotals.materials,
      fixturesTotal: categoryTotals.fixtures,
      otherTotal: categoryTotals.other + categoryTotals.sundries,
      sourceFileName: fileName,
      rawText: text,
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
    phone?: string;
    email?: string;
  } {
    const result: { name?: string; company?: string; phone?: string; email?: string } = {};

    // Extract email
    const emailMatch = text.match(QUOTE_PATTERNS.email);
    if (emailMatch) {
      result.email = emailMatch[0];
    }

    // Extract phone
    const phoneRegex = /(?:tel(?:ephone)?|phone|mobile|mob|call)[:\s]*([\d\s\-\+\(\)]{10,})/gi;
    const phoneMatch = phoneRegex.exec(text);
    if (phoneMatch) {
      result.phone = phoneMatch[1].trim();
    }

    // Try to extract company name from first few lines
    const lines = text.split(/[\n\r]+/).slice(0, 10);
    for (const line of lines) {
      const trimmed = line.trim();
      // Company names often contain Ltd, Limited, Services, etc.
      if (/\b(ltd|limited|plc|services|contractors?|plumbing|electrical|builders?|trading)\b/i.test(trimmed)) {
        result.company = trimmed.substring(0, 100);
        result.name = trimmed.substring(0, 100);
        break;
      }
    }

    return result;
  }

  /**
   * Extract reference number
   */
  private extractReference(text: string): string | undefined {
    const refRegex = /(?:quote\s*(?:no\.?|number|ref)|ref(?:erence)?(?:\s*no\.?)?|invoice\s*(?:no\.?|number))[:\s#]*([A-Za-z0-9\-\/]+)/gi;
    const match = refRegex.exec(text);
    return match ? match[1] : undefined;
  }

  /**
   * Extract dates
   */
  private extractDates(text: string): { quoteDate?: string; validUntil?: string } {
    const result: { quoteDate?: string; validUntil?: string } = {};

    // Quote date
    const dateRegex = /(?:date|dated|quote\s*date)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/gi;
    const dateMatch = dateRegex.exec(text);
    if (dateMatch) {
      result.quoteDate = this.parseDate(dateMatch[1]);
    }

    // Valid until
    const validRegex = /(?:valid\s*(?:until|to|for)|expires?|expiry)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/gi;
    const validMatch = validRegex.exec(text);
    if (validMatch) {
      result.validUntil = this.parseDate(validMatch[1]);
    }

    return result;
  }

  /**
   * Parse date string to ISO format
   */
  private parseDate(dateStr: string): string {
    const parts = dateStr.split(/[\/-]/);
    if (parts.length === 3) {
      let [day, month, year] = parts.map(p => parseInt(p, 10));
      if (year < 100) year += 2000;
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

    // Extract total
    const totalRegex = /(?:total|grand\s*total|amount\s*due|balance\s*due|invoice\s*total|total\s*amount)[:\s]*(£?\s*[\d,]+\.?\d*)/gi;
    let match;
    while ((match = totalRegex.exec(text)) !== null) {
      const amount = this.parseAmount(match[1]);
      if (amount && (!result.total || amount > result.total)) {
        result.total = amount;
      }
    }

    // Extract subtotal
    const subtotalRegex = /(?:sub\s*-?\s*total|net\s*total|total\s*(?:before|ex(?:cl)?\.?)\s*vat)[:\s]*(£?\s*[\d,]+\.?\d*)/gi;
    match = subtotalRegex.exec(text);
    if (match) {
      result.subtotal = this.parseAmount(match[1]);
    }

    // Extract VAT
    const vatRegex = /(?:VAT|V\.A\.T\.?)\s*(?:@?\s*(\d+(?:\.\d+)?)\s*%)?[:\s]*(£?\s*[\d,]+\.?\d*)/gi;
    match = vatRegex.exec(text);
    if (match) {
      if (match[1]) {
        result.vatRate = parseFloat(match[1]);
      }
      if (match[2]) {
        result.vatAmount = this.parseAmount(match[2]);
      }
    }

    // If we have subtotal and total but no VAT, calculate it
    if (result.subtotal && result.total && !result.vatAmount) {
      result.vatAmount = result.total - result.subtotal;
      if (result.vatAmount > 0) {
        result.vatRate = (result.vatAmount / result.subtotal) * 100;
      }
    }

    return result;
  }

  /**
   * Extract line items from text
   */
  private extractLineItems(text: string): QuoteLineItem[] {
    const items: QuoteLineItem[] = [];
    const lines = text.split(/[\n\r]+/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) continue;

      // Skip header/total lines
      if (/^(sub\s*-?\s*total|total|vat|grand\s*total)/i.test(trimmed)) continue;

      // Look for lines with amounts
      const amountMatch = trimmed.match(/£?\s*([\d,]+\.?\d{0,2})\s*$/);
      if (amountMatch) {
        const amount = this.parseAmount(amountMatch[1]);
        if (amount && amount > 0) {
          const description = trimmed.replace(amountMatch[0], '').trim();

          // Skip very short descriptions or obvious non-items
          if (description.length < 3 || /^[\d\s\-\.]+$/.test(description)) continue;

          // Check for quantity pattern (e.g., "2 x Basin £50.00" or "Tiles (5m²) £150")
          const qtyMatch = description.match(/^(\d+)\s*[x×]\s*(.+)$/i);
          const qtyMatch2 = description.match(/\((\d+)\s*(?:m²|m2|sqm|pcs?|units?|hrs?|hours?)\)/i);

          const item: QuoteLineItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (category === 'other') continue;
      if (keywords.some(keyword => descLower.includes(keyword))) {
        return category as QuoteCategory;
      }
    }

    return 'other';
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string): number {
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
   */
  addLineItem(quote: ExtractedQuote, item: Omit<QuoteLineItem, 'id'>): ExtractedQuote {
    const newItem: QuoteLineItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const updatedItems = [...quote.lineItems, newItem];
    const categoryTotals = this.calculateCategoryTotals(updatedItems);
    const newSubtotal = this.sumLineItems(updatedItems);
    const newVat = quote.vatRate ? newSubtotal * (quote.vatRate / 100) : 0;

    return {
      ...quote,
      lineItems: updatedItems,
      subtotal: newSubtotal,
      vatAmount: newVat,
      total: newSubtotal + newVat,
      labourTotal: categoryTotals.labour,
      materialsTotal: categoryTotals.materials,
      fixturesTotal: categoryTotals.fixtures,
      otherTotal: categoryTotals.other + categoryTotals.sundries,
    };
  }

  /**
   * Remove line item
   */
  removeLineItem(quote: ExtractedQuote, itemId: string): ExtractedQuote {
    const updatedItems = quote.lineItems.filter(item => item.id !== itemId);
    const categoryTotals = this.calculateCategoryTotals(updatedItems);
    const newSubtotal = this.sumLineItems(updatedItems);
    const newVat = quote.vatRate ? newSubtotal * (quote.vatRate / 100) : 0;

    return {
      ...quote,
      lineItems: updatedItems,
      subtotal: newSubtotal,
      vatAmount: newVat,
      total: newSubtotal + newVat,
      labourTotal: categoryTotals.labour,
      materialsTotal: categoryTotals.materials,
      fixturesTotal: categoryTotals.fixtures,
      otherTotal: categoryTotals.other + categoryTotals.sundries,
    };
  }
}

export const pdfQuoteExtractor = new PDFQuoteExtractorService();
export default pdfQuoteExtractor;
