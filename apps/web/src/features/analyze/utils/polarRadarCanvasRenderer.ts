import type { HorizonProfileBin } from '@luna/contracts';
import {
  elevationToRadius,
  polarToCartesian,
} from './polarRadarMath';

export interface CelestialRadarPoint {
  azimuthDeg: number;
  elevationDeg: number;
  status?: string;
}

export interface RenderPolarRadarParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  horizonBins: HorizonProfileBin[];
  sunPoint?: CelestialRadarPoint;
  earthPoint?: CelestialRadarPoint;
  sunTrajectory?: CelestialRadarPoint[];
  earthTrajectory?: CelestialRadarPoint[];
}

export function renderPolarRadarScene({
  ctx,
  width,
  height,
  horizonBins,
  sunPoint,
  earthPoint,
  sunTrajectory = [],
  earthTrajectory = [],
}: RenderPolarRadarParams): void {
  const center = { x: width / 2, y: height / 2 };
  const maxR = Math.min(width, height) / 2 - 24;

  ctx.clearRect(0, 0, width, height);

  // 1. Base Celestial Dome Background
  ctx.beginPath();
  ctx.arc(center.x, center.y, maxR, 0, 2 * Math.PI);
  ctx.fillStyle = '#060B14';
  ctx.fill();

  // 2. Concentric Elevation Range Rings
  const rings = [
    { el: 0, label: '0° Horizon', stroke: '#334155', dash: [3, 3] },
    { el: 10, label: '+10° (Slope Break)', stroke: '#0284c7', dash: [2, 2] },
    { el: 30, label: '+30°', stroke: '#1e293b', dash: [1, 3] },
    { el: 60, label: '+60°', stroke: '#1e293b', dash: [1, 3] },
  ];

  for (const ring of rings) {
    const r = elevationToRadius(ring.el, maxR);
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, 2 * Math.PI);
    ctx.strokeStyle = ring.stroke;
    ctx.setLineDash(ring.dash);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 3. 8 Compass Cardinal Rays
  const cardinals = [
    { az: 0, label: 'N (000°)' },
    { az: 45, label: 'NE' },
    { az: 90, label: 'E (090°)' },
    { az: 135, label: 'SE' },
    { az: 180, label: 'S (180°)' },
    { az: 225, label: 'SW' },
    { az: 270, label: 'W (270°)' },
    { az: 315, label: 'NW' },
  ];

  ctx.font = '11px monospace';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const card of cardinals) {
    const pt = polarToCartesian({ azimuthDeg: card.az, elevationDeg: -5 }, center, maxR);
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    const labelPt = polarToCartesian({ azimuthDeg: card.az, elevationDeg: -7.5 }, center, maxR + 14);
    ctx.fillText(card.label, labelPt.x, labelPt.y);
  }

  // 4. Closed LOLA Skyline Horizon Polygon
  if (horizonBins.length > 0) {
    ctx.beginPath();
    horizonBins.forEach((bin, idx) => {
      const el = bin.thetaNomDeg ?? bin.elevationDeg ?? 0;
      const pt = polarToCartesian({ azimuthDeg: bin.azimuthDeg, elevationDeg: el }, center, maxR);
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();

    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 5. Sun Trajectory & Active Disk
  if (sunTrajectory.length > 1) {
    ctx.beginPath();
    sunTrajectory.forEach((pt, i) => {
      const c = polarToCartesian({ azimuthDeg: pt.azimuthDeg, elevationDeg: pt.elevationDeg }, center, maxR);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (sunPoint) {
    const sunC = polarToCartesian({ azimuthDeg: sunPoint.azimuthDeg, elevationDeg: sunPoint.elevationDeg }, center, maxR);
    ctx.beginPath();
    ctx.arc(sunC.x, sunC.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sunC.x, sunC.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 6. Earth Trajectory & Active Disk
  if (earthTrajectory.length > 1) {
    ctx.beginPath();
    earthTrajectory.forEach((pt, i) => {
      const c = polarToCartesian({ azimuthDeg: pt.azimuthDeg, elevationDeg: pt.elevationDeg }, center, maxR);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (earthPoint) {
    const earthC = polarToCartesian({ azimuthDeg: earthPoint.azimuthDeg, elevationDeg: earthPoint.elevationDeg }, center, maxR);
    ctx.beginPath();
    ctx.arc(earthC.x, earthC.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(earthC.x, earthC.y, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#818cf8';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
