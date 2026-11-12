/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Détection & Invitation au Format Paysage Console
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

interface OrientationGuardProps {
  children: React.ReactNode;
}

export const OrientationGuard: React.FC<OrientationGuardProps> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [bypass, setBypass] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Si la hauteur dépasse la largeur et qu'on est sur un écran compact (< 900px de large)
      const isNarrow = window.innerWidth < window.innerHeight && window.innerWidth < 900;
      setIsPortrait(isNarrow);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (isPortrait && !bypass) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        {/* Glow de fond */}
        <div className="absolute h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"></div>

        <div className="relative z-10 flex max-w-sm flex-col items-center">
          {/* Animation de rotation smartphone */}
          <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-amber-500/40" style={{ animationDuration: '6s' }}></div>
            <Smartphone className="h-14 w-14 animate-pulse text-amber-400 transform -rotate-90 transition-transform duration-700" />
            <RotateCw className="absolute -bottom-1 -right-1 h-6 w-6 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>

          <span className="mb-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-400">
            Format Console Portable
          </span>

          <h2 className="mb-3 text-2xl font-black uppercase tracking-tight text-white">
            Tourne ton téléphone
          </h2>

          <p className="mb-6 text-sm text-slate-400 leading-relaxed">
            Pour profiter de la manette PlayStation tactile, de la vue 3D et de la métropole d'Abidjan, bascule ton appareil en <strong className="text-amber-300">mode Paysage</strong>.
          </p>

          <button
            onClick={() => setBypass(true)}
            className="text-xs text-slate-500 underline hover:text-slate-300 transition-colors"
          >
            Continuer quand même en portrait
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
