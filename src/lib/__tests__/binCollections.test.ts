/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  familyDocument: { findUnique: jest.fn(), upsert: jest.fn() },
  familyMember: { findMany: jest.fn() },
  calendarEvent: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  $transaction: jest.fn(),
} }));
import prisma from '@/lib/prisma';
import { syncBinCollections } from '@/lib/binCollections';
import { BIN_SOURCE } from '@/lib/binCalendar';

const now = new Date('2026-10-08T19:00:00Z');
const ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:food\r\nDTSTART;VALUE=DATE:20261009\r\nSUMMARY:Food Waste collection\r\nEND:VEVENT\r\nEND:VCALENDAR';
const originalFetch = global.fetch;
beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn().mockImplementation(async () => ({ ok: true, body: { getReader: () => {
    let sent = false;
    return { read: async () => sent ? { done: true } : (sent = true, { done: false, value: Buffer.from(ics) }), cancel: jest.fn() };
  } } }));
  (prisma.familyDocument.findUnique as jest.Mock).mockImplementation(async ({ where }) =>
    where.familyId_key.key === 'property.profile' ? { data: { address: '21 Tremaine Road, London, SE20 7UA' } } : null);
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'ade', role: 'Parent' }, { id: 'angela', role: 'Parent' }, { id: 'askia', role: 'Child' }]);
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.$transaction as jest.Mock).mockImplementation(async callback => callback(prisma));
});
afterAll(() => { global.fetch = originalFetch; });
it('imports council dates with stable household IDs, unknown time and both parent attendees', async () => {
  const result = await syncBinCollections('family', now);
  expect(result.status).toBe('connected');
  const first = (prisma.calendarEvent.upsert as jest.Mock).mock.calls[0][0];
  expect(first.create).toMatchObject({ familyId: 'family', personId: 'ade', source: BIN_SOURCE,
    metadata: { calendarTiming: { status: 'unknown' }, attendees: ['ade', 'angela'],
      binCollection: { verified: true, services: ['Food waste'], date: '2026-10-09' } } });
  expect(first.create.eventDate.toISOString()).toBe('2026-10-09T00:00:00.000Z');
  await syncBinCollections('family', now);
  expect((prisma.calendarEvent.upsert as jest.Mock).mock.calls[1][0].where).toEqual(first.where);
  expect(global.fetch).toHaveBeenCalledWith('https://recyclingservices.bromley.gov.uk/waste/3670007/calendar.ics', expect.objectContaining({ redirect: 'error' }));
});
it('preserves cancelled status, disabled notifications and manual metadata on refresh', async () => {
  (prisma.calendarEvent.findUnique as jest.Mock).mockResolvedValue({ metadata: { status: 'cancelled', reminderPreferences: { enabled: false }, custom: 'keep' } });
  await syncBinCollections('family', now);
  expect((prisma.calendarEvent.upsert as jest.Mock).mock.calls[0][0].update.metadata).toMatchObject({
    status: 'cancelled', reminderPreferences: { enabled: false }, custom: 'keep' });
});
it('uses a checked cache instead of calling the council on every minute tick', async () => {
  (prisma.familyDocument.findUnique as jest.Mock).mockImplementation(async ({ where }) =>
    where.familyId_key.key === 'property.profile' ? { data: { address: '21 Tremaine Road, SE20 7UA' } } :
      { data: { propertyId: '3670007', status: 'connected', attemptedAt: now.toISOString(), collections: [{ date: '2026-10-09', services: ['Food waste'] }] } });
  expect((await syncBinCollections('family', now)).collections).toHaveLength(1);
  expect(global.fetch).not.toHaveBeenCalled();
  expect(prisma.calendarEvent.upsert).not.toHaveBeenCalled();
});
it('does not use seed addresses or fallback schedules for another household', async () => {
  (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue(null);
  expect((await syncBinCollections('another-family', now)).status).toBe('not_configured');
  expect(global.fetch).not.toHaveBeenCalled();
  expect(prisma.calendarEvent.upsert).not.toHaveBeenCalled();
});
it('fails visibly and holds old reminder schedules without silently guessing', async () => {
  (global.fetch as jest.Mock).mockRejectedValue(new Error('Offline'));
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([{ id: 'bins', metadata: { custom: 'keep', binCollection: { verified: true } } }]);
  expect(await syncBinCollections('family', now)).toMatchObject({ status: 'unavailable', collections: [] });
  expect(prisma.calendarEvent.upsert).not.toHaveBeenCalled();
  expect(prisma.calendarEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
    metadata: { custom: 'keep', binCollection: { verified: false } } } }));
});
