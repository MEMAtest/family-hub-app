import { neonAuthMiddleware } from '@neondatabase/neon-js/auth/next/server';
import { NextResponse, type NextRequest } from 'next/server';

const authMiddleware = process.env.NEON_AUTH_BASE_URL && process.env.NEXT_PUBLIC_E2E !== 'true'
  ? neonAuthMiddleware({ loginUrl: '/auth/sign-in' })
  : (_request: NextRequest) => NextResponse.next();

export async function middleware(request: NextRequest) {
  return authMiddleware(request);
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
