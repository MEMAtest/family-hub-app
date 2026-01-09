import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

// Security constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const PDF_PARSE_TIMEOUT = 30000; // 30 seconds

// PDF magic number: %PDF- (25 50 44 46 2D)
const PDF_MAGIC_NUMBER = [0x25, 0x50, 0x44, 0x46, 0x2d];

/**
 * Validate PDF by checking magic number (file signature)
 */
function isPDFFile(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return PDF_MAGIC_NUMBER.every((byte, index) => buffer[index] === byte);
}

/**
 * Wrap pdf-parse with timeout to prevent hanging on large/complex PDFs
 */
async function parseWithTimeout(buffer: Buffer, timeoutMs: number) {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('PDF parsing timeout - file may be too large or complex')), timeoutMs)
  );

  return Promise.race([pdfParse(buffer), timeoutPromise]);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate PDF magic number (actual file content, not just extension)
    if (!isPDFFile(buffer)) {
      return NextResponse.json(
        { success: false, error: 'Invalid PDF file - file signature does not match PDF format' },
        { status: 400 }
      );
    }

    // Parse PDF with timeout protection
    let pdfData;
    try {
      pdfData = await parseWithTimeout(buffer, PDF_PARSE_TIMEOUT);
    } catch (parseError) {
      console.error('PDF parsing error:', parseError);

      // Provide user-friendly error messages
      const errorMessage = parseError instanceof Error ? parseError.message : '';

      if (errorMessage.includes('timeout')) {
        return NextResponse.json(
          { success: false, error: 'PDF parsing timed out - the file may be too large or complex' },
          { status: 408 }
        );
      }

      if (errorMessage.toLowerCase().includes('encrypted') || errorMessage.toLowerCase().includes('password')) {
        return NextResponse.json(
          { success: false, error: 'PDF is encrypted or password-protected. Please upload an unprotected PDF.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to parse PDF - the file may be corrupted or in an unsupported format' },
        { status: 400 }
      );
    }

    // Validate extracted data
    if (!pdfData || typeof pdfData.text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid PDF structure - no text content found' },
        { status: 400 }
      );
    }

    // Return extracted text and metadata
    return NextResponse.json({
      success: true,
      text: pdfData.text,
      numPages: pdfData.numpages,
      info: pdfData.info,
      metadata: pdfData.metadata,
    });
  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while processing the PDF',
      },
      { status: 500 }
    );
  }
}
