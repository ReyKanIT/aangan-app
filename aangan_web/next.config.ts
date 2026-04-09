import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Note: Remove 'output: standalone' for Vercel deployment (Vercel handles this natively).
  // Use 'standalone' only for Docker/self-hosted deployments.
  images: {
    remotePatterns: [
      { hostname: '*.supabase.co' },
      { hostname: 's.gravatar.com' },
      { hostname: 'media.aangan.app' },
      { hostname: '*.backblazeb2.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://*.supabase.co https://s.gravatar.com https://media.aangan.app https://*.backblazeb2.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://media.aangan.app",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
