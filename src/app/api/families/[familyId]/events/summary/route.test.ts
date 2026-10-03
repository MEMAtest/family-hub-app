jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { calendarEvent: { findFirst: jest.fn() } },
}));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/services/aiService', () => ({ aiService: { summarizeCalendarEvent: jest.fn() } }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));

import prisma from '@/lib/prisma';
import { aiService } from '@/services/aiService';
import { POST } from './route';

const makeRequest = (body: Record<string, unknown>) => ({ json: async () => body }) as any;
const makeContext = () => ({ params: Promise.resolve({ familyId: 'family-id' }) }) as any;

describe('calendar event AI summary', () => {
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-key';
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterAll(() => {
    if (originalOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
    if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
  });

  it('summarises only an event scoped to the requested family', async () => {
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue({
      id: 'event-id', eventDate: new Date('2026-10-02T00:00:00Z'), title: 'Parents workshop',
      notes: 'Bring reading record. Sign in at school office.', location: 'School hall', person: { name: 'Amari' },
      eventTime: new Date('2026-10-02T09:00:00Z'), durationMinutes: 60,
      personId: 'amari', recurringPattern: 'none', exceptions: [],
    });
    (aiService.summarizeCalendarEvent as jest.Mock).mockResolvedValue('A parent workshop at school; bring the reading record and sign in at the office.');

    const result = await (POST as any)(makeRequest({ eventId: 'event-id' }), makeContext());

    expect(result.status).toBe(200);
    expect(result.body.summary).toMatch(/reading record/i);
    expect(prisma.calendarEvent.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'event-id', familyId: 'family-id' },
    }));
    expect(aiService.summarizeCalendarEvent).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Parents workshop', personName: 'Amari', location: 'School hall',
    }));
  });

  it('does not call the AI provider for an event outside the family', async () => {
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await (POST as any)(makeRequest({ eventId: 'foreign-event' }), makeContext());
    expect(result.status).toBe(404);
    expect(aiService.summarizeCalendarEvent).not.toHaveBeenCalled();
  });

  it('summarises the requested occurrence rather than the original series date', async () => {
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue({
      id: 'event-id', eventDate: new Date('2026-09-25T00:00:00Z'),
      eventTime: new Date('2026-09-25T09:00:00Z'), durationMinutes: 60,
      title: 'Workshop', personId: 'amari', person: { name: 'Amari' },
      recurringPattern: 'weekly', isRecurring: true, exceptions: [],
    });
    (aiService.summarizeCalendarEvent as jest.Mock).mockResolvedValue('Purpose: Workshop.');
    const result = await (POST as any)(makeRequest({ eventId: 'event-id', occurrenceDate: '2026-10-02' }), makeContext());
    expect(result.status).toBe(200);
    expect(aiService.summarizeCalendarEvent).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-10-02' }));
  });

  it('rejects dates outside the recurring series without calling AI', async () => {
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue({
      id: 'event-id', eventDate: new Date('2026-09-25T00:00:00Z'),
      eventTime: new Date('2026-09-25T09:00:00Z'), durationMinutes: 60,
      title: 'Workshop', personId: 'amari', recurringPattern: 'weekly', isRecurring: true, exceptions: [],
    });
    const result = await (POST as any)(makeRequest({ eventId: 'event-id', occurrenceDate: '2026-10-03' }), makeContext());
    expect(result.status).toBe(400);
    expect(aiService.summarizeCalendarEvent).not.toHaveBeenCalled();
  });
});
