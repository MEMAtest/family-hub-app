import { NextRequest } from 'next/server';
import { z } from 'zod';

const MAX_JSON_BYTES = 64 * 1024;

const httpsUrl = z.string().trim().max(1500).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Use a public HTTPS link.');

const nullableText = (max: number) => z.string().trim().max(max).optional().nullable();

const specialtySchema = z.enum([
  'plumber', 'electrician', 'gas_engineer', 'heating_engineer', 'roofer', 'builder',
  'structural_engineer', 'damp_specialist', 'asbestos_surveyor', 'drainage_specialist',
  'glazier', 'joiner',
  'decorator', 'gardener', 'cleaner', 'locksmith', 'handyman', 'pest_control',
  'window_cleaner', 'carpet_cleaner', 'appliance_repair', 'other',
]);

const statusSchema = z.enum([
  'candidate', 'contacted', 'visit_booked', 'quoted', 'shortlisted', 'selected',
  'completed', 'rejected',
]);

const evidenceSchema = z.object({
  kind: z.enum(['website', 'google', 'companies_house', 'checkatrade', 'trustpilot', 'community', 'manual']),
  title: z.string().trim().min(1).max(200),
  url: httpsUrl,
  summary: z.string().trim().max(1000).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).max(1_000_000_000).optional(),
  sourceDate: z.string().trim().max(80).optional(),
  fetchedAt: z.string().datetime(),
});

const profileSchema = z.object({
  summary: z.string().trim().max(2000).optional(),
  companyStatus: z.string().trim().max(100).optional(),
  projectIds: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  taskIds: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  evidence: z.array(evidenceSchema).max(50).optional(),
  previousWork: z.array(z.object({
    title: z.string().trim().max(200),
    url: httpsUrl,
  })).max(20).optional(),
  checks: z.record(z.enum(['confirmed', 'needs_check', 'not_applicable']))
    .refine((checks) => Object.keys(checks).length <= 30, 'Too many checklist values.')
    .optional(),
  reviewThemes: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  lastEnrichedAt: z.string().datetime().optional(),
});

const contractorFields = {
  name: z.string().trim().min(1).max(200),
  company: nullableText(200),
  phone: nullableText(80),
  email: z.union([z.string().trim().email().max(320), z.literal('')]).optional().nullable(),
  address: nullableText(500),
  specialty: specialtySchema,
  notes: nullableText(5000),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  website: z.union([httpsUrl, z.literal('')]).optional().nullable(),
  imageUrl: z.union([httpsUrl, z.literal('')]).optional().nullable(),
  serviceArea: nullableText(300),
  companyNumber: nullableText(30),
  status: statusSchema.optional().nullable(),
  profile: profileSchema.optional().nullable(),
};

export const createContractorSchema = z.object({
  id: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/).optional(),
  ...contractorFields,
});

export const updateContractorSchema = z.object(contractorFields).partial();

export class RequestBodyError extends Error {}

export async function readBoundedJson(request: NextRequest, limit = MAX_JSON_BYTES): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw new RequestBodyError('That contractor record is too large.');
  }
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > limit) {
    throw new RequestBodyError('That contractor record is too large.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new RequestBodyError('Invalid JSON payload.');
  }
}

export function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  return origin === request.nextUrl.origin || origin === `${protocol}://${host}`;
}
