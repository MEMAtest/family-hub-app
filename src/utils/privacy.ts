const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g;

const replace = (value: string | undefined | null, replacement = '[REDACTED]') => {
  if (!value) return value;
  return value.replace(emailRegex, replacement).replace(phoneRegex, replacement);
};

export const redactSensitiveData = <T extends string | undefined | null>(input: T, replacement = '[REDACTED]'): T => {
  if (typeof input !== 'string') {
    return input;
  }

  return replace(input, replacement) as T;
};
