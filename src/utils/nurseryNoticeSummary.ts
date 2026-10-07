export type NurseryNoticeSummary = {
  kind: 'event' | 'routine' | 'preparation' | 'reference' | 'content_pending';
  title: string;
  purpose: string;
  actions: string[];
  timing: string | null;
  hasAttachments: boolean;
};

const cleanText = (body: string) => body
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  .replace(/<\/?[a-z][^>]*>/gi, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, code: string) => decodeCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code: string) => decodeCodePoint(parseInt(code, 16)))
  .replace(/[\t\f\v ]+/g, ' ')
  .replace(/\u2022/g, '. ')
  .replace(/[\n\r]+/g, ' ')
  .trim();

const decodeCodePoint = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
    ? String.fromCodePoint(value)
    : '';

const cap = (text: string, limit = 180) => text.length <= limit ? text : `${text.slice(0, limit - 3).trimEnd()}...`;

const timingFrom = (text: string) => {
  const match = text.match(/\b(?:today|yesterday|tomorrow|this\s+(?:morning|afternoon|evening|week|weekend)|next\s+(?:week|weekend|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(?:\d{1,2}(?:st|nd|rd|th)?\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)|\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/i);
  return match ? cap(match[0], 70) : null;
};

const sentenceContaining = (text: string, pattern: RegExp) => {
  const sentences = splitSentences(text);
  return sentences.find((sentence) => pattern.test(sentence)) || '';
};

const splitSentences = (text: string) => text
  .split(/(?<=[.!?])\s+|\s*\u2022\s*/)
  .map((part) => part.trim())
  .filter(Boolean);

const titleFrom = (text: string, kind: NurseryNoticeSummary['kind']) => {
  const bookTitle = text.match(/\bBook of the Week\b/i);
  if (bookTitle) return 'Book of the Week';
  const activity = sentenceContaining(text, /\b(?:photograph|photo day|trip|visit|party|assembly|performance|meeting|sports day|concert|event)\b/i);
  if (activity) return cap(activity.replace(/^[\s:-]+/, '').replace(/[.!?]+$/, ''), 90);
  const actionTitle = sentenceContaining(text, /\b(?:bring|pack|wear|return|label|prepare|remember to)\b/i);
  if (kind === 'preparation' && actionTitle) return cap(actionTitle.replace(/[.!?]+$/, ''), 90);
  if (kind === 'routine') {
    const routine = sentenceContaining(text, /\b(?:every|each)\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|week|month)\b/i);
    return cap(routine || 'Recurring nursery routine', 90);
  }
  return kind === 'reference' ? cap(text, 90) : 'Nursery update';
};

export function summarizeNurseryNotice(body: string, hasAttachments = false): NurseryNoticeSummary {
  const text = cleanText(typeof body === 'string' ? body : '');
  if (/\b(?:logged in using a device|new (?:device|sign.in|login)|password reset|verification code|security alert)\b/i.test(text)) {
    return { kind: 'reference', title: 'Parent account security notice',
      purpose: 'Grandir sent an account security notification. This is not a nursery activity.',
      actions: [], timing: null, hasAttachments };
  }
  if (!text) {
    return {
      kind: hasAttachments ? 'content_pending' : 'reference',
      title: hasAttachments ? 'Nursery attachment to review' : 'Nursery update',
      purpose: hasAttachments ? 'The notice has an attachment but no readable text.' : 'No readable notice text was provided.',
      actions: hasAttachments ? ['Open the original notice and review its attachment.'] : [],
      timing: null,
      hasAttachments,
    };
  }

  const timing = timingFrom(text);
  const preparationPattern = /(?:^|\bplease\s+|\bremember to\s+|\binvited to\s+|\bwill\s+|\bshould\s+|\bneed to\s+|\bare asked to\s+|\b(?:do not|don't|never|must not|mustn't|should not|shouldn't)\s+)(?:bring|pack|wear|return|label|prepare|complete)\b/i;
  const preparationSentences = splitSentences(text).filter((sentence) => preparationPattern.test(sentence)).slice(0, 4);
  const preparationSentence = preparationSentences[0] || '';
  const routineSentence = sentenceContaining(text, /\b(?:every|each)\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|week|month)\b/i);
  const eventLanguage = /\b(?:will\s+(?:take place|be held|happen|visit|host|celebrate)|is\s+(?:scheduled|planned)\s+(?:for|on)|are\s+(?:scheduled|planned)\s+(?:for|on)|join us|please join us|you are invited|we invite you)\b/i;
  const eventTitleWithDate = /\b(?:trip|visit|party|assembly|performance|meeting|sports day|concert|photo day|photographs?)\b[^.!?]{0,70}(?::|\b(?:on|this|next)\s+)\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|week|weekend|\d{1,2})\b/i;
  const retrospective = /\b(?:yesterday|last\s+(?:week|month|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|we\s+(?:had|visited|went|celebrated|enjoyed)|was\s+held|took\s+place)\b/i.test(text);
  const hasDatedEvent = Boolean(timing && !retrospective && (eventLanguage.test(text) || eventTitleWithDate.test(text)));

  let kind: NurseryNoticeSummary['kind'];
  if (preparationSentence) kind = 'preparation';
  else if (routineSentence) kind = 'routine';
  else if (hasDatedEvent) kind = 'event';
  else kind = 'reference';

  const title = titleFrom(text, kind);
  const purpose = kind === 'preparation'
    ? cap(sentenceContaining(text, /\b(?:Book of the Week|week of|children are invited|children will|we will|we are|celebrat|explor|learn|focus|enjoy)\b/i) || text)
    : kind === 'routine'
      ? cap(routineSentence)
    : kind === 'reference'
      ? cap(text)
      : cap(sentenceContaining(text, /\b(?:will|takes place|is happening|every|each|bring|pack|wear|return|label|prepare)\b/i) || text);
  const actions = preparationSentences.map((sentence) => cap(sentence));

  return { kind, title, purpose, actions, timing, hasAttachments };
}
