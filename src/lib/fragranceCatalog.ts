const cleanSegment = (value: string) => value
  .trim()
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const fragranceCatalogSlug = (house: string, name: string, concentration?: string | null) => {
  const parts = [house, name, concentration || 'standard'].map(cleanSegment).filter(Boolean);
  return parts.join('--');
};

export const catalogTextList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};
