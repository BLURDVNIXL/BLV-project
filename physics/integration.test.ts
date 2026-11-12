// Test d'intégration : passerelle TS + décor d'Abidjan + IA du trafic. Lancer : npm run test:physics
import { readFileSync } from 'node:fs';
import { PhysicsCore, VehiclePreset, createVehicleState, createCharacterState, SolidFlag } from '../src/physics/PhysicsCore';
import { registerAbidjanWorld, playerVehiclePreset } from '../src/physics/abidjanWorld';
import { updateTraffic, TrafficCar } from '../src/physics/trafficAI';

let fails = 0;
const check = (name: string, ok: boolean, info = ''): void => { console.log(`${ok ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`); if (!ok) fails++; };
const physics = await PhysicsCore.fromBytes(readFileSync(new URL('../public/physics.wasm', import.meta.url)));
const run = (sec: number, fn?: (t: number) => void): void => { for (let i = 0; i < Math.round(sec * 60); i++) { fn?.(i / 60); physics.step(1 / 60); } };
const v = createVehicleState(); const c = createCharacterState();

// A. Traverser la lagune par le pont Général de Gaulle (x = 25), de la rive nord à la rive sud
physics.reset(); registerAbidjanWorld(physics, { homeType: 'studio' });
let car = physics.createVehicle(VehiclePreset.LAND_CRUISER, 25, -40, 0);
let maxOffDeck = 0; let maxZ = -1e9;
run(8, () => { physics.vehicleInput(car, 0.8, 0, false); physics.readVehicle(car, v); maxZ = Math.max(maxZ, v.z); if (Math.abs(v.z) < 10) maxOffDeck = Math.max(maxOffDeck, Math.abs(v.x - 25)); });
check('4x4 : traverse la lagune par le pont sans quitter le tablier (z > 40)', maxZ > 40 && maxOffDeck < 2.2, `z max ${maxZ.toFixed(1)}, écart max au centre du pont ${maxOffDeck.toFixed(2)} m`);

// B. Entre deux ponts : la lagune bloque
physics.reset(); registerAbidjanWorld(physics, { homeType: 'studio' });
car = physics.createVehicle(VehiclePreset.COUPE_GT, 12, -40, 0);
let gtMaxZ = -1e9;
run(10, () => { physics.vehicleInput(car, 1, 0, false); physics.readVehicle(car, v); gtMaxZ = Math.max(gtMaxZ, v.z); });
check('GT : arrêtée par la lagune hors pont (centre à z ≈ -12.3 au plus loin)', gtMaxZ < -11.5 && gtMaxZ > -13.5, `z max ${gtMaxZ.toFixed(2)}`);

// C. Piéton : ne marche pas dans la lagune ni dans une tour
physics.reset(); registerAbidjanWorld(physics, { homeType: 'studio' });
let ch = physics.createCharacter(12, -35);
run(8, () => physics.characterInput(ch, 0, 1, 5));
physics.readCharacter(ch, c);
check('Piéton : arrêté au bord de la lagune (z ≈ -10.4)', c.z < -9.5 && c.z > -11.5, `z=${c.z.toFixed(2)}`);
ch = physics.createCharacter(-30, -35);
run(6, () => physics.characterInput(ch, 0, -1, 5));
physics.readCharacter(ch, c);
check('Piéton : arrêté par une tour du Plateau', c.z > -50, `z=${c.z.toFixed(2)}`);

// D. Maison : le joueur ne traverse ni le mur arrière ni le lit
physics.reset(); registerAbidjanWorld(physics, { homeType: 'studio' });
ch = physics.createCharacter(0, -14);
run(5, () => physics.characterInput(ch, 0, -1, 5));
physics.readCharacter(ch, c);
check('Maison : mur arrière infranchissable', c.z > -18.4, `z=${c.z.toFixed(2)}`);
ch = physics.createCharacter(-4, -13.6);
run(4, () => physics.characterInput(ch, 0, -1, 5));
physics.readCharacter(ch, c);
check('Maison : le lit bloque le joueur', c.z > -16.2, `z=${c.z.toFixed(2)}`);

// E. Limites de la carte
physics.reset(); registerAbidjanWorld(physics, { homeType: 'studio' });
car = physics.createVehicle(VehiclePreset.WORO_WORO, 100, 60, Math.PI / 2);
run(12, () => physics.vehicleInput(car, 1, 0, false));
physics.readVehicle(car, v);
check('Wôrô-wôrô : retenue par le bord de la carte', v.x < 116, `x=${v.x.toFixed(1)}`);

// F. Trafic : 6 voitures sur 90 s, restent sur leur voie, sans NaN, sans rester bloquées
physics.reset(); registerAbidjanWorld(physics, { homeType: 'studio' });
const traffic: TrafficCar[] = [];
for (let t = 0; t < 6; t++) {
  const gb = t % 2 === 0; const dir = gb ? 1 : -1; const laneZ = -28 + (gb ? 1.6 : -1.6);
  const id = physics.createVehicle(gb ? VehiclePreset.GBAKA : VehiclePreset.WORO_WORO, -100 + t * 38, laneZ, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  traffic.push({ vehId: id, laneZ, dir: dir as 1 | -1, targetSpeed: 12 + (t % 3) * 3, stuckTimer: 0 });
}
let maxOff = 0; let minAvg = 1e9; let sumSpeed = 0; let samples = 0; let nan = 0;
run(90, () => {
  updateTraffic(physics, traffic, 1 / 60);
  traffic.forEach((tc) => { physics.readVehicle(tc.vehId, v); if (!Number.isFinite(v.x + v.z + v.speed)) nan++; });
});
traffic.forEach((tc) => { physics.readVehicle(tc.vehId, v); maxOff = Math.max(maxOff, Math.abs(v.z - tc.laneZ)); sumSpeed += v.speed; samples++; });
check('Trafic : voitures sur leur voie, en mouvement, sans NaN', maxOff < 2.5 && sumSpeed / samples > 6 && nan === 0, `écart max ${maxOff.toFixed(2)} m, vitesse moy. ${(sumSpeed / samples * 3.6).toFixed(0)} km/h`);

// G. Caméra : un rayon vers la tour la plus proche touche un bâtiment, pas l'eau
physics.reset(); registerAbidjanWorld(physics, { homeType: 'studio' });
const dB = physics.ray(-30, -35, 0, -1, 40, SolidFlag.BUILDING);
const dW = physics.ray(40, -35, 0, 1, 40, SolidFlag.BUILDING);
check('Rayon caméra : tour touchée à 15 m, lagune ignorée', Math.abs(dB - 15) < 0.01 && dW === -1, `${dB.toFixed(2)} / ${dW}`);

// H. Préserver une vitesse à la reconstruction de scène
physics.reset(); const k = physics.createVehicle(VehiclePreset.WORO_WORO, 0, 0, 0);
physics.setVehicleVelocity(k, 0, 20, 0); run(0.5);
physics.readVehicle(k, v);
check('Reprise de vitesse après reconstruction de scène', v.forwardSpeed > 15, `${(v.forwardSpeed * 3.6).toFixed(0)} km/h`);
void playerVehiclePreset;

console.log(fails === 0 ? '\nINTÉGRATION OK' : `\n${fails} ÉCHEC(S)`);
process.exit(fails ? 1 : 0);
