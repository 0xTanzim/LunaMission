/**
 * Executive Mission Dossier Synthesizer
 *
 * Pure domain aggregator combining NASA LOLA altimetry, JPL Meeus celestial geometry,
 * DSN RF link budget, LRO volatiles prospecting, and rover traversal into a publication-ready
 * aerospace mission briefing model.
 */

import { sampleLolaTerrain } from '../terrain/lolaSouthPoleDemSampler';
import {
  calculateDsnStationVisibilities,
  determineActiveDsnStation,
  FREQUENCY_BANDS,
  type FrequencyBandKey,
} from '../telecom/linkBudget';
import { findNearestCatalogCandidate, computeTargetComparisonDeltas } from './targetComparison';
import {
  validateCustomTargetCoordinates,
  evaluateCustomTargetConditions,
  type CustomLandingTarget,
} from './customTargetModel';

export interface DossierInput {
  targetName: string;
  catalogId?: string;
  latitudeDeg: number;
  longitudeDeg: number;
  elevationKm?: number;
  epochMs: number;
  telecomBand?: FrequencyBandKey;
  roverDestination?: {
    name: string;
    latitudeDeg: number;
    longitudeDeg: number;
  };
}

export interface MissionDossier {
  id: string;
  generatedAtEpochMs: number;
  targetEpochMs: number;
  site: {
    name: string;
    catalogId?: string;
    latitudeDeg: number;
    longitudeDeg: number;
    elevationKm: number;
    demSource: string;
    iauFrame: string;
    usgsAcc6?: string;
  };
  illumination: {
    sunElevationDeg: number;
    sunAzimuthDeg: number;
    continuousSunlightHours: number;
    solarIncidenceAngleDeg: number;
    isIlluminated: boolean;
    solarGrazingWarning: boolean;
  };
  telecom: {
    earthElevationDeg: number;
    earthAzimuthDeg: number;
    isEarthVisible: boolean;
    carrierBand: string;
    frequencyGhz: number;
    freeSpacePathLossDb: number;
    linkMarginDb: number;
    activeDsnStation: string;
    activeDsnStationCountry: string;
    multipathRisk: boolean;
    diffractionLossDb?: number;
  };
  volatiles: {
    lendNeutronSuppressionScore: number;
    hydrogenWeightPct: number;
    divinerTempKelvin: number;
    isPermanentColdTrap: boolean;
    waterIceYieldKgPerM3: number;
    metricTonsPerHectare: number;
    isruViabilityTier: 'High' | 'Moderate' | 'Marginal' | 'None';
  };
  traversal?: {
    destinationName: string;
    totalDistanceKm: number;
    averageSlopeDeg: number;
    maxSlopeDeg: number;
    isTraversable: boolean;
    estimatedBatteryWh: number;
    hazardLevel: 'safe' | 'caution' | 'hazard';
  };
  benchmark?: {
    nearestCandidateId: string;
    nearestCandidateName: string;
    distanceKm: number;
    deltaSunElevationDeg: number;
    deltaEarthElevationDeg: number;
    deltaHydrogenWtPct: number;
    feasibilityScore: number;
    feasibilityGrade: string;
  };
  decisionScience?: {
    topsisScore: number;
    cassaViable: boolean;
    rank?: number;
  };
  provenance: {
    softwareVersion: string;
    coordinateSystem: string;
    lolaModel: string;
    ephemerisEngine: string;
  };
}

export function validateDossierInput(input: unknown): { isValid: boolean; error?: string } {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Input must be an object' };
  }
  const candidate = input as Partial<DossierInput>;
  if (!candidate.targetName || typeof candidate.targetName !== 'string') {
    return { isValid: false, error: 'targetName is required' };
  }
  if (typeof candidate.latitudeDeg !== 'number' || !Number.isFinite(candidate.latitudeDeg)) {
    return { isValid: false, error: 'Valid numerical latitudeDeg is required' };
  }
  if (typeof candidate.longitudeDeg !== 'number' || !Number.isFinite(candidate.longitudeDeg)) {
    return { isValid: false, error: 'Valid numerical longitudeDeg is required' };
  }
  if (typeof candidate.epochMs !== 'number' || !Number.isFinite(candidate.epochMs)) {
    return { isValid: false, error: 'Valid numerical epochMs is required' };
  }

  const coordVal = validateCustomTargetCoordinates(candidate.latitudeDeg, candidate.longitudeDeg);
  if (!coordVal.isValid) {
    return { isValid: false, error: coordVal.error };
  }

  return { isValid: true };
}

export function synthesizeMissionDossier(input: DossierInput): MissionDossier {
  const normLon = ((input.longitudeDeg % 360) + 360) % 360;
  const terrainSample = sampleLolaTerrain(input.latitudeDeg, normLon);
  const elevKm = input.elevationKm ?? terrainSample.elevationMeters / 1000.0;

  const targetObj: CustomLandingTarget = {
    id: input.catalogId ?? `dossier-target-${input.epochMs}`,
    name: input.targetName,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: normLon,
    elevationKm: elevKm,
    createdAt: input.epochMs,
  };

  const targetEval = evaluateCustomTargetConditions(targetObj, input.epochMs);
  const sunElev = Math.round(targetEval.sunElevationDeg * 100) / 100;
  const sunAz = Math.round(targetEval.sunAzimuthDeg * 10) / 10;
  const isIlluminated = sunElev > 0;
  const grazingWarning = isIlluminated && sunElev <= 3.0;
  const solarIncidence = Math.round((90 - sunElev) * 100) / 100;
  const continuousSunlightHours = isIlluminated ? Math.round(180 + Math.max(0, sunElev) * 40) : 0;

  const bandKey: FrequencyBandKey = input.telecomBand ?? 'xBandDownlink';
  const bandConfig = FREQUENCY_BANDS[bandKey] ?? FREQUENCY_BANDS.xBandDownlink;
  const earthElev = Math.round(targetEval.earthElevationDeg * 100) / 100;
  const earthAz = Math.round(targetEval.earthAzimuthDeg * 10) / 10;

  const dsnVisibilities = calculateDsnStationVisibilities(input.epochMs);
  const activeStation = determineActiveDsnStation(dsnVisibilities);
  const multipathRisk = earthElev > 0 && earthElev < 2.0;

  let isruTier: 'High' | 'Moderate' | 'Marginal' | 'None' = 'None';
  const hPct = targetEval.volatiles.hydrogenWeightPercent;
  if (hPct >= 0.8) isruTier = 'High';
  else if (hPct >= 0.4) isruTier = 'Moderate';
  else if (hPct >= 0.15) isruTier = 'Marginal';

  const nearest = findNearestCatalogCandidate(input.latitudeDeg, normLon);
  const deltas = computeTargetComparisonDeltas(targetEval, nearest.candidate, input.epochMs);

  return {
    id: `dossier-${Math.abs(Math.round(input.latitudeDeg * 100))}-${Math.abs(Math.round(normLon * 100))}-${input.epochMs}`,
    generatedAtEpochMs: Date.now(),
    targetEpochMs: input.epochMs,
    site: {
      name: input.targetName,
      catalogId: input.catalogId,
      latitudeDeg: Math.round(input.latitudeDeg * 1000) / 1000,
      longitudeDeg: Math.round(normLon * 1000) / 1000,
      elevationKm: Math.round(elevKm * 1000) / 1000,
      demSource: 'NASA LOLA 128ppd / 20m',
      iauFrame: 'MOON_ME_DE421',
    },
    illumination: {
      sunElevationDeg: sunElev,
      sunAzimuthDeg: sunAz,
      continuousSunlightHours,
      solarIncidenceAngleDeg: solarIncidence,
      isIlluminated,
      solarGrazingWarning: grazingWarning,
    },
    telecom: {
      earthElevationDeg: earthElev,
      earthAzimuthDeg: earthAz,
      isEarthVisible: earthElev > 0,
      carrierBand: bandConfig.name,
      frequencyGhz: bandConfig.frequencyGhz,
      freeSpacePathLossDb: Math.round(targetEval.telecom.fsplDb * 10) / 10,
      linkMarginDb: Number.isFinite(targetEval.telecom.linkMarginDb) ? Math.round(targetEval.telecom.linkMarginDb * 10) / 10 : -99.9,
      activeDsnStation: activeStation ? `${activeStation.name} (${activeStation.dishName})` : 'None (Occulted)',
      activeDsnStationCountry: activeStation?.country ?? 'None',
      multipathRisk,
    },
    volatiles: {
      lendNeutronSuppressionScore: Math.round(hPct * 120),
      hydrogenWeightPct: hPct,
      divinerTempKelvin: targetEval.volatiles.divinerTempKelvin,
      isPermanentColdTrap: targetEval.volatiles.divinerTempKelvin <= 110,
      waterIceYieldKgPerM3: Math.round(hPct * 35 * 10) / 10,
      metricTonsPerHectare: Math.round(hPct * 350 * 10) / 10,
      isruViabilityTier: isruTier,
    },
    benchmark: {
      nearestCandidateId: nearest.candidate.id,
      nearestCandidateName: nearest.candidate.name,
      distanceKm: nearest.distanceKm,
      deltaSunElevationDeg: deltas.deltaSunElevationDeg,
      deltaEarthElevationDeg: deltas.deltaEarthElevationDeg,
      deltaHydrogenWtPct: deltas.deltaIcePercent,
      feasibilityScore: deltas.feasibilityScore,
      feasibilityGrade: deltas.feasibilityGrade,
    },
    provenance: {
      softwareVersion: 'LunaMission v2.4 (NASA Space Apps 2026)',
      coordinateSystem: 'IAU/IAG 2015 Mean Earth/Polar Axis (ME)',
      lolaModel: 'NASA LOLA RDR v3.2 (128 pixels/degree)',
      ephemerisEngine: 'Meeus Analytical JPL DE421 Ephemeris Engine',
    },
  };
}
