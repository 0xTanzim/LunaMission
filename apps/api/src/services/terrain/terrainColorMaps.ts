/**
 * Lunar South Pole Scientific Colormaps & Hypsometric Color Ramps
 *
 * Implements standard NASA LOLA False Color Spectral/Rainbow mapping,
 * terrain hazard slope coloring, geological stratigraphy palette,
 * and cryogenic illumination thermal contours.
 */

/**
 * Maps an elevation in meters to standard NASA LOLA False Color Rainbow colormap.
 * Range: -4200m (deep purple) to +5100m (bright white/pink).
 */
export function getLolaElevationColor(elevationMeters: number): string {
  const minElev = -4200;
  const maxElev = 5100;
  const t = Math.max(0, Math.min(1, (elevationMeters - minElev) / (maxElev - minElev)));

  if (t < 0.20) {
    const s = t / 0.20;
    return interpolateRgb('#3b0764', '#1d4ed8', s);
  } else if (t < 0.40) {
    const s = (t - 0.20) / 0.20;
    return interpolateRgb('#1d4ed8', '#06b6d4', s);
  } else if (t < 0.60) {
    const s = (t - 0.40) / 0.20;
    return interpolateRgb('#06b6d4', '#10b981', s);
  } else if (t < 0.80) {
    const s = (t - 0.60) / 0.20;
    return interpolateRgb('#10b981', '#eab308', s);
  } else if (t < 0.92) {
    const s = (t - 0.80) / 0.12;
    return interpolateRgb('#eab308', '#ea580c', s);
  } else {
    const s = (t - 0.92) / 0.08;
    return interpolateRgb('#ea580c', '#fdf4ff', s);
  }
}

/**
 * Maps slope angle in degrees to standard lunar hazard colormap.
 */
export function getSlopeColor(slopeDeg: number): string {
  if (slopeDeg < 5.0) return '#10b981'; // Green: Safe (<5°)
  if (slopeDeg < 12.0) return '#84cc16'; // Lime/Yellow: Moderate (5°-12°)
  if (slopeDeg < 15.0) return '#f59e0b'; // Amber: Caution (12°-15°)
  return '#dc2626'; // Red: Critical Hazard (>=15° Artemis III lander tip-over threshold)
}

/**
 * Maps geological unit code to authentic lunar stratigraphy color.
 */
export function getGeologyUnitColor(unitCode: 'pNb' | 'Nb' | 'Im' | 'Cc' | 'PSR'): string {
  switch (unitCode) {
    case 'PSR':
      return '#1e1b4b'; // Deep navy/black
    case 'pNb':
      return '#78716c'; // Muted warm stone / pre-Nectarian
    case 'Nb':
      return '#b45309'; // Terracotta / Nectarian massif
    case 'Im':
      return '#2563eb'; // Royal blue / Imbrian
    case 'Cc':
      return '#fbbf24'; // Gold / Copernican
  }
}

export function getLolaElevationRgb(elevationMeters: number): [number, number, number] {
  const minElev = -4200;
  const maxElev = 5100;
  const t = Math.max(0, Math.min(1, (elevationMeters - minElev) / (maxElev - minElev)));

  if (t < 0.20) {
    const s = t / 0.20;
    return [Math.round(59 + (29 - 59) * s), Math.round(7 + (78 - 7) * s), Math.round(100 + (216 - 100) * s)];
  } else if (t < 0.40) {
    const s = (t - 0.20) / 0.20;
    return [Math.round(29 + (6 - 29) * s), Math.round(78 + (182 - 78) * s), Math.round(216 + (212 - 216) * s)];
  } else if (t < 0.60) {
    const s = (t - 0.40) / 0.20;
    return [Math.round(6 + (16 - 6) * s), Math.round(182 + (185 - 182) * s), Math.round(212 + (129 - 212) * s)];
  } else if (t < 0.80) {
    const s = (t - 0.60) / 0.20;
    return [Math.round(16 + (234 - 16) * s), Math.round(185 + (179 - 185) * s), Math.round(129 + (8 - 129) * s)];
  } else if (t < 0.92) {
    const s = (t - 0.80) / 0.12;
    return [Math.round(234 + (234 - 234) * s), Math.round(179 + (88 - 179) * s), Math.round(8 + (12 - 8) * s)];
  } else {
    const s = (t - 0.92) / 0.08;
    return [Math.round(234 + (253 - 234) * s), Math.round(88 + (244 - 88) * s), Math.round(12 + (255 - 12) * s)];
  }
}

export function getSlopeRgb(slopeDeg: number): [number, number, number] {
  if (slopeDeg < 5.0) return [16, 185, 129]; // Safe Green (<5°)
  if (slopeDeg < 12.0) return [132, 204, 22]; // Lime/Yellow Moderate (5°-12°)
  if (slopeDeg < 15.0) return [245, 158, 11]; // Amber Caution (12°-15°)
  return [220, 38, 38]; // Red Hazard (>=15° Artemis III tip-over threshold)
}

export function getGeologyUnitRgb(unitCode: 'pNb' | 'Nb' | 'Im' | 'Cc' | 'PSR'): [number, number, number] {
  switch (unitCode) {
    case 'PSR':
      return [30, 27, 75];
    case 'pNb':
      return [120, 113, 108];
    case 'Nb':
      return [180, 83, 9];
    case 'Im':
      return [37, 99, 235];
    case 'Cc':
      return [251, 191, 36];
  }
}

export function getIlluminationRgb(annualPct: number, isPsr: boolean): [number, number, number] {
  if (isPsr) {
    return [20, 14, 60]; // Deep indigo cryogenic shadow
  }
  const t = Math.max(0, Math.min(1, annualPct / 100));
  return [
    Math.round(15 + (245 - 15) * t),
    Math.round(23 + (158 - 23) * t),
    Math.round(42 + (11 - 42) * t),
  ];
}

function interpolateRgb(hexA: string, hexB: string, t: number): string {
  const cA = parseInt(hexA.replace('#', ''), 16);
  const cB = parseInt(hexB.replace('#', ''), 16);

  const rA = (cA >> 16) & 255;
  const gA = (cA >> 8) & 255;
  const bA = cA & 255;

  const rB = (cB >> 16) & 255;
  const gB = (cB >> 8) & 255;
  const bB = cB & 255;

  const r = Math.round(rA + (rB - rA) * t);
  const g = Math.round(gA + (gB - gA) * t);
  const b = Math.round(bA + (bB - bA) * t);

  return `rgb(${r}, ${g}, ${b})`;
}
