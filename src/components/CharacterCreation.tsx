/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Création & Personnalisation du Personnage
 */

import React, { useState } from 'react';
import { CharacterProfile } from '../types/game';
import { User, Sparkles, ArrowRight, ArrowLeft, Check, Dice5 } from 'lucide-react';

interface CharacterCreationProps {
  onCancel: () => void;
  onConfirm: (character: CharacterProfile) => void;
}

const SKIN_TONES = ['#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#5c3818', '#3b220c'];

const PERSONALITY_TRAITS = [
  { id: 'bosseur', name: 'Bosseur', desc: 'Performance au travail monte 25% plus vite', icon: '💼' },
  { id: 'ambianceur', name: 'Ambianceur', desc: '+25% de plaisir et social la nuit (maquis, Rue Princesse)', icon: '🎉' },
  { id: 'tchamseur', name: 'Tchamseur', desc: 'Charisme +30%, discussions donnent plus de social', icon: '🗣️' },
  { id: 'petit_choco', name: 'Petit Choco', desc: '+25% succès drague et dates, tenues plus chics', icon: '✨' },
  { id: 'gbachisseur', name: 'Gbachisseur', desc: 'Forme physique +30%, énergie baisse 15% moins vite', icon: '🏋️' },
  { id: 'gourmand', name: 'Gourmand', desc: 'Mets savoureux comblent la jauge d\'envie 2x plus', icon: '🍛' },
  { id: 'avare', name: 'Avare', desc: '-10% sur les achats, nourriture et transports', icon: '🪙' },
  { id: 'gentleman', name: 'Gentleman', desc: 'Hygiène baisse moins vite, respect social élevé', icon: '🎩' }
];

const DREAMS = [
  { id: 'million', name: 'Premier Million', desc: 'Atteindre 1 000 000 F de patrimoine personnel' },
  { id: 'star', name: 'Star Nationale', desc: 'Devenir la légende urbaine la plus admirée de Babi' },
  { id: 'entrepreneur', name: 'Grand Patron', desc: 'Posséder une flotte de transports et des maquis VIP' },
  { id: 'loveur', name: 'Grand Loveur', desc: 'Trouver l\'âme sœur et bâtir un foyer modèle à Cocody' }
];

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onCancel, onConfirm }) => {
  const [firstName, setFirstName] = useState('Koffi');
  const [lastName, setLastName] = useState('Konan');
  const [nickname, setNickname] = useState('Koffi_Babi');
  const [gender, setGender] = useState<'m' | 'f'>('m');
  const [skinTone, setSkinTone] = useState(SKIN_TONES[1]);
  const [hairStyle, setHairStyle] = useState<'court' | 'afro' | 'tresses' | 'rase' | 'degrade'>('afro');
  const [outfitColor, setOutfitColor] = useState('#f59e0b');
  const [outfitStyle, setOutfitStyle] = useState<'streetwear' | 'wax_traditionnel' | 'costume_cadre' | 'sport_madrid' | 'choco_chic'>('wax_traditionnel');
  const [selectedTraits, setSelectedTraits] = useState<string[]>(['bosseur', 'ambianceur']);
  const [dream, setDream] = useState('million');

  const toggleTrait = (traitId: string) => {
    if (selectedTraits.includes(traitId)) {
      if (selectedTraits.length > 1) {
        setSelectedTraits(selectedTraits.filter((t) => t !== traitId));
      }
    } else {
      if (selectedTraits.length < 2) {
        setSelectedTraits([...selectedTraits, traitId]);
      } else {
        setSelectedTraits([selectedTraits[1], traitId]);
      }
    }
  };

  const handleRandomize = () => {
    const firstNamesM = ['Koffi', 'Yao', 'Kouassi', 'Sékou', 'Junior', 'Ibrahim', 'Drissa', 'Hervé'];
    const firstNamesF = ['Awa', 'Mariam', 'Fanta', 'Adjoua', 'Aya', 'Bintou', 'Affoué', 'Salimata'];
    const lastNames = ['Konan', 'Kouamé', 'Touré', 'Bakayoko', 'Ouattara', 'Diabaté', 'Kouassi', 'N\'Dri'];

    const chosenGender: 'm' | 'f' = Math.random() > 0.5 ? 'm' : 'f';
    const chosenFirst = chosenGender === 'm'
      ? firstNamesM[Math.floor(Math.random() * firstNamesM.length)]
      : firstNamesF[Math.floor(Math.random() * firstNamesF.length)];
    const chosenLast = lastNames[Math.floor(Math.random() * lastNames.length)];

    setGender(chosenGender);
    setFirstName(chosenFirst);
    setLastName(chosenLast);
    setNickname(`${chosenFirst}_${Math.floor(Math.random() * 99)}`);
    setSkinTone(SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]);
    setHairStyle(['court', 'afro', 'tresses', 'rase', 'degrade'][Math.floor(Math.random() * 5)] as any);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      firstName,
      lastName,
      nickname,
      gender,
      skinTone,
      hairStyle,
      outfitColor,
      outfitStyle,
      traits: selectedTraits,
      dream
    });
  };

  return (
    <div className="relative flex h-full w-full overflow-y-auto bg-slate-950 p-4 sm:p-8 select-none text-white">
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col lg:flex-row gap-8 items-start justify-center my-auto">
        {/* Colonne Gauche : Aperçu Stylisé San Andreas du Personnage */}
        <div className="flex w-full lg:w-80 flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
          <div className="flex items-center justify-between w-full mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Aperçu Avatar</span>
            <button
              type="button"
              onClick={handleRandomize}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:text-white"
            >
              <Dice5 className="h-3.5 w-3.5 text-amber-400" />
              Hasard
            </button>
          </div>

          {/* Visualiseur Stylisé San Andreas */}
          <div className="relative flex h-64 w-full items-center justify-center rounded-xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 overflow-hidden">
            {/* Halo de lumière */}
            <div className="absolute inset-0 bg-radial from-amber-500/20 via-transparent to-transparent"></div>

            {/* Représentation stylisée du personnage */}
            <div className="relative flex flex-col items-center">
              {/* Tête */}
              <div
                className="relative h-20 w-16 rounded-2xl shadow-md transition-colors"
                style={{ backgroundColor: skinTone }}
              >
                {/* Cheveux */}
                {hairStyle === 'afro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-10 w-20 rounded-full bg-stone-900"></div>
                )}
                {hairStyle === 'tresses' && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-8 w-18 flex justify-between px-1">
                    <span className="h-10 w-1 bg-stone-900 rounded"></span>
                    <span className="h-12 w-1 bg-stone-900 rounded"></span>
                    <span className="h-12 w-1 bg-stone-900 rounded"></span>
                    <span className="h-10 w-1 bg-stone-900 rounded"></span>
                  </div>
                )}
                {hairStyle === 'court' && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-6 w-16 rounded-t-xl bg-stone-900"></div>
                )}
                {hairStyle === 'degrade' && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-5 w-16 rounded-t-lg bg-stone-900 border-b border-stone-700"></div>
                )}

                {/* Yeux & Sourire confiant */}
                <div className="absolute top-8 left-3 h-2 w-2 rounded-full bg-slate-900"></div>
                <div className="absolute top-8 right-3 h-2 w-2 rounded-full bg-slate-900"></div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 h-1.5 w-6 rounded-full bg-stone-900/60"></div>
              </div>

              {/* Torse & Sape */}
              <div
                className="mt-1 h-24 w-24 rounded-t-2xl shadow-lg relative flex items-center justify-center text-xs font-bold uppercase transition-colors"
                style={{ backgroundColor: outfitColor }}
              >
                <span className="text-[10px] text-black/70 font-black tracking-widest">
                  {outfitStyle === 'wax_traditionnel' ? 'WAX 🇨🇮' : outfitStyle === 'costume_cadre' ? 'CHIC' : 'BABI'}
                </span>
              </div>
            </div>

            {/* Badge de style en bas */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[11px] font-bold text-slate-400 bg-slate-950/80 px-2 py-1 rounded">
              <span>{gender === 'm' ? 'Homme' : 'Femme'}</span>
              <span className="text-amber-400 uppercase">{hairStyle}</span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <h3 className="text-base font-extrabold text-white">{firstName} {lastName}</h3>
            <p className="text-xs text-amber-400 font-mono">@{nickname}</p>
          </div>
        </div>

        {/* Colonne Droite : Formulaire & Traits */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-black uppercase tracking-wide text-white">Crée ton Personnage</h2>
            </div>
            <span className="text-xs text-slate-400">Étape 1 sur 2</span>
          </div>

          {/* Identité */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Prénom</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Nom</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Pseudo</label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-amber-300 font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Genre & Teint */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Genre</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('m')}
                  className={`rounded-lg py-2 text-xs font-bold transition-all ${
                    gender === 'm'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'border border-slate-700 bg-slate-950 text-slate-300'
                  }`}
                >
                  Homme 👨🏾
                </button>
                <button
                  type="button"
                  onClick={() => setGender('f')}
                  className={`rounded-lg py-2 text-xs font-bold transition-all ${
                    gender === 'f'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'border border-slate-700 bg-slate-950 text-slate-300'
                  }`}
                >
                  Femme 👩🏾
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Teint de peau</label>
              <div className="flex items-center gap-2">
                {SKIN_TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setSkinTone(tone)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      skinTone === tone ? 'scale-110 border-amber-400 shadow-md' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: tone }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Coiffure & Sape */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Coiffure</label>
              <div className="flex flex-wrap gap-1.5">
                {(['court', 'afro', 'tresses', 'rase', 'degrade'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHairStyle(h)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                      hairStyle === h
                        ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                        : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Style de Sape</label>
              <select
                value={outfitStyle}
                onChange={(e) => setOutfitStyle(e.target.value as any)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="wax_traditionnel">Pagne Wax Traditionnel 🇨🇮</option>
                <option value="streetwear">Streetwear Babi Décontracté</option>
                <option value="costume_cadre">Costume Cadre du Plateau</option>
                <option value="sport_madrid">Tenue Sportive Madrid</option>
                <option value="choco_chic">Choco Chic Riviera</option>
              </select>
            </div>
          </div>

          {/* Personnalité (2 traits max) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold uppercase text-slate-400">
                Personnalité (2 traits pour toute ta vie)
              </label>
              <span className="text-[11px] font-mono text-amber-400">{selectedTraits.length}/2 choisis</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PERSONALITY_TRAITS.map((trait) => {
                const isSelected = selectedTraits.includes(trait.id);
                return (
                  <button
                    key={trait.id}
                    type="button"
                    onClick={() => toggleTrait(trait.id)}
                    className={`flex flex-col items-start p-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-emerald-500/80 bg-emerald-950/30 text-emerald-200 shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-base">{trait.icon}</span>
                      {isSelected && <Check className="h-3 w-3 text-emerald-400" />}
                    </div>
                    <span className="text-xs font-bold text-white">{trait.name}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{trait.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rêve */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Ton Rêve à Babi</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DREAMS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDream(d.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    dream === d.id
                      ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white">{d.name}</div>
                  <div className="text-[10px] text-slate-400">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Boutons d'Action */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour Menu
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>🎲 Lancer mon Destin</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
