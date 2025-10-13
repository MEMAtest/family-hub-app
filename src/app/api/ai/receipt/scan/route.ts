import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { familyId, imageData, fileName } = await req.json();

    console.log('Receipt scan request:', {
      familyId,
      fileName,
      imageDataLength: imageData?.length || 0,
      imageDataPreview: imageData?.substring(0, 50)
    });

    if (!familyId) {
      return NextResponse.json(
        { error: 'Family ID is required' },
        { status: 400 }
      );
    }

    if (!imageData || imageData.trim().length === 0) {
      console.error('Empty image data received');
      return NextResponse.json(
        { error: 'Image data is required and cannot be empty' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Determine media type from filename
    const isPDF = fileName?.toLowerCase().endsWith('.pdf');
    const isPNG = fileName?.toLowerCase().endsWith('.png');
    const mediaType = isPDF ? 'application/pdf' : isPNG ? 'image/png' : 'image/jpeg';

    const systemPrompt = `You are a receipt OCR assistant. Extract expense information from receipt images or PDFs.

You MUST respond with ONLY valid JSON. No explanations, no markdown, just pure JSON.

Required JSON structure:
{
  "name": "Store/Merchant name",
  "amount": 0.00,
  "category": "Category",
  "paymentDate": "YYYY-MM-DD"
}

Rules:
- Categories MUST be one of: Food & Dining, Groceries, Shopping, Transport, Entertainment, Utilities, Healthcare, Education, Other
- Amount must be a number (e.g., 49.99, not "£49.99")
- Date must be YYYY-MM-DD format
- If date not visible, use today's date: ${new Date().toISOString().split('T')[0]}
- Return ONLY the JSON object, nothing else`;

    const userPrompt = `Extract the expense information from this receipt. Return only the JSON object, no other text.`;

    // Build content array based on file type
    const contentItems: any[] = [];

    if (isPDF) {
      // PDFs use document content type
      contentItems.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: imageData,
        },
      });
    } else {
      // Images use image content type
      contentItems.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: imageData,
        },
      });
    }

    contentItems.push({
      type: 'text',
      text: userPrompt
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: contentItems,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    console.log('AI response content:', content.text);

    // Try to parse the JSON response
    let extractedExpense;
    try {
      // Remove markdown code blocks if present
      let cleanedContent = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Try to extract JSON from text if not already pure JSON
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }

      extractedExpense = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content.text);
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse receipt data. Please try again.');
    }

    // Validate extracted data
    if (!extractedExpense.name || !extractedExpense.amount || !extractedExpense.category) {
      throw new Error('Incomplete data extracted from receipt');
    }

    // Ensure amount is a number
    extractedExpense.amount = parseFloat(extractedExpense.amount);

    // Ensure date is valid
    if (!extractedExpense.paymentDate) {
      extractedExpense.paymentDate = new Date().toISOString().split('T')[0];
    }

    return NextResponse.json({
      expense: extractedExpense
    });

  } catch (error) {
    console.error('Receipt scan error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process receipt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
