import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

export const metadata: Metadata = {
  title: 'EduLive Arena - Live Quiz Game Show',
  description: 'Platform kuis edukasi real-time di atas live streaming. Belajar sambil live, menang sambil belajar.',
  manifest: '/manifest.json',
  applicationName: 'EduLive Arena',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EduLive',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-ink-900 text-slate-100 min-h-screen">
        {children}
        <ServiceWorkerRegister />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
