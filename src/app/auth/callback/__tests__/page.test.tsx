import { render, screen, waitFor } from '@testing-library/react';
import AuthCallbackPage from '../page';

const mockGetSession = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/lib/neonAuthClient', () => ({
  authClient: { getSession: (...args: unknown[]) => mockGetSession(...args) },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('auth callback', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockReplace.mockReset();
    window.history.pushState({}, '', '/auth/callback?neon_auth_session_verifier=test');
  });

  it('loads the session before opening the protected app', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { id: 'session-1' } } });

    render(<AuthCallbackPage />);

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('shows an actionable error from the provider', async () => {
    window.history.pushState({}, '', '/auth/callback?error=access_denied');

    render(<AuthCallbackPage />);

    expect(await screen.findByText(/access_denied/)).toBeInTheDocument();
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /return to sign-in/i })).toBeInTheDocument();
  });
});
