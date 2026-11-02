import * as THREE from 'three';

const BADGE_CANVAS_WIDTH = 220;
const BADGE_CANVAS_HEIGHT = 52;
const BADGE_PILL = { x: 4, y: 4, width: 212, height: 44, cornerRadius: 8 } as const;
const BADGE_TEXT_ORIGIN = { x: 110, y: 26 } as const;

function roundedPillPath(ctx: CanvasRenderingContext2D): void {
  const { x, y, width: w, height: h, cornerRadius: r } = BADGE_PILL;
  ctx.beginPath();
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
}

/**
 * Creates a billboarded badge sprite using an offscreen CanvasTexture.
 * Sets depthTest: false to maintain crisp readability over 3D terrain.
 */
export function createSiteBadge(text: string, isSelected: boolean): THREE.Sprite {
  const doc = typeof globalThis !== 'undefined' ? (globalThis as any).document : undefined;
  if (!doc) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, depthWrite: false, transparent: true }));
    sprite.scale.set(0.18, 0.045, 1);
    return sprite;
  }
  const canvas = doc.createElement('canvas');
  canvas.width = BADGE_CANVAS_WIDTH;
  canvas.height = BADGE_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = isSelected ? 'rgba(6, 14, 27, 0.95)' : 'rgba(10, 18, 30, 0.88)';
  ctx.strokeStyle = isSelected ? '#22d3ee' : '#475569';
  ctx.lineWidth = isSelected ? 3.0 : 1.5;
  roundedPillPath(ctx);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = isSelected ? '#22d3ee' : '#cbd5e1';
  ctx.font = isSelected ? 'bold 20px "JetBrains Mono", monospace' : '18px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, BADGE_TEXT_ORIGIN.x, BADGE_TEXT_ORIGIN.y);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true }));
  sprite.scale.set(0.18, 0.045, 1);
  return sprite;
}
