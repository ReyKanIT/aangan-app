import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aangan आँगन — Family Social Network',
  description: 'Connect with your family on Aangan — the family social network for Indian families.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
