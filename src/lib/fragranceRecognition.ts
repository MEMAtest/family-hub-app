export const normalizeFragranceLabel = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

export const recognitionLabelFromFields = (input: {
  extractedText?: string | null;
  house: string;
  name: string;
  concentration?: string | null;
}) => normalizeFragranceLabel(input.extractedText || [input.house, input.name, input.concentration].filter(Boolean).join(' '));

export const recognitionSearchTerms = (...values: Array<string | null | undefined>) => (
  Array.from(new Set(values
    .flatMap((value) => normalizeFragranceLabel(value || '').split(' '))
    .filter((term) => term.length >= 3)))
    .slice(0, 8)
);
