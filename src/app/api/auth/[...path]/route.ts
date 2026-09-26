import { authApiHandler } from '@neondatabase/neon-js/auth/next/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Neon Auth proxies its Google OAuth flow through this route. The provider itself is
// configured in Neon, keeping OAuth credentials out of the application repository.
type AuthMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type AuthContext = { params: Promise<{ path: string[] }> };

const handleAuth = (method: AuthMethod) => async (request: NextRequest, context: AuthContext) => {
  // `authApiHandler()` throws as soon as it is created. Defer it until a request so
  // local builds stay verifiable before the Neon Auth endpoint has been configured.
  if (!process.env.NEON_AUTH_BASE_URL) {
    return NextResponse.json(
      { error: 'Google sign-in has not been configured for this deployment.' },
      { status: 503 }
    );
  }
  return authApiHandler()[method](request, context);
};

export const GET = handleAuth('GET');
export const POST = handleAuth('POST');
export const PUT = handleAuth('PUT');
export const DELETE = handleAuth('DELETE');
export const PATCH = handleAuth('PATCH');
