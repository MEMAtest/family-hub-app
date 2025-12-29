import { NextResponse } from 'next/server';
import { parseSurveyText } from '@/utils/propertySurveyParser';

export const runtime = 'nodejs';

// Dynamic import pdf-parse to avoid the test file issue at build time
async function parsePdf(buffer: Buffer) {
  // pdf-parse has a known issue where it tries to load test files at import time
  // Use the actual parsing function directly
  const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default;
  return pdf(buffer);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, error: 'No PDF file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const parsed = await parsePdf(Buffer.from(arrayBuffer));
    const result = parseSurveyText(parsed.text || '');

    return NextResponse.json({
      success: true,
      tasks: result.tasks,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error('Survey parse error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse PDF.' },
      { status: 500 }
    );
  }
}
