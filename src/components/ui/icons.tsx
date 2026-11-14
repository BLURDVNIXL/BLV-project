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

/* ───────── Médaillons colorés (dessinés pour BLV, dans l'esprit de la planche) ───────── */

interface DiscProps {
  id: string;
  top: string;
  bottom: string;
  edge: string;
  className?: string;
  children: React.ReactNode;
}

/** Disque brillant : dégradé radial, contour foncé, reflet en arc. Les glyphes se dessinent dans un repère 48×48. */
function Disc({ id, top, bottom, edge, className = 'h-7 w-7', children }: DiscProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={bottom} />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill={`url(#${id})`} stroke={edge} strokeWidth="3" />
      {children}
      <path d="M11.5 17a14 14 0 0 1 10-8" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Étoile dorée : la jauge d'Étoile / de Chance. */
export function StarBadge({ className }: IconProps) {
  return (
    <Disc id="bd-star" top="#ffd76a" bottom="#f08a00" edge="#a8560a" className={className}>
      <path d="M24 10.5l4.1 8.4 9.2 1.3-6.7 6.5 1.6 9.2L24 31.5l-8.2 4.4 1.6-9.2-6.7-6.5 9.2-1.3z" fill="#fff6c8" stroke="#a8560a" strokeWidth="2" strokeLinejoin="round" />
    </Disc>
  );
}

/** Liasse de billets : l'argent liquide. */
export function CashBadge({ className }: IconProps) {
  return (
    <Disc id="bd-cash" top="#7fe08a" bottom="#1f8a38" edge="#125a24" className={className}>
      <rect x="9.5" y="16" width="29" height="17" rx="3" fill="#eaffd6" stroke="#125a24" strokeWidth="2" />
      <circle cx="24" cy="24.5" r="4.6" fill="#7fe08a" stroke="#125a24" strokeWidth="1.8" />
      <circle cx="14.5" cy="24.5" r="1.4" fill="#125a24" />
      <circle cx="33.5" cy="24.5" r="1.4" fill="#125a24" />
    </Disc>
  );
}

/** Diamant : la monnaie rare. */
export function GemBadge({ className }: IconProps) {
  return (
    <Disc id="bd-gem" top="#6dd6ff" bottom="#1479b8" edge="#0b4f7c" className={className}>
      <path d="M14.5 19.5L19 13.5h10l4.5 6-9.5 15.5z" fill="#d4f6ff" stroke="#0b4f7c" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14.5 19.5h19M19 13.5l5 6 5-6M24 19.5L24 35" stroke="#0b4f7c" strokeWidth="1.6" strokeLinejoin="round" fill="none" strokeOpacity="0.7" />
    </Disc>
  );
}

/** Cœur : la vie et l'amour. */
export function HeartBadge({ className }: IconProps) {
  return (
    <Disc id="bd-heart" top="#ff8a9a" bottom="#c92d48" edge="#86182c" className={className}>
      <path d="M24 34.5C11.5 26 13 15.5 19.2 15.2c2.8-.1 4.8 1.7 4.8 4 0-2.3 2-4.1 4.8-4 6.2.3 7.7 10.8-4.8 19.3z" fill="#fff" stroke="#86182c" strokeWidth="1.8" strokeLinejoin="round" />
    </Disc>
  );
}

/** Éclair : l'énergie. */
export function BoltBadge({ className }: IconProps) {
  return (
    <Disc id="bd-bolt" top="#ffc857" bottom="#e07100" edge="#a8480a" className={className}>
      <path d="M27.5 9.5L15 26h8l-3 12.5L33 21.5h-8.2z" fill="#fff6b0" stroke="#a8480a" strokeWidth="2" strokeLinejoin="round" />
    </Disc>
  );
}

/** Groupe de personnes : le multijoueur. */
export function GroupBadge({ className }: IconProps) {
  return (
    <Disc id="bd-group" top="#5fc8f7" bottom="#1479b8" edge="#0b4f7c" className={className}>
      <circle cx="24" cy="18.5" r="4.6" fill="#fff" />
      <path d="M15.5 33c0-5 3.8-8 8.5-8s8.5 3 8.5 8z" fill="#fff" />
      <circle cx="14.5" cy="21" r="3.2" fill="#d4f0ff" />
      <circle cx="33.5" cy="21" r="3.2" fill="#d4f0ff" />
    </Disc>
  );
}

/** Engrenage : les réglages. */
export function GearBadge({ className }: IconProps) {
  return (
    <Disc id="bd-gear" top="#b88cf5" bottom="#6a35c0" edge="#43207f" className={className}>
      <path d="M24 9.5v5M24 33.5v5M9.5 24h5M33.5 24h5M13.8 13.8l3.5 3.5M30.7 30.7l3.5 3.5M13.8 34.2l3.5-3.5M30.7 17.3l3.5-3.5" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" />
      <circle cx="24" cy="24" r="8" fill="#fff" />
      <circle cx="24" cy="24" r="3.6" fill="#8a4fe0" />
    </Disc>
  );
}

/** Épingle : un lieu sur la carte. */
export function PinBadge({ className }: IconProps) {
  return (
    <Disc id="bd-pin" top="#ff8a8a" bottom="#c92d2d" edge="#7c1414" className={className}>
      <path d="M24 10c-6 0-10 4.4-10 9.7C14 27 24 38 24 38s10-11 10-18.3C34 14.4 30 10 24 10z" fill="#fff" stroke="#7c1414" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="24" cy="19.5" r="4" fill="#c92d2d" />
    </Disc>
  );
}

/** Calendrier : le jour de la vie. */
export function CalendarBadge({ className }: IconProps) {
  return (
    <Disc id="bd-cal" top="#72dd84" bottom="#1f8a38" edge="#125a24" className={className}>
      <rect x="11" y="13" width="26" height="23" rx="4" fill="#fff" stroke="#125a24" strokeWidth="2" />
      <rect x="11" y="13" width="26" height="7" rx="3" fill="#e6fbe4" stroke="#125a24" strokeWidth="2" />
      <path d="M17.5 10.5v5M30.5 10.5v5" stroke="#125a24" strokeWidth="3" strokeLinecap="round" />
      <g fill="#2fae48">
        <circle cx="17.5" cy="26" r="1.6" /><circle cx="24" cy="26" r="1.6" /><circle cx="30.5" cy="26" r="1.6" />
        <circle cx="17.5" cy="31.5" r="1.6" /><circle cx="24" cy="31.5" r="1.6" /><circle cx="30.5" cy="31.5" r="1.6" />
      </g>
    </Disc>
  );
}
