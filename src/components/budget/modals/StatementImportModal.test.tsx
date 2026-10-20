import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StatementImportModal from './StatementImportModal';

describe('StatementImportModal review workflow', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('previews without writing and commits only reviewed rows', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'account-1', name: 'Virgin' }] })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          success: true,
          warnings: [],
          errors: [],
          metadata: { bank: 'Virgin Money', sourceType: 'csv', startDate: '2026-10-01', endDate: '2026-10-02' },
          preview: { fileName: 'statement.csv', contentHash: 'a'.repeat(64), sourceType: 'csv' },
          transactions: [
            { id: 'one', date: '2026-10-01', description: 'Salary', amount: 1000, direction: 'credit', category: 'Salary', source: 'csv' },
            { id: 'two', date: '2026-10-02', description: 'Coffee', amount: 4, direction: 'debit', category: 'Food & Dining', source: 'csv' },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, ledgerImport: { id: 'import-1', importedRows: 1, duplicateRows: 0 } }) });
    global.fetch = fetchMock as typeof fetch;
    const onImported = jest.fn();

    const { container } = render(<StatementImportModal
      isOpen
      onClose={jest.fn()}
      familyId="family-1"
      existingIncome={[]}
      existingExpenses={[]}
      onImported={onImported}
    />);

    await waitFor(() => expect(screen.getByRole('option', { name: 'Virgin' })).toBeInTheDocument());
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['Date,Description,Amount'], 'statement.csv', { type: 'text/csv' })] } });

    await waitFor(() => expect(screen.getByText('2 transactions found')).toBeVisible());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.body).toBeInstanceOf(FormData);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[checkboxes.length - 1]);
    fireEvent.click(screen.getByRole('button', { name: 'Add reviewed transactions' }));

    await waitFor(() => expect(onImported).toHaveBeenCalled());
    const commit = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(commit).toMatchObject({ action: 'commit', accountId: 'account-1', fileName: 'statement.csv' });
    expect(commit.transactions).toHaveLength(1);
    expect(commit.transactions[0]).toMatchObject({ description: 'Salary', direction: 'credit' });
  });
});
