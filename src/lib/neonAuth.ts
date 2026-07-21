import { neonAuth } from '@neondatabase/neon-js/auth/next/server';

export type SessionIdentity = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export const isNeonAuthConfigured = () => Boolean(process.env.NEON_AUTH_BASE_URL);

export async function getNeonSessionIdentity(): Promise<SessionIdentity | null> {
  if (!isNeonAuthConfigured()) return null;

  const { user } = await neonAuth();
  if (!user?.id || !user.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    image: user.image || null,
  };
}
