import { useEffect, useState } from 'react';
import { Download, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return { canInstall: Boolean(deferredPrompt) && !isInstalled, promptInstall };
}

export function PWAInstallButton({ lang = 'fr' }: { lang?: 'fr' | 'en' }) {
  const { canInstall, promptInstall } = usePWAInstall();
  if (!canInstall) return null;
  return (
    <button
      type="button"
      onClick={promptInstall}
      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs tracking-wide uppercase flex items-center gap-2 border border-emerald-400 shadow-lg cursor-pointer"
    >
      <Download className="w-4 h-4" />
      {lang === 'en' ? 'Install BLV App' : 'Installer l’App BLV'}
    </button>
  );
}

export function OfflineIndicator({ lang = 'fr' }: { lang?: 'fr' | 'en' }) {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[120] bg-amber-950/95 border border-amber-500 text-amber-200 px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-lg pointer-events-none">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      {lang === 'en' ? 'Offline Mode — Local WASM & Cache Active' : 'Mode Hors-Ligne — Moteur WASM & Sauvegarde Locale Actifs'}
    </div>
  );
}
