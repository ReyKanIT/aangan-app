import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes that require an authenticated session.
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

// Auth flow routes — redirect away if already signed in (except /profile-setup
// which is itself a step of the auth flow that the user must complete).
const AUTH_ROUTES = ['/login', '/otp'];

// Routes always reachable without a session.
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
  '/invite',
  '/join',
  '/tithi-reminders',
  '/support',
  '/auth/callback',
  '/api',
];

function matchesPrefix(pathname: string, routes: readonly string[]): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Short-circuit: public routes and any path with a file extension never
  // touch the Supabase SSR bundle (saves ~50ms TTFB).
  if (
    matchesPrefix(pathname, PUBLIC_ROUTES) ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = matchesPrefix(pathname, PROTECTED_ROUTES);
  const isAuthRoute = matchesPrefix(pathname, AUTH_ROUTES);

  // Unauthenticated → bounce to /login, preserve target via ?redirect=.
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting /login or /otp → send them home.
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }

  // Server-side profile-completeness check.
  // A user can sign up via phone OTP, get a row in public.users where
  // display_name == phone_number (the default), and then deep-link straight
  // into /feed before completing /profile-setup. The (app)/layout.tsx hook
  // catches this client-side, but only AFTER the page payload has been
  // fetched — meaning RLS-protected data may already be in the browser's
  // network tab. Block the request here.
  if (isProtected && user && pathname !== '/profile-setup') {
    const { data: profile } = await supabase
      .from('users')
      .select('display_name, phone_number')
      .eq('id', user.id)
      .single();

    const incomplete =
      !profile ||
      !profile.display_name ||
      profile.display_name === profile.phone_number;

    if (incomplete) {
      return NextResponse.redirect(new URL('/profile-setup', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip middleware entirely (no @supabase/ssr bundle cost, no TTFB hit) for:
     *   - static assets (_next/*, manifest, icons, sitemap, robots, og)
     *   - /api/* (API routes handle their own auth)
     *   - /auth/callback (OAuth/PKCE has its own server route)
     *   - /upload/* (guest event-photo upload)
     *   - public SEO landing pages (panchang, festivals, demo, privacy,
     *     terms, invite, tithi-reminders, support)
     *
     * Middleware runs on: /, /feed, /family, /events, /settings, /messages,
     * /notifications, /kuldevi, /chatbot, /admin, /login, /otp,
     * /profile-setup, /auth/* (other than /auth/callback). These are the
     * paths that need session enforcement.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|og-image|apple-touch-icon|robots.txt|sitemap.xml|api/|auth/callback|upload/|panchang|festivals|demo|privacy|terms|invite|join/|tithi-reminders|support).*)',
  ],
};
