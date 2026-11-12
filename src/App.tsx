/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Moteur & Application Principale (GTA San Andreas × Les Sims à Abidjan)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CharacterProfile,
  DestinyClass,
  PlayerState,
  SchoolBadgeId,
  FoodItem
} from './types/game';
import { ALL_DESTINIES } from './data/destinies';
import {
  savePlayerState,
  loadPlayerState,
  loadSettings,
  saveSettings,
  GameSettings
} from './services/storageService';
import { radioService } from './services/radioService';
import { narratorService } from './services/narratorService';

import { OrientationGuard } from './components/OrientationGuard';
import { StartScreen } from './components/StartScreen';
import { CharacterCreation } from './components/CharacterCreation';
import { DestinyRoulette } from './components/DestinyRoulette';
import { CinematicIntro } from './components/CinematicIntro';
import { ThreeCanvas } from './components/ThreeCanvas';
import { GameHUD } from './components/GameHUD';
import { VirtualController } from './components/VirtualController';
import { SmartphoneModal } from './components/SmartphoneModal';
import { FoodMenuModal } from './components/FoodMenuModal';
import { AbidjanMapModal } from './components/AbidjanMapModal';
import { AdminSandboxModal } from './components/AdminSandboxModal';
import { TragicEndingModal } from './components/TragicEndingModal';
import { HeldControls, createHeldControls } from './physics/controls';

type AppScreen = 'start' | 'char_creation' | 'destiny_roulette' | 'cinematic_intro' | 'game';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('start');
  const [settings, setSettings] = useState<GameSettings>(loadSettings());
  const [hasSaveGame, setHasSaveGame] = useState<boolean>(false);

  // Ébauche temporaire pour la création du personnage
  const [tempCharacter, setTempCharacter] = useState<CharacterProfile | null>(null);

  // État Maître du Joueur
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);

  // Modals en jeu
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isTragicEndingOpen, setIsTragicEndingOpen] = useState(false);
  const [tragicReason, setTragicReason] = useState<string>('');

  // Mode de caméra 3D ('shoulder' GTA 3e personne ou 'topdown' Sims isométrique)
  const [cameraMode, setCameraMode] = useState<'shoulder' | 'topdown'>('topdown');

  // Manette de Déplacement (Joystick / Clavier)
  const [moveDirection, setMoveDirection] = useState({ x: 0, y: 0 });
  // Commandes maintenues (Shift / Espace / □ / ◯) : par référence, sans re-rendu à 60 images/s
  const heldControls = useRef<HeldControls>(createHeldControls());
  // Action ✕ / E / F : déléguée à la scène 3D (voiture, mobilier, lycées) ; repos rapide sinon
  const crossActionRef = useRef<(() => boolean) | null>(null);

  // Notifications toast en jeu
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Vérifier présence d'une sauvegarde au démarrage
  useEffect(() => {
    const existing = loadPlayerState();
    if (existing) {
      setHasSaveGame(true);
    }
  }, []);

  // Synchroniser le volume audio & narrateur avec les réglages
  useEffect(() => {
    radioService.setVolume(settings.radioVolume);
    narratorService.setEnabled(settings.voiceOverEnabled);
  }, [settings]);

  // Sauvegarde automatique régulière quand en jeu
  useEffect(() => {
    if (currentScreen !== 'game' || !playerState) return;

    const interval = window.setInterval(() => {
      savePlayerState(playerState);
    }, 20000);

    return () => clearInterval(interval);
  }, [currentScreen, playerState]);

  // Boucle de simulation temps accéléré & besoins
  useEffect(() => {
    if (currentScreen !== 'game' || !playerState || isTragicEndingOpen) return;

    // 1 tick toutes les 2.5 secondes = +1 minute in-game
    const tickInterval = window.setInterval(() => {
      setPlayerState((prev) => {
        if (!prev) return prev;

        const nextMinute = prev.inGameMinute + 1;
        const isNewDay = nextMinute >= 1440;
        const currentMin = isNewDay ? 0 : nextMinute;
        const currentDay = isNewDay ? prev.dayCount + 1 : prev.dayCount;

        // Décroissance lente des besoins vitaux
        const faimDecay = 0.05;
        const energieDecay = 0.04;
        const hygieneDecay = 0.03;
        const vessieDecay = 0.06;
        const socialDecay = 0.03;
        const loisirsDecay = 0.04;

        const newNeeds = {
          faim: Math.max(0, prev.needs.faim - faimDecay),
          energie: Math.max(0, prev.needs.energie - energieDecay),
          hygiene: Math.max(0, prev.needs.hygiene - hygieneDecay),
          vessie: Math.max(0, prev.needs.vessie - vessieDecay),
          social: Math.max(0, prev.needs.social - socialDecay),
          loisirs: Math.max(0, prev.needs.loisirs - loisirsDecay),
        };

        // Calcul de la jauge universelle d'envie
        const avgNeeds = (newNeeds.faim + newNeeds.energie + newNeeds.hygiene + newNeeds.social + newNeeds.loisirs) / 5;
        const buffBonus = prev.envieBuff && currentMin < prev.envieBuff.expiresAtMin ? 15 : 0;
        const calculatedEnvie = Math.min(100, Math.max(0, Math.round(avgNeeds * 0.8 + (prev.luckStar * 0.2) + buffBonus)));

        // Vérification de la bourse Koidio de l'INP-HB (tous les 3 jours)
        let updatedCash = prev.cash;
        if (isNewDay && prev.destiny.isINPHB && currentDay % 3 === 0) {
          updatedCash += 50000;
          showToast(prev.isEnglishLocked ? "Scholarship paid: +50,000 FCFA" : "Bourse Koidio versée : +50 000 FCFA");
        }

        // Tontine mensuelle éventuelle (tous les 10 jours)
        if (isNewDay && prev.tontineJoined && currentDay % 10 === 0) {
          const tontineWin = 150000;
          updatedCash += tontineWin;
          showToast(prev.isEnglishLocked ? `Tontine jackpot! +${tontineWin.toLocaleString()} FCFA` : `Ramassage de Tontine ! +${tontineWin.toLocaleString()} FCFA`);
        }

        // Changement météo aléatoire au nouveau jour
        let newWeather = prev.weather;
        if (isNewDay) {
          const rand = Math.random();
          if (rand < 0.60) newWeather = 'sunny';
          else if (rand < 0.85) newWeather = 'rain_tropical';
          else if (rand < 0.95) newWeather = 'harmattan';
          else newWeather = 'flood_inondation';
        }

        // Fin tragique automatique si ruine critique et épuisement total
        if (newNeeds.faim <= 0 && newNeeds.energie <= 0 && updatedCash <= -25000) {
          setIsTragicEndingOpen(true);
          setTragicReason(prev.isEnglishLocked ? "Famine, debt and complete exhaustion" : "Famine, dettes écrasantes et épuisement extrême");
        }

        return {
          ...prev,
          dayCount: currentDay,
          inGameMinute: currentMin,
          needs: newNeeds,
          envieJauge: calculatedEnvie,
          cash: updatedCash,
          weather: newWeather
        };
      });
    }, 2500);

    return () => clearInterval(tickInterval);
  }, [currentScreen, playerState, isTragicEndingOpen, showToast]);

  // Commencer une nouvelle partie
  const handleNewGame = () => {
    setCurrentScreen('char_creation');
  };

  // Continuer la partie existante
  const handleContinueGame = () => {
    const saved = loadPlayerState();
    if (saved) {
      setPlayerState(saved);
      setCurrentScreen('game');
      showToast(saved.isEnglishLocked ? "Welcome back to Abidjan!" : "Re-bienvenue à Abidjan !");
    } else {
      setCurrentScreen('char_creation');
    }
  };

  // Après la personnalisation du personnage
  const handleCharacterConfirmed = (char: CharacterProfile) => {
    setTempCharacter(char);
    setCurrentScreen('destiny_roulette');
  };

  // Après la sélection / tirage du destin
  const handleDestinyConfirmed = (destiny: DestinyClass) => {
    if (!tempCharacter) return;

    const isEnglishLocked = destiny.isEnglishLocked || false;

    const initialState: PlayerState = {
      character: tempCharacter,
      destiny: destiny,
      cash: destiny.startingCash,
      bankBalance: 0,
      unlimitedCashUntilDay: destiny.isEnglishLocked ? 30 : undefined,
      luckStar: destiny.luckStat,
      policeHeat: destiny.isBaron ? 3 : (destiny.isBrouteur ? 1 : 0),
      criminalRecord: 0,
      currentCommune: destiny.commune,
      currentLocationName: `${destiny.commune} — ${destiny.homeLabel}`,
      dayCount: 1,
      inGameMinute: 480,
      weather: 'sunny',
      badges: [],
      degrees: [],
      relationshipStatus: 'celibataire',
      partnerAffinity: 0,
      needs: {
        faim: 85,
        energie: 90,
        hygiene: 80,
        vessie: 85,
        social: 60,
        loisirs: 70
      },
      envieJauge: 80,
      isEnglishLocked: isEnglishLocked,
      selectedRadioId: 'frequence2',
      isRadioPlaying: false,
      radioVolume: settings.radioVolume,
      tontineJoined: false,
      tontineBalance: 0
    };

    setPlayerState(initialState);
    savePlayerState(initialState);
    setHasSaveGame(true);

    setCurrentScreen('cinematic_intro');
  };

  // Fin de la cinématique
  const handleFinishCinematic = () => {
    setCurrentScreen('game');
  };

  // Action Manette : ✕ (Interagir avec le mobilier le plus proche ou action par défaut)
  const handleCrossAction = () => {
    if (!playerState) return;
    if (crossActionRef.current?.()) return;
    // Repos rapide si aucune action ciblée
    handleRest();
  };

  // Action Manette : △ (Ouvrir Smartphone BabiOS)
  const handleTriangleAction = () => {
    setIsPhoneOpen(true);
  };

  // Action Manette : ◯ (Basculer la radio)
  const handleCircleAction = () => {
    const isPlaying = radioService.togglePlay();
    setPlayerState((prev) => prev ? { ...prev, isRadioPlaying: isPlaying } : prev);
  };

  // Interaction avec un mobilier 3D spécifique cliqué ou approché
  const handleInteractFurniture = (actionType: string) => {
    if (!playerState) return;
    const isEng = playerState.isEnglishLocked;

    switch (actionType) {
      case 'bed':
        handleRest();
        break;
      case 'shower':
        handleShower();
        break;
      case 'fridge':
      case 'stove':
        setIsFoodModalOpen(true);
        break;
      case 'computer':
        setPlayerState((prev) => {
          if (!prev) return prev;
          const gain = prev.destiny.isBrouteur ? 45000 : 15000;
          return {
            ...prev,
            cash: prev.cash + gain,
            needs: { ...prev.needs, energie: Math.max(0, prev.needs.energie - 10), loisirs: Math.min(100, prev.needs.loisirs + 10) }
          };
        });
        showToast(isEng ? "Online freelance hustle completed! (+FCFA cash)" : "Travail en ligne effectué sur PC ! (+Argent FCFA)");
        break;
      case 'tv':
        setPlayerState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            needs: { ...prev.needs, loisirs: 100, social: Math.min(100, prev.needs.social + 15) }
          };
        });
        showToast(isEng ? "Relaxed watching RTI 1 show (+100% Fun)" : "Détente devant la RTI (+100% Loisirs)");
        break;
      case 'car':
        setIsMapOpen(true);
        break;
      default:
        handleRest();
        break;
    }
  };

  // Déplacement via la Carte d'Abidjan
  const handleTravelTo = (commune: string, locationName: string, travelType: 'walk' | 'woroworo' | 'car') => {
    if (!playerState) return;
    const isEng = playerState.isEnglishLocked;

    let cost = 0;
    let energyLoss = 5;

    if (travelType === 'woroworo') {
      cost = 200;
      energyLoss = 5;
    } else if (travelType === 'walk') {
      cost = 0;
      energyLoss = 15;
    } else if (travelType === 'car') {
      cost = 0;
      energyLoss = 2;
    }

    if (playerState.cash < cost) {
      showToast(isEng ? "Not enough FCFA for transportation" : "Pas assez d'argent pour le transport");
      return;
    }

    setPlayerState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cash: Math.max(0, prev.cash - cost),
        currentCommune: commune,
        currentLocationName: `${commune} — ${locationName}`,
        needs: {
          ...prev.needs,
          energie: Math.max(0, prev.needs.energie - energyLoss)
        }
      };
    });

    showToast(isEng ? `Arrived at ${locationName} (${commune})` : `Arrivé à ${locationName} (${commune})`);
  };

  // Aller au Travail (Système d'Emploi selon le Destin)
  const handleGoToWork = () => {
    if (!playerState) return;
    const isEng = playerState.isEnglishLocked;

    if (playerState.needs.energie < 15) {
      showToast(isEng ? "Too exhausted to work! Rest first." : "Trop épuisé pour travailler ! Repose-toi d'abord.");
      return;
    }

    // Salaire selon destin et chance
    const basePay = playerState.destiny.startingCash > 100000 ? 50000 : 25000;
    const bonusLucky = Math.round((playerState.luckStar / 100) * 15000);
    const totalSalary = basePay + bonusLucky;

    setPlayerState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cash: prev.cash + totalSalary,
        inGameMinute: (prev.inGameMinute + 240) % 1440, // 4 heures de travail
        needs: {
          ...prev.needs,
          energie: Math.max(0, prev.needs.energie - 25),
          faim: Math.max(0, prev.needs.faim - 20)
        },
        envieJauge: Math.min(100, prev.envieJauge + 10)
      };
    });

    showToast(
      isEng
        ? `Shift finished! Earned +${totalSalary.toLocaleString()} FCFA`
        : `Journée de travail terminée ! Tu as gagné +${totalSalary.toLocaleString()} FCFA`
    );
  };

  // Consommer un met ivoirien
  const handleEatFood = (food: FoodItem) => {
    if (!playerState) return;
    const isUnlimited = playerState.unlimitedCashUntilDay !== undefined && playerState.dayCount <= playerState.unlimitedCashUntilDay;

    if (!isUnlimited && playerState.cash < food.price) {
      showToast(playerState.isEnglishLocked ? "Not enough FCFA cash!" : "Pas assez d'argent liquide !");
      return;
    }

    setPlayerState((prev) => {
      if (!prev) return prev;
      const newCash = isUnlimited ? prev.cash : prev.cash - food.price;
      const newFaim = Math.min(100, prev.needs.faim + food.faimGain);
      const newEnvie = Math.min(100, prev.envieJauge + food.envieGain);
      return {
        ...prev,
        cash: newCash,
        needs: { ...prev.needs, faim: newFaim },
        envieJauge: newEnvie,
        envieBuff: {
          name: `Dégustation ${food.name}`,
          expiresAtMin: prev.inGameMinute + 180
        }
      };
    });

    setIsFoodModalOpen(false);
    showToast(
      playerState.isEnglishLocked
        ? `Ate ${food.name}! (+${food.faimGain}% hunger, +${food.envieGain}% craving)`
        : `Tu as savouré : ${food.name} ! (+${food.faimGain}% Faim, +${food.envieGain}% Envie)`
    );
  };

  // Débloquer un badge de lycée d'excellence
  const handleUnlockBadge = (badgeId: SchoolBadgeId) => {
    if (!playerState) return;
    if (playerState.badges.includes(badgeId)) return;

    setPlayerState((prev) => {
      if (!prev) return prev;
      const updatedBadges = [...prev.badges, badgeId];
      const updatedLuck = Math.min(100, prev.luckStar + 10);
      return {
        ...prev,
        badges: updatedBadges,
        luckStar: updatedLuck
      };
    });
  };

  // Cotiser à la Tontine
  const handleTontineContribute = () => {
    if (!playerState) return;
    const cotisationAmount = 15000;
    if (playerState.cash < cotisationAmount) {
      showToast(playerState.isEnglishLocked ? "Need at least 15,000 F to contribute" : "Il te faut au moins 15 000 F pour cotiser");
      return;
    }

    setPlayerState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cash: prev.cash - cotisationAmount,
        tontineJoined: true,
        tontineBalance: prev.tontineBalance + cotisationAmount,
        luckStar: Math.min(100, prev.luckStar + 2)
      };
    });

    showToast(playerState.isEnglishLocked ? "Tontine contribution successful! (+15,000 F)" : "Cotisation de Tontine versée ! (-15 000 F, +Solidarité)");
  };

  // Laver son Étoile
  const handlePurifyStar = () => {
    if (!playerState) return;
    const cost = 25000;
    if (playerState.cash < cost) {
      showToast(playerState.isEnglishLocked ? "Need 25,000 F to purify your Star" : "Il te faut 25 000 F pour laver ton étoile");
      return;
    }

    setPlayerState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cash: prev.cash - cost,
        luckStar: Math.min(100, prev.luckStar + 20),
        policeHeat: Math.max(0, prev.policeHeat - 1)
      };
    });

    showToast(playerState.isEnglishLocked ? "Your Lucky Star has been cleansed! (+20 Star)" : "Ton étoile a été lavée ! (+20 Étoile, -1 Recherche Police)");
  };

  // Prendre une douche
  const handleShower = () => {
    if (!playerState) return;
    setPlayerState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        needs: { ...prev.needs, hygiene: 100 }
      };
    });
    showToast(playerState.isEnglishLocked ? "Clean and fresh! (+100% Hygiene)" : "Douche prise ! Tu es propre et frais (+100% Hygiène)");
  };

  // Repos
  const handleRest = () => {
    if (!playerState) return;
    setPlayerState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        needs: { ...prev.needs, energie: 100 }
      };
    });
    showToast(playerState.isEnglishLocked ? "Full rest! (+100% Energy)" : "Sieste réparatrice (+100% Énergie)");
  };

  // Forcer un destin depuis le Sandbox Admin
  const handleForceDestiny = (newDestiny: DestinyClass) => {
    if (!playerState) return;
    setPlayerState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        destiny: newDestiny,
        isEnglishLocked: newDestiny.isEnglishLocked || false,
        luckStar: newDestiny.luckStat,
        policeHeat: newDestiny.isBaron ? 3 : (newDestiny.isBrouteur ? 1 : 0),
        cash: newDestiny.startingCash
      };
    });
    showToast(`Destin forcé : ${newDestiny.name}`);
  };

  // Mise à jour de l'état par le Sandbox Admin
  const handleAdminUpdateState = (patch: Partial<PlayerState>) => {
    setPlayerState((prev) => prev ? { ...prev, ...patch } : prev);
  };

  // Déclencher manuellement ou tester la Fin Tragique
  const handleTriggerTragicEnding = () => {
    setTragicReason(
      playerState?.isEnglishLocked
        ? "Crushed under the wheels of the city after total financial and mental collapse"
        : "Écrasé par la pression urbaine après une faillite morale et financière irréversible"
    );
    setIsTragicEndingOpen(true);
  };

  // Recommencer une nouvelle vie après mort tragique
  const handleRestartAfterDeath = () => {
    setIsTragicEndingOpen(false);
    setCurrentScreen('char_creation');
  };

  return (
    <OrientationGuard>
      <div className="relative h-screen w-screen overflow-hidden bg-black text-white font-sans select-none">
        {/* Toast Notification HUD */}
        {toastMessage && (
          <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-amber-500/50 bg-slate-950/90 px-4 py-2 text-xs sm:text-sm font-bold text-amber-300 shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            {toastMessage}
          </div>
        )}

        {/* 1. Écran de Démarrage */}
        {currentScreen === 'start' && (
          <StartScreen
            hasSaveGame={hasSaveGame}
            onNewGame={handleNewGame}
            onContinueGame={handleContinueGame}
            onOpenAdmin={() => setIsAdminOpen(true)}
            settings={settings}
            onUpdateSettings={(newSet) => {
              setSettings(newSet);
              saveSettings(newSet);
            }}
          />
        )}

        {/* 2. Écran de Création de Personnage */}
        {currentScreen === 'char_creation' && (
          <CharacterCreation
            onCancel={() => setCurrentScreen('start')}
            onConfirm={handleCharacterConfirmed}
          />
        )}

        {/* 3. La Roulette du Destin (19 Destins & Easter Eggs) */}
        {currentScreen === 'destiny_roulette' && tempCharacter && (
          <DestinyRoulette
            character={tempCharacter}
            onDestinyConfirmed={handleDestinyConfirmed}
          />
        )}

        {/* 4. Cinématique d'Introduction avec Voix Off */}
        {currentScreen === 'cinematic_intro' && playerState && (
          <CinematicIntro
            playerState={playerState}
            onFinish={handleFinishCinematic}
          />
        )}

        {/* 5. Le Monde en Jeu (Moteur 3D, HUD, Navigation Dock & Manette) */}
        {currentScreen === 'game' && playerState && (
          <div className="relative h-full w-full">
            {/* Scène 3D Three.js PBR avec mobilier distinct et caméra GTA */}
            <ThreeCanvas
              playerState={playerState}
              moveDirection={moveDirection}
              onInteractFurniture={handleInteractFurniture}
              cameraMode={cameraMode}
              onToggleCameraMode={() => setCameraMode((prev) => (prev === 'topdown' ? 'shoulder' : 'topdown'))}
              onUnlockBadge={handleUnlockBadge}
              heldControls={heldControls}
              crossActionRef={crossActionRef}
              onDistrictChange={(dist) => {
                setPlayerState((prev) => (prev ? { ...prev, currentLocationName: dist } : prev));
              }}
            />

            {/* Interface Tête Haute (HUD & Dock Navigation) */}
            <GameHUD
              playerState={playerState}
              onOpenPhone={() => setIsPhoneOpen(true)}
              onEatFoodModal={() => setIsFoodModalOpen(true)}
              onOpenMap={() => setIsMapOpen(true)}
              onGoToWork={handleGoToWork}
              onRest={handleRest}
              onShower={handleShower}
              onTragicEnding={handleTriggerTragicEnding}
              onToggleRadio={handleCircleAction}
            />

            {/* Manette Tactile PlayStation (Mode Paysage) & Clavier PC */}
            <VirtualController
              onDirectionMove={(x, y) => setMoveDirection({ x, y })}
              onCrossPress={handleCrossAction}
              onTrianglePress={handleTriangleAction}
              onCirclePress={handleCircleAction}
              heldControls={heldControls}
              onToggleCamera={() => setCameraMode((prev) => (prev === 'topdown' ? 'shoulder' : 'topdown'))}
              isEnglish={playerState.isEnglishLocked}
            />
          </div>
        )}

        {/* MODALS EN JEU */}
        {/* A. Le Smartphone BabiOS */}
        {isPhoneOpen && playerState && (
          <SmartphoneModal
            playerState={playerState}
            onClose={() => setIsPhoneOpen(false)}
            onUnlockBadge={handleUnlockBadge}
            onTontineContribute={handleTontineContribute}
            onPurifyStar={handlePurifyStar}
            isEnglish={playerState.isEnglishLocked}
          />
        )}

        {/* B. Menu Gastronomique d'Abidjan */}
        {isFoodModalOpen && playerState && (
          <FoodMenuModal
            playerCash={playerState.cash}
            unlimitedCash={playerState.unlimitedCashUntilDay !== undefined && playerState.dayCount <= playerState.unlimitedCashUntilDay}
            onEatFood={handleEatFood}
            onClose={() => setIsFoodModalOpen(false)}
            isEnglish={playerState.isEnglishLocked}
          />
        )}

        {/* C. Carte Interactive d'Abidjan */}
        {isMapOpen && playerState && (
          <AbidjanMapModal
            playerState={playerState}
            onClose={() => setIsMapOpen(false)}
            onTravelTo={handleTravelTo}
            isEnglish={playerState.isEnglishLocked}
          />
        )}

        {/* D. Espace Sandbox Admin Secret (Code BLV2026) */}
        {isAdminOpen && (
          <AdminSandboxModal
            playerState={
              playerState || {
                character: {
                  firstName: 'Admin',
                  lastName: 'Test',
                  nickname: 'Dev',
                  gender: 'm',
                  skinTone: '#8d5524',
                  hairStyle: 'court',
                  outfitColor: '#f59e0b',
                  outfitStyle: 'streetwear',
                  traits: ['bosseur'],
                  dream: 'million'
                },
                destiny: ALL_DESTINIES[0],
                cash: 500000,
                bankBalance: 1000000,
                luckStar: 75,
                policeHeat: 0,
                criminalRecord: 0,
                currentCommune: 'Cocody',
                currentLocationName: 'Cocody — Villa',
                dayCount: 1,
                inGameMinute: 720,
                weather: 'sunny',
                badges: [],
                degrees: [],
                relationshipStatus: 'celibataire',
                partnerAffinity: 0,
                needs: { faim: 90, energie: 90, hygiene: 90, vessie: 90, social: 90, loisirs: 90 },
                envieJauge: 90,
                isEnglishLocked: false,
                selectedRadioId: 'frequence2',
                isRadioPlaying: false,
                radioVolume: 80,
                tontineJoined: false,
                tontineBalance: 0
              }
            }
            onClose={() => setIsAdminOpen(false)}
            onUpdateState={handleAdminUpdateState}
            onForceDestiny={handleForceDestiny}
          />
        )}

        {/* E. Fin Tragique / Épitaphe */}
        {isTragicEndingOpen && playerState && (
          <TragicEndingModal
            playerState={playerState}
            reason={tragicReason}
            onRestartGame={handleRestartAfterDeath}
            isEnglish={playerState.isEnglishLocked}
          />
        )}
      </div>
    </OrientationGuard>
  );
}
