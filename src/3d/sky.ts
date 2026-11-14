import * as THREE from 'three';
import type { AmbientSample } from './ambiance';

/**
 * BLV — Dôme de ciel : dégradé zénith → horizon, brume chaude à l'horizon, halo et disque solaire.
 *
 * - L'horizon du dôme a exactement la couleur du brouillard : la ville se fond dans le ciel sans couture.
 * - Le dôme est plaqué au plan lointain (z = w) et ne touche jamais au tampon de profondeur.
 * - Sortie en espace de couleur du moteur (colorspace_fragment), sans tonemapping : même rendu que
 *   la couleur de fond et le brouillard classiques.
 * - Désactivé sur rendu logiciel (le fond uni reste utilisé).
 */

export interface SkyDome {
  mesh: THREE.Mesh;
  apply: (sample: AmbientSample, sunDir: THREE.Vector3, overrides?: { zenith?: THREE.Color; horizon?: THREE.Color; glowScale?: number }) => void;
  followCamera: (camera: THREE.Camera) => void;
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
  col += uSunColor * (halo + disc * 1.4) * uGlow;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export function createSkyDome(radius: number): SkyDome {
  const uniforms = {
    uZenith: { value: new THREE.Color(0x2f9fe6) },
    uHorizon: { value: new THREE.Color(0xbfe7f7) },
    uSunColor: { value: new THREE.Color(0xfff6dc) },
    uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
    uGlow: { value: 0.35 },
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

  return {
    mesh,
    apply(sample, sunDir, overrides) {
      uniforms.uZenith.value.copy(overrides?.zenith ?? sample.zenith);
      uniforms.uHorizon.value.copy(overrides?.horizon ?? sample.horizon);
      uniforms.uSunColor.value.copy(sample.sunColor);
      uniforms.uSunDir.value.copy(sunDir);
      uniforms.uGlow.value = sample.skyGlow * (overrides?.glowScale ?? 1);
    },
    followCamera(camera) {
      mesh.position.copy(camera.position);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
