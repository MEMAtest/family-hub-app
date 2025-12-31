export type StatementDirection = 'debit' | 'credit';
export type StatementSource = 'csv' | 'pdf' | 'xlsx';

export interface StatementTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: StatementDirection;
  category: string;
  bankCategory?: string;
  reference?: string;
  counterparty?: string;
  balance?: number;
  confidence?: number;
  source: StatementSource;
  warnings?: string[];
}

export interface StatementParseMetadata {
  bank?: string;
  sourceType?: StatementSource;
  startDate?: string;
  endDate?: string;
  statementDate?: string;
  currency?: string;
}

export interface StatementParseResult {
  success: boolean;
  transactions: StatementTransaction[];
  warnings: string[];
  errors: string[];
  metadata: StatementParseMetadata;
}
