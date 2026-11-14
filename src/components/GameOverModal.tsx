import React from 'react';
import { RotateCcw, Calendar, Coins, Award, Heart } from 'lucide-react';
import { PlayerState } from '../types/game';
import { JellyButton } from './ui/Jelly';

interface GameOverModalProps {
  playerState: PlayerState;
  onRestart: () => void;
}

function StatRow({ icon, label, value, tone = '' }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-cream-200 py-2 last:border-b-0">
      <span className="flex items-center gap-2 text-sm text-ink-600">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-bold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ playerState, onRestart }) => {
  return (
    <div className="fixed inset-0 z-50 flex select-none items-center justify-center bg-ink-900/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Fin du parcours">
      <div className="panel flex w-full max-w-md flex-col p-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white bg-coral-400/20 text-3xl shadow-sm" aria-hidden="true">
          🌅
        </div>

        <h2 className="font-display text-3xl font-semibold">Fin du parcours à Babi</h2>

        <p className="mt-2 px-2 text-sm italic text-ink-600">
          « {playerState.gameOverReason || 'Épuisement total sous le poids des dettes à Abidjan.'} »
        </p>

        <div className="my-5 rounded-2xl border-2 border-cream-200 bg-cream-50 px-4 py-1 text-left">
          <StatRow icon={<Calendar className="h-4 w-4 text-sun-500" />} label="Jours vécus" value={`${playerState.daysLived} jours`} />
          <StatRow
            icon={<Coins className="h-4 w-4 text-coral-500" />}
            label="Dettes cumulées"
            value={`${playerState.debt.toLocaleString('fr-FR')} FCFA`}
            tone="text-coral-600"
          />
          <StatRow icon={<Award className="h-4 w-4 text-sun-500" />} label="Destin vécu" value={playerState.destiny.name} tone="text-sun-600" />
          <StatRow
            icon={<Heart className="h-4 w-4 text-coral-500" />}
            label="Statut du cœur"
            value={playerState.loveState.isMarried ? 'Marié(e)' : playerState.loveState.partnerName ? 'En couple' : 'Célibataire'}
          />
        </div>

        <JellyButton tone="sun" size="md" data-start="true" onClick={onRestart} icon={<RotateCcw className="h-5 w-5" />} className="w-full">
          Renaître à Babi (nouvelle vie)
        </JellyButton>
      </div>
    </div>
  );
};
