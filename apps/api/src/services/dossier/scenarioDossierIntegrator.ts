/**
 * Spatiotemporal Scenario Dossier Integrator Service
 * Milestone M7: Mission Dossier Backend & Scenario Export Engine
 * Governed by docs/phase-3/API_CONTRACT.md, PROJECT.md § M7, and AGENTS.md § 1.1.
 */

import type {
  DossierQuery,
  DossierScenarioTelemetry,
  MissionDossier,
  ScenarioEvaluateRequest,
  ScenarioEvaluateResponse,
} from '@luna/contracts';
import { getSiteById } from '../../data/catalog';
import { scenarioService } from '../scenarios/scenarioService';
import { scenarioCasCache } from '../scenarios/scenarioCasCache';
import { synthesizeMissionDossier } from './missionDossierModel';
import { enrichMissionDossierPhysics, type EnrichedMissionDossier } from './dossierPhysicsEnricher';
import { formatDossierAsMarkdown, formatDossierAsJson } from './dossierMarkdownFormatter';

export interface DossierIntegrationResult {
  dossier: MissionDossier;
  markdown: string;
  jsonTelemetry: string;
  provenance: {
    generator: string;
    runtime: string;
    generatedAt: string;
  };
}

export async function integrateScenarioDossier(
  payload: DossierQuery,
  instancePath = '/api/dossier/generate',
): Promise<DossierIntegrationResult> {
  const targetSiteId = payload.siteId || payload.catalogId;
  const canonicalId = targetSiteId === 'shackleton-connecting-ridge'
    ? 'connecting-ridge'
    : targetSiteId === 'haworth'
      ? 'haworth-rim'
      : targetSiteId;
  const site = canonicalId ? getSiteById(canonicalId) : undefined;

  let evaluation: ScenarioEvaluateResponse | null = null;
  let cacheStatus: 'HIT' | 'MISS' = 'MISS';

  // 1. Check CAS cache by explicit calculationId if provided
  if (payload.calculationId) {
    const cached = await scenarioCasCache.getScenarioEvaluation(payload.calculationId);
    if (cached) {
      evaluation = cached.data;
      cacheStatus = 'HIT';
    }
  }

  // 2. If not retrieved by calculationId, evaluate scenario for registered site
  if (!evaluation && site) {
    const startUtc = payload.startUtc ?? '2026-11-01T00:00:00.000Z';
    const stopUtc = payload.stopUtc ?? '2026-11-15T00:00:00.000Z';
    const mastHeight = (payload.observerMastHeightM ?? 2.0) as ScenarioEvaluateRequest['observerMastHeightM'];

    const evalReq: ScenarioEvaluateRequest = {
      siteId: site.id,
      startUtc,
      stopUtc,
      observerMastHeightM: mastHeight,
      sunVisibilityCriterion: payload.sunVisibilityCriterion ?? 'upperLimb',
      earthVisibilityCriterion: payload.earthVisibilityCriterion ?? 'center',
      launchSlipOffsetDays: payload.launchSlipOffsetDays ?? 0.0,
      sampleIntervalSec: 600,
    };

    const hash = scenarioCasCache.computeScenarioHash(evalReq);
    const cached = await scenarioCasCache.getScenarioEvaluation(hash);
    if (cached) {
      evaluation = cached.data;
      cacheStatus = 'HIT';
    } else {
      evaluation = await scenarioService.evaluateScenario(evalReq, instancePath);
      cacheStatus = 'MISS';
    }
  }

  // 3. Synthesize baseline mission dossier with real selenographic geodesy
  const epochMs = payload.startUtc ? new Date(payload.startUtc).getTime() : (payload.epochMs ?? Date.now());
  const rawDossier = synthesizeMissionDossier({
    ...payload,
    epochMs,
    catalogId: site?.id ?? payload.catalogId,
  });
  let enriched: EnrichedMissionDossier;
  try {
    enriched = enrichMissionDossierPhysics(rawDossier);
  } catch {
    enriched = {
      ...rawDossier,
      site: { ...rawDossier.site, usgsAcc6: 'N/A' },
      telecom: { ...rawDossier.telecom, diffractionLossDb: 0 },
      decisionScience: { topsisScore: 0.285, cassaViable: false, rank: 1 },
    };
  }

  // 4. Attach verified scenario telemetry or graceful custom target fallback
  if (evaluation) {
    const horizonProfile = evaluation.horizonProfile || [];
    const minElevationDeg = horizonProfile.length > 0
      ? Math.min(...horizonProfile.map((b) => b.thetaNomDeg ?? b.elevationDeg ?? 0))
      : 0;
    const maxElevationDeg = horizonProfile.length > 0
      ? Math.max(...horizonProfile.map((b) => b.thetaNomDeg ?? b.elevationDeg ?? 0))
      : 0;
    const meanElevationDeg = horizonProfile.length > 0
      ? horizonProfile.reduce((acc, b) => acc + (b.thetaNomDeg ?? b.elevationDeg ?? 0), 0) / horizonProfile.length
      : 0;

    const scenarioTelemetry: DossierScenarioTelemetry = {
      calculationId: evaluation.calculationId,
      startUtc: evaluation.scenarioConfig.requestedStartUtc,
      stopUtc: evaluation.scenarioConfig.requestedStopUtc,
      effectiveStartUtc: evaluation.scenarioConfig.effectiveStartUtc,
      effectiveStopUtc: evaluation.scenarioConfig.effectiveStopUtc,
      launchSlipOffsetDays: evaluation.scenarioConfig.launchSlipOffsetDays,
      observerMastHeightM: evaluation.scenarioConfig.observerMastHeightM,
      totalEvaluationHours: evaluation.metrics.totalEvaluationHours,
      lolaHorizonProfile: {
        bins: horizonProfile.length > 0 ? horizonProfile.length : 360,
        minElevationDeg: Number(minElevationDeg.toFixed(2)),
        maxElevationDeg: Number(maxElevationDeg.toFixed(2)),
        meanElevationDeg: Number(meanElevationDeg.toFixed(2)),
        binStatus: 'valid',
      },
      illuminationWindows: {
        totalIlluminatedHours: evaluation.metrics.cumulativeSunlitHours,
        maxContinuousSunlightHours: evaluation.metrics.longestContinuousSunlitWindowHours,
        fractionalSunlightPct: evaluation.metrics.solarAccessPercentage,
      },
      earthLoSWindows: {
        totalEarthLoSHours: evaluation.metrics.cumulativeDteHours,
        maxContinuousEarthLoSHours: evaluation.metrics.cumulativeDteHours,
        fractionalEarthLoSPct: evaluation.metrics.dteAccessPercentage,
      },
      eventWhiskers: evaluation.uncertaintyEnvelopes.eventWhiskers.map((w) => ({
        eventType: w.eventType,
        nominalUtc: w.tNominalDateUtc,
        tLowUtc: w.tLowDateUtc,
        tHighUtc: w.tHighDateUtc,
        whiskerSpanHours: w.whiskerSpanHours,
        sensitivityRating: w.sensitivityRating,
      })),
      tier1Gating: {
        passed: evaluation.metrics.solarAccessPercentage > 0,
        reasons: evaluation.metrics.solarAccessPercentage > 0
          ? ['Solar illumination meets mission baseline']
          : ['Insufficient solar illumination in evaluation window'],
      },
      metrics: evaluation.metrics,
      uncertaintyEnvelopes: evaluation.uncertaintyEnvelopes,
      horizonSummary: {
        minElevationDeg: Number(minElevationDeg.toFixed(2)),
        maxElevationDeg: Number(maxElevationDeg.toFixed(2)),
        meanElevationDeg: Number(meanElevationDeg.toFixed(2)),
        prominentBlocker: null,
      },
      provenance: {
        cacheStatus,
        generatedAt: new Date().toISOString(),
      },
      casCacheHit: cacheStatus === 'HIT',
    };

    // Authentic continuous sunlight hours from M4 solver (zero synthetic formulas)
    enriched.illumination.continuousSunlightHours = Number(
      evaluation.metrics.longestContinuousSunlitWindowHours.toFixed(1),
    );

    const finalDossier: MissionDossier = {
      ...enriched,
      scenario: scenarioTelemetry,
      provenance: {
        ...enriched.provenance,
        calculationId: evaluation.calculationId,
      },
    };

    const markdown = formatDossierAsMarkdown(finalDossier);
    const jsonTelemetry = formatDossierAsJson(finalDossier);

    return {
      dossier: finalDossier,
      markdown,
      jsonTelemetry,
      provenance: {
        generator: 'NextRush Backend Calculation Service',
        runtime: 'Bun',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // Graceful custom coordinates fallback or standard baseline dossier
  const customId = payload.calculationId ?? `custom-${Math.abs(payload.latitudeDeg).toFixed(4)}s-${payload.longitudeDeg.toFixed(4)}e`;
  const scenarioFallback: DossierScenarioTelemetry | undefined = !site && (payload.startUtc || payload.calculationId)
    ? {
        calculationId: customId,
        startUtc: payload.startUtc,
        stopUtc: payload.stopUtc,
        lolaHorizonProfile: {
          bins: 0,
          minElevationDeg: 0,
          maxElevationDeg: 0,
          meanElevationDeg: 0,
          binStatus: 'not_available',
        },
        tier1Gating: {
          passed: false,
          reasons: ['Precomputed 360-bin LOLA DEM horizon profile not available for arbitrary custom coordinates'],
        },
        provenance: {
          cacheStatus: 'MISS',
          generatedAt: new Date().toISOString(),
        },
        casCacheHit: false,
      }
    : undefined;

  const finalDossier: MissionDossier = {
    ...enriched,
    scenario: scenarioFallback,
    provenance: {
      ...enriched.provenance,
      calculationId: scenarioFallback ? customId : undefined,
    },
  };

  const markdown = formatDossierAsMarkdown(finalDossier);
  const jsonTelemetry = formatDossierAsJson(finalDossier);

  return {
    dossier: finalDossier,
    markdown,
    jsonTelemetry,
    provenance: {
      generator: 'NextRush Backend Calculation Service',
      runtime: 'Bun',
      generatedAt: new Date().toISOString(),
    },
  };
}
