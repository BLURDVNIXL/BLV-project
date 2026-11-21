

import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import {
  ALL_DESTINIES,
  IVORIAN_FOODS,
} from './src/core/destinies';
import {
  advanceGameTime,
  buyCribUpgrade,
  buyOrEquipOutfit,
  clearPoliceViaNetwork,
  createInitialPlayerState,
  depositToBank,
  donateYannisAcademy,
  eatFood,
  evaluateMissionProgress,
  payFastTravel,
  fastTravelFare,
  performLavageEtoile,
  performWorkShift,
  playLotoAkwaba,
  repayDebt,
  sleepAtHome,
  takeBankLoan,
  takeShower,
  useToilet,
  withdrawFromBank,
} from './src/core/simulation';
import { findHouseLot } from './src/world/city';
import { HomeType } from './src/world/abidjanGeography';
import { strHash } from './src/world/rng';
import {
  CribUpgrades,
  PlayerState,
  SapeOutfitId,
} from './src/types/game';
import { normalizeSessionState } from './src/core/sessionValidation';
import { buyItem, holdItem, moveToFridge, takeFromFridge, useHeldItem } from './src/core/inventory';
import { PLACE_MENUS, PlaceMenuId } from './src/core/items';

const PORT = 3000;
const EPHEMERAL_DEV_ADMIN_CODE = crypto.randomBytes(8).toString('hex').toUpperCase();
const ADMIN_SECRET = (process.env.ADMIN_SANDBOX_SECRET || EPHEMERAL_DEV_ADMIN_CODE).trim();
const TOKEN_SIGNING_KEY = process.env.SESSION_SIGNING_SECRET
  ? Buffer.from(process.env.SESSION_SIGNING_SECRET, 'utf8')
  : crypto.randomBytes(32);

if (!process.env.ADMIN_SANDBOX_SECRET) {
  console.log(`[BLV Security] Ephemeral dev admin passcode generated for this session: ${ADMIN_SECRET}`);
}

// ───────────────────────── SQLite Persistence ─────────────────────────

const dbPath = path.resolve(process.cwd(), 'blv_world.sqlite');
const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS sessions (
    player_id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL,
    state_json TEXT NOT NULL,
    home_lot_id TEXT,
    updated_at INTEGER NOT NULL
  );
`);
// Anciennes fonctionnalités supprimées (consentement/romance, multijoueur : tontine, chat) : on retire aussi leurs données.
db.exec(`
  DROP TABLE IF EXISTS consent_requests;
  DROP TABLE IF EXISTS tontine_state;
  DROP TABLE IF EXISTS tontine_members;
  DROP TABLE IF EXISTS tontine_ledger;
  DROP TABLE IF EXISTS chat_reports;
`);

// ───────────────────────── Crypto & Rate Limits ─────────────────────────

function sha256Hex(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

function timingSafeMatch(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function signSessionToken(playerId: string): string {
  const nonce = crypto.randomBytes(12).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ pid: playerId, nonce, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SIGNING_KEY).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function readBearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header?.trim() ?? '');
  return match?.[1];
}

function verifySessionToken(playerId: string, token: string | undefined): boolean {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  const [payload, sig] = parts;
  try {
    const expected = crypto.createHmac('sha256', TOKEN_SIGNING_KEY).update(payload).digest('base64url');
    if (!timingSafeMatch(sig, expected)) return false;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { pid?: string };
    return parsed.pid === playerId;
  } catch {
    return false;
  }
}

function verifyStoredSessionToken(
  playerId: string,
  token: string | undefined,
  storedTokenHash: string
): boolean {
  return Boolean(
    token &&
    verifySessionToken(playerId, token) &&
    timingSafeMatch(sha256Hex(token), storedTokenHash)
  );
}

// ───────────────────────── Session Helpers ─────────────────────────

function getSessionRow(playerId: string): {
  player_id: string;
  token_hash: string;
  state_json: string;
  home_lot_id: string | null;
} | null {
  const row = db
    .prepare(`SELECT player_id, token_hash, state_json, home_lot_id FROM sessions WHERE player_id = ?`)
    .get(playerId) as
    | { player_id: string; token_hash: string; state_json: string; home_lot_id: string | null }
    | undefined;
  return row ?? null;
}

function saveSessionState(playerId: string, state: PlayerState) {
  db.prepare(`UPDATE sessions SET state_json = ?, home_lot_id = ?, updated_at = ? WHERE player_id = ?`).run(
    JSON.stringify(state),
    state.homeLotId || null,
    Date.now(),
    playerId
  );
}

function reserveLotForState(playerId: string, state: PlayerState): string {
  const rows = db.prepare(`SELECT home_lot_id FROM sessions WHERE player_id != ? AND home_lot_id IS NOT NULL`).all(playerId) as Array<{
    home_lot_id: string;
  }>;
  const taken = new Set(rows.map((r) => r.home_lot_id));
  const lot = findHouseLot(
    state.destiny.homeType as HomeType,
    strHash(`${playerId}|${state.destiny.id}`),
    taken,
    state.destiny.districtId
  );
  return lot?.id ?? `lot_${playerId.slice(0, 8)}`;
}

// ───────────────────────── Server Express ─────────────────────────

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Server-Issued Session Init, Save, Fetch & RGPD Delete
  app.post('/api/session/init', (req, res) => {
    const body = (req.body ?? {}) as { playerId?: unknown; sessionToken?: unknown; state?: unknown };
    if (typeof body.playerId === 'string' && typeof body.sessionToken === 'string') {
      const existing = getSessionRow(body.playerId);
      if (existing && verifyStoredSessionToken(body.playerId, body.sessionToken, existing.token_hash)) {
        const parsed = JSON.parse(existing.state_json) as PlayerState;
        res.json({
          ok: true,
          playerId: body.playerId,
          sessionToken: body.sessionToken,
          homeLotId: existing.home_lot_id,
          state: { ...parsed, sessionToken: body.sessionToken },
        });
        return;
      }
    }

    const newId = `blv_${crypto.randomUUID()}`;
    const token = signSessionToken(newId);
    let baseState: PlayerState;

    if (body.state !== undefined && body.state !== null) {
      const importedState = normalizeSessionState(body.state, {
        playerId: newId,
        sessionToken: token,
        homeLotId: null,
      });
      if (!importedState) {
        res.status(400).json({ ok: false, error: 'État de sauvegarde invalide.' });
        return;
      }
      baseState = importedState;
    } else {
      baseState = createInitialPlayerState(ALL_DESTINIES[0], newId, token);
    }

    const lotId = reserveLotForState(newId, baseState);
    baseState.homeLotId = lotId;

    db.prepare(
      `INSERT INTO sessions (player_id, token_hash, state_json, home_lot_id, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).run(newId, sha256Hex(token), JSON.stringify(baseState), lotId, Date.now());

    res.json({
      ok: true,
      playerId: newId,
      sessionToken: token,
      homeLotId: lotId,
      state: baseState,
    });
  });

  app.post('/api/session/save', (req, res) => {
    const body = (req.body ?? {}) as { playerId?: unknown; state?: unknown };
    const playerId = typeof body.playerId === 'string' ? body.playerId : '';
    const token = readBearerToken(req.headers.authorization);
    if (!playerId || !token) {
      res.status(401).json({ ok: false, error: 'Jeton de session invalide.' });
      return;
    }

    const existing = getSessionRow(playerId);
    if (!existing) {
      res.status(404).json({ ok: false });
      return;
    }
    if (!verifyStoredSessionToken(playerId, token, existing.token_hash)) {
      res.status(401).json({ ok: false, error: 'Jeton de session invalide.' });
      return;
    }

    const sanitized = normalizeSessionState(body.state, {
      playerId,
      sessionToken: token,
      homeLotId: existing.home_lot_id,
    });
    if (!sanitized) {
      res.status(400).json({ ok: false, error: 'État de sauvegarde invalide.' });
      return;
    }

    saveSessionState(playerId, sanitized);
    res.json({ ok: true });
  });

  app.get('/api/session/:playerId', (req, res) => {
    const playerId = req.params.playerId;
    const token = readBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ ok: false });
      return;
    }
    const row = getSessionRow(playerId);
    if (!row) {
      res.status(404).json({ ok: false });
      return;
    }
    if (!verifyStoredSessionToken(playerId, token, row.token_hash)) {
      res.status(401).json({ ok: false });
      return;
    }
    res.json({ ok: true, state: JSON.parse(row.state_json) });
  });

  app.delete('/api/session/:playerId', (req, res) => {
    const playerId = req.params.playerId;
    const token = readBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ ok: false, error: 'Autorisation requise pour la purge.' });
      return;
    }
    const row = getSessionRow(playerId);
    if (!row) {
      res.status(404).json({ ok: false });
      return;
    }
    if (!verifyStoredSessionToken(playerId, token, row.token_hash)) {
      res.status(401).json({ ok: false, error: 'Autorisation requise pour la purge.' });
      return;
    }
    db.prepare(`DELETE FROM sessions WHERE player_id = ?`).run(playerId);
    res.json({ ok: true, purged: true });
  });

  // 3. Server-Authoritative Economy Action Endpoint
  app.post('/api/economy/action', (req, res) => {
    const body = (req.body ?? {}) as { playerId?: unknown; action?: unknown; payload?: unknown };
    const playerId = typeof body.playerId === 'string' ? body.playerId : '';
    const action = typeof body.action === 'string' ? body.action : '';
    const payload =
      body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
        ? (body.payload as Record<string, unknown>)
        : undefined;
    const token = readBearerToken(req.headers.authorization);
    if (!playerId || !action || !token) {
      res.status(401).json({ ok: false, error: 'Non autorisé.' });
      return;
    }
    const row = getSessionRow(playerId);
    if (!row) {
      res.status(404).json({ ok: false, error: 'Session inconnue.' });
      return;
    }
    if (!verifyStoredSessionToken(playerId, token, row.token_hash)) {
      res.status(401).json({ ok: false, error: 'Non autorisé.' });
      return;
    }

    let st = JSON.parse(row.state_json) as PlayerState;
    const requestedAmount = Number(payload?.amount ?? 0);
    const amt = Number.isFinite(requestedAmount)
      ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(requestedAmount)))
      : 0;

    switch (action) {
      case 'deposit':
        st = depositToBank(st, amt);
        break;
      case 'withdraw':
        st = withdrawFromBank(st, amt);
        break;
      case 'loan':
        st = takeBankLoan(st, amt);
        break;
      case 'repay':
        st = repayDebt(st, amt);
        break;
      case 'buy_crib':
        st = buyCribUpgrade(st, String(payload?.key || 'tv4k') as keyof CribUpgrades);
        break;
      case 'buy_outfit':
        st = buyOrEquipOutfit(st, String(payload?.outfitId || 'standard') as SapeOutfitId);
        break;
      case 'fast_travel': {
        // Tarif calculé ici (jamais envoyé par le client) : 500 F dans la même commune, 1 000 F sinon.
        // Le départ vient du client : un départ inconnu ou absent donne le tarif entre communes.
        const fare = fastTravelFare(
          typeof payload?.fromDistrictId === 'string' ? payload.fromDistrictId : null,
          typeof payload?.districtId === 'string' ? payload.districtId : null
        );
        const ft = payFastTravel(st, String(payload?.districtName || 'Abidjan'), fare);
        st = ft.ok && payload?.districtId ? evaluateMissionProgress(ft.nextState, String(payload.districtId)) : ft.nextState;
        break;
      }
      case 'visit_district':
        st = evaluateMissionProgress(st, String(payload?.districtId || ''));
        break;
      case 'eat': {
        const food = IVORIAN_FOODS.find((f) => f.id === String(payload?.foodId || ''));
        if (food) st = eatFood(st, food);
        break;
      }
      case 'buy_item': {
        // Le prix est recalculé ici d'après le lieu (jamais envoyé par le client).
        const placeId = String(payload?.placeId || '');
        if (placeId in PLACE_MENUS) {
          const placeKey = typeof payload?.placeKey === 'string' ? payload.placeKey.slice(0, 80) : undefined;
          st = buyItem(st, String(payload?.itemId || ''), placeId as PlaceMenuId, placeKey);
        }
        break;
      }
      case 'hold_item':
        st = holdItem(st, payload?.itemId === null || payload?.itemId === undefined ? null : String(payload.itemId));
        break;
      case 'use_item':
        st = useHeldItem(st);
        break;
      case 'fridge_put':
        st = moveToFridge(st, String(payload?.itemId || ''));
        break;
      case 'fridge_take':
        st = takeFromFridge(st, String(payload?.itemId || ''));
        break;
      case 'work': {
        st = performWorkShift(st);
        break;
      }
      case 'loto':
        st = playLotoAkwaba(st);
        break;
      case 'yannis_academy':
        st = donateYannisAcademy(st);
        break;
      case 'clear_police':
        st = clearPoliceViaNetwork(st, Boolean(payload?.isBlackMarket));
        break;
      case 'lavage_etoile':
        st = performLavageEtoile(st);
        break;
      case 'sleep':
        st = sleepAtHome(st);
        break;
      case 'shower':
        st = takeShower(st);
        break;
      case 'toilet':
        st = useToilet(st);
        break;
      case 'advance_time':
        st = advanceGameTime(st, Math.min(60, Math.max(1, Number(payload?.realSeconds || 6))), 1);
        break;
      default:
        res.status(400).json({ ok: false, error: 'Action économique inconnue.' });
        return;
    }

    saveSessionState(playerId, st);
    res.json({ ok: true, state: st });
  });

  // Vite dev middleware or static dist serving
  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(process.cwd(), 'dist');

  if (!isProd || !fs.existsSync(distDir)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🇨🇮 BLV Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
