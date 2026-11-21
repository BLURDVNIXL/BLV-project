// BLV : copie du studio PNJ (BLV — Babi Life Vibes Asset Studio), utilisée par studioActorBuilder.ts. Ne pas modifier sans le studio.
import * as THREE from 'three';
import {
  FABRIC_SWATCHES,
  HAIR_COLORS,
  PatternId,
  SKIN_TONES,
} from './blvCatalog';

export const ATLAS_SIZE = 512;

export function drawCharacterAtlasCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Base neutral background
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

  // Quadrant 1 (Top-Left 256x256): Skin Tone Swatches & Shading Ramps
  const skinColW = 256 / SKIN_TONES.length;
  SKIN_TONES.forEach((tone, i) => {
    const x = i * skinColW;
    const grad = ctx.createLinearGradient(x, 0, x, 256);
    grad.addColorStop(0, tone.hex);
    grad.addColorStop(0.72, tone.hex);
    grad.addColorStop(1, tone.shadowHex);
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, skinColW + 0.5, 256);

    // Subtle cheek blush strip at y=160..195
    ctx.fillStyle = 'rgba(205, 82, 72, 0.16)';
    ctx.fillRect(x + 2, 160, skinColW - 4, 34);
  });

  // Quadrant 2 (Top-Right 256x256): Hair Shades & Strand Texture
  const hairColW = 256 / HAIR_COLORS.length;
  HAIR_COLORS.forEach((hc, i) => {
    const x = 256 + i * hairColW;
    ctx.fillStyle = hc.hex;
    ctx.fillRect(x, 0, hairColW + 0.5, 256);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let s = 0; s < 256; s += 8) {
      ctx.fillRect(x + 4, s, hairColW - 8, 2);
    }
  });

  // Quadrant 3 (Bottom-Left 256x256): Expressive Chibi Eyes & Mouths Sprite Sheet
  ctx.fillStyle = '#F9FAFB';
  ctx.fillRect(0, 256, 256, 256);

  const eyeVariants = ['#2C1810', '#3B2314', '#1F2937', '#4A2C1D'];
  eyeVariants.forEach((irisColor, idx) => {
    const cx = 32 + idx * 64;
    const cy = 320;
    // Sclera
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#18181B';
    ctx.stroke();

    // Iris
    ctx.fillStyle = irisColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 15, 19, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#09090B';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular catchlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 6, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 5, cy + 7, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Mouths below eyes
    const my = 420;
    ctx.strokeStyle = '#27150E';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (idx === 0) {
      ctx.arc(cx, my - 4, 14, 0.25, Math.PI - 0.25);
    } else if (idx === 1) {
      ctx.arc(cx, my - 2, 12, 0.15, Math.PI - 0.15);
    } else if (idx === 2) {
      ctx.moveTo(cx - 12, my);
      ctx.quadraticCurveTo(cx, my + 8, cx + 12, my);
    } else {
      ctx.arc(cx, my - 6, 15, 0.2, Math.PI - 0.2);
    }
    ctx.stroke();
  });

  // Quadrant 4 (Bottom-Right 256x256): Shoe & Sole Trim Strips
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(256, 256, 256, 256);
  const shoeColors = ['#F3F4F6', '#272932', '#0D9488', '#8D5524', '#E11D48', '#D97706'];
  shoeColors.forEach((c, i) => {
    const y = 256 + i * 42;
    ctx.fillStyle = c;
    ctx.fillRect(256, y, 256, 30);
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(256, y + 30, 256, 12);
  });
}

export function drawClothingAtlasCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 4x4 grid of 128x128 contemporary Abidjan textile tiles
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

  // Row 0: Solid cottons & weaves
  for (let i = 0; i < 4; i++) {
    const x = i * 128;
    ctx.fillStyle = FABRIC_SWATCHES[i].hex;
    ctx.fillRect(x, 0, 128, 128);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let py = 0; py < 128; py += 4) {
      ctx.fillRect(x, py, 128, 1);
    }
  }

  // Row 1: Denim twill & Chino weaves
  const denims = ['#2C4268', '#1E293B', '#3B5C8E', '#D6C5A9'];
  for (let i = 0; i < 4; i++) {
    const x = i * 128;
    const y = 128;
    ctx.fillStyle = denims[i];
    ctx.fillRect(x, y, 128, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    for (let k = -128; k < 256; k += 6) {
      ctx.beginPath();
      ctx.moveTo(x + k, y);
      ctx.lineTo(x + k + 128, y + 128);
      ctx.stroke();
    }
  }

  // Row 2: Contemporary Abidjan Wax-Inspired Geometric Bands
  const waxBases = ['#0D9488', '#D97706', '#1D4ED8', '#C2410C'];
  const waxAccents = ['#F3F4F6', '#1E293B', '#F59E0B', '#D6C5A9'];
  for (let i = 0; i < 4; i++) {
    const x = i * 128;
    const y = 256;
    ctx.fillStyle = waxBases[i];
    ctx.fillRect(x, y, 128, 128);
    ctx.fillStyle = waxAccents[i];
    for (let gx = 0; gx < 128; gx += 32) {
      for (let gy = 0; gy < 128; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(x + gx + 16, y + gy + 4);
        ctx.lineTo(x + gx + 28, y + gy + 16);
        ctx.lineTo(x + gx + 16, y + gy + 28);
        ctx.lineTo(x + gx + 4, y + gy + 16);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Row 3: Stripes & Sport bands
  for (let i = 0; i < 4; i++) {
    const x = i * 128;
    const y = 384;
    ctx.fillStyle = FABRIC_SWATCHES[i + 4].hex;
    ctx.fillRect(x, y, 128, 128);
    ctx.fillStyle = '#F3F4F6';
    if (i < 2) {
      for (let s = 0; s < 128; s += 16) {
        ctx.fillRect(x, y + s, 128, 5);
      }
    } else {
      ctx.fillRect(x + 48, y, 12, 128);
      ctx.fillRect(x + 68, y, 12, 128);
    }
  }
}

export function drawColorMasksCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // RGB channel mask map:
  // R (255,0,0) = Primary Zone
  // G (0,255,0) = Secondary Trim / Collar / Wax Band Zone
  // B (0,0,255) = Tertiary Detail (Pockets, Buttons, Laces)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

  // Upper half: Primary garment field (Red channel)
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(0, 0, 512, 320);

  // Collar / Hem / Trim bands (Green channel)
  ctx.fillStyle = '#00FF00';
  ctx.fillRect(0, 0, 512, 42);
  ctx.fillRect(0, 270, 512, 50);

  // Geometric mask motifs inside primary field (Green channel)
  for (let gx = 16; gx < 512; gx += 64) {
    ctx.beginPath();
    ctx.moveTo(gx + 16, 120);
    ctx.lineTo(gx + 32, 152);
    ctx.lineTo(gx + 16, 184);
    ctx.lineTo(gx, 152);
    ctx.closePath();
    ctx.fill();
  }

  // Lower band: Pockets, buttons, soles, hardware (Blue channel)
  ctx.fillStyle = '#0000FF';
  ctx.fillRect(0, 320, 512, 192);
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(24, 344, 180, 144);
  ctx.fillStyle = '#00FF00';
  ctx.fillRect(228, 344, 180, 144);
}

const textureCache = new Map<string, THREE.CanvasTexture>();

export function getPatternTexture(
  pattern: PatternId,
  primaryHex: string,
  secondaryHex: string,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const key = `${pattern}_${primaryHex}_${secondaryHex}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 256, 256);

  if (pattern === 'solid') {
    // Subtle woven cotton micro-grain
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let y = 0; y < 256; y += 4) {
      ctx.fillRect(0, y, 256, 1);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.035)';
    for (let x = 0; x < 256; x += 4) {
      ctx.fillRect(x, 0, 1, 256);
    }
  } else if (pattern === 'denim') {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    for (let i = -256; i < 512; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 256, 256);
      ctx.stroke();
    }
  } else if (pattern === 'stripes') {
    ctx.fillStyle = secondaryHex;
    for (let y = 0; y < 256; y += 24) {
      ctx.fillRect(0, y, 256, 7);
    }
  } else if (pattern === 'wax_band') {
    // Clean Abidjan contemporary wax geometric border band
    ctx.fillStyle = secondaryHex;
    ctx.fillRect(0, 176, 256, 56);
    ctx.fillStyle = primaryHex;
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x + 16, 182);
      ctx.lineTo(x + 28, 204);
      ctx.lineTo(x + 16, 226);
      ctx.lineTo(x + 4, 204);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(0, 172, 256, 4);
    ctx.fillRect(0, 232, 256, 4);
  } else if (pattern === 'geometric') {
    ctx.fillStyle = secondaryHex;
    ctx.globalAlpha = 0.35;
    for (let x = 0; x < 256; x += 48) {
      for (let y = 0; y < 256; y += 48) {
        ctx.beginPath();
        ctx.moveTo(x + 24, y + 6);
        ctx.lineTo(x + 42, y + 24);
        ctx.lineTo(x + 24, y + 42);
        ctx.lineTo(x + 6, y + 24);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'sport_stripe') {
    ctx.fillStyle = secondaryHex;
    ctx.fillRect(108, 0, 14, 256);
    ctx.fillRect(134, 0, 14, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;

  textureCache.set(key, tex);
  return tex;
}

let cachedShadowTex: THREE.CanvasTexture | null = null;

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowTex) return cachedShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.22)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedShadowTex = tex;
  return tex;
}
