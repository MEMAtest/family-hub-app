import { z } from 'zod';

export const GRANDIR_ORIGIN = 'https://www.app.grandiruk.com';
const TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 2_000_000;

export class GrandirConnectionError extends Error {
  constructor(public code: 'RECONNECT_REQUIRED' | 'VERIFICATION_REQUIRED' | 'ACCOUNT_MISMATCH' | 'CHILD_NOT_VERIFIED' | 'PROVIDER_UNAVAILABLE' | 'NOT_CONFIGURED', message: string) {
    super(message);
  }
}

const identitySchema = z.object({
  loginId: z.string().min(1), email: z.string().email(), impersonated: z.boolean().optional(),
  roles2: z.array(z.object({ targetId: z.string().min(1), targetType: z.string(), sourceType: z.string(),
    title: z.string(), subtitle: z.string() })).max(50),
});
export type GrandirIdentity = z.infer<typeof identitySchema>;

const feedItemSchema = z.object({
  feedItemId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), body: z.string().max(100_000),
  createdDate: z.string(), generated: z.boolean(),
  sender: z.object({ name: z.string().max(200), subtitle: z.string().optional() }),
  files: z.array(z.unknown()).optional(),
});
export type GrandirFeedItem = z.infer<typeof feedItemSchema>;

export const grandirPostUrl = (id: string) => {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error('Invalid Grandir post');
  return `${GRANDIR_ORIGIN}/#/account/post/${id}`;
};

// Fixed-origin, GET-only provider access. Never follow redirects carrying a parent token.
async function request(path: '/api/me/me/me' | '/api/feed/feed/feed' | '/api/v2/calendar' | '/graphql', token?: string,
  query?: Record<string, string>, loginBody?: { query: string; variables: { email: string; password: string } }) {
  const url = new URL(path, GRANDIR_ORIGIN);
  for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, value);
  let response: Response;
  try {
    response = await fetch(url, { method: loginBody ? 'POST' : 'GET', redirect: 'error', cache: 'no-store',
      headers: { Accept: 'application/json', ...(token ? { 'x-famly-accesstoken': token } : {}),
        ...(loginBody ? { 'Content-Type': 'application/json' } : {}) },
      ...(loginBody ? { body: JSON.stringify(loginBody) } : {}), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'Grandir could not be reached. Your connection has not been removed.');
  }
  if ([401, 403].includes(response.status)) throw new GrandirConnectionError('RECONNECT_REQUIRED', 'Grandir needs reconnection. Sign in again.');
  if (!response.ok) throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'Grandir is temporarily unavailable. Try again later.');
  const reader = response.body?.getReader();
  if (!reader) throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'Grandir returned an unreadable response.');
  const parts: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error('Response too large'); }
      parts.push(value);
    }
    return JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown;
  } catch {
    throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'Grandir returned an unreadable response.');
  }
}

export async function readGrandirIdentity(token: string): Promise<GrandirIdentity> {
  const parsed = identitySchema.safeParse(await request('/api/me/me/me', token));
  if (!parsed.success) throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'Grandir account details could not be verified.');
  return parsed.data;
}

export async function readGrandirFeed(token: string, cursor?: string, olderThan?: string): Promise<GrandirFeedItem[]> {
  const response = await request('/api/feed/feed/feed', token, { heightTarget: '3500', ...(cursor ? { cursor } : {}),
    ...(olderThan ? { olderThan } : {}) });
  const parsed = z.object({ feedItems: z.array(feedItemSchema).max(200) }).safeParse(response);
  if (!parsed.success) throw new GrandirConnectionError('PROVIDER_UNAVAILABLE', 'Grandir notices could not be verified.');
  return parsed.data.feedItems;
}

export async function authenticateGrandir(email: string, password: string): Promise<string> {
  const query = `mutation Authenticate($email: EmailAddress!, $password: Password!) {
    me { authenticateWithPassword(email: $email, password: $password) {
      __typename ... on AuthenticationSucceeded { accessToken }
    } }
  }`;
  const result = z.object({ data: z.object({ me: z.object({ authenticateWithPassword: z.object({
    __typename: z.string(), accessToken: z.string().min(1).max(4096).optional(),
  }) }) }).optional() }).safeParse(await request('/graphql', undefined, undefined, { query, variables: { email, password } }));
  const auth = result.success ? result.data.data?.me.authenticateWithPassword : undefined;
  if (auth?.__typename === 'AuthenticationSucceeded' && auth.accessToken) return auth.accessToken;
  if (auth?.__typename === 'AuthenticationChallenged') {
    throw new GrandirConnectionError('VERIFICATION_REQUIRED', 'Grandir requires additional verification. Complete it in the official parent portal; no verification is bypassed.');
  }
  throw new GrandirConnectionError('RECONNECT_REQUIRED', 'Grandir could not verify that sign-in. Check your parent account details.');
}
