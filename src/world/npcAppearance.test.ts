import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILD_RANGE, COLLISION_RADIUS, HEIGHT_RANGE, NPC_AGE_GROUPS, NPC_HAIR_STYLES, NPC_ROLES, NPC_SKIN_TONES,
  ROLE_RULES, generateAppearance, type NpcAppearance, type NpcRole,
} from './npcAppearance';
import { DISTRICTS } from './abidjanGeography';

const N = 600;
const sample = (role: NpcRole, districtId?: string): NpcAppearance[] =>
  Array.from({ length: N }, (_, i) => generateAppearance(i * 7919 + 13, { role, districtId }));

test('même graine et même contexte = même PNJ', () => {
  for (const role of NPC_ROLES) {
    assert.deepEqual(generateAppearance(42, { role, districtId: 'adjame' }), generateAppearance(42, { role, districtId: 'adjame' }));
  }
  assert.notDeepEqual(generateAppearance(1, { role: 'passant' }), generateAppearance(2, { role: 'passant' }));
});

test('chaque valeur reste dans sa plage', () => {
  for (const role of NPC_ROLES) {
    for (const a of sample(role, DISTRICTS[role.length % DISTRICTS.length].id)) {
      const [h0, h1] = HEIGHT_RANGE[a.ageGroup];
      assert.ok(a.heightScale >= h0 && a.heightScale <= h1);
      for (const v of Object.values(a.build)) assert.ok(v >= BUILD_RANGE[0] && v <= BUILD_RANGE[1]);
      assert.equal(a.collisionRadius, COLLISION_RADIUS[a.ageGroup]);
      assert.ok(NPC_SKIN_TONES.includes(a.skinHex));
      assert.ok(NPC_HAIR_STYLES.includes(a.hair));
      assert.ok(a.accessories.length <= 2 && new Set(a.accessories).size === a.accessories.length);
      if (a.accessories.includes('canne')) assert.equal(a.ageGroup, 'aine');
      assert.equal(a.headwearHex !== null, ['foulard', 'casquette', 'bonnet'].includes(a.hair));
    }
  }
  assert.ok(COLLISION_RADIUS.enfant < COLLISION_RADIUS.adulte);
  assert.ok(HEIGHT_RANGE.enfant[1] < HEIGHT_RANGE.ado[0]);
});

test('chaque rôle respecte ses contraintes', () => {
  for (const role of NPC_ROLES) {
    const rule = ROLE_RULES[role];
    for (const a of sample(role, 'plateau')) {
      assert.ok(rule.ages.includes(a.ageGroup), `${role}: âge ${a.ageGroup}`);
      if (rule.top) assert.ok(rule.top.includes(a.top.id), `${role}: haut ${a.top.id}`);
      if (rule.bottom) assert.ok(rule.bottom.includes(a.bottom.id), `${role}: bas ${a.bottom.id}`);
      if (rule.shoes) assert.ok(rule.shoes.includes(a.shoes.id), `${role}: chaussures ${a.shoes.id}`);
      assert.ok(!rule.noHair?.includes(a.hair), `${role}: coiffure ${a.hair}`);
    }
  }
  assert.ok(sample('soignant').every((a) => a.top.id === 'blouse'));
  assert.ok(sample('eleve').every((a) => a.ageGroup === 'enfant' || a.ageGroup === 'ado'));
  // âge souhaité incompatible : le rôle gagne
  assert.notEqual(generateAppearance(5, { role: 'eleve', ageGroup: 'adulte' }).ageGroup, 'adulte');
  assert.equal(generateAppearance(5, { role: 'passant', ageGroup: 'enfant' }).ageGroup, 'enfant');
});

test('variété : tous les âges, coiffures et hauts libres apparaissent', () => {
  const all = sample('passant', 'adjame');
  for (const g of NPC_AGE_GROUPS) assert.ok(all.some((a) => a.ageGroup === g), g);
  for (const s of NPC_HAIR_STYLES) assert.ok(all.some((a) => a.hair === s), s);
  assert.ok(new Set(all.map((a) => a.top.id)).size >= 8);
  assert.ok(all.some((a) => a.top.patternId?.startsWith('wax_')));
});
