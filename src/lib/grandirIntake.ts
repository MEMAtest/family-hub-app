import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { ingestCalendarEmailPayload } from './calendarEmailIngestion';
import { GrandirConnectionError, readGrandirIdentity, readGrandirFeed, grandirPostUrl, type GrandirFeedItem } from './grandirClient';
import { loadGrandirSession, openGrandirToken, updateGrandirSession, verifyGrandirParent } from './grandirSession';
import { loadSchoolRules } from './schoolIntakeServer';
import { schoolMetadata } from '@/utils/schoolSources';
import { isChildProfile } from '@/utils/schoolEventPresentation';
import { summarizeNurseryNotice } from '@/utils/nurseryNoticeSummary';

export type GrandirSyncResult = { processed: number; autoCreated: number; needsReview: number; duplicates: number;
  changedNotices: Array<{ title: string; sourceUrl: string }>; skipped?: string };

// A routine learning update mentioning a weekday is not a dated calendar invitation.
export const hasDatedGrandirNotice = (body: string) =>
  /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i.test(body);

export async function syncGrandirIntake(familyId: string): Promise<GrandirSyncResult> {
  const workDeadline = Date.now() + 35_000;
  const { row, session } = await loadGrandirSession(familyId);
  const result: GrandirSyncResult = { processed: 0, autoCreated: 0, needsReview: 0, duplicates: 0, changedNotices: [] };
  if (!session?.enabled || !row) return { ...result, skipped: 'Grandir is not connected' };
  let version = row.version;
  let pendingSession = session;
  const checkpoint = async () => {
    const snapshot = { ...pendingSession, changedNotices: result.changedNotices.slice(0, 40) };
    await updateGrandirSession(familyId, version, snapshot);
    version += 1;
    pendingSession = snapshot;
  };
  try {
    const token = openGrandirToken(familyId, session.sealedToken);
    const members = await prisma.familyMember.findMany({ where: { familyId } });
    const owner = members.find(member => member.id === session.ownerMemberId);
    if (!owner || isChildProfile(owner)) {
      throw new GrandirConnectionError('ACCOUNT_MISMATCH', 'The connected parent no longer belongs to this household. Reconnect Grandir with an authorised parent.');
    }
    const { rules } = await loadSchoolRules(familyId, members);
    if (Date.now() + 8_000 >= workDeadline) return { ...result, skipped: 'Grandir sync time budget reached' };
    const verified = verifyGrandirParent(await readGrandirIdentity(token), session.parentEmail, members,
      rules.sources.find(source => source.key === 'grandir')?.memberIds || []);
    if (verified.childMemberId !== session.childMemberId || verified.providerChildId !== session.providerChildId) {
      throw new GrandirConnectionError('CHILD_NOT_VERIFIED', 'The verified nursery child changed. Reconnect Grandir before importing notices.');
    }
    const seen = new Set<string>();
    const backfill = { ...(session.backfill || {
      cutoff: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      cursor: null, olderThan: null, completed: false,
    }) };
    const firstLane = session.nextSyncLane || 'fresh';
    pendingSession = { ...session, backfill: { ...backfill },
      nextSyncLane: firstLane === 'fresh' ? 'historical' : 'fresh' };
    const assertCurrent = async () => {
      const current = await loadGrandirSession(familyId);
      if (!current.session?.enabled || current.row?.version !== version) {
        throw new GrandirConnectionError('RECONNECT_REQUIRED', 'The Grandir connection changed. Refresh before checking again.');
      }
    };
    const ingest = async (notice: GrandirFeedItem) => {
      await assertCurrent();
      if (Date.now() >= workDeadline) return false;
      const sourceUrl = grandirPostUrl(notice.feedItemId);
      const bodyHash = createHash('sha256').update(notice.body).digest('hex');
      const messageId = `grandir-post:${notice.feedItemId}`;
      const existing = await prisma.calendarEmailIntake.findFirst({ where: { familyId, messageId } });
      const priorHash = schoolMetadata(schoolMetadata(existing?.metadata).grandirPortal).bodyHash;
      if (existing && priorHash && priorHash !== bodyHash) {
        result.changedNotices.push({ title: existing.subject || 'Nursery update changed', sourceUrl });
        return true;
      }
      if (Date.now() >= workDeadline) return false;
      const summary = summarizeNurseryNotice(notice.body, Boolean(notice.files?.length));
      const subject = `Grandir nursery: ${summary.title}`;
      const intake = await ingestCalendarEmailPayload({ type: 'grandir-parent-portal', data: {
        messageId, from: `${notice.sender.name} (Grandir nursery)`, subject,
        text: `Grandir nursery: ${verified.nurseryName}\n${notice.body}`, sourceDate: notice.createdDate,
      } }, { familyId, eventSource: 'grandir-parent-portal', verifiedGrandirMemberId: session.childMemberId,
        referenceOnly: !['event', 'preparation'].includes(summary.kind) || !hasDatedGrandirNotice(notice.body),
        contentPending: summary.kind === 'content_pending',
        grandirPortal: { postId: notice.feedItemId, bodyHash, sourceUrl, nurseryName: verified.nurseryName,
          hasAttachments: summary.hasAttachments }, nurserySummary: summary });
      if (intake.statusCode >= 400) throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'A Grandir notice could not be saved. Existing selections and calendar events are unchanged.');
      result.processed += 1;
      result.autoCreated += intake.body.duplicate ? 0 : Number(intake.body.autoCreated || 0);
      result.needsReview += Number(intake.body.needsReview || 0);
      result.duplicates += intake.body.duplicate ? 1 : 0;
      return true;
    };
    const collect = async (historical: boolean) => {
      if (historical && backfill.completed) return;
      const cutoff = historical ? Date.parse(backfill.cutoff) : Date.now() - 30 * 24 * 60 * 60 * 1000;
      let cursor = historical ? backfill.cursor || undefined : undefined;
      let olderThan = historical ? backfill.olderThan || undefined : undefined;
      const laneSeen = new Set<string>(cursor ? [cursor] : []);
      let collected = 0;
      for (let page = 0; page < 2 && collected < 40; page += 1) {
        // Leave room for the provider's eight-second timeout and the final checkpoint.
        if (Date.now() + 8_000 >= workDeadline) break;
        await assertCurrent();
        if (Date.now() + 8_000 >= workDeadline) break;
        const items = await readGrandirFeed(token, cursor, olderThan);
        let advanced = false;
        let batch = 0;
        let reachedCutoff = false;
        for (const item of items) {
          if (Date.now() >= workDeadline) break;
          if (laneSeen.has(item.feedItemId)) continue;
          const createdAt = Date.parse(item.createdDate);
          if (!Number.isFinite(createdAt)) throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'Grandir returned an invalid notice date.');
          if (createdAt < cutoff) {
            reachedCutoff = true;
            if (historical) backfill.completed = true;
            break;
          }
          if (!item.generated && (item.body.trim() || item.files?.length)) {
            collected += 1;
            if (!seen.has(item.feedItemId)) {
              if (!await ingest(item)) break;
              seen.add(item.feedItemId);
            }
          }
          laneSeen.add(item.feedItemId);
          cursor = item.feedItemId;
          olderThan = new Date(createdAt).toISOString();
          advanced = true;
          if (historical) {
            backfill.cursor = cursor;
            backfill.olderThan = new Date(createdAt).toISOString();
            pendingSession = { ...pendingSession, backfill: { ...backfill } };
            batch += 1;
            if (batch >= 5) { await checkpoint(); batch = 0; }
          }
          // Persist the last consumed item, not the page tail, when the budget ends mid-page.
          if (collected >= 40) break;
        }
        if (historical) {
          if (!items.length) backfill.completed = true;
          pendingSession = { ...pendingSession, backfill: { ...backfill } };
          await checkpoint();
        }
        // A repeated provider page is not evidence that historical coverage is complete.
        if (!advanced || reachedCutoff || (backfill.completed && historical)) break;
      }
    };
    await assertCurrent();
    // Persist fairness before work, including runs interrupted before their first page completes.
    await checkpoint();
    await collect(firstLane === 'historical');
    await collect(firstLane !== 'historical');
    pendingSession = { ...pendingSession, nurseryName: verified.nurseryName,
      expiresAt: null, lastSyncAt: new Date().toISOString(),
      lastError: result.changedNotices.length ? 'NOTICE_CHANGED' : null };
    await checkpoint();
    return result;
  } catch (error) {
    const reconnect = error instanceof GrandirConnectionError &&
      ['RECONNECT_REQUIRED', 'ACCOUNT_MISMATCH', 'CHILD_NOT_VERIFIED'].includes(error.code);
    pendingSession = { ...pendingSession,
      enabled: reconnect ? false : session.enabled, sealedToken: reconnect ? '' : session.sealedToken,
      lastError: error instanceof GrandirConnectionError ? error.code : 'SYNC_FAILED' };
    await checkpoint().catch(() => undefined);
    if (error instanceof GrandirConnectionError) throw error;
    throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'Grandir intake could not finish. Existing dates remain intact; retry the check.');
  }
}
