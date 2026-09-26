import { z } from 'zod';
import { extractJsonObject } from '@/lib/visionAI';
import type { FridgeItem } from '@/types/kitchen.types';

// Prompts and reply parsing for the two kitchen photo features. Parsing is
// pure so it can be tested without calling a model.

export const FRIDGE_SYSTEM =
  'You look at photos of a UK family fridge (two young children) and report what is clearly visible, to help the family use food up and avoid buying duplicates. Be concrete and honest: skip anything you cannot identify, never invent brands, dates or quantities. Reply with JSON only.';

export const FRIDGE_PROMPT = `List the food you can clearly see in this fridge photo.

Return JSON:
{
  "summary": "one friendly sentence about what's in there",
  "items": [
    { "name": "plain name, e.g. Minced beef", "category": "dairy|meat|fish|veg|fruit|leftovers|drinks|sauces|other", "useSoon": true|false, "note": "short, optional, e.g. 'reduced sticker', 'two packs', 'opened'" }
  ],
  "useFirst": ["up to 5 short phrases, most urgent first, e.g. 'Leftover stew in the glass dish'"],
  "mealIdeas": ["up to 3 simple family meals (kid friendly) that use the useSoon items"]
}

useSoon is true for leftovers, fresh meat or fish, opened packs, salad, and anything marked reduced.
Group duplicates into one item with a note. At most 40 items.`;

const text = (max: number) => z.string().trim().min(1).max(max);

const fridgeSchema = z.object({
  summary: z.string().trim().max(300).catch(''),
  items: z.array(z.object({
    name: text(60),
    category: z.string().trim().toLowerCase().max(20).catch('other'),
    useSoon: z.boolean().catch(false),
    note: z.string().trim().max(80).nullish().catch(undefined),
  }).passthrough().catch(null as never)).catch([]),
  useFirst: z.array(z.string().trim().max(120)).catch([]),
  mealIdeas: z.array(z.string().trim().max(120)).catch([]),
});

export interface FridgeReading {
  summary: string;
  items: FridgeItem[];
  useFirst: string[];
  mealIdeas: string[];
}

export const parseFridgeReply = (reply: string): FridgeReading => {
  const parsed = fridgeSchema.parse(extractJsonObject(reply));
  const items = parsed.items
    .filter((item): item is NonNullable<typeof item> => !!item && !!item.name)
    .slice(0, 40)
    .map((item) => ({
      name: item.name,
      category: item.category || 'other',
      useSoon: item.useSoon,
      ...(item.note ? { note: item.note } : {}),
    }));
  if (items.length === 0) throw new Error('No food could be made out in that photo');
  return {
    summary: parsed.summary || `Spotted ${items.length} item${items.length === 1 ? '' : 's'}.`,
    items,
    useFirst: parsed.useFirst.filter(Boolean).slice(0, 5),
    mealIdeas: parsed.mealIdeas.filter(Boolean).slice(0, 3),
  };
};

export const RECEIPT_SYSTEM =
  'You read UK supermarket receipts. Copy item lines faithfully and never invent items, prices or dates. Reply with JSON only.';

export const receiptPrompt = (usuals: string[]) => `Read every product line on this receipt.

The household tracks these "usuals": ${usuals.length ? usuals.join(', ') : '(none)'}.

Return JSON:
{
  "store": "shop name or null",
  "date": "YYYY-MM-DD or null",
  "total": number or null,
  "lines": [ { "name": "product as a plain name, e.g. 'Andrex toilet roll 9 pack'", "quantity": number, "usual": "the matching name from the usuals list, or null" } ]
}

Skip totals, discounts, bag charges, payment and loyalty lines. Combine repeated products into one line with a quantity.`;

const receiptSchema = z.object({
  store: z.string().trim().max(60).nullish().catch(null),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().catch(null),
  total: z.number().nonnegative().max(10_000).nullish().catch(null),
  lines: z.array(z.object({
    name: text(80),
    quantity: z.number().int().min(1).max(99).catch(1),
    usual: z.string().trim().max(60).nullish().catch(null),
  }).catch(null as never)).catch([]),
});

export interface ReceiptReplyLine {
  name: string;
  quantity: number;
  usual: string | null;
}

export interface ReceiptReply {
  store: string | null;
  date: string | null;
  total: number | null;
  lines: ReceiptReplyLine[];
}

export const parseReceiptReply = (reply: string, usuals: string[], today: Date = new Date()): ReceiptReply => {
  const parsed = receiptSchema.parse(extractJsonObject(reply));
  const known = new Map(usuals.map((name) => [name.toLowerCase(), name]));
  const lines = parsed.lines
    .filter((line): line is NonNullable<typeof line> => !!line && !!line.name)
    .slice(0, 80)
    .map((line) => ({
      name: line.name,
      quantity: line.quantity,
      // Only accept a usual the household actually has.
      usual: line.usual ? known.get(line.usual.toLowerCase()) ?? null : null,
    }));
  if (lines.length === 0) throw new Error('No items could be read from that receipt');
  const todayKey = today.toISOString().slice(0, 10);
  return {
    store: parsed.store || null,
    date: parsed.date && parsed.date <= todayKey ? parsed.date : null,
    total: parsed.total ?? null,
    lines,
  };
};
