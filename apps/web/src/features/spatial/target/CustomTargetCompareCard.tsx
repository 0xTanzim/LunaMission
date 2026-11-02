import React from 'react';
import {
  CustomLandingTarget,
  CustomTargetEvaluation,
  FeasibilityGrade,
  TargetComparisonDeltas,
} from '@/domain/target/customTargetModel';

export interface CustomTargetCompareCardProps {
  target: CustomLandingTarget;
  evaluation: CustomTargetEvaluation;
  deltas: TargetComparisonDeltas;
  onClearTarget?: () => void;
  onEditTarget?: () => void;
}

const GRADE_STYLES: Record<FeasibilityGrade, { bg: string; text: string; label: string }> = {
  EXCELLENT: { bg: 'bg-[var(--lm-color-success-surface-strong)] border-[var(--lm-color-success)]/40', text: 'text-[var(--lm-color-success)]', label: 'EXCELLENT' },
  VIABLE: { bg: 'bg-[var(--lm-color-info-surface-strong)] border-[var(--lm-color-info)]/40', text: 'text-[var(--lm-color-info)]', label: 'VIABLE' },
  CONSTRAINED: { bg: 'bg-[var(--lm-color-warning-surface-strong)] border-[var(--lm-color-warning)]/40', text: 'text-[var(--lm-color-warning)]', label: 'CONSTRAINED' },
  HAZARDOUS: { bg: 'bg-[var(--lm-color-danger-surface-strong)] border-[var(--lm-color-danger)]/40', text: 'text-[var(--lm-color-danger)]', label: 'HAZARDOUS' },
};

function formatDelta(val: number, unit = '°'): string {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}${unit}`;
}

export function CustomTargetCompareCard({
  target,
  evaluation,
  deltas,
  onClearTarget,
  onEditTarget,
}: CustomTargetCompareCardProps) {
  const grade = GRADE_STYLES[deltas.feasibilityGrade];

  return (
    <div className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-warning)]/40 rounded-xl p-4 shadow-xl text-xs space-y-3">
      {/* Header with Title and Feasibility Grade */}
      <div className="flex items-start justify-between gap-2 border-b border-[var(--lm-color-border-subtle)] pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-[var(--lm-color-warning)] truncate">
            <span>📍</span>
            <span className="truncate">{target.name}</span>
          </div>
          <div className="text-[11px] font-mono text-[var(--lm-color-text-secondary)] mt-0.5">
            {target.latitudeDeg.toFixed(2)}°S, {target.longitudeDeg.toFixed(2)}°E • {evaluation.elevationMeters.toFixed(0)}m
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`px-2 py-0.5 rounded text-[11px] font-bold border ${grade.bg} ${grade.text}`}>
            {grade.label}
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-[var(--lm-color-warning)]">{deltas.feasibilityScore}</span>
            <span className="text-[11px] text-[var(--lm-color-text-muted)]">/100</span>
          </div>
        </div>
      </div>

      {/* Benchmark Candidate Delta Header */}
      <div className="text-[11px] text-[var(--lm-color-text-secondary)]">
        Benchmark vs <span className="font-semibold text-[var(--lm-color-text-primary)]">{deltas.nearestSiteName}</span>{' '}
        <span className="text-[var(--lm-color-text-muted)]">({deltas.distanceKm.toFixed(1)} km away)</span>
      </div>

      {/* Delta Metrics Grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded p-2 text-center">
          <span className="block text-[11px] text-[var(--lm-color-text-muted)]">Δ Sun</span>
          <span className={`font-mono font-bold ${deltas.deltaSunElevationDeg >= 0 ? 'text-[var(--lm-color-success)]' : 'text-[var(--lm-color-warning)]'}`}>
            {formatDelta(deltas.deltaSunElevationDeg)}
          </span>
        </div>
        <div className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded p-2 text-center">
          <span className="block text-[11px] text-[var(--lm-color-text-muted)]">Δ Earth</span>
          <span className={`font-mono font-bold ${deltas.deltaEarthElevationDeg >= 0 ? 'text-[var(--lm-color-success)]' : 'text-[var(--lm-color-warning)]'}`}>
            {formatDelta(deltas.deltaEarthElevationDeg)}
          </span>
        </div>
        <div className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded p-2 text-center">
          <span className="block text-[11px] text-[var(--lm-color-text-muted)]">Δ Slope</span>
          <span className={`font-mono font-bold ${deltas.deltaSlopeDeg <= 0 ? 'text-[var(--lm-color-success)]' : 'text-[var(--lm-color-danger)]'}`}>
            {formatDelta(deltas.deltaSlopeDeg)}
          </span>
        </div>
        <div className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded p-2 text-center">
          <span className="block text-[11px] text-[var(--lm-color-text-muted)]">Δ H₂O</span>
          <span className={`font-mono font-bold ${deltas.deltaIcePercent >= 0 ? 'text-[var(--lm-color-info)]' : 'text-[var(--lm-color-text-muted)]'}`}>
            {formatDelta(deltas.deltaIcePercent, '%')}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1 text-[11px]">
        {onEditTarget && (
          <button
            type="button"
            onClick={onEditTarget}
            className="text-[var(--lm-color-warning)] hover:text-[var(--lm-color-warning)] font-medium transition-colors"
          >
            ✏️ Edit Target
          </button>
        )}
        {onClearTarget && (
          <button
            type="button"
            onClick={onClearTarget}
            className="text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-danger)] transition-colors ml-auto"
          >
            ✕ Remove Pin
          </button>
        )}
      </div>
    </div>
  );
}
