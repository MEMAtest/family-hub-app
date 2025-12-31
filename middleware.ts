import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't require authentication
const publicPaths = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/handler",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/icon",
  "/apple-splash",
  "/og-image.png",
  "/icons",
  "/sw.js",
  "/workbox-",
  "/api/families/local/budget/statement-import",
];

// Check if path starts with any public path
function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/families/') && pathname.includes('/budget/statement-import')) {
    return NextResponse.next();
  }

  // Allow public paths without auth check
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for Stack Auth session cookie
  // Stack Auth uses cookies prefixed with "stack-" for session management
  const cookies = request.cookies;
  const hasStackSession = Array.from(cookies.getAll()).some(
    (cookie) => cookie.name.startsWith("stack-") || cookie.name.includes("stack")
  );

  // If no session and trying to access protected route, redirect to sign-in
  if (!hasStackSession && pathname !== "/auth/sign-in") {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
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
