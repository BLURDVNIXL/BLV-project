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
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/96 p-6 text-center text-white">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-600/20 border-2 border-amber-500/40">
        <Smartphone className="h-12 w-12 text-amber-400" />
        <RotateCw className="absolute -right-2 -top-2 h-7 w-7 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
      </div>

      <h2 className="font-display text-3xl font-bold tracking-wide uppercase text-white mb-2">
        Tourne ton écran en Paysage
      </h2>
      <p className="max-w-xs text-sm text-slate-300 leading-relaxed mb-6">
        Pour profiter de la manette PlayStation (Joystick + ✕ □ △ ◯) et de la vue panoramique d’Abidjan, bascule ton appareil à l’horizontale.
      </p>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:bg-slate-700 cursor-pointer"
      >
        Continuer quand même
      </button>
    </div>
  );
};
