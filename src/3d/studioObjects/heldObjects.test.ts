import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_ITEMS } from '../../core/items';
import { createHeldObject, HOLD_SCALE, CONTAINER_SCALE } from './heldObjects';
import { MENU_RECIPES } from './menuRecipes';
import { assemble, MAX_DISH_TRIANGLES } from './assemble';

const tris = (g: { index: { count: number } | null }) => (g.index ? g.index.count / 3 : 0);

test('chaque objet du catalogue a un modèle 1 mesh / 1 matériau / couleurs de sommets, sous le plafond de triangles', () => {
  const materials = new Set<unknown>();
  for (const item of ALL_ITEMS) {
    const held = createHeldObject(item.id);
    assert.ok(held, `modèle introuvable pour ${item.id} (${JSON.stringify(item.model)})`);
    const g = held.mesh.geometry;
    const cap = item.category === 'plat' ? MAX_DISH_TRIANGLES : item.id === 'ananas' || item.id.startsWith('raisin') || item.id.startsWith('parapluie') ? 250 : 150;
    assert.ok(tris(g as never) > 0 && tris(g as never) <= cap, `${item.id} : ${tris(g as never)} triangles (max ${cap})`);
    assert.ok(g.getAttribute('position') && g.getAttribute('normal') && g.getAttribute('color'), `${item.id} : attributs`);
    assert.equal(g.getAttribute('uv'), undefined, `${item.id} : UV interdits`);
    assert.ok(Array.isArray(held.mesh.material) === false, `${item.id} : un seul matériau`);
    materials.add(held.mesh.material);
    assert.ok(held.hold.scale > 0);
  }
  assert.equal(materials.size, 1, 'matériau partagé : 1 seul pour tous les objets');
});

test('recettes du menu : composants connus, assemblage ≤ 800 triangles, déterministe', () => {
  for (const recipe of Object.values(MENU_RECIPES)) {
    const a = assemble(recipe);
    const b = assemble(recipe);
    assert.ok(tris(a as never) <= MAX_DISH_TRIANGLES, `${recipe.id} : ${tris(a as never)} triangles`);
    assert.deepEqual(Array.from(a.getAttribute('position').array), Array.from(b.getAttribute('position').array), `${recipe.id} non déterministe`);
  }
});

test('échelle des plats : taille réelle de base, contenants étroits légèrement agrandis', () => {
  assert.equal(HOLD_SCALE.plat, 1);
  for (const [name, k] of Object.entries(CONTAINER_SCALE)) assert.ok(k >= 1 && k <= 1.5, `${name} : ${k}`);
  const plate = createHeldObject('poulet_braise_demi')!;
  const pot = createHeldObject('kedjenou_poulet')!;
  assert.ok(plate.hold.scale >= 1, 'assiette : pas de réduction');
  assert.ok(pot.hold.scale > plate.hold.scale, 'pot de kédjénou agrandi par rapport à l’assiette');
});

test('canapés et mini-pâtisserie ont leurs propres composants (plus de substitut accras)', () => {
  for (const id of ['canapes_froids', 'canapes_chauds', 'mini_patisserie']) {
    assert.notEqual(MENU_RECIPES[id].proteine, 'accras', `${id} utilise encore le substitut`);
    assert.ok(createHeldObject(id), `${id} : pas de modèle`);
  }
  assert.notDeepEqual(MENU_RECIPES.canapes_chauds.couleurs, MENU_RECIPES.canapes_froids.couleurs);
});
