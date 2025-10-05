export const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
};

export const createDateId = (prefix: string, date = new Date()) => {
  const safeDate = date instanceof Date ? date : new Date(date);
  const timestamp = safeDate.getTime().toString(36);
  return `${prefix}-${timestamp}`;
};
