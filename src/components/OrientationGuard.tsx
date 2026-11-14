import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export const OrientationGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 768;
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobile && portrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink-900/60 p-6 text-center text-ink-800">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-sun-300/40 border-2 border-sun-400/40">
        <Smartphone className="h-12 w-12 text-sun-600" />
        <RotateCw className="absolute -right-2 -top-2 h-7 w-7 text-palm-600 animate-spin" style={{ animationDuration: '4s' }} />
      </div>

      <h2 className="font-display text-3xl font-bold tracking-wide uppercase text-ink-800 mb-2">
        Tourne ton écran en Paysage
      </h2>
      <p className="max-w-xs text-sm text-ink-600 leading-relaxed mb-6">
        Pour profiter de la manette PlayStation (Joystick + ✕ □ △ ◯) et de la vue panoramique d’Abidjan, bascule ton appareil à l’horizontale.
      </p>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-xl border border-cream-200 bg-cream-200 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-600 hover:bg-cream-200 cursor-pointer"
      >
        Continuer quand même
      </button>
    </div>
  );
};
