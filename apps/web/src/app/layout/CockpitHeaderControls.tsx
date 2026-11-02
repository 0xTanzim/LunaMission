import React from 'react';
import { useScenarioState } from '../state/useScenarioState';

const CANDIDATE_SITES = [
  { id: 'connecting-ridge', name: 'Connecting Ridge Point CR01', lat: -89.44, lon: 222.5 },
  { id: 'shackleton-rim', name: 'Shackleton Crater Rim', lat: -89.90, lon: 0.0 },
  { id: 'malapert-massif', name: 'Malapert Mountain (Massif)', lat: -85.99, lon: 0.0 },
  { id: 'peak-near-shackleton', name: 'Peak Near Shackleton', lat: -89.70, lon: 120.0 },
  { id: 'nobile-rim-1', name: 'Nobile Rim 1', lat: -85.20, lon: 53.5 },
  { id: 'de-gerlache-rim-2', name: 'de Gerlache Rim 2', lat: -88.50, lon: 292.0 },
  { id: 'haworth-rim', name: 'Haworth Crater Rim', lat: -87.40, lon: 350.0 },
  { id: 'nobile-rim-2', name: 'Nobile Rim 2', lat: -85.40, lon: 56.1 },
  { id: 'amundsen-rim', name: 'Amundsen Rim Crest', lat: -84.50, lon: 82.0 },
  { id: 'mons-mouton', name: 'Mons Mouton Plateau', lat: -84.60, lon: 329.0 },
];

export const CockpitHeaderControls: React.FC = () => {
  const {
    state,
    setPrimarySite,
    setMastHeight,
    setLaunchSlip,
  } = useScenarioState();

  return (
    <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
      {/* Site Selector */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="site-selector" className="text-[var(--lm-color-text-muted)] font-semibold">SITE:</label>
        <select
          id="site-selector"
          value={state.primarySiteId}
          onChange={(e) => setPrimarySite(e.target.value)}
          aria-label="Select Target Lunar Landing Site"
          className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-primary)] px-2 py-1.5 rounded focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] min-h-[32px] cursor-pointer"
        >
          {CANDIDATE_SITES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.lat.toFixed(1)}°S, {s.lon.toFixed(0)}°E)
            </option>
          ))}
        </select>
      </div>

      {/* Mast Height Selector */}
      <div className="flex items-center gap-1">
        <span className="text-[var(--lm-color-text-muted)] font-semibold">MAST:</span>
        <div className="flex bg-[var(--lm-color-canvas)] p-0.5 rounded border border-[var(--lm-color-border-subtle)]" role="group" aria-label="Observer Mast Height">
          {([1.0, 2.0, 5.0, 10.0] as const).map((h) => {
            const isSelected = state.observerMastHeightM === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setMastHeight(h)}
                aria-pressed={isSelected}
                className={`px-2 py-1 text-[11px] rounded transition-colors min-h-[32px] min-w-[32px] font-semibold focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] ${
                  isSelected
                    ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)] shadow'
                    : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-secondary)] hover:bg-[var(--lm-color-surface-strong)]'
                }`}
              >
                {h}m
              </button>
            );
          })}
        </div>
      </div>

      {/* Launch Slip Triage */}
      <div className="flex items-center gap-2 bg-[var(--lm-color-canvas)] px-2.5 py-1 rounded border border-[var(--lm-color-border-subtle)]">
        <label htmlFor="header-slip-slider" className="text-[var(--lm-color-text-muted)] font-semibold flex items-center gap-1">
          <span>SLIP:</span>
          <span className="text-[var(--lm-color-warning)] font-bold">+{state.launchSlipOffsetDays.toFixed(1)}d</span>
        </label>
        <input
          id="header-slip-slider"
          type="range"
          min="0"
          max="28"
          step="0.5"
          value={state.launchSlipOffsetDays}
          onChange={(e) => setLaunchSlip(parseFloat(e.target.value))}
          aria-label="Mission Launch Slip Offset in Days (0 to 28 days)"
          className="w-20 accent-[var(--lm-color-info)] cursor-pointer h-1.5 bg-[var(--lm-color-surface-strong)] rounded"
        />
        {state.launchSlipOffsetDays > 0 && (
          <button
            type="button"
            onClick={() => setLaunchSlip(0)}
            title="Reset Launch Slip to Nominal (0.0d)"
            aria-label="Reset Launch Slip to 0 days"
            className="text-[11px] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-danger)] px-1"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
