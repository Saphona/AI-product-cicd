import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ProductIQ — AI Product Intelligence Platform',
  description: 'Validate product ideas using AI analysis, trend data, and a data-backed scoring engine. Stop guessing, start building with confidence.',
  keywords: ['product validation', 'AI', 'market analysis', 'startup', 'product intelligence'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
