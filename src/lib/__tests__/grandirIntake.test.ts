/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  familyMember: { findMany: jest.fn() }, calendarEmailIntake: { findFirst: jest.fn() },
} }));
jest.mock('../grandirSession', () => ({ loadGrandirSession: jest.fn(), openGrandirToken: jest.fn(),
  updateGrandirSession: jest.fn(), verifyGrandirParent: jest.fn() }));
jest.mock('../schoolIntakeServer', () => ({ loadSchoolRules: jest.fn() }));
jest.mock('../calendarEmailIngestion', () => ({ ingestCalendarEmailPayload: jest.fn() }));
jest.mock('../grandirClient', () => ({ ...jest.requireActual('../grandirClient'), readGrandirIdentity: jest.fn(), readGrandirFeed: jest.fn() }));
import prisma from '@/lib/prisma';
import { loadGrandirSession, openGrandirToken, updateGrandirSession, verifyGrandirParent } from '../grandirSession';
import { readGrandirIdentity, readGrandirFeed, GrandirConnectionError } from '../grandirClient';
import { loadSchoolRules } from '../schoolIntakeServer';
import { ingestCalendarEmailPayload } from '../calendarEmailIngestion';
import { hasDatedGrandirNotice, syncGrandirIntake } from '../grandirIntake';
const session = { enabled: true, ownerMemberId: 'parent', childMemberId: 'askia', providerChildId: 'provider-child', parentEmail: 'parent@example.com',
  expiresAt: '2026-11-01T12:00:00.000Z', sealedToken: 'encrypted', lastError: null };
const notice = { feedItemId: 'post-1', generated: false, body: 'Please label spare clothes.',
  createdDate: '2026-10-07T12:00:00Z', sender: { name: 'Nursery team' } };
describe('Grandir intake', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(new Date('2026-10-07T12:00:00Z'));
    (loadGrandirSession as jest.Mock).mockResolvedValue({ row: { version: 2 }, session });
    (openGrandirToken as jest.Mock).mockReturnValue('opaque-test-session');
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'parent', role: 'Parent' }]);
    (loadSchoolRules as jest.Mock).mockResolvedValue({ rules: { sources: [{ key: 'grandir', memberIds: ['askia'] }] } });
    (readGrandirIdentity as jest.Mock).mockResolvedValue({});
    (verifyGrandirParent as jest.Mock).mockReturnValue({ childMemberId: 'askia', providerChildId: 'provider-child', nurseryName: 'Test nursery' });
    (readGrandirFeed as jest.Mock).mockResolvedValue([notice]);
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue(null);
    (ingestCalendarEmailPayload as jest.Mock).mockResolvedValue({ statusCode: 200, body: { autoCreated: 0, needsReview: 0 } });
    (updateGrandirSession as jest.Mock).mockResolvedValue(undefined);
  });
  afterEach(() => jest.useRealTimers());
  it('skips disabled access without contacting the provider', async () => {
    (loadGrandirSession as jest.Mock).mockResolvedValue({ row: null, session: null });
    expect((await syncGrandirIntake('family')).skipped).toBeTruthy(); expect(readGrandirIdentity).not.toHaveBeenCalled();
  });
  it('revokes intake when the connecting parent leaves the household', async () => {
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([]);
    await expect(syncGrandirIntake('family')).rejects.toMatchObject({ code: 'ACCOUNT_MISMATCH' });
    expect(readGrandirIdentity).not.toHaveBeenCalled(); expect(readGrandirFeed).not.toHaveBeenCalled();
    expect(updateGrandirSession).toHaveBeenCalledWith('family', 2, expect.objectContaining({ enabled: false, sealedToken: '' }));
  });
  it('never imports generated care logs and saves undated notices without inventing dates', async () => {
    (readGrandirFeed as jest.Mock).mockResolvedValue([{ ...notice, feedItemId: 'care', generated: true }, notice]);
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 1, autoCreated: 0 });
    expect(ingestCalendarEmailPayload).toHaveBeenCalledTimes(1);
    expect(ingestCalendarEmailPayload).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      verifiedGrandirMemberId: 'askia', referenceOnly: true, eventSource: 'grandir-parent-portal' }));
  });
  it('recognises explicit dates but not a routine weekday description', () => {
    expect(hasDatedGrandirNotice('We practised music on Wednesday.')).toBe(false);
    for (const text of ['Photos 12 October', 'Photos October 12', 'Party 12/10/2026', 'Party 2026-10-12']) expect(hasDatedGrandirNotice(text)).toBe(true);
  });
  it('reads subsequent pages with the observed cursor and stops repeated pages', async () => {
    const second = { ...notice, feedItemId: 'post-2', body: 'Next week is Book of the Week. Please bring a favourite book.' };
    (readGrandirFeed as jest.Mock).mockResolvedValueOnce([notice]).mockResolvedValueOnce([second]).mockResolvedValue([second]);
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 2 });
    expect(readGrandirFeed).toHaveBeenNthCalledWith(2, 'opaque-test-session', notice.feedItemId, notice.createdDate);
    expect(ingestCalendarEmailPayload).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ referenceOnly: true,
      nurserySummary: expect.objectContaining({ kind: 'preparation', title: 'Book of the Week' }) }));
  });
  it('keeps attachment-only notices pending, rather than saying no events', async () => {
    (readGrandirFeed as jest.Mock).mockResolvedValue([{ ...notice, body: '', files: [{ name: 'notice.pdf' }] }]);
    await syncGrandirIntake('family');
    expect(ingestCalendarEmailPayload).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      referenceOnly: true, contentPending: true, nurserySummary: expect.objectContaining({ kind: 'content_pending' }) }));
  });
  it('excludes notices outside the recent history window', async () => {
    (readGrandirFeed as jest.Mock).mockResolvedValue([{ ...notice, createdDate: '2026-01-01T12:00:00Z' }]);
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 0 });
    expect(ingestCalendarEmailPayload).not.toHaveBeenCalled();
  });
  it('deduplicates repeated posts inside a single provider page', async () => {
    (readGrandirFeed as jest.Mock).mockResolvedValue([notice, { ...notice, body: 'Repeated page copy' }]);
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 1, changedNotices: [] });
    expect(ingestCalendarEmailPayload).toHaveBeenCalledTimes(1);
  });
  it('counts duplicate notices without claiming old events as newly added', async () => {
    (ingestCalendarEmailPayload as jest.Mock).mockResolvedValue({ statusCode: 200, body: { duplicate: true, autoCreated: 2 } });
    expect(await syncGrandirIntake('family')).toMatchObject({ autoCreated: 0, duplicates: 1 });
  });
  it('keeps changed notices and saved manual dates intact', async () => {
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({ subject: 'Previous notice', metadata: { grandirPortal: { bodyHash: 'old' } } });
    expect((await syncGrandirIntake('family')).changedNotices).toHaveLength(1);
    expect(ingestCalendarEmailPayload).not.toHaveBeenCalled();
    expect(updateGrandirSession).toHaveBeenCalledWith('family', 2, expect.objectContaining({ lastError: 'NOTICE_CHANGED' }));
  });
  it('drops revoked secrets and marks a durable reconnect state', async () => {
    (readGrandirIdentity as jest.Mock).mockRejectedValue(new GrandirConnectionError('RECONNECT_REQUIRED', 'Reconnect'));
    await expect(syncGrandirIntake('family')).rejects.toMatchObject({ code: 'RECONNECT_REQUIRED' });
    expect(updateGrandirSession).toHaveBeenCalledWith('family', 2, expect.objectContaining({ enabled: false, sealedToken: '', lastError: 'RECONNECT_REQUIRED' }));
  });
  it('does not ingest after a disconnect or replacement connection', async () => {
    (loadGrandirSession as jest.Mock).mockResolvedValueOnce({ row: { version: 2 }, session })
      .mockResolvedValue({ row: { version: 3 }, session: { ...session, enabled: false } });
    await expect(syncGrandirIntake('family')).rejects.toMatchObject({ code: 'RECONNECT_REQUIRED' });
    expect(ingestCalendarEmailPayload).not.toHaveBeenCalled();
  });
  it('retains valid access on a transient provider outage, without reporting a successful check', async () => {
    (readGrandirFeed as jest.Mock).mockRejectedValue(new Error('private provider detail'));
    await expect(syncGrandirIntake('family')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(updateGrandirSession).toHaveBeenCalledWith('family', 2, expect.objectContaining({ enabled: true, lastError: 'SYNC_FAILED' }));
    expect(updateGrandirSession).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ lastSyncAt: expect.anything() }));
  });
});
