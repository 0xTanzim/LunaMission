import React, { useEffect, useState } from 'react';
import { GlobeDiagnosticsMetrics } from '@/features/spatial/globe/scene/globeSceneBuilder';
import { CandidateSite } from '@/domain/sites/candidateSite';

export interface GlobeDiagnosticsOverlayProps {
  getDiagnostics: () => GlobeDiagnosticsMetrics | null;
  selectedSite: CandidateSite;
  epochIsoUtc?: string;
  isVisible: boolean;
  onToggleVisible?: () => void;
}

export function GlobeDiagnosticsOverlay({
  getDiagnostics,
  selectedSite,
  epochIsoUtc,
  isVisible,
  onToggleVisible,
}: GlobeDiagnosticsOverlayProps) {
  // Eager first read: the panel is populated on the first render instead of after
  // the first 200 ms poll tick (also makes SSR/static markup truthful).
  const [metrics, setMetrics] = useState<GlobeDiagnosticsMetrics | null>(() => getDiagnostics());

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      const data = getDiagnostics();
      if (data) setMetrics(data);
    }, 200);
    return () => clearInterval(interval);
  }, [isVisible, getDiagnostics]);

  if (!isVisible) return null;

  return (
    <div className="absolute top-14 right-3 z-30 pointer-events-auto bg-[var(--lm-color-canvas)]/90 backdrop-blur-md border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-sm)] p-3 shadow-lg font-mono text-[11px] text-[var(--lm-color-text-secondary)] w-72 max-w-[calc(100vw-24px)] flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-1.5">
        <span className="font-semibold text-[var(--lm-color-selected-site)] tracking-wide flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--lm-color-selected-site)]" />
          3D ENGINE DIAGNOSTICS
        </span>
        {onToggleVisible && (
          <button
            type="button"
            onClick={onToggleVisible}
            className="text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] text-xs px-1"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <span className="text-[var(--lm-color-text-muted)]">Frame Rate:</span>
        <span className="text-right font-medium text-[var(--lm-color-text-primary)]">
          {metrics ? `${metrics.fps} FPS` : '—'}
        </span>

        <span className="text-[var(--lm-color-text-muted)]">Frame Time (med):</span>
        <span className="text-right text-[var(--lm-color-text-primary)]">
          {metrics ? `${metrics.frameTimeMs.toFixed(1)} ms` : '—'}
        </span>

        <span className="text-[var(--lm-color-text-muted)]">Frame Time (p95):</span>
        <span className="text-right text-[var(--lm-color-text-primary)]">
          {metrics ? `${metrics.frameTimeP95Ms.toFixed(1)} ms` : '—'}
        </span>

        <span className="text-[var(--lm-color-text-muted)]">Draw Calls:</span>
        <span className="text-right text-[var(--lm-color-text-primary)]">
          {metrics ? metrics.drawCalls : '—'}
        </span>

        <span className="text-[var(--lm-color-text-muted)]">Triangles:</span>
        <span className="text-right text-[var(--lm-color-text-primary)]">
          {metrics ? metrics.triangles.toLocaleString() : '—'}
        </span>

        <span className="text-[var(--lm-color-text-muted)]">Dist to Target:</span>
        <span className="text-right text-[var(--lm-color-selected-site)]">
          {metrics ? `${metrics.cameraTargetDistance.toFixed(3)} u` : '—'}
        </span>

        <span className="text-[var(--lm-color-text-muted)]">Camera Near:</span>
        <span className="text-right text-[var(--lm-color-text-primary)]">
          {metrics ? `${metrics.cameraNear.toFixed(3)} u` : '—'}
        </span>

        <span className="text-[var(--lm-color-text-muted)]">Pixel Ratio:</span>
        <span className="text-right text-[var(--lm-color-text-primary)]">
          {metrics ? `${metrics.pixelRatio}x` : '—'}
        </span>

        <span className="text-[var(--lm-color-text-muted)]">Hardware Accel:</span>
        <span className="text-right text-[var(--lm-color-text-primary)]">
          {metrics ? (metrics.isSoftwareGl ? 'Software GL' : 'GPU Active') : '—'}
        </span>

        <span className="text-[var(--lm-color-text-muted)]">Terrain Mesh LOD:</span>
        <span className="text-right text-[var(--lm-color-info)] font-semibold">
          {metrics?.terrainLod ?? '—'}
        </span>

        <span className="text-[var(--lm-color-text-muted)]">Effective Posting:</span>
        <span className="text-right text-[var(--lm-color-text-secondary)] truncate" title={metrics?.terrainEffectiveResolution}>
          {metrics?.terrainEffectiveResolution ?? '—'}
        </span>
      </div>

      <div className="pt-1.5 border-t border-[var(--lm-color-border-subtle)] flex flex-col gap-0.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-[var(--lm-color-text-muted)]">Site:</span>
          <span className="text-[var(--lm-color-selected-site)] truncate max-w-[170px]" title={selectedSite.name}>
            {selectedSite.name}
          </span>
        </div>
        {epochIsoUtc && (
          <div className="flex justify-between">
            <span className="text-[var(--lm-color-text-muted)]">UTC Epoch:</span>
            <span className="text-[var(--lm-color-text-secondary)]">{epochIsoUtc}</span>
          </div>
        )}
        {metrics?.flyoverOrbitDeg !== undefined && (
          <div className="flex justify-between" data-testid="flyover-progress">
            <span className="text-[var(--lm-color-text-muted)]">Flyover Orbit:</span>
            <span className="text-[var(--lm-color-warning)]">
              {metrics.flyoverOrbitDeg}° / 360° — auto-circling the site about local up
            </span>
          </div>
        )}
      </div>

      {/* Task 5.3: explicit audience label — these are render diagnostics, not flight telemetry. */}
      <p className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)] border-t border-[var(--lm-color-border-subtle)] pt-1.5">
        Audience: engineering review. Render-performance diagnostics for this browser session — not
        spacecraft telemetry and not mission data.
      </p>
    </div>
  );
}
