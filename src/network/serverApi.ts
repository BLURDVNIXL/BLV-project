/**
 * BLV — Client REST du serveur (mode solo)
 * Sauvegarde de session (/api/session/init) et actions économiques validées côté serveur (/api/economy/action).
 */

import { PlayerState } from '../types/game';

export async function initServerSession(
  currentState: PlayerState
): Promise<{ playerId: string; sessionToken: string; homeLotId?: string; state: PlayerState } | null> {
  try {
    const res = await fetch('/api/session/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: currentState.playerId,
        sessionToken: currentState.sessionToken,
        state: currentState,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok: boolean;
      playerId: string;
      sessionToken: string;
      homeLotId?: string;
      state: PlayerState;
    };
    return data.ok ? data : null;
  } catch {
    return null;
  }
}

export async function postEconomyAction(
  playerId: string,
  sessionToken: string | undefined,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<PlayerState | null> {
  if (!sessionToken) return null;
  try {
    const res = await fetch('/api/economy/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ playerId, action, payload }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; state?: PlayerState };
    return data.ok && data.state ? data.state : null;
  } catch {
    return null;
  }
}
