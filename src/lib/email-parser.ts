/**
 * Regex-based email parser for extracting contacts, prices, dates, and follow-ups
 * from contractor/supplier emails without AI.
 */

import type { ExtractedEmailData } from '@/app/api/property/email-parse/route';

// UK Phone number patterns
const PHONE_PATTERNS = [
  /(?:\+44\s?|0)7\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g,  // Mobile: 07xxx xxx xxx
  /(?:\+44\s?|0)\d{3,4}[\s.-]?\d{3}[\s.-]?\d{3,4}/g,  // Landline
  /0800[\s.-]?\d{3}[\s.-]?\d{4}/g,  // Freephone
];

// Email pattern
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Website pattern
const WEBSITE_PATTERN = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;

// Price patterns (GBP)
const PRICE_PATTERNS = [
  /£[\d,]+(?:\.\d{2})?/g,  // £1,234.56
  /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:GBP|pounds?)/gi,  // 1234 GBP
];

// Date patterns
const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY
  /\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/g,
  // "Monday 7th January" or "Wed 7/1"
  /(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)[,\s]+\d{1,2}(?:st|nd|rd|th)?(?:\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?))?/gi,
  // "7th January" or "January 7th"
  /\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/gi,
  /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?/gi,
  // Month names alone (for availability mentions)
  /(?:in\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/gi,
];

// Signature patterns to extract names
const SIGNATURE_PATTERNS = [
  /(?:kind regards|regards|thanks|best wishes|best|cheers|many thanks)[,\s]*\n+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  /(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\n(?:[A-Z]|Director|Manager|Owner|Sales|Installer|Engineer)/m,
];

// Company patterns
const COMPANY_PATTERNS = [
  /([A-Z][A-Za-z&\s]+(?:Ltd|Limited|LTD|PLC|plc|Inc|LLC|Co\.|Company))/g,
  /(?:at|from|@)\s+([A-Z][A-Za-z&\s]+)/gi,
];

// Action/follow-up keywords
const FOLLOW_UP_KEYWORDS = [
  'please confirm',
  'let me know',
  'get back to',
  'send over',
  'send through',
  'give me a call',
  'call me',
  'email me',
  'awaiting',
  'waiting for',
  'need to',
  'should',
  'will need',
];

function extractUniqueMatches(text: string, patterns: RegExp[]): string[] {
  const matches = new Set<string>();
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const cleaned = match[0].trim();
      if (cleaned) matches.add(cleaned);
    }
  }
  return Array.from(matches);
}

function extractPhones(text: string): string[] {
  const phones = new Set<string>();
  for (const pattern of PHONE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Normalize phone number
      const phone = match[0].replace(/[\s.-]/g, '');
      if (phone.length >= 10) {
        phones.add(match[0].trim());
      }
    }
  }
  return Array.from(phones);
}

function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_PATTERN) || [];
  return [...new Set(matches)];
}

function extractPrices(text: string): Array<{ description: string; amount: number; currency: 'GBP'; type: 'quote' | 'estimate' | 'mention' }> {
  const prices: Array<{ description: string; amount: number; currency: 'GBP'; type: 'quote' | 'estimate' | 'mention' }> = [];
  const seen = new Set<number>();

  for (const pattern of PRICE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const priceStr = match[0].replace(/[£,GBPpounds\s]/gi, '');
      const amount = parseFloat(priceStr);

      if (!isNaN(amount) && amount > 0 && !seen.has(amount)) {
        seen.add(amount);

        // Get context around the price
        const start = Math.max(0, match.index - 50);
        const end = Math.min(text.length, match.index + match[0].length + 50);
        const context = text.slice(start, end).replace(/\n/g, ' ').trim();

        // Determine type based on context
        const lowerContext = context.toLowerCase();
        let type: 'quote' | 'estimate' | 'mention' = 'mention';
        if (lowerContext.includes('quote') || lowerContext.includes('price')) {
          type = 'quote';
        } else if (lowerContext.includes('estimate') || lowerContext.includes('approx') || lowerContext.includes('around')) {
          type = 'estimate';
        }

        prices.push({
          description: `Price mentioned: ${match[0]}`,
          amount,
          currency: 'GBP',
          type,
        });
      }
    }
  }

  return prices;
}

function extractDates(text: string): Array<{ description: string; date: string; type: 'proposed_visit' | 'start_date' | 'completion' | 'deadline' | 'other' }> {
  const dates: Array<{ description: string; date: string; type: 'proposed_visit' | 'start_date' | 'completion' | 'deadline' | 'other' }> = [];
  const seen = new Set<string>();

  for (const pattern of DATE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const dateStr = match[0].trim();
      if (seen.has(dateStr.toLowerCase())) continue;
      seen.add(dateStr.toLowerCase());

      // Get context around the date
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + match[0].length + 50);
      const context = text.slice(start, end).toLowerCase();

      // Determine type based on context
      let type: 'proposed_visit' | 'start_date' | 'completion' | 'deadline' | 'other' = 'other';
      if (context.includes('visit') || context.includes('come') || context.includes('see you') || context.includes('meet')) {
        type = 'proposed_visit';
      } else if (context.includes('start') || context.includes('begin') || context.includes('commence')) {
        type = 'start_date';
      } else if (context.includes('complete') || context.includes('finish') || context.includes('done')) {
        type = 'completion';
      } else if (context.includes('deadline') || context.includes('by') || context.includes('before')) {
        type = 'deadline';
      }

      dates.push({
        description: `Date mentioned: ${dateStr}`,
        date: dateStr,
        type,
      });
    }
  }

  return dates;
}

function extractContacts(text: string): Array<{ name: string; company?: string; phone?: string; email?: string; role?: string }> {
  const contacts: Array<{ name: string; company?: string; phone?: string; email?: string; role?: string }> = [];

  // Try to extract name from signature
  let name: string | null = null;
  for (const pattern of SIGNATURE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }

  // Extract company
  let company: string | undefined;
  for (const pattern of COMPANY_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const match = regex.exec(text);
    if (match && match[1]) {
      company = match[1].trim();
      break;
    }
  }

  // Extract phones and emails
  const phones = extractPhones(text);
  const emails = extractEmails(text);

  // If we have a name, create a contact
  if (name) {
    contacts.push({
      name,
      company,
      phone: phones[0],
      email: emails[0],
    });
  } else if (emails.length > 0 || phones.length > 0) {
    // Create contact from email/phone even without name
    contacts.push({
      name: emails[0]?.split('@')[0] || 'Unknown Contact',
      company,
      phone: phones[0],
      email: emails[0],
    });
  }

  return contacts;
}

function extractFollowUps(text: string): Array<{ action: string; dueDate?: string }> {
  const followUps: Array<{ action: string; dueDate?: string }> = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    for (const keyword of FOLLOW_UP_KEYWORDS) {
      if (lowerLine.includes(keyword)) {
        // Extract the sentence containing the keyword
        const sentences = line.split(/[.!?]/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            const action = sentence.trim();
            if (action.length > 10 && action.length < 200) {
              followUps.push({ action });
            }
            break;
          }
        }
        break;
      }
    }
  }

  return followUps.slice(0, 5); // Limit to 5 follow-ups
}

function extractTopics(text: string): string[] {
  const topics = new Set<string>();
  const lowerText = text.toLowerCase();

  // Common property/contractor topics
  const topicKeywords: Record<string, string> = {
    'bathroom': 'bathroom',
    'kitchen': 'kitchen',
    'plumbing': 'plumbing',
    'heating': 'heating',
    'boiler': 'boiler',
    'electric': 'electrics',
    'rewire': 'electrics',
    'roof': 'roofing',
    'extension': 'extension',
    'garden': 'garden',
    'decor': 'decoration',
    'paint': 'decoration',
    'quote': 'quote',
    'visit': 'site visit',
    'survey': 'survey',
    'install': 'installation',
    'repair': 'repair',
    'replace': 'replacement',
  };

  for (const [keyword, topic] of Object.entries(topicKeywords)) {
    if (lowerText.includes(keyword)) {
      topics.add(topic);
    }
  }

  return Array.from(topics).slice(0, 5);
}

/**
 * Parse email content using regex patterns (no AI required)
 */
export function parseEmailWithRegex(emailContent: string, subject?: string, sender?: string): ExtractedEmailData {
  const fullText = [subject, sender, emailContent].filter(Boolean).join('\n');

  const contacts = extractContacts(fullText);
  const prices = extractPrices(emailContent);
  const dates = extractDates(emailContent);
  const followUps = extractFollowUps(emailContent);
  const topics = extractTopics(fullText);

  // Generate a basic summary
  const summary = generateBasicSummary(contacts, prices, dates, topics);

  return {
    contacts,
    prices,
    dates,
    followUps,
    topics,
    summary,
  };
}

function generateBasicSummary(
  contacts: Array<{ name: string; company?: string }>,
  prices: Array<{ amount: number }>,
  dates: Array<{ description: string }>,
  topics: string[]
): string {
  const parts: string[] = [];

  if (contacts.length > 0) {
    const contact = contacts[0];
    parts.push(`Email from ${contact.name}${contact.company ? ` (${contact.company})` : ''}`);
  }

  if (topics.length > 0) {
    parts.push(`regarding ${topics.slice(0, 2).join(' and ')}`);
  }

  if (prices.length > 0) {
    parts.push(`mentioning £${prices[0].amount.toLocaleString()}`);
  }

  if (dates.length > 0) {
    parts.push(`with date reference`);
  }

  return parts.length > 0 ? parts.join(' ') + '.' : 'Email content parsed.';
}
