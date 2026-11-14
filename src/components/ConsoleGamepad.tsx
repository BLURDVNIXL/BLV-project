import React, { useRef, useState, useEffect } from 'react';
import { Hand, DoorOpen, ChevronsUp, Bell, Smartphone, Pause } from 'lucide-react';
import { RoundIconButton } from './ui/Jelly';

interface ConsoleGamepadProps {
  forceVisible: boolean;
  onJoystickChange: (x: number, y: number) => void;
  onCrossAction: () => void; // bas : Interagir / Entrer-Sortir véhicule
  onSquareAction: () => void; // gauche : Sauter / Klaxon
  onTriangleAction: () => void; // haut : BabiOS Smartphone
  onCircleAction: () => void; // droite : Pause
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
      {/* GAUCHE : joystick analogique 360° */}
      <div className="pointer-events-auto absolute bottom-5 left-5 touch-none short:bottom-3 short:left-3">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative flex h-32 w-32 items-center justify-center rounded-full border-[3px] border-white/90 bg-cream-50/70 shadow-[0_6px_18px_rgba(90,50,10,0.3),inset_0_-4px_0_rgba(201,154,82,0.35)] backdrop-blur-sm md:h-36 md:w-36 short:h-24 short:w-24"
        >
          <div
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
            className="jelly jelly-sun jelly-round h-14 w-14 short:h-10 short:w-10"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* DROITE : 4 grosses pastilles, une icône par action (plus de symboles de console) */}
      <div className="pointer-events-auto absolute bottom-5 right-5 touch-none short:bottom-3 short:right-3">
        <div className="relative h-44 w-44 short:h-32 short:w-32">
          <RoundIconButton
            tone="sun"
            size="lg"
            label="Ouvrir BabiOS"
            onClick={onTriangleAction}
            className="absolute left-1/2 top-0 -translate-x-1/2 short:h-11 short:w-11"
          >
            <Smartphone className="h-6 w-6" />
          </RoundIconButton>

          <RoundIconButton
            tone="palm"
            size="lg"
            label={isDriving ? 'Klaxonner' : 'Sauter'}
            onClick={onSquareAction}
            className="absolute left-0 top-1/2 -translate-y-1/2 short:h-11 short:w-11"
          >
            {isDriving ? <Bell className="h-6 w-6" /> : <ChevronsUp className="h-6 w-6" />}
          </RoundIconButton>

          <RoundIconButton
            tone="plum"
            size="lg"
            label="Pause"
            onClick={onCircleAction}
            className="absolute right-0 top-1/2 -translate-y-1/2 short:h-11 short:w-11"
          >
            <Pause className="h-6 w-6 fill-white" />
          </RoundIconButton>

          <RoundIconButton
            tone="lagoon"
            size="lg"
            label={isDriving ? 'Sortir du véhicule' : 'Interagir'}
            onClick={onCrossAction}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 short:h-11 short:w-11"
          >
            {isDriving ? <DoorOpen className="h-6 w-6" /> : <Hand className="h-6 w-6" />}
          </RoundIconButton>
        </div>
      </div>
    </div>
  );
};
