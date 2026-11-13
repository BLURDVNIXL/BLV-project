import React, { useRef, useState, useEffect } from 'react';

interface ConsoleGamepadProps {
  forceVisible: boolean;
  onJoystickChange: (x: number, y: number) => void;
  onCrossAction: () => void; // ✕ : Interagir / Entrer-Sortir véhicule
  onSquareAction: () => void; // □ : Sauter / Klaxon
  onTriangleAction: () => void; // △ : BabiOS Smartphone
  onCircleAction: () => void; // ◯ : Pause
  isDriving: boolean;
}

export const ConsoleGamepad: React.FC<ConsoleGamepadProps> = ({
  forceVisible,
  onJoystickChange,
  onCrossAction,
  onSquareAction,
  onTriangleAction,
  onCircleAction,
  isDriving,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
      setIsTouchDevice(coarse);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Hide virtual touch gamepad on PC desktop unless user enables it in Settings
  if (!isTouchDevice && !forceVisible) {
    return null;
  }

  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clamped = Math.min(distance, maxRadius);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    setKnobPos({ x: kx, y: ky });
    onJoystickChange(kx / maxRadius, ky / maxRadius);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    handleJoystickMove(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        handleJoystickMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        setIsDragging(false);
        touchIdRef.current = null;
        setKnobPos({ x: 0, y: 0 });
        onJoystickChange(0, 0);
        break;
      }
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none overflow-hidden">
      {/* LEFT: 360° ANALOG JOYSTICK */}
      <div className="pointer-events-auto absolute bottom-5 left-5 touch-none">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative flex h-32 w-32 md:h-36 md:w-36 items-center justify-center rounded-full bg-slate-900/80 border-2 border-slate-600 shadow-2xl"
        >
          <div
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 border-2 border-amber-500 shadow-lg"
          >
            <div className="h-5 w-5 rounded-full bg-amber-500/40 border border-amber-400" />
          </div>
        </div>
      </div>

      {/* RIGHT: PLAYSTATION BUTTONS (✕ □ △ ◯) */}
      <div className="pointer-events-auto absolute bottom-5 right-5 touch-none">
        <div className="relative h-40 w-40">
          <button
            type="button"
            onClick={onTriangleAction}
            aria-label="Ouvrir BabiOS (Triangle)"
            className="absolute top-0 left-1/2 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/90 border-2 border-emerald-500 text-emerald-400 font-black text-lg cursor-pointer"
          >
            △
          </button>

          <button
            type="button"
            onClick={onSquareAction}
            aria-label={isDriving ? 'Klaxonner (Carré)' : 'Sauter (Carré)'}
            className="absolute top-1/2 left-0 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/90 border-2 border-pink-500 text-pink-400 font-black text-lg cursor-pointer"
          >
            □
          </button>

          <button
            type="button"
            onClick={onCircleAction}
            aria-label="Pause (Rond)"
            className="absolute top-1/2 right-0 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/90 border-2 border-rose-500 text-rose-400 font-black text-lg cursor-pointer"
          >
            ◯
          </button>

          <button
            type="button"
            onClick={onCrossAction}
            aria-label={isDriving ? 'Sortir du véhicule (Croix)' : 'Interagir (Croix)'}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/90 border-2 border-cyan-400 text-cyan-400 font-black text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
