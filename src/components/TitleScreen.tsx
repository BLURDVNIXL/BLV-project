import { Play, RotateCcw } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallPrompt';
import { JellyButton } from './ui/Jelly';
import { SunLagoonEmblem } from './ui/icons';

interface TitleScreenProps {
  hasSavedGame: boolean;
  savedDestinyName?: string;
  onStartNewGame: () => void;
  onContinueGame: () => void;
}

/** Touche de clavier / bouton de manette dans l'aide en bas d'écran. */
function Key({ children }: { children: string }) {
  return (
    <kbd className="mx-0.5 rounded-lg border-2 border-white bg-cream-50 px-2 py-0.5 font-sans text-xs font-bold text-ink-800 shadow-[0_2px_0_#c99a52]">
      {children}
    </kbd>
  );
}

export function TitleScreen({ hasSavedGame, savedDestinyName, onStartNewGame, onContinueGame }: TitleScreenProps) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex flex-col justify-between p-4 md:p-10"
      style={{
        background:
          'linear-gradient(90deg, rgba(255,232,190,0.88) 0%, rgba(255,232,190,0.5) 40%, rgba(255,232,190,0) 72%)',
      }}
    >
      <div className="panel w-full max-w-md space-y-3 p-4 md:mt-6 md:space-y-5 md:p-7">
        <div className="flex items-center gap-4">
          <SunLagoonEmblem className="h-16 w-16 shrink-0 drop-shadow-md md:h-20 md:w-20" />
          <div>
            <h1
              className="font-display text-6xl font-bold leading-none text-sun-500 md:text-7xl"
              style={{ WebkitTextStroke: '7px #fff', paintOrder: 'stroke fill', textShadow: '0 4px 0 rgba(168,72,10,0.35)' }}
            >
              BLV
            </h1>
            <p className="font-display text-lg font-semibold text-ink-600 md:text-xl">Babi Life Vibes</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-ink-600 md:text-base">
          Une vie à Abidjan, d’Abobo à Assinie. Laisse le hasard choisir ton destin, puis fais briller ton Étoile.
        </p>

        <div className="flex flex-col items-stretch gap-3 pt-1">
          <JellyButton tone="sun" size="lg" data-start="true" onClick={onStartNewGame} icon={<Play className="h-6 w-6 fill-white" />}>
            Commencer une Nouvelle Vie
          </JellyButton>

          {hasSavedGame && (
            <JellyButton tone="palm" size="md" onClick={onContinueGame} icon={<RotateCcw className="h-5 w-5" />}>
              Continuer{savedDestinyName ? ` (${savedDestinyName})` : ''}
            </JellyButton>
          )}

          <PWAInstallButton lang="fr" />
        </div>
      </div>

      <div className="panel w-fit max-w-full self-start px-4 py-2 text-xs text-ink-600 md:text-sm">
        <Key>WASD</Key>/<Key>Flèches</Key> se déplacer · <Key>Souris</Key> caméra · <Key>E</Key> interagir · <Key>Espace</Key> sauter · <Key>P</Key> pause
      </div>
    </div>
  );
}
