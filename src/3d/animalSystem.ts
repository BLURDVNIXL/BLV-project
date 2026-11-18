/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV 
 * Animaux de la ville (poules, chèvres, chiens errants, chats, pigeons). Données dans `src/world/animals.ts`.
 *  - Modèles en boîtes fusionnées : UN `InstancedMesh` par espèce (5 appels de dessin au total), couleur de robe et
 *    échelle par instance, aucune ombre portée, aucune allocation par image.
 *  - Poules, chèvres, chiens, chats = personnages du moteur physique (petit rayon), créés une fois (budget fixe) :
 *    bloqués par murs et étals, renversés par les véhicules (effet visuel seulement, aucune conséquence de jeu).
 *  - Pigeons = purement visuels : posés sur les places, ils s'envolent un court instant (arc sans collision) quand le
 *    joueur approche, puis se reposent.
 *  - Comportements : errer autour d'un point d'attache, s'arrêter, picorer / brouter / s'asseoir, fuir le joueur
 *    (ou le véhicule qu'il conduit : sa position est celle du joueur). Aucun animal dans l'eau ni sur un grand axe.
 * Local : rien n'est transmis au serveur.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createCharacterState, SolidFlag, type CharacterState, type PhysicsCore } from '../physics/PhysicsCore';
import { districtAt, isWater } from '../world/abidjanGeography';
import {
  ANIMAL_BUDGET, ANIMAL_BUDGET_LOW, ANIMAL_DESPAWN_DIST, ANIMAL_FAR_AI_DIST, ANIMAL_MAQUIS_RADIUS, ANIMAL_MARKET_RADIUS,
  ANIMAL_SPAWN_MAX, ANIMAL_SPAWN_MIN, ANIMAL_SPECIES, GROUND_SPECIES, PIGEON_ACTIVE_DIST, PIGEON_COATS, PIGEON_COUNT,
  PIGEON_COUNT_LOW, PIGEON_FLUSH_DIST, PIGEON_PLACE_IDS, pickSpecies, type AnimalSpecies,
} from '../world/animals';
import { SPECIAL_FOOTPRINTS } from '../world/city';
import { hitsInteriorBox, insideInterior, interiorToWorld, type InteriorDef } from '../world/interiors';
import { bridgeAt, roadAt } from '../world/roads';

type MeshKey = AnimalSpecies | 'pigeon';
type AnimalState = 'wander' | 'graze' | 'sit' | 'flee' | 'down';

const SPAWNS_PER_FRAME = 2;
const STUCK_WINDOW = 1.0;
const STUCK_MIN_MOVE = 0.1;
const FALL_ROLL = 1.35;
const VIEW_COS = Math.cos(THREE.MathUtils.degToRad(40));
const WANDER_MIN = 2.5;
const WANDER_MAX = 7;
/** Rayon (m) dégagé de tout solide exigé pour poser un animal ou un pigeon (4 rayons courts : dedans ou contre un mur = refusé). */
const CLEAR_R = 0.6;
/** Véhicules en mouvement pris en compte pour la fuite (seuil de vitesse, nombre max). */
const THREAT_MIN_SPEED = 1.5;
const MAX_THREATS = 16;
/** Timidité d'un animal d'intérieur : il ne fuit que de très près (salle exiguë). */
const INDOOR_SKITTISH = 0.3;

interface Threat { x: number; z: number; speed: number }

interface GroundAnimal {
  /** Animal d'une salle : jamais retiré par la distance, hors eau/route, évolue dans la salle. */
  indoor: boolean;
  charId: number;
  charRadius: number;
  species: AnimalSpecies | null;
  state: AnimalState;
  x: number; y: number; z: number;
  cap: number;
  phase: number;
  roll: number;
  timer: number;
  homeX: number; homeZ: number;
  targetX: number; targetZ: number;
  scale: number;
  skittish: number;
  fleeSide: number;
  aiAccum: number;
  stuckT: number;
  anchorX: number; anchorZ: number;
}

interface Pigeon {
  active: boolean;
  fly: boolean;
  x: number; z: number; y: number;
  cap: number;
  vx: number; vz: number;
  t: number; dur: number; peak: number;
  cool: number;
  phase: number;
  scale: number;
}

interface PigeonPlace { x: number; z: number; r: number }

// ───────────── Modèles en boîtes (construits une fois ; couleurs de sommet : blanc = couleur de robe) ─────────────

const WHITE = 0xffffff;
const DARK = 0x57534e;

function part(w: number, h: number, d: number, x: number, y: number, z: number, tint: number, rx = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  g.translate(x, y, z);
  const c = new THREE.Color(tint);
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function mergeParts(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(list, false);
  if (!g) throw new Error('animalSystem : fusion de géométries impossible');
  list.forEach((p) => p.dispose());
  return g;
}

/** Axe avant = +z. Les pattes sont des boîtes fixes : la marche est rendue par un petit balancement du corps. */
function buildGeometries(): Record<MeshKey, THREE.BufferGeometry> {
  const legs4 = (w: number, h: number, sx: number, sz: number): THREE.BufferGeometry[] =>
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([ix, iz]) => part(w, h, w, ix * sx, h / 2, iz * sz, DARK));
  return {
    poule: mergeParts([
      part(0.2, 0.2, 0.3, 0, 0.27, 0, WHITE),
      part(0.1, 0.12, 0.1, 0, 0.4, 0.17, WHITE),
      part(0.03, 0.03, 0.06, 0, 0.39, 0.25, 0xf59e0b),
      part(0.03, 0.05, 0.05, 0, 0.48, 0.16, 0xdc2626),
      part(0.06, 0.16, 0.1, 0, 0.34, -0.2, 0xcfcfcf, 0.5),
      part(0.03, 0.16, 0.03, 0.05, 0.08, 0, 0xa16207),
      part(0.03, 0.16, 0.03, -0.05, 0.08, 0, 0xa16207),
    ]),
    chevre: mergeParts([
      part(0.3, 0.32, 0.62, 0, 0.62, 0, WHITE),
      part(0.12, 0.3, 0.12, 0, 0.82, 0.34, WHITE),
      part(0.15, 0.16, 0.24, 0, 0.98, 0.48, WHITE),
      part(0.03, 0.12, 0.03, 0.05, 1.1, 0.42, 0x44403c),
      part(0.03, 0.12, 0.03, -0.05, 1.1, 0.42, 0x44403c),
      part(0.04, 0.1, 0.06, 0, 0.74, -0.33, WHITE),
      ...legs4(0.07, 0.42, 0.1, 0.24),
    ]),
    chien: mergeParts([
      part(0.2, 0.24, 0.56, 0, 0.45, 0, WHITE),
      part(0.16, 0.16, 0.2, 0, 0.6, 0.36, WHITE),
      part(0.1, 0.08, 0.12, 0, 0.57, 0.5, 0x3f3f46),
      part(0.04, 0.1, 0.06, 0.06, 0.7, 0.33, DARK),
      part(0.04, 0.1, 0.06, -0.06, 0.7, 0.33, DARK),
      part(0.04, 0.04, 0.24, 0, 0.52, -0.36, WHITE, -0.6),
      ...legs4(0.05, 0.27, 0.07, 0.2),
    ]),
    chat: mergeParts([
      part(0.13, 0.14, 0.32, 0, 0.2, 0, WHITE),
      part(0.12, 0.11, 0.11, 0, 0.29, 0.2, WHITE),
      part(0.03, 0.05, 0.03, 0.04, 0.37, 0.2, WHITE),
      part(0.03, 0.05, 0.03, -0.04, 0.37, 0.2, WHITE),
      part(0.04, 0.04, 0.28, 0, 0.3, -0.26, WHITE, -0.8),
      ...legs4(0.04, 0.1, 0.045, 0.12),
    ]),
    pigeon: mergeParts([
      part(0.11, 0.09, 0.22, 0, 0.13, 0, WHITE),
      part(0.07, 0.07, 0.07, 0, 0.2, 0.12, WHITE),
      part(0.02, 0.02, 0.04, 0, 0.19, 0.17, 0xf59e0b),
      part(0.07, 0.02, 0.1, 0, 0.14, -0.16, 0x9ca3af),
      part(0.14, 0.015, 0.16, 0.1, 0.15, 0, 0x9ca3af),
      part(0.14, 0.015, 0.16, -0.1, 0.15, 0, 0x9ca3af),
      part(0.02, 0.06, 0.02, 0.03, 0.03, 0, 0xfb7185),
      part(0.02, 0.06, 0.02, -0.03, 0.03, 0, 0xfb7185),
    ]),
  };
}

/** Différence d'angle ramenée dans [−π, π]. */
function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class AnimalSystem {
  private readonly group = new THREE.Group();
  private readonly geoms = buildGeometries();
  private readonly material = new THREE.MeshLambertMaterial({ vertexColors: true });
  private readonly meshes = {} as Record<MeshKey, THREE.InstancedMesh>;
  private readonly ground: GroundAnimal[] = [];
  private readonly pigeons: Pigeon[] = [];
  private readonly places: PigeonPlace[] = [];
  private pigeonPlace: PigeonPlace | null = null;
  /** Véhicules en mouvement : `pushThreat` remplit `threatsNext` pendant l'image, échangé au début de la suivante. */
  private threats: Threat[] = Array.from({ length: MAX_THREATS }, () => ({ x: 0, z: 0, speed: 0 }));
  private threatsNext: Threat[] = Array.from({ length: MAX_THREATS }, () => ({ x: 0, z: 0, speed: 0 }));
  private threatCount = 0;
  private threatNextCount = 0;
  private playerBoost = 0;
  private lastPx = 0;
  private lastPz = 0;
  private hasLast = false;
  private interiorDef: InteriorDef | null = null;
  private marketCenter: { x: number; z: number } | null = null;
  private maquisCenter: { x: number; z: number } | null = null;
  private core: PhysicsCore | null = null;
  private indoor = false;
  private seed = 4242;
  private time = 0;
  private frame = 0;
  private readonly scratch: CharacterState = createCharacterState();
  private readonly pt = { x: 0, z: 0 };

  constructor(scene: THREE.Scene, lowEnd = false) {
    const budget = lowEnd ? ANIMAL_BUDGET_LOW : ANIMAL_BUDGET;
    const pigeonCount = lowEnd ? PIGEON_COUNT_LOW : PIGEON_COUNT;
    const keys: MeshKey[] = [...GROUND_SPECIES, 'pigeon'];
    for (const k of keys) {
      const cap = k === 'pigeon' ? pigeonCount : budget;
      const mesh = new THREE.InstancedMesh(this.geoms[k], this.material, cap);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      _c.set(WHITE);
      for (let i = 0; i < cap; i++) {
        mesh.setMatrixAt(i, ZERO);
        mesh.setColorAt(i, _c);
      }
      this.meshes[k] = mesh;
      this.group.add(mesh);
    }
    scene.add(this.group);

    for (let i = 0; i < budget; i++) {
      this.ground.push({
        indoor: false, charId: -1, charRadius: 0.35, species: null, state: 'wander',
        x: 0, y: 0, z: 0, cap: 0, phase: i * 1.3, roll: 0, timer: 0,
        homeX: 0, homeZ: 0, targetX: 0, targetZ: 0, scale: 1, skittish: 1, fleeSide: 1,
        aiAccum: 0, stuckT: 0, anchorX: 0, anchorZ: 0,
      });
    }
    for (let i = 0; i < pigeonCount; i++) {
      this.pigeons.push({ active: false, fly: false, x: 0, z: 0, y: 0, cap: 0, vx: 0, vz: 0, t: 0, dur: 0, peak: 0, cool: 0, phase: i * 0.9, scale: 1 });
    }

    const find = (id: string) => SPECIAL_FOOTPRINTS.find((f) => f.spec.id === id);
    const market = find('marche_adjame');
    if (market) this.marketCenter = { x: market.x, z: market.z };
    const maquis = find('maquis');
    if (maquis) this.maquisCenter = { x: maquis.x, z: maquis.z };
    for (const id of PIGEON_PLACE_IDS) {
      const f = find(id);
      if (f) this.places.push({ x: f.x, z: f.z, r: Math.hypot(f.w, f.d) / 2 + 3 });
    }
  }

  /** Crée le pool de personnages des animaux (désactivés), après le `reset()` du moteur ; une seule fois. */
  setPhysics(core: PhysicsCore): void {
    if (this.core === core) return;
    this.core = core;
    for (const a of this.ground) {
      const id = core.createCharacter(0, 0, 0.2);
      if (id < 0) continue;
      core.setCharacterEnabled(id, false);
      a.charId = id;
      a.charRadius = 0.2;
    }
  }

  /** Animaux actifs (physiques + pigeons posés ou en vol). */
  get activeCount(): number {
    let n = 0;
    for (const a of this.ground) if (a.species) n++;
    for (const p of this.pigeons) if (p.active) n++;
    return n;
  }

  /** Entrée / sortie d'un intérieur : tout disparaît dedans ; dehors, ils réapparaissent autour du joueur. */
  setIndoor(indoor: boolean): void {
    if (indoor === this.indoor) return;
    this.indoor = indoor;
    if (!indoor) {
      for (const a of this.ground) if (a.indoor) this.deactivate(a); // l'animal de la salle disparaît à la sortie
      this.interiorDef = null;
      this.hasLast = false;
      return;
    }
    for (const a of this.ground) if (a.species) this.deactivate(a);
    this.hidePigeons();
    this.flush();
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private flush(): void {
    for (const k of Object.keys(this.meshes) as MeshKey[]) this.meshes[k].instanceMatrix.needsUpdate = true;
  }

  /** Un véhicule en mouvement (traffic, voiture roulante) : les animaux proches fuient, d'autant plus qu'il va vite. */
  pushThreat(x: number, z: number, speed: number): void {
    if (speed < THREAT_MIN_SPEED || this.threatNextCount >= MAX_THREATS) return;
    const t = this.threatsNext[this.threatNextCount++];
    t.x = x;
    t.z = z;
    t.speed = speed;
  }

  /** Peuple la salle `def` de ses animaux (appelé APRÈS `setIndoor(true)` et l'enregistrement des solides de la salle). */
  enterInterior(def: InteriorDef): void {
    const core = this.core;
    if (!core || !def.animals) return;
    this.interiorDef = def;
    for (const d of def.animals) {
      const a = this.ground.find((g) => !g.species && g.charId >= 0);
      if (!a) return;
      const w = interiorToWorld(def, d.x, d.z);
      if (!this.activate(a, d.species, w.x, w.z)) continue;
      a.indoor = true;
      a.skittish = INDOOR_SKITTISH;
      a.state = ANIMAL_SPECIES[d.species].sitter ? 'sit' : 'graze';
      a.timer = 2 + this.rand() * 4;
    }
  }

  /** Aucun solide à moins de `CLEAR_R` (4 directions) : pas dans un bâtiment ni collé à un mur. Vrai si le moteur n'est pas prêt. */
  private isClear(x: number, z: number): boolean {
    const core = this.core;
    if (!core) return true;
    return core.ray(x, z, 1, 0, CLEAR_R, SolidFlag.SOLID) < 0 && core.ray(x, z, -1, 0, CLEAR_R, SolidFlag.SOLID) < 0 &&
      core.ray(x, z, 0, 1, CLEAR_R, SolidFlag.SOLID) < 0 && core.ray(x, z, 0, -1, CLEAR_R, SolidFlag.SOLID) < 0;
  }

  // ───────────── Terrain ─────────────

  /** Sec, hors pont et hors grand axe. */
  private isFreeGround(x: number, z: number): boolean {
    this.pt.x = x;
    this.pt.z = z;
    if (isWater(this.pt) || bridgeAt(this.pt, 4)) return false;
    const kind = roadAt(this.pt);
    return kind !== 'arterial' && kind !== 'bridge';
  }

  private findSpot(px: number, pz: number, camYaw: number): { x: number; z: number } | null {
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    for (let attempt = 0; attempt < 16; attempt++) {
      const a = this.rand() * Math.PI * 2;
      const r = ANIMAL_SPAWN_MIN + this.rand() * (ANIMAL_SPAWN_MAX - ANIMAL_SPAWN_MIN);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      if (attempt < 10 && ca * fx + sa * fz > VIEW_COS) continue; // hors du champ de la caméra si possible
      const x = px + ca * r;
      const z = pz + sa * r;
      if (this.isFreeGround(x, z) && this.isClear(x, z)) return { x, z };
    }
    return null;
  }

  // ───────────── Animaux physiques ─────────────

  private activate(a: GroundAnimal, species: AnimalSpecies, x: number, z: number): boolean {
    const core = this.core;
    if (!core || a.charId < 0) return false;
    const def = ANIMAL_SPECIES[species];
    if (Math.abs(def.radius - a.charRadius) > 0.04) {
      core.destroyCharacter(a.charId);
      const id = core.createCharacter(x, z, def.radius);
      if (id < 0) {
        a.charId = -1;
        return false;
      }
      a.charId = id;
      a.charRadius = def.radius;
    }
    core.placeCharacter(a.charId, x, z);
    core.faceCharacter(a.charId, 0, false);
    core.characterInput(a.charId, 0, 0, 0);
    core.setCharacterEnabled(a.charId, true);

    a.species = species;
    a.indoor = false;
    a.state = 'graze';
    a.timer = 0.5 + this.rand() * 3;
    a.x = x; a.z = z; a.y = 0;
    a.homeX = x; a.homeZ = z;
    a.cap = this.rand() * Math.PI * 2;
    a.roll = 0;
    a.aiAccum = 0;
    a.stuckT = 0;
    a.anchorX = x; a.anchorZ = z;
    a.scale = def.scale[0] + this.rand() * (def.scale[1] - def.scale[0]);
    a.skittish = def.skittish[0] + this.rand() * (def.skittish[1] - def.skittish[0]);
    a.fleeSide = this.rand() < 0.5 ? -1 : 1;

    const slot = this.ground.indexOf(a);
    _c.set(def.coats[Math.floor(this.rand() * def.coats.length)]);
    _c.offsetHSL(0, 0, (this.rand() - 0.5) * 0.08);
    const mesh = this.meshes[species];
    mesh.setColorAt(slot, _c);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return true;
  }

  private deactivate(a: GroundAnimal): void {
    if (a.species) {
      const mesh = this.meshes[a.species];
      mesh.setMatrixAt(this.ground.indexOf(a), ZERO);
      mesh.instanceMatrix.needsUpdate = true;
    }
    a.species = null;
    if (this.core && a.charId >= 0) {
      this.core.characterInput(a.charId, 0, 0, 0);
      this.core.setCharacterEnabled(a.charId, false);
    }
  }

  private pickGoal(a: GroundAnimal): void {
    const def = this.interiorDef;
    if (a.indoor && def) {
      // Salle : petits déplacements autour de la position d'attache, dans la salle et hors mobilier
      for (let attempt = 0; attempt < 8; attempt++) {
        const ang = this.rand() * Math.PI * 2;
        const r = 0.8 + this.rand() * 1.4;
        const lx = a.homeX - def.origin.x + Math.cos(ang) * r;
        const lz = a.homeZ - def.origin.z + Math.sin(ang) * r;
        if (insideInterior(def, lx, lz) && !hitsInteriorBox(def, lx, lz, 0.3)) {
          a.targetX = def.origin.x + lx;
          a.targetZ = def.origin.z + lz;
          return;
        }
      }
      a.targetX = a.homeX;
      a.targetZ = a.homeZ;
      return;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const ang = this.rand() * Math.PI * 2;
      const r = WANDER_MIN + this.rand() * (WANDER_MAX - WANDER_MIN);
      const x = a.homeX + Math.cos(ang) * r;
      const z = a.homeZ + Math.sin(ang) * r;
      if (this.isFreeGround(x, z) && this.isClear(x, z)) {
        a.targetX = x;
        a.targetZ = z;
        return;
      }
    }
    a.targetX = a.homeX;
    a.targetZ = a.homeZ;
  }

  private restOrWander(a: GroundAnimal, def: (typeof ANIMAL_SPECIES)[AnimalSpecies]): void {
    a.state = def.sitter && this.rand() < 0.6 ? 'sit' : 'graze';
    a.timer = 2 + this.rand() * 6;
  }

  private resetStuck(a: GroundAnimal, st: CharacterState): void {
    a.stuckT = 0;
    a.anchorX = st.x;
    a.anchorZ = st.z;
  }

  /** Décide et envoie `characterInput` (jamais pendant l'étourdissement). */
  private think(a: GroundAnimal, st: CharacterState, dtAi: number, px: number, pz: number): void {
    const core = this.core;
    if (!core || !a.species) return;
    const id = a.charId;
    const def = ANIMAL_SPECIES[a.species];
    const fleeDist = def.fleeDist * a.skittish;

    // Menace la plus pressante : le joueur (rayon accru s'il roule vite) ou un véhicule en mouvement (rayon accru avec sa vitesse)
    let dx = st.x - px;
    let dz = st.z - pz;
    let dP = Math.hypot(dx, dz);
    let margin = dP - fleeDist - this.playerBoost;
    for (let k = 0; k < this.threatCount; k++) {
      const t = this.threats[k];
      const tx = st.x - t.x;
      const tz = st.z - t.z;
      const td = Math.hypot(tx, tz);
      const m = td - (fleeDist * 0.8 + Math.min(8, t.speed * 0.7));
      if (m < margin) {
        margin = m;
        dx = tx;
        dz = tz;
        dP = td;
      }
    }

    if (margin < 0) {
      // Fuite : droit devant soi, à l'opposé de la menace, avec un léger écart de côté (les poules se dispersent)
      a.state = 'flee';
      a.timer = 1 + this.rand() * 1.5;
      const ax = dP > 0.01 ? dx / dP : 1;
      const az = dP > 0.01 ? dz / dP : 0;
      const mx = ax - az * 0.4 * a.fleeSide;
      const mz = az + ax * 0.4 * a.fleeSide;
      const l = Math.hypot(mx, mz) || 1;
      core.characterInput(id, mx / l, mz / l, def.fleeSpeed);
      a.stuckT += dtAi;
      if (a.stuckT >= STUCK_WINDOW) {
        if (Math.hypot(st.x - a.anchorX, st.z - a.anchorZ) < STUCK_MIN_MOVE) a.fleeSide = -a.fleeSide; // coincé contre un mur : on part de l'autre côté
        this.resetStuck(a, st);
      }
      return;
    }

    if (a.state === 'flee') {
      // Calmé : s'arrête, puis reprend sa vie autour d'un nouveau point d'attache
      a.homeX = st.x;
      a.homeZ = st.z;
      this.restOrWander(a, def);
      core.characterInput(id, 0, 0, 0);
      this.resetStuck(a, st);
      return;
    }

    if (a.state === 'graze' || a.state === 'sit') {
      core.characterInput(id, 0, 0, 0);
      this.resetStuck(a, st);
      a.timer -= dtAi;
      if (a.timer > 0) return;
      this.pickGoal(a);
      a.state = 'wander';
      return;
    }

    // wander
    const gx0 = a.targetX - st.x;
    const gz0 = a.targetZ - st.z;
    const d = Math.hypot(gx0, gz0);
    if (d < 0.5) {
      this.restOrWander(a, def);
      core.characterInput(id, 0, 0, 0);
      this.resetStuck(a, st);
      return;
    }
    core.characterInput(id, gx0 / d, gz0 / d, def.walkSpeed);
    a.stuckT += dtAi;
    if (a.stuckT >= STUCK_WINDOW) {
      if (Math.hypot(st.x - a.anchorX, st.z - a.anchorZ) < STUCK_MIN_MOVE) this.pickGoal(a); // bloqué : autre but
      this.resetStuck(a, st);
    }
  }

  private writePose(mesh: THREE.InstancedMesh, slot: number, x: number, y: number, z: number, yaw: number, pitch: number, roll: number, sx: number, sy: number): void {
    _q.setFromAxisAngle(Y_AXIS, yaw);
    if (pitch) _q.multiply(_q2.setFromAxisAngle(X_AXIS, pitch));
    if (roll) _q.multiply(_q2.setFromAxisAngle(Z_AXIS, roll));
    mesh.setMatrixAt(slot, _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sx)));
  }

  // ───────────── Pigeons (visuels) ─────────────

  private hidePigeons(): void {
    for (let i = 0; i < this.pigeons.length; i++) {
      this.pigeons[i].active = false;
      this.meshes.pigeon.setMatrixAt(i, ZERO);
    }
    this.meshes.pigeon.instanceMatrix.needsUpdate = true;
    this.pigeonPlace = null;
  }

  private spawnPigeons(place: PigeonPlace): void {
    this.pigeonPlace = place;
    const mesh = this.meshes.pigeon;
    for (let i = 0; i < this.pigeons.length; i++) {
      const p = this.pigeons[i];
      let ok = false;
      for (let attempt = 0; attempt < 8 && !ok; attempt++) {
        const ang = this.rand() * Math.PI * 2;
        const r = place.r + this.rand() * 10;
        p.x = place.x + Math.cos(ang) * r;
        p.z = place.z + Math.sin(ang) * r;
        this.pt.x = p.x;
        this.pt.z = p.z;
        ok = !isWater(this.pt) && this.isClear(p.x, p.z); // ni dans l'eau, ni dans un bâtiment ou contre un mur
      }
      p.active = ok;
      p.fly = false;
      p.y = 0;
      p.cool = 0;
      p.cap = this.rand() * Math.PI * 2;
      p.scale = 0.9 + this.rand() * 0.25;
      if (!ok) {
        mesh.setMatrixAt(i, ZERO);
        continue;
      }
      _c.set(PIGEON_COATS[Math.floor(this.rand() * PIGEON_COATS.length)]);
      mesh.setColorAt(i, _c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private streetFlockCenter: PigeonPlace | null = null;

  private updatePigeons(dt: number, px: number, pz: number): void {
    // Place emblématique proche, ou volée de quartier autour du joueur
    let best: PigeonPlace | null = null;
    let bestD = PIGEON_ACTIVE_DIST;
    for (const pl of this.places) {
      const d = Math.hypot(pl.x - px, pl.z - pz);
      if (d < bestD) { bestD = d; best = pl; }
    }
    if (!best) {
      if (!this.streetFlockCenter || Math.hypot(this.streetFlockCenter.x - px, this.streetFlockCenter.z - pz) > 58) {
        const ang = this.rand() * Math.PI * 2;
        const dist = 16 + this.rand() * 14;
        this.streetFlockCenter = { x: px + Math.cos(ang) * dist, z: pz + Math.sin(ang) * dist, r: 2 };
        this.hidePigeons();
        this.spawnPigeons(this.streetFlockCenter);
      }
      best = this.streetFlockCenter;
    } else if (best !== this.pigeonPlace) {
      this.streetFlockCenter = null;
      this.hidePigeons();
      this.spawnPigeons(best);
    }
    if (!this.pigeonPlace) return;

    const mesh = this.meshes.pigeon;
    for (let i = 0; i < this.pigeons.length; i++) {
      const p = this.pigeons[i];
      if (!p.active) continue;
      const dx = p.x - px;
      const dz = p.z - pz;
      const dP = Math.hypot(dx, dz);
      if (!p.fly) {
        p.cool -= dt;
        if (dP < PIGEON_FLUSH_DIST && p.cool <= 0) {
          // Envol court : arc à l'opposé du joueur, sans collision
          const base = Math.atan2(dx, dz) + (this.rand() - 0.5) * 1.2;
          let speed = 3.5 + this.rand() * 1.5;
          p.fly = true;
          p.t = 0;
          p.dur = 2.2 + this.rand() * 1.6;
          p.peak = 2.5 + this.rand() * 1.5;
          const dirX = Math.sin(base);
          const dirZ = Math.cos(base);
          // Pas de pigeon à travers un mur ou sur un toit : l'envol s'arrête 1 m avant le premier solide
          const hit = this.core ? this.core.ray(p.x, p.z, dirX, dirZ, speed * p.dur + 1, SolidFlag.SOLID) : -1;
          if (hit >= 0) speed = Math.max(0.3, (hit - 1) / p.dur);
          p.vx = dirX * speed;
          p.vz = dirZ * speed;
          p.cap = base;
        }
      }
      let y = 0;
      let pitch = 0;
      let roll = 0;
      if (p.fly) {
        p.t += dt;
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        const u = Math.min(1, p.t / p.dur);
        y = Math.sin(Math.PI * u) * p.peak;
        roll = Math.sin(this.time * 38 + p.phase) * 0.55; // battement d'ailes
        pitch = -0.25;
        if (p.t >= p.dur) {
          p.fly = false;
          p.cool = 2.5;
          p.y = 0;
        }
      } else {
        pitch = Math.max(0, Math.sin(this.time * 3.5 + p.phase * 4)) * 0.45; // picore
      }
      this.writePose(mesh, i, p.x, y, p.z, p.cap, pitch, roll, p.scale, p.scale);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // ───────────── Mise à jour ─────────────

  update(dt: number, playerX: number, playerZ: number, camYaw = 0, worldReady = true): void {
    this.time += dt;
    this.frame++;
    const core = this.core;

    // Menaces de l'image précédente (véhicules) ; vitesse du joueur déduite de son déplacement (rayon de fuite accru s'il roule)
    const prev = this.threats;
    this.threats = this.threatsNext;
    this.threatsNext = prev;
    this.threatCount = this.threatNextCount;
    this.threatNextCount = 0;
    if (this.hasLast && dt > 0) {
      const sp = Math.hypot(playerX - this.lastPx, playerZ - this.lastPz) / dt;
      this.playerBoost = sp > 8 ? Math.min(6, (sp - 8) * 0.6) : 0;
    } else {
      this.playerBoost = 0;
    }
    this.lastPx = playerX;
    this.lastPz = playerZ;
    this.hasLast = true;

    if (!this.indoor) this.updatePigeons(dt, playerX, playerZ);

    if (!core) return;
    let spawnsLeft = SPAWNS_PER_FRAME;
    let dirty = false;
    for (let i = 0; i < this.ground.length; i++) {
      const a = this.ground[i];
      if (a.charId < 0) continue;

      if (a.species && !a.indoor && Math.hypot(a.x - playerX, a.z - playerZ) > ANIMAL_DESPAWN_DIST) this.deactivate(a);

      if (!a.species) {
        if (this.indoor || spawnsLeft <= 0 || !worldReady) continue;
        const spot = this.findSpot(playerX, playerZ, camYaw);
        if (!spot) continue;
        this.pt.x = spot.x;
        this.pt.z = spot.z;
        const district = districtAt(this.pt);
        const species = pickSpecies({
          districtId: district.id,
          social: district.social,
          nearMarket: !!this.marketCenter && Math.hypot(spot.x - this.marketCenter.x, spot.z - this.marketCenter.z) < ANIMAL_MARKET_RADIUS,
          nearMaquis: !!this.maquisCenter && Math.hypot(spot.x - this.maquisCenter.x, spot.z - this.maquisCenter.z) < ANIMAL_MAQUIS_RADIUS,
        }, this.rand());
        if (species && this.activate(a, species, spot.x, spot.z)) spawnsLeft--;
        continue;
      }

      const species = a.species;
      const def = ANIMAL_SPECIES[species];
      core.readCharacter(a.charId, this.scratch);
      const st = this.scratch;
      a.x = st.x;
      a.y = st.y;
      a.z = st.z;

      // Garde-fou eau : un animal poussé dans l'eau est retiré et réapparaît ailleurs
      if (!a.indoor && (this.frame + i) % 15 === 0) {
        this.pt.x = st.x;
        this.pt.z = st.z;
        if (isWater(this.pt)) {
          this.deactivate(a);
          continue;
        }
      }

      const dist = Math.hypot(st.x - playerX, st.z - playerZ);
      a.aiAccum += dt;
      const knocked = st.stun > 0;
      if (knocked) {
        a.state = 'down'; // renversé par un véhicule : aucun `characterInput` tant que `stun > 0`
      } else {
        if (a.state === 'down') {
          a.state = 'wander';
          a.homeX = st.x;
          a.homeZ = st.z;
          this.pickGoal(a);
          this.resetStuck(a, st);
        }
        if (dist < ANIMAL_FAR_AI_DIST || ((this.frame + i) & 1) === 0) {
          this.think(a, st, a.aiAccum, playerX, playerZ);
          a.aiAccum = 0;
        }
      }

      const moving = !knocked && st.speed > 0.3;
      if (moving) a.phase += st.speed * dt * 7;
      if (!knocked && st.speed > 0.35) a.cap += angleDiff(st.heading, a.cap) * Math.min(1, 10 * dt);
      a.roll += ((knocked ? FALL_ROLL : 0) - a.roll) * Math.min(1, 8 * dt);

      let yOff = 0;
      let pitch = 0;
      let wobble = 0;
      let sy = a.scale;
      if (moving) {
        yOff = Math.abs(Math.sin(a.phase)) * 0.03 * a.scale;
        wobble = Math.sin(a.phase) * 0.07;
      } else if (a.state === 'graze' && def.pecker) {
        pitch = Math.max(0, Math.sin(this.time * 5 + i)) * 0.6;
      } else if (a.state === 'graze') {
        pitch = Math.max(0, Math.sin(this.time * 1.5 + i)) * 0.18; // broute / renifle
      } else if (a.state === 'sit' && def.sitter) {
        sy = a.scale * 0.78;
      }
      this.writePose(this.meshes[species], i, st.x, st.y + yOff, st.z, a.cap, pitch, a.roll + wobble, a.scale, sy);
      dirty = true;
    }
    if (dirty || spawnsLeft < SPAWNS_PER_FRAME) this.flush();
  }

  dispose(): void {
    const core = this.core;
    if (core) for (const a of this.ground) if (a.charId >= 0) core.destroyCharacter(a.charId);
    this.core = null;
    this.group.parent?.remove(this.group);
    for (const k of Object.keys(this.meshes) as MeshKey[]) {
      this.meshes[k].dispose();
      this.geoms[k].dispose();
    }
    this.material.dispose();
  }
}
