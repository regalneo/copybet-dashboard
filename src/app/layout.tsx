import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Copybet Monitor',
  description: 'Live dashboard for copybet wallet tracking',
  themeColor: '#0b0f14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100">{children}</body>
    </html>
  );
}