export class GmailReconnectRequiredError extends Error {
  readonly code = 'GMAIL_RECONNECT_REQUIRED';
  constructor() {
    super('Gmail authorization expired or was revoked. Reconnect Gmail to resume automatic checks.');
    this.name = 'GmailReconnectRequiredError';
  }
}

export const isInvalidGmailGrant = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const provider = error as { message?: string; response?: { data?: { error?: string } } };
  return provider.response?.data?.error === 'invalid_grant' || provider.message === 'invalid_grant';
};
