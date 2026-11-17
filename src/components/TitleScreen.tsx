import { useEffect, useRef, useState } from 'react';
import { PWAInstallButton, usePWAInstall } from './PWAInstallPrompt';
import { useMediaQuery } from './useMediaQuery';
import './titleScreen.css';
import logo from '../assets/blv-logo.png';
import saveArt from '../assets/save-background.jpeg';

interface TitleScreenProps {
  hasSavedGame: boolean;
  savedDestinyName?: string;
  onStartNewGame: () => void;
  onContinueGame: () => void;
  language?: 'fr' | 'en';
  showHud: boolean;
  onToggleHud: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  onToggleLanguage: () => void;
  onEraseData: () => void | Promise<void>;
  pcControlsMode: 'zqsl' | 'arrows';
  onChangeControlsMode: (mode: 'zqsl' | 'arrows') => void;
}

type Action = 'new' | 'continue' | 'settings' | 'trophies' | 'last';
const ACTIONS: Action[] = ['new', 'continue', 'settings', 'trophies', 'last'];
const SLOT_COUNT = 5;

/** Textes affichés (le jeu doit pouvoir passer en anglais : jamais de texte dans les images). */
const TEXT = {
  fr: {
    new: 'Nouvelle partie', continue: 'Continuer', settings: 'Paramètres', trophies: 'Trophées', quit: 'Quitter', install: 'Installer',
    soon: 'Option bientôt disponible', back: 'Retour', backToMenu: 'Retour au menu principal',
    save: (n: number) => `Sauvegarde ${n}`, empty: 'Emplacement vide',
    quitHint: 'Tu peux fermer cette fenêtre pour quitter le jeu',
    quitApp: 'Ferme l’app depuis ton téléphone (glisse vers le haut)',
    installHint: 'Menu du navigateur → « Ajouter à l’écran d’accueil »',
    installed: 'App installée : ouvre-la depuis ton écran d’accueil',
    menuLabel: 'Menu principal',
    screenLabel: 'Menu du jeu sur l’écran de la borne arcade', saveLabel: 'Sélection des sauvegardes',
    hudVisible: 'HUD visible', hudHidden: 'HUD masqué', controls: 'Contrôles', wasd: 'ZQSL', arrows: 'Flèches', settingsTitle: 'Réglages',
    sound: 'Son', language: 'Langue', eraseData: 'Effacer mes données', confirmErase: 'Confirmer l’effacement ?', eraseDone: 'Données effacées',
  },
  en: {
    new: 'New game', continue: 'Continue', settings: 'Settings', trophies: 'Trophies', quit: 'Quit', install: 'Install',
    soon: 'Option coming soon', back: 'Back', backToMenu: 'Back to main menu',
    save: (n: number) => `Save ${n}`, empty: 'Empty slot',
    quitHint: 'You can close this window to quit the game',
    quitApp: 'Close the app from your phone (swipe up)',
    installHint: 'Browser menu → “Add to Home screen”',
    installed: 'App installed: open it from your home screen',
    menuLabel: 'Main menu',
    screenLabel: 'Game menu on the arcade cabinet screen', saveLabel: 'Save selection',
    hudVisible: 'HUD visible', hudHidden: 'HUD hidden', controls: 'Controls', wasd: 'ZQSL', arrows: 'Arrow keys', settingsTitle: 'Settings',
    sound: 'Sound', language: 'Language', eraseData: 'Erase my data', confirmErase: 'Confirm erasure?', eraseDone: 'Data erased',
  },
} as const;

/** L'intro (logo) ne se rejoue pas quand on revient à l'écran depuis la création du personnage. */
let introPlayed = false;

/** Vrai quand le jeu tourne dans la PWA installée (Android/bureau : display-mode, iOS : navigator.standalone). */
function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

/**
 * Écran de démarrage « borne d'arcade » : le menu s'affiche sur l'écran CRT de la borne.
 * « Continuer » ouvre l'écran des sauvegardes (5 emplacements ; seul le 1 est relié à la sauvegarde unique du jeu).
 * Dernière entrée : sur mobile dans le navigateur « Installer » (installe la PWA) ; dans la PWA installée, et sur ordinateur, « Quitter ».
 * Clavier : ↑/↓ choisir, Entrée valider, Échap ou Retour arrière revenir.
 */
export function TitleScreen({ hasSavedGame, savedDestinyName, onStartNewGame, onContinueGame, language = 'fr', showHud, onToggleHud, isMuted, onToggleSound, onToggleLanguage, onEraseData, pcControlsMode, onChangeControlsMode }: TitleScreenProps) {
  const t = TEXT[language];
  const isMobile = useMediaQuery('(pointer: coarse)');
  const { canInstall, promptInstall } = usePWAInstall();
  const [standalone] = useState(isStandaloneApp);
  const [justInstalled, setJustInstalled] = useState(false);
  const installMode = isMobile && !standalone && !justInstalled;

  const [quick] = useState(() => introPlayed);
  const [selected, setSelected] = useState(0);
  const [panel, setPanel] = useState<'menu' | 'settings' | 'trophies'>('menu');
  const [saveOpen, setSaveOpen] = useState(false);
  const [selectedSave, setSelectedSave] = useState(0);
  const [confirmErase, setConfirmErase] = useState(false);
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => { introPlayed = true; }, 2800);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = (message: string) => {
    setToast(message);
    setToastVisible(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 2600);
  };

  useEffect(() => {
    const onInstalled = () => { setJustInstalled(true); showToast(t.installed); };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const labelOf = (action: Action) => (action === 'last' ? (installMode ? t.install : t.quit) : t[action]);

  const handleLast = () => {
    if (installMode) {
      if (canInstall) void promptInstall();
      else showToast(t.installHint);
      return;
    }
    if (standalone) {
      // Ferme la fenêtre de la PWA ; certains systèmes (iOS) l'interdisent : on indique alors quoi faire.
      window.close();
      window.setTimeout(() => showToast(t.quitApp), 350);
      return;
    }
    showToast(t.quitHint);
  };

  const activate = (action: Action) => {
    if (action === 'new') onStartNewGame();
    else if (action === 'continue') { setSelectedSave(0); setSaveOpen(true); }
    else if (action === 'settings' || action === 'trophies') setPanel(action);
    else handleLast();
  };

  const confirmSave = (slot: number) => {
    if (slot === 1 && hasSavedGame) onContinueGame();
    else showToast(t.empty);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const down = event.key === 'ArrowDown';
      const up = event.key === 'ArrowUp';
      const back = event.key === 'Escape' || event.key === 'Backspace';
      if (saveOpen) {
        if (down || up) { event.preventDefault(); setSelectedSave((i) => (i + (down ? 1 : -1) + SLOT_COUNT) % SLOT_COUNT); }
        else if (event.key === 'Enter') { event.preventDefault(); confirmSave(selectedSave + 1); }
        else if (back) setSaveOpen(false);
        return;
      }
      if (panel !== 'menu') {
        if (event.key === 'Enter' || back) { event.preventDefault(); setPanel('menu'); }
        return;
      }
      if (down || up) { event.preventDefault(); setSelected((i) => (i + (down ? 1 : -1) + ACTIONS.length) % ACTIONS.length); }
      else if (event.key === 'Enter') { event.preventDefault(); activate(ACTIONS[selected]); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveOpen, panel, selected, selectedSave, hasSavedGame, onContinueGame, onStartNewGame, language, installMode, canInstall, standalone]);

  return (
    <div className={`ts-root${quick ? ' ts-quick' : ''}`}>
      <h1 className="sr-only">BLV</h1>
      <main className="ts-stage">
        <div className="ts-vignette" />
        <section className="ts-crt" aria-label={t.screenLabel}>
          <div className="ts-menu-view">
            {panel === 'menu' && (
              <nav className="ts-menu-list" aria-label={t.menuLabel}>
                {ACTIONS.map((action, i) => (
                  <button
                    key={action}
                    type="button"
                    className={`ts-choice${i === selected ? ' active' : ''}`}
                    data-start={action === 'new' ? 'true' : undefined}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => { setSelected(i); activate(action); }}
                  >
                    {labelOf(action)}
                  </button>
                ))}
              </nav>
            )}
            {panel === 'settings' && (
              <div className="ts-sub">
                <h2>{t.settingsTitle}</h2>
                <div className="ts-setting-row">
                  <span>{showHud ? t.hudVisible : t.hudHidden}</span>
                  <button type="button" onClick={onToggleHud}>{showHud ? 'ON' : 'OFF'}</button>
                </div>
                <div className="ts-setting-row">
                  <span>{t.controls}</span>
                  <button type="button" onClick={() => onChangeControlsMode(pcControlsMode === 'zqsl' ? 'arrows' : 'zqsl')}>
                    {pcControlsMode === 'zqsl' ? t.wasd : t.arrows}
                  </button>
                </div>
                <div className="ts-setting-row">
                  <span>{t.sound}</span>
                  <button type="button" onClick={onToggleSound}>{isMuted ? 'OFF' : 'ON'}</button>
                </div>
                <div className="ts-setting-row">
                  <span>{t.language}</span>
                  <button type="button" onClick={onToggleLanguage}>{language === 'fr' ? 'FR' : 'EN'}</button>
                </div>
                {confirmErase ? (
                  <div className="ts-setting-row">
                    <span>{t.confirmErase}</span>
                    <button type="button" onClick={async () => { await onEraseData(); setConfirmErase(false); showToast(t.eraseDone); }}>
                      OK
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmErase(true)}>{t.eraseData}</button>
                )}
                <button type="button" onClick={() => setPanel('menu')}>{t.back}</button>
              </div>
            )}
            {panel === 'trophies' && (
              <div className="ts-sub">
                <h2>{t.trophies}</h2>
                <p className="ts-soon">{t.soon}</p>
                <button type="button" onClick={() => setPanel('menu')}>{t.back}</button>
              </div>
            )}
            {panel === 'menu' && null}
          </div>
        </section>
        <div className={`ts-toast${toastVisible ? ' show' : ''}`} role="status" aria-live="polite">{toast}</div>
      </main>

      {/* Sur ordinateur, le bouton d'installation reste disponible ; sur mobile c'est l'entrée « Installer » du menu. */}
      {!isMobile && !standalone && <div className="ts-pwa"><PWAInstallButton lang={language} /></div>}

      {saveOpen && (
        <section className="ts-save" aria-label={t.saveLabel}>
          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <filter id="blvHeatWarp" x="-8%" y="-8%" width="116%" height="116%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="8" result="noise">
                <animate attributeName="baseFrequency" dur="8s" values="0.010 0.014;0.018 0.025;0.011 0.017;0.010 0.014" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" dur="6s" values="9;19;12;9" repeatCount="indefinite" />
              </feDisplacementMap>
            </filter>
          </svg>
          <img className="ts-save-art" src={saveArt} alt="" />
          <div className="ts-save-list">
            {Array.from({ length: SLOT_COUNT }, (_, i) => {
              const filled = i === 0 && hasSavedGame;
              return (
                <button
                  key={i}
                  type="button"
                  className={`ts-save-option${i === selectedSave ? ' active' : ''}${filled ? '' : ' empty'}`}
                  onMouseEnter={() => setSelectedSave(i)}
                  onClick={() => { setSelectedSave(i); confirmSave(i + 1); }}
                >
                  {t.save(i + 1)}
                  {filled && savedDestinyName && <small>{savedDestinyName}</small>}
                </button>
              );
            })}
          </div>
          <button type="button" className="ts-save-back" aria-label={t.backToMenu} title={t.backToMenu} onClick={() => setSaveOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 12H5" /><path d="M11 6l-6 6 6 6" />
            </svg>
          </button>
          <div className="ts-crt-overlay" />
        </section>
      )}

      <div className="ts-intro" aria-hidden="true"><img src={logo} alt="" /></div>
    </div>
  );
}
