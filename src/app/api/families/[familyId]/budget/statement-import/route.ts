import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { approvedStatementRow, createStatementPreview, readStatementPreview } from '@/lib/statementPreview';
import prisma from '@/lib/prisma';
import { createId } from '@/utils/id';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { extractStatementPdf } from '@/lib/statementPdf';

// Force Node.js runtime for pdf-parse and file processing
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  buildConfidenceWarnings,
  detectBankFromText,
  extractPdfSection,
  inferCategoryFromDescription,
  inferDirectionFromDescription,
  normalizeConfidence,
  parseCsvStatement,
  parseGenericPdfText,
  parseStatementDateFromPdf,
  parseStatementRows,
  parseVirginMoneyPdfText,
} from '@/utils/statementImport';
import type { StatementDirection, StatementParseResult, StatementTransaction } from '@/types/statementImport.types';

const ALLOWED_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

/**
 * Parse statement using OpenRouter AI (uses GPT-4o-mini which is cheap and effective)
 */
const parseWithAI = async (text: string, statementDate?: string): Promise<StatementTransaction[]> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const section = extractPdfSection(text);

  const expenseCategories = EXPENSE_CATEGORIES;
  const incomeCategories = INCOME_CATEGORIES;

  const systemPrompt = `You are a UK bank statement parser. Extract ALL transactions and return ONLY valid JSON.

Return this structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": 12.34,
      "direction": "debit" | "credit",
      "balance": 123.45,
      "category": "string",
      "confidence": 0.9
    }
  ]
}

CATEGORY RULES (do not guess unsupported categories):
For DEBITS (expenses), use one of: ${expenseCategories.join(', ')}
For CREDITS (income), use one of: ${incomeCategories.join(', ')}

Category mapping hints:
- Supermarkets (Tesco, Sainsbury's, Aldi, Lidl, ASDA, M&S Food, Waitrose, Morrisons, Ocado) → Food & Dining
- Restaurants, cafes, takeaways, Deliveroo, Uber Eats, Just Eat → Food & Dining
- TfL, trains, Uber, Bolt, petrol, parking, car services → Transportation
- Netflix, Spotify, Disney+, cinema, gym, games → Entertainment
- Pharmacy, Boots, NHS, dentist, optician → Healthcare
- School, nursery, childcare fees → Childcare
- University, courses, books → Education
- Gas, electric, water, broadband, phone bills, council tax → Utilities
- Insurance premiums → Insurance
- Rent, mortgage → Housing
- Clothing shops (Primark, ASOS, Next, H&M) → Clothing
- General Amazon purchases → Other unless the purchase category is explicit
- Salary, wages, BACS credits from employers → Salary
- Refunds → use the category of what was refunded if clear, otherwise Other
- Bank transfers → If explicitly from employer = Salary, otherwise Other

Use "Other" whenever the statement does not establish a category. Never infer investments or salary from an unexplained transfer.

Other rules:
- Amount is absolute value (no negative). Use "direction" for debit/credit.
- If balance is missing, omit it.
- If year is missing, use statement date (${statementDate ?? 'unknown'}) to infer year.
- Only include actual transactions, ignore headings/notes/page markers.
- Confidence: 0-1 indicating extraction certainty.
- Return ONLY JSON, no markdown.`;

  const userPrompt = `Statement text:\n${section}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://family-hub-app.local',
      'X-Title': 'Family Hub App',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenRouter response');
  }

  let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  const parsed = JSON.parse(cleaned) as { transactions?: Array<Record<string, any>> };

  const aiTransactions = (parsed.transactions ?? []).map((item) => {
    const description = String(item.description || 'Statement item').trim();
    const amount = Number(item.amount || 0);
    const direction = item.direction === 'credit' ? 'credit' : 'debit';
    const category = ALLOWED_CATEGORIES.includes(item.category) ? item.category : inferCategoryFromDescription(description);
    const confidence = normalizeConfidence(item.confidence);
    const confidenceWarnings = buildConfidenceWarnings(confidence);

    return {
      id: createId('statement'),
      date: String(item.date || ''),
      description,
      amount,
      direction,
      category,
      balance: typeof item.balance === 'number' ? item.balance : undefined,
      confidence,
      source: 'pdf',
      warnings: confidenceWarnings.length ? confidenceWarnings : undefined,
    } satisfies StatementTransaction;
  });

  return aiTransactions;
};

const normalizeDirection = (direction?: string, description?: string): StatementDirection => {
  if (direction === 'credit' || direction === 'debit') return direction;
  if (description) {
    const inferred = inferDirectionFromDescription(description);
    if (inferred) return inferred;
  }
  return 'debit';
};

const transactionFingerprint = (transaction: StatementTransaction) =>
  createHash('sha256')
    .update(`${transaction.date}|${transaction.description.trim().toLowerCase().replace(/\s+/g, ' ')}|${Number(transaction.amount).toFixed(2)}|${transaction.direction}`)
    .digest('hex');

async function persistStatementImport({
  familyId,
  accountId,
  fileName,
  contentHash,
  sourceType,
  result,
  originalTransactions,
  importedById,
}: {
  familyId: string;
  accountId: string;
  fileName: string;
  contentHash: string;
  sourceType: string;
  result: StatementParseResult;
  originalTransactions: StatementTransaction[];
  importedById: string;
}) {
  const account = await prisma.budgetAccount.findFirst({ where: { id: accountId, familyId, active: true }, select: { id: true } });
  if (!account) throw new Error('Choose a household account before importing a statement.');

  // Stable occurrence numbers retain legitimate identical rows when saving a subset.
  const occurrences = new Map<string, number>();
  const rowOccurrences = new Map<string, number>();
  originalTransactions.forEach(row => {
    const key = transactionFingerprint(row);
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    rowOccurrences.set(row.id, occurrence);
  });
  const fingerprints = new Map(result.transactions.map(row => {
    const base = transactionFingerprint(row);
    const occurrence = rowOccurrences.get(row.id) ?? 0;
    return [row.id, occurrence === 0 ? base : createHash('sha256').update(`${base}|occurrence:${occurrence}`).digest('hex')];
  }));
  if (new Set(fingerprints.values()).size !== result.transactions.length) throw new Error('Edited rows have become indistinguishable. Review their dates, descriptions and amounts.');

  const validRows = result.transactions
    .map((transaction) => ({ ...transaction, direction: normalizeDirection(transaction.direction, transaction.description) }))
    .filter((transaction) => !Number.isNaN(new Date(`${transaction.date}T12:00:00Z`).getTime()) && Number(transaction.amount) > 0);
  const rejectedRows = result.transactions
    .filter((transaction) => !validRows.some((valid) => valid.id === transaction.id))
    .map((transaction) => ({ id: transaction.id, date: transaction.date, description: transaction.description, amount: transaction.amount }))
    .slice(0, 100);
  const orderedRows = [...validRows].sort((a, b) => a.date.localeCompare(b.date));
  const first = orderedRows[0];
  const last = orderedRows[orderedRows.length - 1];
  const openingBalance = first?.balance === undefined
    ? null
    : first.direction === 'debit' ? first.balance + first.amount : first.balance - first.amount;
  const closingBalance = last?.balance ?? null;

  const created = await prisma.$transaction(async (tx) => {
    const statementImport = await tx.statementImport.upsert({
      where: { accountId_contentHash: { accountId, contentHash } },
      update: {},
      create: {
        familyId,
        accountId,
        fileName,
        sourceType,
        contentHash,
        statementStart: result.metadata.startDate ? new Date(`${result.metadata.startDate}T12:00:00Z`) : null,
        statementEnd: result.metadata.endDate ? new Date(`${result.metadata.endDate}T12:00:00Z`) : null,
        openingBalance,
        closingBalance,
        parsedRows: originalTransactions.length,
        rejectedRows: rejectedRows.length ? rejectedRows : undefined,
        importedById,
      },
    });

    const write = await tx.budgetTransaction.createMany({
      data: validRows.map((transaction) => ({
        familyId,
        accountId,
        statementImportId: statementImport.id,
        transactionDate: new Date(`${transaction.date}T12:00:00Z`),
        description: transaction.description,
        amount: Number(transaction.amount),
        direction: transaction.direction,
        balance: transaction.balance ?? null,
        category: transaction.category || null,
        fingerprint: fingerprints.get(transaction.id)!,
      })),
      skipDuplicates: true,
    });

    await tx.statementImport.update({
      where: { id: statementImport.id },
      data: { importedRows: { increment: write.count }, duplicateRows: validRows.length - write.count },
    });
    return { id: statementImport.id, importedRows: write.count, duplicateRows: validRows.length - write.count, alreadyImported: write.count === 0 };
  });

  return created;
}

export const POST = requireFamilyAccess(async (request: NextRequest, _context, authUser) => {
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = z.object({
        action: z.literal('commit'), accountId: z.string().min(1), previewToken: z.string(),
        transactions: z.array(approvedStatementRow).min(1).max(10000),
      }).parse(await request.json());
      const preview = readStatementPreview(body.previewToken, {
        familyId: authUser.familyId, accountId: body.accountId, userId: authUser.dbUser.id,
      });
      const originalIds = new Set(preview.result.transactions.map(row => row.id));
      if (new Set(body.transactions.map(row => row.id)).size !== body.transactions.length || body.transactions.some(row => !originalIds.has(row.id))) {
        return NextResponse.json({ error: 'Choose rows from this statement review.' }, { status: 400 });
      }
      // Edited rows no longer support the original running-balance evidence.
      const changed = body.transactions.length !== preview.result.transactions.length || body.transactions.some(row => {
        const original = preview.result.transactions.find(item => item.id === row.id)!;
        return row.amount !== original.amount || row.date !== original.date || row.direction !== original.direction;
      });
      const ledgerImport = await persistStatementImport({
        familyId: authUser.familyId, accountId: body.accountId, fileName: preview.fileName,
        contentHash: preview.contentHash, sourceType: preview.sourceType, importedById: authUser.dbUser.id,
        originalTransactions: preview.result.transactions,
        result: { ...preview.result, transactions: body.transactions.map(row => ({ ...row, balance: changed ? undefined : preview.result.transactions.find(item => item.id === row.id)?.balance })) },
      });
      return NextResponse.json({ success: true, ledgerImport });
    }
    const formData = await request.formData();
    const file = formData.get('file');
    const useAi = formData.get('useAi') === 'true';

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'Statement exceeds 20 MB.' }, { status: 413 });
    const accountId = formData.get('accountId');
    if (typeof accountId !== 'string' || !accountId) return NextResponse.json({ error: 'Choose a statement account.' }, { status: 400 });
    const account = await prisma.budgetAccount.findFirst({ where: { id: accountId, familyId: authUser.familyId, active: true }, select: { id: true } });
    if (!account) return NextResponse.json({ error: 'Statement account not found.' }, { status: 404 });

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let result: StatementParseResult | null = null;

    if (fileName.endsWith('.csv')) {
      result = parseCsvStatement(buffer.toString('utf-8'), 'csv');
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Dynamic import to avoid bundling issues if XLSX is not needed
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return NextResponse.json({ error: 'Excel file has no sheets' }, { status: 400 });
      }
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];
      result = parseStatementRows(rows, 'xlsx');
    } else if (fileName.endsWith('.pdf')) {
      const parsed = await extractStatementPdf(buffer);
      const text = parsed.text || '';
      const statementDate = parseStatementDateFromPdf(text) ?? undefined;

      const detectedBank = detectBankFromText(text);

      if (useAi) {
        try {
          const aiTransactions = await parseWithAI(text, statementDate);
          const dates = aiTransactions.map((item) => item.date).filter(Boolean).sort();
          result = {
            success: aiTransactions.length > 0,
            transactions: aiTransactions.map((item) => ({
              ...item,
              direction: normalizeDirection(item.direction, item.description),
            })),
            warnings: [],
            errors: aiTransactions.length > 0 ? [] : ['AI did not return any transactions'],
            metadata: {
              bank: detectedBank ?? 'Unknown',
              sourceType: 'pdf',
              statementDate,
              startDate: dates[0],
              endDate: dates[dates.length - 1],
            },
          };
        } catch (error) {
          const deterministicResult = /Virgin Money/i.test(text)
            ? parseVirginMoneyPdfText(text)
            : parseGenericPdfText(text);
          result = deterministicResult;
          result.warnings.push(`AI parse failed, using deterministic parser: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        result = /Virgin Money/i.test(text)
          ? parseVirginMoneyPdfText(text)
          : parseGenericPdfText(text);
        if (!result.success) {
          result = parseVirginMoneyPdfText(text);
        }
        if (!result.metadata.bank) {
          result.metadata.bank = detectedBank ?? 'Unknown';
        }
        if (result.metadata.bank === 'Unknown') {
          result.warnings.push('Statement format not recognized; review extracted rows carefully.');
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload CSV, PDF, or Excel.' },
        { status: 400 }
      );
    }

    // A preview is signed and scoped but performs no ledger writes.
    if (result.success) Object.assign(result, { previewToken: createStatementPreview({
      familyId: authUser.familyId, accountId, fileName: file.name,
      contentHash: createHash('sha256').update(buffer).digest('hex'),
      sourceType: fileName.split('.').pop() || 'unknown', result,
      userId: authUser.dbUser.id, expiresAt: Date.now() + 30 * 60 * 1000,
    }) });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to parse statement',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: error instanceof z.ZodError || request.headers.get('content-type')?.includes('application/json') ? 400 : 500 }
    );
  }
});
