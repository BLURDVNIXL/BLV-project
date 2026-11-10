/**
 * GTA Abidjan - Zero-404 Procedural Canvas Textures
 * Creates textures for roads, buildings, vehicles, and decals using HTML5 Canvas.
 */

import * as THREE from 'three';

/**
 * Asphalt road texture with yellow/white lane markings
 */
export function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base
  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 512, 512);

  // Noise / gravel specks
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const gray = Math.floor(25 + Math.random() * 45);
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Worn edges / curbs
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 16, 512);
  ctx.fillRect(496, 0, 16, 512);

  // White lane shoulder lines
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(32, 0, 8, 512);
  ctx.fillRect(472, 0, 8, 512);

  // Center dashed yellow line (Ivory Coast highway style)
  ctx.fillStyle = '#eab308';
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(252, y + 10, 8, 44);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Modern Skyscraper facade texture with illuminated windows
 */
export function createSkyscraperTexture(baseColor = '#1e293b', windowTint = '#38bdf8'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Concrete/steel framework
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 1024);

  // Grid of office windows
  const cols = 8;
  const rows = 32;
  const colW = 512 / cols;
  const rowH = 1024 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLit = (r * 13 + c * 7) % 3 !== 0;
      if (isLit) {
        // Subtle variations in office light
        const lightIntensity = 0.5 + ((r + c) % 5) * 0.1;
        ctx.fillStyle = windowTint;
        ctx.globalAlpha = lightIntensity;
        ctx.fillRect(c * colW + 6, r * rowH + 6, colW - 12, rowH - 12);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(c * colW + 6, r * rowH + 6, colW - 12, rowH - 12);
      }

      // Metallic mullions
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(c * colW + 4, r * rowH + 4, colW - 8, rowH - 8);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Wôrô-wôrô yellow taxi side door decal
 */
export function createWoroDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, 256, 128);

  // Orange/black city taxi emblem
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(10, 20, 236, 88);

  ctx.fillStyle = '#eab308';
  ctx.fillRect(16, 26, 224, 76);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TAXI ABIDJAN', 128, 58);

  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillStyle = '#b91c1c';
  ctx.fillText('N° 225-CI-01', 128, 84);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Gbaka minibus side route banner
 */
export function createGbakaBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#15803d'; // Gbaka Green
  ctx.fillRect(0, 0, 512, 128);

  // Gold border
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px "Anton", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('YOPOUGON ➔ TREICHVILLE', 256, 58);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('★ GBAKA EXPRESS BABI ★', 256, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Police Nationale emblem & text
 */
export function createPoliceDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 128);

  // Blue diagonal stripes
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(80, 0);
  ctx.lineTo(120, 128);
  ctx.lineTo(40, 128);
  ctx.fill();

  ctx.fillStyle = '#1e3a8a';
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POLICE', 160, 58);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#dc2626';
  ctx.fillText('NATIONALE CI', 160, 86);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * African Wax Fabric / Market Stall awning texture
 */
export function createWaxMarketTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Vibrant warm yellow/orange/cyan pattern
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#facc15';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(i * 32, 0, 16, 256);
  }

  // Cyan diamond shapes
  ctx.fillStyle = '#06b6d4';
  for (let y = 16; y < 256; y += 32) {
    for (let x = 16; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 10, y);
      ctx.lineTo(x, y + 10);
      ctx.lineTo(x - 10, y);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
