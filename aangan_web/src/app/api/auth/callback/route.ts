import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  let redirectPath = '/feed';

  if (code) {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', data.session.user.id)
        .single();

      if (!profile || !profile.display_name || profile.display_name === '') {
        redirectPath = '/profile-setup';
      }
    }
  }

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
