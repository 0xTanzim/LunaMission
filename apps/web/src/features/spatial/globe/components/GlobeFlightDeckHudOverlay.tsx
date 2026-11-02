import { Mountain, Target } from 'lucide-react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';
import {
  SelenographicLatitudeDeg,
  SelenographicLongitudeDeg,
} from '@/domain/coordinates/frames';
import { GlobeDiagnosticsMetrics } from '@/features/spatial/globe/scene/globeSceneBuilder';
import { GlobeDiagnosticsOverlay } from './GlobeDiagnosticsOverlay';

export interface GlobeFlightDeckHudOverlayProps {
  cameraPreset: CameraPreset;
  onCameraPresetChange?: (preset: CameraPreset) => void;
  selectedSite: CandidateSite;
  subSolarLatDeg: SelenographicLatitudeDeg;
  subSolarLonDeg: SelenographicLongitudeDeg;
  subEarthLatDeg: SelenographicLatitudeDeg;
  subEarthLonDeg: SelenographicLongitudeDeg;
  earthElevationValue?: number | null;
  showDiagnostics?: boolean;
  getDiagnostics?: () => GlobeDiagnosticsMetrics | null;
  epochIsoUtc?: string;
}

/**
 * Modular flight deck HUD overlay for the unified 3D Moon experience.
 * Presents Tactical Overhead HUD, Crater Rim Horizon Perspective,
 * and Telemetry Diagnostics without game-style rover driving mechanics.
 */
export function GlobeFlightDeckHudOverlay({
  cameraPreset,
  selectedSite,
  showDiagnostics = false,
  getDiagnostics,
  epochIsoUtc,
}: GlobeFlightDeckHudOverlayProps) {
  return (
    <>
      {cameraPreset === 'horizon' && (
        <aside
          data-testid="horizon-hud"
          aria-label="Crater Rim Horizon Perspective HUD"
          className="absolute top-14 right-4 z-20 pointer-events-auto bg-[var(--lm-color-surface)]/95 backdrop-blur-md border border-[var(--lm-color-warning)]/50 rounded-[var(--lm-radius-md)] px-4 py-2 text-xs font-mono shadow-2xl flex flex-col gap-1.5 max-w-lg"
        >
          <div className="flex items-center justify-between border-b border-[var(--lm-color-warning)]/30 pb-1">
            <span className="flex items-center gap-1.5 font-bold text-[var(--lm-color-warning)] uppercase tracking-wider">
              <Mountain className="w-3.5 h-3.5 text-[var(--lm-color-warning)]" />
              <span>Crater Rim Ground Horizon Perspective • {selectedSite.code}</span>
            </span>
          </div>
          <div className="text-[11px] text-[var(--lm-color-text-secondary)] flex items-center justify-between">
            <span>Orbit Controls: <strong className="text-[var(--lm-color-text-primary)]">Drag</strong> to orbit horizon • <strong className="text-[var(--lm-color-text-primary)]">Scroll</strong> to zoom</span>
            <span className="text-[var(--lm-color-warning)]/90 text-[11px]">Ridge Horizon Overlook</span>
          </div>
        </aside>
      )}

      {cameraPreset === 'overhead' && (
        <aside
          data-testid="overhead-hud"
          aria-label="Overhead Tactical Nadir HUD"
          className="absolute top-14 right-4 z-20 pointer-events-none bg-[var(--lm-color-surface)]/95 backdrop-blur-md border border-[var(--lm-color-success)]/50 rounded-[var(--lm-radius-md)] px-3.5 py-1.5 text-xs font-mono shadow-2xl flex items-center gap-3 max-w-[calc(100%-2rem)] flex-wrap"
        >
          <div className="flex items-center gap-1.5 text-[var(--lm-color-success)] font-semibold text-[11px]">
            <Target className="w-3.5 h-3.5 text-[var(--lm-color-success)]" />
            <span>OVERHEAD NADIR • {selectedSite.code}</span>
          </div>
          <div className="text-[11px] text-[var(--lm-color-text-secondary)] border-l border-[var(--lm-color-success)]/30 pl-3 flex items-center gap-2">
            <span>Tactical 84° Nadir</span>
            <span>•</span>
            <span>Drag to rotate azimuth • Scroll to zoom</span>
          </div>
        </aside>
      )}

      {showDiagnostics && getDiagnostics && (
        <GlobeDiagnosticsOverlay
          getDiagnostics={getDiagnostics}
          selectedSite={selectedSite}
          epochIsoUtc={epochIsoUtc}
          isVisible={showDiagnostics}
        />
      )}
    </>
  );
}
