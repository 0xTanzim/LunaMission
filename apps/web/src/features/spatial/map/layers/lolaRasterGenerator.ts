import { DEFAULT_PROJECTION_CONFIG, unprojectCoordinates } from '@/domain/coordinates/projection';
import {
  sampleTerrainAtLatLon,
  getSlopeRgb,
  getGeologyUnitRgb,
  getIlluminationRgb,
} from '@/features/spatial/globe/terrain/lolaSouthPoleDemSampler';
import { getPolarElevationRgb } from '@/domain/terrain/nasaSvsColorRamp';
import { getVolatilesRgb, getTemperatureRgb } from '@/domain/volatiles/volatileColorMaps';
import { evaluateLendNeutronFlux, evaluateDivinerTemperature } from '@/domain/volatiles/thermalNeutronModels';
import { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';

/** How much of the disc the last render actually painted. */
export interface RasterCoverage {
  /** Samples with a finite value that were painted. */
  paintedCells: number;
  /** Samples with no usable value. These stay transparent — never painted as a value. */
  noDataCells: number;
}

export interface MapRasterResult {
  /** `null` when the layer has no raster at all (albedo base, or no DOM/canvas). */
  url: string | null;
  coverage: RasterCoverage;
}

const RASTER_CACHE = new Map<ScientificMapLayerMode, MapRasterResult>();

/** Coverage of the most recent render of a mode, for the legend's no-data statement. */
export function getRasterCoverage(mode: ScientificMapLayerMode): RasterCoverage | null {
  return RASTER_CACHE.get(mode)?.coverage ?? null;
}

function isUsableMetric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Natural ground tone for the `none` base: a flat, documented regolith substitute — a
 * neutral lunar-grey ground. It is NOT a per-sample measurement (no LROC polar albedo
 * mosaic is ingested); the base spec carries that provenance wording. The tone exists
 * so the natural base reads as the Moon rather than an empty canvas.
 */
const REGOLITH_GROUND_TONE = 'rgb(98, 96, 92)';

function renderNaturalRegolithGround(resolution: number): MapRasterResult {
  const empty = { paintedCells: 0, noDataCells: 0 };
  if (typeof globalThis.document === 'undefined') return { url: null, coverage: empty };
  const canvas = globalThis.document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { url: null, coverage: empty };
  ctx.fillStyle = REGOLITH_GROUND_TONE;
  ctx.fillRect(0, 0, resolution, resolution);
  const url = canvas.toDataURL('image/png');
  const result = { url, coverage: empty };
  RASTER_CACHE.set('none', result);
  return result;
}

/**
 * Generates an authentic raster data URL for the 2D Lunar South Pole map
 * covering 83.0°S to 90.0°S with IAU 2000 ME projection alignment.
 *
 * A sample with no finite value is left fully transparent and counted, because painting
 * it would state a measurement the data does not hold. The caller reports the count
 * instead of hiding the gap.
 */
export function renderScientificMapRaster(
  mode: ScientificMapLayerMode,
  resolution = 360,
): MapRasterResult {
  const empty = { paintedCells: 0, noDataCells: 0 };

  if (mode === 'none') return renderNaturalRegolithGround(resolution);

  const cached = RASTER_CACHE.get(mode);
  if (cached) return cached;

  if (typeof globalThis.document === 'undefined') return { url: null, coverage: empty };

  const canvas = globalThis.document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { url: null, coverage: empty };

  const imgData = ctx.createImageData(resolution, resolution);
  const data = imgData.data;

  const projConfig = {
    ...DEFAULT_PROJECTION_CONFIG,
    svgSize: resolution,
    center: resolution / 2,
    maxRadius: resolution * (DEFAULT_PROJECTION_CONFIG.maxRadius / DEFAULT_PROJECTION_CONFIG.svgSize),
  };

  const center = projConfig.center;
  const maxRadius = projConfig.maxRadius;
  const maxRadiusSq = maxRadius * maxRadius;

  let paintedCells = 0;
  let noDataCells = 0;

  for (let py = 0; py < resolution; py++) {
    for (let px = 0; px < resolution; px++) {
      const idx = (py * resolution + px) * 4;
      const dx = px - center;
      const dy = py - center;
      const distSq = dx * dx + dy * dy;

      // Outside the polar disc there is no sheet at all, which is not a data gap.
      if (distSq > maxRadiusSq) {
        data[idx + 3] = 0;
        continue;
      }

      const coord = unprojectCoordinates(px, py, projConfig);
      if (!coord) {
        data[idx + 3] = 0;
        continue;
      }

      const sample = sampleTerrainAtLatLon(coord.latitudeDeg, coord.longitudeDeg);

      let rgb: [number, number, number] | null;
      switch (mode) {
        case 'topography':
          // Polar display domain: the 83°S–90°S sheet holds −4.2…+4.6 km, so the global
          // ±9 km ramp would compress it into two adjacent stops (a flat yellow field).
          rgb = isUsableMetric(sample.elevationMeters) ? getPolarElevationRgb(sample.elevationMeters) : null;
          break;
        case 'hillshade': {
          if (!isUsableMetric(sample.hillshade)) { rgb = null; break; }
          const val = Math.round(sample.hillshade * 255);
          rgb = [val, val, val];
          break;
        }
        case 'slope':
          rgb = isUsableMetric(sample.slopeDeg) ? getSlopeRgb(sample.slopeDeg) : null;
          break;
        case 'geology':
          rgb = getGeologyUnitRgb(sample.geologicalUnitCode);
          break;
        case 'illumination':
          rgb = isUsableMetric(sample.annualIlluminationPct)
            ? getIlluminationRgb(sample.annualIlluminationPct, sample.isPermanentlyShadowed)
            : null;
          break;
        case 'volatiles': {
          const neutron = evaluateLendNeutronFlux(coord.latitudeDeg, coord.longitudeDeg);
          rgb = isUsableMetric(neutron.hydrogenWeightPct) ? getVolatilesRgb(neutron.hydrogenWeightPct) : null;
          break;
        }
        case 'temperature': {
          const thermal = evaluateDivinerTemperature(coord.latitudeDeg, coord.longitudeDeg);
          rgb = isUsableMetric(thermal.tempKelvin) ? getTemperatureRgb(thermal.tempKelvin) : null;
          break;
        }
        default:
          rgb = null;
      }

      if (rgb === null) {
        data[idx + 3] = 0;
        noDataCells++;
        continue;
      }

      data[idx] = rgb[0];
      data[idx + 1] = rgb[1];
      data[idx + 2] = rgb[2];
      data[idx + 3] = 230; // 90% opacity to blend harmoniously with graticule & vector overlay
      paintedCells++;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const result: MapRasterResult = {
    url: canvas.toDataURL('image/png'),
    coverage: { paintedCells, noDataCells },
  };
  RASTER_CACHE.set(mode, result);
  return result;
}

/** Data URL for a base layer, or `null` when the layer has no raster. */
export function generateScientificMapRasterUrl(
  mode: ScientificMapLayerMode,
  resolution = 360,
): string | null {
  return renderScientificMapRaster(mode, resolution).url;
}
