'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(async ({ data, error }) => {
          if (error) {
            console.error('Auth callback error:', error.message);
            router.replace('/login?error=auth_failed');
          } else {
            const isNew = data.session?.user ? await checkNewUser(data.session.user.id) : false;
            router.replace(isNew ? '/profile-setup' : '/feed');
          }
        });
    } else {
      const code = params.get('code') || new URLSearchParams(window.location.search).get('code');
      if (code) {
        router.replace(`/api/auth/callback?code=${code}`);
      } else {
        router.replace('/login');
      }
    }
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
