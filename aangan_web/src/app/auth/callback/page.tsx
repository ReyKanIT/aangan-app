'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// Handles Supabase magic-link / OTP redirects that arrive with
// tokens in the URL hash  (#access_token=...&refresh_token=...)
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {

    // Parse hash fragment
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            console.error('Auth callback error:', error.message);
            router.replace('/login?error=auth_failed');
          } else {
            router.replace('/feed');
          }
        });
    } else {
      // No tokens — might be a PKCE code flow, hand off to /api/auth/callback
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
