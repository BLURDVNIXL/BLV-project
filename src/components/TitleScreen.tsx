import { Play, RotateCcw } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallPrompt';
import { JellyButton } from './ui/Jelly';
import titleArt from '../assets/title-art.webp';

interface TitleScreenProps {
  hasSavedGame: boolean;
  savedDestinyName?: string;
  onStartNewGame: () => void;
  onContinueGame: () => void;
}

/** Touche de clavier dans l'aide en bas d'écran. */
function Key({ children }: { children: string }) {
  return (
    <kbd className="mx-0.5 rounded-lg border-2 border-white bg-cream-50 px-2 py-0.5 font-sans text-xs font-bold text-ink-800 shadow-[0_2px_0_#c99a52]">
      {children}
    </kbd>
  );
}

/** Texte clair avec contour sombre : lisible sur le coucher de soleil comme sur le noir. */
const OUTLINED = { WebkitTextStroke: '3px #1a0b2e', paintOrder: 'stroke fill' } as const;

/**
 * Écran de démarrage : l'affiche BLV (coucher de soleil, palmiers, couronne) en pleine page.
 * L'affiche est toujours entière (jamais rognée) : un flou de la même image prolonge les bords.
 * Grand écran : affiche en haut, boutons dessous. Téléphone en paysage : affiche à gauche, boutons à droite.
 */
export function TitleScreen({ hasSavedGame, savedDestinyName, onStartNewGame, onContinueGame }: TitleScreenProps) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 overflow-hidden bg-[#2a1040]">
      <img src={titleArt} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl brightness-75 saturate-150" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e]/70 via-transparent to-[#1a0b2e]/25" />

      <div className="relative flex h-full flex-col items-center gap-3 p-3 md:gap-5 md:p-6 short:flex-row short:gap-4 short:p-3">
        <h1 className="sr-only">BLV — Babi Life Vibes</h1>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center short:h-full short:w-[56%] short:flex-none">
          <img
            src={titleArt}
            alt="BLV — Babi Life Vibes : une couronne dorée au-dessus du logo, des palmiers et la ville au coucher du soleil"
            className="max-h-full max-w-full rounded-2xl object-contain shadow-[0_12px_36px_rgba(0,0,0,0.55)] ring-4 ring-[#1a0b2e]"
          />
        </div>

        <div className="flex w-full max-w-md flex-col items-stretch gap-2.5 pb-1 short:max-w-none short:flex-1 short:justify-center short:gap-2 short:pb-0">
          <p
            className="text-center font-display text-base font-semibold leading-snug text-cream-50 md:text-lg short:text-sm"
            style={OUTLINED}
          >
            Babi Life Vibes · Une vie à Abidjan, d’Abobo à Assinie
          </p>

          <JellyButton tone="sun" size="lg" data-start="true" className="short:!py-2.5 short:!text-base" onClick={onStartNewGame} icon={<Play className="h-6 w-6 fill-white" />}>
            Commencer une Nouvelle Vie
          </JellyButton>

          {hasSavedGame && (
            <JellyButton tone="palm" size="md" onClick={onContinueGame} icon={<RotateCcw className="h-5 w-5" />}>
              Continuer{savedDestinyName ? ` (${savedDestinyName})` : ''}
            </JellyButton>
          )}

          <PWAInstallButton lang="fr" />

          <div className="hidden text-center text-xs text-cream-50/90 md:block short:hidden">
            <Key>WASD</Key>/<Key>Flèches</Key> se déplacer · <Key>Souris</Key> caméra · <Key>E</Key> interagir · <Key>Espace</Key> sauter · <Key>P</Key> pause
          </div>
        </div>
      </div>
    </div>
  );
}
