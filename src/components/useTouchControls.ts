import { useEffect, useState } from 'react';

/**
 * Vrai si les commandes tactiles (joystick + boutons) doivent s'afficher :
 * appareil tactile détecté, ou activation manuelle dans les réglages.
 * Partagé par la manette et le HUD pour qu'ils ne se doublonnent jamais.
 */
export function useTouchControls(force: boolean): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
      setIsTouchDevice(coarse);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isTouchDevice || force;
}
