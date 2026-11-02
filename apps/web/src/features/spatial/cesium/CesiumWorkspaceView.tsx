import React, { useState } from 'react';
import { useScenarioState } from '../../../app/state/useScenarioState';
import { CesiumMoonGlobe, type CesiumCameraPreset } from './CesiumMoonGlobe';

interface CesiumWorkspaceViewProps {
  onReturnToObservatory?: () => void;
  className?: string;
}

export const CesiumWorkspaceView: React.FC<CesiumWorkspaceViewProps> = ({
  onReturnToObservatory,
  className = '',
}) => {
  const { state } = useScenarioState();
  const [cameraPreset, setCameraPreset] = useState<CesiumCameraPreset>('south-pole');
  const [tilesetStatus, setTilesetStatus] = useState<'tileset-3d' | 'basemap-lroc'>('basemap-lroc');

  const token =
    (import.meta as any).env?.VITE_CESIUM_ION_TOKEN ||
    (import.meta as any).env?.CESIUM_ION_TOKEN ||
    '';

  const handleReturn = () => {
    if (onReturnToObservatory) {
      onReturnToObservatory();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/explore';
    }
  };

  const handleSwitchToThreeJs = () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '#/scenario/3d-lab';
    }
  };

  return (
    <section
      role="region"
      aria-label="Cesium Ion 3D Photorealistic Moon Explorer"
      data-testid="cesium-workspace-view"
      className={`w-full h-[calc(100vh-8.5rem)] min-h-[600px] flex flex-col bg-[var(--lm-color-canvas)] rounded-xl border border-[var(--lm-color-border-subtle)] overflow-hidden shadow-2xl relative ${className}`}
    >
      {/* 1. Cockpit Header Toolbar */}
      <header className="h-12 bg-[var(--lm-color-surface)]/95 border-b border-[var(--lm-color-border-subtle)] px-4 flex items-center justify-between gap-3 shrink-0 z-10 font-mono text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReturn}
            className="text-[var(--lm-color-info)] hover:text-[var(--lm-color-info)] font-bold transition-colors cursor-pointer"
          >
            ← Cockpit
          </button>
          <span className="text-[var(--lm-color-text-muted)]">|</span>
          <span className="font-bold text-[var(--lm-color-text-primary)] uppercase tracking-wider">
            Cesium Ion 3D Lunar Tileset
          </span>
          {tilesetStatus === 'tileset-3d' ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--lm-color-success-surface)] text-[var(--lm-color-success)] border border-[var(--lm-color-success-border)] font-bold hidden sm:inline">
              Asset 2684829 (3D Mesh)
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] font-bold hidden sm:inline" title="Showing IAU Moon Ellipsoid with LROC 2K Basemap. Add Asset 2684829 from Cesium Depot for 3D elevation tiles.">
              Asset 2684829 • LROC Basemap
            </span>
          )}
        </div>

        {/* Camera Preset Controls */}
        <div className="flex items-center gap-1.5 bg-[var(--lm-color-canvas)] p-1 rounded-md border border-[var(--lm-color-border-subtle)]">
          <button
            type="button"
            onClick={() => setCameraPreset('global')}
            aria-pressed={cameraPreset === 'global'}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              cameraPreset === 'global' ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)]' : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]'
            }`}
          >
            Global
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('south-pole')}
            aria-pressed={cameraPreset === 'south-pole'}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              cameraPreset === 'south-pole' ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)]' : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]'
            }`}
          >
            South Pole
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('site')}
            aria-pressed={cameraPreset === 'site'}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              cameraPreset === 'site' ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)]' : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]'
            }`}
          >
            Focus Site
          </button>
        </div>

        <button
          type="button"
          onClick={handleSwitchToThreeJs}
          className="text-xs text-[var(--lm-color-warning)] hover:text-[var(--lm-color-warning)] hover:underline cursor-pointer hidden md:inline"
        >
          Switch to Three.js Shader Lab ➔
        </button>
      </header>

      {/* 2. Cesium Moon Globe Viewer or Missing Token Fallback */}
      <div className="flex-1 w-full h-full relative">
        {token ? (
          <CesiumMoonGlobe
            token={token}
            activeSiteId={state.primarySiteId}
            cameraPreset={cameraPreset}
            onTilesetStatus={setTilesetStatus}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[var(--lm-color-canvas)] text-[var(--lm-color-text-secondary)] font-mono text-xs text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--lm-color-warning-surface-strong)] border border-[var(--lm-color-warning-border)] flex items-center justify-center text-[var(--lm-color-warning)] text-xl font-bold">
              !
            </div>
            <div className="flex flex-col gap-1 max-w-md">
              <h3 className="text-sm font-bold text-[var(--lm-color-text-primary)] uppercase tracking-wider">
                Cesium Ion Token Configuration Required
              </h3>
              <p className="text-[var(--lm-color-text-muted)] leading-relaxed text-[11px]">
                VITE_CESIUM_ION_TOKEN is not configured in .env. Configure your token to enable photorealistic lunar tile streaming.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSwitchToThreeJs}
              className="px-4 py-2 bg-[var(--lm-color-info-fill)] hover:bg-[var(--lm-color-info-fill-hover)] text-[var(--lm-color-text-primary)] rounded-lg font-bold text-xs transition-colors cursor-pointer"
            >
              Launch Native Three.js 3D Lab (Offline Baseline)
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
