import { neonAuthMiddleware } from '@neondatabase/neon-js/auth/next/server';
import { NextResponse, type NextRequest } from 'next/server';

const authMiddleware = process.env.NEON_AUTH_BASE_URL && process.env.NEXT_PUBLIC_E2E !== 'true'
  ? neonAuthMiddleware({ loginUrl: '/auth/sign-in' })
  : (_request: NextRequest) => NextResponse.next();

export async function middleware(request: NextRequest) {
  // The Neon SDK bundles a different Next.js type version, while both middleware
  // implementations receive the same runtime request object from Next.js.
  return authMiddleware(request as never);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)",
  ],
};
