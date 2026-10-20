import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BinCollectionStrip } from '@/components/calendar/BinCollectionStrip';

describe('BinCollectionStrip', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'connected',
        checkedAt: new Date().toISOString(),
        providerName: 'Bromley Council',
        sourceUrl: 'https://recyclingservices.bromley.gov.uk/',
        collections: [
          { date: '2099-10-21', services: ['Food waste', 'Paper and cardboard'] },
          { date: '2099-10-28', services: ['Garden waste'] },
        ],
      }),
    } as Response);
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('keeps details out of the calendar surface until hover, focus or tap', async () => {
    render(<BinCollectionStrip familyId="family" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Next bins/ })).toBeVisible());
    expect(screen.queryByRole('dialog', { name: 'Bin collection details' })).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('region', { name: 'Bin collections' }));
    expect(screen.getByRole('dialog', { name: 'Bin collection details' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close bin collection details' }));
    expect(screen.queryByRole('dialog', { name: 'Bin collection details' })).not.toBeInTheDocument();
  });
});
