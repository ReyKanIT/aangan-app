import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Provider returned an error (user denied, state mismatch, etc.)
  if (errorParam) {
    const target = new URL('/login', request.url);
    target.searchParams.set('error', 'auth_failed');
    if (errorDescription) target.searchParams.set('reason', errorDescription.slice(0, 120));
    return NextResponse.redirect(target);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }

  let redirectPath = '/feed';

  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // PKCE failure (invalid code, expired code, state mismatch) — don't
    // silently redirect to /feed; middleware will bounce the user back to
    // /login with no context. Surface a real error instead.
    if (error || !data.session?.user) {
      const target = new URL('/login', request.url);
      target.searchParams.set('error', 'auth_failed');
      if (error?.message) target.searchParams.set('reason', error.message.slice(0, 120));
      return NextResponse.redirect(target);
    }

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', data.session.user.id)
      .single();

    // PGRST116 = no row found (new user). Any other error is a real failure;
    // send the user through profile-setup so they don't land on a broken feed.
    if (profileErr && profileErr.code !== 'PGRST116') {
      redirectPath = '/profile-setup';
    } else if (!profile || !profile.display_name || profile.display_name === '') {
      redirectPath = '/profile-setup';
    }
  } catch (err) {
    console.error('[auth/callback] unexpected error:', err);
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
