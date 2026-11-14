import React, { useRef, useState } from 'react';
import { Backpack, Bell, ChevronsUp, CircleParking, DoorOpen, Footprints, Hand, Smartphone } from 'lucide-react';
import { RoundIconButton } from './ui/Jelly';

interface ConsoleGamepadProps {
  /** Affichage décidé par le parent (appareil tactile ou option des réglages). */
  visible: boolean;
  isDriving: boolean;
  /** Vrai quand « Interagir » a une cible (repère proche, véhicule proche ou conducteur). */
  canInteract: boolean;
  onJoystickChange: (x: number, y: number) => void;
  onInteract: () => void;
  /** À pied : saut. En voiture : klaxon. */
  onJump: () => void;
  onPhone: () => void;
  /** Bouton maintenu : sprint à pied, frein à main en voiture. `false` relâche tout. */
  onHold: (active: boolean) => void;
}

/**
 * Manette tactile : joystick à gauche (le radar est en haut à gauche, rien ne le recouvre),
 * cinq boutons à droite. Les boutons gardent des places fixes : « Interagir » (au centre)
 * apparaît et disparaît sans rien décaler.
 */
export const ConsoleGamepad: React.FC<ConsoleGamepadProps> = ({
  visible,
  isDriving,
  canInteract,
  onJoystickChange,
  onInteract,
  onJump,
  onPhone,
  onHold,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  if (!visible) return null;

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

  // Bouton maintenu (sprint / frein à main) : on suit le doigt jusqu'au relâchement, même s'il glisse hors du bouton.
  const holdProps = {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      onHold(true);
    },
    onPointerUp: () => onHold(false),
    onPointerCancel: () => onHold(false),
    onLostPointerCapture: () => onHold(false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
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

      {/* DROITE : cinq boutons, une icône par action. Rangée du haut : BabiOS + Utiliser ; rangée du bas : Saut · Interagir (centre) · Sprint/Frein */}
      <div className="pointer-events-auto absolute bottom-5 right-5 touch-none short:bottom-3 short:right-3">
        <div className="flex flex-col items-center gap-3 short:gap-2">
          <div className="flex items-center gap-3 short:gap-2">
            <RoundIconButton tone="sun" size="md" label="Ouvrir BabiOS" onClick={onPhone} className="short:h-9 short:w-9">
              <Smartphone className="h-5 w-5" />
            </RoundIconButton>
            {/* Sac et objets : pas encore actif. */}
            <RoundIconButton tone="plum" size="md" label="Utiliser (bientôt)" disabled className="short:h-9 short:w-9">
              <Backpack className="h-5 w-5" />
            </RoundIconButton>
          </div>

          <div className="flex items-center gap-2.5 short:gap-2">
            <RoundIconButton
              tone="palm"
              size="lg"
              label={isDriving ? 'Klaxonner' : 'Sauter'}
              onClick={onJump}
              className="short:h-11 short:w-11"
            >
              {isDriving ? <Bell className="h-6 w-6" /> : <ChevronsUp className="h-6 w-6" />}
            </RoundIconButton>

            {/* Emplacement fixe : le bouton apparaît/disparaît sans décaler les autres. */}
            <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center short:h-14 short:w-14">
              <button
                type="button"
                aria-label={isDriving ? 'Sortir du véhicule' : 'Interagir'}
                title={isDriving ? 'Sortir du véhicule' : 'Interagir'}
                aria-hidden={!canInteract}
                tabIndex={canInteract ? 0 : -1}
                onClick={onInteract}
                className={`jelly jelly-round jelly-lagoon h-[4.5rem] w-[4.5rem] transition-[transform,opacity,box-shadow] duration-150 short:h-14 short:w-14 ${
                  canInteract ? 'scale-100 opacity-100' : 'pointer-events-none scale-50 opacity-0'
                }`}
              >
                <span className="relative flex items-center justify-center">
                  {isDriving ? <DoorOpen className="h-7 w-7" /> : <Hand className="h-7 w-7" />}
                </span>
              </button>
            </div>

            <RoundIconButton
              tone="coral"
              size="lg"
              label={isDriving ? 'Frein à main (maintenir)' : 'Courir (maintenir)'}
              className="short:h-11 short:w-11"
              {...holdProps}
            >
              {isDriving ? <CircleParking className="h-6 w-6" /> : <Footprints className="h-6 w-6" />}
            </RoundIconButton>
          </div>
        </div>
      </div>
    </div>
  );
};
