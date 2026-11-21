import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type * as THREE from 'three';
import { avatarPath } from './avatars';

/** Lit le bloc JSON d'un GLB (en-tête 12 octets, puis chunk JSON). */
function readGlbJson(file: string) {
  const buf = readFileSync(file);
  assert.equal(buf.toString('ascii', 0, 4), 'glTF');
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
}

test('chaque genre a son propre modèle', () => {
  assert.equal(avatarPath('homme'), 'models/avatar_homme.glb');
  assert.equal(avatarPath('femme'), 'models/avatar_femme.glb');
  assert.notEqual(avatarPath('homme'), avatarPath('femme'));
});

for (const gender of ['homme', 'femme'] as const) {
  test(`le GLB ${gender} respecte le cahier des charges`, () => {
    const j = readGlbJson(`public/${avatarPath(gender)}`);
    const acc = j.accessors;
    let tris = 0;
    for (const m of j.meshes) {
      for (const p of m.primitives) tris += acc[p.indices].count / 3;
    }
    assert.ok(tris <= 10000, `${tris} triangles (max 10 000)`);
    assert.ok(j.meshes.length <= 6, 'maillages regroupés');
    assert.deepEqual(
      j.materials.map((m: { name: string }) => m.name),
      ['peau', 'cheveux', 'haut', 'bas', 'chaussures', 'accessoires']
    );
    assert.equal(j.extensionsUsed, undefined, 'aucune extension de matériau coûteuse');
    assert.equal(j.skins.length, 1);
    const names = j.animations.map((a: { name: string }) => a.name);
    for (const n of ['Idle', 'Walk', 'Run', 'Jump']) assert.ok(names.includes(n), `animation ${n}`);
  });
}

test('les deux squelettes sont identiques (même code d\'animation)', () => {
  const bones = (g: 'homme' | 'femme') => {
    const j = readGlbJson(`public/${avatarPath(g)}`);
    return j.skins[0].joints.map((i: number) => j.nodes[i].name);
  };
  assert.deepEqual(bones('homme'), bones('femme'));
});

import { pickAvatarAnim, avatarTimeScale, avatarOutfitTint, AVATAR_RUN_SPEED } from './avatars';

test('animation choisie selon la vitesse et l\'état du joueur', () => {
  assert.equal(pickAvatarAnim(0, true, false), 'Idle');
  assert.equal(pickAvatarAnim(0.2, true, false), 'Idle');
  assert.equal(pickAvatarAnim(2, true, false), 'Walk');
  assert.equal(pickAvatarAnim(6.2, true, false), 'Walk');
  assert.equal(pickAvatarAnim(AVATAR_RUN_SPEED, true, false), 'Run');
  assert.equal(pickAvatarAnim(9, true, false), 'Run');
  assert.equal(pickAvatarAnim(5, false, false), 'Jump');
  assert.equal(pickAvatarAnim(9, true, true), 'Idle', 'renversé : pas de course');
});

test('cadence de lecture bornée (pas de moonwalk ni de clip emballé)', () => {
  assert.equal(avatarTimeScale('Idle', 0), 1);
  assert.equal(avatarTimeScale('Jump', 5), 1);
  assert.ok(avatarTimeScale('Walk', 0.4) >= 0.6);
  assert.ok(avatarTimeScale('Walk', 30) <= 1.6);
  assert.ok(avatarTimeScale('Run', 30) <= 1.5);
  assert.ok(avatarTimeScale('Walk', 5) > avatarTimeScale('Walk', 2));
});

test('teinte des tenues : standard = modèle d\'origine, les autres colorent haut et bas', () => {
  assert.equal(avatarOutfitTint('standard'), null);
  const t = avatarOutfitTint('wax_bazin');
  assert.ok(t && typeof t.shirt === 'number' && typeof t.pants === 'number');
});

import { parseGender } from '../core/profile';

test('parseGender : seules les deux valeurs valides passent (message réseau, ancienne sauvegarde)', () => {
  assert.equal(parseGender('homme'), 'homme');
  assert.equal(parseGender('femme'), 'femme');
  assert.equal(parseGender(undefined), undefined);
  assert.equal(parseGender(null), undefined);
  assert.equal(parseGender(''), undefined);
  assert.equal(parseGender('Homme'), undefined);
  assert.equal(parseGender('<script>'), undefined);
  assert.equal(parseGender(42), undefined);
});

import { computeActionPose } from './avatars';
import type { TimedBodyActionKind } from '../core/timedActions';

test('computeActionPose : toutes les actions corporelles retournent des poses valides et distinctes', () => {
  const kinds: TimedBodyActionKind[] = [
    'eat',
    'eat_held',
    'drink_held',
    'toilet',
    'loto',
    'yannis_academy',
    'shower',
    'repair_engine',
    'black_market',
    'vieux_sage',
    'sleep',
  ];

  for (const kind of kinds) {
    const pose0 = computeActionPose(kind, 0.2);
    const pose1 = computeActionPose(kind, 1.4);
    for (const val of Object.values(pose0)) {
      assert.ok(Number.isFinite(val), `${kind} doit produire uniquement des valeurs finies`);
    }
    assert.ok(Object.keys(pose1).length > 0);
  }

  const sleepPose = computeActionPose('sleep', 0.5);
  assert.ok(sleepPose.rootPitchX < -1.4, 'sleep couche le personnage à l’horizontale');
  assert.ok(sleepPose.rootOffsetY > 0.1, 'sleep ajuste la hauteur pour ne pas passer sous le sol');

  const toiletPose = computeActionPose('toilet', 0.5);
  assert.ok(toiletPose.hipOffsetY < -0.1, 'toilet abaisse les hanches');
  assert.ok(toiletPose.leftUpLegX < -0.8 && toiletPose.leftLegX > 1.0, 'toilet fléchit les genoux');

  const eatA = computeActionPose('eat', 0.1);
  const eatB = computeActionPose('eat', 0.45);
  assert.notEqual(eatA.rightForearmX, eatB.rightForearmX, 'eat anime l’avant-bras vers la bouche');

  const showerPose = computeActionPose('shower', 0.3);
  assert.ok(showerPose.leftArmX < -0.9 && showerPose.rightArmX < -0.9, 'shower lève les deux bras');
});


test("les os Mixamo sont retrouvés une fois le nom nettoyé par GLTFLoader (« : » retiré)", async () => {
  const THREE = await import('three');
  const { AvatarController } = await import('./avatars');
  const root = new THREE.Object3D();
  const names = ['Hips', 'Spine', 'RightArm', 'RightForeArm', 'RightHand'];
  let parent: THREE.Object3D = root;
  for (const n of names) {
    const bone = new THREE.Object3D();
    // GLTFLoader applique PropertyBinding.sanitizeNodeName : « mixamorig:RightHand » devient « mixamorigRightHand ».
    bone.name = THREE.PropertyBinding.sanitizeNodeName(`mixamorig:${n}`);
    parent.add(bone);
    parent = bone;
  }
  const ctl = new AvatarController(root, []);
  const hand = (ctl as unknown as { bones: { rightHand?: THREE.Object3D } }).bones.rightHand;
  assert.ok(hand, 'la main droite doit être trouvée (sinon l’objet reste aux pieds du joueur)');
  assert.equal(hand.name, 'mixamorigRightHand');
});
