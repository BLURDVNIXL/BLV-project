import type { ReactNode } from 'react';

type Tone = 'sun' | 'lagoon' | 'palm' | 'coral' | 'plum';

const COLORS: Record<Tone, { ring: string; fill: string }> = {
  sun: { ring: '#f98a1c', fill: '#ffb347' },
  lagoon: { ring: '#1d9be0', fill: '#4cc3f5' },
  palm: { ring: '#2fae48', fill: '#55cf66' },
  coral: { ring: '#f0435f', fill: '#ff7a8d' },
  plum: { ring: '#8a4fe0', fill: '#a878f0' },
};

interface RingGaugeProps {
  /** 0–100 */
  value: number;
  tone: Tone;
  label: string;
  icon: ReactNode;
  /** Sous ce seuil, la jauge passe au corail et pulse doucement. */
  warnBelow?: number;
  size?: number;
}

/** Jauge circulaire : une icône dans un rond, entourée d'un anneau de progression. Pas de chiffre sauf alerte. */
export function RingGauge({ value, tone, label, icon, warnBelow = 20, size = 46 }: RingGaugeProps) {
  const v = Math.min(100, Math.max(0, value));
  const warn = v < warnBelow;
  const c = warn ? COLORS.coral : COLORS[tone];
  const r = 19;
  const circ = 2 * Math.PI * r;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      title={`${label} : ${Math.round(v)} %`}
      className={`relative shrink-0 ${warn ? 'animate-pulse' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 46 46" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="23" cy="23" r={r} fill="#fff7e8" stroke="#f1dcb8" strokeWidth="4" />
        <circle
          cx="23"
          cy="23"
          r={r}
          fill="none"
          stroke={c.ring}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ color: c.ring }}>
        {icon}
      </div>
      {warn && (
        <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold leading-none text-white">
          {Math.round(v)}
        </span>
      )}
    </div>
  );
}

interface BarGaugeProps {
  value: number;
  tone: Tone;
  label: string;
  className?: string;
}

/** Barre de progression arrondie et épaisse (jauge d'Étoile, d'Envie). */
export function BarGauge({ value, tone, label, className = '' }: BarGaugeProps) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={`h-3.5 overflow-hidden rounded-full border-2 border-white/90 bg-cream-200 ${className}`}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${v}%`, background: `linear-gradient(180deg, ${COLORS[tone].fill}, ${COLORS[tone].ring})` }}
      />
    </div>
  );
}
