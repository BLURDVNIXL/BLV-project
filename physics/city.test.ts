// Invariants de la ville générée : npm run test:city
import { performance } from 'node:perf_hooks';
import { CHUNK, ChunkData, Building, generateChunk, findHouseLot, SPECIAL_FOOTPRINTS, carSpotForLot, chunkOf } from '../src/world/city';
import { projected, DISTRICTS, isWater, HomeType, districtAt } from '../src/world/abidjanGeography';
import { ARTERIALS, bridgeAt, isOpenWater, roadAt } from '../src/world/roads';

let fails = 0;
const check = (name: string, ok: boolean, info = ''): void => { console.log(`${ok ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`); if (!ok) fails++; };

const { nw, se } = projected.bounds;
const cx0 = chunkOf(nw.x), cx1 = chunkOf(se.x), cz0 = chunkOf(nw.z), cz1 = chunkOf(se.z);
const all: ChunkData[] = [];
const t0 = performance.now();
for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) all.push(generateChunk(cx, cz));
const totalMs = performance.now() - t0;
const nB = all.reduce((n, c) => n + c.buildings.length, 0);
const nT = all.reduce((n, c) => n + c.trees.length, 0);
const nW = all.reduce((n, c) => n + c.water.length, 0);
check('Génération de toute la carte (' + all.length + ' chunks) : temps moyen < 10 ms/chunk', totalMs / all.length < 10, `${(totalMs / all.length).toFixed(2)} ms/chunk, total ${(totalMs / 1000).toFixed(1)} s`);
console.log(`   ${nB} bâtiments, ${nT} arbres, ${nW} bandes d'eau`);

// Déterminisme
const a = JSON.stringify(generateChunk(2, -3)), b = JSON.stringify(generateChunk(2, -3));
const dc = projected.districts.find((d) => d.d.id === 'treichville')!.c;
const tc = generateChunk(chunkOf(dc.x), chunkOf(dc.z));
check('Déterminisme : deux générations identiques', a === b && JSON.stringify(tc) === JSON.stringify(generateChunk(chunkOf(dc.x), chunkOf(dc.z))));

// Aucun bâtiment sur l'eau ni sur une route
const corners = (bd: Building): Array<{ x: number; z: number }> => {
  const c = Math.cos(bd.angle), s = Math.sin(bd.angle);
  return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => ({ x: bd.x + (a * bd.w) / 2 * c - (b * bd.d) / 2 * s, z: bd.z + (a * bd.w) / 2 * s + (b * bd.d) / 2 * c }));
};
let onWater = 0, onRoad = 0, onBridge = 0, outChunk = 0;
for (const ch of all) for (const bd of ch.buildings) {
  if (bd.kind === 'container' || bd.landmark === 'port_collider') continue;
  const special = !!bd.landmark;
  if (bd.x < ch.cx * CHUNK || bd.x >= (ch.cx + 1) * CHUNK || bd.z < ch.cz * CHUNK || bd.z >= (ch.cz + 1) * CHUNK) outChunk++;
  for (const p of [{ x: bd.x, z: bd.z }, ...corners(bd)]) {
    if (isOpenWater(p)) onWater++;
    if (bridgeAt(p, 0)) onBridge++;
    if (!special && roadAt(p) !== 'none') onRoad++;
  }
}
check('Aucun bâtiment (centre ou angle) dans l\'eau', onWater === 0, `${onWater} violations`);
check('Aucun bâtiment sur un pont', onBridge === 0, `${onBridge} violations`);
check('Aucun bâtiment ordinaire sur une rue ou un grand axe', onRoad === 0, `${onRoad} violations`);
check('Chaque bâtiment est rangé dans le chunk qui contient son centre', outChunk === 0, `${outChunk} violations`);

// Non-chevauchement (SAT) sur un échantillon dense : Treichville, Plateau, Cocody
const overlaps = (A: Building, B: Building): boolean => {
  const axes = [[Math.cos(A.angle), Math.sin(A.angle)], [-Math.sin(A.angle), Math.cos(A.angle)], [Math.cos(B.angle), Math.sin(B.angle)], [-Math.sin(B.angle), Math.cos(B.angle)]];
  for (const [nx, nz] of axes) {
    const ra = (A.w / 2) * Math.abs(Math.cos(A.angle) * nx + Math.sin(A.angle) * nz) + (A.d / 2) * Math.abs(-Math.sin(A.angle) * nx + Math.cos(A.angle) * nz);
    const rb = (B.w / 2) * Math.abs(Math.cos(B.angle) * nx + Math.sin(B.angle) * nz) + (B.d / 2) * Math.abs(-Math.sin(B.angle) * nx + Math.cos(B.angle) * nz);
    if (Math.abs((B.x - A.x) * nx + (B.z - A.z) * nz) >= ra + rb) return false;
  }
  return true;
};
let overlapCount = 0, pairs = 0;
for (const id of ['treichville', 'plateau', 'cocody', 'adjame', 'yopougon']) {
  const c = projected.districts.find((d) => d.d.id === id)!.c;
  const region: Building[] = [];
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) region.push(...generateChunk(chunkOf(c.x) + dx, chunkOf(c.z) + dz).buildings.filter((b) => b.kind !== 'container' && b.landmark !== 'port_collider'));
  for (let i = 0; i < region.length; i++) for (let j = i + 1; j < region.length; j++) {
    if (Math.hypot(region[i].x - region[j].x, region[i].z - region[j].z) > 120) continue;
    pairs++; if (overlaps(region[i], region[j])) overlapCount++;
  }
}
check('Aucun chevauchement de bâtiments (échantillon de 5 communes)', overlapCount === 0, `${overlapCount} chevauchements sur ${pairs} paires proches`);

// Eau : aucune boîte d'eau sur un pont, et pas de terre dans l'eau
let badRun = 0;
for (const ch of all) for (const r of ch.water) { if (bridgeAt({ x: r.x, z: r.z }, 0)) badRun++; if (!isWater({ x: r.x, z: r.z })) badRun++; }
check('Eau : bandes d\'eau uniquement sur l\'eau et jamais sur un tablier', badRun === 0, `${badRun} violations`);

// Grands axes : ne traversent l'eau que sur un pont
let wet = 0, samples = 0;
for (const art of ARTERIALS) for (let i = 0; i < art.points.length - 1; i++) {
  const A = art.points[i], B = art.points[i + 1]; const L = Math.hypot(B.x - A.x, B.z - A.z);
  for (let t = 0; t <= L; t += 4) { samples++; const p = { x: A.x + ((B.x - A.x) * t) / L, z: A.z + ((B.z - A.z) * t) / L }; if (isOpenWater(p)) wet++; }
}
check('Grands axes : aucun tronçon dans l\'eau hors pont', wet === 0, `${wet} points sur ${samples}`);

// Repères sur la terre et dégagés
SPECIAL_FOOTPRINTS.forEach((s) => check(`Repère « ${s.spec.name} » sur la terre ferme`, !isOpenWater({ x: s.x, z: s.z })));

// Parcelles : capacité par type de logement (2 × 24 joueurs)
const lotsByHome = new Map<HomeType, number>();
const homeTypes: HomeType[] = ['squat', 'chambre_cour', 'studio', 'deux_pieces', 'trois_pieces', 'duplex_mer', 'villa_ambassade', 'bunker'];
for (const ch of all) for (const l of ch.houseLots) for (const h of l.homes) lotsByHome.set(h, (lotsByHome.get(h) ?? 0) + 1);
homeTypes.forEach((h) => check(`Parcelles « ${h} » : ≥ 48 sur la carte`, (lotsByHome.get(h) ?? 0) >= 48, `${lotsByHome.get(h) ?? 0}`));

// Attribution déterministe, voiture sur la rue
for (const h of homeTypes) {
  const l1 = findHouseLot(h, 12345), l2 = findHouseLot(h, 12345);
  if (!l1) { check(`findHouseLot(${h})`, false, 'aucune parcelle'); continue; }
  const spot = carSpotForLot(l1);
  const okDeterm = l2 !== null && l1.id === l2.id;
  const onRoad = roadAt({ x: spot.x, z: spot.z }) === 'local' || roadAt({ x: spot.x, z: spot.z }) === 'arterial';
  check(`Parcelle « ${h} » : attribution déterministe, voiture garée sur une rue`, okDeterm && onRoad, `${l1.id}, commune ${districtAt({ x: l1.x, z: l1.z }).id}`);
}
const lot = findHouseLot('studio', 7)!;
const withGeneric = generateChunk(chunkOf(lot.x), chunkOf(lot.z)).buildings.some((b) => b.id === `${lot.id}:h`);
const reserved = generateChunk(chunkOf(lot.x), chunkOf(lot.z), { reservedLots: new Set([lot.id]) }).buildings.some((b) => b.id === `${lot.id}:h`);
check('Parcelle réservée : la maison générique disparaît (la maison du joueur la remplace)', withGeneric && !reserved);

// Densité raisonnable : bâtiments par chunk dans un quartier dense
const treich = generateChunk(chunkOf(dc.x), chunkOf(dc.z));
check('Treichville : chunk central dense mais léger (5–80 bâtiments)', treich.buildings.length >= 5 && treich.buildings.length <= 80, `${treich.buildings.length}`);
const worst = Math.max(...all.map((c) => c.buildings.length + c.trees.length));
check('Pire chunk ≤ 600 objets', worst <= 600, `${worst}`);
console.log(fails === 0 ? '\nVILLE OK' : `\n${fails} ÉCHEC(S)`);
process.exit(fails ? 1 : 0);
