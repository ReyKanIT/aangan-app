import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aangan आँगन — Family Social Network',
  description: 'Connect with your family on Aangan v0.5 — the family social network for Indian families. Now with voice features!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
