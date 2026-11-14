import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, DollarSign, CloudRain, Star, X } from 'lucide-react';
import { PlayerState, WeatherType, AcademicBadge } from '../types/game';
import { ALL_DESTINIES } from '../core/destinies';

interface AdminModalProps {
  playerState: PlayerState;
  onClose: () => void;
  onForceDestiny: (destinyId: string, serverState?: PlayerState) => void;
  onAddCash: (amount: number, serverState?: PlayerState) => void;
  onChangeWeather: (weather: WeatherType, serverState?: PlayerState) => void;
  onSetPoliceStars: (stars: number, serverState?: PlayerState) => void;
  onRefillNeeds: (serverState?: PlayerState) => void;
  onUnlockBadge: (badge: AcademicBadge, serverState?: PlayerState) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  playerState,
  onClose,
  onForceDestiny,
  onAddCash,
  onChangeWeather,
  onSetPoliceStars,
  onRefillNeeds,
  onUnlockBadge,
}) => {
  const [passcode, setPasscode] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isChecking) return;
    setIsChecking(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
      if (res.ok && data.ok && data.token) {
        setAdminToken(data.token);
        setStatusMsg('Session admin vérifiée et journalisée côté serveur.');
      } else {
        setErrorMsg(data.error || 'Code d’accès refusé par le serveur.');
      }
    } catch {
      setErrorMsg('Erreur de connexion au serveur de vérification.');
    } finally {
      setIsChecking(false);
    }
  };

  const dispatchAdminAction = async (
    action: string,
    payload: Record<string, unknown>,
    localApply: (serverState?: PlayerState) => void
  ) => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          targetPlayerId: playerState.playerId,
          action,
          payload,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { ok?: boolean; state?: PlayerState };
        localApply(data.state);
        setStatusMsg(`Action "${action}" appliquée & auditée.`);
        return;
      }
      if (res.status === 403) {
        setAdminToken(null);
        setErrorMsg('Jeton expiré, veuillez vous réauthentifier.');
        return;
      }
    } catch {
      // Offline fallback if session hasn't synced yet
    }
    localApply();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 text-ink-800 select-none">
      <div className="relative flex flex-col w-full max-w-xl rounded-2xl bg-cream-100 border-2 border-sun-400/50 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4 bg-cream-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun-300/40 text-sun-600 border border-sun-400/30">
              {adminToken ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-display text-xl font-bold uppercase text-ink-800">
                Espace Admin Sandbox
              </h3>
              <p className="text-xs text-ink-600">Vérification HMAC, anti-brute-force & journal d’audit</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer Admin"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream-200 hover:bg-cream-200 text-ink-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto no-scrollbar">
          {!adminToken ? (
            <form onSubmit={handleVerify} className="flex flex-col gap-4 py-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sun-300/40 border border-sun-400/30 text-sun-600">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-ink-800">Authentification Développeur</h4>
                <p className="text-xs text-ink-600 mt-1">
                  Saisis le code secret configuré dans l’environnement serveur (ou affiché dans les logs serveur en mode dev).
                </p>
              </div>

              <div className="mx-auto flex w-full max-w-xs flex-col gap-2">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Passcode serveur"
                  aria-label="Passcode administrateur"
                  className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-2.5 text-center tabular-nums font-bold tracking-widest text-sun-600 placeholder:text-ink-400 focus:border-sun-400/60 focus:outline-none"
                />
                {errorMsg && <div className="text-xs text-coral-600 font-semibold">{errorMsg}</div>}

                <button
                  type="submit"
                  disabled={isChecking}
                  className="rounded-xl bg-sun-500 hover:bg-sun-400 disabled:opacity-50 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer"
                >
                  {isChecking ? 'Vérification...' : 'Déverrouiller Sandbox'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              {statusMsg && (
                <div className="rounded-xl bg-palm-400/15 border border-palm-400/40 px-3 py-2 text-xs font-semibold text-palm-600">
                  {statusMsg}
                </div>
              )}

              <div className="rounded-2xl bg-cream-50 p-3.5 border border-cream-200">
                <div className="text-xs font-bold uppercase text-sun-600 mb-2 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  Forcer l’un des 19 Destins
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto no-scrollbar">
                  {ALL_DESTINIES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() =>
                        dispatchAdminAction('force_destiny', { destinyId: d.id }, (st) => onForceDestiny(d.id, st))
                      }
                      className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold border transition-all truncate cursor-pointer ${
                        playerState.destiny.id === d.id
                          ? 'bg-sun-300/35 border-sun-400/60 text-sun-600'
                          : 'bg-cream-100 border-cream-200 text-ink-600 hover:border-cream-200'
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-cream-50 p-3.5 border border-cream-200">
                <div className="text-xs font-bold uppercase text-palm-600 mb-2 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Injection de Liquidités (FCFA)
                </div>
                <div className="flex flex-wrap gap-2">
                  {[100000, 1000000, 50000000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() =>
                        dispatchAdminAction('add_cash', { amount }, (st) => onAddCash(amount, st))
                      }
                      className="rounded-xl bg-palm-400/20 hover:bg-palm-600 border border-palm-400/40 px-3 py-1.5 text-xs tabular-nums font-bold text-palm-600 cursor-pointer"
                    >
                      +{amount.toLocaleString('fr-FR')} F
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-cream-50 p-3.5 border border-cream-200">
                <div className="text-xs font-bold uppercase text-lagoon-600 mb-2 flex items-center gap-1.5">
                  <CloudRain className="h-3.5 w-3.5" />
                  Météo Tropicale
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'soleil', label: '☀️ Soleil' },
                    { id: 'pluie', label: '🌧️ Pluie' },
                    { id: 'inondation', label: '🌊 Inondation' },
                    { id: 'harmattan', label: '🌪️ Harmattan' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() =>
                        dispatchAdminAction('set_weather', { weather: w.id }, (st) =>
                          onChangeWeather(w.id as WeatherType, st)
                        )
                      }
                      className={`rounded-xl py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                        playerState.weather === w.id
                          ? 'bg-lagoon-400/15 border-lagoon-400/60 text-lagoon-600'
                          : 'bg-cream-100 border-cream-200 text-ink-600 hover:text-ink-800'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-cream-50 p-3.5 border border-cream-200">
                <div className="text-xs font-bold uppercase text-sun-600 mb-2">
                  Indice de Recherche Police (0 - 5 ★)
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() =>
                        dispatchAdminAction('set_police', { stars }, (st) => onSetPoliceStars(stars, st))
                      }
                      className={`flex-1 rounded-xl py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                        playerState.policeWanted === stars
                          ? 'bg-sun-600 text-white border-sun-400/60'
                          : 'bg-cream-100 text-ink-600 border-cream-200 hover:text-ink-800'
                      }`}
                    >
                      {stars} ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => dispatchAdminAction('refill_needs', {}, (st) => onRefillNeeds(st))}
                  className="flex-1 rounded-xl bg-sun-600 hover:bg-sun-500 py-2.5 text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
                >
                  Régénérer Jauges (100%)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    dispatchAdminAction('unlock_all_badges', {}, (st) => {
                      onUnlockBadge('caiman', st);
                      onUnlockBadge('alysma', st);
                      onUnlockBadge('alex', st);
                    })
                  }
                  className="rounded-xl bg-plum-500 hover:bg-plum-500 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
                >
                  Tous les Badges
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
