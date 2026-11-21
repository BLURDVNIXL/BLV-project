/**
 * BLV — Icônes des objets du sac : capture automatique du modèle 3D (une fois par objet, mise en cache).
 * Les objets sont rendus dans un petit canvas hors écran, sans toucher à la scène du jeu. Tant que l'icône
 * n'existe pas (ou si la capture échoue : pas de WebGL, objet sans modèle), l'interface garde l'emoji.
 */

import * as THREE from 'three';
import { createHeldObject } from './studioObjects/heldObjects';

/** Côté de l'icône (px) : assez net pour une vignette de 40 à 56 px sur écran dense. */
export const ICON_SIZE = 112;
/** Part du côté occupée par l'objet (le reste est de la marge). */
export const ICON_FILL = 0.86;
/** Icônes capturées par image (limite l'à-coup quand un menu de 40 objets s'ouvre). */
const PER_TICK = 3;

/** Cadrage : centre de la boîte et rayon de la demi-vue orthographique qui contient l'objet en entier. */
export function iconFraming(box: THREE.Box3): { center: THREE.Vector3; halfView: number } {
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  return { center, halfView: Math.max(radius, 1e-3) / ICON_FILL };
}

const urls = new Map<string, string>();
const failed = new Set<string>();
const queue: string[] = [];
const listeners = new Set<() => void>();
let version = 0;
let scheduled = false;

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;

/** URL (data:) de l'icône si elle est prête, sinon null (l'appelant affiche l'emoji). */
export function getItemIconUrl(itemId: string): string | null {
  return urls.get(itemId) ?? null;
}

/** Version qui change à chaque nouvelle icône (pour `useSyncExternalStore`). */
export function itemIconsVersion(): number {
  return version;
}

export function subscribeItemIcons(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Demande la capture d'une icône (sans effet si elle existe, est déjà demandée, ou a échoué). */
export function requestItemIcon(itemId: string): void {
  if (typeof document === 'undefined') return;
  if (urls.has(itemId) || failed.has(itemId) || queue.includes(itemId)) return;
  queue.push(itemId);
  schedule();
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  setTimeout(processQueue, 30);
}

function ensureRenderer(): boolean {
  if (renderer) return true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = ICON_SIZE;
    canvas.height = ICON_SIZE;
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(ICON_SIZE, ICON_SIZE, false);
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8f80, 1.6));
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
    sun.position.set(-1.5, 2.5, 2);
    scene.add(sun);
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50);
    return true;
  } catch {
    renderer = null;
    return false;
  }
}

function disposeRenderer(): void {
  if (!renderer) return;
  renderer.dispose();
  renderer.forceContextLoss();
  renderer = null;
  scene = null;
  camera = null;
}

function capture(itemId: string): string | null {
  const held = createHeldObject(itemId);
  if (!held || !renderer || !scene || !camera) return null;
  const mesh = held.mesh;
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.setScalar(1);
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  if (box.isEmpty()) return null;
  const { center, halfView } = iconFraming(box);
  // Vue de trois quarts, un peu de dessus : l'objet reste lisible quelle que soit sa forme.
  camera.left = -halfView;
  camera.right = halfView;
  camera.top = halfView;
  camera.bottom = -halfView;
  camera.updateProjectionMatrix();
  camera.position.copy(center).add(new THREE.Vector3(0.55, 0.5, 0.9).normalize().multiplyScalar(halfView * 4));
  camera.lookAt(center);
  scene.add(mesh);
  renderer.render(scene, camera);
  scene.remove(mesh);
  return renderer.domElement.toDataURL('image/png');
}

function processQueue(): void {
  scheduled = false;
  if (queue.length === 0) {
    disposeRenderer();
    return;
  }
  if (!ensureRenderer()) {
    // Pas de WebGL : on abandonne ces icônes (les emojis restent)
    for (const id of queue.splice(0)) failed.add(id);
    return;
  }
  let done = 0;
  for (let n = 0; n < PER_TICK && queue.length > 0; n++) {
    const id = queue.shift() as string;
    let url: string | null = null;
    try {
      url = capture(id);
    } catch {
      url = null;
    }
    if (url) {
      urls.set(id, url);
      done++;
    } else {
      failed.add(id);
    }
  }
  if (done > 0) {
    version++;
    for (const l of listeners) l();
  }
  schedule();
}
