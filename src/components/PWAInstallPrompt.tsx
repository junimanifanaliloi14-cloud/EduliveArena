'use client';
import { useEffect, useState } from 'react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem('edulive_pwa_dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('edulive_pwa_dismissed', Date.now().toString());
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Banner Otomatis */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[200] animate-slide-up">
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-4 shadow-2xl border-2 border-brand-400">
            <div className="flex items-start gap-3">
              <div className="text-4xl flex-shrink-0">📱</div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base">Install EduLive Arena</h3>
                <p className="text-xs text-orange-50 mt-1 leading-relaxed">Buka lebih cepat, akses langsung dari home screen.</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleInstall} className="flex-1 bg-white text-brand-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-orange-50 transition">📥 Install Sekarang</button>
                  <button onClick={handleDismiss} className="text-white/80 hover:text-white text-xs px-3 py-2">Nanti</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tombol Manual Fallback (Selalu ada jika prompt belum tersedia) */}
      {!deferredPrompt && !isInstalled && (
        <button
          onClick={() => alert(
            'Untuk menginstall aplikasi:\n\n' +
            '• Di Chrome Desktop: Klik ikon "Install" (monitor dengan panah ke bawah) di address bar sebelah kanan.\n' +
            '• Di Chrome Android: Menu ⋮ → "Install app" atau "Tambahkan ke Layar Utama".\n' +
            '• Di iPhone (Safari): Tombol Share (kotak dengan panah ke atas) → "Add to Home Screen".'
          )}
          className="fixed bottom-4 left-4 z-[200] bg-slate-800/90 backdrop-blur text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-white/20 hover:bg-slate-700 transition"
        >
          📱 Install Aplikasi
        </button>
      )}
    </>
  );
}
