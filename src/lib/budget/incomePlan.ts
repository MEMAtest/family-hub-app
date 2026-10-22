import { z } from 'zod';

const date = z.preprocess(value => value === '' || value === undefined ? null : value,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Enter a valid date.').nullable());
const dateOnly = (value: unknown) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = new Date(value);
    const calendarDay = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && !Number.isNaN(calendarDay.getTime()) && calendarDay.toISOString().slice(0, 10) === value.slice(0, 10)) return parsed.toISOString().slice(0, 10);
  }
  return value;
};

export function validateIncomePlan(body: Record<string, unknown>, now = new Date()) {
  const result = z.object({
    incomeName: z.string().trim().min(1, 'Enter an income name.').max(160),
    amount: z.number().finite().positive('Amount must be greater than zero.').max(1_000_000_000),
    category: z.string().trim().min(1).max(80),
    isRecurring: z.boolean().default(false),
    recurringFrequency: z.enum(['weekly', 'monthly', 'yearly']).nullish(),
    recurringStartDate: date,
    recurringEndDate: date,
    paymentDate: date,
  }).parse({
    ...body,
    amount: typeof body.amount === 'string' && body.amount.trim() ? Number(body.amount) : body.amount,
    recurringStartDate: dateOnly(body.recurringStartDate),
    recurringEndDate: dateOnly(body.recurringEndDate),
    paymentDate: dateOnly(body.paymentDate),
  });
  if (result.isRecurring) {
    result.recurringFrequency = result.recurringFrequency ?? 'monthly';
    result.recurringStartDate = result.recurringStartDate ?? result.paymentDate ?? now.toISOString().slice(0, 10);
    if (result.recurringEndDate && result.recurringEndDate < result.recurringStartDate) {
      throw new z.ZodError([{ code: 'custom', path: ['recurringEndDate'], message: 'End date must not be before the start date.' }]);
    }
    result.paymentDate = null;
  } else {
    // Older clients omit the date for an immediate one-off; explicit blanks stay invalid.
    if (body.paymentDate === undefined) result.paymentDate = now.toISOString().slice(0, 10);
    if (!result.paymentDate) throw new z.ZodError([{ code: 'custom', path: ['paymentDate'], message: 'Choose the expected payment date.' }]);
    result.recurringFrequency = null;
    result.recurringStartDate = null;
    result.recurringEndDate = null;
  }
  return {
    ...result,
    recurringStartDate: result.recurringStartDate ? new Date(result.recurringStartDate) : null,
    recurringEndDate: result.recurringEndDate ? new Date(result.recurringEndDate) : null,
    paymentDate: result.paymentDate ? new Date(result.paymentDate) : null,
  };
}
