/**
 * BLV — WebSocket Multiplayer & Authoritative REST Client
 * Connects to /ws on the same host (Port 3000) for delta-throttled player positions,
 * moderated live chat, non-NPC server-authoritative Tontine, persistent bilateral consent,
 * and neighbor house knock/visit workflows.
 */

import {
  RemotePlayer,
  ConsentPrompt,
  HouseKnockPrompt,
  CribUpgrades,
  PlayerState,
  SapeOutfitId,
  VehicleModelType,
} from '../types/game';
import { HomeType } from '../world/abidjanGeography';

export interface ServerTontineSnapshot {
  roundNumber: number;
  weeklyDues: number;
  currentPot: number;
  currentTurnIndex: number;
  participants: Array<{ id: string; name: string; hasPaid: boolean; isRealPlayer: boolean }>;
  history: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
}

export interface HouseVisitResolvedPayload {
  approved: boolean;
  ownerId?: string;
  ownerName: string;
  homeType?: HomeType;
  seedKey?: string;
  upgrades?: CribUpgrades;
  reason?: string;
}

export interface MultiplayerCallbacks {
  onPlayersChange: (players: RemotePlayer[], onlineCount: number) => void;
  onTontineUpdate: (tontine: ServerTontineSnapshot) => void;
  onTontinePayout: (amount: number) => void;
  onTontineFleeResult: (amount: number) => void;
  onTontineError?: (message: string) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onIncomingConsent: (req: ConsentPrompt) => void;
  onConsentSent?: (req: { requestId: string; toPlayerId: string; kind: 'woohoo' | 'marriage' }) => void;
  onConsentCancelled?: (requestId: string) => void;
  onConsentResolved: (res: { requestId?: string; accepted: boolean; partnerName: string; kind: 'woohoo' | 'marriage' }) => void;
  onHouseKnockIncoming?: (knock: HouseKnockPrompt) => void;
  onHouseVisitResolved?: (res: HouseVisitResolvedPayload) => void;
  onConnectionChange: (connected: boolean) => void;
}

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

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private callbacks: MultiplayerCallbacks;
  private playerId = '';
  private reconnectTimer: number | null = null;
  private lastMoveSentAt = 0;
  private lastSentPos: { x: number; z: number; rotY: number; isDriving: boolean } | null = null;
  private mutedSenderIds = new Set<string>();

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public toggleMuteSender(senderId: string): boolean {
    if (this.mutedSenderIds.has(senderId)) {
      this.mutedSenderIds.delete(senderId);
      return false;
    }
    this.mutedSenderIds.add(senderId);
    return true;
  }

  public isSenderMuted(senderId: string): boolean {
    return this.mutedSenderIds.has(senderId);
  }

  public connect(initPayload: {
    id: string;
    authToken?: string;
    name: string;
    destinyName: string;
    color: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    isDriving: boolean;
    vehicleType: VehicleModelType | null;
    sapeOutfit: SapeOutfitId;
    homeType?: HomeType;
  }) {
    this.playerId = initPayload.id;
    if (typeof window === 'undefined' || !initPayload.authToken) return;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.callbacks.onConnectionChange(true);
        this.send('player:join', initPayload);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as { type: string; payload?: any };
          if (msg.type === 'world:init' && msg.payload) {
            this.remotePlayers.clear();
            for (const p of msg.payload.players as RemotePlayer[]) {
              if (p.id !== this.playerId) this.remotePlayers.set(p.id, p);
            }
            this.callbacks.onPlayersChange(Array.from(this.remotePlayers.values()), msg.payload.onlineCount);
            if (msg.payload.tontine) this.callbacks.onTontineUpdate(msg.payload.tontine);
          } else if (msg.type === 'player:joined' && msg.payload) {
            const p = msg.payload.player as RemotePlayer;
            if (p.id !== this.playerId) {
              this.remotePlayers.set(p.id, p);
              this.callbacks.onPlayersChange(Array.from(this.remotePlayers.values()), msg.payload.onlineCount);
            }
          } else if (msg.type === 'player:moved' && msg.payload) {
            const existing = this.remotePlayers.get(msg.payload.id);
            if (existing) {
              Object.assign(existing, msg.payload);
              this.callbacks.onPlayersChange(Array.from(this.remotePlayers.values()), this.remotePlayers.size + 1);
            }
          } else if (msg.type === 'player:left' && msg.payload) {
            this.remotePlayers.delete(msg.payload.id);
            this.callbacks.onPlayersChange(Array.from(this.remotePlayers.values()), msg.payload.onlineCount);
          } else if (msg.type === 'chat:message' && msg.payload) {
            const chat = msg.payload as ChatMessage;
            if (!this.mutedSenderIds.has(chat.senderId)) {
              this.callbacks.onChatMessage(chat);
            }
          } else if (msg.type === 'tontine:update' && msg.payload) {
            this.callbacks.onTontineUpdate(msg.payload);
          } else if (msg.type === 'tontine:payout' && msg.payload) {
            this.callbacks.onTontinePayout(Number(msg.payload.amount || 0));
          } else if (msg.type === 'tontine:flee_result' && msg.payload) {
            this.callbacks.onTontineFleeResult(Number(msg.payload.amount || 0));
          } else if (msg.type === 'tontine:error' && msg.payload) {
            this.callbacks.onTontineError?.(String(msg.payload.message || 'Erreur Tontine'));
          } else if (msg.type === 'consent:incoming' && msg.payload) {
            this.callbacks.onIncomingConsent(msg.payload);
          } else if (msg.type === 'consent:sent' && msg.payload) {
            this.callbacks.onConsentSent?.(msg.payload);
          } else if (msg.type === 'consent:cancelled' && msg.payload) {
            this.callbacks.onConsentCancelled?.(String(msg.payload.requestId || ''));
          } else if (msg.type === 'consent:resolved' && msg.payload) {
            this.callbacks.onConsentResolved(msg.payload);
          } else if (msg.type === 'house:knock_incoming' && msg.payload) {
            this.callbacks.onHouseKnockIncoming?.(msg.payload);
          } else if (msg.type === 'house:visit_resolved' && msg.payload) {
            this.callbacks.onHouseVisitResolved?.(msg.payload);
          }
        } catch {
          // Ignore malformed frame
        }
      };

      this.ws.onclose = () => {
        this.callbacks.onConnectionChange(false);
        this.reconnectTimer = window.setTimeout(() => {
          this.connect(initPayload);
        }, 5000);
      };
    } catch {
      this.callbacks.onConnectionChange(false);
    }
  }

  /** Delta-throttled position update: skips stationary frames to stay quota-light */
  public sendPosition(pos: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    isDriving: boolean;
    vehicleType: VehicleModelType | null;
    sapeOutfit: SapeOutfitId;
  }) {
    const now = performance.now();
    if (now - this.lastMoveSentAt < 100) return;

    const prev = this.lastSentPos;
    const moved = !prev || Math.hypot(pos.x - prev.x, pos.z - prev.z) > 0.08 || Math.abs(pos.rotY - prev.rotY) > 0.05 || pos.isDriving !== prev.isDriving;
    if (!moved && now - this.lastMoveSentAt < 2500) return;

    this.lastMoveSentAt = now;
    this.lastSentPos = { x: pos.x, z: pos.z, rotY: pos.rotY, isDriving: pos.isDriving };
    this.send('player:move', pos);
  }

  public sendChat(text: string) {
    this.send('chat:send', { text });
  }

  public reportChat(messageId: string, senderId: string, reason = 'Comportement inapproprié') {
    this.send('chat:report', { messageId, senderId, reason });
  }

  public joinTontine() {
    this.send('tontine:join', {});
  }

  public contributeTontine() {
    this.send('tontine:contribute', {});
  }

  public fleeTontine() {
    this.send('tontine:flee', {});
  }

  public requestConsent(targetPlayerId: string, kind: 'woohoo' | 'marriage') {
    this.send('consent:request', { targetPlayerId, kind });
  }

  public cancelConsent(requestId: string) {
    this.send('consent:cancel', { requestId });
  }

  public respondConsent(requestId: string, accepted: boolean) {
    this.send('consent:respond', { requestId, accepted });
  }

  public requestHouseVisit(ownerId: string) {
    this.send('house:visit_request', { ownerId });
  }

  public respondHouseKnock(visitorId: string, accepted: boolean) {
    this.send('house:knock_respond', { visitorId, accepted });
  }

  private send(type: string, payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  public disconnect() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
