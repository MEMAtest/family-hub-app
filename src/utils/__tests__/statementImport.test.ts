import fs from 'fs';
import path from 'path';
import {
  buildConfidenceWarnings,
  normalizeConfidence,
  parseCsvStatement,
  parseGenericPdfText,
  parseVirginMoneyPdfText,
} from '../statementImport';

describe('statementImport', () => {
  it('parses Starling CSV statements into normalized transactions', () => {
    const csv = [
      'Date,Counter party,Reference,Type,Amount,Balance,Spending category',
      '01/06/2025,Tesco,,CARD,-12.34,1000.00,GROCERIES',
      '02/06/2025,Acme Ltd,Payroll,BACS,2500.00,3500.00,INCOME',
    ].join('\n');

    const result = parseCsvStatement(csv);

    expect(result.success).toBe(true);
    expect(result.metadata.bank).toBe('Starling');
    expect(result.metadata.startDate).toBe('2025-06-01');
    expect(result.metadata.endDate).toBe('2025-06-02');
    expect(result.transactions).toHaveLength(2);

    const [first, second] = result.transactions;
    expect(first.date).toBe('2025-06-01');
    expect(first.amount).toBe(12.34);
    expect(first.direction).toBe('debit');
    expect(first.category).toBe('Food & Dining');

    expect(second.date).toBe('2025-06-02');
    expect(second.amount).toBe(2500);
    expect(second.direction).toBe('credit');
    expect(second.category).toBe('Other');
  });

  it('parses Virgin Money PDF text into transactions with balances', () => {
    const text = [
      'Statement date 01 December 2025',
      'DateDescriptionDebitsCreditsBalance',
      'Previous statement 1,000.00',
      '03 Nov',
      'Tesco Stores 12.34 987.66',
      '05 Nov',
      'Virgin Trains 45.00 942.66',
      '06 Nov',
      'Salary BACS 1500.00 2,442.66',
      '07 Nov',
      'Water Bill 38.06 2,404.60',
      '08 Nov',
      'Cash Withdrawal 100.00',
      '2,304.60',
      'Page 2 of 3',
    ].join('\n');

    const result = parseVirginMoneyPdfText(text);

    expect(result.success).toBe(true);
    expect(result.metadata.bank).toBe('Virgin Money');
    expect(result.metadata.statementDate).toBe('2025-12-01');
    expect(result.metadata.startDate).toBe('2025-11-03');
    expect(result.metadata.endDate).toBe('2025-11-08');
    expect(result.transactions).toHaveLength(5);

    const salary = result.transactions[2];
    expect(salary.description).toContain('Salary');
    expect(salary.direction).toBe('credit');

    const last = result.transactions[4];
    expect(last.balance).toBe(2304.6);
    expect(last.direction).toBe('debit');
  });

  it('parses HSBC-style CSV statements from fixtures', () => {
    const csvPath = path.join(__dirname, 'fixtures', 'hsbc.csv');
    const csv = fs.readFileSync(csvPath, 'utf8');
    const result = parseCsvStatement(csv);

    expect(result.success).toBe(true);
    expect(result.transactions).toHaveLength(3);

    const [first, second, third] = result.transactions;
    expect(first.direction).toBe('debit');
    expect(first.amount).toBe(12.34);
    expect(first.category).toBe('Clothing');

    expect(second.direction).toBe('credit');
    expect(second.amount).toBe(2500);

    expect(third.direction).toBe('debit');
    expect(third.category).toBe('Utilities');
  });

  it('parses Lloyds PDF text format from fixtures', () => {
    const pdfPath = path.join(__dirname, 'fixtures', 'lloyds_statement.txt');
    const text = fs.readFileSync(pdfPath, 'utf8');
    const result = parseGenericPdfText(text);

    expect(result.success).toBe(true);
    expect(result.metadata.bank).toBe('Lloyds');
    expect(result.metadata.startDate).toBe('2025-11-01');
    expect(result.metadata.endDate).toBe('2025-11-03');
    expect(result.transactions).toHaveLength(3);

    const salary = result.transactions[1];
    expect(salary.direction).toBe('credit');
  });

  it('normalizes AI confidence values and flags low confidence', () => {
    expect(normalizeConfidence('0.72')).toBe(0.72);
    expect(normalizeConfidence(1.4)).toBe(1);
    expect(normalizeConfidence(-0.2)).toBe(0);
    expect(normalizeConfidence('abc')).toBeUndefined();

    expect(buildConfidenceWarnings(0.5)[0]).toContain('Low AI confidence');
    expect(buildConfidenceWarnings(0.8)).toHaveLength(0);
  });
});
