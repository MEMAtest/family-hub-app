/**
 * Receipt OCR and parsing types
 */

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrResult {
  text: string;
  confidence: number;
  words?: OcrWord[];
  processingTime?: number;
}

export interface ParsedReceipt {
  name: string;
  amount: number;
  category: string;
  paymentDate: string;
  confidence: number;
  rawText: string;
  warnings?: string[];
}

export interface ReceiptParseOptions {
  defaultDate?: Date;
  preferredCurrency?: 'GBP' | 'USD' | 'EUR';
}

export type OcrProcessingStage =
  | 'idle'
  | 'loading'
  | 'preprocessing'
  | 'recognizing'
  | 'parsing'
  | 'complete'
  | 'error';
