const send = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
}));

const recipient = { email: 'someone@example.com', name: 'Someone' };

/**
 * The Resend client is built at module load from the key, so the key has to
 * exist before the service is first imported — hence the dynamic import rather
 * than a top-level one, which would be hoisted above the assignment.
 */
const loadService = async () => {
  process.env.RESEND_API_KEY = 'test_key';
  const loaded = await import('@/services/emailService');
  return loaded.emailService;
};

describe('reporting whether an email was actually sent', () => {
  beforeEach(() => send.mockReset());

  it('does not claim success when Resend rejects the message', async () => {
    // `resend.emails.send()` RESOLVES with an error rather than throwing, so a
    // try/catch never notices. This is how a digest was reported as
    // "sent: 1 of 1" while nobody received anything.
    send.mockResolvedValue({
      data: null,
      error: { statusCode: 401, name: 'validation_error', message: 'API key is invalid' },
    });

    const service = await loadService();
    await expect(service.sendRawEmail(recipient, 'subject', '<p>hi</p>', 'hi')).resolves.toBe(false);
  });

  it('does not claim success when nothing comes back with an id', async () => {
    send.mockResolvedValue({ data: null, error: null });
    const service = await loadService();
    await expect(service.sendRawEmail(recipient, 'subject', '<p>hi</p>', 'hi')).resolves.toBe(false);
  });

  it('reports success when the message is genuinely accepted', async () => {
    send.mockResolvedValue({ data: { id: 'msg_123' }, error: null });
    const service = await loadService();
    await expect(service.sendRawEmail(recipient, 'subject', '<p>hi</p>', 'hi')).resolves.toBe(true);
  });

  it('reports failure when the request never reaches Resend', async () => {
    send.mockRejectedValue(new Error('ECONNRESET'));
    const service = await loadService();
    await expect(service.sendRawEmail(recipient, 'subject', '<p>hi</p>', 'hi')).resolves.toBe(false);
  });
});
