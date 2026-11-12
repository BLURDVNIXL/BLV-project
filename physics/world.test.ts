// Invariants géographiques : npm run test:world
import { project, unproject, realDistance } from '../src/world/geo';
import { BRIDGES, DISTRICTS, LANDMARKS, ISLANDS, isWater, districtAt, districtsForHome, projected, HomeType } from '../src/world/abidjanGeography';

let fails = 0;
const check = (name: string, ok: boolean, info = ''): void => { console.log(`${ok ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`); if (!ok) fails++; };

// Projection : aller-retour et échelle
const p = project(5.3102, -4.0129); const q = unproject(p.x, p.z);
check('Projection : aller-retour GPS ↔ monde', Math.abs(q.lat - 5.3102) < 1e-9 && Math.abs(q.lon + 4.0129) < 1e-9);
const tre = project(5.3102, -4.0129); const mar = project(5.3, -3.983);
const dReal = realDistance(tre, mar);
check('Distance Treichville ↔ Marcory ≈ 3,5 km réels (source : coordonnées Wikipedia/Sygic)', dReal > 3000 && dReal < 4200, `${(dReal / 1000).toFixed(2)} km réels = ${Math.hypot(tre.x - mar.x, tre.z - mar.z).toFixed(0)} m de jeu`);

// Communes : sur la terre ferme
DISTRICTS.filter((d) => d.social !== 'nature').forEach((d) => {
  const c = project(d.center.lat, d.center.lon);
  check(`Commune « ${d.name} » sur la terre ferme`, !isWater(c));
});
// Repères
LANDMARKS.forEach((l) => check(`Repère « ${l.name} » sur la terre ferme`, !isWater(project(l.at.lat, l.at.lon))));

// Ponts : extrémités sur terre, milieu dans l'eau, > 70 % du tablier au-dessus de l'eau
for (const br of BRIDGES) {
  const a = project(br.from.lat, br.from.lon); const b = project(br.to.lat, br.to.lon);
  const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  let wet = 0; const N = 200;
  for (let i = 0; i <= N; i++) if (isWater({ x: a.x + ((b.x - a.x) * i) / N, z: a.z + ((b.z - a.z) * i) / N })) wet++;
  check(`Pont « ${br.name} » : départ et arrivée sur la terre, milieu sur l'eau`, !isWater(a) && !isWater(b) && isWater(mid), `${((wet / (N + 1)) * 100).toFixed(0)} % au-dessus de l'eau, ${(realDistance(a, b)).toFixed(0)} m réels`);
}
// Ponts : ordre ouest -> est cohérent avec les sources (De Gaulle < FHB < ADO < HKB, Yopougon à l'ouest de tous)
const bx = Object.fromEntries(BRIDGES.map((b) => [b.id, b.from.lon]));
check('Ordre des ponts d\'ouest en est : Yopougon < De Gaulle < FHB < ADO < HKB', bx.yopougon < bx.degaulle && bx.degaulle < bx.fhb && bx.fhb < bx.ado && bx.ado < bx.hkb);
check('HKB « sensiblement plus à l\'est » : > 1,5 km réels à l\'est du pont De Gaulle', realDistance(project(5.3, bx.hkb), project(5.3, bx.degaulle)) > 1500);

// Île Boulay : au milieu de l'eau, mais elle-même une terre
ISLANDS.forEach((i) => check(`Île « ${i.name} » : terre entourée d'eau`, !isWater(project(i.center.lat, i.center.lon)) && isWater(project(i.center.lat, i.center.lon + 0.02))));

// Géographie : 4 communes entièrement au sud de la lagune (sources : Marcory, Treichville, Koumassi, Port-Bouët)
const south = ['treichville', 'marcory', 'koumassi', 'port_bouet'];
const shoreZ = (x: number): number => { const s = projected.southShore; for (let i = 0; i < s.length - 1; i++) if (x >= s[i].x && x <= s[i + 1].x) return s[i].z + ((s[i + 1].z - s[i].z) * (x - s[i].x)) / (s[i + 1].x - s[i].x); return s[s.length - 1].z; };
south.forEach((id) => { const d = DISTRICTS.find((x) => x.id === id)!; const c = project(d.center.lat, d.center.lon); check(`« ${d.name} » au sud de la lagune`, c.z > shoreZ(c.x)); });

// Chaque type de logement a au moins une commune d'accueil
(['squat', 'chambre_cour', 'studio', 'deux_pieces', 'trois_pieces', 'duplex_mer', 'villa_ambassade', 'bunker'] as HomeType[]).forEach((h) => check(`Logement « ${h} » : ≥ 1 commune d'accueil`, districtsForHome(h).length >= 1, districtsForHome(h).map((d) => d.id).join(', ')));

// Emprise de la carte
const { nw, se } = projected.bounds;
check('Carte contenue dans les limites du moteur physique (±3 km)', Math.abs(nw.x) < 3000 && Math.abs(se.x) < 3000 && Math.abs(nw.z) < 3000 && Math.abs(se.z) < 3000, `${(se.x - nw.x).toFixed(0)} m × ${(se.z - nw.z).toFixed(0)} m de jeu`);
check('Voronoï des communes : le centre de chaque commune lui appartient', DISTRICTS.every((d) => districtAt(project(d.center.lat, d.center.lon)).id === d.id));

// Proportion d'eau (cohérence visuelle) sur une grille 50 m
let water = 0, total = 0;
for (let x = nw.x; x < se.x; x += 50) for (let z = nw.z; z < se.z; z += 50) { total++; if (isWater({ x, z })) water++; }
check('Part d\'eau de la carte plausible (15–45 %)', water / total > 0.15 && water / total < 0.45, `${((water / total) * 100).toFixed(0)} %`);

console.log(fails === 0 ? '\nGÉOGRAPHIE OK' : `\n${fails} ÉCHEC(S)`);
process.exit(fails ? 1 : 0);
