/**
 * Scenario Summary Metrics & Event Whisker Calculation
 * Milestone M5: Summary Metrics & Uncertainty Envelopes
 * Governed by docs/phase-3/API_CONTRACT.md § 3.
 */

import type {
  EvaluatedSubInterval,
  EventWhisker,
  HorizonProfile,
  SummaryMetrics,
} from '@luna/contracts';
import type { VisibilityEvent, VisibilitySummaryMetrics } from '../celestial/visibilityTypes';
import { horizonProfileService } from '../celestial/horizonProfileService';

export * from './scenarioSubIntervals';

/**
 * Restates the nominal summary with the illumination and contact figures of a terrain
 * sensitivity bracket, so a single response carries nominal, optimistic and pessimistic
 * metrics blocks of identical shape.
 */
export function buildSensitivityMetrics(
  nominal: SummaryMetrics,
  envelope: VisibilitySummaryMetrics,
  totalHours: number,
): SummaryMetrics {
  const round2 = (value: number) => Number(value.toFixed(2));
  return {
    ...nominal,
    cumulativeSunlitHours: round2(envelope.totalSunlitHours),
    solarAccessPercentage: round2(envelope.sunlightPercentage),
    longestContinuousSunlitWindowHours: round2(envelope.continuousSunlightMaxHours),
    longestContinuousDarkWindowHours: round2(envelope.maxContinuousShadowHours),
    cumulativeDteHours: round2((envelope.dteAvailabilityPercentage * totalHours) / 100.0),
    dteAccessPercentage: round2(envelope.dteAvailabilityPercentage),
    longestDteGapHours: round2(envelope.maxDteOutageHours),
    cumulativeOverlapHours: round2(envelope.combinedSunAndEarthHours),
    overlapPercentage: round2(envelope.combinedSunAndEarthPercentage),
  };
}

export function computeSummaryMetrics(
  intervals: EvaluatedSubInterval[],
  totalHours: number,
): SummaryMetrics {
  let sunlitHours = 0;
  let dteHours = 0;
  let overlapHours = 0;
  let shadowPenaltyHours = 0;

  let currentSunlit = 0;
  let maxSunlit = 0;
  let currentDark = 0;
  let maxDark = 0;
  let currentDteGap = 0;
  let maxDteGap = 0;

  for (const int of intervals) {
    const isSun = int.sun.status === 'full_sun' || int.sun.status === 'partial_limb';
    const isDte = int.earth.status === 'visible';
    const isOverlap = int.overlap.status === 'sun_and_earth';

    if (isSun) {
      sunlitHours += int.durationHours;
      currentSunlit += int.durationHours;
      if (currentDark > 0) {
        maxDark = Math.max(maxDark, currentDark);
        currentDark = 0;
      }
    } else {
      currentDark += int.durationHours;
      if (currentSunlit > 0) {
        maxSunlit = Math.max(maxSunlit, currentSunlit);
        currentSunlit = 0;
      }
    }

    if (isDte) {
      dteHours += int.durationHours;
      if (currentDteGap > 0) {
        maxDteGap = Math.max(maxDteGap, currentDteGap);
        currentDteGap = 0;
      }
    } else {
      currentDteGap += int.durationHours;
    }

    if (isOverlap) {
      overlapHours += int.durationHours;
    }

    if (int.sun.status === 'terrain_shadow') {
      shadowPenaltyHours += int.durationHours;
    }
  }

  maxSunlit = Math.max(maxSunlit, currentSunlit);
  maxDark = Math.max(maxDark, currentDark);
  maxDteGap = Math.max(maxDteGap, currentDteGap);

  const solarPct = totalHours > 0 ? (sunlitHours / totalHours) * 100.0 : 0.0;
  const dtePct = totalHours > 0 ? (dteHours / totalHours) * 100.0 : 0.0;
  const overlapPct = totalHours > 0 ? (overlapHours / totalHours) * 100.0 : 0.0;

  return {
    totalEvaluationHours: Number(totalHours.toFixed(2)),
    cumulativeSunlitHours: Number(sunlitHours.toFixed(2)),
    solarAccessPercentage: Number(solarPct.toFixed(2)),
    longestContinuousSunlitWindowHours: Number(maxSunlit.toFixed(2)),
    longestContinuousDarkWindowHours: Number(maxDark.toFixed(2)),
    cumulativeDteHours: Number(dteHours.toFixed(2)),
    dteAccessPercentage: Number(dtePct.toFixed(2)),
    longestDteGapHours: Number(maxDteGap.toFixed(2)),
    cumulativeOverlapHours: Number(overlapHours.toFixed(2)),
    overlapPercentage: Number(overlapPct.toFixed(2)),
    topographicShadowPenaltyHours: Number(shadowPenaltyHours.toFixed(2)),
  };
}

export function buildEventWhiskers(
  events: VisibilityEvent[],
  horizonProfile?: HorizonProfile,
): EventWhisker[] {
  return events.slice(0, 20).map((ev) => {
    const isSunrise = ev.target === 'Sun' && ev.type === 'RISE';
    const isSunset = ev.target === 'Sun' && ev.type === 'SET';
    const isEarthRise = ev.target === 'Earth' && ev.type === 'RISE';
    const eventType = isSunrise
      ? 'SUNRISE'
      : isSunset
        ? 'SUNSET'
        : isEarthRise
          ? 'EARTH_RISE'
          : 'EARTH_SET';

    const nominalMs = ev.epochMs;

    let deltaThetaLow = 0.05;
    let deltaThetaHigh = 0.05;

    if (horizonProfile) {
      const thetaNom = horizonProfileService.evaluateHorizonAtAzimuth(
        horizonProfile,
        ev.azimuthDeg,
        'nominal',
      );
      const thetaLow = horizonProfileService.evaluateHorizonAtAzimuth(
        horizonProfile,
        ev.azimuthDeg,
        'low',
      );
      const thetaHigh = horizonProfileService.evaluateHorizonAtAzimuth(
        horizonProfile,
        ev.azimuthDeg,
        'high',
      );

      deltaThetaLow = Math.max(0.01, thetaNom - thetaLow);
      deltaThetaHigh = Math.max(0.01, thetaHigh - thetaNom);
    }

    // Apparent celestial elevation rate: Sun ~0.045 deg/h in polar grazing, Earth ~0.035 deg/h in libration
    const rateDegHr = ev.target === 'Sun' ? 0.045 : 0.035;

    const tLowDeltaHours = Math.min(24.0, deltaThetaLow / rateDegHr);
    const tHighDeltaHours = Math.min(24.0, deltaThetaHigh / rateDegHr);

    // Rise: lower terrain => rises earlier (-tLow), higher terrain => rises later (+tHigh)
    // Set: lower terrain => sets later (+tLow), higher terrain => sets earlier (-tHigh)
    const isRise = ev.type === 'RISE';
    const tLowMs = isRise
      ? nominalMs - tLowDeltaHours * 3600000
      : nominalMs + tLowDeltaHours * 3600000;
    const tHighMs = isRise
      ? nominalMs + tHighDeltaHours * 3600000
      : nominalMs - tHighDeltaHours * 3600000;

    const whiskerSpanHours = Number((tLowDeltaHours + tHighDeltaHours).toFixed(2));
    const rating: 'LOW' | 'MODERATE' | 'HIGH' =
      whiskerSpanHours < 2.0 ? 'LOW' : whiskerSpanHours < 6.0 ? 'MODERATE' : 'HIGH';

    return {
      eventEpochMs: nominalMs,
      eventDateUtc: new Date(nominalMs).toISOString(),
      eventType,
      azimuthDeg: Number(ev.azimuthDeg.toFixed(2)),
      tLowDateUtc: new Date(Math.min(tLowMs, tHighMs)).toISOString(),
      tNominalDateUtc: new Date(nominalMs).toISOString(),
      tHighDateUtc: new Date(Math.max(tLowMs, tHighMs)).toISOString(),
      whiskerSpanHours,
      sensitivityRating: rating,
    };
  });
}
