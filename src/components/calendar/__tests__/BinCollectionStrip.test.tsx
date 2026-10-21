import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BinCollectionStrip } from '@/components/calendar/BinCollectionStrip';

describe('BinCollectionStrip', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-20T23:30:00Z'));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'connected',
        checkedAt: new Date().toISOString(),
        providerName: 'Bromley Council',
        sourceUrl: 'https://recyclingservices.bromley.gov.uk/',
        collections: [
          { date: '2026-10-22', services: ['Food waste', 'Paper and cardboard'] },
          { date: '2026-10-28', services: ['Garden waste'] },
        ],
      }),
    } as Response);
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('keeps details out of the calendar surface until hover, focus or tap', async () => {
    render(<BinCollectionStrip familyId="family" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Bins tonight/ })).toBeVisible());
    expect(screen.queryByRole('dialog', { name: 'Bin collection details' })).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('region', { name: 'Bin collections' }));
    expect(screen.getByRole('dialog', { name: 'Bin collection details' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close bin collection details' }));
    expect(screen.queryByRole('dialog', { name: 'Bin collection details' })).not.toBeInTheDocument();
  });

  it('shows collection today using the London date even before UTC midnight', async () => {
    jest.setSystemTime(new Date('2026-10-21T23:30:00Z'));
    render(<BinCollectionStrip familyId="family" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Bins today/ })).toBeVisible());
    fireEvent.focus(screen.getByRole('button', { name: /Bins today/ }));
    expect(screen.getByText(/Collection is today/)).toBeVisible();
    expect(screen.queryByText(/Following:/)).not.toBeInTheDocument();
  });

  it('does not show a strip for later collections', async () => {
    jest.setSystemTime(new Date('2026-10-19T12:00:00Z'));
    const synced = jest.fn().mockResolvedValue(undefined);
    render(<BinCollectionStrip familyId="family" onSynced={synced} />);
    await waitFor(() => expect(synced).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: 'Bin collections' })).not.toBeInTheDocument();
  });

  it('removes the strip after collection day ends in London', async () => {
    jest.setSystemTime(new Date('2026-10-22T22:59:30Z'));
    const synced = jest.fn().mockResolvedValue(undefined);
    render(<BinCollectionStrip familyId="family" onSynced={synced} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Bins today/ })).toBeVisible());
    await act(async () => { jest.advanceTimersByTime(60_000); });
    await waitFor(() => expect(synced).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('region', { name: 'Bin collections' })).not.toBeInTheDocument();
  });
});
