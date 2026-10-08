import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { GrandirConnectionError, readGrandirIdentity, type GrandirIdentity } from './grandirClient';
import { loadSchoolRules } from './schoolIntakeServer';
import { isChildProfile } from '@/utils/schoolEventPresentation';
import { type SchoolMember } from '@/utils/schoolSources';

export const GRANDIR_SESSION_KEY = 'integrations.grandir.private-session';

export type GrandirSession = {
  schemaVersion: 1; enabled: boolean; sealedToken: string; ownerMemberId: string; parentEmail: string;
  childMemberId: string; providerChildId: string; nurseryName: string; connectedAt: string; expiresAt: string | null;
  lastSyncAt: string | null; lastError: string | null;
  changedNotices?: Array<{ title: string; sourceUrl: string }>;
};
export type GrandirStatus = {
  configured: boolean; connected: boolean; needsReconnect: boolean; childName: string | null;
  nurseryName: string | null; parentEmail: string | null; lastSyncAt: string | null; lastError: string | null;
  changedNotices?: Array<{ title: string; sourceUrl: string }>;
};
const sessionSchema = z.object({
  schemaVersion: z.literal(1), enabled: z.boolean(), sealedToken: z.string().max(8192),
  ownerMemberId: z.string().min(1), parentEmail: z.string().email(), childMemberId: z.string().min(1),
  providerChildId: z.string().min(1), nurseryName: z.string().min(1).max(500),
  connectedAt: z.string().datetime(), expiresAt: z.string().datetime().nullable(),
  lastSyncAt: z.string().datetime().nullable(), lastError: z.string().max(100).nullable(),
  changedNotices: z.array(z.object({ title: z.string().max(300), sourceUrl: z.string().regex(/^https:\/\/www\.app\.grandiruk\.com\/#\/account\/post\/[a-zA-Z0-9_-]{1,100}$/) })).max(40).optional(),
}).refine(value => !value.enabled || Boolean(value.sealedToken));

function encryptionKey() {
  const raw = process.env.GRANDIR_SESSION_ENCRYPTION_KEY || '';
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32 || key.toString('base64') !== raw) {
    throw new GrandirConnectionError('NOT_CONFIGURED', 'Secure Grandir session storage is not configured.');
  }
  return key;
}
export const grandirStorageConfigured = () => { try { encryptionKey(); return true; } catch { return false; } };

export function sealGrandirToken(familyId: string, token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`grandir-session:v1:${familyId}`));
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
}
export function openGrandirToken(familyId: string, sealed: string) {
  const [version, iv, tag, ciphertext, extra] = sealed.split('.');
  if (version !== 'v1' || extra !== undefined || !iv || !tag || !ciphertext) throw new Error('Invalid encrypted session');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(`grandir-session:v1:${familyId}`));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

export function verifyGrandirParent(identity: GrandirIdentity, parentEmail: string, members: SchoolMember[], eligibleIds: string[]) {
  if (identity.impersonated || identity.email.toLowerCase() !== parentEmail.toLowerCase()) {
    throw new GrandirConnectionError('ACCOUNT_MISMATCH', 'Use the Grandir parent account matching your signed-in Family Hub account.');
  }
  const roles = identity.roles2.filter(role => role.targetType === 'Famly.Daycare:Child' && role.sourceType === 'Famly.Daycare:Relation');
  // Until provider recipient/group filtering is verified, a mixed-child account must not import another child's feed.
  if (roles.length !== 1) throw new GrandirConnectionError('CHILD_NOT_VERIFIED', 'A single nursery child must be verified before automatic intake can be enabled.');
  const role = roles[0];
  const matches = members.filter(member => eligibleIds.includes(member.id) && isChildProfile({ ...member, role: member.role || '' }) &&
    member.name.trim().toLowerCase() === role.title.trim().toLowerCase());
  if (matches.length !== 1 || !role.subtitle.trim()) {
    throw new GrandirConnectionError('CHILD_NOT_VERIFIED', 'The Grandir child does not match the nursery assignment in this household.');
  }
  return { childMemberId: matches[0].id, providerChildId: role.targetId, nurseryName: role.subtitle };
}

export const loadGrandirSession = async (familyId: string) => {
  const row = await prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key: GRANDIR_SESSION_KEY } } });
  const parsed = sessionSchema.safeParse(row?.data);
  const session: GrandirSession | null = parsed.success ? parsed.data : null;
  return { row, session };
};

export async function grandirStatus(familyId: string): Promise<GrandirStatus> {
  const { session } = await loadGrandirSession(familyId);
  const configured = grandirStorageConfigured();
  const connected = Boolean(configured && session?.enabled);
  const member = session ? await prisma.familyMember.findFirst({ where: { familyId, id: session.childMemberId }, select: { name: true } }) : null;
  return { configured, connected, needsReconnect: Boolean(session && !connected), childName: member?.name || null,
    nurseryName: session?.nurseryName || null, parentEmail: session?.parentEmail || null,
    lastSyncAt: session?.lastSyncAt || null, lastError: session?.lastError || null, changedNotices: session?.changedNotices || [] };
}

export async function connectGrandirSession(familyId: string, ownerMemberId: string, parentEmail: string, token: string) {
  const sealedToken = sealGrandirToken(familyId, token);
  const members = await prisma.familyMember.findMany({ where: { familyId } });
  const owner = members.find(member => member.id === ownerMemberId);
  if (!owner || isChildProfile(owner)) throw new GrandirConnectionError('ACCOUNT_MISMATCH', 'Only a signed-in parent can connect Grandir.');
  const { rules } = await loadSchoolRules(familyId, members);
  const verified = verifyGrandirParent(await readGrandirIdentity(token), parentEmail, members,
    rules.sources.find(source => source.key === 'grandir')?.memberIds || []);
  const session: GrandirSession = { schemaVersion: 1, enabled: true, sealedToken, ownerMemberId, parentEmail,
    ...verified, connectedAt: new Date().toISOString(), expiresAt: null,
    lastSyncAt: null, lastError: null };
  await prisma.familyDocument.upsert({ where: { familyId_key: { familyId, key: GRANDIR_SESSION_KEY } },
    create: { familyId, key: GRANDIR_SESSION_KEY, data: session as unknown as Prisma.InputJsonValue, updatedBy: ownerMemberId },
    update: { data: session as unknown as Prisma.InputJsonValue, updatedBy: ownerMemberId, version: { increment: 1 } } });
  return grandirStatus(familyId);
}

export async function updateGrandirSession(familyId: string, version: number, session: GrandirSession) {
  const result = await prisma.familyDocument.updateMany({ where: { familyId, key: GRANDIR_SESSION_KEY, version },
    data: { data: session as unknown as Prisma.InputJsonValue, version: { increment: 1 } } });
  if (result.count !== 1) throw new Error('Grandir connection changed. Refresh before retrying.');
}

export async function disconnectGrandir(familyId: string, ownerMemberId: string) {
  const { row, session } = await loadGrandirSession(familyId);
  if (!row || !session) return;
  // Disconnection drops the encrypted secret, but retains a harmless reconnect/last-sync record.
  const updated = await prisma.familyDocument.updateMany({ where: { familyId, key: GRANDIR_SESSION_KEY, version: row.version },
    data: { data: { ...session, enabled: false, sealedToken: '', lastError: null }, updatedBy: ownerMemberId,
      version: { increment: 1 } } });
  if (updated.count !== 1) throw new Error('Grandir connection changed. Refresh before retrying.');
}
