import { calculateSiteConditions } from './celestial/siteConditions';
import { CANDIDATE_SITES } from '../data/catalog';
import type { CalculationMode, CandidateSite } from '@luna/contracts';

export interface EphemerisQueryInput {
  siteId: string;
  epochMs: number;
  calculationMode?: CalculationMode;
}

export class EphemerisService {
  findSite(siteId: string): CandidateSite | undefined {
    return CANDIDATE_SITES.find((s) => s.id === siteId);
  }

  getConditions(input: EphemerisQueryInput) {
    const site = this.findSite(input.siteId);
    if (!site) return null;

    const mode: CalculationMode = input.calculationMode || 'geometry-only';
    const conditions = calculateSiteConditions(site, new Date(input.epochMs), mode);

    const solarElevationDeg =
      conditions.sunElevationDeg.kind === 'available' ? conditions.sunElevationDeg.value : null;
    const solarAzimuthDeg =
      conditions.sunAzimuthDeg.kind === 'available' ? conditions.sunAzimuthDeg.value : null;
    const earthElevationDeg =
      conditions.earthElevationDeg.kind === 'available' ? conditions.earthElevationDeg.value : null;
    const earthAzimuthDeg =
      conditions.earthAzimuthDeg.kind === 'available' ? conditions.earthAzimuthDeg.value : null;
    const earthDistanceKm =
      conditions.rangeKm.kind === 'available' ? conditions.rangeKm.value : 384400;
    const lightTimeSeconds =
      conditions.theoreticalOneWayLightTimeSeconds.kind === 'available'
        ? conditions.theoreticalOneWayLightTimeSeconds.value
        : 1.28;

    return {
      siteId: site.id,
      siteName: site.name,
      coordinates: site.coordinates,
      epochIso: conditions.epochUtc,
      epochMs: input.epochMs,
      calculationMode: mode,
      solarElevationDeg,
      solarAzimuthDeg,
      solarIllumination: conditions.solarIllumination,
      earthElevationDeg,
      earthAzimuthDeg,
      earthDistanceKm,
      lightTimeSeconds,
      provenance: conditions.provenance,
    };
  }
}

export const ephemerisService = new EphemerisService();
