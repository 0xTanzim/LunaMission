import React from 'react';
import { useScenarioState } from '../../app/state/useScenarioState';
import { PolarStereoMapCanvas } from './components/PolarStereoMapCanvas';
import { CATALOG_SITES } from '../workspace/ScenarioConfigBar';

export const ExploreWorkspace: React.FC = () => {
  const { state, setPrimarySite, setProjection } = useScenarioState();

  const selectedSite = CATALOG_SITES.find((s) => s.id === state.primarySiteId) || CATALOG_SITES[0];

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="p-3 bg-[var(--lm-color-surface)]/90 border border-[var(--lm-color-border-subtle)] rounded-lg font-mono flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-[var(--lm-color-text-primary)]">LUNAR SOUTH POLE SPATIAL DISCOVERY (80°S – 90°S)</span>
          <span className="text-[var(--lm-color-text-muted)] block text-[11px]">
            Interactive polar stereographic projection referencing LOLA DEM topography.
          </span>
        </div>
        <div className="text-right text-[11px] text-[var(--lm-color-info)] font-semibold uppercase">
          DATUM: MOON_ME (R=1,737,400m)
        </div>
      </div>

      {/* Split Pane: Map + Site Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: 2D Polar Stereographic Canvas (2 Cols) */}
        <div className="lg:col-span-2">
          <PolarStereoMapCanvas />
        </div>

        {/* Right: Selected Site Profile & Fast Actions (1 Col) */}
        <div className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-lg p-4 space-y-4 font-mono text-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-[var(--lm-color-border-subtle)] pb-3">
              <span className="text-[11px] uppercase font-bold text-[var(--lm-color-info)] tracking-wider">
                Active Landing Site
              </span>
              <h2 className="text-base font-bold text-[var(--lm-color-text-primary)] mt-1">{selectedSite.name}</h2>
              <span className="text-[11px] text-[var(--lm-color-text-muted)]">ID: {selectedSite.id}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-[var(--lm-color-surface)]/80 rounded border border-[var(--lm-color-border-subtle)]">
                <span className="text-[var(--lm-color-text-muted)] block">Latitude</span>
                <span className="text-[var(--lm-color-text-secondary)] font-bold">{Math.abs(selectedSite.lat).toFixed(2)}°S</span>
              </div>
              <div className="p-2 bg-[var(--lm-color-surface)]/80 rounded border border-[var(--lm-color-border-subtle)]">
                <span className="text-[var(--lm-color-text-muted)] block">Longitude</span>
                <span className="text-[var(--lm-color-text-secondary)] font-bold">{selectedSite.lon.toFixed(2)}°E</span>
              </div>
              <div className="p-2 bg-[var(--lm-color-surface)]/80 rounded border border-[var(--lm-color-border-subtle)]">
                <span className="text-[var(--lm-color-text-muted)] block">Observer Mast</span>
                <span className="text-[var(--lm-color-text-secondary)] font-bold">{state.observerMastHeightM.toFixed(1)} m</span>
              </div>
              <div className="p-2 bg-[var(--lm-color-surface)]/80 rounded border border-[var(--lm-color-border-subtle)]">
                <span className="text-[var(--lm-color-text-muted)] block">Launch Slip</span>
                <span className="text-[var(--lm-color-warning)] font-bold">+{state.launchSlipOffsetDays.toFixed(1)}d</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="site-select-explore" className="text-[var(--lm-color-text-muted)] text-[11px] block font-semibold">
                Select Alternative Site:
              </label>
              <select
                id="site-select-explore"
                value={state.primarySiteId}
                onChange={(e) => setPrimarySite(e.target.value)}
                className="w-full bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] p-2 rounded text-xs focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
              >
                {CATALOG_SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.lat.toFixed(1)}°S, {s.lon.toFixed(0)}°E)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Workflow Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-[var(--lm-color-border-subtle)]">
            <button
              type="button"
              onClick={() => setProjection('analyze')}
              className="w-full py-2 px-3 bg-[var(--lm-color-info-fill)] hover:bg-[var(--lm-color-info-fill-hover)] text-[var(--lm-color-text-primary)] rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] min-h-[36px]"
            >
              <span>Analyze Topocentric Geometry (Alt+2)</span>
              <span>→</span>
            </button>
            <button
              type="button"
              onClick={() => setProjection('compare')}
              className="w-full py-2 px-3 bg-[var(--lm-color-surface)] hover:bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] border border-[var(--lm-color-border)] rounded font-semibold text-xs flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] min-h-[36px]"
            >
              <span>Compare Site Options (Alt+3)</span>
              <span>⇄</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
