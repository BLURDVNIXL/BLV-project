import * as THREE from 'three';
import type { AmbientSample } from './ambiance';
import { ATLAS_COLS, ATLAS_ROWS, sunRaysStrength, type AtlasPick, type CelestialState } from './celestial';

/**
 * BLV — Dôme de ciel : dégradé zénith → horizon, brume chaude à l'horizon, halo et disque solaire.
 *
 * - L'horizon du dôme a exactement la couleur du brouillard : la ville se fond dans le ciel sans couture.
 * - Le dôme est plaqué au plan lointain (z = w) et ne touche jamais au tampon de profondeur.
 * - Sortie en espace de couleur du moteur (colorspace_fragment), sans tonemapping : même rendu que
 *   la couleur de fond et le brouillard classiques.
 * - Désactivé sur rendu logiciel (le fond uni reste utilisé).
 * - Soleil et lune : deux grands carrés texturés (planches `public/sky/*.webp`), dessinés au plan lointain comme le dôme.
 *   Les bâtiments les cachent (test de profondeur) ; tant qu'une planche n'est pas chargée, le disque du shader reste.
 */

export interface SkyDome {
  mesh: THREE.Mesh;
  apply: (sample: AmbientSample, sunDir: THREE.Vector3, overrides?: { zenith?: THREE.Color; horizon?: THREE.Color; glowScale?: number }) => void;
  /** Couleur de l'horizon (brume) pour la direction regardée : doit rester égale à celle du brouillard. */
  setHorizon: (color: THREE.Color) => void;
  followCamera: (camera: THREE.Camera, timeSec?: number) => void;
  /** Place, choisit l'image et règle l'opacité du soleil et de la lune (appelé à chaque mise à jour de l'heure). */
  setCelestial: (state: CelestialState) => void;
  dispose: () => void;
}

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uGlow;
uniform float uDisc;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);

  // Dégradé : transition rapide près de l'horizon, zénith profond au-dessus
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.5));

  // Bande de brume chaude collée à l'horizon (poussière, humidité de la lagune)
  float haze = exp(-h * 9.0);
  col = mix(col, uHorizon, haze * 0.55);

  // Halo large + disque solaire
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  float halo = pow(sd, 5.0) * 0.30 + pow(sd, 32.0) * 0.35;
  float disc = smoothstep(0.9985, 0.9995, sd);
  col += uSunColor * (halo + disc * 1.4 * uDisc) * uGlow;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

const BODY_VERT = /* glsl */ `
uniform vec3 uCenter;
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 wp = uCenter + (right * position.x + up * position.y) * uSize;
  gl_Position = (projectionMatrix * viewMatrix * vec4(wp, 1.0)).xyww;
}
`;

const BODY_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec2 uCellA;
uniform vec2 uCellB;
uniform float uMix;
uniform float uOpacity;
uniform float uScale;
uniform float uGlow;
uniform vec3 uGlowColor;
varying vec2 vUv;

vec4 atlas(vec2 cell, vec2 p) {
  vec2 uv = vec2((cell.x + p.x) / ${ATLAS_COLS}.0, 1.0 - (cell.y + (1.0 - p.y)) / ${ATLAS_ROWS}.0);
  return texture2D(uMap, uv);
}

void main() {
  vec2 c = vUv - 0.5;
  vec2 p = c * uScale + 0.5;
  vec4 col = vec4(0.0);
  if (uHasMap > 0.5 && p.x > 0.0 && p.x < 1.0 && p.y > 0.0 && p.y < 1.0) {
    vec4 a = atlas(uCellA, p);
    vec4 b = atlas(uCellB, p);
    float al = mix(a.a, b.a, uMix);
    col = vec4(mix(a.rgb * a.a, b.rgb * b.a, uMix) / max(al, 0.001), al);
  }
  // Aucun bord carré : tout ce qui sort du cercle inscrit dans la case est effacé
  col.a *= 1.0 - smoothstep(0.485, 0.5, length(p - 0.5));
  float r = length(c) * 2.0;
  float glow = uGlow * pow(max(1.0 - r, 0.0), 2.5);
  float outA = clamp(col.a + glow * (1.0 - col.a), 0.0, 1.0);
  vec3 outRgb = (col.rgb * col.a + uGlowColor * glow * (1.0 - col.a)) / max(outA, 0.001);
  gl_FragColor = vec4(outRgb, outA * uOpacity);
  #include <colorspace_fragment>
}
`;

const RAYS_FRAG = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float ang = atan(c.y, c.x);
  float t = uTime * 0.04;
  float big = pow(0.5 + 0.5 * sin(ang * 13.0 + t * 2.0 + sin(ang * 5.0 - t) * 1.6), 3.0);
  float fine = pow(0.5 + 0.5 * sin(ang * 33.0 - t * 3.0 + sin(ang * 9.0) * 2.2), 5.0);
  float k = clamp(big * 0.75 + fine * 0.45, 0.0, 1.0);
  float fall = pow(max(1.0 - r, 0.0), 2.2);
  gl_FragColor = vec4(uColor, k * fall * uOpacity);
  #include <colorspace_fragment>
}
`;

interface Body {
  mesh: THREE.Mesh;
  uniforms: {
    uMap: { value: THREE.Texture | null };
    uHasMap: { value: number };
    uCenter: { value: THREE.Vector3 };
    uSize: { value: number };
    uCellA: { value: THREE.Vector2 };
    uCellB: { value: THREE.Vector2 };
    uMix: { value: number };
    uOpacity: { value: number };
    uScale: { value: number };
    uGlow: { value: number };
    uGlowColor: { value: THREE.Color };
  };
  dir: THREE.Vector3;
}

/** Carré texturé au plan lointain. `angleDeg` : largeur apparente de la zone dessinée ; `scale` > 1 laisse une marge pour la lueur. */
function createBody(radius: number, angleDeg: number, scale: number, glow: number, glowColor: number, order: number): Body {
  const uniforms = {
    uMap: { value: null as THREE.Texture | null },
    uHasMap: { value: 0 },
    uCenter: { value: new THREE.Vector3() },
    uSize: { value: 2 * radius * Math.tan(THREE.MathUtils.degToRad((angleDeg * scale) / 2)) },
    uCellA: { value: new THREE.Vector2() },
    uCellB: { value: new THREE.Vector2() },
    uMix: { value: 0 },
    uOpacity: { value: 0 },
    uScale: { value: scale },
    uGlow: { value: glow },
    uGlowColor: { value: new THREE.Color(glowColor) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: BODY_VERT,
    fragmentShader: BODY_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = order;
  mesh.visible = false;
  return { mesh, uniforms, dir: new THREE.Vector3(0, 1, 0) };
}

const setCell = (v: THREE.Vector2, i: number) => v.set(i % ATLAS_COLS, Math.floor(i / ATLAS_COLS));
function setPick(body: Body, pick: AtlasPick): void {
  setCell(body.uniforms.uCellA.value, pick.a);
  setCell(body.uniforms.uCellB.value, pick.b);
  body.uniforms.uMix.value = pick.mix;
}

/** Grand carré de rayons de soleil simulés (aucune texture), mélangé en additif. */
function createRays(radius: number, angleDeg: number, order: number) {
  const uniforms = {
    uCenter: { value: new THREE.Vector3() },
    uSize: { value: 2 * radius * Math.tan(THREE.MathUtils.degToRad(angleDeg / 2)) },
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color(0xffd9a3) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: BODY_VERT,
    fragmentShader: RAYS_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = order;
  mesh.visible = false;
  return { mesh, uniforms, dir: new THREE.Vector3(0, 1, 0) };
}

/** `assetBase` : préfixe des fichiers publics (`import.meta.env.BASE_URL`). */
export function createSkyDome(radius: number, assetBase = '/'): SkyDome {
  const uniforms = {
    uZenith: { value: new THREE.Color(0x2f9fe6) },
    uHorizon: { value: new THREE.Color(0xbfe7f7) },
    uSunColor: { value: new THREE.Color(0xfff6dc) },
    uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
    uGlow: { value: 0.35 },
    uDisc: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  });
  const geometry = new THREE.SphereGeometry(1, 24, 16);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(radius);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;

  // Soleil (≈ 10° de large, sans lueur ajoutée : le halo du dôme s'en charge) et lune (≈ 6,5° avec une lueur froide)
  const sun = createBody(radius, 10, 2.2, 0.45, 0xffb066, -900);
  const moon = createBody(radius, 6.5, 2, 0.5, 0xa5c8ff, -899);
  const rays = createRays(radius, 70, -898);
  mesh.add(sun.mesh, moon.mesh, rays.mesh);

  const loader = new THREE.TextureLoader();
  const loadAtlas = (name: string, body: Body, onReady?: () => void) => {
    loader.load(
      `${assetBase}sky/${name}`,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        body.uniforms.uMap.value = tex;
        body.uniforms.uHasMap.value = 1;
        onReady?.();
      },
      undefined,
      () => {
        /* planche absente : le ciel garde son disque et son halo d'origine */
      }
    );
  };
  // Le disque dessiné par le shader disparaît dès que la vraie image du soleil est là
  loadAtlas('sun_atlas.webp', sun, () => {
    uniforms.uDisc.value = 0;
  });
  loadAtlas('moon_atlas.webp', moon);

  return {
    mesh,
    apply(sample, sunDir, overrides) {
      uniforms.uZenith.value.copy(overrides?.zenith ?? sample.zenith);
      uniforms.uHorizon.value.copy(overrides?.horizon ?? sample.horizon);
      uniforms.uSunColor.value.copy(sample.sunColor);
      uniforms.uSunDir.value.copy(sunDir);
      uniforms.uGlow.value = sample.skyGlow * (overrides?.glowScale ?? 1);
      // Lueur du soleil : couleur de la lumière, plus forte au lever et au coucher
      sun.uniforms.uGlowColor.value.copy(sample.sunColor);
      sun.uniforms.uGlow.value = THREE.MathUtils.clamp(0.2 + 0.3 * sample.skyGlow, 0.2, 0.6) * (overrides?.glowScale ?? 1);
      rays.uniforms.uColor.value.copy(sample.sunColor);
    },
    setCelestial(state) {
      sun.dir.copy(state.sunDir);
      moon.dir.copy(state.moonDir);
      setPick(sun, state.sun);
      setPick(moon, state.moon);
      sun.uniforms.uOpacity.value = state.sunAlpha;
      moon.uniforms.uOpacity.value = state.moonAlpha;
      sun.mesh.visible = sun.uniforms.uHasMap.value > 0.5 && state.sunAlpha > 0.003;
      rays.dir.copy(state.sunDir);
      rays.uniforms.uOpacity.value = state.sunAlpha * sunRaysStrength(state.sunDir.y);
      rays.mesh.visible = rays.uniforms.uOpacity.value > 0.004;
      moon.mesh.visible = moon.uniforms.uHasMap.value > 0.5 && state.moonAlpha > 0.003;
      // Le halo du dôme se centre sur l'astre dessiné (soleil le jour, lune la nuit)
      uniforms.uSunDir.value.copy(sun.dir).lerp(moon.dir, state.moonMix).normalize();
    },
    setHorizon(color) {
      uniforms.uHorizon.value.copy(color);
    },
    followCamera(camera, timeSec = 0) {
      mesh.position.copy(camera.position);
      rays.uniforms.uCenter.value.copy(camera.position).addScaledVector(rays.dir, radius);
      rays.uniforms.uTime.value = timeSec;
      sun.uniforms.uCenter.value.copy(camera.position).addScaledVector(sun.dir, radius);
      moon.uniforms.uCenter.value.copy(camera.position).addScaledVector(moon.dir, radius);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      rays.mesh.geometry.dispose();
      (rays.mesh.material as THREE.Material).dispose();
      for (const b of [sun, moon]) {
        b.uniforms.uMap.value?.dispose();
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
      }
    },
  };
}
