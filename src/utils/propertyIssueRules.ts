import type {
  CostRange,
  PropertyIssueArea,
  PropertyIssueDraft,
  PropertyIssueUrgency,
} from '@/types/property.types';

// Built-in understanding of common UK household jobs. Used when no AI key is
// configured, when the AI call fails, and to tidy up whatever the AI returns.

export const ISSUE_AREAS: PropertyIssueArea[] = [
  'roof_gutters', 'windows_doors', 'exterior', 'garden', 'plumbing', 'heating',
  'electrical', 'damp', 'interior', 'kitchen', 'bathroom', 'cleaning', 'pests',
  'safety', 'appliances', 'other',
];

export const ISSUE_URGENCIES: PropertyIssueUrgency[] = ['urgent', 'soon', 'routine', 'someday'];

export const ISSUE_AREA_LABELS: Record<PropertyIssueArea, string> = {
  roof_gutters: 'Roof & gutters',
  windows_doors: 'Windows & doors',
  exterior: 'Exterior',
  garden: 'Garden',
  plumbing: 'Plumbing',
  heating: 'Heating & boiler',
  electrical: 'Electrical',
  damp: 'Damp & mould',
  interior: 'Interior',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  cleaning: 'Cleaning',
  pests: 'Pests',
  safety: 'Safety',
  appliances: 'Appliances',
  other: 'Other',
};

export const ISSUE_URGENCY_LABELS: Record<PropertyIssueUrgency, string> = {
  urgent: 'Urgent',
  soon: 'This week',
  routine: 'Next few weeks',
  someday: 'When convenient',
};

interface IssueRule {
  match: RegExp;
  title: string;
  area: PropertyIssueArea;
  trade: string;
  diy: boolean;
  cost: [number, number];
  urgency?: PropertyIssueUrgency;
  recurrence?: { interval: number; unit: 'month' | 'year' };
  steps: string[];
  safetyNote?: string;
}

// Order matters: the first matching rule wins, so specific and safety rules come first.
const RULES: IssueRule[] = [
  {
    match: /smell(s|ing)? (of )?gas|gas smell|gas leak/i,
    title: 'Possible gas leak',
    area: 'safety',
    trade: 'Gas Safe engineer',
    diy: false,
    cost: [0, 150],
    urgency: 'urgent',
    steps: ['Leave the property and call the National Gas Emergency line', 'Do not use light switches or naked flames', 'Book a Gas Safe engineer to inspect appliances'],
    safetyNote: 'Call the National Gas Emergency Service on 0800 111 999 now. Open windows, avoid switches and flames.',
  },
  {
    match: /\bspark(s|ing|ed)?\b|burning smell|smell(s|ing)? of burning|exposed wires?|scorch/i,
    title: 'Electrical fault — sparking or burning smell',
    area: 'safety',
    trade: 'Electrician',
    diy: false,
    cost: [90, 300],
    urgency: 'urgent',
    steps: ['Switch off the circuit at the consumer unit if safe', 'Do not use the socket or fitting', 'Book an NICEIC-registered electrician'],
    safetyNote: 'Isolate the circuit at the fuse box if you can do so safely, and do not use it until checked.',
  },
  {
    match: /smoke alarm|carbon monoxide|co alarm|fire alarm/i,
    title: 'Check smoke and CO alarms',
    area: 'safety',
    trade: 'DIY',
    diy: true,
    cost: [10, 40],
    urgency: 'soon',
    recurrence: { interval: 1, unit: 'year' },
    steps: ['Press the test button on each alarm', 'Replace batteries or units older than 10 years', 'Make sure there is a CO alarm near the boiler'],
  },
  {
    match: /gutter|downpipe|down pipe|drainpipe/i,
    title: 'Clear and check gutters',
    area: 'roof_gutters',
    trade: 'Gutter cleaner',
    diy: false,
    cost: [60, 150],
    recurrence: { interval: 1, unit: 'year' },
    steps: ['Book a gutter clean (ideally late autumn after leaf fall)', 'Ask them to check joints and downpipes for leaks', 'Request before/after photos'],
  },
  {
    match: /\broof|\bslates?\b|chimney|flashing|loft leak/i,
    title: 'Roof inspection and repair',
    area: 'roof_gutters',
    trade: 'Roofer',
    diy: false,
    cost: [150, 500],
    steps: ['Note where the damage or leak is visible', 'Get two or three roofer quotes', 'Check the work is guaranteed'],
  },
  {
    match: /(clean|wash)\w*\s+(the\s+)?windows?|windows?\s+(need\w*\s+)?(a\s+)?(clean|wash)/i,
    title: 'Window clean',
    area: 'cleaning',
    trade: 'Window cleaner',
    diy: false,
    cost: [20, 45],
    urgency: 'routine',
    recurrence: { interval: 2, unit: 'month' },
    steps: ['Book a window cleaner (ask about a regular round)', 'Include frames and sills', 'Consider a combined gutter clean for a discount'],
  },
  {
    match: /\block(s|ed)?\b|can'?t lock|won'?t lock|key (stuck|broken)/i,
    title: 'Fix door or window lock',
    area: 'windows_doors',
    trade: 'Locksmith',
    diy: false,
    cost: [80, 200],
    urgency: 'soon',
    steps: ['Check whether the door or window can still be secured tonight', 'Call a locksmith (ask for a fixed call-out price)', 'Check your home insurance lock requirements'],
  },
  {
    match: /smashed|cracked (window|glass|pane)|broken (window|glass|pane)|misted|condensation between|double glaz/i,
    title: 'Replace or repair glazing',
    area: 'windows_doors',
    trade: 'Glazier',
    diy: false,
    cost: [100, 350],
    steps: ['Measure the pane and note the window location', 'Get a glazier quote', 'Board up if broken and insecure'],
  },
  {
    match: /window|door|draught|draft|hinge|handle|sticking|letterbox/i,
    title: 'Window or door repair',
    area: 'windows_doors',
    trade: 'Handyman',
    diy: false,
    cost: [60, 200],
    steps: ['Note which window or door and what is wrong', 'Try lubricating hinges and tightening screws', 'Book a handyman if it needs parts'],
  },
  {
    match: /blocked drain|drain (is )?blocked|drains? smell|manhole|sewage/i,
    title: 'Clear blocked drain',
    area: 'plumbing',
    trade: 'Drainage specialist',
    diy: false,
    cost: [90, 220],
    urgency: 'soon',
    steps: ['Avoid running water into the affected drain', 'Try a plunger or enzyme cleaner first', 'Call a drainage company if it persists'],
  },
  {
    match: /dripping tap|tap (is )?dripping|leaky tap/i,
    title: 'Fix dripping tap',
    area: 'plumbing',
    trade: 'DIY',
    diy: true,
    cost: [5, 25],
    steps: ['Turn off the isolation valve under the sink', 'Replace the washer or cartridge', 'Call a plumber if the valve seat is worn'],
  },
  {
    match: /leak|burst|flood|\bpipes?\b|toilet|\bloo\b|cistern|\btaps?\b|\bsinks?\b|plumb|water pressure|no water|blocked (sink|toilet|loo|shower|bath)/i,
    title: 'Plumbing repair',
    area: 'plumbing',
    trade: 'Plumber',
    diy: false,
    cost: [80, 250],
    steps: ['Find your stopcock in case you need to turn water off', 'Note where the water is coming from', 'Book a plumber'],
  },
  {
    match: /bleed|radiators? (cold|not heating|cold at the top)/i,
    title: 'Bleed radiators',
    area: 'heating',
    trade: 'DIY',
    diy: true,
    cost: [0, 10],
    steps: ['Turn heating off and let radiators cool', 'Open each bleed valve with a radiator key until water appears', 'Top up boiler pressure to about 1.5 bar'],
  },
  {
    match: /boiler|heating|radiator|thermostat|hot water/i,
    title: 'Boiler or heating check',
    area: 'heating',
    trade: 'Gas Safe heating engineer',
    diy: false,
    cost: [80, 300],
    recurrence: { interval: 1, unit: 'year' },
    steps: ['Check the boiler pressure and any fault code', 'Book a Gas Safe engineer', 'Ask for an annual service at the same visit'],
  },
  {
    match: /socket|\blights?\b|light fitting|\bswitch|\bfuses?\b|\btrip(s|ping|ped)?\b|electric|wiring|consumer unit/i,
    title: 'Electrical repair',
    area: 'electrical',
    trade: 'Electrician',
    diy: false,
    cost: [80, 250],
    steps: ['Note which circuit or fitting is affected', 'Check the consumer unit for a tripped switch', 'Book an NICEIC-registered electrician'],
  },
  {
    match: /silicone|sealant|grout|\btiles?\b|extractor fan|shower (screen|door|head)|bath panel/i,
    title: 'Bathroom sealant or fittings',
    area: 'bathroom',
    trade: 'DIY',
    diy: true,
    cost: [10, 40],
    steps: ['Remove old sealant or grout', 'Clean and dry the area fully', 'Apply new sanitary silicone and leave 24 hours'],
  },
  {
    match: /mould|mold|damp|condensation|musty|black spots/i,
    title: 'Treat damp or mould',
    area: 'damp',
    trade: 'Damp specialist',
    diy: false,
    cost: [150, 600],
    urgency: 'soon',
    steps: ['Clean surface mould with a mould remover', 'Improve ventilation (extractor fans, trickle vents)', 'Get a damp survey if it keeps returning'],
  },
  {
    match: /washing machine|dishwasher|\boven\b|\bhob\b|fridge|freezer|tumble dryer|microwave|appliance/i,
    title: 'Appliance repair',
    area: 'appliances',
    trade: 'Appliance repair engineer',
    diy: false,
    cost: [70, 200],
    steps: ['Note the make, model and any error code', 'Check whether it is still under warranty', 'Compare repair cost with replacement'],
  },
  {
    match: /\bmice\b|\bmouse\b|\brats?\b|\bwasps?\b|\bants\b|\bpests?\b|\bmoths?\b|cockroach|bed ?bugs|squirrels?|pigeons?/i,
    title: 'Pest control',
    area: 'pests',
    trade: 'Pest control',
    diy: false,
    cost: [80, 220],
    urgency: 'soon',
    steps: ['Note where you have seen signs', 'Check whether your council offers a pest service', 'Seal gaps and store food securely'],
  },
  {
    match: /\btrees?\b|\bbranch(es)?\b/i,
    title: 'Tree work',
    area: 'garden',
    trade: 'Tree surgeon',
    diy: false,
    cost: [200, 800],
    steps: ['Check whether the tree has a preservation order (TPO)', 'Get quotes from qualified tree surgeons', 'Agree waste removal in the price'],
  },
  {
    match: /\bfenc(e|es|ing)\b|\bgates?\b|\bshed\b|decking|\bpatio\b|paving/i,
    title: 'Fence, gate or patio repair',
    area: 'exterior',
    trade: 'Handyman',
    diy: false,
    cost: [100, 500],
    steps: ['Photograph the damage', 'Check which fences are yours on the title plan', 'Get a quote from a fencing contractor or handyman'],
  },
  {
    match: /hedge|lawn|grass|weeds?|garden|overgrown|mow/i,
    title: 'Garden tidy',
    area: 'garden',
    trade: 'Gardener',
    diy: true,
    cost: [50, 200],
    steps: ['Decide whether to DIY or book a gardener', 'Arrange green waste collection', 'Consider a regular maintenance visit'],
  },
  {
    match: /brick|pointing|render|wall crack|external wall|soffit|fascia/i,
    title: 'External wall or woodwork repair',
    area: 'exterior',
    trade: 'Builder',
    diy: false,
    cost: [200, 1000],
    steps: ['Photograph and measure the affected area', 'Check whether cracks are growing (mark the ends)', 'Get builder quotes'],
  },
  {
    match: /paint|decorat|wallpaper|plaster|crack|scuff|skirting/i,
    title: 'Decorating and making good',
    area: 'interior',
    trade: 'Painter & decorator',
    diy: true,
    cost: [30, 400],
    urgency: 'someday',
    steps: ['Fill small cracks with flexible filler', 'Sand and prime before painting', 'Book a decorator for larger rooms'],
  },
  {
    match: /cupboard|cabinet|worktop|kitchen|drawer/i,
    title: 'Kitchen fix',
    area: 'kitchen',
    trade: 'Handyman',
    diy: true,
    cost: [20, 200],
    steps: ['Check hinges and runners for loose screws', 'Order replacement parts if needed', 'Book a handyman or carpenter for bigger jobs'],
  },
  {
    match: /clean|carpet|deep clean|hoover|vacuum/i,
    title: 'Cleaning job',
    area: 'cleaning',
    trade: 'Cleaner',
    diy: true,
    cost: [60, 250],
    steps: ['Decide on DIY or a professional clean', 'Book a cleaner for deep or carpet cleans', 'Consider a regular slot'],
  },
];

const URGENT_WORDS = /\b(urgent|asap|emergency|burst|flood(ing)?|pouring|no heating|no hot water|no water|sewage|collaps\w*|dangerous|unsafe|can'?t lock|locked out)\b/i;
const SOON_WORDS = /\b(leak(ing)?|drip(ping)?|blocked|overflow(ing)?|broken|not working|stopped working|loose|damp|mould|mold|cold)\b/i;
const SOMEDAY_WORDS = /\b(at some point|eventually|one day|someday|some day|would be nice|when we get (a )?chance|no rush|low priority)\b/i;

const ROOM_WORDS: Array<[RegExp, string]> = [
  [/\bkitchen\b/i, 'Kitchen'],
  [/\bbath ?room\b|\bshower room\b/i, 'Bathroom'],
  [/\ben ?suite\b/i, 'En suite'],
  [/\b(master|main) bedroom\b/i, 'Main bedroom'],
  [/\bkids'? (bed)?room\b|\bnursery\b/i, "Kids' room"],
  [/\bbedroom\b/i, 'Bedroom'],
  [/\bliving room\b|\blounge\b|\bsitting room\b/i, 'Living room'],
  [/\bdining room\b/i, 'Dining room'],
  [/\bhall(way)?\b/i, 'Hallway'],
  [/\blanding\b|\bstairs\b/i, 'Stairs & landing'],
  [/\bloft\b|\battic\b/i, 'Loft'],
  [/\bgarage\b/i, 'Garage'],
  [/\bback garden\b/i, 'Back garden'],
  [/\bfront garden\b/i, 'Front garden'],
  [/\b(at|on|to) the back\b|\brear\b|\bback of the house\b/i, 'Back of house'],
  [/\b(at|on|to) the front\b|\bfront of the house\b/i, 'Front of house'],
];

export const toYMD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseYMD = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const URGENCY_LEAD_DAYS: Record<PropertyIssueUrgency, number> = {
  urgent: 1,
  soon: 5,
  routine: 21,
  someday: 60,
};

// Suggest a sensible date: DIY jobs land on a Saturday, trade jobs on a weekday.
export const suggestIssueDate = (urgency: PropertyIssueUrgency, diy: boolean, today: Date = new Date()) => {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  date.setDate(date.getDate() + URGENCY_LEAD_DAYS[urgency]);
  if (urgency !== 'urgent') {
    if (diy) {
      while (date.getDay() !== 6) date.setDate(date.getDate() + 1);
    } else {
      while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
    }
  }
  return toYMD(date);
};

const findRule = (text: string) => RULES.find((rule) => rule.match.test(text));

const detectUrgency = (text: string, rule?: IssueRule): PropertyIssueUrgency => {
  if (rule?.urgency === 'urgent' || URGENT_WORDS.test(text)) return 'urgent';
  if (SOMEDAY_WORDS.test(text)) return 'someday';
  if (rule?.urgency === 'soon' || SOON_WORDS.test(text)) return 'soon';
  return rule?.urgency ?? 'routine';
};

const detectRoom = (text: string) => ROOM_WORDS.find(([pattern]) => pattern.test(text))?.[1];

const tidySentence = (text: string) => {
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/^(we|i)\s+(need|want|should|must)\s+(to\s+)?/i, '')
    .replace(/^(need|needs|get|getting|sort|sort out)\s+(to\s+)?/i, '')
    .replace(/[.!]+$/, '')
    .trim();
  if (!cleaned) return 'New issue';
  const capped = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return capped.length > 70 ? `${capped.slice(0, 67)}...` : capped;
};

// Break a brain-dump like "gutters need clearing and windows need a clean" into separate jobs.
export const splitIssueText = (text: string): string[] => {
  const chunks = text
    .split(/\r?\n|;|•|(?<=[.!?])\s+(?=[A-Z])/)
    .map((part) => part.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean);

  const result: string[] = [];
  for (const chunk of chunks) {
    const parts = chunk.split(/,\s*(?:and\s+)?|\s+and also\s+|\s+and\s+|\s+plus\s+|\s+also\s+/i).map((p) => p.trim()).filter(Boolean);
    const rules = parts.map((part) => findRule(part));
    const allMatchDistinct = parts.length > 1
      && rules.every(Boolean)
      && new Set(rules.map((rule) => rule!.title)).size === parts.length;
    if (allMatchDistinct) {
      result.push(...parts);
    } else {
      result.push(chunk);
    }
  }
  return result.slice(0, 10);
};

export const classifyIssue = (text: string, today: Date = new Date()): PropertyIssueDraft => {
  const sourceText = text.trim();
  const rule = findRule(sourceText);
  const urgency = detectUrgency(sourceText, rule);
  const diy = rule?.diy ?? false;
  const room = detectRoom(sourceText);

  return {
    title: rule ? (room && rule.area !== 'safety' ? `${rule.title} (${room.toLowerCase()})` : rule.title) : tidySentence(sourceText),
    area: rule?.area ?? 'other',
    urgency,
    trade: rule?.trade ?? 'Handyman',
    diy,
    costRange: { min: rule?.cost[0] ?? 60, max: rule?.cost[1] ?? 200, currency: 'GBP' },
    suggestedDate: suggestIssueDate(urgency, diy, today),
    recurrence: rule?.recurrence,
    steps: rule?.steps ?? ['Take a photo and note exactly what is wrong', 'Decide whether it is a DIY job', 'Get a quote from a local handyman'],
    safetyNote: rule?.safetyNote,
    room,
    sourceText,
  };
};

export const classifyIssues = (text: string, today: Date = new Date()): PropertyIssueDraft[] =>
  splitIssueText(text).map((part) => classifyIssue(part, today));

const asString = (value: unknown, max = 120) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const asCostRange = (value: unknown, fallback?: CostRange): CostRange | undefined => {
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Record<string, unknown>;
  const min = Number(raw.min);
  const max = Number(raw.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0 || max > 100000) return fallback;
  return { min: Math.round(Math.min(min, max)), max: Math.round(Math.max(min, max)), currency: 'GBP' };
};

// Validate AI output field by field, falling back to the rules for anything missing or malformed.
export const normalizeIssueDraft = (
  raw: unknown,
  sourceText: string,
  today: Date = new Date()
): PropertyIssueDraft => {
  const base = classifyIssue(sourceText || asString((raw as any)?.title) || 'Issue', today);
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Record<string, unknown>;

  const area = ISSUE_AREAS.includes(data.area as PropertyIssueArea) ? (data.area as PropertyIssueArea) : base.area;
  // Never let the AI downgrade something the rules consider a safety emergency.
  const aiUrgency = ISSUE_URGENCIES.includes(data.urgency as PropertyIssueUrgency) ? (data.urgency as PropertyIssueUrgency) : base.urgency;
  const urgency = base.urgency === 'urgent' ? 'urgent' : aiUrgency;
  const diy = typeof data.diy === 'boolean' ? data.diy : base.diy;

  const todayYmd = toYMD(today);
  const suggested = asString(data.suggestedDate, 10);
  const suggestedDate = /^\d{4}-\d{2}-\d{2}$/.test(suggested) && suggested >= todayYmd && !Number.isNaN(parseYMD(suggested).getTime())
    ? suggested
    : suggestIssueDate(urgency, diy, today);

  const rawRecurrence = data.recurrence as Record<string, unknown> | null | undefined;
  const interval = Number(rawRecurrence?.interval);
  const recurrence = rawRecurrence && Number.isInteger(interval) && interval > 0 && interval <= 24
    && (rawRecurrence.unit === 'month' || rawRecurrence.unit === 'year')
    ? { interval, unit: rawRecurrence.unit as 'month' | 'year' }
    : rawRecurrence === null ? undefined : base.recurrence;

  const steps = Array.isArray(data.steps)
    ? data.steps.map((step) => asString(step, 160)).filter(Boolean).slice(0, 5)
    : [];

  return {
    title: asString(data.title, 80) || base.title,
    area,
    urgency,
    trade: asString(data.trade, 60) || base.trade,
    diy,
    costRange: asCostRange(data.costRange, base.costRange),
    suggestedDate,
    recurrence,
    steps: steps.length ? steps : base.steps,
    safetyNote: base.safetyNote || asString(data.safetyNote, 240) || undefined,
    room: asString(data.room, 40) || base.room,
    sourceText: sourceText || base.sourceText,
  };
};
