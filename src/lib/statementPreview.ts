import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { z } from 'zod';

const developmentSecret = randomBytes(32).toString('hex');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
export const approvedStatementRow = z.object({
  id: z.string().min(1).max(200), date, description: z.string().trim().min(1).max(1000),
  amount: z.number().positive().max(100000000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001),
  direction: z.enum(['credit', 'debit']), category: z.string().max(100),
  balance: z.number().finite().optional(), source: z.enum(['csv', 'pdf', 'xlsx']),
});
export const previewSchema = z.object({
  familyId: z.string(), accountId: z.string(), userId: z.string(), expiresAt: z.number(),
  fileName: z.string().max(255), contentHash: z.string().regex(/^[a-f0-9]{64}$/), sourceType: z.string(),
  result: z.object({
    success: z.boolean(), transactions: z.array(approvedStatementRow).max(10000),
    warnings: z.array(z.string()), errors: z.array(z.string()),
    metadata: z.object({ bank: z.string().optional(), sourceType: z.enum(['csv', 'pdf', 'xlsx']).optional(),
      startDate: date.optional(), endDate: date.optional(), statementDate: date.optional(), currency: z.string().optional() }),
  }),
});
export type StatementPreview = z.infer<typeof previewSchema>;

function secret() {
  const configured = process.env.BANK_IMPORT_PREVIEW_SECRET || process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('Statement review signing is not configured.');
  return developmentSecret;
}
const sign = (value: string) => createHmac('sha256', secret()).update(`statement-review:v1:${value}`).digest('base64url');

export function createStatementPreview(preview: StatementPreview) {
  const payload = Buffer.from(JSON.stringify(previewSchema.parse(preview))).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readStatementPreview(token: string, scope: { familyId: string; accountId: string; userId: string }) {
  if (token.length > 12_000_000) throw new Error('Statement review is too large.');
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Invalid statement review.');
  const expected = Buffer.from(sign(parts[0]));
  const actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('Invalid statement review.');
  const preview = previewSchema.parse(JSON.parse(Buffer.from(parts[0], 'base64url').toString()));
  if (preview.expiresAt < Date.now()) throw new Error('Statement review expired. Retrieve the file again.');
  if (preview.familyId !== scope.familyId || preview.accountId !== scope.accountId || preview.userId !== scope.userId) {
    throw new Error('Statement review belongs to a different account or user.');
  }
  return preview;
}
