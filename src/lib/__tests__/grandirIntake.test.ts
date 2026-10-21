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
const savedSession = () => {
  const calls = (updateGrandirSession as jest.Mock).mock.calls;
  return calls[calls.length - 1][2];
};
function mockConnection(data: object, initialVersion = 2) {
  let current = { row: { version: initialVersion }, session: data };
  (loadGrandirSession as jest.Mock).mockImplementation(async () => current);
  (updateGrandirSession as jest.Mock).mockImplementation(async (_family, version, updated) => {
    if (version !== current.row.version) throw new Error('Version conflict');
    current = { row: { version: version + 1 }, session: updated };
  });
}
describe('Grandir intake', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(new Date('2026-10-07T12:00:00Z'));
    mockConnection(session);
    (openGrandirToken as jest.Mock).mockReturnValue('opaque-test-session');
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'parent', role: 'Parent' }]);
    (loadSchoolRules as jest.Mock).mockResolvedValue({ rules: { sources: [{ key: 'grandir', memberIds: ['askia'] }] } });
    (readGrandirIdentity as jest.Mock).mockResolvedValue({});
    (verifyGrandirParent as jest.Mock).mockReturnValue({ childMemberId: 'askia', providerChildId: 'provider-child', nurseryName: 'Test nursery' });
    (readGrandirFeed as jest.Mock).mockResolvedValue([notice]);
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue(null);
    (ingestCalendarEmailPayload as jest.Mock).mockResolvedValue({ statusCode: 200, body: { autoCreated: 0, needsReview: 0 } });
  });
  afterEach(() => jest.useRealTimers());
  it('skips disabled access without contacting the provider', async () => {
    (loadGrandirSession as jest.Mock).mockResolvedValue({ row: null, session: null });
    expect((await syncGrandirIntake('family')).skipped).toBeTruthy(); expect(readGrandirIdentity).not.toHaveBeenCalled();
  });
  it('does not impose a Family Hub expiry on a provider session that still verifies', async () => {
    mockConnection({ ...session, expiresAt: '2026-10-06T12:00:00.000Z' });
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 1 });
    expect(readGrandirIdentity).toHaveBeenCalledWith('opaque-test-session');
    expect(updateGrandirSession).toHaveBeenCalledWith('family', expect.any(Number), expect.objectContaining({
      enabled: true, expiresAt: null, sealedToken: 'encrypted',
    }));
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
  it('imports historical posts inside 90 days even when outside fresh intake', async () => {
    (readGrandirFeed as jest.Mock).mockResolvedValue([{ ...notice, createdDate: '2026-08-01T12:00:00Z' }]);
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 1 });
    expect(updateGrandirSession).toHaveBeenLastCalledWith('family', expect.any(Number), expect.objectContaining({
      backfill: expect.objectContaining({ cursor: notice.feedItemId, completed: false }),
    }));
  });
  it('resumes a durable historical cursor on the next sync while fresh intake starts at the head', async () => {
    const pages = Array.from({ length: 10 }, (_, i) => ({ ...notice, feedItemId: `old-${i}`,
      createdDate: new Date(Date.parse('2026-08-31T12:00:00Z') - i * 86400000).toISOString() }));
    (readGrandirFeed as jest.Mock).mockImplementation(async (_token, cursor) =>
      [pages[cursor ? Number(cursor.split('-')[1]) + 1 : 0]].filter(Boolean));
    await syncGrandirIntake('family');
    const saved = savedSession();
    expect(saved.backfill).toMatchObject({ cursor: 'old-1', completed: false });
    mockConnection({ ...saved, nextSyncLane: 'fresh' }, 20);
    (readGrandirFeed as jest.Mock).mockClear();
    await syncGrandirIntake('family');
    expect(readGrandirFeed).toHaveBeenNthCalledWith(1, 'opaque-test-session', undefined, undefined);
    expect(readGrandirFeed).toHaveBeenNthCalledWith(2, 'opaque-test-session', 'old-1', pages[1].createdDate);
    expect(updateGrandirSession).toHaveBeenLastCalledWith('family', expect.any(Number), expect.objectContaining({
      backfill: expect.objectContaining({ cursor: 'old-3', cutoff: saved.backfill.cutoff }),
    }));
  });
  it('ends historical work at its fixed cutoff and keeps fresh intake on later runs', async () => {
    (readGrandirFeed as jest.Mock).mockResolvedValue([{ ...notice, createdDate: '2026-01-01T12:00:00Z' }]);
    await syncGrandirIntake('family');
    const saved = savedSession();
    expect(saved.backfill.completed).toBe(true);
    mockConnection(saved, 20);
    (readGrandirFeed as jest.Mock).mockReset().mockResolvedValueOnce([notice]).mockResolvedValue([]);
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 1 });
    expect(readGrandirFeed).toHaveBeenCalledTimes(2);
  });
  it('does not advance the saved cursor if any notice fails to save', async () => {
    (ingestCalendarEmailPayload as jest.Mock).mockResolvedValue({ statusCode: 500, body: {} });
    await expect(syncGrandirIntake('family')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(savedSession().backfill.cursor).toBeNull();
  });
  it('bounds generated-only history while still advancing its cursor', async () => {
    let calls = 0;
    (readGrandirFeed as jest.Mock).mockImplementation(async () => [{ ...notice,
      feedItemId: `care-${calls++}`, generated: true }]);
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 0 });
    expect(readGrandirFeed).toHaveBeenCalledTimes(4);
    expect(savedSession().backfill.cursor).toBe('care-3');
  });
  it('does not advance past invalid provider dates', async () => {
    (readGrandirFeed as jest.Mock).mockResolvedValue([{ ...notice, createdDate: 'invalid' }]);
    await expect(syncGrandirIntake('family')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(ingestCalendarEmailPayload).not.toHaveBeenCalled();
    expect(savedSession().backfill.cursor).toBeNull();
  });
  it('does not skip unconsumed posts when a page exceeds the notice budget', async () => {
    const items = Array.from({ length: 150 }, (_, i) => ({ ...notice, feedItemId: `large-${i}` }));
    (readGrandirFeed as jest.Mock).mockResolvedValue(items);
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 40 });
    expect(savedSession().backfill.cursor).toBe('large-39');
  });
  it('limits independent fresh and historical lanes to 40 notices each', async () => {
    mockConnection({ ...session, backfill: { cutoff: '2026-07-09T12:00:00.000Z',
      cursor: 'history-start', olderThan: '2026-09-01T12:00:00.000Z', completed: false } });
    (readGrandirFeed as jest.Mock).mockImplementation(async (_token, cursor) =>
      Array.from({ length: 100 }, (_, i) => ({ ...notice,
        feedItemId: `${cursor ? 'history' : 'fresh'}-${i}` })));
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 80 });
    expect(readGrandirFeed).toHaveBeenCalledTimes(2);
    expect(savedSession().backfill.cursor).toBe('history-39');
  });
  it('stops before another provider request when its eight-second timeout would exceed the work deadline', async () => {
    (readGrandirIdentity as jest.Mock).mockImplementation(async () => {
      jest.setSystemTime(Date.now() + 28_000); return {};
    });
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 0 });
    expect(readGrandirFeed).not.toHaveBeenCalled();
    expect(savedSession().nextSyncLane).toBe('historical');
  });
  it('does not ingest or advance a cursor if the lookup uses the remaining work budget', async () => {
    mockConnection({ ...session, nextSyncLane: 'historical' });
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockImplementation(async () => {
      jest.setSystemTime(Date.now() + 35_000); return null;
    });
    await syncGrandirIntake('family');
    expect(ingestCalendarEmailPayload).not.toHaveBeenCalled();
    expect(savedSession().backfill.cursor).toBeNull();
    expect(savedSession().backfill.completed).toBe(false);
  });
  it('checkpoints only consumed notices at deadline and resumes at the next item', async () => {
    mockConnection({ ...session, nextSyncLane: 'historical' });
    const items = Array.from({ length: 3 }, (_, i) => ({ ...notice, feedItemId: `timed-${i}` }));
    (readGrandirFeed as jest.Mock).mockImplementation(async (_token, cursor) =>
      cursor ? items.slice(Number(cursor.split('-')[1]) + 1) : items);
    (ingestCalendarEmailPayload as jest.Mock).mockImplementation(async () => {
      jest.setSystemTime(Date.now() + 18_000); return { statusCode: 200, body: {} };
    });
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 2 });
    const saved = savedSession();
    expect(saved.backfill).toMatchObject({ cursor: 'timed-1', completed: false });
    mockConnection({ ...saved, nextSyncLane: 'historical' }, 50);
    (readGrandirFeed as jest.Mock).mockClear();
    (ingestCalendarEmailPayload as jest.Mock).mockResolvedValue({ statusCode: 200, body: {} });
    await syncGrandirIntake('family');
    expect(readGrandirFeed).toHaveBeenNthCalledWith(1, 'opaque-test-session', 'timed-1', new Date(notice.createdDate).toISOString());
    expect(savedSession().backfill.completed).toBe(true);
  });
  it('alternates first lane across deadline-limited runs to avoid starvation', async () => {
    const old = { ...notice, feedItemId: 'old', createdDate: '2026-08-01T12:00:00Z' };
    mockConnection({ ...session, backfill: { cutoff: '2026-07-09T12:00:00.000Z',
      cursor: 'previous', olderThan: '2026-08-02T12:00:00.000Z', completed: false } });
    (readGrandirFeed as jest.Mock).mockImplementation(async (_token, cursor) => cursor ? [old] : [notice]);
    (ingestCalendarEmailPayload as jest.Mock).mockImplementation(async () => {
      jest.setSystemTime(Date.now() + 35_000); return { statusCode: 200, body: {} };
    });
    await syncGrandirIntake('family');
    expect(savedSession().nextSyncLane).toBe('historical');
    (readGrandirFeed as jest.Mock).mockClear();
    await syncGrandirIntake('family');
    expect(readGrandirFeed).toHaveBeenNthCalledWith(1, 'opaque-test-session', 'previous', '2026-08-02T12:00:00.000Z');
    expect(savedSession().backfill.cursor).toBe('old');
    expect(savedSession().nextSyncLane).toBe('fresh');
  });
  it('retains successful batch progress when a later notice fails, without skipping the failed item', async () => {
    mockConnection({ ...session, nextSyncLane: 'historical' });
    const items = Array.from({ length: 8 }, (_, i) => ({ ...notice, feedItemId: `batch-${i}` }));
    (readGrandirFeed as jest.Mock).mockResolvedValue(items);
    let calls = 0;
    (ingestCalendarEmailPayload as jest.Mock).mockImplementation(async () => ({
      statusCode: ++calls === 7 ? 500 : 200, body: {},
    }));
    await expect(syncGrandirIntake('family')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect((updateGrandirSession as jest.Mock).mock.calls.some(call => call[2].backfill?.cursor === 'batch-4')).toBe(true);
    expect(savedSession().backfill.cursor).toBe('batch-5');
    expect(savedSession().backfill.completed).toBe(false);
    expect(savedSession()).not.toHaveProperty('lastSyncAt');
    (readGrandirFeed as jest.Mock).mockImplementation(async (_token, cursor) =>
      cursor ? items.slice(Number(cursor.split('-')[1]) + 1) : []);
    (ingestCalendarEmailPayload as jest.Mock).mockResolvedValue({ statusCode: 200, body: {} });
    expect(await syncGrandirIntake('family')).toMatchObject({ processed: 2 });
    expect(savedSession().backfill.cursor).toBe('batch-7');
  });
  it('keeps prior checkpoint progress when a later provider page fails', async () => {
    mockConnection({ ...session, nextSyncLane: 'historical' });
    (readGrandirFeed as jest.Mock).mockResolvedValueOnce([notice]).mockRejectedValueOnce(new Error('provider down'));
    await expect(syncGrandirIntake('family')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(savedSession().backfill.cursor).toBe(notice.feedItemId);
    expect(savedSession().enabled).toBe(true);
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
    expect(updateGrandirSession).toHaveBeenCalledWith('family', expect.any(Number), expect.objectContaining({ lastError: 'NOTICE_CHANGED' }));
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
    expect(updateGrandirSession).toHaveBeenCalledWith('family', expect.any(Number), expect.objectContaining({ enabled: true, lastError: 'SYNC_FAILED' }));
    expect(updateGrandirSession).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ lastSyncAt: expect.anything() }));
  });
});
