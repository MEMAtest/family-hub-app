import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignInPage from '../page';

const social = jest.fn();
jest.mock('@/lib/neonAuthClient', () => ({
  authClient: { signIn: { get social() { return social; } } },
}));

describe('signing in', () => {
  beforeEach(() => {
    social.mockReset();
    social.mockResolvedValue({ error: null });
    process.env.NEXT_PUBLIC_FAMILY_OWNER_EMAIL = 'owner@example.com';
  });

  it('does not pin Google to the household owner', async () => {
    // The whole household shares one sign-in screen. Passing `loginHint` sent
    // everyone to the owner's Google account, so a second parent could not sign
    // in as herself — which is exactly what happened in production.
    render(<SignInPage />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(social).toHaveBeenCalled());
    const options = social.mock.calls[0][0];
    expect(options.provider).toBe('google');
    expect(options).not.toHaveProperty('loginHint');
    expect(JSON.stringify(options)).not.toContain('owner@example.com');
  });

  it('does not tell everyone to use one particular account', async () => {
    render(<SignInPage />);
    expect(screen.queryByText(/owner@example.com/)).toBeNull();
    expect(screen.queryByText(/main family account/i)).toBeNull();
    expect(screen.getByText(/own Google account/i)).toBeInTheDocument();
  });

  it('surfaces a failure rather than hanging', async () => {
    social.mockResolvedValue({ error: { message: 'Google said no' } });
    render(<SignInPage />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await waitFor(() => expect(screen.getByText('Google said no')).toBeInTheDocument());
  });
});
