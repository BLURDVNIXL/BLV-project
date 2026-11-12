// BLV — Babi Life Vibes
// Cœur physique 2.5D (C++ freestanding -> WebAssembly), Règle 2 du CONTEXT.md.
// Conventions : y vers le haut ; cap h : avant = (sin h, cos h), droite = (-cos h, sin h).
// Boîtes : axes e1 = (c, s), e2 = (-s, c). Pour un véhicule : c = sin h, s = cos h.
// Licence : Apache-2.0 (code original BLV, inspiré des principes de VehicleController/PlayerController
// de SanAndreasUnity (MIT) mais sans reprise de leur code).

typedef float f32;
typedef unsigned int u32;
typedef int i32;
typedef unsigned char u8;

#define EXPORT(name) extern "C" __attribute__((export_name(#name)))

// ───────────────────────── Maths sans libc ─────────────────────────
static const f32 PI_F = 3.14159265358979f;
static inline f32 absf(f32 x) { return __builtin_fabsf(x); }
static inline f32 sqrtf_(f32 x) { return __builtin_sqrtf(x); }
static inline f32 minf(f32 a, f32 b) { return a < b ? a : b; }
static inline f32 maxf(f32 a, f32 b) { return a > b ? a : b; }
static inline f32 clampf(f32 x, f32 lo, f32 hi) { return x < lo ? lo : (x > hi ? hi : x); }
static inline f32 signf(f32 x) { return x < 0.f ? -1.f : 1.f; }

static f32 sinf_(f32 x) {
  const f32 TWO = 6.28318530718f;
  x = x - TWO * __builtin_floorf((x + PI_F) / TWO);
  if (x > PI_F * 0.5f) x = PI_F - x;
  else if (x < -PI_F * 0.5f) x = -PI_F - x;
  f32 x2 = x * x;
  return x * (1.f + x2 * (-1.f / 6.f + x2 * (1.f / 120.f + x2 * (-1.f / 5040.f + x2 * (1.f / 362880.f)))));
}
static inline f32 cosf_(f32 x) { return sinf_(x + PI_F * 0.5f); }
static f32 atanf_(f32 x) { // |x| <= 1
  f32 x2 = x * x;
  return x * (0.9998660f + x2 * (-0.3302995f + x2 * (0.1801410f + x2 * (-0.0851330f + x2 * 0.0208351f))));
}
static f32 atan2f_(f32 y, f32 x) {
  f32 ax = absf(x), ay = absf(y);
  if (ax == 0.f && ay == 0.f) return 0.f;
  f32 a = ay <= ax ? atanf_(ay / ax) : PI_F * 0.5f - atanf_(ax / ay);
  if (x < 0.f) a = PI_F - a;
  return y < 0.f ? -a : a;
}
static f32 atan_any(f32 x) { // atan pour tout x
  if (absf(x) <= 1.f) return atanf_(x);
  f32 a = PI_F * 0.5f - atanf_(1.f / absf(x));
  return x < 0.f ? -a : a;
}
static f32 wrapAngle(f32 a) {
  const f32 TWO = 6.28318530718f;
  return a - TWO * __builtin_floorf((a + PI_F) / TWO);
}

// ───────────────────────── Décor statique + grille ─────────────────────────
#define MAX_SOLIDS 32768
#define MAX_ENT 262144
#define WORLD_HALF 3072.f
#define CELL 16.f
#define GRID_N 384

struct Solid {
  f32 cx, cz, hx, hz, c, s, r, h;
  u32 flags;
  u8 type;    // 0 boîte orientée, 1 cylindre
  u8 enabled;
  u8 used;    // 0 = emplacement libre (réutilisable)
};
static Solid solids[MAX_SOLIDS];
static i32 solidCount = 0;      // plus grand indice utilisé + 1
static i32 liveSolids = 0;      // solides actuellement présents
static i32 freeSolids[MAX_SOLIDS];
static i32 freeSolidCount = 0;
static i32 gridHead[GRID_N * GRID_N];
static i32 entNext[MAX_ENT];
static i32 entSolid[MAX_ENT];
static i32 entCount = 0;        // plus grand indice d'entrée utilisé + 1
static i32 entFree = -1;        // liste chaînée des entrées libres
static u32 solidStamp[MAX_SOLIDS];
static u32 stampCounter = 0;

static inline i32 cellOf(f32 v) {
  i32 i = (i32)__builtin_floorf((v + WORLD_HALF) / CELL);
  return i < 0 ? 0 : (i >= GRID_N ? GRID_N - 1 : i);
}

static void solidCellRange(const Solid& s, i32& x0, i32& x1, i32& z0, i32& z1) {
  f32 ex, ez;
  if (s.type == 0) { ex = s.hx * absf(s.c) + s.hz * absf(s.s); ez = s.hx * absf(s.s) + s.hz * absf(s.c); }
  else { ex = ez = s.r; }
  x0 = cellOf(s.cx - ex); x1 = cellOf(s.cx + ex); z0 = cellOf(s.cz - ez); z1 = cellOf(s.cz + ez);
}

static i32 allocEntry() {
  if (entFree >= 0) { i32 e = entFree; entFree = entNext[e]; return e; }
  if (entCount >= MAX_ENT) return -1;
  return entCount++;
}

static i32 insertSolid(const Solid& s) {
  i32 x0, x1, z0, z1;
  solidCellRange(s, x0, x1, z0, z1);
  // place nécessaire : entrées libres + non encore utilisées
  i32 need = (x1 - x0 + 1) * (z1 - z0 + 1);
  i32 freeEntries = MAX_ENT - entCount;
  for (i32 e = entFree; e >= 0 && freeEntries < need; e = entNext[e]) freeEntries++;
  if (freeEntries < need) return -1;
  i32 id;
  if (freeSolidCount > 0) id = freeSolids[--freeSolidCount];
  else if (solidCount < MAX_SOLIDS) id = solidCount++;
  else return -1;
  solids[id] = s;
  solids[id].used = 1;
  liveSolids++;
  for (i32 gz = z0; gz <= z1; gz++)
    for (i32 gx = x0; gx <= x1; gx++) {
      i32 cell = gz * GRID_N + gx;
      i32 e = allocEntry();
      entSolid[e] = id;
      entNext[e] = gridHead[cell];
      gridHead[cell] = e;
    }
  return id;
}

static void removeSolid(i32 id) {
  if (id < 0 || id >= solidCount || !solids[id].used) return;
  i32 x0, x1, z0, z1;
  solidCellRange(solids[id], x0, x1, z0, z1);
  for (i32 gz = z0; gz <= z1; gz++)
    for (i32 gx = x0; gx <= x1; gx++) {
      i32 cell = gz * GRID_N + gx;
      i32 prev = -1;
      for (i32 e = gridHead[cell]; e >= 0; ) {
        i32 nxt = entNext[e];
        if (entSolid[e] == id) {
          if (prev < 0) gridHead[cell] = nxt; else entNext[prev] = nxt;
          entNext[e] = entFree; entFree = e;
        } else prev = e;
        e = nxt;
      }
    }
  solids[id].used = 0; solids[id].enabled = 0;
  freeSolids[freeSolidCount++] = id;
  liveSolids--;
}

// ───────────────────────── Primitives de contact ─────────────────────────
struct OBB { f32 cx, cz, hx, hz, c, s; };
struct Contact { f32 nx, nz, depth, px, pz; };

static bool obbVsObb(const OBB& A, const OBB& B, Contact& out) {
  f32 axes[4][2] = { { A.c, A.s }, { -A.s, A.c }, { B.c, B.s }, { -B.s, B.c } };
  f32 dx = B.cx - A.cx, dz = B.cz - A.cz;
  f32 best = 1e9f; i32 bestI = -1; f32 bnx = 0, bnz = 0;
  for (i32 i = 0; i < 4; i++) {
    f32 nx = axes[i][0], nz = axes[i][1];
    f32 ra = A.hx * absf(A.c * nx + A.s * nz) + A.hz * absf(-A.s * nx + A.c * nz);
    f32 rb = B.hx * absf(B.c * nx + B.s * nz) + B.hz * absf(-B.s * nx + B.c * nz);
    f32 d = dx * nx + dz * nz;
    f32 ov = ra + rb - absf(d);
    if (ov <= 0.f) return false;
    if (ov < best) { best = ov; bestI = i; f32 sg = d < 0.f ? -1.f : 1.f; bnx = nx * sg; bnz = nz * sg; }
  }
  out.nx = bnx; out.nz = bnz; out.depth = best;
  if (bestI < 2) { // face de A touchée par un sommet de B
    f32 e1x = B.c, e1z = B.s, e2x = -B.s, e2z = B.c;
    f32 s1 = (-(bnx * e1x + bnz * e1z)) < 0.f ? -1.f : 1.f;
    f32 s2 = (-(bnx * e2x + bnz * e2z)) < 0.f ? -1.f : 1.f;
    out.px = B.cx + s1 * B.hx * e1x + s2 * B.hz * e2x;
    out.pz = B.cz + s1 * B.hx * e1z + s2 * B.hz * e2z;
  } else {
    f32 e1x = A.c, e1z = A.s, e2x = -A.s, e2z = A.c;
    f32 s1 = (bnx * e1x + bnz * e1z) < 0.f ? -1.f : 1.f;
    f32 s2 = (bnx * e2x + bnz * e2z) < 0.f ? -1.f : 1.f;
    out.px = A.cx + s1 * A.hx * e1x + s2 * A.hz * e2x;
    out.pz = A.cz + s1 * A.hx * e1z + s2 * A.hz * e2z;
  }
  return true;
}

// n pointe de la boîte vers le cercle
static bool obbVsCircle(const OBB& A, f32 cx, f32 cz, f32 r, Contact& out) {
  f32 dx = cx - A.cx, dz = cz - A.cz;
  f32 lx = dx * A.c + dz * A.s, lz = -dx * A.s + dz * A.c;
  f32 qx = clampf(lx, -A.hx, A.hx), qz = clampf(lz, -A.hz, A.hz);
  f32 ddx = lx - qx, ddz = lz - qz;
  f32 d2 = ddx * ddx + ddz * ddz;
  if (d2 > 1e-10f) {
    if (d2 >= r * r) return false;
    f32 d = sqrtf_(d2);
    f32 nlx = ddx / d, nlz = ddz / d;
    out.nx = nlx * A.c - nlz * A.s; out.nz = nlx * A.s + nlz * A.c;
    out.depth = r - d;
  } else { // centre à l'intérieur : sortie par la face la plus proche
    f32 px = A.hx - absf(lx), pz = A.hz - absf(lz);
    f32 nlx, nlz;
    if (px < pz) { nlx = signf(lx); nlz = 0.f; out.depth = px + r; qx = signf(lx) * A.hx; qz = lz; }
    else { nlx = 0.f; nlz = signf(lz); out.depth = pz + r; qz = signf(lz) * A.hz; qx = lx; }
    out.nx = nlx * A.c - nlz * A.s; out.nz = nlx * A.s + nlz * A.c;
  }
  out.px = A.cx + qx * A.c - qz * A.s;
  out.pz = A.cz + qx * A.s + qz * A.c;
  return true;
}

// ───────────────────────── Événements ─────────────────────────
#define MAX_EVENTS 256
static f32 events[MAX_EVENTS][8];
static i32 eventCount = 0;
static void pushEvent(f32 type, f32 a, f32 b, f32 impulse, f32 x, f32 z, f32 speed) {
  if (eventCount >= MAX_EVENTS) return;
  f32* e = events[eventCount++];
  e[0] = type; e[1] = a; e[2] = b; e[3] = impulse; e[4] = x; e[5] = z; e[6] = speed; e[7] = 0.f;
}

// ───────────────────────── Véhicules ─────────────────────────
#define MAX_VEH 64
struct VehPreset {
  f32 mass, a, b, hl, hw, hcg;      // kg, m
  f32 power, maxForce, cd, mu;      // W, N, coeff. traînée (N/(m/s)^2), adhérence
  f32 brake, maxSteer, steerRef, steerRate;
  f32 driveRear, vmax;              // part de motricité arrière, vitesse max (m/s)
};
static const VehPreset PRESETS[] = {
  // 0 Wôrô-wôrô (Peugeot 504 communal)
  { 1300, 1.30f, 1.44f, 2.25f, 1.02f, 0.55f, 55000, 7500, 0.90f, 1.05f, 13000, 0.58f, 20.f, 4.5f, 1.0f, 55.f },
  // 1 Gbaka (Mercedes 207 D)
  { 3000, 1.50f, 1.80f, 2.85f, 1.05f, 0.90f, 50000, 9000, 1.60f, 0.95f, 24000, 0.50f, 16.f, 3.2f, 1.0f, 40.f },
  // 2 Police nationale (berline)
  { 1500, 1.30f, 1.35f, 2.30f, 1.02f, 0.52f, 110000, 10500, 0.90f, 1.15f, 15500, 0.58f, 22.f, 5.0f, 1.0f, 60.f },
  // 3 Land Cruiser
  { 2300, 1.50f, 1.50f, 2.30f, 1.05f, 0.80f, 150000, 14000, 1.30f, 1.05f, 20000, 0.52f, 19.f, 4.0f, 0.5f, 55.f },
  // 4 Coupé GT
  { 1300, 1.25f, 1.40f, 2.25f, 1.02f, 0.45f, 190000, 12500, 0.75f, 1.30f, 17500, 0.60f, 24.f, 5.5f, 1.0f, 66.f },
};
#define PRESET_COUNT 5
#define VEH_OUT 24

struct Vehicle {
  VehPreset p;
  f32 inertia;
  u8 used, enabled;
  f32 x, z, h, vx, vz, w;
  f32 steer, inAccel, inSteer, inHand;
  f32 axS, ayS;          // accélérations lissées (transfert de masse, assiette)
  f32 wheel, gear, rpm, skid, hitCooldown;
  f32 y;
  f32 out[VEH_OUT];
};
static Vehicle veh[MAX_VEH];

static void vehPublish(Vehicle& v) {
  f32 fx = sinf_(v.h), fz = cosf_(v.h);
  f32 vf = v.vx * fx + v.vz * fz;
  f32 vl = v.vx * (-fz) + v.vz * fx; // droite = (-cos h, sin h) = (-fz, fx)
  f32* o = v.out;
  o[0] = v.x; o[1] = v.y; o[2] = v.z; o[3] = v.h; o[4] = v.vx; o[5] = v.vz;
  o[6] = vf; o[7] = vl; o[8] = v.w; o[9] = v.steer; o[10] = v.rpm; o[11] = v.gear;
  o[12] = v.wheel; o[13] = v.skid;
  o[14] = clampf(v.axS * 0.0045f, -0.07f, 0.07f);   // assiette (nez levé > 0)
  o[15] = clampf(-v.ayS * 0.0060f, -0.10f, 0.10f);  // roulis (côté droit bas > 0)
  o[16] = sqrtf_(v.vx * v.vx + v.vz * v.vz);
}

static f32 tireLat(f32 alpha, f32 muN) { // formule magique simplifiée
  return -muN * sinf_(1.5f * atan_any(9.0f * alpha));
}

static void vehicleDynamics(Vehicle& v, f32 dt) {
  const VehPreset& p = v.p;
  f32 L = p.a + p.b;
  f32 g = 9.81f;
  f32 fx = sinf_(v.h), fz = cosf_(v.h);
  f32 rx = -fz, rz = fx;
  f32 vf = v.vx * fx + v.vz * fz;
  f32 vl = v.vx * rx + v.vz * rz;
  f32 spd = sqrtf_(vf * vf + vl * vl);

  // Direction : braquage réduit avec la vitesse, vitesse de rotation limitée
  f32 target = v.inSteer * p.maxSteer / (1.f + (absf(vf) / p.steerRef) * (absf(vf) / p.steerRef));
  f32 dStep = p.steerRate * 0.2f * dt * 5.f; // ~ steerRate/5 rad/s
  v.steer += clampf(target - v.steer, -dStep, dStep);
  f32 cd_ = cosf_(v.steer), sd_ = sinf_(v.steer);

  // Charges verticales avec transfert de masse
  f32 mg = p.mass * g;
  f32 Nf = mg * p.b / L - p.mass * v.axS * p.hcg / L;
  f32 Nr = mg * p.a / L + p.mass * v.axS * p.hcg / L;
  Nf = clampf(Nf, 0.15f * mg, 0.85f * mg);
  Nr = clampf(Nr, 0.15f * mg, 0.85f * mg);

  // Longitudinal
  f32 accel = v.inAccel;
  f32 Fdrive = 0.f, Fbrake = 0.f;
  if (accel * vf < -0.5f) {
    Fbrake = absf(accel) * p.brake;
  } else if (accel != 0.f) {
    f32 dir = signf(accel);
    f32 F = minf(p.maxForce, p.power / maxf(absf(vf), 2.5f));
    if (dir < 0.f) { F *= 0.55f; if (vf < -14.f) F = 0.f; }
    if (dir > 0.f && vf > p.vmax) F = 0.f;
    Fdrive = dir * absf(accel) * F;
  } else {
    Fbrake = 350.f; // frein moteur / roulement
  }
  f32 frontBrakeShare = 0.65f;
  f32 Fx_f = 0.f, Fx_r = 0.f;
  f32 Fb = (absf(vf) > 0.15f) ? -signf(vf) * Fbrake : -vf * Fbrake * 0.01f;
  Fb = clampf(Fb, -p.mass * absf(vf) / dt * 0.5f, p.mass * absf(vf) / dt * 0.5f);
  Fx_f += Fb * frontBrakeShare + Fdrive * (1.f - p.driveRear);
  Fx_r += Fb * (1.f - frontBrakeShare) + Fdrive * p.driveRear;
  bool hb = v.inHand > 0.5f;
  f32 muF = p.mu, muR = p.mu;
  if (hb) {
    if (absf(vf) > 0.15f) Fx_r += -signf(vf) * minf(p.brake * 0.9f, p.mu * Nr * 0.9f);
    muR *= (absf(vf) > 1.0f) ? 0.30f : 1.0f;
  }
  // Cercle de friction
  f32 capF = muF * Nf, capR = muR * Nr;
  Fx_f = clampf(Fx_f, -capF, capF);
  Fx_r = clampf(Fx_r, -capR, capR);
  f32 latScaleF = sqrtf_(maxf(0.f, 1.f - (Fx_f / capF) * (Fx_f / capF)));
  f32 latScaleR = sqrtf_(maxf(0.f, 1.f - (Fx_r / capR) * (Fx_r / capR)));
  if (hb && absf(vf) > 1.f) latScaleR = 1.f; // roues bloquées : la perte d'adhérence est déjà dans muR

  // Angles de dérive
  f32 vlF = vl - v.w * p.a;
  f32 vlR = vl + v.w * p.b;
  f32 vLongW = vf * cd_ + vlF * sd_;
  f32 vLatW = -vf * sd_ + vlF * cd_;
  f32 alphaF = vLatW / (absf(vLongW) + 0.6f);
  f32 alphaR = vlR / (absf(vf) + 0.6f);
  f32 FyF_w = tireLat(alphaF, capF) * latScaleF;
  f32 FyR = tireLat(alphaR, capR) * latScaleR;

  // Forces en repère véhicule (avant, droite)
  f32 Ffwd_f = Fx_f * cd_ - FyF_w * sd_;
  f32 Fright_f = Fx_f * sd_ + FyF_w * cd_;
  f32 Ffwd = Ffwd_f + Fx_r;
  f32 Fright = Fright_f + FyR;
  // Traînée aérodynamique + roulement
  f32 cdrag = p.cd;
  Ffwd += -cdrag * vf * spd - 0.012f * mg * (absf(vf) > 0.2f ? signf(vf) : vf / 0.2f);
  Fright += -cdrag * 2.5f * vl * spd;

  f32 torque = -p.a * Fright_f + p.b * FyR;
  f32 ax = Ffwd / p.mass, ay = Fright / p.mass;

  v.vx += (ax * fx + ay * rx) * dt;
  v.vz += (ax * fz + ay * rz) * dt;
  v.w += torque / v.inertia * dt;
  v.w *= 1.f / (1.f + 0.35f * dt);

  // Stationnement : évite le tremblement à très basse vitesse
  f32 sp2 = sqrtf_(v.vx * v.vx + v.vz * v.vz);
  if (sp2 < 1.2f && v.inAccel == 0.f) {
    f32 k = 1.f / (1.f + 5.f * dt);
    v.vx *= k; v.vz *= k; v.w *= 1.f / (1.f + 8.f * dt);
    if (sp2 < 0.05f) { v.vx = 0.f; v.vz = 0.f; }
  }
  if (sp2 > p.vmax * 1.25f) { f32 k = p.vmax * 1.25f / sp2; v.vx *= k; v.vz *= k; }

  v.x += v.vx * dt; v.z += v.vz * dt; v.h = wrapAngle(v.h + v.w * dt);

  // Lissage des accélérations (pour transfert de masse / assiette)
  f32 lp = clampf(dt * 8.f, 0.f, 1.f);
  v.axS += (ax - v.axS) * lp;
  v.ayS += (ay - v.ayS) * lp;

  // Roues, régime, dérapage (pour le son et les traces)
  v.wheel += (vf / 0.32f) * dt;
  static const f32 ratios[5] = { 3.8f, 2.4f, 1.65f, 1.2f, 0.9f };
  f32 whRpm = absf(vf) / 0.32f * 3.9f * 60.f / (2.f * PI_F);
  i32 gear = (i32)v.gear;
  if (gear < 0) gear = 0; if (gear > 4) gear = 4;
  f32 rpm = whRpm * ratios[gear];
  if (rpm > 6200.f && gear < 4) gear++;
  else if (rpm < 2400.f && gear > 0) gear--;
  v.gear = (f32)gear;
  rpm = maxf(900.f, whRpm * ratios[gear]);
  if (v.inAccel > 0.1f) rpm = maxf(rpm, 900.f + 2600.f * v.inAccel);
  v.rpm = clampf(rpm, 900.f, 7000.f);
  f32 slip = maxf(absf(alphaR) - 0.10f, absf(alphaF) - 0.14f);
  f32 sk = clampf(slip / 0.18f, 0.f, 1.f) * (spd > 3.f ? 1.f : 0.f);
  if (hb && spd > 4.f) sk = 1.f;
  v.skid = sk;
}

static void applyImpulse(Vehicle& A, Vehicle* B, const Contact& c, f32 e, f32 massB, f32& jOut) {
  f32 rAx = c.px - A.x, rAz = c.pz - A.z;
  f32 invMA = 1.f / A.p.mass, invIA = 1.f / A.inertia;
  f32 cA = rAz * c.nx - rAx * c.nz;
  f32 vAx = A.vx + A.w * rAz, vAz = A.vz - A.w * rAx;
  f32 vBx = 0, vBz = 0, invMB = 0, invIB = 0, cB = 0, rBx = 0, rBz = 0;
  if (B) {
    rBx = c.px - B->x; rBz = c.pz - B->z;
    invMB = 1.f / B->p.mass; invIB = 1.f / B->inertia;
    cB = rBz * c.nx - rBx * c.nz;
    vBx = B->vx + B->w * rBz; vBz = B->vz - B->w * rBx;
  }
  f32 vrn = (vBx - vAx) * c.nx + (vBz - vAz) * c.nz;
  jOut = 0.f;
  if (vrn >= 0.f) return;
  f32 denom = invMA + invMB + cA * cA * invIA + cB * cB * invIB;
  f32 j = -(1.f + e) * vrn / denom;
  jOut = j;
  A.vx -= j * c.nx * invMA; A.vz -= j * c.nz * invMA; A.w -= j * cA * invIA;
  // frottement tangentiel
  f32 tx = -c.nz, tz = c.nx;
  f32 vrt = (vBx - vAx) * tx + (vBz - vAz) * tz;
  f32 jt = clampf(-vrt / denom, -0.35f * j, 0.35f * j);
  A.vx -= jt * tx * invMA; A.vz -= jt * tz * invMA;
  if (B) {
    B->vx += j * c.nx * invMB; B->vz += j * c.nz * invMB; B->w += j * cB * invIB;
    B->vx += jt * tx * invMB; B->vz += jt * tz * invMB;
  }
}

static f32 gTime = 0.f;

static void vehicleVsStatics(i32 id, Vehicle& v) {
  OBB A = { v.x, v.z, v.p.hl, v.p.hw, sinf_(v.h), cosf_(v.h) };
  f32 rad = sqrtf_(A.hx * A.hx + A.hz * A.hz);
  i32 x0 = cellOf(v.x - rad), x1 = cellOf(v.x + rad), z0 = cellOf(v.z - rad), z1 = cellOf(v.z + rad);
  stampCounter++;
  for (i32 gz = z0; gz <= z1; gz++)
    for (i32 gx = x0; gx <= x1; gx++)
      for (i32 e = gridHead[gz * GRID_N + gx]; e >= 0; e = entNext[e]) {
        i32 si = entSolid[e];
        if (solidStamp[si] == stampCounter) continue;
        solidStamp[si] = stampCounter;
        const Solid& s = solids[si];
        if (!s.enabled || s.h < 0.25f) continue;
        Contact c; bool hit;
        // recalcule A à chaque contact car la position est corrigée
        A.cx = v.x; A.cz = v.z; A.c = sinf_(v.h); A.s = cosf_(v.h);
        if (s.type == 0) { OBB B = { s.cx, s.cz, s.hx, s.hz, s.c, s.s }; hit = obbVsObb(A, B, c); }
        else { hit = obbVsCircle(A, s.cx, s.cz, s.r, c); if (hit) { c.nx = -c.nx; c.nz = -c.nz; } }
        if (!hit) continue;
        // n pointe de A vers le décor
        v.x -= c.nx * c.depth; v.z -= c.nz * c.depth;
        f32 j; applyImpulse(v, nullptr, c, 0.18f, 0.f, j);
        if (j > 600.f && v.hitCooldown <= 0.f) {
          pushEvent(1.f, (f32)id, (f32)si, j, c.px, c.pz, sqrtf_(v.vx * v.vx + v.vz * v.vz));
          v.hitCooldown = 0.15f;
        }
      }
}

// ───────────────────────── Personnages ─────────────────────────
#define MAX_CHAR 128
#define CHAR_OUT 16
struct Character {
  u8 used, enabled;
  f32 x, y, z, vx, vy, vz, h, r;
  f32 wx, wz, wspeed, jump, stun, faceOverride, hasFace;
  u8 grounded;
  f32 out[CHAR_OUT];
};
static Character chars[MAX_CHAR];

static void charPublish(Character& c) {
  f32* o = c.out;
  o[0] = c.x; o[1] = c.y; o[2] = c.z; o[3] = c.vx; o[4] = c.vy; o[5] = c.vz; o[6] = c.h;
  o[7] = c.grounded ? 1.f : 0.f; o[8] = sqrtf_(c.vx * c.vx + c.vz * c.vz); o[9] = c.stun;
}

static void charVsStatics(Character& c, f32& groundY) {
  i32 x0 = cellOf(c.x - c.r), x1 = cellOf(c.x + c.r), z0 = cellOf(c.z - c.r), z1 = cellOf(c.z + c.r);
  stampCounter++;
  for (i32 gz = z0; gz <= z1; gz++)
    for (i32 gx = x0; gx <= x1; gx++)
      for (i32 e = gridHead[gz * GRID_N + gx]; e >= 0; e = entNext[e]) {
        i32 si = entSolid[e];
        if (solidStamp[si] == stampCounter) continue;
        solidStamp[si] = stampCounter;
        const Solid& s = solids[si];
        if (!s.enabled) continue;
        Contact ct; bool hit;
        if (s.type == 0) { OBB B = { s.cx, s.cz, s.hx, s.hz, s.c, s.s }; hit = obbVsCircle(B, c.x, c.z, c.r, ct); }
        else {
          f32 dx = c.x - s.cx, dz = c.z - s.cz, d2 = dx * dx + dz * dz, rr = c.r + s.r;
          hit = d2 < rr * rr;
          if (hit) { f32 d = sqrtf_(d2); if (d < 1e-5f) { ct.nx = 1.f; ct.nz = 0.f; } else { ct.nx = dx / d; ct.nz = dz / d; } ct.depth = rr - d; }
        }
        if (!hit) continue;
        if (c.y >= s.h - 0.35f) { groundY = maxf(groundY, s.h); continue; } // on monte dessus
        // n pointe du décor vers le personnage
        c.x += ct.nx * ct.depth; c.z += ct.nz * ct.depth;
        f32 vn = c.vx * ct.nx + c.vz * ct.nz;
        if (vn < 0.f) { c.vx -= vn * ct.nx; c.vz -= vn * ct.nz; }
      }
}

static void charsStep(f32 dt) {
  for (i32 i = 0; i < MAX_CHAR; i++) {
    Character& c = chars[i];
    if (!c.used || !c.enabled) continue;
    bool stunned = c.stun > 0.f;
    if (stunned) c.stun -= dt;
    f32 tx = stunned ? 0.f : c.wx * c.wspeed, tz = stunned ? 0.f : c.wz * c.wspeed;
    f32 acc = c.grounded ? (stunned ? 6.f : 45.f) : 9.f;
    f32 dvx = tx - c.vx, dvz = tz - c.vz;
    f32 dl = sqrtf_(dvx * dvx + dvz * dvz);
    f32 maxd = acc * dt;
    if (dl > maxd) { dvx *= maxd / dl; dvz *= maxd / dl; }
    c.vx += dvx; c.vz += dvz;
    if (c.jump > 0.5f && c.grounded && !stunned) { c.vy = 6.2f; c.grounded = 0; }
    c.jump = 0.f;
    c.vy -= 20.f * dt;
    c.x += c.vx * dt; c.z += c.vz * dt; c.y += c.vy * dt;
    f32 groundY = 0.f;
    for (i32 k = 0; k < 2; k++) charVsStatics(c, groundY);
    if (c.y <= groundY) { c.y = groundY; if (c.vy < 0.f) c.vy = 0.f; c.grounded = 1; }
    else if (c.y > groundY + 0.02f) c.grounded = 0;
    // cap : face au déplacement, ou imposé
    f32 sp = sqrtf_(c.vx * c.vx + c.vz * c.vz);
    f32 th = c.h;
    if (c.hasFace > 0.5f) th = c.faceOverride;
    else if (sp > 0.4f && !stunned) th = atan2f_(c.vx, c.vz);
    f32 dh = wrapAngle(th - c.h);
    c.h = wrapAngle(c.h + clampf(dh, -14.f * dt, 14.f * dt));
  }
  // Personnages entre eux : répulsion douce
  for (i32 i = 0; i < MAX_CHAR; i++) {
    Character& a = chars[i];
    if (!a.used || !a.enabled) continue;
    for (i32 j = i + 1; j < MAX_CHAR; j++) {
      Character& b = chars[j];
      if (!b.used || !b.enabled) continue;
      f32 dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r;
      if (absf(dx) > rr || absf(dz) > rr) continue;
      f32 d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-8f) continue;
      f32 d = sqrtf_(d2), pen = (rr - d) * 0.5f, nx = dx / d, nz = dz / d;
      a.x -= nx * pen; a.z -= nz * pen; b.x += nx * pen; b.z += nz * pen;
    }
  }
  for (i32 i = 0; i < MAX_CHAR; i++) if (chars[i].used) charPublish(chars[i]);
}

static void vehiclesVsCharacters(f32 dt) {
  for (i32 i = 0; i < MAX_VEH; i++) {
    Vehicle& v = veh[i];
    if (!v.used || !v.enabled) continue;
    OBB A = { v.x, v.z, v.p.hl, v.p.hw, sinf_(v.h), cosf_(v.h) };
    f32 rad = sqrtf_(A.hx * A.hx + A.hz * A.hz) + 0.6f;
    for (i32 k = 0; k < MAX_CHAR; k++) {
      Character& c = chars[k];
      if (!c.used || !c.enabled || c.y > 1.4f) continue;
      f32 dx = c.x - v.x, dz = c.z - v.z;
      if (absf(dx) > rad || absf(dz) > rad) continue;
      Contact ct;
      if (!obbVsCircle(A, c.x, c.z, c.r, ct)) continue;
      c.x += ct.nx * ct.depth; c.z += ct.nz * ct.depth;
      f32 relN = (v.vx - c.vx) * ct.nx + (v.vz - c.vz) * ct.nz; // approche du véhicule vers le piéton
      if (relN > 2.5f && c.stun <= 0.f) {
        c.vx = v.vx * 0.85f + ct.nx * 1.5f; c.vz = v.vz * 0.85f + ct.nz * 1.5f; c.vy = 3.5f + relN * 0.12f;
        c.grounded = 0; c.stun = 1.4f;
        v.vx *= 0.96f; v.vz *= 0.96f;
        pushEvent(3.f, (f32)i, (f32)k, relN * 80.f, c.x, c.z, relN);
      }
    }
  }
}

// ───────────────────────── Pas de simulation ─────────────────────────
static f32 accTime = 0.f;
#define FIXED_DT (1.f / 120.f)

static void vehiclesStep(f32 dt) {
  for (i32 i = 0; i < MAX_VEH; i++) {
    Vehicle& v = veh[i];
    if (!v.used || !v.enabled) continue;
    if (v.hitCooldown > 0.f) v.hitCooldown -= dt;
    vehicleDynamics(v, dt);
    vehicleVsStatics(i, v);
  }
  for (i32 i = 0; i < MAX_VEH; i++) {
    Vehicle& a = veh[i];
    if (!a.used || !a.enabled) continue;
    for (i32 j = i + 1; j < MAX_VEH; j++) {
      Vehicle& b = veh[j];
      if (!b.used || !b.enabled) continue;
      f32 dx = b.x - a.x, dz = b.z - a.z;
      f32 rr = a.p.hl + b.p.hl + 1.f;
      if (absf(dx) > rr || absf(dz) > rr) continue;
      OBB A = { a.x, a.z, a.p.hl, a.p.hw, sinf_(a.h), cosf_(a.h) };
      OBB B = { b.x, b.z, b.p.hl, b.p.hw, sinf_(b.h), cosf_(b.h) };
      Contact c;
      if (!obbVsObb(A, B, c)) continue;
      f32 iA = 1.f / a.p.mass, iB = 1.f / b.p.mass, sA = iA / (iA + iB), sB = iB / (iA + iB);
      a.x -= c.nx * c.depth * sA; a.z -= c.nz * c.depth * sA;
      b.x += c.nx * c.depth * sB; b.z += c.nz * c.depth * sB;
      f32 jj; applyImpulse(a, &b, c, 0.2f, b.p.mass, jj);
      if (jj > 800.f && a.hitCooldown <= 0.f) {
        pushEvent(2.f, (f32)i, (f32)j, jj, c.px, c.pz, 0.f);
        a.hitCooldown = 0.15f; b.hitCooldown = 0.15f;
      }
    }
  }
  vehiclesVsCharacters(dt);
  for (i32 i = 0; i < MAX_VEH; i++) if (veh[i].used) vehPublish(veh[i]);
}

// ───────────────────────── API exportée ─────────────────────────
EXPORT(phys_version) i32 phys_version() { return 100; }

EXPORT(phys_init) void phys_init() {
  for (i32 i = 0; i < GRID_N * GRID_N; i++) gridHead[i] = -1;
  solidCount = 0; liveSolids = 0; freeSolidCount = 0; entCount = 0; entFree = -1; eventCount = 0; accTime = 0.f;
  for (i32 i = 0; i < MAX_SOLIDS; i++) { solidStamp[i] = 0; solids[i].used = 0; solids[i].enabled = 0; }
  stampCounter = 0;
  for (i32 i = 0; i < MAX_VEH; i++) veh[i].used = 0;
  for (i32 i = 0; i < MAX_CHAR; i++) chars[i].used = 0;
}

EXPORT(phys_add_box) i32 phys_add_box(f32 cx, f32 cz, f32 hx, f32 hz, f32 angle, f32 height, u32 flags) {
  Solid s; s.cx = cx; s.cz = cz; s.hx = hx; s.hz = hz; s.c = cosf_(angle); s.s = sinf_(angle);
  s.r = 0.f; s.h = height; s.flags = flags; s.type = 0; s.enabled = 1;
  return insertSolid(s);
}
EXPORT(phys_add_circle) i32 phys_add_circle(f32 cx, f32 cz, f32 r, f32 height, u32 flags) {
  Solid s; s.cx = cx; s.cz = cz; s.hx = 0.f; s.hz = 0.f; s.c = 1.f; s.s = 0.f;
  s.r = r; s.h = height; s.flags = flags; s.type = 1; s.enabled = 1;
  return insertSolid(s);
}
EXPORT(phys_set_solid_enabled) void phys_set_solid_enabled(i32 id, i32 en) {
  if (id >= 0 && id < solidCount && solids[id].used) solids[id].enabled = en ? 1 : 0;
}
/** Retire définitivement un solide (chargement par zones) : l'emplacement est réutilisé. */
EXPORT(phys_remove_solid) void phys_remove_solid(i32 id) { removeSolid(id); }
EXPORT(phys_solid_count) i32 phys_solid_count() { return liveSolids; }
EXPORT(phys_solid_height) f32 phys_solid_height(i32 id) { return (id >= 0 && id < solidCount && solids[id].used) ? solids[id].h : 0.f; }

EXPORT(phys_veh_create) i32 phys_veh_create(i32 preset, f32 x, f32 z, f32 heading) {
  if (preset < 0 || preset >= PRESET_COUNT) preset = 0;
  for (i32 i = 0; i < MAX_VEH; i++) {
    if (veh[i].used) continue;
    Vehicle& v = veh[i];
    v.p = PRESETS[preset];
    f32 Lh = 2.f * v.p.hl, Wh = 2.f * v.p.hw;
    v.inertia = v.p.mass * (Lh * Lh + Wh * Wh) / 12.f * 1.5f;
    v.used = 1; v.enabled = 1;
    v.x = x; v.z = z; v.h = heading; v.vx = v.vz = v.w = 0.f; v.y = 0.f;
    v.steer = 0.f; v.inAccel = v.inSteer = v.inHand = 0.f;
    v.axS = v.ayS = 0.f; v.wheel = 0.f; v.gear = 0.f; v.rpm = 900.f; v.skid = 0.f; v.hitCooldown = 0.f;
    vehPublish(v);
    return i;
  }
  return -1;
}
EXPORT(phys_veh_destroy) void phys_veh_destroy(i32 id) { if (id >= 0 && id < MAX_VEH) veh[id].used = 0; }
EXPORT(phys_veh_enable) void phys_veh_enable(i32 id, i32 en) { if (id >= 0 && id < MAX_VEH) veh[id].enabled = en ? 1 : 0; }
EXPORT(phys_veh_input) void phys_veh_input(i32 id, f32 accel, f32 steer, f32 handbrake) {
  if (id < 0 || id >= MAX_VEH) return;
  veh[id].inAccel = clampf(accel, -1.f, 1.f); veh[id].inSteer = clampf(steer, -1.f, 1.f); veh[id].inHand = handbrake;
}
EXPORT(phys_veh_place) void phys_veh_place(i32 id, f32 x, f32 z, f32 heading) {
  if (id < 0 || id >= MAX_VEH) return;
  Vehicle& v = veh[id]; v.x = x; v.z = z; v.h = heading; v.vx = v.vz = v.w = 0.f; vehPublish(v);
}
EXPORT(phys_veh_set_velocity) void phys_veh_set_velocity(i32 id, f32 vx, f32 vz, f32 w) {
  if (id < 0 || id >= MAX_VEH) return;
  veh[id].vx = vx; veh[id].vz = vz; veh[id].w = w; vehPublish(veh[id]);
}
EXPORT(phys_veh_ptr) f32* phys_veh_ptr(i32 id) { return (id >= 0 && id < MAX_VEH) ? veh[id].out : nullptr; }
EXPORT(phys_veh_stride) i32 phys_veh_stride() { return VEH_OUT; }
EXPORT(phys_veh_half_extent) f32 phys_veh_half_extent(i32 id, i32 axis) {
  if (id < 0 || id >= MAX_VEH) return 0.f; return axis == 0 ? veh[id].p.hl : veh[id].p.hw;
}

EXPORT(phys_char_create) i32 phys_char_create(f32 x, f32 z, f32 radius) {
  for (i32 i = 0; i < MAX_CHAR; i++) {
    if (chars[i].used) continue;
    Character& c = chars[i];
    c.used = 1; c.enabled = 1; c.x = x; c.z = z; c.y = 0.f; c.vx = c.vy = c.vz = 0.f; c.h = 0.f; c.r = radius;
    c.wx = c.wz = c.wspeed = c.jump = c.stun = c.faceOverride = c.hasFace = 0.f; c.grounded = 1;
    charPublish(c);
    return i;
  }
  return -1;
}
EXPORT(phys_char_destroy) void phys_char_destroy(i32 id) { if (id >= 0 && id < MAX_CHAR) chars[id].used = 0; }
EXPORT(phys_char_enable) void phys_char_enable(i32 id, i32 en) { if (id >= 0 && id < MAX_CHAR) chars[id].enabled = en ? 1 : 0; }
EXPORT(phys_char_input) void phys_char_input(i32 id, f32 dirx, f32 dirz, f32 speed, f32 jump) {
  if (id < 0 || id >= MAX_CHAR) return;
  f32 l = sqrtf_(dirx * dirx + dirz * dirz);
  if (l > 1.f) { dirx /= l; dirz /= l; }
  chars[id].wx = dirx; chars[id].wz = dirz; chars[id].wspeed = speed;
  if (jump > 0.5f) chars[id].jump = 1.f;
}
EXPORT(phys_char_face) void phys_char_face(i32 id, f32 heading, i32 use) {
  if (id < 0 || id >= MAX_CHAR) return; chars[id].faceOverride = heading; chars[id].hasFace = use ? 1.f : 0.f;
}
EXPORT(phys_char_place) void phys_char_place(i32 id, f32 x, f32 z) {
  if (id < 0 || id >= MAX_CHAR) return; chars[id].x = x; chars[id].z = z; chars[id].y = 0.f; chars[id].vx = chars[id].vy = chars[id].vz = 0.f; charPublish(chars[id]);
}
EXPORT(phys_char_ptr) f32* phys_char_ptr(i32 id) { return (id >= 0 && id < MAX_CHAR) ? chars[id].out : nullptr; }
EXPORT(phys_char_stride) i32 phys_char_stride() { return CHAR_OUT; }

EXPORT(phys_step) void phys_step(f32 dt) {
  if (dt <= 0.f) return;
  if (dt > 0.1f) dt = 0.1f;
  accTime += dt;
  i32 n = 0;
  while (accTime >= FIXED_DT && n < 12) {
    vehiclesStep(FIXED_DT);
    charsStep(FIXED_DT);
    accTime -= FIXED_DT; n++;
    gTime += FIXED_DT;
  }
}

EXPORT(phys_event_count) i32 phys_event_count() { return eventCount; }
EXPORT(phys_event_ptr) f32* phys_event_ptr() { return &events[0][0]; }
EXPORT(phys_event_clear) void phys_event_clear() { eventCount = 0; }

// Rayon 2D : distance du premier impact (flags & mask != 0), -1 si rien
static i32 lastRayId = -1;
static bool rayVsSolid(const Solid& s, f32 ox, f32 oz, f32 dx, f32 dz, f32& tOut) {
  if (s.type == 1) {
    f32 fx = ox - s.cx, fz = oz - s.cz;
    f32 b = fx * dx + fz * dz, c = fx * fx + fz * fz - s.r * s.r;
    f32 disc = b * b - c;
    if (disc < 0.f) return false;
    f32 t = -b - sqrtf_(disc);
    if (t < 0.f) { if (c < 0.f) { tOut = 0.f; return true; } return false; }
    tOut = t; return true;
  }
  f32 lx = (ox - s.cx) * s.c + (oz - s.cz) * s.s, lz = -(ox - s.cx) * s.s + (oz - s.cz) * s.c;
  f32 ldx = dx * s.c + dz * s.s, ldz = -dx * s.s + dz * s.c;
  f32 t0 = 0.f, t1 = 1e9f;
  f32 o[2] = { lx, lz }, d[2] = { ldx, ldz }, h[2] = { s.hx, s.hz };
  for (i32 k = 0; k < 2; k++) {
    if (absf(d[k]) < 1e-8f) { if (absf(o[k]) > h[k]) return false; }
    else {
      f32 a = (-h[k] - o[k]) / d[k], b = (h[k] - o[k]) / d[k];
      if (a > b) { f32 t = a; a = b; b = t; }
      t0 = maxf(t0, a); t1 = minf(t1, b);
      if (t0 > t1) return false;
    }
  }
  tOut = t0; return true;
}
EXPORT(phys_ray) f32 phys_ray(f32 ox, f32 oz, f32 dx, f32 dz, f32 maxDist, u32 mask) {
  f32 l = sqrtf_(dx * dx + dz * dz);
  if (l < 1e-6f) return -1.f;
  dx /= l; dz /= l;
  f32 best = maxDist + 1.f; lastRayId = -1;
  f32 gx = (ox + WORLD_HALF) / CELL, gz = (oz + WORLD_HALF) / CELL;
  i32 cx = (i32)__builtin_floorf(gx), cz = (i32)__builtin_floorf(gz);
  i32 stepX = dx >= 0.f ? 1 : -1, stepZ = dz >= 0.f ? 1 : -1;
  f32 tDX = absf(dx) < 1e-8f ? 1e9f : CELL / absf(dx), tDZ = absf(dz) < 1e-8f ? 1e9f : CELL / absf(dz);
  f32 nextX = (stepX > 0 ? (cx + 1) : cx) * CELL - WORLD_HALF, nextZ = (stepZ > 0 ? (cz + 1) : cz) * CELL - WORLD_HALF;
  f32 tMaxX = absf(dx) < 1e-8f ? 1e9f : (nextX - ox) / dx, tMaxZ = absf(dz) < 1e-8f ? 1e9f : (nextZ - oz) / dz;
  stampCounter++;
  for (i32 it = 0; it < 4 * GRID_N; it++) {
    if (cx < 0 || cx >= GRID_N || cz < 0 || cz >= GRID_N) break;
    for (i32 e = gridHead[cz * GRID_N + cx]; e >= 0; e = entNext[e]) {
      i32 si = entSolid[e];
      if (solidStamp[si] == stampCounter) continue;
      solidStamp[si] = stampCounter;
      const Solid& s = solids[si];
      if (!s.enabled || !(s.flags & mask)) continue;
      f32 t;
      if (rayVsSolid(s, ox, oz, dx, dz, t) && t <= maxDist && t < best) { best = t; lastRayId = si; }
    }
    f32 tExit = minf(tMaxX, tMaxZ);
    if (best <= tExit || tExit > maxDist) break;
    if (tMaxX < tMaxZ) { cx += stepX; tMaxX += tDX; } else { cz += stepZ; tMaxZ += tDZ; }
  }
  return best <= maxDist ? best : -1.f;
}
EXPORT(phys_ray_id) i32 phys_ray_id() { return lastRayId; }
