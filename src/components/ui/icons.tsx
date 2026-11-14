/**
 * Icônes originales de BLV (SVG, sans texte incrusté).
 * Inspirées du style de la planche : formes rondes, couleurs franches, reflet doux.
 */

interface IconProps {
  className?: string;
}

/** Pièce de FCFA : médaillon doré avec un « F » stylisé. */
export function FcfaCoin({ className = 'h-7 w-7' }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="fcfa-g" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffe9a0" />
          <stop offset="60%" stopColor="#ffb62e" />
          <stop offset="100%" stopColor="#e07b00" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="url(#fcfa-g)" stroke="#a8560a" strokeWidth="3" />
      <circle cx="24" cy="24" r="15.5" fill="none" stroke="#fff3c4" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M18.5 33V15h11.5M18.5 23.5h9" fill="none" stroke="#8a4308" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13.5a14 14 0 0 1 9-5" stroke="#fff" strokeOpacity="0.75" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Emblème du jeu : soleil levant sur la lagune, avec un palmier. */
export function SunLagoonEmblem({ className = 'h-20 w-20' }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="emb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd27a" />
          <stop offset="100%" stopColor="#ff9a4d" />
        </linearGradient>
        <linearGradient id="emb-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4cc3f5" />
          <stop offset="100%" stopColor="#1479b8" />
        </linearGradient>
        <clipPath id="emb-clip">
          <rect x="4" y="4" width="88" height="88" rx="26" />
        </clipPath>
      </defs>
      <g clipPath="url(#emb-clip)">
        <rect width="96" height="96" fill="url(#emb-sky)" />
        <circle cx="48" cy="56" r="22" fill="#fff4c2" opacity="0.55" />
        <circle cx="48" cy="56" r="15" fill="#fff9e0" />
        <rect y="58" width="96" height="40" fill="url(#emb-sea)" />
        <path d="M6 66q10-5 21 0t21 0 21 0 21 0" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M10 77q9-4 19 0t19 0 19 0 19 0" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
        {/* palmier */}
        <path d="M70 62c1-10 0-18-3-26" stroke="#7a4a22" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M67 36c-7-8-15-7-19-3 8-1 13 1 19 3zM67 36c-2-10 3-17 10-18-4 5-6 11-10 18zM67 36c9-5 17-2 20 4-8-3-14-3-20-4zM67 36c-8 1-12 8-11 14 3-7 6-10 11-14z" fill="#2fae48" stroke="#1f8a38" strokeWidth="1.2" strokeLinejoin="round" />
      </g>
      <rect x="4" y="4" width="88" height="88" rx="26" fill="none" stroke="#fff" strokeWidth="4" />
      <rect x="4" y="4" width="88" height="88" rx="26" fill="none" stroke="#c9722a" strokeOpacity="0.55" strokeWidth="1.5" />
    </svg>
  );
}
