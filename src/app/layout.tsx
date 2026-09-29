import type { Metadata, Viewport } from 'next';
import './globals.css';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Office Hours Queue';

export const metadata: Metadata = {
  title: appName,
  description: 'A lightweight office-hours appointment and live queue manager for college instructors.',
  manifest: '/manifest.json'
};

export const viewport: Viewport = {
  themeColor: '#234E70',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
