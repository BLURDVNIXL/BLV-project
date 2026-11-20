import * as THREE from 'three';

const materialCache = new Map<string, THREE.Material>();

export type BLVMaterialKind =
  | 'bark' | 'wood' | 'foliage' | 'petal' | 'stone' | 'terracotta'
  | 'ceramic' | 'metal' | 'glass' | 'water' | 'emissive' | 'fabric';

function tagKind<T extends THREE.Material>(mat: T, kind: BLVMaterialKind): T {
  mat.userData.kind = kind;
  return mat;
}
const textureCache = new Map<string, THREE.CanvasTexture>();

/** Contexte 2D factice : permet de générer les modèles (et les tests) hors navigateur. */
function createStubContext(): CanvasRenderingContext2D {
  const handler: ProxyHandler<object> = {
    get: (_t, prop) => (prop === 'canvas' ? undefined : () => undefined),
    set: () => true,
  };
  return new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
}

function createCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  if (typeof document === 'undefined') {
    const stub = { width: size, height: size } as unknown as HTMLCanvasElement;
    return [stub, createStubContext()];
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  isColor = true,
  baseHex = '#ffffff'
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.userData.baseHex = baseHex;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

export function getBarkTexture(variant: 'palm' | 'smooth' | 'baobab'): THREE.CanvasTexture {
  const key = `bark_${variant}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const [canvas, ctx] = createCanvas(256);
  if (variant === 'palm') {
    ctx.fillStyle = '#7e634b';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 18) {
      ctx.fillStyle = y % 36 === 0 ? 'rgba(56, 40, 28, 0.45)' : 'rgba(155, 128, 100, 0.25)';
      ctx.fillRect(0, y, 256, 6);
      ctx.fillStyle = 'rgba(42, 29, 20, 0.35)';
      ctx.fillRect(0, y + 6, 256, 2);
    }
  } else if (variant === 'baobab') {
    ctx.fillStyle = '#8b7667';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 65; i++) {
      const x = (i * 37) % 256;
      const y = (i * 53) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(62, 49, 41, 0.26)' : 'rgba(170, 152, 138, 0.22)';
      ctx.fillRect(x, y, 10 + (i % 14), 48 + (i % 30));
    }
  } else {
    ctx.fillStyle = '#6d503a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) {
      const x = (i * 29) % 256;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(42, 29, 19, 0.3)' : 'rgba(130, 100, 74, 0.2)';
      ctx.fillRect(x, 0, 4 + (i % 6), 256);
    }
  }

  const barkBase = variant === 'palm' ? '#7e634b' : variant === 'baobab' ? '#8b7667' : '#6d503a';
  const tex = finalizeTexture(canvas, 1, 2, true, barkBase);
  textureCache.set(key, tex);
  return tex;
}

export function getWoodSlatsTexture(tone: 'iroko' | 'teak' | 'bamboo'): THREE.CanvasTexture {
  const key = `wood_${tone}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const [canvas, ctx] = createCanvas(256);
  const base =
    tone === 'iroko' ? '#8c532b' : tone === 'teak' ? '#b0743f' : '#c6a265';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 50; i++) {
    const y = (i * 19) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(45, 22, 8, 0.16)' : 'rgba(235, 195, 145, 0.12)';
    ctx.fillRect(0, y, 256, 3 + (i % 4));
  }

  const tex = finalizeTexture(canvas, 1, 1, true, base);
  textureCache.set(key, tex);
  return tex;
}

export function getFoliageTexture(baseHex: string): THREE.CanvasTexture {
  const key = `foliage_${baseHex}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const [canvas, ctx] = createCanvas(256);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle stylized painterly organic patches
  for (let i = 0; i < 80; i++) {
    const x = (i * 41) % 256;
    const y = (i * 67) % 256;
    const r = 10 + (i % 18);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(12, 48, 18, 0.1)';
    ctx.fill();
  }

  const tex = finalizeTexture(canvas, 1, 1, true, baseHex);
  textureCache.set(key, tex);
  return tex;
}

export function getStoneTexture(baseHex: string, speckle = true): THREE.CanvasTexture {
  const key = `stone_${baseHex}_${speckle}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const [canvas, ctx] = createCanvas(256);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  if (speckle) {
    for (let i = 0; i < 180; i++) {
      const x = (i * 31) % 256;
      const y = (i * 73) % 256;
      const w = 3 + (i % 7);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.09)';
      ctx.fillRect(x, y, w, w);
    }
  }

  const tex = finalizeTexture(canvas, 1, 1, true, baseHex);
  textureCache.set(key, tex);
  return tex;
}

export function getCeramicBandTexture(baseHex: string, bandHex: string): THREE.CanvasTexture {
  const key = `ceramic_${baseHex}_${bandHex}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const [canvas, ctx] = createCanvas(256);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle horizontal geometric band (zero text/logos)
  ctx.fillStyle = bandHex;
  ctx.fillRect(0, 74, 256, 14);
  ctx.fillRect(0, 96, 256, 6);

  for (let x = 0; x < 256; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 88);
    ctx.lineTo(x + 12, 74);
    ctx.lineTo(x + 24, 88);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 245, 220, 0.25)';
    ctx.fill();
  }

  const tex = finalizeTexture(canvas, 1, 1, true, baseHex);
  textureCache.set(key, tex);
  return tex;
}

export function getWaterTexture(): THREE.CanvasTexture {
  const key = 'water_ripples';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const [canvas, ctx] = createCanvas(256);
  ctx.fillStyle = '#2da8c4';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    const cx = (i * 59) % 256;
    const cy = (i * 83) % 256;
    const r = 12 + (i % 24);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(220, 250, 255, 0.24)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const tex = finalizeTexture(canvas, 2, 2, true, '#2da8c4');
  textureCache.set(key, tex);
  return tex;
}

/**
 * Reusable PBR Material Pool for BLV (Babi Life Vibes)
 */
export const BLVMaterials = {
  bark(variant: 'palm' | 'smooth' | 'baobab' = 'smooth', tint = '#ffffff'): THREE.MeshStandardMaterial {
    const key = `bark_${variant}_${tint}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          map: getBarkTexture(variant),
          color: tint,
          roughness: 0.9,
          metalness: 0.0,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshStandardMaterial, 'bark');
  },

  wood(tone: 'iroko' | 'teak' | 'bamboo' = 'iroko', roughness = 0.68): THREE.MeshStandardMaterial {
    const key = `wood_${tone}_${roughness}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          map: getWoodSlatsTexture(tone),
          roughness,
          metalness: 0.04,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshStandardMaterial, 'wood');
  },

  foliage(hex: string, flatShading = true, doubleSided = false): THREE.MeshStandardMaterial {
    const key = `foliage_${hex}_${flatShading}_${doubleSided}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          map: getFoliageTexture(hex),
          roughness: 0.78,
          metalness: 0.0,
          flatShading,
          side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshStandardMaterial, 'foliage');
  },

  petal(hex: string, doubleSided = true): THREE.MeshStandardMaterial {
    const key = `petal_${hex}_${doubleSided}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          color: hex,
          roughness: 0.55,
          metalness: 0.0,
          side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshStandardMaterial, 'petal');
  },

  stone(hex: string, roughness = 0.86, flatShading = false): THREE.MeshStandardMaterial {
    const key = `stone_${hex}_${roughness}_${flatShading}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          map: getStoneTexture(hex),
          roughness,
          metalness: 0.02,
          flatShading,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshStandardMaterial, 'stone');
  },

  terracotta(hex = '#c4633e', bandHex?: string): THREE.MeshStandardMaterial {
    const key = `terracotta_${hex}_${bandHex ?? 'plain'}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          map: bandHex ? getCeramicBandTexture(hex, bandHex) : getStoneTexture(hex),
          roughness: bandHex ? 0.42 : 0.78,
          metalness: 0.02,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshStandardMaterial, 'terracotta');
  },

  ceramic(hex: string): THREE.MeshStandardMaterial {
    const key = `ceramic_${hex}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshPhysicalMaterial({
          color: hex,
          roughness: 0.22,
          metalness: 0.05,
          clearcoat: 0.75,
          clearcoatRoughness: 0.15,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshPhysicalMaterial, 'ceramic');
  },

  metal(hex = '#2a3038', metalness = 0.85, roughness = 0.32): THREE.MeshStandardMaterial {
    const key = `metal_${hex}_${metalness}_${roughness}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          color: hex,
          metalness,
          roughness,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshStandardMaterial, 'metal');
  },

  glass(hex = '#cfe8ef', opacity = 0.42): THREE.MeshPhysicalMaterial {
    const key = `glass_${hex}_${opacity}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshPhysicalMaterial({
          color: hex,
          roughness: 0.1,
          metalness: 0.05,
          clearcoat: 1.0,
          transparent: true,
          opacity,
          depthWrite: false,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshPhysicalMaterial, 'glass');
  },

  water(hex = '#35b4cf'): THREE.MeshPhysicalMaterial {
    const key = `water_${hex}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshPhysicalMaterial({
          map: getWaterTexture(),
          color: hex,
          roughness: 0.1,
          metalness: 0.05,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
          transparent: true,
          opacity: 0.85,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshPhysicalMaterial, 'water');
  },

  emissive(hex = '#ffcf70', intensity = 1.6): THREE.MeshStandardMaterial {
    const key = `emissive_${hex}_${intensity}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          color: hex,
          emissive: hex,
          emissiveIntensity: intensity,
          roughness: 0.25,
          metalness: 0.0,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshStandardMaterial, 'emissive');
  },

  fabric(hex: string): THREE.MeshStandardMaterial {
    const key = `fabric_${hex}`;
    if (!materialCache.has(key)) {
      materialCache.set(
        key,
        new THREE.MeshStandardMaterial({
          color: hex,
          roughness: 0.92,
          metalness: 0.0,
          side: THREE.DoubleSide,
        })
      );
    }
    return tagKind(materialCache.get(key) as THREE.MeshStandardMaterial, 'fabric');
  },
};
