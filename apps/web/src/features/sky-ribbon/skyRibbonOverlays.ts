/**
 * Overlay specs for the sky panels (body markers + limb-clearance gauge).
 *
 * Turns read-outs already derived from backend values into the plain drawing specifications both
 * panels consume. Pure: no state, no effects, no astronomy.
 */

import type { CelestialBodySpec, ClearanceGaugeSpec } from './skyRibbonCelestialRenderer';
import type { EarthReadout, SkyCelestialGeometry, SolarReadout } from './skyRibbonAnalysis';
import { finiteOrNull, formatSignedDeg } from './skyRibbonFormat';

export interface LiveCelestialState {
  readonly sunAzimuthDeg: number;
  readonly sunElevationDeg: number;
  readonly earthAzimuthDeg: number;
  readonly earthElevationDeg: number;
}

export interface SkyOverlays {
  readonly sun: CelestialBodySpec | null;
  readonly earth: CelestialBodySpec | null;
  readonly gauge: ClearanceGaugeSpec | null;
}

export interface OverlayOptions {
  readonly geometry?: SkyCelestialGeometry;
  /** Latest shared-playhead sample (backend-computed azimuth/elevation). */
  readonly live?: LiveCelestialState | null;
  /** Human label for the clearance criterion, e.g. `upper-limb`. */
  readonly criterionLabel: string;
}

export function buildSkyOverlays(
  solar: SolarReadout,
  earth: EarthReadout,
  { geometry, live, criterionLabel }: OverlayOptions,
): SkyOverlays {
  const sunAzimuthDeg = finiteOrNull(live?.sunAzimuthDeg) ?? solar.azimuthDeg;
  const sunElevationDeg = finiteOrNull(live?.sunElevationDeg) ?? solar.elevationDeg;
  const sun: CelestialBodySpec | null =
    sunAzimuthDeg === null || sunElevationDeg === null
      ? null
      : {
          kind: 'sun',
          label: 'SUN',
          azimuthDeg: sunAzimuthDeg,
          elevationDeg: sunElevationDeg,
          angularRadiusDeg: finiteOrNull(geometry?.sunAngularRadiusDeg),
          statusGlyph: solar.glyph,
        };

  const earthAzimuthDeg = finiteOrNull(live?.earthAzimuthDeg) ?? earth.azimuthDeg;
  const earthElevationDeg = finiteOrNull(live?.earthElevationDeg) ?? earth.elevationDeg;
  const earthBody: CelestialBodySpec | null =
    earthAzimuthDeg === null || earthElevationDeg === null
      ? null
      : {
          kind: 'earth',
          label: 'EARTH',
          azimuthDeg: earthAzimuthDeg,
          elevationDeg: earthElevationDeg,
          angularRadiusDeg: finiteOrNull(geometry?.earthAngularRadiusDeg),
          statusGlyph: earth.glyph,
        };

  const gauge: ClearanceGaugeSpec | null =
    solar.azimuthDeg === null || solar.horizonMaskDeg === null || solar.elevationDeg === null
      ? null
      : {
          azimuthDeg: solar.azimuthDeg,
          horizonDeg: solar.horizonMaskDeg,
          bodyDeg: solar.elevationDeg,
          clearanceLabel: `${formatSignedDeg(solar.clearanceDeg)} ${criterionLabel}`,
          satisfied:
            solar.clearanceDeg === null ? null : solar.clearanceDeg >= 0,
        };

  return { sun, earth: earthBody, gauge };
}
