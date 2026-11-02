import * as THREE from 'three';

const SUN_CORONA_SPRITE_SIZE = 0.85;

/** Generates a high-quality, realistic planetary Earth texture with oceans, continents, and cloud bands. */
export function createEarthCanvasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 256);
  oceanGrad.addColorStop(0, '#10264d');
  oceanGrad.addColorStop(0.5, '#163b75');
  oceanGrad.addColorStop(1, '#0e203f');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 512, 256);

  // Continents: natural earth tones (Eurasia, Africa, Americas, Australia, Antarctica)
  ctx.fillStyle = '#2d5a3f'; // Vegetation green

  // Eurasia & Africa approximate landmass
  ctx.beginPath();
  ctx.ellipse(310, 85, 80, 45, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(285, 140, 42, 55, 0.1, 0, Math.PI * 2); // Africa
  ctx.fill();

  ctx.fillStyle = '#655d42'; // Sahara / arid belt
  ctx.beginPath();
  ctx.ellipse(285, 115, 38, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Americas
  ctx.fillStyle = '#2d5a3f';
  ctx.beginPath();
  ctx.ellipse(140, 80, 50, 40, 0.3, 0, Math.PI * 2); // North America
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(175, 165, 32, 50, 0.25, 0, Math.PI * 2); // South America
  ctx.fill();

  // Australia
  ctx.beginPath();
  ctx.ellipse(400, 175, 28, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Polar ice caps
  ctx.fillStyle = '#eaf2fd';
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 238, 512, 18);

  // Atmospheric cloud bands (translucent swirling bands)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  for (let i = 0; i < 7; i++) {
    const y = 45 + i * 26;
    ctx.beginPath();
    ctx.ellipse(100 + i * 45, y, 65, 10, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(340 + i * 25, y + 6, 75, 12, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Generates a warm luminous radial corona glow sprite for the Sun. */
export function createSunCoronaSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(255, 236, 179, 0.9)');
  gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
  gradient.addColorStop(0.85, 'rgba(245, 158, 11, 0.12)');
  gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sprite.scale.set(SUN_CORONA_SPRITE_SIZE, SUN_CORONA_SPRITE_SIZE, 1);
  return sprite;
}

/** Creates a high-legibility billboard label tag in 3D scene space. */
export function createCelestialLabel(text: string, colorHex: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 56;
  const ctx = canvas.getContext('2d')!;

  // Dark translucent background with colored border
  ctx.fillStyle = 'rgba(6, 14, 27, 0.92)';
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  const r = 10;
  const w = 214;
  const h = 50;
  const x = 3;
  const y = 3;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 110, 28);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true })
  );
  sprite.scale.set(0.32, 0.08, 1);
  return sprite;
}

/**
 * Small radial-gradient disc texture for on-sky markers (task 4.4 skyline
 * Sun/Earth orbs): reads as an orb instead of a hard square. Headless-safe —
 * falls back to null so callers use a plain colored material.
 */
export function createCelestialDiscTexture(color: string): THREE.CanvasTexture | null {
  try {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  } catch {
    return null;
  }
}
