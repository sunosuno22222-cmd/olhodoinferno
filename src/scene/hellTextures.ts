import * as THREE from 'three';

/**
 * High-performance procedural textures for the Hell environment and Portal.
 * Pre-generated once on startup with 0% runtime CPU overhead.
 */

export function createEmberParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 230, 1.0)');
  grad.addColorStop(0.2, 'rgba(255, 170, 40, 0.95)');
  grad.addColorStop(0.5, 'rgba(255, 60, 10, 0.6)');
  grad.addColorStop(0.8, 'rgba(180, 20, 0, 0.2)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createLavaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(256, 256);
  const data = imgData.data;

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const nx = x / 28;
      const ny = y / 28;
      const v1 = Math.sin(nx + Math.sin(ny * 1.5));
      const v2 = Math.sin(ny * 0.8 + Math.cos(nx * 1.2));
      const v3 = Math.sin((nx + ny) * 0.7);
      const wave = (v1 + v2 + v3 + 3) / 6;

      const idx = (y * 256 + x) * 4;
      if (wave > 0.65) {
        const f = (wave - 0.65) / 0.35;
        data[idx] = 255;
        data[idx + 1] = Math.floor(180 + f * 75);
        data[idx + 2] = Math.floor(40 + f * 100);
        data[idx + 3] = 255;
      } else if (wave > 0.38) {
        const f = (wave - 0.38) / 0.27;
        data[idx] = Math.floor(190 + f * 65);
        data[idx + 1] = Math.floor(35 + f * 90);
        data[idx + 2] = 5;
        data[idx + 3] = 255;
      } else {
        const f = wave / 0.38;
        data[idx] = Math.floor(35 + f * 35);
        data[idx + 1] = Math.floor(8 + f * 12);
        data[idx + 2] = Math.floor(5 + f * 8);
        data[idx + 3] = 255;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createObsidianRockTexture(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f0a0d';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#221514';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 128, Math.random() * 128);
    ctx.lineTo(Math.random() * 128, Math.random() * 128);
    ctx.stroke();
  }

  for (let i = 0; i < 500; i++) {
    const c = Math.floor(15 + Math.random() * 25);
    ctx.fillStyle = `rgb(${c + 8}, ${c}, ${c - 5})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 128;
  bumpCanvas.height = 128;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.drawImage(canvas, 0, 0);

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;

  return { map, bump };
}

export function createPortalVortexTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const cx = 256;
  const cy = 256;

  // Swirling plasma radial gradient
  const grad = ctx.createRadialGradient(cx, cy, 15, cx, cy, 256);
  grad.addColorStop(0, 'rgba(255, 255, 240, 1.0)'); // Blazing white hot core
  grad.addColorStop(0.12, 'rgba(255, 210, 60, 0.98)'); // Intense yellow gold
  grad.addColorStop(0.3, 'rgba(255, 110, 20, 0.88)'); // Vivid fiery orange
  grad.addColorStop(0.55, 'rgba(210, 30, 8, 0.65)'); // Crimson blood
  grad.addColorStop(0.8, 'rgba(100, 8, 4, 0.35)'); // Dark ember
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)'); // Fades out

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // 8 Spiraling plasma arms with varying thickness and glow
  ctx.save();
  ctx.translate(cx, cy);
  for (let arm = 0; arm < 8; arm++) {
    ctx.rotate((Math.PI * 2) / 8);
    ctx.beginPath();
    ctx.strokeStyle = arm % 2 === 0 ? 'rgba(255, 230, 100, 0.55)' : 'rgba(255, 90, 20, 0.45)';
    ctx.lineWidth = arm % 2 === 0 ? 18 : 28;
    ctx.lineCap = 'round';
    for (let r = 25; r < 240; r += 4) {
      const theta = r * 0.055;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      if (r === 25) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRuneSigilRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const cx = 256;
  const cy = 256;

  ctx.clearRect(0, 0, 512, 512);

  // Concentric occult rings
  ctx.strokeStyle = 'rgba(255, 140, 20, 0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 238, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 70, 10, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 215, 0, Math.PI * 2);
  ctx.stroke();

  // Radial tick marks
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 36; i++) {
    ctx.rotate((Math.PI * 2) / 36);
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255, 210, 80, 0.9)' : 'rgba(255, 80, 15, 0.5)';
    ctx.lineWidth = i % 3 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(215, 0);
    ctx.lineTo(238, 0);
    ctx.stroke();
  }

  // Geometric 8-pointed alchemy star
  ctx.strokeStyle = 'rgba(255, 110, 20, 0.4)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 2; i++) {
    ctx.rotate((Math.PI * 2) / 8);
    const r = 215;
    ctx.strokeRect(-r * 0.707, -r * 0.707, r * 1.414, r * 1.414);
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCoronaFlareTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const cx = 128;
  const cy = 128;

  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 128);
  grad.addColorStop(0, 'rgba(255, 220, 100, 0.9)');
  grad.addColorStop(0.25, 'rgba(255, 100, 20, 0.6)');
  grad.addColorStop(0.6, 'rgba(180, 20, 5, 0.25)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
