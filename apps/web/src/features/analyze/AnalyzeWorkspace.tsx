import React, { useState } from 'react';
import { useScenarioEvaluation } from './hooks/useScenarioEvaluation';
import { useScenarioState } from '../../app/state/useScenarioState';
import { ExecutiveKpiStrip } from './components/ExecutiveKpiStrip';
import { SkyRibbonCanvas } from './components/SkyRibbonCanvas';
import { GanttTrackControls } from './components/GanttTrackControls';
import { GanttTimelineCanvas } from './components/GanttTimelineCanvas';
import { SkyRibbonOctantTable } from '../../shared/components/SkyRibbonOctantTable';
import { AccessibleTableMirror } from '../../shared/components/AccessibleTableMirror';

export const AnalyzeWorkspace: React.FC = () => {
  const { state, setPlayheadUtc } = useScenarioState();
  const { data, isLoading, error } = useScenarioEvaluation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAccessibleTables, setShowAccessibleTables] = useState(false);

  const startMs = new Date(state.missionEpoch.startUtc).getTime();
  const stopMs = new Date(state.missionEpoch.stopUtc).getTime();
  const currentEpochMs = new Date(state.activePlayheadUtc).getTime();
  const totalHours = Math.max(1, (stopMs - startMs) / 3600000);
  const elapsedHours = Math.max(0, (currentEpochMs - startMs) / 3600000);

  const handleStep = (deltaHours: number) => {
    const nextMs = Math.max(startMs, Math.min(stopMs, currentEpochMs + deltaHours * 3600000));
    setPlayheadUtc(new Date(nextMs).toISOString());
  };

  if (isLoading && !data) {
    return (
      <div className="p-8 text-center font-mono text-[var(--lm-color-info)] animate-pulse">
        SOLVING TOPOCENTRIC LUNAR ROOTS (ROLLE & BRENT EVENT-SPLITTER)...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 rounded-lg bg-[var(--lm-color-danger-surface)] border border-[var(--lm-color-danger-border)] text-[var(--lm-color-danger)] font-mono text-xs m-4">
        <div className="font-bold text-sm mb-1">{error.title} ({error.code})</div>
        <div className="mb-2">{error.detail}</div>
        <div className="text-[var(--lm-color-text-muted)]">{error.guidance}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* 1. Executive Mission Metrics */}
      <ExecutiveKpiStrip
        metrics={data.metrics}
        uncertaintyEnvelopes={data.uncertaintyEnvelopes}
      />

      {/* 2. Dual-Slope 360° Sky-Ribbon Horizon Profile */}
      <SkyRibbonCanvas
        intervals={data.intervals}
        horizonProfile={data.horizonProfile}
        activePlayheadEpochMs={currentEpochMs}
      />

      {/* 3. Operational Multi-Track Gantt Timeline */}
      <div className="rounded-lg border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)] shadow-md">
        <GanttTrackControls
          currentDateUtc={state.activePlayheadUtc}
          elapsedHours={elapsedHours}
          totalHours={totalHours}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onStepForward={() => handleStep(1)}
          onStepBackward={() => handleStep(-1)}
        />
        <GanttTimelineCanvas
          intervals={data.intervals}
          eventWhiskers={data.uncertaintyEnvelopes?.eventWhiskers}
          startEpochMs={startMs}
          stopEpochMs={stopMs}
          currentPlayheadEpochMs={currentEpochMs}
          onPlayheadChange={(ms) => setPlayheadUtc(new Date(ms).toISOString())}
        />
      </div>

      {/* 4. Accessible WCAG 2.2 AA Companion Tables Toggle */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAccessibleTables(!showAccessibleTables)}
          className="text-xs font-mono text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-info)] flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] p-1"
        >
          <span>{showAccessibleTables ? 'Hide' : 'Show'} Accessible Companion Tables (WCAG 2.2 AA)</span>
          <span className="text-[11px]">{showAccessibleTables ? '▲' : '▼'}</span>
        </button>
      </div>

      {showAccessibleTables && (
        <div className="space-y-4 pt-2 border-t border-[var(--lm-color-border-subtle)]/80">
          <SkyRibbonOctantTable
            siteName={data.siteName ?? data.siteInfo.siteName}
            intervals={data.intervals}
          />
          <AccessibleTableMirror
            siteName={data.siteName ?? data.siteInfo.siteName}
            intervals={data.intervals}
          />
        </div>
      )}
    </div>
  );
};
