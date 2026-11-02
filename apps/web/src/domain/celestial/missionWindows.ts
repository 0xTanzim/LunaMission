/**
 * Mission Landing Window & Temporal Feasibility Evaluator
 *
 * Evaluates lunar surface landing windows across multi-day mission durations
 * (e.g., 7 to 30 days), calculating continuous sunlight hours, maximum shadow
 * (battery endurance limit), and direct-to-Earth communication outage windows.
 *
 * Complies with the NASA Space Apps Challenge requirement to "compare landing sites and dates".
 */

import { CandidateSite } from '@/domain/sites/candidateSite';
import { CalculationMode } from '@/domain/celestial/calculationMode';
import { calculateSiteConditions } from '@/domain/celestial/siteConditions';
import { MS_PER_HOUR, MS_PER_DAY } from '@/domain/constants/time';
import { formatIsoUtc } from '@/domain/time/utcEpoch';

export interface TimelineSample {
  timestampMs: number;
  solarDiskFraction: number;
  isIlluminated: boolean;
  isEarthVisible: boolean;
  sunElevationDeg: number;
  earthElevationDeg: number;
}

export interface LandingWindowEvaluation {
  siteId: string;
  startDateIso: string;
  durationDays: number;
  totalHours: number;
  totalSunlightHours: number;
  continuousSunlightHours: number;
  sunlightPercentage: number;
  maxShadowHours: number;
  dteAvailabilityPercentage: number;
  maxDteOutageHours: number;
  timelineSamples: TimelineSample[];
}

/**
 * Evaluates temporal mission conditions for a candidate site over a specified landing window.
 * Samples conditions at uniform step intervals (default: 6 hours = 4 samples/day).
 */
export function evaluateLandingWindow(
  site: CandidateSite,
  startDate: Date,
  durationDays: number = 14,
  mode: CalculationMode = 'terrain-aware',
  stepHours: number = 6,
): LandingWindowEvaluation {
  const startMs = startDate.getTime();
  const totalHours = durationDays * 24;
  const numSteps = Math.max(1, Math.round(totalHours / stepHours));
  const stepMs = stepHours * MS_PER_HOUR;

  const timelineSamples: TimelineSample[] = [];
  let totalSunlitSteps = 0;
  let totalDteSteps = 0;

  let currentSunlitStreak = 0;
  let maxSunlitStreak = 0;

  let currentShadowStreak = 0;
  let maxShadowStreak = 0;

  let currentDteOutageStreak = 0;
  let maxDteOutageStreak = 0;

  for (let i = 0; i < numSteps; i++) {
    const sampleMs = startMs + i * stepMs;
    const sampleDate = new Date(sampleMs);
    const conditions = calculateSiteConditions(site, sampleDate, mode);

    const diskFraction =
      conditions.solarIlluminationFraction.kind === 'available'
        ? conditions.solarIlluminationFraction.value
        : 0;
    const isSunlit = conditions.solarIllumination !== 'shadowed' && diskFraction > 0.05;
    const isEarthVisible = conditions.earthVisibility === 'visible';

    const sunElev =
      conditions.sunElevationDeg.kind === 'available' ? conditions.sunElevationDeg.value : 0;
    const earthElev =
      conditions.earthElevationDeg.kind === 'available' ? conditions.earthElevationDeg.value : -90;

    if (isSunlit) {
      totalSunlitSteps++;
      currentSunlitStreak++;
      if (currentSunlitStreak > maxSunlitStreak) maxSunlitStreak = currentSunlitStreak;
      currentShadowStreak = 0;
    } else {
      currentShadowStreak++;
      if (currentShadowStreak > maxShadowStreak) maxShadowStreak = currentShadowStreak;
      currentSunlitStreak = 0;
    }

    if (isEarthVisible) {
      totalDteSteps++;
      currentDteOutageStreak = 0;
    } else {
      currentDteOutageStreak++;
      if (currentDteOutageStreak > maxDteOutageStreak) maxDteOutageStreak = currentDteOutageStreak;
    }

    timelineSamples.push({
      timestampMs: sampleMs,
      solarDiskFraction: diskFraction,
      isIlluminated: isSunlit,
      isEarthVisible,
      sunElevationDeg: Number(sunElev.toFixed(2)),
      earthElevationDeg: Number(earthElev.toFixed(2)),
    });
  }

  const totalSunlightHours = Math.round(totalSunlitSteps * stepHours);
  const continuousSunlightHours = Math.round(maxSunlitStreak * stepHours);
  const maxShadowHours = Math.round(maxShadowStreak * stepHours);
  const maxDteOutageHours = Math.round(maxDteOutageStreak * stepHours);

  const sunlightPercentage = Number(((totalSunlightHours / totalHours) * 100).toFixed(1));
  const dteAvailabilityPercentage = Number((((totalDteSteps * stepHours) / totalHours) * 100).toFixed(1));

  return {
    siteId: site.id,
    startDateIso: formatIsoUtc(startDate),
    durationDays,
    totalHours,
    totalSunlightHours,
    continuousSunlightHours,
    sunlightPercentage,
    maxShadowHours,
    dteAvailabilityPercentage,
    maxDteOutageHours,
    timelineSamples,
  };
}
