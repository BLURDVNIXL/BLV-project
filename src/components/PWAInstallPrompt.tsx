import { useEffect, useState } from 'react';
import { JellyButton } from './ui/Jelly';
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
    <JellyButton tone="lagoon" size="sm" onClick={promptInstall} icon={<Download className="h-4 w-4" />}>
      {lang === 'en' ? 'Install BLV App' : 'Installer l’App BLV'}
    </JellyButton>
  );
}

export function OfflineIndicator({ lang = 'fr' }: { lang?: 'fr' | 'en' }) {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="panel pointer-events-none fixed left-1/2 top-2 z-[120] flex -translate-x-1/2 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
      <WifiOff className="h-4 w-4 text-sun-600" />
      {lang === 'en' ? 'Offline Mode — Local WASM & Cache Active' : 'Mode Hors-Ligne — Moteur WASM & Sauvegarde Locale Actifs'}
    </div>
  );
}
