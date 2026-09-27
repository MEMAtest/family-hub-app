import { z } from 'zod';
import { extractJsonObject } from '@/lib/visionAI';
import type { StapleCategory, StockNoteItem } from '@/types/kitchen.types';

// Prompt and reply parsing for "what we've got" notes: "20 toilet rolls from
// Costco, one lasts about 2 days; a box of 12 wipes; 2 sets of nappies".
// The AI reads the note and estimates usage for this household; the maths of
// what is left and when it runs out stays in utils/staples.

export const STOCK_SYSTEM =
  'You help a UK household keep track of how much of each everyday item they have at home and when it will run out. You turn a spoken or typed note into structured counts with a realistic usage rate. What the family says comes first; when they give no rate, estimate one from typical UK usage for THIS household (members and children\'s ages are given). Never leave a rate blank: give your best estimate and say in plain words what you assumed, so they can correct it. Reply with JSON only.';

export interface HouseholdMember {
  role: string;
  ageGroup: string;
  dateOfBirth: Date | null;
}

const ageText = (dob: Date, today: Date) => {
  const months = (today.getFullYear() - dob.getFullYear()) * 12 + (today.getMonth() - dob.getMonth()) - (today.getDate() < dob.getDate() ? 1 : 0);
  if (months < 0) return null;
  if (months < 24) return `${months} month${months === 1 ? '' : 's'}`;
  return `${Math.floor(months / 12)}`;
};

// "2 adults; children aged 4 and 14 months". Ages only: no names or birthdays leave the server.
export const describeHousehold = (members: HouseholdMember[], today: Date = new Date()): string => {
  if (members.length === 0) return 'Not known; assume a family of four with two young children.';
  const adults = members.filter((m) => m.ageGroup === 'Adult' || /parent|adult|guardian/i.test(m.role));
  const children = members.filter((m) => !adults.includes(m));
  const childAges = children.map((child) => (child.dateOfBirth ? ageText(child.dateOfBirth, today) : null) ?? child.ageGroup.toLowerCase());
  const parts = [`${adults.length} adult${adults.length === 1 ? '' : 's'}`];
  if (children.length) parts.push(`${children.length} child${children.length === 1 ? '' : 'ren'} aged ${childAges.join(', ')}`);
  return parts.join('; ');
};

export const stockNotePrompt = (note: string, household: string, usuals: string[], today: string) => `Today is ${today}.
Household: ${household}
Items they already track: ${usuals.length ? usuals.join(', ') : '(none yet)'}

Note: "${note}"

For each distinct item in the note return:
- name: plain everyday name, e.g. "Toilet roll", "Baby wipes", "Nappies"
- usual: the matching name from the tracked list, or null
- status: "count" if they say how many they have; "low" if running low / nearly gone; "out" if run out / none left
- quantity: how many units they have now, as a number; null when they only said low or out without a number
- unit: the unit being counted, singular, e.g. "roll", "pack", "bottle", "tub"
- unitContents: only when the unit is a container of several things (pack, box, tub, multipack): what one holds, e.g. "about 80 wipes", "about 50 nappies (size 4)". null for single things like a roll, pod, bottle or loaf
- daysPerUnit: how many days one unit lasts this household (number, can be fractional)
- rateSource: "stated" if they told you how fast they use it, otherwise "estimated"
- assumption: one short sentence a parent can check, e.g. "Read as 12 packs of about 80 wipes; with a toddler in nappies a pack lasts about 3 days."
- question: one short question if the answer would change the estimate a lot, e.g. "How many nappies are in a set?", else null
- category: food | household | toiletries | kids

Rules:
- "a box of 12 wipes" in the UK almost always means a multipack box of 12 packs, not 12 single wipes. Count packs and say so.
- "sets", "packs" or "boxes" of nappies are packs of roughly 30-80 depending on size. Typical use: newborn 8-10 a day, 6-12 months 6-8, 1-2 years 5-6, 2-3 years 4-5; most children over 3 only need night pull-ups, if any.
- Toilet roll for a family of four: about one roll every 1-2 days.
- "from Costco" and similar tell you the pack size, but count what they said they have.
- Only include items the note mentions. Don't split one item into several.

Return: {"items": [ ... ]}`;

const CATEGORIES: StapleCategory[] = ['food', 'household', 'toiletries', 'kids'];

const itemSchema = z.object({
  name: z.string().trim().min(1).max(60),
  usual: z.string().trim().max(60).nullish().catch(null),
  status: z.enum(['count', 'low', 'out']).catch('count'),
  quantity: z.number().min(0).max(9999).nullish().catch(null),
  unit: z.string().trim().toLowerCase().min(1).max(20).catch('item'),
  unitContents: z.string().trim().max(80).nullish().catch(null),
  daysPerUnit: z.number().positive().max(365).nullish().catch(null),
  rateSource: z.enum(['stated', 'estimated']).catch('estimated'),
  assumption: z.string().trim().max(240).nullish().catch(null),
  question: z.string().trim().max(160).nullish().catch(null),
  category: z.string().trim().toLowerCase().catch('household'),
}).catch(null as never);

const replySchema = z.object({ items: z.array(itemSchema).catch([]) });

export const parseStockNoteReply = (reply: string, usuals: string[]): StockNoteItem[] => {
  const parsed = replySchema.parse(extractJsonObject(reply));
  const known = new Map(usuals.map((name) => [name.toLowerCase(), name]));
  const items = parsed.items
    .filter((item): item is NonNullable<typeof item> => !!item && !!item.name)
    // "We've got some bread" says nothing to record: no number, not low, not out.
    .filter((item) => !(item.status === 'count' && (item.quantity ?? null) === null))
    .slice(0, 30)
    .map((item): StockNoteItem => {
      const quantity = item.quantity ?? null;
      return {
        name: item.name,
        // Only accept a usual the household actually has.
        usual: item.usual ? known.get(item.usual.toLowerCase()) ?? null : null,
        status: item.status,
        quantity,
        unit: item.unit,
        unitContents: item.unitContents || null,
        daysPerUnit: item.daysPerUnit ? Math.round(item.daysPerUnit * 10) / 10 || 0.1 : null,
        rateSource: item.rateSource,
        assumption: item.assumption || null,
        question: item.question || null,
        category: CATEGORIES.includes(item.category as StapleCategory) ? (item.category as StapleCategory) : 'household',
      };
    });
  if (items.length === 0) throw new Error('No items could be made out in that note');
  return items;
};
