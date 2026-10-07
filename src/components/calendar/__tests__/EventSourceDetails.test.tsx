import React from 'react';
import { render, screen } from '@testing-library/react';
import EventSourceDetails from '../EventSourceDetails';
jest.mock('@/store/familyStore', () => ({ useFamilyStore: (selector: any) => selector({ people: [], databaseStatus: { familyId: 'family' } }) }));
const people = [{ id: 'amari', name: 'Amari', role: 'Child' }, { id: 'askia', name: 'Askia', role: 'Child' }, { id: 'parent', name: 'Ademola', role: 'Parent' }];
const source = { institution: 'Stewart Fleming Primary School', sender: 'school@example.test', subject: 'PTA AGM',
  receivedAt: '2026-10-06T20:00:00Z', originalText: 'Original school text', messageUrl: null,
  schoolAssignment: { concernedMemberIds: ['amari'], attendeePersonId: null as string | null, attendeeStatus: 'needs_confirmation' } };
describe('school provenance concern versus attendee', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  it('shows the source child concern and unconfirmed attendance as distinct labels', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ source }) });
    render(<EventSourceDetails familyId="family" eventId="legacy-pta" people={people} />);
    expect(await screen.findByText('Concerns: Amari')).toBeVisible();
    expect(screen.getByText('Attendee to confirm')).toBeVisible();
    expect(screen.queryByText(/Attendee: Askia/)).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('/api/families/family/events/legacy-pta/source', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
  it('shows explicit adult attendance without changing the concerned child', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ source: { ...source,
      schoolAssignment: { ...source.schoolAssignment, attendeePersonId: 'parent', attendeeStatus: 'confirmed' } } }) });
    render(<EventSourceDetails familyId="family" eventId="manual-pta" people={people} />);
    expect(await screen.findByText('Attendee: Ademola')).toBeVisible();
    expect(screen.getByText('Concerns: Amari')).toBeVisible();
  });
});
