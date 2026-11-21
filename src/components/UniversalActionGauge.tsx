import React, { useEffect, useRef } from 'react';
import {
  BedDouble,
  CarTaxiFront,
  Droplet,
  Glasses,
  ShowerHead,
  Sparkles,
  Ticket,
  Trophy,
  Utensils,
  GlassWater,
  Wrench,
} from 'lucide-react';
import {
  TIMED_ACTION_SPECS,
  type TimedActionKind,
  computeTimedActionProgress,
} from '../core/timedActions';

interface UniversalActionGaugeProps {
  kind: TimedActionKind;
  startedAtMs: number;
  durationMs: number;
  language: 'fr' | 'en';
}

function ActionSymbol({ kind }: { kind: TimedActionKind }) {
  const cls = 'h-6 w-6 short:h-5 short:w-5 text-[#2a3f35]';
  switch (kind) {
    case 'eat':
    case 'eat_held':
      return <Utensils className={cls} strokeWidth={2.2} />;
    case 'drink_held':
      return <GlassWater className={cls} strokeWidth={2.2} />;
    case 'toilet':
      return <Droplet className={cls} strokeWidth={2.2} />;
    case 'loto':
      return <Ticket className={cls} strokeWidth={2.2} />;
    case 'yannis_academy':
      return <Trophy className={cls} strokeWidth={2.2} />;
    case 'shower':
      return <ShowerHead className={cls} strokeWidth={2.2} />;
    case 'repair_engine':
      return <Wrench className={cls} strokeWidth={2.2} />;
    case 'black_market':
      return <Glasses className={cls} strokeWidth={2.2} />;
    case 'vieux_sage':
      return <Sparkles className={cls} strokeWidth={2.2} />;
    case 'sleep':
      return <BedDouble className={cls} strokeWidth={2.2} />;
    case 'taxi_wait':
    case 'taxi_ride':
      return <CarTaxiFront className={cls} strokeWidth={2.2} />;
  }
}

/**
 * Jauge circulaire universelle affichée en haut au centre pendant les actions chronométrées et les taxis.
 * Aucun texte ni infobulle autour : uniquement l'anneau vert progressif à bordures foncées et le symbole central.
 */
export const UniversalActionGauge: React.FC<UniversalActionGaugeProps> = ({
  kind,
  startedAtMs,
  durationMs,
  language,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const arcRef = useRef<SVGCircleElement | null>(null);
  const spec = TIMED_ACTION_SPECS[kind];
  const label = language === 'en' ? spec.labelEn : spec.labelFr;

  // Géométrie SVG (viewBox 0 0 80 80) :
  // Bordure extérieure foncée (r=38), anneau vert épais (r=31, width=10), bordure intérieure foncée (r=25.5), fond crème (r=25).
  const radius = 31;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    let rafId = 0;
    let lastPct = -1;

    const tick = () => {
      const progress = computeTimedActionProgress(startedAtMs, durationMs, Date.now());
      if (arcRef.current) {
        arcRef.current.style.strokeDashoffset = String(circumference * (1 - progress));
      }
      const pct = Math.round(progress * 100);
      if (pct !== lastPct && rootRef.current) {
        lastPct = pct;
        rootRef.current.setAttribute('aria-valuenow', String(pct));
      }
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    tick();
    return () => window.cancelAnimationFrame(rafId);
  }, [startedAtMs, durationMs, circumference]);

  const initialProgress = computeTimedActionProgress(startedAtMs, durationMs, Date.now());

  return (
    <div
      ref={rootRef}
      data-testid="universal-action-gauge"
      data-action-kind={kind}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(initialProgress * 100)}
      className="pointer-events-none fixed left-1/2 top-3 z-[25] h-[68px] w-[68px] -translate-x-1/2 select-none md:top-4 short:top-2 short:h-14 short:w-14"
    >
      <svg viewBox="0 0 80 80" className="h-full w-full drop-shadow-[0_4px_10px_rgba(30,45,38,0.28)]" aria-hidden="true">
        {/* Anneau de fond + bordure extérieure #2a3f35 */}
        <circle cx="40" cy="40" r="36.5" fill="#fffaf1" stroke="#2a3f35" strokeWidth="2.5" />
        {/* Piste sous l'arc vert */}
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#e4ece5" strokeWidth="10" />
        {/* Balayage radial vert progressif (départ 12h) */}
        <circle
          ref={arcRef}
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#2fae48"
          strokeWidth="10"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - initialProgress)}
          transform="rotate(-90 40 40)"
        />
        {/* Bordure intérieure nette #2a3f35 + disque crème central */}
        <circle cx="40" cy="40" r="25.5" fill="#fffaf1" stroke="#2a3f35" strokeWidth="2.2" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <ActionSymbol kind={kind} />
      </div>
    </div>
  );
};
