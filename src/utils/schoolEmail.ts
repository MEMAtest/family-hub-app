export const STEWART_FLEMING_EMAIL_DOMAIN = 'stewartfleming.bromley.sch.uk';

export type EmailHeader = { name?: string | null; value?: string | null };

const senderEmailFromHeader = (value: string) => {
  const bracketed = value.match(/<([^>]+)>/)?.[1];
  const email = bracketed || value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  return email.trim().toLowerCase();
};

export const isStewartFlemingSender = (value: string) =>
  senderEmailFromHeader(value).endsWith(`@${STEWART_FLEMING_EMAIL_DOMAIN}`);

export const isExpectedGmailAccount = (actual: string | null | undefined, expected: string | null | undefined) =>
  !expected?.trim() || actual?.trim().toLowerCase() === expected.trim().toLowerCase();

export const hasAuthenticatedStewartFlemingSender = (headers: EmailHeader[] = []) => {
  const domain = STEWART_FLEMING_EMAIL_DOMAIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Only the receiver's leading result is eligible; later Authentication-Results can be sender-supplied.
  const firstAuthenticationResults = headers
    .filter((header) => header.name?.toLowerCase() === 'authentication-results')
    .map((header) => header.value || '')[0];
  if (!firstAuthenticationResults || !/^mx\.google\.com(?:\s|;)/i.test(firstAuthenticationResults.trim())) return false;
  return new RegExp(`\\bdmarc=pass\\b[^;\\n]*\\bheader\\.from=${domain}(?:\\s|;|$)`, 'i')
    .test(firstAuthenticationResults);
};
