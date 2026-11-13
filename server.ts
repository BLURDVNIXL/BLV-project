/**
 * BLV — Babi Life Vibes V3 Full-Stack Server
 * Express + WebSocket + SQLite (node:sqlite) Server-Authoritative Backend.
 * Serves Vite dev middleware (dev) or dist/ (prod) on Port 3000.
 */

import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import {
  ALL_DESTINIES,
  ACADEMIC_BADGES,
  CAREERS,
  IVORIAN_FOODS,
  SAPE_OUTFITS,
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
  performCareerJob,
  performCivilMarriage,
  performConsensualWooHoo,
  performLavageEtoile,
  performWorkShift,
  playLotoAkwaba,
  repayDebt,
  setHomeAccessMode,
  sleepAtHome,
  takeBankLoan,
  takeShower,
  unlockBadge,
  useToilet,
  withdrawFromBank,
} from './src/core/simulation';
import { findHouseLot } from './src/world/city';
import { HomeType } from './src/world/abidjanGeography';
import { strHash } from './src/world/rng';
import {
  AcademicBadge,
  CribUpgrades,
  HomeAccessMode,
  PlayerState,
  SapeOutfitId,
  WeatherType,
} from './src/types/game';

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
    home_access TEXT NOT NULL DEFAULT 'open',
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tontine_state (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    round_number INTEGER NOT NULL,
    weekly_dues INTEGER NOT NULL,
    current_pot INTEGER NOT NULL,
    current_turn_index INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tontine_members (
    player_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    has_paid INTEGER NOT NULL DEFAULT 0,
    joined_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tontine_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS consent_requests (
    request_id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chat_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target_player_id TEXT,
    details_json TEXT,
    ip TEXT,
    created_at INTEGER NOT NULL
  );
`);

// Initialize tontine singleton with 0 fake NPCs
db.prepare(`
  INSERT OR IGNORE INTO tontine_state (id, round_number, weekly_dues, current_pot, current_turn_index)
  VALUES (1, 1, 50000, 0, 0)
`).run();

const ledgerCount = db.prepare(`SELECT COUNT(*) as c FROM tontine_ledger`).get() as { c: number };
if (ledgerCount.c === 0) {
  db.prepare(`INSERT INTO tontine_ledger (message, created_at) VALUES (?, ?)`).run(
    'Tontine multijoueur ouverte : rejoins avec d’autres citoyens réels (50 000 FCFA / tour).',
    Date.now()
  );
}

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

function verifySessionToken(playerId: string, token: string | undefined): boolean {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SIGNING_KEY).update(payload).digest('base64url');
  if (!timingSafeMatch(sig, expected)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { pid?: string };
    return parsed.pid === playerId;
  } catch {
    return false;
  }
}

function signAdminToken(): string {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 3600_000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SIGNING_KEY).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SIGNING_KEY).update(payload).digest('base64url');
  if (!timingSafeMatch(sig, expected)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: string; exp: number };
    return parsed.role === 'admin' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

const adminRateLimit = new Map<string, { fails: number; resetAt: number }>();

function checkAdminRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = adminRateLimit.get(ip);
  if (!entry || entry.resetAt < now) {
    return true;
  }
  return entry.fails < 5;
}

function recordAdminFail(ip: string) {
  const now = Date.now();
  const entry = adminRateLimit.get(ip);
  if (!entry || entry.resetAt < now) {
    adminRateLimit.set(ip, { fails: 1, resetAt: now + 600_000 });
  } else {
    entry.fails += 1;
  }
}

// ───────────────────────── Session Helpers ─────────────────────────

function getSessionRow(playerId: string): {
  player_id: string;
  token_hash: string;
  state_json: string;
  home_lot_id: string | null;
  home_access: HomeAccessMode;
} | null {
  const row = db
    .prepare(`SELECT player_id, token_hash, state_json, home_lot_id, home_access FROM sessions WHERE player_id = ?`)
    .get(playerId) as
    | { player_id: string; token_hash: string; state_json: string; home_lot_id: string | null; home_access: HomeAccessMode }
    | undefined;
  return row ?? null;
}

function saveSessionState(playerId: string, state: PlayerState) {
  db.prepare(`UPDATE sessions SET state_json = ?, home_access = ?, home_lot_id = ?, updated_at = ? WHERE player_id = ?`).run(
    JSON.stringify(state),
    state.homeAccess || 'open',
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

// ───────────────────────── Tontine Snapshot Helper ─────────────────────────

function getTontineSnapshot() {
  const st = db
    .prepare(`SELECT round_number, weekly_dues, current_pot, current_turn_index FROM tontine_state WHERE id = 1`)
    .get() as { round_number: number; weekly_dues: number; current_pot: number; current_turn_index: number };
  const members = db
    .prepare(`SELECT player_id, name, has_paid FROM tontine_members ORDER BY joined_at ASC`)
    .all() as Array<{ player_id: string; name: string; has_paid: number }>;
  const logs = db
    .prepare(`SELECT message FROM tontine_ledger ORDER BY id DESC LIMIT 12`)
    .all() as Array<{ message: string }>;

  return {
    roundNumber: st.round_number,
    weeklyDues: st.weekly_dues,
    currentPot: st.current_pot,
    currentTurnIndex: st.current_turn_index,
    participants: members.map((m) => ({
      id: m.player_id,
      name: m.name,
      hasPaid: Boolean(m.has_paid),
      isRealPlayer: true,
    })),
    history: logs.map((l) => l.message),
  };
}

function addTontineLog(message: string) {
  db.prepare(`INSERT INTO tontine_ledger (message, created_at) VALUES (?, ?)`).run(message, Date.now());
}

// ───────────────────────── Connected Players & Spatial Filter ─────────────────────────

interface ConnectedPlayer {
  id: string;
  name: string;
  destinyName: string;
  color: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  isDriving: boolean;
  vehicleType: string | null;
  sapeOutfit: string;
  homeType: HomeType;
  homeLotId?: string;
  homeAccess: HomeAccessMode;
  cribUpgrades: CribUpgrades;
  friendsIds: string[];
  lastChatAt: number;
  ws: WebSocket;
}

const players = new Map<string, ConnectedPlayer>();
const SPATIAL_RANGE_M = 340;
const PROFANITY_RE = /\b(connard|salope|putain|encule|bitch|fuck|nigger|fdp)\b/gi;

function cleanChatText(raw: string): string {
  return raw.trim().slice(0, 140).replace(PROFANITY_RE, '***');
}

function broadcast(msg: unknown, excludeId?: string) {
  const raw = JSON.stringify(msg);
  for (const [id, p] of players.entries()) {
    if (id !== excludeId && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(raw);
    }
  }
}

function broadcastAll(msg: unknown) {
  const raw = JSON.stringify(msg);
  for (const p of players.values()) {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(raw);
    }
  }
}

function broadcastNear(sender: ConnectedPlayer, msg: unknown) {
  const raw = JSON.stringify(msg);
  for (const [id, p] of players.entries()) {
    if (id === sender.id || p.ws.readyState !== WebSocket.OPEN) continue;
    if (Math.hypot(p.x - sender.x, p.z - sender.z) <= SPATIAL_RANGE_M) {
      p.ws.send(raw);
    }
  }
}

function serializePlayers(excludeId?: string) {
  const list: Array<Omit<ConnectedPlayer, 'ws' | 'lastChatAt'>> = [];
  for (const [id, p] of players.entries()) {
    if (id !== excludeId) {
      const { ws: _ws, lastChatAt: _lc, ...rest } = p;
      list.push(rest);
    }
  }
  return list;
}

// ───────────────────────── Server Express + WS Setup ─────────────────────────

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const t = getTontineSnapshot();
    res.json({
      status: 'ok',
      playersOnline: players.size,
      tontineRound: t.roundNumber,
      tontinePot: t.currentPot,
      tontineMembers: t.participants.length,
    });
  });

  // 1. Admin Verify & Protected Action (consistent { passcode } + IP Rate Limit + SQLite Audit Log)
  app.post('/api/admin/verify', (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkAdminRateLimit(ip)) {
      res.status(429).json({ ok: false, error: 'Trop de tentatives. Réessaie dans 10 minutes.' });
      return;
    }
    const body = req.body as { passcode?: string };
    const clean = (body.passcode || '').trim().toUpperCase();
    if (clean && timingSafeMatch(clean, ADMIN_SECRET.toUpperCase())) {
      const token = signAdminToken();
      db.prepare(`INSERT INTO admin_audit_log (action, target_player_id, details_json, ip, created_at) VALUES (?, ?, ?, ?, ?)`).run(
        'admin_verify_ok',
        null,
        '{}',
        ip,
        Date.now()
      );
      res.json({ ok: true, token });
    } else {
      recordAdminFail(ip);
      res.status(401).json({ ok: false, error: 'Code d’accès administrateur invalide.' });
    }
  });

  app.post('/api/admin/action', (req, res) => {
    const auth = req.headers.authorization?.replace('Bearer ', '');
    if (!verifyAdminToken(auth)) {
      res.status(403).json({ ok: false, error: 'Jeton admin expiré ou invalide.' });
      return;
    }
    const { targetPlayerId, action, payload } = req.body as {
      targetPlayerId?: string;
      action?: string;
      payload?: Record<string, unknown>;
    };
    if (!targetPlayerId || !action) {
      res.status(400).json({ ok: false, error: 'Paramètres manquants.' });
      return;
    }
    const row = getSessionRow(targetPlayerId);
    if (!row) {
      res.status(404).json({ ok: false, error: 'Session joueur introuvable.' });
      return;
    }

    let st = JSON.parse(row.state_json) as PlayerState;
    if (action === 'force_destiny') {
      const d = ALL_DESTINIES.find((x) => x.id === String(payload?.destinyId || ''));
      if (d) {
        st = createInitialPlayerState(d, targetPlayerId, st.sessionToken);
      }
    } else if (action === 'add_cash') {
      const amt = Math.min(100_000_000, Math.max(0, Number(payload?.amount || 0)));
      st = { ...st, cash: st.cash + amt };
    } else if (action === 'set_weather') {
      st = { ...st, weather: String(payload?.weather || 'soleil') as WeatherType };
    } else if (action === 'set_police') {
      st = { ...st, policeWanted: Math.max(0, Math.min(5, Math.round(Number(payload?.stars || 0)))) };
    } else if (action === 'refill_needs') {
      st = {
        ...st,
        isDepressed: false,
        needs: { hunger: 100, energy: 100, hygiene: 100, bladder: 100, envy: 100 },
      };
    } else if (action === 'unlock_all_badges') {
      for (const b of ['caiman', 'alysma', 'alex'] as AcademicBadge[]) {
        st = unlockBadge(st, b);
      }
    }

    saveSessionState(targetPlayerId, st);
    db.prepare(`INSERT INTO admin_audit_log (action, target_player_id, details_json, ip, created_at) VALUES (?, ?, ?, ?, ?)`).run(
      action,
      targetPlayerId,
      JSON.stringify(payload || {}),
      req.ip || 'unknown',
      Date.now()
    );
    res.json({ ok: true, state: st });
  });

  // 2. Server-Issued Session Init, Save, Fetch & RGPD Delete
  app.post('/api/session/init', (req, res) => {
    const body = req.body as { playerId?: string; sessionToken?: string; state?: PlayerState };
    if (body.playerId && body.sessionToken && verifySessionToken(body.playerId, body.sessionToken)) {
      const existing = getSessionRow(body.playerId);
      if (existing) {
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
    const baseState: PlayerState = body.state
      ? { ...body.state, playerId: newId, sessionToken: token }
      : createInitialPlayerState(ALL_DESTINIES[0], newId, token);

    const lotId = reserveLotForState(newId, baseState);
    baseState.homeLotId = lotId;

    db.prepare(
      `INSERT INTO sessions (player_id, token_hash, state_json, home_lot_id, home_access, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(newId, sha256Hex(token), JSON.stringify(baseState), lotId, baseState.homeAccess || 'open', Date.now());

    res.json({
      ok: true,
      playerId: newId,
      sessionToken: token,
      homeLotId: lotId,
      state: baseState,
    });
  });

  app.post('/api/session/save', (req, res) => {
    const { playerId, state } = req.body as { playerId?: string; state?: PlayerState };
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!playerId || !state || !verifySessionToken(playerId, token)) {
      res.status(401).json({ ok: false, error: 'Jeton de session invalide.' });
      return;
    }
    const existing = getSessionRow(playerId);
    if (!existing) {
      res.status(404).json({ ok: false });
      return;
    }
    const sanitized = { ...state, playerId, sessionToken: token };
    saveSessionState(playerId, sanitized);
    res.json({ ok: true });
  });

  app.get('/api/session/:playerId', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!verifySessionToken(req.params.playerId, token)) {
      res.status(401).json({ ok: false });
      return;
    }
    const row = getSessionRow(req.params.playerId);
    if (!row) {
      res.status(404).json({ ok: false });
      return;
    }
    res.json({ ok: true, state: JSON.parse(row.state_json) });
  });

  app.delete('/api/session/:playerId', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!verifySessionToken(req.params.playerId, token)) {
      res.status(401).json({ ok: false, error: 'Autorisation requise pour la purge.' });
      return;
    }
    const pid = req.params.playerId;
    db.prepare(`DELETE FROM sessions WHERE player_id = ?`).run(pid);
    db.prepare(`DELETE FROM tontine_members WHERE player_id = ?`).run(pid);
    db.prepare(`DELETE FROM consent_requests WHERE from_id = ? OR to_id = ?`).run(pid, pid);
    players.delete(pid);
    res.json({ ok: true, purged: true });
  });

  // 3. Server-Authoritative Economy Action Endpoint
  app.post('/api/economy/action', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { playerId, action, payload } = req.body as {
      playerId?: string;
      action?: string;
      payload?: Record<string, unknown>;
    };
    if (!playerId || !action || !verifySessionToken(playerId, token)) {
      res.status(401).json({ ok: false, error: 'Non autorisé.' });
      return;
    }
    const row = getSessionRow(playerId);
    if (!row) {
      res.status(404).json({ ok: false, error: 'Session inconnue.' });
      return;
    }

    let st = JSON.parse(row.state_json) as PlayerState;
    const amt = Math.max(0, Number(payload?.amount || 0));

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
        const ft = payFastTravel(st, String(payload?.districtName || 'Abidjan'));
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
      case 'work': {
        const job = CAREERS.find((j) => j.id === String(payload?.jobId || ''));
        st = job ? performCareerJob(st, job) : performWorkShift(st);
        break;
      }
      case 'loto':
        st = playLotoAkwaba(st);
        break;
      case 'unlock_badge': {
        const bId = String(payload?.badgeId || '') as AcademicBadge;
        if (ACADEMIC_BADGES.some((b) => b.id === bId)) st = unlockBadge(st, bId);
        break;
      }
      case 'yannis_academy':
        st = donateYannisAcademy(st);
        break;
      case 'clear_police':
        st = clearPoliceViaNetwork(st, Boolean(payload?.isBlackMarket));
        break;
      case 'lavage_etoile':
        st = performLavageEtoile(st);
        break;
      case 'marriage':
        st = performCivilMarriage(st, String(payload?.partnerName || 'Partenaire'));
        break;
      case 'woohoo':
        st = performConsensualWooHoo(st, String(payload?.partnerName || 'Partenaire'));
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
      case 'set_home_access': {
        const mode = String(payload?.mode || 'open') as HomeAccessMode;
        if (mode === 'open' || mode === 'friends' || mode === 'closed') {
          st = setHomeAccessMode(st, mode);
          const cp = players.get(playerId);
          if (cp) cp.homeAccess = mode;
        }
        break;
      }
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
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let myId: string | null = null;

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type: string; payload?: Record<string, unknown> };

        if (msg.type === 'player:join' && msg.payload) {
          const p = msg.payload;
          const pid = String(p.id || '');
          const authToken = String(p.authToken || '');
          if (!pid || !verifySessionToken(pid, authToken)) {
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Session WebSocket non authentifiée.' } }));
            return;
          }
          myId = pid;
          const row = getSessionRow(pid);
          const dbState = row ? (JSON.parse(row.state_json) as PlayerState) : null;

          const entry: ConnectedPlayer = {
            id: pid,
            name: String(p.name || 'Habitant de Babi').slice(0, 36),
            destinyName: String(p.destinyName || 'Citoyen').slice(0, 48),
            color: String(p.color || '#f97316'),
            x: Number(p.x || 0),
            y: Number(p.y || 0),
            z: Number(p.z || 0),
            rotY: Number(p.rotY || 0),
            isDriving: Boolean(p.isDriving),
            vehicleType: p.vehicleType ? String(p.vehicleType) : null,
            sapeOutfit: String(p.sapeOutfit || 'standard'),
            homeType: (dbState?.destiny.homeType || p.homeType || 'studio') as HomeType,
            homeLotId: row?.home_lot_id ?? undefined,
            homeAccess: dbState?.homeAccess ?? 'open',
            cribUpgrades: dbState?.cribUpgrades ?? {
              splitClim: false,
              bafflesMaquis: false,
              tv4k: false,
              canapeCuir: false,
            },
            friendsIds: dbState?.friendsIds ?? [],
            lastChatAt: 0,
            ws,
          };
          players.set(pid, entry);

          ws.send(
            JSON.stringify({
              type: 'world:init',
              payload: {
                players: serializePlayers(pid),
                onlineCount: players.size,
                tontine: getTontineSnapshot(),
              },
            })
          );

          const { ws: _w, lastChatAt: _lc, ...publicPlayer } = entry;
          broadcast({ type: 'player:joined', payload: { player: publicPlayer, onlineCount: players.size } }, pid);
        }

        if (msg.type === 'player:move' && myId && msg.payload) {
          const p = players.get(myId);
          if (p) {
            p.x = Number(msg.payload.x || 0);
            p.y = Number(msg.payload.y || 0);
            p.z = Number(msg.payload.z || 0);
            p.rotY = Number(msg.payload.rotY || 0);
            p.isDriving = Boolean(msg.payload.isDriving);
            p.vehicleType = msg.payload.vehicleType ? String(msg.payload.vehicleType) : null;
            p.sapeOutfit = String(msg.payload.sapeOutfit || p.sapeOutfit);

            broadcastNear(p, {
              type: 'player:moved',
              payload: {
                id: myId,
                x: p.x,
                y: p.y,
                z: p.z,
                rotY: p.rotY,
                isDriving: p.isDriving,
                vehicleType: p.vehicleType,
                sapeOutfit: p.sapeOutfit,
              },
            });
          }
        }

        if (msg.type === 'chat:send' && myId && msg.payload) {
          const p = players.get(myId);
          const now = Date.now();
          if (!p || now - p.lastChatAt < 800) return;
          const cleaned = cleanChatText(String(msg.payload.text || ''));
          if (!cleaned) return;
          p.lastChatAt = now;
          broadcastAll({
            type: 'chat:message',
            payload: {
              id: `chat_${now}_${Math.random().toString(36).slice(2, 6)}`,
              senderId: myId,
              senderName: p.name,
              text: cleaned,
              time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            },
          });
        }

        if (msg.type === 'chat:report' && myId && msg.payload) {
          db.prepare(
            `INSERT INTO chat_reports (reporter_id, message_id, sender_id, reason, created_at) VALUES (?, ?, ?, ?, ?)`
          ).run(
            myId,
            String(msg.payload.messageId || ''),
            String(msg.payload.senderId || ''),
            String(msg.payload.reason || 'Signalement citoyen').slice(0, 120),
            Date.now()
          );
        }

        // --- REAL MULTIPLAYER TONTINE (0 FAKE NPCS, SQLITE BALANCE VERIFIED) ---
        if (msg.type === 'tontine:join' && myId) {
          const p = players.get(myId);
          db.prepare(`INSERT OR IGNORE INTO tontine_members (player_id, name, has_paid, joined_at) VALUES (?, ?, 0, ?)`).run(
            myId,
            p?.name || `Citoyen ${myId.slice(0, 6)}`,
            Date.now()
          );
          addTontineLog(`${p?.name || myId} a rejoint la Tontine réelle d’Abidjan.`);
          broadcastAll({ type: 'tontine:update', payload: getTontineSnapshot() });
        }

        if (msg.type === 'tontine:contribute' && myId) {
          const member = db
            .prepare(`SELECT player_id, name, has_paid FROM tontine_members WHERE player_id = ?`)
            .get(myId) as { player_id: string; name: string; has_paid: number } | undefined;
          const stRow = getSessionRow(myId);
          const tState = db
            .prepare(`SELECT round_number, weekly_dues, current_pot, current_turn_index FROM tontine_state WHERE id = 1`)
            .get() as { round_number: number; weekly_dues: number; current_pot: number; current_turn_index: number };

          if (!member || !stRow) {
            ws.send(JSON.stringify({ type: 'tontine:error', payload: { message: 'Rejoins d’abord la Tontine.' } }));
            return;
          }
          if (member.has_paid) {
            ws.send(JSON.stringify({ type: 'tontine:error', payload: { message: 'Déjà cotisé pour ce tour.' } }));
            return;
          }
          const playerState = JSON.parse(stRow.state_json) as PlayerState;
          if (playerState.cash < tState.weekly_dues) {
            ws.send(JSON.stringify({ type: 'tontine:error', payload: { message: 'Solde liquide insuffisant (50 000 FCFA requis).' } }));
            return;
          }

          // Authoritative debit
          playerState.cash -= tState.weekly_dues;
          saveSessionState(myId, playerState);

          db.prepare(`UPDATE tontine_members SET has_paid = 1 WHERE player_id = ?`).run(myId);
          const newPot = tState.current_pot + tState.weekly_dues;
          db.prepare(`UPDATE tontine_state SET current_pot = ? WHERE id = 1`).run(newPot);
          addTontineLog(`💵 ${member.name} a cotisé ${tState.weekly_dues.toLocaleString('fr-FR')} FCFA.`);

          const allMembers = db
            .prepare(`SELECT player_id, name, has_paid FROM tontine_members ORDER BY joined_at ASC`)
            .all() as Array<{ player_id: string; name: string; has_paid: number }>;

          if (allMembers.length >= 2 && allMembers.every((m) => m.has_paid === 1)) {
            const recipient = allMembers[tState.current_turn_index % allMembers.length];
            const recRow = getSessionRow(recipient.player_id);
            if (recRow) {
              const recState = JSON.parse(recRow.state_json) as PlayerState;
              recState.cash += newPot;
              saveSessionState(recipient.player_id, recState);
            }
            addTontineLog(
              `🎉 Tour #${tState.round_number} : ${recipient.name} ramasse ${newPot.toLocaleString('fr-FR')} FCFA !`
            );
            db.prepare(
              `UPDATE tontine_state SET round_number = round_number + 1, current_pot = 0, current_turn_index = ? WHERE id = 1`
            ).run((tState.current_turn_index + 1) % allMembers.length);
            db.prepare(`UPDATE tontine_members SET has_paid = 0`).run();

            const recPlayer = players.get(recipient.player_id);
            if (recPlayer && recPlayer.ws.readyState === WebSocket.OPEN) {
              recPlayer.ws.send(JSON.stringify({ type: 'tontine:payout', payload: { amount: newPot } }));
            }
          }

          broadcastAll({ type: 'tontine:update', payload: getTontineSnapshot() });
        }

        if (msg.type === 'tontine:flee' && myId) {
          const p = players.get(myId);
          const tState = db
            .prepare(`SELECT current_pot FROM tontine_state WHERE id = 1`)
            .get() as { current_pot: number };
          const stRow = getSessionRow(myId);
          if (tState.current_pot > 0 && stRow && p) {
            const stolen = tState.current_pot;
            const playerState = JSON.parse(stRow.state_json) as PlayerState;
            playerState.cash += stolen;
            playerState.policeWanted = Math.min(5, playerState.policeWanted + 3);
            saveSessionState(myId, playerState);

            db.prepare(`UPDATE tontine_state SET current_pot = 0 WHERE id = 1`).run();
            db.prepare(`UPDATE tontine_members SET has_paid = 0`).run();
            addTontineLog(
              `🚨 SCANDALE : ${p.name} s’est enfui avec la caisse (${stolen.toLocaleString('fr-FR')} F) !`
            );
            ws.send(JSON.stringify({ type: 'tontine:flee_result', payload: { amount: stolen } }));
            broadcastAll({ type: 'tontine:update', payload: getTontineSnapshot() });
          }
        }

        // --- PERSISTENT & CANCELLABLE BILATERAL CONSENT ---
        if (msg.type === 'consent:request' && myId && msg.payload) {
          const targetId = String(msg.payload.targetPlayerId || '');
          const kind = msg.payload.kind === 'marriage' ? 'marriage' : 'woohoo';
          const target = players.get(targetId);
          const sender = players.get(myId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            const requestId = `c_${crypto.randomUUID()}`;
            db.prepare(
              `INSERT INTO consent_requests (request_id, from_id, to_id, kind, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`
            ).run(requestId, myId, targetId, kind, Date.now());

            target.ws.send(
              JSON.stringify({
                type: 'consent:incoming',
                payload: {
                  requestId,
                  fromPlayerId: myId,
                  fromName: sender?.name || 'Un citoyen',
                  type: kind,
                  status: 'pending',
                },
              })
            );
            ws.send(JSON.stringify({ type: 'consent:sent', payload: { requestId, toPlayerId: targetId, kind } }));
          }
        }

        if (msg.type === 'consent:cancel' && myId && msg.payload) {
          const requestId = String(msg.payload.requestId || '');
          const row = db
            .prepare(`SELECT from_id, to_id, status FROM consent_requests WHERE request_id = ?`)
            .get(requestId) as { from_id: string; to_id: string; status: string } | undefined;
          if (row && row.from_id === myId && row.status === 'pending') {
            db.prepare(`UPDATE consent_requests SET status = 'cancelled' WHERE request_id = ?`).run(requestId);
            const target = players.get(row.to_id);
            target?.ws.send(JSON.stringify({ type: 'consent:cancelled', payload: { requestId } }));
          }
        }

        if (msg.type === 'consent:respond' && myId && msg.payload) {
          const requestId = String(msg.payload.requestId || '');
          const accepted = Boolean(msg.payload.accepted);
          const row = db
            .prepare(`SELECT from_id, to_id, kind, status FROM consent_requests WHERE request_id = ?`)
            .get(requestId) as { from_id: string; to_id: string; kind: 'woohoo' | 'marriage'; status: string } | undefined;
          if (!row || row.to_id !== myId || row.status !== 'pending') return;

          db.prepare(`UPDATE consent_requests SET status = ? WHERE request_id = ?`).run(
            accepted ? 'accepted' : 'declined',
            requestId
          );

          const sender = players.get(row.from_id);
          const responder = players.get(myId);

          if (accepted) {
            const sRow = getSessionRow(row.from_id);
            const rRow = getSessionRow(myId);
            if (sRow) {
              let st = JSON.parse(sRow.state_json) as PlayerState;
              st = row.kind === 'marriage'
                ? performCivilMarriage(st, responder?.name || 'Partenaire')
                : performConsensualWooHoo(st, responder?.name || 'Partenaire');
              saveSessionState(row.from_id, st);
            }
            if (rRow) {
              let st = JSON.parse(rRow.state_json) as PlayerState;
              st = row.kind === 'marriage'
                ? performCivilMarriage(st, sender?.name || 'Partenaire')
                : performConsensualWooHoo(st, sender?.name || 'Partenaire');
              saveSessionState(myId, st);
            }
          }

          sender?.ws.send(
            JSON.stringify({
              type: 'consent:resolved',
              payload: {
                requestId,
                accepted,
                partnerName: responder?.name || 'Partenaire',
                kind: row.kind,
              },
            })
          );
        }

        // --- HOUSE KNOCK & VISIT PERMISSIONS ---
        if (msg.type === 'house:visit_request' && myId && msg.payload) {
          const ownerId = String(msg.payload.ownerId || '');
          const owner = players.get(ownerId);
          const visitor = players.get(myId);
          if (!owner || !visitor) return;

          const ownerRow = getSessionRow(ownerId);
          const ownerState = ownerRow ? (JSON.parse(ownerRow.state_json) as PlayerState) : null;
          const access = ownerState?.homeAccess ?? owner.homeAccess;
          const seedKey = `${ownerId}|${ownerState?.destiny.id || owner.destinyName}`;

          if (access === 'closed') {
            ws.send(
              JSON.stringify({
                type: 'house:visit_resolved',
                payload: { approved: false, ownerName: owner.name, reason: 'Porte fermée à clé par le propriétaire.' },
              })
            );
          } else if (access === 'open' || owner.friendsIds.includes(myId)) {
            ws.send(
              JSON.stringify({
                type: 'house:visit_resolved',
                payload: {
                  approved: true,
                  ownerId,
                  ownerName: owner.name,
                  homeType: ownerState?.destiny.homeType || owner.homeType,
                  seedKey,
                  upgrades: ownerState?.cribUpgrades || owner.cribUpgrades,
                },
              })
            );
          } else {
            // 'friends' and not yet friend -> knock live
            owner.ws.send(
              JSON.stringify({
                type: 'house:knock_incoming',
                payload: {
                  requestId: myId,
                  fromPlayerId: myId,
                  fromName: visitor.name,
                  lotId: ownerRow?.home_lot_id || '',
                },
              })
            );
          }
        }

        if (msg.type === 'house:knock_respond' && myId && msg.payload) {
          const visitorId = String(msg.payload.visitorId || '');
          const accepted = Boolean(msg.payload.accepted);
          const owner = players.get(myId);
          const visitor = players.get(visitorId);
          if (!owner || !visitor) return;

          const ownerRow = getSessionRow(myId);
          const ownerState = ownerRow ? (JSON.parse(ownerRow.state_json) as PlayerState) : null;

          if (accepted) {
            if (ownerState && !ownerState.friendsIds.includes(visitorId)) {
              ownerState.friendsIds.push(visitorId);
              saveSessionState(myId, ownerState);
              owner.friendsIds = ownerState.friendsIds;
            }
            visitor.ws.send(
              JSON.stringify({
                type: 'house:visit_resolved',
                payload: {
                  approved: true,
                  ownerId: myId,
                  ownerName: owner.name,
                  homeType: ownerState?.destiny.homeType || owner.homeType,
                  seedKey: `${myId}|${ownerState?.destiny.id || owner.destinyName}`,
                  upgrades: ownerState?.cribUpgrades || owner.cribUpgrades,
                },
              })
            );
          } else {
            visitor.ws.send(
              JSON.stringify({
                type: 'house:visit_resolved',
                payload: {
                  approved: false,
                  ownerName: owner.name,
                  reason: `${owner.name} n’a pas ouvert la porte.`,
                },
              })
            );
          }
        }
      } catch {
        // Ignore malformed frame
      }
    });

    ws.on('close', () => {
      if (myId) {
        players.delete(myId);
        broadcast({ type: 'player:left', payload: { id: myId, onlineCount: players.size } });
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🇨🇮 BLV Babi Life Vibes V3 Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
