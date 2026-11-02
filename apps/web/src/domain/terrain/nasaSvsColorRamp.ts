/**
 * NASA Goddard Scientific Visualization Studio (SVS) 3727 LOLA 16-Stop Hypsometry
 *
 * Implements the official 16-stop false-color rainbow colormap used by NASA SVS
 * to depict Global Lunar Topography from the Lunar Orbiter Laser Altimeter (LOLA).
 * Range: -9,000 m (deepest South Pole-Aitken floor) to +9,000 m (highest far-side highlands).
 *
 * Two display domains, one palette:
 *
 *   - **Global** (`getNasaSvsElevationRgb`, −9,000…+9,000 m) is the whole-Moon ramp. It stays
 *     the right choice for the 3D globe, where both the near-side highlands and the
 *     South Pole–Aitken floor are on screen.
 *   - **South-polar** (`getPolarElevationRgb`, `NASA_SVS_POLAR_DOMAIN`) is the ramp for the
 *     83°S–90°S polar sheet. Painting that sheet on the global ramp spends most of its 16
 *     stops on elevations the polar cap does not contain — the whole cap lands between two
 *     adjacent stops — so it renders as one flat yellow field. The polar domain maps the
 *     elevations the sheet actually holds across the whole palette instead.
 *
 * The polar domain is a **fixed policy**, not a per-view stretch: the same numbers are used by
 * the 2D sheet, its legend, and every comparison view, so two pictures of the same terrain
 * always encode equal elevation with equal colour (docs/ui/IDENTITY.md, "Honesty is visual").
 */

export interface NasaSvsColorStop {
  readonly elevationMeters: number;
  readonly hex: string;
  readonly rgb: readonly [number, number, number];
}

export interface NasaSvsLegendTick {
  readonly km: number;
  readonly label: string;
  readonly hex: string;
}

/**
 * Official 16-stop color table extracted from NASA SVS 3727 specification.
 */
export const NASA_SVS_COLOR_STOPS: readonly NasaSvsColorStop[] = [
  { elevationMeters: -9000, hex: '#2b0057', rgb: [43, 0, 87] },
  { elevationMeters: -7800, hex: '#3d087b', rgb: [61, 8, 123] },
  { elevationMeters: -6600, hex: '#1d2382', rgb: [29, 35, 130] },
  { elevationMeters: -5400, hex: '#134ea3', rgb: [19, 78, 163] },
  { elevationMeters: -4200, hex: '#0d7ec4', rgb: [13, 126, 196] },
  { elevationMeters: -3000, hex: '#09a4b8', rgb: [9, 164, 184] },
  { elevationMeters: -1800, hex: '#10bba0', rgb: [16, 187, 160] },
  { elevationMeters: -600, hex: '#1fc575', rgb: [31, 197, 117] },
  { elevationMeters: 0, hex: '#4fd33e', rgb: [79, 211, 62] },
  { elevationMeters: 1200, hex: '#8ee124', rgb: [142, 225, 36] },
  { elevationMeters: 2400, hex: '#d0ea15', rgb: [208, 234, 21] },
  { elevationMeters: 3600, hex: '#f7e212', rgb: [247, 226, 18] },
  { elevationMeters: 4800, hex: '#fca916', rgb: [252, 169, 22] },
  { elevationMeters: 6000, hex: '#f6641d', rgb: [246, 100, 29] },
  { elevationMeters: 7200, hex: '#e62828', rgb: [230, 40, 40] },
  { elevationMeters: 9000, hex: '#f060c0', rgb: [240, 96, 192] },
] as const;

/**
 * Official NASA SVS 3727 elevation legend scale bar ticks (-8 km to +8 km in steps of 2 km).
 *
 * These belong to the **global** ramp. A legend for the polar sheet must use
 * `getPolarLegendTicks()` — a scale bar whose labels disagree with the pixels it sits
 * beside is worse than no scale bar at all.
 */
export const NASA_SVS_LEGEND_TICKS: readonly NasaSvsLegendTick[] = [
  { km: -8, label: '-8 km', hex: '#350469' },
  { km: -6, label: '-6 km', hex: '#1a3292' },
  { km: -4, label: '-4 km', hex: '#0b8cb9' },
  { km: -2, label: '-2 km', hex: '#10baa2' },
  { km: 0, label: '0 km (Datum)', hex: '#4fd33e' },
  { km: 2, label: '+2 km', hex: '#bee71a' },
  { km: 4, label: '+4 km', hex: '#f9c514' },
  { km: 6, label: '+6 km', hex: '#f6641d' },
  { km: 8, label: '+8 km', hex: '#ec4474' },
] as const;

/**
 * Linearly interpolates between two RGB triplets.
 */
function interpolateRgbTriplet(
  rgbA: readonly [number, number, number],
  rgbB: readonly [number, number, number],
  factor: number
): [number, number, number] {
  const t = Math.max(0, Math.min(1, factor));
  return [
    Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t),
    Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t),
    Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t),
  ];
}

/**
 * Interpolates NASA SVS 3727 elevation in meters to an [R, G, B] triplet (0-255).
 * Clamps values outside [-9000, +9000].
 */
export function getNasaSvsElevationRgb(elevationMeters: number): [number, number, number] {
  const stops = NASA_SVS_COLOR_STOPS;
  if (elevationMeters <= stops[0].elevationMeters) {
    return [stops[0].rgb[0], stops[0].rgb[1], stops[0].rgb[2]];
  }
  if (elevationMeters >= stops[stops.length - 1].elevationMeters) {
    const last = stops[stops.length - 1];
    return [last.rgb[0], last.rgb[1], last.rgb[2]];
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const lower = stops[i];
    const upper = stops[i + 1];
    if (elevationMeters >= lower.elevationMeters && elevationMeters <= upper.elevationMeters) {
      const range = upper.elevationMeters - lower.elevationMeters;
      const t = range > 0 ? (elevationMeters - lower.elevationMeters) / range : 0;
      return interpolateRgbTriplet(lower.rgb, upper.rgb, t);
    }
  }

  return [stops[8].rgb[0], stops[8].rgb[1], stops[8].rgb[2]];
}

/**
 * Returns a hex color string `#rrggbb` for an elevation in meters.
 */
export function getNasaSvsElevationHex(elevationMeters: number): string {
  const [r, g, b] = getNasaSvsElevationRgb(elevationMeters);
  const hexR = r.toString(16).padStart(2, '0');
  const hexG = g.toString(16).padStart(2, '0');
  const hexB = b.toString(16).padStart(2, '0');
  return `#${hexR}${hexG}${hexB}`;
}

/**
 * Maps a normalized float value [0, 1] directly to the NASA SVS 3727 palette.
 * 0 maps to -9000m, 1 maps to +9000m.
 */
export function getNasaSvsElevationNormalizedRgb(normalized0To1: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, normalized0To1));
  const elevation = -9000 + clamped * 18000;
  return getNasaSvsElevationRgb(elevation);
}

/**
 * South-polar display domain, in metres relative to R = 1,737.4 km.
 *
 * Measured from `sampleTerrainAtLatLon` over the 83°S–90°S sheet (0.25° latitude × 2° longitude,
 * 5,220 samples): min −4,200 m, p01 −3,815, median +2,587, p99 +4,176, max +4,608. The bounds are
 * rounded outward to the nearest 100 m so the constant is stable against sampler changes, and
 * clamped to the palette's own −9,000…+9,000 range.
 *
 * This is a **fixed policy**, not a per-view stretch: every view of the polar sheet uses these
 * numbers, so equal elevation always encodes as equal colour.
 *
 * Regenerate with `bun run tooling/probe-polar-domain.ts`.
 */
export const NASA_SVS_POLAR_DOMAIN = { minMeters: -4300, maxMeters: 4700 } as const;

/**
 * Interpolates an elevation to an [R, G, B] triplet using the polar display domain.
 *
 * The palette is unchanged; only the mapping from metres to palette position differs. Painting the
 * polar sheet on the global domain compressed the whole cap into two adjacent stops (a flat yellow
 * field); this spreads the elevations the cap actually holds across the full 16-stop ramp.
 */
export function getPolarElevationRgb(elevationMeters: number): [number, number, number] {
  const { minMeters, maxMeters } = NASA_SVS_POLAR_DOMAIN;
  const span = maxMeters - minMeters;
  const t = span > 0 ? (elevationMeters - minMeters) / span : 0;
  return getNasaSvsElevationNormalizedRgb(t);
}

/** Hex form of {@link getPolarElevationRgb}. */
export function getPolarElevationHex(elevationMeters: number): string {
  const [r, g, b] = getPolarElevationRgb(elevationMeters);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export interface NasaSvsPolarLegendTick {
  readonly meters: number;
  readonly label: string;
  readonly hex: string;
}

/**
 * Legend ticks for the polar sheet. A scale bar must describe the domain actually painted —
 * the global ±8 km ticks next to a polar-domain raster would label the pixels wrongly.
 */
export const NASA_SVS_POLAR_LEGEND_TICKS: readonly NasaSvsPolarLegendTick[] = (() => {
  const { minMeters, maxMeters } = NASA_SVS_POLAR_DOMAIN;
  const step = (maxMeters - minMeters) / 4;
  return [0, 1, 2, 3, 4].map((i) => {
    const meters = Math.round(minMeters + step * i);
    const sign = meters > 0 ? '+' : '';
    return {
      meters,
      label: `${sign}${(meters / 1000).toFixed(1)} km`,
      hex: getPolarElevationHex(meters),
    };
  });
})();

/** Gradient stops for the polar legend bar, low → high. */
export function getPolarLegendGradient(): string {
  return `linear-gradient(to right, ${NASA_SVS_POLAR_LEGEND_TICKS.map((t) => t.hex).join(', ')})`;
}
