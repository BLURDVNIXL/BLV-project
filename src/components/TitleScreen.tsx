import { Play, RotateCcw } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallPrompt';

interface TitleScreenProps {
  hasSavedGame: boolean;
  savedDestinyName?: string;
  onStartNewGame: () => void;
  onContinueGame: () => void;
}

export function TitleScreen({
  hasSavedGame,
  savedDestinyName,
  onStartNewGame,
  onContinueGame,
}: TitleScreenProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-between p-6 md:p-10 pointer-events-auto"
      style={{
        background:
          'linear-gradient(90deg, rgba(9,13,22,0.88) 0%, rgba(9,13,22,0.52) 48%, rgba(9,13,22,0.18) 100%)',
      }}
    >
      {/* Top Safe Space: Left-anchored Abidjan Crest Emblem + Title Lockup */}
      <div className="max-w-xl mt-4 md:mt-10 space-y-5">
        <div className="flex items-center gap-4">
          <svg
            viewBox="0 0 88 88"
            className="w-16 h-16 md:w-20 md:h-20 shrink-0 drop-shadow-lg"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="80" height="80" rx="18" fill="#0f172a" stroke="#f59e0b" strokeWidth="3.5" />
            {/* Côte d'Ivoire tricolor crest ribbon */}
            <rect x="14" y="14" width="20" height="8" rx="2" fill="#f97316" />
            <rect x="34" y="14" width="20" height="8" rx="2" fill="#ffffff" />
            <rect x="54" y="14" width="20" height="8" rx="2" fill="#16a34a" />
            {/* Le Plateau Pyramide & Skyline Silhouette */}
            <polygon points="24,62 44,30 64,62" fill="#f59e0b" />
            <rect x="17" y="46" width="8" height="16" fill="#38bdf8" />
            <rect x="63" y="40" width="8" height="22" fill="#38bdf8" />
            {/* Lagune waves */}
            <path d="M14 68 Q29 63 44 68 T74 68" stroke="#38bdf8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </svg>

          <div>
            <h1 className="font-display text-6xl md:text-8xl leading-none tracking-wider text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              BLV
            </h1>
            <p className="font-display text-2xl md:text-3xl tracking-widest text-amber-400">
              BABI LIFE VIBES
            </p>
          </div>
        </div>

        <p className="text-sm md:text-base text-slate-200 max-w-md leading-relaxed">
          Simulation de vie urbaine 3D à Abidjan — d’Abobo à Assinie, du Gbaka à la Rolls-Royce Phantom. Tire ton Destin et fais briller ton Étoile.
        </p>

        {/* Primary Menu CTAs (<= 3 actions) */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            data-start="true"
            onClick={onStartNewGame}
            className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base rounded-xl shadow-[0_6px_0_#b45309] active:translate-y-0.5 flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            Commencer une Nouvelle Vie
          </button>

          {hasSavedGame && (
            <button
              type="button"
              onClick={onContinueGame}
              className="px-5 py-3.5 bg-slate-900/95 hover:bg-slate-800 text-white font-bold text-sm rounded-xl border border-slate-600 flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              Continuer{savedDestinyName ? ` (${savedDestinyName})` : ''}
            </button>
          )}

          <PWAInstallButton lang="fr" />
        </div>
      </div>

      {/* Single Flat Borderless Bottom Control Hint */}
      <div className="text-xs md:text-sm text-slate-300/90 font-mono tracking-wide">
        WASD / Flèches Déplacer · Glisser Souris Caméra 360° · E / ✕ Interagir · Espace Sauter · P Pause
      </div>
    </div>
  );
}
