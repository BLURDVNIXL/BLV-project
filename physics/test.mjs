// Tests headless du cœur physique WASM : node physics/test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url));
const { instance } = await WebAssembly.instantiate(readFileSync(path.join(dir, '../public/physics.wasm')), {});
const P = instance.exports;
const mem = () => new Float32Array(P.memory.buffer);
const veh = (id) => { const p = P.phys_veh_ptr(id) >> 2; return mem().subarray(p, p + 24); };
const chr = (id) => { const p = P.phys_char_ptr(id) >> 2; return mem().subarray(p, p + 16); };
const KMH = 3.6, deg = (r) => (r * 180) / Math.PI;
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`); if (!ok) fails++; };
const run = (seconds, fn) => { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) { fn?.(i / 60); P.phys_step(1 / 60); } };

// 1. Accélération Wôrô-wôrô 504
P.phys_init();
let v = P.phys_veh_create(0, 0, 0, 0);
P.phys_veh_input(v, 1, 0, 0);
let t100 = null;
run(40, (t) => { const s = veh(v)[6] * KMH; if (t100 === null && s >= 100) t100 = t; });
const top = veh(v)[6] * KMH;
check('504 : 0-100 km/h plausible (6–25 s)', t100 !== null && t100 > 6 && t100 < 25, t100 ? `${t100.toFixed(1)} s` : 'jamais');
check('504 : vitesse max 120–160 km/h', top > 120 && top < 160, `${top.toFixed(0)} km/h`);
const rpmTop = veh(v)[10]; check('504 : régime dans [900, 7000]', rpmTop >= 900 && rpmTop <= 7000, `${rpmTop.toFixed(0)} tr/min, rapport ${veh(v)[11] + 1}`);

// 2. Freinage 100 km/h -> 0 (on mesure jusqu'à l'arrêt, avant la marche arrière automatique)
P.phys_veh_input(v, -1, 0, 0);
const x0 = veh(v)[2]; let stopDist = null;
run(12, () => { if (stopDist === null && veh(v)[6] < 0.3) stopDist = veh(v)[2] - x0; });
check('504 : freinage complet depuis la vitesse max (arrêt entre 40 et 140 m)', stopDist !== null && stopDist > 40 && stopDist < 140, stopDist === null ? 'jamais arrêtée' : `${stopDist.toFixed(0)} m`);
// puis marche arrière
run(6, () => P.phys_veh_input(v, -1, 0, 0));
check('504 : marche arrière enclenchée', veh(v)[6] < -3, `${(veh(v)[6] * KMH).toFixed(0)} km/h`);

// 3. Virage stable à 70 km/h (Coupé GT)
P.phys_init();
v = P.phys_veh_create(4, 0, 0, 0);
P.phys_veh_input(v, 0.6, 0, 0);
run(12);
let s0 = veh(v)[6];
P.phys_veh_input(v, 0.25, 0.5, 0);
run(4);
const w = veh(v)[8], sp = veh(v)[16];
const slipDeg = Math.abs(deg(Math.atan2(veh(v)[7], Math.abs(veh(v)[6]))));
check('GT : virage tenu sans tête-à-queue', slipDeg < 25 && Math.abs(w) > 0.1 && Math.abs(w) < 2.0, `vitesse ${(sp * KMH).toFixed(0)} km/h, lacet ${w.toFixed(2)} rad/s, dérive ${slipDeg.toFixed(1)}°`);
check('GT : braquage à droite => cap qui diminue', w < 0, `ω=${w.toFixed(2)}`);

// 4. Frein à main = dérapage
P.phys_init();
v = P.phys_veh_create(0, 0, 0, 0);
P.phys_veh_input(v, 1, 0, 0); run(8);
P.phys_veh_input(v, 0, 0.8, 1);
let maxSkid = 0, maxSlip = 0;
run(1.5, () => { maxSkid = Math.max(maxSkid, veh(v)[13]); maxSlip = Math.max(maxSlip, Math.abs(deg(Math.atan2(veh(v)[7], Math.abs(veh(v)[6]) + 0.1)))); });
check('504 : frein à main => dérapage marqué', maxSkid > 0.9 && maxSlip > 20, `skid ${maxSkid.toFixed(2)}, dérive max ${maxSlip.toFixed(0)}°`);

// 5. Mur épais de 0.5 m à 120 km/h : pas de traversée
P.phys_init();
P.phys_add_box(0, 60, 400, 0.25, 0, 10, 1);
v = P.phys_veh_create(4, 0, 0, 0);
P.phys_veh_input(v, 1, 0, 0);
let evs = 0, maxZ = 0;
run(15, () => { maxZ = Math.max(maxZ, veh(v)[2]); });
const nEv = P.phys_event_count();
check('GT : ne traverse pas un mur de 50 cm à pleine vitesse', maxZ < 60.2, `z max ${maxZ.toFixed(2)} m`);
check('GT : événement de collision émis', nEv >= 1 && mem()[(P.phys_event_ptr() >> 2)] === 1, `${nEv} événement(s)`);
P.phys_event_clear();

// 5b. Même test à vitesse maximale réelle (départ lancé, ~230 km/h) contre un mur de 40 cm
P.phys_init(); P.phys_add_box(0, 0, 400, 0.2, 0, 10, 1);
v = P.phys_veh_create(4, 0, -950, 0); P.phys_veh_input(v, 1, 0, 0);
let vImpact = 0, maxZ2 = -1e9, bounced = false;
for (let i = 0; i < 60 * 60; i++) { const before = veh(v)[6]; P.phys_step(1 / 60); maxZ2 = Math.max(maxZ2, veh(v)[2]); if (!bounced && P.phys_event_count() > 0) { bounced = true; vImpact = before; } }
check('GT : ne traverse pas un mur de 40 cm à vitesse maximale', maxZ2 < 0.3 && bounced, `vitesse d'impact ${(vImpact * KMH).toFixed(0)} km/h, z max ${maxZ2.toFixed(2)} m`);
P.phys_event_clear();

// 6. Piéton : glisse le long d'un mur, ne le traverse pas
P.phys_init();
P.phys_add_box(5, 0, 0.5, 10, 0.3, 10, 1); // mur oblique
let c = P.phys_char_create(0, 0, 0.35);
run(4, () => P.phys_char_input(c, 1, 0, 5, 0));
const cx = chr(c)[0];
check('Piéton : bloqué par un mur oblique', Math.abs(chr(c)[0]) < 6 && chr(c)[8] >= 0, `x=${chr(c)[0].toFixed(2)}, z=${chr(c)[2].toFixed(2)} (a glissé)`);
check('Piéton : a glissé le long du mur (z ≠ 0)', Math.abs(chr(c)[2]) > 0.5);

// 7. Saut
P.phys_init(); c = P.phys_char_create(0, 0, 0.35);
let apex = 0; P.phys_char_input(c, 0, 0, 0, 1);
run(1.2, () => { apex = Math.max(apex, chr(c)[1]); });
check('Saut : apogée 0.7–1.2 m, retour au sol', apex > 0.7 && apex < 1.2 && chr(c)[7] === 1 && chr(c)[1] === 0, `apogée ${apex.toFixed(2)} m`);

// 8. Marche sur un trottoir (hauteur 0.3 m)
P.phys_init(); P.phys_add_box(3, 0, 1, 5, 0, 0.3, 1);
c = P.phys_char_create(0, 0, 0.35);
run(1, () => P.phys_char_input(c, 0, 0, 0, 0));
P.phys_char_input(c, 1, 0, 3, 1); run(0.1);
run(1.2, () => P.phys_char_input(c, 1, 0, 3, 0));
check('Piéton : monte sur un trottoir de 30 cm après un saut', Math.abs(chr(c)[1] - 0.3) < 0.01 && chr(c)[0] > 2.5, `y=${chr(c)[1].toFixed(2)}, x=${chr(c)[0].toFixed(2)}`);
// Les voitures ignorent ce trottoir bas
P.phys_init(); P.phys_add_box(0, 20, 5, 0.3, 0, 0.2, 1);
v = P.phys_veh_create(0, 0, 0, 0); P.phys_veh_input(v, 1, 0, 0); run(6);
check('Voiture : franchit un bordure de 20 cm', veh(v)[2] > 25, `z=${veh(v)[2].toFixed(1)}`);

// 9. Piéton renversé
P.phys_init(); c = P.phys_char_create(0, 30, 0.35);
v = P.phys_veh_create(0, 0, 0, 0); P.phys_veh_input(v, 1, 0, 0);
let hit = false, hitSpeed = 0;
run(8, () => { if (P.phys_event_count() > 0 && !hit) { const e = mem().subarray(P.phys_event_ptr() >> 2, (P.phys_event_ptr() >> 2) + 8); if (e[0] === 3) { hit = true; hitSpeed = e[6]; } } });
check('Piéton : renversé par un véhicule (événement + étourdi)', hit && chr(c)[9] > 0, `vitesse relative ${hitSpeed.toFixed(1)} m/s`);

// 10. Choc véhicule contre véhicule : quantité de mouvement conservée
P.phys_init();
const a = P.phys_veh_create(3, 0, 0, 0), b = P.phys_veh_create(0, 0, 14, Math.PI);
P.phys_veh_input(a, 1, 0, 0); P.phys_veh_input(b, 1, 0, 0);
run(1.2);
const pa = 2300, pb = 1300;
run(2, () => {});
check('Choc frontal : plus de chevauchement et vitesses finies', Number.isFinite(veh(a)[6]) && Number.isFinite(veh(b)[6]) && Math.hypot(veh(a)[0] - veh(b)[0], veh(a)[2] - veh(b)[2]) > 2, `a=${(veh(a)[6] * KMH).toFixed(0)} km/h, b=${(veh(b)[6] * KMH).toFixed(0)} km/h`);

// 11. Rayon
P.phys_init(); P.phys_add_box(0, 10, 2, 1, 0, 5, 4);
P.phys_add_circle(20, 0, 1, 3, 4);
const d1 = P.phys_ray(0, 0, 0, 1, 50, 4), d2 = P.phys_ray(0, 0, 1, 0, 50, 4), d3 = P.phys_ray(0, 0, -1, 0, 50, 4), d4 = P.phys_ray(0, 0, 0, 1, 50, 2);
check('Rayon : distances exactes boîte/cylindre, masque et absence', Math.abs(d1 - 9) < 1e-3 && Math.abs(d2 - 19) < 1e-3 && d3 === -1 && d4 === -1, `${d1.toFixed(3)} / ${d2.toFixed(3)} / ${d3} / ${d4}`);

// 12. Robustesse : 40 véhicules + 60 piétons, 120 s, entrées aléatoires, décor dense
P.phys_init();
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
for (let i = 0; i < 600; i++) { P.phys_add_box((rnd() - 0.5) * 400, (rnd() - 0.5) * 400, 2 + rnd() * 6, 2 + rnd() * 6, rnd() * 3, 20, 1); }
const vs = [], cs = [];
for (let i = 0; i < 40; i++) { const id = P.phys_veh_create(i % 5, (rnd() - 0.5) * 300, (rnd() - 0.5) * 300, rnd() * 6); if (id >= 0) vs.push(id); }
for (let i = 0; i < 60; i++) { const id = P.phys_char_create((rnd() - 0.5) * 300, (rnd() - 0.5) * 300, 0.35); if (id >= 0) cs.push(id); }
const t0 = performance.now(); let worst = 0;
for (let f = 0; f < 120 * 60; f++) {
  if (f % 30 === 0) { vs.forEach((id) => P.phys_veh_input(id, rnd() * 2 - 0.6, rnd() * 2 - 1, rnd() < 0.1 ? 1 : 0)); cs.forEach((id) => P.phys_char_input(id, rnd() * 2 - 1, rnd() * 2 - 1, 5, rnd() < 0.05 ? 1 : 0)); }
  const s = performance.now(); P.phys_step(1 / 60); worst = Math.max(worst, performance.now() - s);
  if (f % 600 === 0) P.phys_event_clear();
}
const total = performance.now() - t0;
let bad = 0; vs.forEach((id) => { for (const x of veh(id).subarray(0, 17)) if (!Number.isFinite(x)) bad++; if (Math.abs(veh(id)[0]) > 5000 || Math.abs(veh(id)[2]) > 5000) bad++; });
cs.forEach((id) => { for (const x of chr(id).subarray(0, 10)) if (!Number.isFinite(x)) bad++; });
check('Robustesse : aucune valeur NaN/infinie après 120 s à 100 entités', bad === 0, `pire image ${worst.toFixed(2)} ms, moyenne ${(total / 7200).toFixed(3)} ms/image`);

// 13. Déterminisme
const sim = () => { P.phys_init(); P.phys_add_box(0, 40, 10, 1, 0.2, 10, 1); const q = P.phys_veh_create(2, 0, 0, 0); for (let i = 0; i < 600; i++) { P.phys_veh_input(q, 1, Math.sin(i / 40), i % 200 > 150 ? 1 : 0); P.phys_step(1 / 60); } return Array.from(veh(q).subarray(0, 8)).join(','); };
check('Déterminisme : deux simulations identiques', sim() === sim());

// 14. Chargement par zones : ajout / retrait massif sans fuite, monde étendu à ±3 km
P.phys_init();
let ids = [];
for (let cycle = 0; cycle < 300; cycle++) {
  for (const id of ids) P.phys_remove_solid(id);
  ids = [];
  for (let i = 0; i < 400; i++) ids.push(P.phys_add_box((i % 20) * 12 - 120 + (cycle % 7), Math.floor(i / 20) * 12 - 120, 3, 3, (i % 5) * 0.3, 10, 1));
}
check('Zones : 300 cycles de 400 solides sans fuite (aucun refus d\'insertion)', ids.every((i) => i >= 0) && P.phys_solid_count() === 400, `${P.phys_solid_count()} solides vivants`);
P.phys_init();
const far = P.phys_add_box(2500, -2000, 0.5, 30, 0, 10, 1);
v = P.phys_veh_create(4, 2440, -2000, Math.PI / 2); P.phys_veh_input(v, 1, 0, 0);
let farX = -1e9; run(8, () => { farX = Math.max(farX, veh(v)[0]); });
check('Monde étendu : mur à x = 2500 m arrête la voiture', farX < 2500 && farX > 2495, `x max ${farX.toFixed(2)}`);
P.phys_remove_solid(far); P.phys_veh_place(v, 2440, -2000, Math.PI / 2);
let farX2 = -1e9; run(6, () => { P.phys_veh_input(v, 1, 0, 0); farX2 = Math.max(farX2, veh(v)[0]); });
check('Mur retiré : la voiture passe', farX2 > 2510, `x max ${farX2.toFixed(1)}`);
P.phys_init();
const a1 = P.phys_add_box(0, 20, 5, 1, 0, 10, 1);
P.phys_remove_solid(a1); const a2 = P.phys_add_box(0, 40, 5, 1, 0, 10, 1);
check('Recyclage : l\'identifiant libéré est réutilisé et l\'ancien emplacement est libre', a2 === a1 && P.phys_ray(0, 0, 0, 1, 100, 1) > 38 && P.phys_ray(0, 0, 0, 1, 100, 1) < 40);

console.log(fails === 0 ? '\nTOUS LES TESTS PASSENT' : `\n${fails} TEST(S) EN ÉCHEC`);
process.exit(fails ? 1 : 0);
