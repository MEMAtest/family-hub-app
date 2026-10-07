import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { ingestCalendarEmailPayload } from './calendarEmailIngestion';
import { GrandirConnectionError, readGrandirIdentity, readGrandirFeed, grandirPostUrl } from './grandirClient';
import { loadGrandirSession, openGrandirToken, updateGrandirSession, verifyGrandirParent } from './grandirSession';
import { loadSchoolRules } from './schoolIntakeServer';
import { schoolMetadata } from '@/utils/schoolSources';
import { isChildProfile } from '@/utils/schoolEventPresentation';

export type GrandirSyncResult = { processed: number; autoCreated: number; needsReview: number; duplicates: number;
  changedNotices: Array<{ title: string; sourceUrl: string }>; skipped?: string };

// A routine learning update mentioning a weekday is not a dated calendar invitation.
export const hasDatedGrandirNotice = (body: string) =>
  /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i.test(body);

export async function syncGrandirIntake(familyId: string): Promise<GrandirSyncResult> {
  const { row, session } = await loadGrandirSession(familyId);
  const result: GrandirSyncResult = { processed: 0, autoCreated: 0, needsReview: 0, duplicates: 0, changedNotices: [] };
  if (!session?.enabled || !row) return { ...result, skipped: 'Grandir is not connected' };
  if (Date.parse(session.expiresAt) <= Date.now()) {
    await updateGrandirSession(familyId, row.version, { ...session, enabled: false, sealedToken: '', lastError: 'RECONNECT_REQUIRED' });
    throw new GrandirConnectionError('RECONNECT_REQUIRED', 'Grandir needs reconnection. Sign in again.');
  }
  try {
    const token = openGrandirToken(familyId, session.sealedToken);
    const members = await prisma.familyMember.findMany({ where: { familyId } });
    const owner = members.find(member => member.id === session.ownerMemberId);
    if (!owner || isChildProfile(owner)) {
      throw new GrandirConnectionError('ACCOUNT_MISMATCH', 'The connected parent no longer belongs to this household. Reconnect Grandir with an authorised parent.');
    }
    const { rules } = await loadSchoolRules(familyId, members);
    const verified = verifyGrandirParent(await readGrandirIdentity(token), session.parentEmail, members,
      rules.sources.find(source => source.key === 'grandir')?.memberIds || []);
    if (verified.childMemberId !== session.childMemberId || verified.providerChildId !== session.providerChildId) {
      throw new GrandirConnectionError('CHILD_NOT_VERIFIED', 'The verified nursery child changed. Reconnect Grandir before importing notices.');
    }
    // One bounded page per slot; never ingest generated care records, comments, images or payments.
    const notices = (await readGrandirFeed(token)).filter(item => !item.generated && item.body.trim()).slice(0, 40);
    for (const notice of notices) {
      const current = await loadGrandirSession(familyId);
      if (!current.session?.enabled || current.row?.version !== row.version) {
        throw new GrandirConnectionError('RECONNECT_REQUIRED', 'The Grandir connection changed. Refresh before checking again.');
      }
      const sourceUrl = grandirPostUrl(notice.feedItemId);
      const bodyHash = createHash('sha256').update(notice.body).digest('hex');
      const messageId = `grandir-post:${notice.feedItemId}`;
      const existing = await prisma.calendarEmailIntake.findFirst({ where: { familyId, messageId } });
      const priorHash = schoolMetadata(schoolMetadata(existing?.metadata).grandirPortal).bodyHash;
      if (existing && priorHash && priorHash !== bodyHash) {
        result.changedNotices.push({ title: existing.subject || 'Nursery update changed', sourceUrl });
        continue;
      }
      const subject = `Grandir nursery: ${notice.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Nursery update'}`;
      const intake = await ingestCalendarEmailPayload({ type: 'grandir-parent-portal', data: {
        messageId, from: `${notice.sender.name} (Grandir nursery)`, subject,
        text: `Grandir nursery: ${verified.nurseryName}\n${notice.body}`, sourceDate: notice.createdDate,
      } }, { familyId, eventSource: 'grandir-parent-portal', verifiedGrandirMemberId: session.childMemberId,
        referenceOnly: !hasDatedGrandirNotice(notice.body),
        grandirPortal: { postId: notice.feedItemId, bodyHash, sourceUrl, nurseryName: verified.nurseryName } });
      if (intake.statusCode >= 400) throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'A Grandir notice could not be saved. Existing selections and calendar events are unchanged.');
      result.processed += 1;
      result.autoCreated += intake.body.duplicate ? 0 : Number(intake.body.autoCreated || 0);
      result.needsReview += Number(intake.body.needsReview || 0);
      result.duplicates += intake.body.duplicate ? 1 : 0;
    }
    await updateGrandirSession(familyId, row.version, { ...session, nurseryName: verified.nurseryName,
      lastSyncAt: new Date().toISOString(), changedNotices: result.changedNotices,
      lastError: result.changedNotices.length ? 'NOTICE_CHANGED' : null });
    return result;
  } catch (error) {
    const reconnect = error instanceof GrandirConnectionError &&
      ['RECONNECT_REQUIRED', 'ACCOUNT_MISMATCH', 'CHILD_NOT_VERIFIED'].includes(error.code);
    await updateGrandirSession(familyId, row.version, { ...session,
      enabled: reconnect ? false : session.enabled, sealedToken: reconnect ? '' : session.sealedToken,
      lastError: error instanceof GrandirConnectionError ? error.code : 'SYNC_FAILED' }).catch(() => undefined);
    if (error instanceof GrandirConnectionError) throw error;
    throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'Grandir intake could not finish. Existing dates remain intact; retry the check.');
  }
}
