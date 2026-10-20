import * as THREE from 'three';

/**
 * Procedural texture generator for a hyper-realistic circular demonic eye.
 * Uses exact 2:1 equirectangular canvas (1024x512) so circular features in 2D
 * map to 100% mathematically perfect circular shapes on the 3D sphere (eliminating
 * any horizontal oval distortion).
 */

let cachedEyeTextures: { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } | null = null;
let cachedFleshTextures: { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } | null = null;

export function getDemonicEyeTexture(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  if (cachedEyeTextures) return cachedEyeTextures;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const cx = width / 2; // 512
  const cy = height / 2; // 256

  // 1. Sclera base across entire sphere (warm yellowed ivory with red gradient at edges)
  const scleraGrad = ctx.createRadialGradient(cx, cy, 80, cx, cy, 320);
  scleraGrad.addColorStop(0, '#f2e5c8');
  scleraGrad.addColorStop(0.45, '#cbb494');
  scleraGrad.addColorStop(0.75, '#824838');
  scleraGrad.addColorStop(1, '#2c0c08');

  ctx.fillStyle = scleraGrad;
  ctx.fillRect(0, 0, width, height);

  // Micro organic mottling on sclera
  for (let i = 0; i < 2000; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 85 + Math.random() * 260;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    const alpha = 0.05 + Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(180, 30, 15, ${alpha})` : `rgba(45, 20, 15, ${alpha})`;
    ctx.fillRect(px, py, 2, 2);
  }

  // 2. Branching demonic blood vessels (radiating inward circularly toward the iris)
  const drawVessel = (
    startX: number,
    startY: number,
    angle: number,
    length: number,
    w: number,
    depth: number
  ) => {
    if (depth <= 0 || length < 4) return;
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    const cpX = (startX + endX) / 2 + (Math.random() - 0.5) * length * 0.45;
    const cpY = (startY + endY) / 2 + (Math.random() - 0.5) * length * 0.45;
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.strokeStyle = `rgba(${175 + depth * 15}, ${18 + depth * 5}, 10, ${0.65 + depth * 0.1})`;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (Math.random() > 0.35) {
      drawVessel(
        endX,
        endY,
        angle + (Math.random() - 0.5) * 0.75,
        length * 0.72,
        Math.max(0.6, w * 0.7),
        depth - 1
      );
    }
  };

  // Circular ring of vessels crawling inward
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
    const startR = 260;
    const sx = cx + Math.cos(angle) * startR;
    const sy = cy + Math.sin(angle) * startR;
    const inwardAngle = angle + Math.PI + (Math.random() - 0.5) * 0.3;
    drawVessel(sx, sy, inwardAngle, 45 + Math.random() * 30, 2.8, 3);
  }

  // 3. Dark Circular Limbal Ring (Perfect circle on 3D sphere)
  const irisRadius = 112;
  const limbalGrad = ctx.createRadialGradient(cx, cy, irisRadius - 9, cx, cy, irisRadius + 5);
  limbalGrad.addColorStop(0, 'rgba(20, 2, 2, 0.0)');
  limbalGrad.addColorStop(0.5, 'rgba(10, 0, 0, 0.95)');
  limbalGrad.addColorStop(1, 'rgba(50, 5, 5, 0.8)');

  ctx.fillStyle = limbalGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, irisRadius + 5, 0, Math.PI * 2);
  ctx.fill();

  // 4. Fiery Demonic Iris Base (Circular radial gradient)
  const irisGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, irisRadius);
  irisGrad.addColorStop(0, '#fff4cc');
  irisGrad.addColorStop(0.2, '#ff9e00');
  irisGrad.addColorStop(0.5, '#d41800');
  irisGrad.addColorStop(0.85, '#500200');
  irisGrad.addColorStop(1, '#0e0101');

  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, irisRadius, 0, Math.PI * 2);
  ctx.fill();

  // 5. Circular Striated Iris Fibers
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 360; i++) {
    ctx.rotate((Math.PI * 2) / 360);
    const fiberLen = 22 + Math.random() * (irisRadius - 28);
    const alpha = 0.25 + Math.random() * 0.45;
    ctx.strokeStyle =
      i % 3 === 0
        ? `rgba(255, 230, 120, ${alpha})`
        : i % 2 === 0
        ? `rgba(240, 70, 10, ${alpha})`
        : `rgba(60, 5, 2, ${alpha * 1.2})`;
    ctx.lineWidth = 1.0 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(fiberLen, (Math.random() - 0.5) * 2.5);
    ctx.stroke();
  }
  ctx.restore();

  // 6. Demonic Pupil (Circular outer glow with sharp vertical slit pupil)
  ctx.save();
  ctx.translate(cx, cy);
  // Central dark circular pupil core
  const pupilCoreGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 36);
  pupilCoreGrad.addColorStop(0, '#000000');
  pupilCoreGrad.addColorStop(0.7, '#0a0002');
  pupilCoreGrad.addColorStop(1, 'rgba(30, 0, 0, 0.0)');
  ctx.fillStyle = pupilCoreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fill();

  // Slit pupil
  ctx.beginPath();
  const pupilH = 75;
  const pupilW = 16;
  ctx.moveTo(0, -pupilH);
  ctx.bezierCurveTo(pupilW * 1.4, -pupilH * 0.3, pupilW * 1.4, pupilH * 0.3, 0, pupilH);
  ctx.bezierCurveTo(-pupilW * 1.4, pupilH * 0.3, -pupilW * 1.4, -pupilH * 0.3, 0, -pupilH);
  ctx.closePath();
  ctx.fillStyle = '#000000';
  ctx.shadowColor = '#ff2200';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;

  // Bump map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.drawImage(canvas, 0, 0, 512, 256);
  const bump = new THREE.CanvasTexture(bumpCanvas);

  cachedEyeTextures = { map, bump };
  return cachedEyeTextures;
}

export function getFaceSkinTexture(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  if (cachedFleshTextures) return cachedFleshTextures;

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Smooth dark demonic eyelid flesh
  ctx.fillStyle = '#220807';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const shade = Math.floor(12 + Math.random() * 20);
    ctx.fillStyle = `rgba(${shade + 20}, ${shade * 0.5}, ${shade * 0.3}, 0.2)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Soft fleshy eyelid rim margin along the horizontal center
  ctx.fillStyle = '#4a120e';
  ctx.fillRect(0, height / 2 - 6, width, 12);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 128;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.drawImage(canvas, 0, 0, 256, 128);
  const bump = new THREE.CanvasTexture(bumpCanvas);

  cachedFleshTextures = { map, bump };
  return cachedFleshTextures;
}
