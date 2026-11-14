import * as THREE from 'three';

/**
 * BLV — Procedural PBR Textures, Lighting Moods & Water Shaders
 * Generates tileable CanvasTextures once and caches shared Materials
 * to keep draw calls & memory low while giving Abidjan rich tactile surfaces.
 */

export type LightingMood = 'day' | 'sunset' | 'night';

export interface LightingMoodConfig {
  mood: LightingMood;
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  exposure: number;
  emissiveIntensity: number;
}

export const LIGHTING_MOODS: Record<LightingMood, LightingMoodConfig> = {
  day: {
    mood: 'day',
    skyHex: 0x67c8f7,
    fogHex: 0x87d7fb,
    fogDensity: 0.0014,
    sunColor: 0xfff8dc,
    sunIntensity: 1.65,
    hemiSky: 0xbae6fd,
    hemiGround: 0x7c5338,
    hemiIntensity: 0.78,
    exposure: 1.08,
    emissiveIntensity: 0.1,
  },
  sunset: {
    mood: 'sunset',
    skyHex: 0xeb7838,
    fogHex: 0xf49456,
    fogDensity: 0.0018,
    sunColor: 0xffa04a,
    sunIntensity: 1.45,
    hemiSky: 0xfdba74,
    hemiGround: 0x451a03,
    hemiIntensity: 0.72,
    exposure: 1.05,
    emissiveIntensity: 0.65,
  },
  night: {
    mood: 'night',
    skyHex: 0x070d1b,
    fogHex: 0x0b152b,
    fogDensity: 0.0022,
    sunColor: 0x93c5fd,
    sunIntensity: 0.42,
    hemiSky: 0x1e3a5f,
    hemiGround: 0x0f172a,
    hemiIntensity: 0.48,
    exposure: 0.96,
    emissiveIntensity: 1.0,
  },
};

export function getLightingMood(gameTimeHours: number): LightingMood {
  if (gameTimeHours < 6 || gameTimeHours >= 19) return 'night';
  if (gameTimeHours >= 17 && gameTimeHours < 19) return 'sunset';
  return 'day';
}

const textureCache = new Map<string, THREE.CanvasTexture>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function getAsphaltTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const key = 'asphalt';
  if (textureCache.has(key)) return textureCache.get(key)!;
  const [canvas, ctx] = makeCanvas(256, 256);

  ctx.fillStyle = '#3d3b3f';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1800; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const v = 32 + ((i * 29) % 28);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = '#e2e8f0';
  for (let y = 12; y < 256; y += 64) {
    ctx.fillRect(124, y, 8, 36);
  }
  ctx.fillStyle = '#eab308';
  ctx.fillRect(8, 0, 4, 256);
  ctx.fillRect(244, 0, 4, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  textureCache.set(key, tex);
  return tex;
}

export function getLateriteTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const key = 'laterite';
  if (textureCache.has(key)) return textureCache.get(key)!;
  const [canvas, ctx] = makeCanvas(256, 256);

  ctx.fillStyle = '#9a4326';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const x = (i * 97) % 256;
    const y = (i * 53) % 256;
    const r = 135 + ((i * 19) % 45);
    const g = 55 + ((i * 13) % 25);
    const b = 30 + ((i * 7) % 18);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAnisotropy;
  textureCache.set(key, tex);
  return tex;
}

export function getGlassCurtainTexture(tintHex = '#1e3a5f'): THREE.CanvasTexture {
  const key = `glass_${tintHex}`;
  if (textureCache.has(key)) return textureCache.get(key)!;
  const [canvas, ctx] = makeCanvas(256, 256);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 256);

  const cols = 8;
  const rows = 8;
  const cw = 256 / cols;
  const ch = 256 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = (r * 7 + c * 11) % 5 === 0;
      ctx.fillStyle = lit ? '#fef08a' : tintHex;
      ctx.fillRect(c * cw + 3, r * ch + 4, cw - 6, ch - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(c * cw + 4, r * ch + 5, cw - 10, 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, tex);
  return tex;
}

export function getWaxFabricTexture(primary = '#d97706', accent = '#16a34a'): THREE.CanvasTexture {
  const key = `wax_${primary}_${accent}`;
  if (textureCache.has(key)) return textureCache.get(key)!;
  const [canvas, ctx] = makeCanvas(128, 128);

  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  for (let i = 0; i < 128; i += 32) {
    ctx.beginPath();
    ctx.arc(i + 16, 32, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(i + 16, 96, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#fef3c7';
  for (let y = 0; y < 128; y += 32) {
    for (let x = 0; x < 128; x += 32) {
      ctx.fillRect(x + 13, y + 13, 6, 6);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, tex);
  return tex;
}

export function getSurfaceBumpTexture(): THREE.CanvasTexture {
  const key = 'bump_grain';
  if (textureCache.has(key)) return textureCache.get(key)!;
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const x = (i * 43) % 128;
    const y = (i * 71) % 128;
    const g = 90 + ((i * 17) % 85);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, tex);
  return tex;
}

export function getWaterNormalTexture(): THREE.CanvasTexture {
  const key = 'water_bump';
  if (textureCache.has(key)) return textureCache.get(key)!;
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 8) {
    ctx.fillStyle = y % 16 === 0 ? '#a8a8a8' : '#646464';
    for (let x = 0; x < 256; x += 24) {
      ctx.fillRect((x + y) % 256, y, 16, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  textureCache.set(key, tex);
  return tex;
}

export interface AnimatedWaterHandle {
  material: THREE.MeshStandardMaterial;
  updateTime: (timeSec: number) => void;
  /**
   * Ambiance de l'eau : direction et couleur du soleil, couleur de l'horizon (reflet de Fresnel),
   * et force du scintillement (0 la nuit). Sans effet sur rendu logiciel.
   */
  setAmbient: (sunDir: THREE.Vector3, sunColor: THREE.Color, horizon: THREE.Color, glint: number) => void;
}

/**
 * Lagune Ébrié & Flood water shader with subtle wave shimmer via onBeforeCompile
 * (falls back gracefully to UV scroll on software GL).
 */
export function createAnimatedWaterMaterial(
  colorHex = 0x0b6b86,
  opacity = 0.88,
  isSoftwareGl = false
): AnimatedWaterHandle {
  const waterTex = getWaterNormalTexture();
  const timeUniform = { value: 0 };
  const sunDirUniform = { value: new THREE.Vector3(0.5, 0.8, 0.3) };
  const sunColorUniform = { value: new THREE.Color(0xfff6dc) };
  const horizonUniform = { value: new THREE.Color(0xbfe7f7) };
  const glintUniform = { value: 1 };

  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.18,
    metalness: 0.22,
    transparent: opacity < 1,
    opacity,
    bumpMap: waterTex,
    bumpScale: 0.12,
  });

  if (!isSoftwareGl) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWaterTime = timeUniform;
      shader.uniforms.uSunDir = sunDirUniform;
      shader.uniforms.uSunColor = sunColorUniform;
      shader.uniforms.uHorizon = horizonUniform;
      shader.uniforms.uGlint = glintUniform;

      shader.vertexShader = `uniform float uWaterTime;\nvarying vec3 vWaterWorld;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed.z += sin(position.x * 0.08 + uWaterTime * 1.4) * 0.08 + cos(position.y * 0.09 + uWaterTime * 1.1) * 0.06;
         vWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );

      shader.fragmentShader =
        `uniform float uWaterTime;
         uniform vec3 uSunDir;
         uniform vec3 uSunColor;
         uniform vec3 uHorizon;
         uniform float uGlint;
         varying vec3 vWaterWorld;\n` + shader.fragmentShader;
      // Reflet de Fresnel vers la couleur de l'horizon + scintillement du soleil sur les vaguelettes.
      // Les vaguelettes sont calculées en espace monde (deux fréquences) : aucune texture supplémentaire.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `{
           vec3 V = normalize(cameraPosition - vWaterWorld);
           vec2 p = vWaterWorld.xz;
           float t = uWaterTime;
           vec3 n = normalize(vec3(
             sin(p.x * 0.55 + t * 1.3) * 0.11 + sin(p.y * 1.7 - t * 1.9) * 0.07,
             1.0,
             cos(p.y * 0.48 + t * 1.1) * 0.11 + cos(p.x * 1.9 + t * 1.6) * 0.07));
           float fres = pow(1.0 - clamp(dot(V, vec3(0.0, 1.0, 0.0)), 0.0, 1.0), 3.0);
           outgoingLight = mix(outgoingLight, uHorizon, fres * 0.5);
           vec3 R = reflect(-V, n);
           float glint = pow(max(dot(R, normalize(uSunDir)), 0.0), 140.0);
           outgoingLight += uSunColor * glint * 1.6 * uGlint;
         }
         #include <opaque_fragment>`
      );
    };
  }

  return {
    material,
    updateTime: (timeSec: number) => {
      timeUniform.value = timeSec;
      waterTex.offset.x = (timeSec * 0.015) % 1;
      waterTex.offset.y = (timeSec * 0.01) % 1;
    },
    setAmbient: (sunDir, sunColor, horizon, glint) => {
      sunDirUniform.value.copy(sunDir);
      sunColorUniform.value.copy(sunColor);
      horizonUniform.value.copy(horizon);
      glintUniform.value = glint;
      // La nuit (ou sous la pluie), l'eau ne reflète plus l'environnement lumineux de studio : fini la bande grise à l'horizon
      material.envMapIntensity = 0.2 + 0.8 * Math.min(1, glint);
      // Même logique pour la lune : une eau plus mate évite le gros reflet blanc quand on regarde vers elle
      material.roughness = 0.55 - 0.37 * Math.min(1, glint);
    },
  };
}

export function createContactShadow(radius = 0.8): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 18);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x05080f,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  return mesh;
}
