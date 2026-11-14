import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { RoundIconButton } from './Jelly';

interface ModalProps {
  title: string;
  icon?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  /** Classe de largeur maximale (ex. `max-w-lg`). */
  widthClass?: string;
  children: ReactNode;
}

/** Fenêtre claire et chaleureuse : fond brun translucide, panneau crème, titre arrondi, croix en pastille. */
export function Modal({ title, icon, onClose, closeLabel = 'Fermer', widthClass = 'max-w-lg', children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex select-none items-center justify-center bg-ink-900/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`panel relative flex max-h-[92vh] w-full flex-col overflow-hidden ${widthClass}`}>
        <div className="flex items-center justify-between gap-3 border-b-2 border-cream-200 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun-300 text-sun-600">{icon}</span>}
            <h2 className="truncate font-display text-xl font-semibold md:text-2xl">{title}</h2>
          </div>
          {onClose && (
            <RoundIconButton tone="coral" size="sm" label={closeLabel} onClick={onClose}>
              <X className="h-4 w-4" />
            </RoundIconButton>
          )}
        </div>
        <div className="no-scrollbar flex flex-col gap-3 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

interface SettingRowProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  tone?: 'cream' | 'coral';
}

/** Ligne de réglage : titre et explication à gauche, commande à droite. */
export function SettingRow({ title, description, children, tone = 'cream' }: SettingRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-3.5 ${
        tone === 'coral' ? 'border-coral-400/50 bg-coral-400/10' : 'border-cream-200 bg-cream-50'
      }`}
    >
      <div className="min-w-0">
        <div className={`text-sm font-bold ${tone === 'coral' ? 'text-coral-600' : ''}`}>{title}</div>
        {description && <div className="text-xs leading-snug text-ink-600">{description}</div>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
