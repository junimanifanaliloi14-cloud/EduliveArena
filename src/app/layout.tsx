import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EduLive Arena - Belajar sambil live, menang sambil belajar',
  description: 'Platform kuis edukasi real-time di atas live streaming media sosial.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-ink-900 text-slate-100 min-h-screen">{children}</body>
    </html>
  );
}
