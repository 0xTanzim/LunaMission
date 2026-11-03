import React, { useState, useMemo } from 'react';
import { useScenarioEvaluation } from './hooks/useScenarioEvaluation';
import { useScenarioState } from '../../app/state/useScenarioState';
import { ExecutiveKpiStrip } from './ExecutiveKpiStrip';
import { SkyRibbonDeck } from '../sky-ribbon/SkyRibbonDeck';
import { horizonBinsFromIntervals } from '../sky-ribbon/skyRibbonSkyline';
import { PolarSkyRadarView } from './components/PolarSkyRadarView';
import { GanttTimelineCanvas } from '../timeline/GanttTimelineCanvas';
import { SkyRibbonCompassTable } from '../accessibility/SkyRibbonCompassTable';
import { GanttEventSequenceTable } from '../accessibility/GanttEventSequenceTable';
import { ApiStateView } from '@/shared/ui/ApiStateView';

export const AnalyzeWorkspaceView: React.FC = () => {
  const { data, error, isLoading, refetch } = useScenarioEvaluation();
  const { state, setHoveredAzimuth, setActiveBlocker } = useScenarioState();
  const [skyProjectionMode, setSkyProjectionMode] = useState<'ribbon' | 'radar'>('ribbon');

  if (isLoading && !data) {
    return (
      <div data-testid="analyze-view-loading" className="w-full p-4">
        <ApiStateView
          status="loading"
          message="Evaluating Lunar Topocentric Horizon & Visibility Windows..."
        />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div data-testid="analyze-view-error" className="w-full p-4">
        <ApiStateView
          status="failed"
          title={error.title || 'Scenario Evaluation Failed'}
          message={`${error.detail || 'Unable to compute topocentric horizon.'} [Code: ${error.code || 'UNKNOWN'}]`}
          guidance={error.guidance}
          onRetry={error.isRetryable ? refetch : undefined}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div data-testid="analyze-view-empty" className="w-full p-4">
        <ApiStateView
          status="empty"
          title="No Scenario Data"
          message="Select a candidate landing site and mission window to evaluate solar and Earth line-of-sight."
        />
      </div>
    );
  }

  // First sub-interval drives the Polar Sky Radar markers
  const initialInterval = data.intervals[0];

  // Live horizon profile: backend LOLA bins when published, otherwise the
  // backend's per-sub-interval skyline samples (re-shaped, never interpolated).
  const liveHorizonProfile = useMemo(
    () =>
      data.horizonProfile && data.horizonProfile.length > 0
        ? data.horizonProfile
        : horizonBinsFromIntervals(data.intervals),
    [data.horizonProfile, data.intervals],
  );

  const liveSunPoint = useMemo(
    () => (initialInterval ? {
      azimuthDeg: initialInterval.sun.meanAzimuthDeg,
      elevationDeg: initialInterval.sun.meanElevationDeg,
      status: initialInterval.sun.status,
    } : undefined),
    [initialInterval],
  );

  const liveEarthPoint = useMemo(
    () => (initialInterval ? {
      azimuthDeg: initialInterval.earth.meanAzimuthDeg,
      elevationDeg: initialInterval.earth.meanElevationDeg,
      status: initialInterval.earth.status,
    } : undefined),
    [initialInterval],
  );

  return (
    <div
      data-testid="analyze-workspace-view"
      className="flex flex-col gap-5 w-full min-w-0"
    >
      {data.status && data.status !== 'valid' && (
        <div data-testid="analyze-advisory-banner" className="w-full">
          <ApiStateView
            status={data.status}
            title={data.status === 'valid-with-limitations' ? 'Evaluation Valid With Limitations' : 'Approximate Evaluation'}
            message={`Scenario calculated with epistemic status "${data.status}". Physical constraints or analytical models active.`}
            compact
          />
        </div>
      )}

      {/* 1. Executive Constraint Margins (KPI Strip) */}
      <ExecutiveKpiStrip metrics={data.metrics} />

      {/* Projection Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 min-w-0 bg-[var(--lm-color-surface)] p-2.5 rounded-lg border border-[var(--lm-color-border-subtle)]">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="text-[11px] font-bold text-[var(--lm-color-text-secondary)] uppercase font-mono">
            Sky Projection Mode:
          </span>
          <div className="inline-flex rounded-md bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] p-0.5 gap-1">
            <button
              type="button"
              onClick={() => setSkyProjectionMode('ribbon')}
              aria-pressed={skyProjectionMode === 'ribbon'}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all min-h-[28px] ${
                skyProjectionMode === 'ribbon'
                  ? 'bg-[var(--lm-color-info)] text-[var(--lm-color-canvas)] shadow-sm'
                  : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)]'
              }`}
            >
              360° Sky-Ribbon (Panorama)
            </button>
            <button
              type="button"
              onClick={() => setSkyProjectionMode('radar')}
              aria-pressed={skyProjectionMode === 'radar'}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all min-h-[28px] ${
                skyProjectionMode === 'radar'
                  ? 'bg-[var(--lm-color-info)] text-[var(--lm-color-canvas)] shadow-sm'
                  : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)]'
              }`}
            >
              Circular Polar Radar (R07)
            </button>
          </div>
        </div>
        <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] hidden sm:inline">
          Dual-panel deck · strictly linear −5°…+10° grazing corridor (no scale break)
        </span>
      </div>

      {/* 2. Topocentric Visualizer (Sky-Ribbon or Polar Sky Radar) */}
      <div className="flex w-full max-w-full min-w-0 flex-col overflow-x-auto">
        {skyProjectionMode === 'ribbon' ? (
          <SkyRibbonDeck
            intervals={data.intervals}
            horizonProfile={liveHorizonProfile}
            eventWhiskers={data.uncertaintyEnvelopes.eventWhiskers}
            siteName={data.siteInfo.siteName}
            playheadUtc={state.activePlayheadUtc}
            solarCriterion={data.scenarioConfig.sunVisibilityCriterion ?? 'upperLimb'}
            earthCriterion={data.scenarioConfig.earthVisibilityCriterion ?? 'center'}
            hoveredAzimuthDeg={state.hoveredAzimuthDeg}
            onHoverAzimuth={setHoveredAzimuth}
            activeBlockerAzimuthDeg={state.activeBlockerAzimuthDeg}
            onSelectBlocker={setActiveBlocker}
          />
        ) : (
          <PolarSkyRadarView
            horizonBins={liveHorizonProfile}
            sunPoint={liveSunPoint}
            earthPoint={liveEarthPoint}
            targetSiteName={data.siteInfo.siteName}
          />
        )}
      </div>

      {/* 3. Operational Multi-Track Gantt Timeline */}
      <div className="w-full max-w-full min-w-0 overflow-x-auto">
        <GanttTimelineCanvas
          intervals={data.intervals}
          eventWhiskers={data.uncertaintyEnvelopes.eventWhiskers}
          startUtc={data.scenarioConfig.effectiveStartUtc}
          stopUtc={data.scenarioConfig.effectiveStopUtc}
        />
      </div>

      {/* 4. Accessible Companion Mirrors (WCAG 2.2 AA / Decision D-03 / D-07) */}
      <div className="flex flex-col gap-4 mt-2 w-full max-w-full min-w-0">
        <SkyRibbonCompassTable
          siteName={data.siteInfo.siteName}
          intervals={data.intervals}
          horizonProfile={liveHorizonProfile}
        />
        <GanttEventSequenceTable
          siteName={data.siteInfo.siteName}
          intervals={data.intervals}
          eventWhiskers={data.uncertaintyEnvelopes.eventWhiskers}
        />
      </div>
    </div>
  );
};
