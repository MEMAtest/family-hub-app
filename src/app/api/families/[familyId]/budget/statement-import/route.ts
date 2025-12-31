import { NextRequest, NextResponse } from 'next/server';
import { createId } from '@/utils/id';

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

  // Build expense categories without "Other" for AI prompt
  const expenseCategories = EXPENSE_CATEGORIES.filter(c => c !== 'Other');
  const incomeCategories = INCOME_CATEGORIES.filter(c => c !== 'Other');

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

CATEGORY RULES (CRITICAL - avoid "Other" at all costs):
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
- General Amazon purchases → Clothing (if unsure, better than Other)
- Salary, wages, BACS credits from employers → Salary
- Refunds → use the category of what was refunded if clear, otherwise Investment
- Bank transfers → If from employer = Salary, if unclear = Investment

ONLY use "Other" as absolute last resort when category is truly unidentifiable.

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
    const errorData = await response.json().catch(() => ({}));
    console.error('OpenRouter error:', errorData);
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

export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const useAi = formData.get('useAi') === 'true';

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

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
      // Dynamic import to avoid bundling issues
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer);
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

    console.log('📊 Statement import result:', {
      success: result?.success,
      transactionCount: result?.transactions?.length ?? 0,
      warnings: result?.warnings?.length ?? 0,
      errors: result?.errors?.length ?? 0,
      bank: result?.metadata?.bank,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Statement import parse error:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse statement',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
