'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="hi">
      <body style={{ fontFamily: 'Poppins, sans-serif', background: '#FDFAF0', color: '#4A2C2A', textAlign: 'center', padding: '4rem 1rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>कुछ गलत हो गया / Something went wrong</h1>
        <p style={{ marginBottom: '2rem', color: '#888' }}>{error.message}</p>
        <button
          onClick={reset}
          style={{ background: '#C8A84B', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontSize: '1rem', cursor: 'pointer' }}
        >
          फिर से कोशिश करें / Try Again
        </button>
      </body>
    </html>
  );
}
