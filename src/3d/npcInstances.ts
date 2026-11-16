/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Rendu instancié des PNJ : une « foule » de capacité fixe dessinée avec une trentaine de `InstancedMesh`
 * PARTAGÉS (un par partie du corps, un par coiffure, un par accessoire), quel que soit le nombre de PNJ.
 * Couleurs par instance (`setColorAt`), taille / corpulence / âge dans la matrice d'instance, marche calculée
 * dans les matrices (mêmes formules que `animateGait` de `models.ts`, sans hiérarchie de nœuds par PNJ).
 * Aucune ombre portée dans la carte d'ombre : un disque d'ombre de contact instancié (voir `shadowDisc`).
 * Le joueur, les autres joueurs et les PNJ d'intérieur n'utilisent PAS ce module.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { AccessoryId, HairStyleId, NpcAppearance } from '../world/npcAppearance';
import { getWaxFabricTexture } from './materials';

/** Couples (couleur de fond, couleur de motif) des 4 motifs `motif_1`…`motif_4` du pack d'apparence. */
const MOTIF_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['#d97706', '#16a34a'],
  ['#0e7490', '#fef3c7'],
  ['#be123c', '#facc15'],
  ['#7e22ce', '#f8fafc'],
];
const MOTIF_PRIMARY: readonly number[] = [0xd97706, 0x0e7490, 0xbe123c, 0x7e22ce];

const ACCESSORY_COLORS: Record<AccessoryId, number> = {
  lunettes: 0x09090b, sac: 0x92400e, panier_tete: 0xb45309, chapeau: 0xd6c7a1, telephone: 0x111827, canne: 0x78350f,
};
const BAG_COLORS: readonly number[] = [0x92400e, 0x1f2937, 0xb91c1c];
/** Chemise visible sous une veste (bande sur le devant du torse). */
const OPENING_COLORS: Partial<Record<NpcAppearance['top']['id'], number>> = {
  veste_costume: 0xf8fafc, blouson: 0xe2e8f0, veste_legere: 0xf8fafc, gilet: 0xe2e8f0,
};
const TUNIC_TOPS = new Set<NpcAppearance['top']['id']>(['tunique', 'blouse', 'tablier']);
const BARE_ARM_TOPS = new Set<NpcAppearance['top']['id']>(['debardeur', 'tablier']);
const BARE_SHIN_BOTTOMS = new Set<NpcAppearance['bottom']['id']>(['short', 'jupe', 'pagne']);
const SKIRT_BOTTOMS = new Set<NpcAppearance['bottom']['id']>(['jupe', 'pagne']);

// ───────────── Géométries (construites une seule fois, origine = pivot de la pièce) ─────────────

const _gm = new THREE.Matrix4();
const _gq = new THREE.Quaternion();
const place = <G extends THREE.BufferGeometry>(g: G, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1): G => {
  g.applyMatrix4(_gm.compose(new THREE.Vector3(x, y, z), _gq, new THREE.Vector3(sx, sy, sz)));
  return g;
};
const merge = (list: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const g = mergeGeometries(list, false);
  if (!g) throw new Error('npcInstances : fusion de géométries impossible');
  return g;
};
const cap = (r: number, theta: number): THREE.SphereGeometry => new THREE.SphereGeometry(r, 12, 10, 0, Math.PI * 2, 0, theta);

function buildGeometries() {
  const torso = place(new THREE.CylinderGeometry(0.27, 0.22, 0.54, 10), 0, 1.23, 0, 1.05, 1, 0.65);
  const pelvis = place(new THREE.BoxGeometry(0.46, 0.16, 0.28), 0, 0.86, 0);
  const head = merge([
    place(new THREE.SphereGeometry(0.185, 14, 12), 0, 1.72, 0, 0.95, 1.08, 1),
    place(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), 0, 1.54, 0),
    place(new THREE.SphereGeometry(0.04, 6, 6), -0.18, 1.72, 0),
    place(new THREE.SphereGeometry(0.04, 6, 6), 0.18, 1.72, 0),
  ]);
  const upperArm = place(new THREE.CylinderGeometry(0.062, 0.055, 0.26, 8), 0, -0.14, 0);
  const forearm = merge([
    place(new THREE.SphereGeometry(0.054, 8, 8)),
    place(new THREE.CylinderGeometry(0.052, 0.044, 0.24, 8), 0, -0.12, 0),
    place(new THREE.BoxGeometry(0.07, 0.08, 0.06), 0, -0.25, 0),
  ]);
  const thigh = place(new THREE.CylinderGeometry(0.082, 0.072, 0.36, 8), 0, -0.18, 0);
  const shin = merge([
    place(new THREE.SphereGeometry(0.07, 8, 8)),
    place(new THREE.CylinderGeometry(0.068, 0.058, 0.34, 8), 0, -0.17, 0),
  ]);
  const shoe = place(new THREE.BoxGeometry(0.11, 0.09, 0.22), 0, -0.38, 0.045);
  const tunic = place(new THREE.CylinderGeometry(0.26, 0.34, 0.62, 10), 0, 0.74, 0, 1, 1, 0.75);
  const skirt = place(new THREE.CylinderGeometry(0.24, 0.36, 0.42, 10), 0, 0.72, 0, 1, 1, 0.8);
  const opening = place(new THREE.BoxGeometry(0.12, 0.5, 0.03), 0, 1.23, 0.165);
  const shadowDisc = new THREE.CircleGeometry(1, 16);
  shadowDisc.rotateX(-Math.PI / 2);

  const hair: Record<Exclude<HairStyleId, 'chauve'>, THREE.BufferGeometry> = {
    court: place(cap(0.19, Math.PI * 0.56), 0, 1.74, -0.015),
    rase: place(cap(0.188, Math.PI * 0.42), 0, 1.735, -0.005),
    afro: place(new THREE.SphereGeometry(0.26, 12, 10), 0, 1.8, -0.03, 1, 0.95, 1),
    tresses: merge([
      place(cap(0.19, Math.PI * 0.56), 0, 1.74, -0.015),
      ...([[-0.14, -0.06], [0.14, -0.06], [-0.08, -0.15], [0, -0.17], [0.08, -0.15]] as const).map(([x, z]) =>
        place(new THREE.BoxGeometry(0.03, 0.22, 0.03), x, 1.62, z)),
    ]),
    foulard: merge([
      place(cap(0.2, Math.PI * 0.6), 0, 1.735, -0.01),
      place(new THREE.SphereGeometry(0.08, 6, 6), 0, 1.9, -0.13),
    ]),
    casquette: merge([
      place(cap(0.2, Math.PI * 0.5), 0, 1.745, -0.01),
      place(new THREE.BoxGeometry(0.2, 0.018, 0.14), 0, 1.76, 0.19),
    ]),
    bonnet: merge([
      place(cap(0.2, Math.PI * 0.65), 0, 1.73, -0.01),
      place(new THREE.SphereGeometry(0.05, 6, 6), 0, 1.95, 0),
    ]),
  };

  const accessories: Record<AccessoryId, THREE.BufferGeometry> = {
    lunettes: place(new THREE.BoxGeometry(0.28, 0.065, 0.06), 0, 1.74, 0.17),
    sac: place(new THREE.BoxGeometry(0.3, 0.38, 0.12), 0, 1.2, -0.2),
    panier_tete: merge([
      place(new THREE.CylinderGeometry(0.2, 0.15, 0.14, 10), 0, 1.97, 0),
      place(new THREE.SphereGeometry(0.15, 8, 6), 0, 2.06, 0, 1, 0.6, 1),
    ]),
    chapeau: merge([
      place(new THREE.CylinderGeometry(0.27, 0.27, 0.02, 14), 0, 1.88, 0),
      place(new THREE.CylinderGeometry(0.15, 0.17, 0.13, 12), 0, 1.95, 0),
    ]),
    telephone: place(new THREE.BoxGeometry(0.05, 0.1, 0.015), 0.23, 1.73, 0.04),
    canne: place(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6), 0.34, 0.42, 0.1),
  };
  return { torso, pelvis, head, upperArm, forearm, thigh, shin, shoe, tunic, skirt, opening, shadowDisc, hair, accessories };
}

// ───────────── Poignée ─────────────

/** Ce qui est décidé à l'`acquire` : couleurs et variantes de pièces. */
interface Look {
  skin: number; torso: number; arm: number; thigh: number; shin: number; skirt: number; shoe: number; hair: number;
  motif: number; hairKey: Exclude<HairStyleId, 'chauve'> | null; tunic: boolean; opening: number; skirtOn: boolean; bag: number;
}

export class NpcHandle {
  index = -1;
  visible = true;
  x = 0; z = 0; cap = 0; phase = 0; amp = 0;
  /** Basculement vers l'avant en radians (0 = debout, ≈ 1,35 = à terre) : PNJ renversé par un véhicule. */
  tilt = 0;
  /** Décalage de la respiration à l'arrêt (pour que les PNJ ne respirent pas tous ensemble). */
  readonly idle: number;
  readonly look: Look;
  constructor(readonly appearance: NpcAppearance, idle: number, look: Look) {
    this.idle = idle;
    this.look = look;
  }
}

function lookOf(a: NpcAppearance): Look {
  const motifOf = (p: string | null): number => (p ? Math.min(MOTIF_PAIRS.length - 1, Math.max(0, parseInt(p.slice(6), 10) - 1 || 0)) : -1);
  const topMotif = motifOf(a.top.patternId);
  const bottomMotif = motifOf(a.bottom.patternId);
  const torso = topMotif >= 0 ? MOTIF_PRIMARY[topMotif] : a.top.hex;
  const bottom = bottomMotif >= 0 ? MOTIF_PRIMARY[bottomMotif] : a.bottom.hex;
  const covered = a.hair === 'foulard' || a.hair === 'casquette' || a.hair === 'bonnet';
  return {
    skin: a.skinHex,
    torso,
    arm: BARE_ARM_TOPS.has(a.top.id) ? a.skinHex : torso,
    thigh: bottom,
    shin: BARE_SHIN_BOTTOMS.has(a.bottom.id) ? a.skinHex : bottom,
    skirt: bottom,
    shoe: a.shoes.hex,
    hair: covered ? (a.headwearHex ?? a.hairHex) : a.hairHex,
    motif: topMotif,
    hairKey: a.hair === 'chauve' ? null : a.hair,
    tunic: TUNIC_TOPS.has(a.top.id),
    opening: OPENING_COLORS[a.top.id] ?? 0,
    skirtOn: SKIRT_BOTTOMS.has(a.bottom.id),
    bag: BAG_COLORS[a.top.hex % BAG_COLORS.length],
  };
}

// ───────────── Foule ─────────────

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _qt = new THREE.Quaternion();
const _col = new THREE.Color();
const _root = new THREE.Matrix4();
const _body = new THREE.Matrix4();
const _loc = new THREE.Matrix4();
const _w = new THREE.Matrix4();
const _w2 = new THREE.Matrix4();

const rotX = (m: THREE.Matrix4, x: number, y: number, z: number, ang: number, sx = 1, sy = 1, sz = 1): THREE.Matrix4 =>
  m.compose(_p.set(x, y, z), _q.setFromAxisAngle(X_AXIS, ang), _s.set(sx, sy, sz));

export class NpcCrowd {
  readonly group = new THREE.Group();
  readonly capacity: number;
  private readonly active: NpcHandle[] = [];
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly coloredMeshes = new Set<THREE.InstancedMesh>();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private idleCounter = 0;
  private disposed = false;

  private readonly torso: THREE.InstancedMesh;
  private readonly torsoMotif: THREE.InstancedMesh[];
  private readonly pelvis: THREE.InstancedMesh;
  private readonly head: THREE.InstancedMesh;
  private readonly upperArm: THREE.InstancedMesh;
  private readonly forearm: THREE.InstancedMesh;
  private readonly thigh: THREE.InstancedMesh;
  private readonly shin: THREE.InstancedMesh;
  private readonly shoe: THREE.InstancedMesh;
  private readonly tunic: THREE.InstancedMesh;
  private readonly skirt: THREE.InstancedMesh;
  private readonly opening: THREE.InstancedMesh;
  private readonly shadow: THREE.InstancedMesh;
  private readonly hair: Record<Exclude<HairStyleId, 'chauve'>, THREE.InstancedMesh>;
  private readonly accessories: Record<AccessoryId, THREE.InstancedMesh>;

  constructor(capacity = 80) {
    this.capacity = capacity;
    const g = buildGeometries();
    this.geometries.push(...Object.values(g).filter((v): v is THREE.BufferGeometry => v instanceof THREE.BufferGeometry));
    this.geometries.push(...Object.values(g.hair), ...Object.values(g.accessories));

    const std = (roughness: number, metalness: number, map?: THREE.Texture): THREE.MeshStandardMaterial => {
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness, metalness });
      if (map) m.map = map;
      this.materials.push(m);
      return m;
    };
    const skinMat = std(0.68, 0.05);
    const clothMat = std(0.72, 0.05);
    const shoeMat = std(0.45, 0.08);
    const hairMat = std(0.9, 0.02);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x05080f, transparent: true, opacity: 0.36, depthWrite: false });
    this.materials.push(shadowMat);

    const make = (geo: THREE.BufferGeometry, mat: THREE.Material, perNpc: number, colored: boolean): THREE.InstancedMesh => {
      const n = capacity * perNpc;
      const m = new THREE.InstancedMesh(geo, mat, n);
      m.count = 0;
      m.visible = false;
      m.frustumCulled = false; // les instances couvrent toute la zone : la sphère englobante initiale serait fausse
      m.castShadow = false;
      m.receiveShadow = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Attribut de couleur créé d'avance (blanc) : évite une recompilation du shader au premier PNJ coloré
      const colors = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
      colors.setUsage(THREE.DynamicDrawUsage);
      m.instanceColor = colors;
      if (colored) this.coloredMeshes.add(m);
      this.meshes.push(m);
      this.group.add(m);
      return m;
    };

    this.torso = make(g.torso, clothMat, 1, true);
    this.torsoMotif = MOTIF_PAIRS.map(([primary, accent]) => make(g.torso, std(0.72, 0.05, getWaxFabricTexture(primary, accent)), 1, false));
    this.pelvis = make(g.pelvis, clothMat, 1, true);
    this.head = make(g.head, skinMat, 1, true);
    this.upperArm = make(g.upperArm, clothMat, 2, true);
    this.forearm = make(g.forearm, skinMat, 2, true);
    this.thigh = make(g.thigh, clothMat, 2, true);
    this.shin = make(g.shin, clothMat, 2, true);
    this.shoe = make(g.shoe, shoeMat, 2, true);
    this.tunic = make(g.tunic, clothMat, 1, true);
    this.skirt = make(g.skirt, clothMat, 1, true);
    this.opening = make(g.opening, clothMat, 1, true);
    this.shadow = make(g.shadowDisc, shadowMat, 1, false);
    this.hair = {} as Record<Exclude<HairStyleId, 'chauve'>, THREE.InstancedMesh>;
    for (const [k, geo] of Object.entries(g.hair)) this.hair[k as Exclude<HairStyleId, 'chauve'>] = make(geo, hairMat, 1, true);
    this.accessories = {} as Record<AccessoryId, THREE.InstancedMesh>;
    for (const [k, geo] of Object.entries(g.accessories)) this.accessories[k as AccessoryId] = make(geo, clothMat, 1, true);
  }

  /** Nombre de PNJ réservés / affichés. */
  get activeCount(): number { return this.active.length; }
  get visibleCount(): number { return this.active.reduce((n, h) => n + (h.visible ? 1 : 0), 0); }
  /** Nombre d'`InstancedMesh` dessinés à la dernière mise à jour (≈ appels de dessin de la foule). */
  get drawnMeshCount(): number { return this.meshes.reduce((n, m) => n + (m.visible ? 1 : 0), 0); }

  /** Réserve une place pour ce PNJ ; `null` si la foule est pleine. */
  acquire(appearance: NpcAppearance): NpcHandle | null {
    if (this.disposed || this.active.length >= this.capacity) return null;
    const h = new NpcHandle(appearance, (this.idleCounter++) * 1.37, lookOf(appearance));
    h.index = this.active.length;
    this.active.push(h);
    return h;
  }

  release(h: NpcHandle | null): void {
    if (!h || h.index < 0) return;
    const last = this.active.pop();
    if (last && last !== h) {
      this.active[h.index] = last;
      last.index = h.index;
    }
    h.index = -1;
  }

  setPose(h: NpcHandle, x: number, z: number, capRad: number, phase: number, amplitude: number, tilt = 0): void {
    h.x = x; h.z = z; h.cap = capRad; h.phase = phase; h.amp = amplitude; h.tilt = tilt;
  }

  setVisible(h: NpcHandle, visible: boolean): void { h.visible = visible; }

  private put(mesh: THREE.InstancedMesh, m: THREE.Matrix4, hex: number): void {
    const i = mesh.count;
    if (i >= mesh.instanceMatrix.count) return;
    mesh.count = i + 1;
    mesh.setMatrixAt(i, m);
    if (hex >= 0) mesh.setColorAt(i, _col.setHex(hex));
  }

  /** À appeler une fois par image après les `setPose` : recalcule les matrices et les compteurs d'instances. */
  commit(timeSec: number): void {
    if (this.disposed) return;
    for (const m of this.meshes) m.count = 0;
    for (const h of this.active) if (h.visible) this.draw(h, timeSec);
    for (const m of this.meshes) {
      m.visible = m.count > 0;
      if (m.count === 0) continue;
      m.instanceMatrix.needsUpdate = true;
      if (this.coloredMeshes.has(m) && m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  private draw(h: NpcHandle, t: number): void {
    const a = h.appearance;
    const L = h.look;
    const s = a.heightScale;
    const amp = Math.min(1, h.amp);
    // Mêmes formules que `animateGait` (models.ts)
    const swing = Math.sin(h.phase) * 0.65 * amp;
    const cs = Math.cos(h.phase);
    const bob = amp > 0.05 ? Math.abs(Math.sin(h.phase)) * 0.045 * amp : Math.sin(t * 3 + h.idle) * 0.015;
    const forearmAng = -0.25 - Math.abs(swing) * 0.35;
    const bt = a.build.torso;
    const ba = a.build.arms;
    const bh = a.build.hips;

    _q.setFromAxisAngle(Y_AXIS, h.cap);
    // Renversé : lacet puis bascule vers l'avant (même convention que le joueur : rotation 'YXZ')
    if (h.tilt > 0.01) _q.multiply(_qt.setFromAxisAngle(X_AXIS, -h.tilt));
    _root.compose(_p.set(h.x, bob * s, h.z), _q, _s.set(s, s, s));

    // Ombre de contact (au sol, sans le rebond)
    const r = a.collisionRadius * 1.6;
    _w.compose(_p.set(h.x, 0.02, h.z), _qi, _s.set(r, 1, r));
    this.put(this.shadow, _w, -1);

    // Torse, tunique, ouverture de veste
    _body.multiplyMatrices(_root, _loc.compose(_p.set(0, 0, 0), _qi, _s.set(bt, 1, (1 + bt) / 2)));
    if (L.motif >= 0) this.put(this.torsoMotif[L.motif], _body, -1);
    else this.put(this.torso, _body, L.torso);
    if (L.tunic) this.put(this.tunic, _body, L.torso);
    if (L.opening) this.put(this.opening, _body, L.opening);

    // Bassin et jupe
    _w.multiplyMatrices(_root, _loc.compose(_p.set(0, 0, 0), _qi, _s.set(bh, 1, (1 + bh) / 2)));
    this.put(this.pelvis, _w, L.thigh);
    if (L.skirtOn) this.put(this.skirt, _w, L.skirt);

    // Tête, cheveux, accessoires (suivent le corps)
    this.put(this.head, _root, L.skin);
    if (L.hairKey) this.put(this.hair[L.hairKey], _root, L.hair);
    for (const acc of a.accessories) this.put(this.accessories[acc], _root, acc === 'sac' ? L.bag : ACCESSORY_COLORS[acc]);

    // Bras : épaule puis avant-bras
    for (const side of [-1, 1] as const) {
      const ang = side * swing * 0.85 * -1;
      _w.multiplyMatrices(_root, rotX(_loc, side * 0.31 * bt, 1.44, 0, ang, ba, 1, ba));
      this.put(this.upperArm, _w, L.arm);
      _w2.multiplyMatrices(_w, rotX(_loc, 0, -0.27, 0, forearmAng));
      this.put(this.forearm, _w2, L.skin);
    }

    // Jambes : hanche puis genou ; gauche = +swing, droite = −swing
    for (const side of [-1, 1] as const) {
      const hip = side === -1 ? swing : -swing;
      const knee = side === -1 ? Math.max(0, -cs * 0.6 * amp) : Math.max(0, cs * 0.6 * amp);
      _w.multiplyMatrices(_root, rotX(_loc, side * 0.13 * bh, 0.8, 0, hip, bh, 1, bh));
      this.put(this.thigh, _w, L.thigh);
      _w2.multiplyMatrices(_w, rotX(_loc, 0, -0.36, 0, knee));
      this.put(this.shin, _w2, L.shin);
      this.put(this.shoe, _w2, L.shoe);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.group.removeFromParent();
    for (const m of this.meshes) m.dispose();
    // Les textures de motif viennent du cache de `materials.ts` (partagées) : on ne les libère pas ici
    for (const g of new Set(this.geometries)) g.dispose();
    for (const m of this.materials) m.dispose();
    this.meshes.length = 0;
    this.active.length = 0;
  }
}
