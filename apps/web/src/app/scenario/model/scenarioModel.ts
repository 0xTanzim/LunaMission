import { CalculationMode } from '@/domain/celestial/calculationMode';
import { CelestialGeometryResult } from '@/domain/celestial/geometryResult';
import { calculateSiteConditions } from '@/domain/celestial/siteConditions';
import { calculateLunarEphemeris, LunarEphemerisVectors } from '@/domain/celestial/ephemeris';
import { getJulianDate } from '@/domain/time/julianDate';
import { formatIsoUtc } from '@/domain/time/utcEpoch';
import { CandidateSite } from '@/domain/sites/candidateSite';

/**
 * Everything a view needs for one scenario, derived from the canonical inputs.
 * Derived values are computed, never stored: there is a single place where the
 * epoch, the selected site and the calculation mode become numbers.
 */
export interface ScenarioModel {
  site: CandidateSite;
  epochMs: number;
  /** ISO-8601 UTC serialization of `epochMs`; presentation and provenance only. */
  epochIsoUtc: string;
  julianDate: number;
  calculationMode: CalculationMode;
  conditions: CelestialGeometryResult;
  /** Frame: selenographic sub-solar and sub-Earth points plus Earth-Moon range. */
  ephemeris: LunarEphemerisVectors;
}

export function deriveScenarioModel(
  site: CandidateSite,
  epochMs: number,
  calculationMode: CalculationMode,
): ScenarioModel {
  const date = new Date(epochMs);
  const julianDate = getJulianDate(date);
  return {
    site,
    epochMs,
    epochIsoUtc: formatIsoUtc(date),
    julianDate,
    calculationMode,
    conditions: calculateSiteConditions(site, date, calculationMode),
    ephemeris: calculateLunarEphemeris(julianDate),
  };
}
