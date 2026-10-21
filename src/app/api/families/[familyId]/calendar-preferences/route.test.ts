/** @jest-environment node */
import { NextRequest } from 'next/server';
import { emptyCalendarPreferences } from '@/lib/calendarPreferences';
const db = { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() };
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { familyDocument: db } }));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: any) => (req: any, ctx: any) => handler(req, ctx, { familyMemberId: 'signed-in-parent' }) }));
import { GET, PUT } from './route';
const context = { params: Promise.resolve({ familyId: 'household' }) };
const put = (body: unknown) => PUT(new NextRequest('http://localhost/api/families/household/calendar-preferences', { method: 'PUT', body: JSON.stringify(body) }), context);
beforeEach(() => jest.clearAllMocks());

test('loads only the signed-in parent choices and defaults for a new parent', async () => {
  db.findUnique.mockResolvedValue(null);
  const response = await GET(new NextRequest('http://localhost/'), context);
  expect(await response.json()).toEqual({ ...emptyCalendarPreferences(), memberId: 'signed-in-parent' });
  expect(db.findUnique).toHaveBeenCalledWith({ where: { familyId_key: { familyId: 'household', key: 'calendar.preferences:signed-in-parent' } } });
});
test('rejects attempts to choose another recipient', async () => {
  expect((await put({ action: 'hide', occurrenceId: 'event:2026-10-21', personId: 'other-parent' })).status).toBe(400);
  expect(db.create).not.toHaveBeenCalled();
});
test('retries a concurrent change without losing another dismissal', async () => {
  db.findUnique.mockResolvedValueOnce({ version: 1, data: emptyCalendarPreferences() })
    .mockResolvedValueOnce({ version: 2, data: { ...emptyCalendarPreferences(), hiddenUpcoming: ['other:2026-10-22'] } });
  db.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
  const response = await put({ action: 'hide', occurrenceId: 'event:2026-10-21' });
  expect(response.status).toBe(200);
  expect((await response.json()).hiddenUpcoming).toEqual(['other:2026-10-22', 'event:2026-10-21']);
});
test('restoring one occurrence preserves other occurrences and accepted overlaps', async () => {
  db.findUnique.mockResolvedValue({ version: 3, data: { hiddenUpcoming: ['e:2026-10-21', 'e:2026-10-28'], acceptedOverlaps: ['pair:2026-10-22'], lastPlace: null } });
  db.updateMany.mockResolvedValue({ count: 1 });
  const response = await put({ action: 'restore', occurrenceId: 'e:2026-10-21' });
  expect(await response.json()).toEqual({ hiddenUpcoming: ['e:2026-10-28'], acceptedOverlaps: ['pair:2026-10-22'], lastPlace: null, memberId: 'signed-in-parent' });
});
