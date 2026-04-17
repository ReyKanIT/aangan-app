import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/feed',
  '/family',
  '/events',
  '/settings',
  '/messages',
  '/notifications',
  '/kuldevi',
  '/chatbot',
  '/admin',
];

// Routes that should redirect to /feed if already authenticated
const AUTH_ROUTES = ['/login', '/otp'];

// Public routes — no auth check needed
const PUBLIC_ROUTES = [
  '/',
  '/terms',
  '/terms-of-service',
  '/privacy',
  '/privacy-policy',
  '/panchang',
  '/festivals',
  '/demo',
  '/upload',
  '/auth/callback',
  '/api',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes and static assets
  if (
    PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Create Supabase client for middleware
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is on a protected route and not logged in → redirect to login
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is on auth route and already logged in → redirect to feed
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip middleware entirely (no @supabase/ssr bundle cost, no TTFB hit)
     * for:
     *   - static assets (_next/*, icons, sitemap, robots)
     *   - /api/* (API routes handle their own auth)
     *   - /auth/callback (OAuth exchange has its own flow)
     *   - /upload/* (guest photo upload, no auth required)
     *   - public SEO landing pages (panchang, festivals, demo, privacy,
     *     terms, invite, tithi-reminders, support)
     *
     * Middleware still runs on: /, /feed, /family, /settings, /messages,
     * /notifications, /kuldevi, /chatbot, /admin, /login, /otp,
     * /profile-setup, /auth/* (other than /auth/callback). These are the
     * paths that actually need session enforcement.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|og-image|apple-touch-icon|robots.txt|sitemap.xml|api/|auth/callback|upload/|panchang|festivals|demo|privacy|terms|invite|tithi-reminders|support).*)',
  ],
};
