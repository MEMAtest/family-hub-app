import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AIEnhancedField from '../AIEnhancedField';

describe('AIEnhancedField summaries', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('shows a concise summary suggestion and keeps the source until the user applies it', async () => {
    const onChange = jest.fn();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enhanced: '- Purpose: Parent workshop introducing Teachscribe.\n- Details: Sign in at the school office.' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const source = 'A long school newsletter with several unrelated updates and the workshop details.';

    render(
      <AIEnhancedField
        value={source}
        onChange={onChange}
        context="Calendar event description"
        mode="summarize"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Summarise with AI' }));

    expect(await screen.findByText(/Purpose: Parent workshop/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/ai/text-enhance', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"mode":"summarize"'),
    }));
    expect(onChange).not.toHaveBeenCalled();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(source);

    fireEvent.click(screen.getByRole('button', { name: 'Use summary' }));
    expect(onChange).toHaveBeenCalledWith('- Purpose: Parent workshop introducing Teachscribe.\n- Details: Sign in at the school office.');
  });

  it('shows the provider error instead of silently returning cleaned source text', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'AI summary failed. Please try again.' }),
    }) as unknown as typeof fetch;

    render(
      <AIEnhancedField
        value="Long source email"
        onChange={jest.fn()}
        context="Calendar event description"
        mode="summarize"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Summarise with AI' }));
    expect(await screen.findByText('AI summary failed. Please try again.')).toBeInTheDocument();
  });
});
