import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type JellyTone = 'sun' | 'lagoon' | 'palm' | 'coral' | 'plum' | 'cream';
export type JellySize = 'sm' | 'md' | 'lg';

const SIZE: Record<JellySize, string> = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-6 py-3.5 text-lg md:text-xl',
};

interface JellyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: JellyTone;
  size?: JellySize;
  icon?: ReactNode;
}

/** Bouton « gélatine » : un grand bouton clair avec une icône optionnelle. Le texte reste du vrai texte (traduisible). */
export function JellyButton({ tone = 'sun', size = 'md', icon, children, className = '', type = 'button', ...rest }: JellyButtonProps) {
  return (
    <button type={type} className={`jelly jelly-${tone} ${SIZE[size]} ${className}`} {...rest}>
      {icon}
      <span className="relative">{children}</span>
    </button>
  );
}

const ROUND: Record<JellySize, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

interface RoundIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: JellyTone;
  size?: JellySize;
  /** Obligatoire : un bouton sans texte doit rester lisible par les lecteurs d'écran. */
  label: string;
  children: ReactNode;
}

/** Pastille ronde cliquable (icône seule). */
export function RoundIconButton({ tone = 'sun', size = 'md', label, children, className = '', type = 'button', ...rest }: RoundIconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={`jelly jelly-round jelly-${tone} ${ROUND[size]} ${className}`} {...rest}>
      <span className="relative flex items-center justify-center">{children}</span>
    </button>
  );
}
