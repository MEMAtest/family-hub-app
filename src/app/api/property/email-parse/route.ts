import { NextRequest, NextResponse } from 'next/server';
import { parseEmailWithRegex } from '@/lib/email-parser';

export interface EmailParseRequest {
  emailContent: string;
  subject?: string;
  sender?: string;
  mode?: 'auto' | 'ai' | 'regex';  // default: 'auto'
}

export interface ExtractedEmailData {
  contacts: Array<{
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    role?: string;
  }>;
  prices: Array<{
    description: string;
    amount: number;
    currency: 'GBP';
    type: 'quote' | 'estimate' | 'mention';
  }>;
  dates: Array<{
    description: string;
    date: string;
    type: 'proposed_visit' | 'start_date' | 'completion' | 'deadline' | 'other';
  }>;
  followUps: Array<{
    action: string;
    dueDate?: string;
  }>;
  topics: string[];
  summary: string;
}

/**
 * Parse email using OpenRouter AI (free models)
 */
async function parseWithOpenRouterAI(
  emailContent: string,
  subject?: string,
  sender?: string
): Promise<ExtractedEmailData> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `You are an email parsing assistant for property improvement projects. Extract structured information from contractor/supplier emails.

You MUST respond with ONLY valid JSON. No explanations, no markdown, just pure JSON.

Required JSON structure:
{
  "contacts": [
    {
      "name": "Person's name",
      "company": "Company name if mentioned",
      "phone": "Phone number if found",
      "email": "Email address if found",
      "role": "Their role if mentioned (e.g., 'installer', 'sales rep', 'owner')"
    }
  ],
  "prices": [
    {
      "description": "What the price is for",
      "amount": 0.00,
      "currency": "GBP",
      "type": "quote" | "estimate" | "mention"
    }
  ],
  "dates": [
    {
      "description": "What the date refers to",
      "date": "YYYY-MM-DD",
      "type": "proposed_visit" | "start_date" | "completion" | "deadline" | "other"
    }
  ],
  "followUps": [
    {
      "action": "Action item or commitment",
      "dueDate": "YYYY-MM-DD if mentioned"
    }
  ],
  "topics": ["topic1", "topic2"],
  "summary": "One sentence summary of the email"
}

Rules:
- Extract contacts from email signatures and headers
- Look for phone numbers in formats like 07xxx, 0800, +44, etc.
- Extract any monetary amounts mentioned (assume GBP if no currency specified)
- For vague dates like "Wednesday 7th" or "next week", calculate from today's date: ${today}
- For relative months like "February", assume the next occurrence
- Topics should be 1-3 word tags describing main subjects
- Summary should be 1-2 sentences max
- Be conservative - only extract clear, explicit information
- Return empty arrays [] if no data found for a category
- Return ONLY the JSON object, nothing else`;

  const userPrompt = `Parse this email and extract structured data. Return only the JSON object.

${subject ? `Subject: ${subject}` : ''}
${sender ? `From: ${sender}` : ''}

Email content:
${emailContent}`;

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
      max_tokens: 2048,
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

  // Parse the JSON response
  let extractedData: ExtractedEmailData;
  try {
    // Remove markdown code blocks if present
    let cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Try to extract JSON from text if not already pure JSON
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }

    extractedData = JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse AI response as JSON');
  }

  // Ensure all arrays exist
  extractedData.contacts = extractedData.contacts || [];
  extractedData.prices = extractedData.prices || [];
  extractedData.dates = extractedData.dates || [];
  extractedData.followUps = extractedData.followUps || [];
  extractedData.topics = extractedData.topics || [];
  extractedData.summary = extractedData.summary || 'No summary available';

  // Clean up prices - ensure amounts are numbers
  extractedData.prices = extractedData.prices.map(price => {
    const rawAmount = price.amount as unknown;
    const amount = typeof rawAmount === 'string'
      ? parseFloat((rawAmount as string).replace(/[£,]/g, ''))
      : (typeof rawAmount === 'number' ? rawAmount : 0);
    return {
      ...price,
      amount,
      currency: 'GBP' as const,
    };
  });

  return extractedData;
}

export async function POST(req: NextRequest) {
  try {
    const body: EmailParseRequest = await req.json();
    const { emailContent, subject, sender, mode = 'auto' } = body;

    if (!emailContent || emailContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      );
    }

    let extractedData: ExtractedEmailData;
    let usedMethod: 'ai' | 'regex' = 'regex';

    if (mode === 'regex') {
      // Use regex only
      extractedData = parseEmailWithRegex(emailContent, subject, sender);
      usedMethod = 'regex';
    } else if (mode === 'ai') {
      // Use AI only (will fail if no API key or error)
      extractedData = await parseWithOpenRouterAI(emailContent, subject, sender);
      usedMethod = 'ai';
    } else {
      // Auto mode: try AI first, fall back to regex
      try {
        extractedData = await parseWithOpenRouterAI(emailContent, subject, sender);
        usedMethod = 'ai';
      } catch (aiError) {
        console.log('AI parsing failed, falling back to regex:', aiError);
        extractedData = parseEmailWithRegex(emailContent, subject, sender);
        usedMethod = 'regex';
      }
    }

    return NextResponse.json({
      success: true,
      extractedData,
      method: usedMethod,
    });

  } catch (error) {
    console.error('Email parse error:', error);

    // Last resort: try regex parsing even on error
    try {
      const body = await req.clone().json();
      const extractedData = parseEmailWithRegex(
        body.emailContent,
        body.subject,
        body.sender
      );
      return NextResponse.json({
        success: true,
        extractedData,
        method: 'regex',
        warning: 'Used fallback regex parsing due to error',
      });
    } catch {
      // Can't even do regex fallback
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to parse email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
