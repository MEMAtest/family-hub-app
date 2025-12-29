import { PropertyTaskPriority } from '@/types/property.types';

export interface ParsedSurveyTask {
  title: string;
  category: string;
  impact: string;
  timeframe: string;
  priority: PropertyTaskPriority;
  conditionRating?: 1 | 2 | 3;
  pageReference?: string;
  recommendedContractor?: string;
  confidence: number;
  sourceSnippet?: string;
}

export interface SurveyParseResult {
  tasks: ParsedSurveyTask[];
  warnings: string[];
}

const categoryRules: Array<{
  category: string;
  contractor?: string;
  patterns: RegExp[];
}> = [
  { category: 'Roof', contractor: 'Roofing contractor', patterns: [/roof|parapet|gutter|flashing|ridge|tile|valley|soffit|fascia/i] },
  { category: 'Chimney', contractor: 'Roofing contractor', patterns: [/chimney|flue|stack|pot/i] },
  { category: 'Damp', contractor: 'PCA damp and timber specialist', patterns: [/damp|moisture|leak|leaking|ingress|condensation/i] },
  { category: 'Fire safety', contractor: 'Joiner / electrician', patterns: [/fire|escape route|smoke alarm|heat alarm|alarm/i] },
  { category: 'Windows', contractor: 'Glazing contractor', patterns: [/window|glazing|sash|frame/i] },
  { category: 'Doors', contractor: 'Glazing contractor / locksmith', patterns: [/door|lock|hinge|threshold/i] },
  { category: 'Electrics', contractor: 'Qualified electrician', patterns: [/electric|wiring|consumer unit|fuse|eicr|socket|rcd/i] },
  { category: 'Gas', contractor: 'Gas Safe engineer', patterns: [/gas|boiler|combination boiler|flue|gas safe/i] },
  { category: 'Heating', contractor: 'Heating engineer', patterns: [/heating|radiator|hot water|boiler/i] },
  { category: 'Plumbing', contractor: 'Plumber', patterns: [/plumbing|pipework|lead pipe|stopcock|water supply/i] },
  { category: 'Drainage', contractor: 'Drainage specialist', patterns: [/drain|gully|soil vent|drainage|cctv survey/i] },
  { category: 'Structure', contractor: 'Structural engineer', patterns: [/structural|movement|settlement|crack|lintel|foundation|sleeper wall/i] },
  { category: 'Asbestos', contractor: 'Asbestos surveyor', patterns: [/asbestos|artex|textured coating/i] },
  { category: 'Timber', contractor: 'PCA damp and timber specialist', patterns: [/timber|rot|decay|woodworm|beetle/i] },
  { category: 'Pests', contractor: 'Pest control', patterns: [/rodent|vermin|infestation/i] },
  { category: 'Security', contractor: 'Locksmith', patterns: [/security|lock|secure|deadbolt/i] },
  { category: 'Insulation', contractor: 'Insulation contractor', patterns: [/insulation|thermal/i] },
  { category: 'External walls', contractor: 'Builder', patterns: [/external wall|render|brickwork|pointing|masonry/i] },
];

const normalizeText = (text: string) => text
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const splitParagraphs = (text: string) => {
  const lines = text.split('\n').map((line) => line.trim());
  const paragraphs: string[] = [];
  let current = '';

  const flush = () => {
    if (current.trim()) {
      paragraphs.push(current.trim());
    }
    current = '';
  };

  lines.forEach((line) => {
    if (!line) {
      flush();
      return;
    }
    const isHeading = /^\d+\.\d+/.test(line) || line.toUpperCase() === line && line.length > 6;
    if (isHeading) {
      flush();
      paragraphs.push(line);
      return;
    }
    if (!current) {
      current = line;
      return;
    }
    const shouldJoin = !/[.!?]$/.test(current) && /^[a-z(]/.test(line);
    current = shouldJoin ? `${current} ${line}` : `${current}\n${line}`;
  });

  flush();
  return paragraphs;
};

const isTableOfContentsLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed || !/\d$/.test(trimmed)) return false;
  const dotCount = (trimmed.match(/\./g) || []).length;
  return dotCount >= 8 && /\d$/.test(trimmed);
};

const extractSection = (paragraphs: string[], start: RegExp, end: RegExp) => {
  let startIndex = -1;
  for (let i = 0; i < paragraphs.length; i += 1) {
    const paragraph = paragraphs[i];
    if (start.test(paragraph.toLowerCase()) && !isTableOfContentsLine(paragraph)) {
      startIndex = i;
      break;
    }
  }
  if (startIndex === -1) return [];
  const section: string[] = [];
  const headingPattern = /^\d+\.\d+/;
  for (let i = startIndex + 1; i < paragraphs.length; i += 1) {
    if (end.test(paragraphs[i].toLowerCase())) {
      break;
    }
    if (headingPattern.test(paragraphs[i])) {
      break;
    }
    section.push(paragraphs[i]);
    if (section.length > 60) break;
  }
  return section;
};

const summaryIntroPatterns = [
  /shortcomings and defects/i,
  /obtain quotes/i,
  /fully informed of the cost/i,
  /report in its entirety/i,
  /proceeding with the purchase/i,
  /we have only summarised/i,
];

const actionSentencePatterns = [
  /we would recommend/i,
  /we recommend/i,
  /recommend/i,
  /we advise/i,
  /advise/i,
  /we suggest/i,
  /suggest/i,
  /you should/i,
  /should (be|have|instruct|install|replace|repair|inspect)/i,
  /needs? to/i,
  /will need to/i,
  /requires? to/i,
];

const summaryExcludePatterns = [
  /should be noted/i,
  /be mindful/i,
  /report in its entirety/i,
  /fully informed of the cost/i,
  /should be done prior to exchange/i,
  /should highlight/i,
  /we are unaware/i,
  /there are no mains powered/i,
  /exposure to lead/i,
];

const normalizeSentence = (sentence: string) => sentence.replace(/\s+/g, ' ').trim();

const splitIntoSentences = (paragraph: string) => {
  const cleaned = normalizeSentence(paragraph).replace(/:\s+/g, '. ');
  if (!cleaned) return [];
  return cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((sentence) => normalizeSentence(sentence))
    .filter(Boolean);
};

const isSummaryIntro = (sentence: string) => summaryIntroPatterns.some((pattern) => pattern.test(sentence));

const isActionSentence = (sentence: string) => actionSentencePatterns.some((pattern) => pattern.test(sentence));
const isSummaryExcluded = (sentence: string) => summaryExcludePatterns.some((pattern) => pattern.test(sentence));

const extractSummaryItems = (summaryParagraphs: string[]) => {
  const sentences = summaryParagraphs.flatMap((paragraph) => splitIntoSentences(paragraph));
  const items: string[] = [];
  let previousSentence = '';

  sentences.forEach((sentence) => {
    if (!sentence || sentence.length < 25) {
      previousSentence = sentence;
      return;
    }
    if (isSummaryIntro(sentence) || isSummaryExcluded(sentence)) {
      previousSentence = sentence;
      return;
    }
    if (isActionSentence(sentence)) {
      const canPrefix = previousSentence
        && !isSummaryIntro(previousSentence)
        && !isActionSentence(previousSentence)
        && previousSentence.length < 240;
      items.push(canPrefix ? `${previousSentence} ${sentence}` : sentence);
    }
    previousSentence = sentence;
  });

  return items;
};

const detectCategory = (text: string) => {
  for (const rule of categoryRules) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return { category: rule.category, contractor: rule.contractor };
    }
  }
  return { category: 'General', contractor: undefined };
};

const detectTimeframe = (text: string) => {
  const lower = text.toLowerCase();
  if (/(immediate|urgent|as soon as possible)/.test(lower)) {
    return { timeframe: 'Immediate', priority: 'urgent' as PropertyTaskPriority };
  }
  if (/(short term|short-term|within 1|within 2|in the short term)/.test(lower)) {
    return { timeframe: 'Short term', priority: 'short' as PropertyTaskPriority };
  }
  if (/(medium term|medium-term|within 3|within 5|in the medium term)/.test(lower)) {
    return { timeframe: 'Medium term', priority: 'medium' as PropertyTaskPriority };
  }
  if (/(long term|long-term|within 10|within 20|in the long term)/.test(lower)) {
    return { timeframe: 'Long term', priority: 'long' as PropertyTaskPriority };
  }
  if (/monitor|keep an eye|watch for/.test(lower)) {
    return { timeframe: 'Monitor', priority: 'medium' as PropertyTaskPriority };
  }
  return { timeframe: 'Short term', priority: 'short' as PropertyTaskPriority };
};

const detectConditionRating = (text: string) => {
  const lower = text.toLowerCase();
  if (/condition rating 3|serious|urgent|hazard|risk/.test(lower)) {
    return 3;
  }
  if (/condition rating 2|repair|improvement|medium term/.test(lower)) {
    return 2;
  }
  if (/condition rating 1|ok|maintenance/.test(lower)) {
    return 1;
  }
  return undefined;
};

const cleanLead = (text: string) => (
  text
    .replace(/^(we|you)\s+(would\s+)?(recommend|advise|suggest|should)\s+(that\s+)?/i, '')
    .replace(/^(we|you)\s+recommend\s+/i, '')
    .trim()
);

const findActionSentence = (paragraph: string) => {
  const sentences = splitIntoSentences(paragraph);
  return sentences.find((sentence) => isActionSentence(sentence));
};

const makeTitle = (paragraph: string) => {
  const actionSentence = findActionSentence(paragraph);
  const sentence = actionSentence || paragraph.split(/[.!?]/)[0] || paragraph;
  const cleaned = cleanLead(sentence);
  return cleaned.length > 12 ? cleaned.slice(0, 90) : paragraph.slice(0, 90);
};

const extractImpact = (paragraph: string) => {
  const sentences = paragraph.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
  const riskSentence = sentences.find((sentence) => /risk|hazard|danger|unsafe|ingress|leak/.test(sentence.toLowerCase()));
  const impact = riskSentence || sentences[0] || 'Survey flagged issue';
  return impact.length > 160 ? `${impact.slice(0, 157)}...` : impact;
};

const computeConfidence = (input: {
  categoryMatched: boolean;
  timeframeMatched: boolean;
  contractorMatched: boolean;
  conditionRating?: number;
  length: number;
}) => {
  let score = 0.4;
  if (input.categoryMatched) score += 0.2;
  if (input.timeframeMatched) score += 0.1;
  if (input.contractorMatched) score += 0.1;
  if (input.conditionRating) score += 0.1;
  if (input.length > 120) score += 0.05;
  return Math.min(0.95, score);
};

const normalizeKey = (text: string) => text
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .slice(0, 80);

const buildTaskFromParagraph = (paragraph: string, pageReference: string): ParsedSurveyTask | null => {
  if (paragraph.length < 30) return null;

  const categoryResult = detectCategory(paragraph);
  const timeframeResult = detectTimeframe(paragraph);
  const conditionRating = detectConditionRating(paragraph);
  const title = makeTitle(paragraph);
  const impact = extractImpact(paragraph);
  const confidence = computeConfidence({
    categoryMatched: categoryResult.category !== 'General',
    timeframeMatched: timeframeResult.timeframe !== 'Short term',
    contractorMatched: Boolean(categoryResult.contractor),
    conditionRating,
    length: paragraph.length,
  });

  return {
    title,
    category: categoryResult.category,
    impact,
    timeframe: timeframeResult.timeframe,
    priority: timeframeResult.priority,
    conditionRating,
    pageReference,
    recommendedContractor: categoryResult.contractor,
    confidence,
    sourceSnippet: paragraph.slice(0, 240),
  };
};

const parseRisksSection = (paragraphs: string[]) => {
  const index = paragraphs.findIndex((p) => /risks?\s+to\s+occupants/i.test(p));
  if (index === -1) return [];
  const items: ParsedSurveyTask[] = [];
  for (let i = index + 1; i < paragraphs.length; i += 1) {
    const line = paragraphs[i];
    if (!line || /^\d+\.\d+/.test(line)) break;
    if (line.length < 8) continue;
    const parts = line.split('-');
    const title = parts.length > 1 ? cleanLead(parts[0]) : `Risk: ${line.slice(0, 60)}`;
    const impact = parts.length > 1 ? parts.slice(1).join('-').trim() : line;
    const categoryResult = detectCategory(line);
    items.push({
      title: `Address risk - ${title}`,
      category: categoryResult.category,
      impact,
      timeframe: 'Immediate',
      priority: 'urgent',
      conditionRating: 3,
      pageReference: 'Risks to occupants',
      recommendedContractor: categoryResult.contractor,
      confidence: 0.6,
      sourceSnippet: line,
    });
  }
  return items;
};

export const parseSurveyText = (rawText: string): SurveyParseResult => {
  const warnings: string[] = [];
  const text = normalizeText(rawText);
  const paragraphs = splitParagraphs(text);

  const summaryParagraphs = extractSection(
    paragraphs,
    /overall summary|summary.*property|summary of the property/i,
    /general description|3\.0\s|3\.1/i
  );

  if (summaryParagraphs.length === 0) {
    warnings.push('No summary section found. Results may be incomplete.');
  }

  const summaryItems = extractSummaryItems(summaryParagraphs);
  const summaryTasks = (summaryItems.length > 0 ? summaryItems : summaryParagraphs)
    .map((paragraph) => buildTaskFromParagraph(paragraph, 'Summary'))
    .filter((task): task is ParsedSurveyTask => Boolean(task));

  const riskTasks = parseRisksSection(paragraphs);

  const tasks = [...summaryTasks, ...riskTasks];
  const seen = new Set<string>();
  const deduped: ParsedSurveyTask[] = [];

  tasks.forEach((task) => {
    const key = normalizeKey(`${task.title}-${task.category}`);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(task);
  });

  if (deduped.length === 0) {
    warnings.push('No actionable items were detected. Try CSV import for manual mapping.');
  }

  return { tasks: deduped, warnings };
};
