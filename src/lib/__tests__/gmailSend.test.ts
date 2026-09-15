import { buildMimeMessage, toRawMessage } from '@/lib/gmailSend';

const decodePart = (mime: string, contentType: string) => {
  const section = mime.split(/--fh_[^\r\n]+/).find((part) => part.includes(contentType));
  if (!section) throw new Error(`no ${contentType} part`);
  const body = section.split('\r\n\r\n').slice(1).join('\r\n\r\n').trim();
  return Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8');
};

describe('the message Gmail is asked to send', () => {
  const base = {
    from: 'someone@gmail.com',
    to: 'other@gmail.com',
    subject: 'My Family this week',
    html: '<p>Swimming lesson</p>',
    text: 'Swimming lesson',
  };

  it('sends from the connected account', () => {
    // The display name is supplied by the caller; the builder stays literal.
    expect(buildMimeMessage(base)).toContain('From: someone@gmail.com');
    expect(buildMimeMessage({ ...base, fromName: 'Family Hub' }))
      .toContain('From: Family Hub <someone@gmail.com>');
  });

  it('offers both a plain text and an HTML body', () => {
    const mime = buildMimeMessage(base);
    expect(mime).toContain('Content-Type: multipart/alternative');
    expect(decodePart(mime, 'text/plain')).toBe('Swimming lesson');
    expect(decodePart(mime, 'text/html')).toBe('<p>Swimming lesson</p>');
  });

  it('survives a subject that is not plain ASCII', () => {
    // A household called "Fahréd" should not arrive as mojibake.
    const mime = buildMimeMessage({ ...base, subject: 'Fahréd this week: 3 things on' });
    expect(mime).toContain('Subject: =?UTF-8?B?');
    const encoded = mime.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)![1];
    expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe('Fahréd this week: 3 things on');
  });

  it('leaves an ASCII subject readable rather than needlessly encoding it', () => {
    expect(buildMimeMessage(base)).toContain('Subject: My Family this week');
  });

  it('keeps base64 lines within what SMTP accepts', () => {
    const mime = buildMimeMessage({ ...base, text: 'x'.repeat(5_000) });
    const longest = Math.max(...mime.split('\r\n').map((line) => line.length));
    expect(longest).toBeLessThanOrEqual(78);
  });

  it('encodes the raw message base64url without padding', () => {
    const raw = toRawMessage(buildMimeMessage(base));
    expect(raw).not.toMatch(/[+/=]/);
    expect(Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).toContain('From: someone@gmail.com');
  });

  it('round-trips a body containing characters base64url would otherwise mangle', () => {
    const raw = toRawMessage(buildMimeMessage({ ...base, html: '<p>Cost: £57.50 — busiest Tuesday</p>' }));
    const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    expect(decodePart(decoded, 'text/html')).toBe('<p>Cost: £57.50 — busiest Tuesday</p>');
  });
});
