'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[PWA] ✅ SW registered:', reg.scope))
      .catch((err) => console.warn('[PWA] ⚠️ SW registration failed:', err));

    // Deteksi update
    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] 🔄 Versi baru tersedia. Refresh untuk update.');
            }
          });
        }
      });
    });
  }, []);
  return null;
}
