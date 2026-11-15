import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MapPin, Sparkles } from 'lucide-react';
import { Destiny, DestinyRarity, PlayerGender, PlayerProfile } from '../types/game';
import { ALL_DESTINIES } from '../core/destinies';
import { rollDestiny } from '../core/simulation';
import { NAME_MAX, NAME_MIN, sanitizeName } from '../core/profile';
import { soundEngine } from '../audio/soundEngine';
import characterArt from '../assets/character.webp';
import './newLife.css';

interface NewLifeScreenProps {
  /** Pseudonyme et genre déjà utilisés sur cet appareil (préremplissage). */
  initialProfile: PlayerProfile | null;
  /** Retour possible (une partie existe déjà). */
  canClose: boolean;
  onClose: () => void;
  /** Le joueur entre à Abidjan avec le destin tiré par le carrousel. */
  onEnter: (destiny: Destiny, profile: PlayerProfile) => void;
}

type Phase = 'form' | 'spin' | 'landed';

const RARITY_LABEL: Record<DestinyRarity, string> = {
  commune: 'Commune',
  rare: 'Rare',
  epique: 'Épique',
  legendaire: 'Légendaire',
};

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Particules lumineuses discrètes, adaptées à la taille de l'écran. */
function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let points: { x: number; y: number; r: number; a: number; s: number; phase: number }[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(60, Math.floor((w * h) / 14500));
      points = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 1.7,
        a: 0.15 + Math.random() * 0.55,
        s: 0.08 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t = 0) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of points) {
        const glow = 0.55 + 0.45 * Math.sin(t * 0.0008 + p.phase);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${150 + Math.floor(65 * glow)},${205 + Math.floor(40 * glow)},${p.a * glow})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255,130,190,.65)';
        ctx.fill();
        ctx.shadowBlur = 0;
        if (!reduced) {
          p.y -= p.s;
          if (p.y < -5) {
            p.y = h + 5;
            p.x = Math.random() * w;
          }
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [canvasRef]);
}

interface DestinyCarouselProps {
  order: Destiny[];
  targetId: string;
  settled: boolean;
  onSettled: () => void;
}

/**
 * Carrousel 3D : les 19 destins défilent vite, puis ralentissent jusqu'à s'arrêter sur le destin tiré.
 * Le tirage est fait avant l'animation (`targetId`) ; le carrousel ne fait que la mise en scène.
 */
function DestinyCarousel({ order, targetId, settled, onSettled }: DestinyCarouselProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useEffect(() => {
    const stage = stageRef.current;
    const cards = cardRefs.current.slice(0, order.length).filter((c): c is HTMLElement => Boolean(c));
    const N = order.length;
    if (!stage || cards.length !== N) return;

    const mod = (x: number) => ((x % N) + N) % N;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetIdx = Math.max(0, order.findIndex((d) => d.id === targetId));
    const startIdx = Math.floor(Math.random() * N);
    const distance = 2 * N + mod(targetIdx - startIdx);
    const DURATION = reduced ? 0 : 5600;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3.4);
    const last = cards.map(() => ({ vis: null as boolean | null, fx: null as number | null, front: null as boolean | null }));

    let pos = startIdx;
    let w = 0;
    let xSide = 0;
    let raf = 0;
    let lastRound = Math.round(pos);
    let lastTick = 0;
    let done = false;

    const render = () => {
      for (let i = 0; i < N; i++) {
        const card = cards[i];
        const st = last[i];
        const p = mod(i - pos + N / 2) - N / 2;
        const a = Math.abs(p);
        const s = p < 0 ? -1 : 1;

        let x: number;
        let z: number;
        let r: number; // les cartes latérales se tournent vers le centre : on ne voit jamais leur dos
        let o: number;
        if (a <= 1) {
          x = s * xSide * a;
          z = -0.325 * w * a;
          r = -s * 62 * (1 - Math.pow(1 - a, 1.6));
          o = 1;
        } else {
          const t = a - 1;
          x = s * xSide * (1 + t * 1.6);
          z = -0.325 * w;
          r = -s * (62 + 14 * t);
          o = Math.max(0, 1 - t * 1.6);
        }
        card.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${r}deg)`;
        card.style.opacity = String(o);
        card.style.zIndex = String(Math.round(10 - a * 4));

        const vis = o > 0;
        if (vis !== st.vis) {
          st.vis = vis;
          card.style.visibility = vis ? 'visible' : 'hidden';
        }
        const front = a <= 0.15;
        if (front !== st.front) {
          st.front = front;
          card.classList.toggle('is-front', front);
        }
        const fx = front ? 0 : 1;
        if (fx !== st.fx) {
          st.fx = fx;
          card.style.filter = fx === 0 ? 'none' : 'brightness(0.68) saturate(0.85)';
        }
      }
    };

    const measure = () => {
      w = cards[0].offsetWidth;
      xSide = Math.max(w * 1.05, Math.min(stage.clientWidth / 2, w * 2.2));
      render();
    };

    const finish = () => {
      if (done) return;
      done = true;
      pos = targetIdx;
      render();
      navigator.vibrate?.([30, 40, 60]);
      settledRef.current();
    };

    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    measure();

    if (DURATION === 0) {
      finish();
    } else {
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / DURATION);
        pos = startIdx + distance * ease(k);
        render();
        const rounded = Math.round(pos);
        if (rounded !== lastRound) {
          lastRound = rounded;
          if (now - lastTick > 40) {
            lastTick = now;
            soundEngine.playTick();
          }
        }
        if (k < 1) raf = requestAnimationFrame(tick);
        else finish();
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [order, targetId]);

  return (
    <div className={`nl-carousel ${settled ? 'is-settled' : ''}`}>
      <div className="nl-stage" ref={stageRef} aria-hidden={!settled}>
        {order.map((d, i) => (
          <article
            key={d.id}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="nl-card"
            style={{ ['--c' as string]: d.color }}
          >
            <span className="nl-card__rarity" style={{ color: d.color, filter: 'brightness(1.5)' }}>
              {RARITY_LABEL[d.rarity]}
            </span>
            <h3 className="nl-card__title">{d.name}</h3>
            <div className="nl-card__hero">
              <span>{d.startingCash.toLocaleString('fr-FR')}</span>
              <sup>F</sup>
            </div>
            <p className="nl-card__sub">{d.subtitle}</p>
            <div className="nl-card__foot">
              <span>
                <MapPin aria-hidden="true" />
                {d.district}
              </span>
              <span>
                <Sparkles aria-hidden="true" />
                Étoile {d.startingStar}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/**
 * Écran de création du personnage puis tirage du destin.
 * 1. Pseudonyme + genre + PLAY. 2. Le carrousel tourne et s'arrête sur le destin tiré (pondération du GDD).
 * 3. « Entrer à Abidjan ». Le destin est imposé : pas de choix, pas de nouveau tirage.
 */
export function NewLifeScreen({ initialProfile, canClose, onClose, onEnter }: NewLifeScreenProps) {
  const [phase, setPhase] = useState<Phase>('form');
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [gender, setGender] = useState<PlayerGender | null>(initialProfile?.gender ?? null);
  const [result, setResult] = useState<Destiny | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const order = useMemo(() => shuffled(ALL_DESTINIES), []);
  useParticles(particlesRef);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity() || !gender) return;
    const cleaned = sanitizeName(name);
    if (cleaned.length < NAME_MIN) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    setProfile({ name: cleaned, gender });
    setResult(rollDestiny());
    setPhase('spin');
  };

  const handleSettled = () => {
    soundEngine.playJingle();
    setPhase('landed');
  };

  const enter = () => {
    if (result && profile) onEnter(result, profile);
  };

  useEffect(() => {
    if (phase !== 'landed') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        enter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result, profile]);

  return (
    <div className="nl-root" role="dialog" aria-modal="true" aria-label="Création du personnage et roulette du destin">
      <div className="nl-bg" aria-hidden="true" />
      <div className="nl-vignette" aria-hidden="true" />
      <canvas ref={particlesRef} className="nl-particles" aria-hidden="true" />

      {phase === 'form' && (
        <div className="nl-layer">
          {canClose && (
            <button type="button" className="nl-back" onClick={onClose}>
              <ArrowLeft size={14} aria-hidden="true" />
              Retour
            </button>
          )}
          <section className="nl-left">
            <p className="nl-eyebrow">Babi Life Vibes</p>
            <form className="nl-form" onSubmit={handleSubmit}>
              <input
                className="nl-input"
                type="text"
                name="pseudo"
                placeholder="TON PSEUDO"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                maxLength={NAME_MAX}
                minLength={NAME_MIN}
                autoComplete="nickname"
                required
                aria-label="Ton pseudo"
              />
              <div className="nl-genders" role="radiogroup" aria-label="Choix du personnage">
                <div className="nl-gender">
                  <input type="radio" name="gender" id="nl-male" value="homme" checked={gender === 'homme'} onChange={() => setGender('homme')} required />
                  <label htmlFor="nl-male">HOMME</label>
                </div>
                <div className="nl-gender">
                  <input type="radio" name="gender" id="nl-female" value="femme" checked={gender === 'femme'} onChange={() => setGender('femme')} required />
                  <label htmlFor="nl-female">FEMME</label>
                </div>
              </div>
              <button className="nl-play" type="submit" data-start="true">
                PLAY&nbsp; ↗
              </button>
            </form>
          </section>
          <section className="nl-right" aria-hidden="true">
            <div className="nl-glow" />
            <div className="nl-line nl-line-1" />
            <div className="nl-line nl-line-2" />
            <img className="nl-character" src={characterArt} alt="" />
          </section>
        </div>
      )}

      {phase !== 'form' && result && (
        <div className="nl-layer">
          <div className="nl-head" role="status" aria-live="polite">
            {phase === 'landed' ? 'Ton destin' : 'La roulette du destin'}
          </div>
          <DestinyCarousel order={order} targetId={result.id} settled={phase === 'landed'} onSettled={handleSettled} />
          <div className={`nl-result ${phase === 'landed' ? 'is-shown' : ''}`}>
            <p className="nl-quote">« {result.quote.replace(/^«\s*|\s*»$/g, '')} »</p>
            <p className="nl-perk">Atout spécial : {result.perk}</p>
            <button type="button" className="nl-play" onClick={enter} data-enter="true" tabIndex={phase === 'landed' ? 0 : -1}>
              ENTRER À ABIDJAN · {result.district.toUpperCase()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
