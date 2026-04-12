'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

async function checkNewUser(userId: string): Promise<boolean> {
  const { data } = await supabase.from('users').select('display_name').eq('id', userId).single();
  if (!data) return true;
  return !data.display_name || data.display_name === '';
}

// Handles Supabase magic-link / OTP / OAuth redirects
export default function AuthCallbackPage() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    async function handleCallback() {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken  = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // Case 1: Token in hash fragment (magic link / implicit flow)
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('Auth callback error:', error.message);
          router.replace('/login?error=auth_failed');
        } else {
          const isNew = data.session?.user ? await checkNewUser(data.session.user.id) : false;
          router.replace(isNew ? '/profile-setup' : '/feed');
        }
        return;
      }

      // Case 2: PKCE code (Google/Apple OAuth)
      const code = hashParams.get('code') || new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('OAuth code exchange error:', error.message);
          router.replace('/login?error=auth_failed');
        } else {
          const isNew = data.session?.user ? await checkNewUser(data.session.user.id) : false;
          router.replace(isNew ? '/profile-setup' : '/feed');
        }
        return;
      }

      // Case 3: No token or code — something went wrong
      router.replace('/login');
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-heading text-2xl text-haldi-gold mb-2">AANGAN</h1>
        <p className="font-body text-brown-light">लॉगिन हो रहे हैं…</p>
        <p className="font-body text-sm text-brown-light opacity-70">Signing you in…</p>
      </div>
    </div>
  );
}
