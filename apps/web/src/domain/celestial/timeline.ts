/** Sampled instants across a Time Explorer window. */

import { CandidateSite } from '@/domain/sites/candidateSite';
import { CalculationMode } from '@/domain/celestial/calculationMode';
import { calculateSiteConditions } from '@/domain/celestial/siteConditions';

export interface TimelineDataPoint {
  timestampUtc: string;
  epochMs: number;
  sunElevationDeg: number | null;
  earthElevationDeg: number | null;
  solarIlluminated: boolean | null;
  earthVisible: boolean | null;
  hasDataGap?: boolean;
}

/**
 * Generate time-series points around the selected epoch for the Time Explorer chart.
 * Window: 24 hours (step 1 hour) or 7 days (step 6 hours).
 */
export function generateTimelineSeries(
  site: CandidateSite,
  centerDate: Date,
  windowHours: number = 24,
  stepHours: number = 1,
  mode: CalculationMode = 'terrain-aware'
): TimelineDataPoint[] {
  const points: TimelineDataPoint[] = [];
  const halfWindow = windowHours / 2;
  const totalSteps = Math.round(windowHours / stepHours);

  for (let i = -halfWindow; i <= halfWindow; i += stepHours) {
    const d = new Date(centerDate.getTime() + i * 3600 * 1000);
    const cond = calculateSiteConditions(site, d, mode);

    const sunElev = cond.sunElevationDeg.kind === 'available' ? cond.sunElevationDeg.value : null;
    const earthElev = cond.earthElevationDeg.kind === 'available' ? cond.earthElevationDeg.value : null;

    points.push({
      timestampUtc: cond.epochUtc,
      epochMs: d.getTime(),
      sunElevationDeg: sunElev,
      earthElevationDeg: earthElev,
      solarIlluminated: cond.solarIllumination === 'illuminated',
      earthVisible: cond.earthVisibility === 'visible',
      hasDataGap: false,
    });
  }

  return points;
}
