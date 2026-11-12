/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Manette Console PlayStation Tactile (Mode Paysage) & Contrôles PC (GTA San Andreas)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HeldControls } from '../physics/controls';

interface VirtualControllerProps {
  onDirectionMove: (x: number, y: number) => void;
  onCrossPress: () => void; // ✕ Action / Interagir
  onSquarePress?: () => void; // (hérité) inutilisé : □ = Sprint (maintenu) / Saut (tap) via heldControls
  onTrianglePress: () => void; // △ Smartphone BabiOS
  onCirclePress: () => void; // Radio (touche R). ◯ = Frein à main (maintenu) via heldControls
  heldControls?: React.MutableRefObject<HeldControls>; // sprint / frein à main / saut (CONTEXT.md §4)
  onToggleCamera?: () => void; // Changement de vue épaule / dessus
  isEnglish?: boolean;
}

export const VirtualController: React.FC<VirtualControllerProps> = ({
  onDirectionMove,
  onCrossPress,
  onTrianglePress,
  onCirclePress,
  onToggleCamera,
  heldControls,
  isEnglish = false
}) => {
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef({ x: 0, y: 0 });

  // Stockage des touches PC actives
  const activeKeys = useRef<Record<string, boolean>>({});

  const updateKeyboardDirection = useCallback(() => {
    let dx = 0;
    let dy = 0;
    const keys = activeKeys.current;

    if (keys['z'] || keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['q'] || keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    // Normalisation diagonale
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    directionRef.current = { x: dx, y: dy };
    onDirectionMove(dx, dy);

    // Mettre à jour visuellement le stick si clavier utilisé
    const maxRadius = 38;
    setJoystickPos({ x: dx * maxRadius, y: dy * maxRadius });
  }, [onDirectionMove]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur est dans un input de formulaire
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();
      activeKeys.current[key] = true;

      // Commandes maintenues (CONTEXT.md §4) : Shift = sprint, Espace = saut / frein à main
      const held = heldControls?.current;
      if (held) {
        if (key === 'shift') held.sprint = true;
        if (key === ' ') {
          e.preventDefault();
          held.handbrake = true;
          if (!e.repeat) held.jumpCount += 1;
        }
      }

      // Déplacements
      if (['z', 's', 'q', 'd', 'w', 'a', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        updateKeyboardDirection();
      }

      // Actions GTA
      if (key === 'e' || key === 'f') {
        onCrossPress();
      } else if (key === 'tab' || key === 'p') {
        e.preventDefault();
        onTrianglePress();
      } else if (key === 'c') {
        if (onToggleCamera) onToggleCamera();
        else onCirclePress();
      } else if (key === 'r') {
        onCirclePress();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      activeKeys.current[key] = false;
      const held = heldControls?.current;
      if (held) {
        if (key === 'shift') held.sprint = false;
        if (key === ' ') held.handbrake = false;
      }
      if (['z', 's', 'q', 'd', 'w', 'a', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        updateKeyboardDirection();
      }
    };

    // Perte de focus : on relâche toutes les commandes maintenues
    const handleBlur = () => {
      activeKeys.current = {};
      const held = heldControls?.current;
      if (held) {
        held.sprint = false;
        held.handbrake = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onCrossPress, onTrianglePress, onCirclePress, onToggleCamera, heldControls, updateKeyboardDirection]);

  // Boutons tactiles maintenus : □ sprint (tap bref = saut), ◯ frein à main
  const squareDownAt = useRef(0);
  const handleSquareDown = () => {
    triggerHaptic();
    squareDownAt.current = performance.now();
    if (heldControls) heldControls.current.sprint = true;
  };
  const handleSquareUp = () => {
    if (!heldControls || squareDownAt.current === 0) return;
    heldControls.current.sprint = false;
    if (performance.now() - squareDownAt.current < 220) heldControls.current.jumpCount += 1;
    squareDownAt.current = 0;
  };
  const handleCircleDown = () => {
    triggerHaptic();
    if (heldControls) heldControls.current.handbrake = true;
  };
  const handleCircleUp = () => {
    if (heldControls) heldControls.current.handbrake = false;
  };

  // Calcul du vecteur joystick
  const handlePointerCoord = useCallback((clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rawX = clientX - centerX;
    const rawY = clientY - centerY;

    const maxRadius = 42;
    const distance = Math.hypot(rawX, rawY);
    const angle = Math.atan2(rawY, rawX);

    const clampedDist = Math.min(distance, maxRadius);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setJoystickPos({ x: clampedX, y: clampedY });

    const normalizedX = clampedX / maxRadius;
    const normalizedY = clampedY / maxRadius;
    onDirectionMove(normalizedX, normalizedY);
  }, [onDirectionMove]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handlePointerCoord(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handlePointerCoord(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setJoystickPos({ x: 0, y: 0 });
    onDirectionMove(0, 0);
  };

  // Mouse handlers (pour jouer sur PC en cliquant sur le stick)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handlePointerCoord(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handlePointerCoord(e.clientX, e.clientY);
    };

    const handleWindowMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setJoystickPos({ x: 0, y: 0 });
        onDirectionMove(0, 0);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, handlePointerCoord, onDirectionMove]);

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(20); } catch {}
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-end justify-between p-3 sm:p-6 select-none">
      {/* JOYSTICK ANALOGIQUE 360° À GAUCHE (Compatible Touch & Souris) */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          className={`relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full border-2 border-amber-500/30 bg-slate-950/70 backdrop-blur-md shadow-2xl transition-all ${
            isDragging ? 'border-amber-400 bg-slate-950/90 scale-105' : 'hover:border-amber-500/50'
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* Réticule d'axes */}
          <div className="absolute h-0.5 w-20 bg-amber-400/20" />
          <div className="absolute h-20 w-0.5 bg-amber-400/20" />

          {/* Stick mobile avec dégradé chaud */}
          <div
            className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 shadow-lg shadow-amber-500/40"
            style={{
              transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
          >
            <div className="h-5 w-5 rounded-full border border-black/30 bg-black/25 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-200/80" />
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">
          {isEnglish ? 'MOVE / DÉPLACEMENT' : 'DIRECTION (360°)'}
        </span>
      </div>

      {/* Raccourcis PC discrets au milieu */}
      <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/80 px-3.5 py-1.5 text-[11px] font-mono text-slate-400 backdrop-blur-md shadow-lg">
        <span className="text-amber-400 font-bold">ZQSD</span>: Bouger
        <span>•</span>
        <span className="text-pink-400 font-bold">Shift</span>: Sprint
        <span>•</span>
        <span className="text-rose-400 font-bold">Espace</span>: Saut / Frein à main
        <span>•</span>
        <span className="text-sky-400 font-bold">E / Clic</span>: Interagir
        <span>•</span>
        <span className="text-emerald-400 font-bold">P / Tab</span>: Phone
        <span>•</span>
        <span className="text-rose-400 font-bold">C</span>: Caméra
      </div>

      {/* 4 BOUTONS PLAYSTATION À DROITE (△, □, ◯, ✕) */}
      <div className="pointer-events-auto relative flex h-32 w-32 sm:h-36 sm:w-36 items-center justify-center">
        {/* Triangle (△) - HAUT : Smartphone BabiOS */}
        <button
          onClick={() => { triggerHaptic(); onTrianglePress(); }}
          className="group absolute -top-1 sm:-top-2 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-slate-950/80 shadow-lg backdrop-blur-md active:scale-90 active:bg-emerald-950/90 transition-transform"
          title={isEnglish ? "△ Phone (Tab)" : "△ Smartphone BabiOS (Tab)"}
        >
          <span className="text-sm font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">▲</span>
          <span className="absolute -top-3 text-[9px] font-bold font-mono text-emerald-300">PHONE</span>
        </button>

        {/* Carré (□) - GAUCHE : Sprint (maintenu) / Saut (tap) — CONTEXT.md §4 */}
        <button
          onPointerDown={handleSquareDown}
          onPointerUp={handleSquareUp}
          onPointerLeave={handleSquareUp}
          onPointerCancel={handleSquareUp}
          onContextMenu={(e) => e.preventDefault()}
          className="group absolute -left-1 sm:-left-2 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 border-pink-500/50 bg-slate-950/80 shadow-lg backdrop-blur-md active:scale-90 active:bg-pink-950/90 transition-transform"
          title={isEnglish ? "□ Sprint (hold) / Jump (tap) — Shift / Space" : "□ Sprint (maintenir) / Saut (tap) — Shift / Espace"}
        >
          <span className="text-base font-black text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]">■</span>
          <span className="absolute -left-7 text-[9px] font-bold font-mono text-pink-300">SPRINT</span>
        </button>

        {/* Rond (◯) - DROITE : Frein à main / drift en voiture — CONTEXT.md §4 */}
        <button
          onPointerDown={handleCircleDown}
          onPointerUp={handleCircleUp}
          onPointerLeave={handleCircleUp}
          onPointerCancel={handleCircleUp}
          onContextMenu={(e) => e.preventDefault()}
          className="group absolute -right-1 sm:-right-2 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 border-rose-500/50 bg-slate-950/80 shadow-lg backdrop-blur-md active:scale-90 active:bg-rose-950/90 transition-transform"
          title={isEnglish ? "◯ Handbrake / drift (hold) — Space" : "◯ Frein à main / drift (maintenir) — Espace"}
        >
          <span className="text-base font-black text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]">●</span>
          <span className="absolute -right-7 text-[9px] font-bold font-mono text-rose-300">FREIN</span>
        </button>

        {/* Croix (✕) - BAS : Interagir / Valider (Terre d'Ivoire & GTA Action) */}
        <button
          onClick={() => { triggerHaptic(); onCrossPress(); }}
          className="group absolute -bottom-1 sm:-bottom-2 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-sky-400 bg-sky-950/90 shadow-xl shadow-sky-500/30 backdrop-blur-md active:scale-90 active:bg-sky-900 transition-transform"
          title={isEnglish ? "✕ Action / Interact (E / Click)" : "✕ Action / Interagir (E / Clic)"}
        >
          <span className="text-lg font-black text-sky-300 drop-shadow-[0_0_10px_rgba(56,189,248,1)]">✕</span>
          <span className="absolute -bottom-3 text-[9px] font-bold font-mono text-sky-200">ACTION</span>
        </button>
      </div>
    </div>
  );
};
