import { NextRequest, NextResponse } from 'next/server';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { askVision, extractJsonObject, isSupportedImageType, VisionUnavailableError } from '@/lib/visionAI';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = requireFamilyAccess(async (request: NextRequest, _context, _authUser) => {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Handle both base64 and data URL formats
    let base64Image = image;
    let mimeType = 'image/jpeg';

    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Image = matches[2];
      }
    }

    try {
      if (!isSupportedImageType(mimeType)) {
        return NextResponse.json({ error: 'Use a JPEG, PNG or WebP photo' }, { status: 415 });
      }
      const reply = await askVision({
        system: 'You read UK receipts. Never invent a shop, amount or date. Reply with JSON only.',
        prompt: `Analyze this receipt image and extract the following information. Return ONLY a JSON object with these fields:

{
  "name": "store or vendor name",
  "amount": total amount as a number (no currency symbols),
  "category": one of these categories: "Groceries", "Dining", "Transport", "Entertainment", "Healthcare", "Education", "Utilities", "Shopping", "Other",
  "paymentDate": date in ISO format (YYYY-MM-DD),
  "items": array of item names (optional, max 5 main items)
}

If you cannot clearly read a field, use null for it (items: []). Do not guess.

Important: Return ONLY the JSON object, no other text.`,
        image: Buffer.from(base64Image, 'base64'),
        mimeType,
        maxTokens: 1000,
        effort: 'low',
      });
      const extractedData = extractJsonObject(reply) as Record<string, any>;

      // Ensure all required fields exist and are valid
      const validatedData = {
        // Unreadable fields stay null so the form keeps what the user already typed.
        name: typeof extractedData.name === 'string' && extractedData.name.trim() ? extractedData.name.trim() : null,
        amount: Number.isFinite(parseFloat(extractedData.amount)) ? parseFloat(extractedData.amount) : null,
        category: extractedData.category || 'Other',
        paymentDate: /^\d{4}-\d{2}-\d{2}$/.test(String(extractedData.paymentDate || '')) ? extractedData.paymentDate : null,
        items: Array.isArray(extractedData.items) ? extractedData.items : []
      };

      // Validate category against allowed values
      const allowedCategories = [
        'Groceries', 'Dining', 'Transport', 'Entertainment',
        'Healthcare', 'Education', 'Utilities', 'Shopping', 'Other'
      ];

      if (!allowedCategories.includes(validatedData.category)) {
        validatedData.category = 'Other';
      }

      return NextResponse.json(validatedData);

    } catch (aiError) {
      // Never hand back made-up figures: the form would be pre-filled with them.
      console.error('Receipt AI failed:', aiError);
      if (aiError instanceof VisionUnavailableError) {
        return NextResponse.json({ error: aiError.message, unavailable: true }, { status: 503 });
      }
      return NextResponse.json({ error: "Couldn't read that receipt. Try a clearer, well-lit photo, or fill it in by hand." }, { status: 502 });
    }
  } catch (error) {
    console.error('Receipt scanning error:', error);
    return NextResponse.json(
      { error: 'Failed to scan receipt' },
      { status: 500 }
    );
  }
});

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
