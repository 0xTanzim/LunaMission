import React from 'react';
import { CANDIDATE_SITES } from '@luna/contracts';
import { useScenarioState } from '../../app/state/useScenarioState';
import { DURATION_TIPS, MAST_TIPS, MAST_VEHICLE_SHORT } from '@/shared/mission/scenarioConfigTips';
import { IconDossier } from '@/app/components/icons/lmIcons';

export const CATALOG_SITES = CANDIDATE_SITES.map((s) => ({
  id: s.id,
  name: s.name,
  lat: s.coordinates.latitudeDeg,
  lon: s.coordinates.longitudeDeg,
}));

export interface ScenarioConfigBarProps {
  onOpenDossier?: () => void;
}

export const ScenarioConfigBar: React.FC<ScenarioConfigBarProps> = ({ onOpenDossier }) => {
  const {
    state,
    setPrimarySite,
    setMissionEpoch,
    setMastHeight,
    setLaunchSlip,
  } = useScenarioState();

  const handleDurationChange = (days: number) => {
    const startDate = new Date(state.missionEpoch.startUtc);
    const stopDate = new Date(startDate.getTime() + days * 86400000);
    setMissionEpoch(startDate.toISOString(), stopDate.toISOString(), days);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    if (!newStart) return;
    const startIso = `${newStart}T00:00:00.000Z`;
    const stopIso = new Date(new Date(startIso).getTime() + state.missionEpoch.durationDays * 86400000).toISOString();
    setMissionEpoch(startIso, stopIso, state.missionEpoch.durationDays);
  };

  const currentStartDateStr = state.missionEpoch.startUtc.slice(0, 10);
  const effectiveStartMs = new Date(state.missionEpoch.startUtc).getTime() + state.launchSlipOffsetDays * 86400000;
  const effectiveDateStr = new Date(effectiveStartMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div
      role="toolbar"
      aria-label="Mission Scenario Configuration Bar"
      className="w-full bg-[var(--lm-color-surface)]/90 border border-[var(--lm-color-border-subtle)] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-sm"
    >
      {/* Site Selection */}
      <div className="flex items-center gap-2 min-w-0">
        <label htmlFor="cfg-site-selector" className="text-[var(--lm-color-text-muted)] font-semibold uppercase text-[11px]" title="Target Lunar South-Pole Landing Site">
          Target Site:
        </label>
        <select
          id="cfg-site-selector"
          value={state.primarySiteId}
          onChange={(e) => setPrimarySite(e.target.value)}
          aria-label="Target Landing Site Selection"
          data-testid="scenario-site-select"
          className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-primary)] px-2 py-1.5 rounded focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] min-h-[32px] cursor-pointer text-xs"
        >
          {CATALOG_SITES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.lat.toFixed(1)}°S, {s.lon.toFixed(0)}°E)
            </option>
          ))}
        </select>
      </div>

      {/* Date & Duration Controls */}
      <div className="flex items-center gap-2">
        <label htmlFor="cfg-epoch-start" className="text-[var(--lm-color-text-muted)] font-semibold uppercase text-[11px]" title="Planned mission landing date in UTC">
          Start Epoch:
        </label>
        <input
          id="cfg-epoch-start"
          type="date"
          value={currentStartDateStr}
          onChange={handleStartDateChange}
          aria-label="Mission Start Date (UTC)"
          title="Nominal launch date (UTC). Ephemerides and solar angles calculate from this baseline."
          data-testid="scenario-start-date"
          className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] px-2 py-1 rounded min-h-[32px] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
        />
        <div className="flex bg-[var(--lm-color-canvas)] p-0.5 rounded border border-[var(--lm-color-border-subtle)]" role="group" aria-label="Mission Duration Preset">
          {[7, 14, 21, 28].map((days) => {
            const isSelected = state.missionEpoch.durationDays === days;
            return (
              <button
                key={days}
                type="button"
                onClick={() => handleDurationChange(days)}
                aria-pressed={isSelected}
                data-testid={`duration-${days}d`}
                title={DURATION_TIPS[days]}
                className={`px-2 py-1 text-[11px] rounded transition-colors min-h-[32px] font-semibold focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] ${
                  isSelected ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)] shadow' : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-secondary)] hover:bg-[var(--lm-color-surface-strong)]'
                }`}
              >
                {days}d
              </button>
            );
          })}
        </div>
      </div>

      {/* Mast Height */}
      <div className="flex items-center gap-1.5" title="Observer Mast Height: Height of solar panels & antenna above ground. Taller masts clear grazing ridge shadows.">
        <span className="text-[var(--lm-color-text-muted)] font-semibold uppercase text-[11px]">Mast:</span>
        <div className="flex bg-[var(--lm-color-canvas)] p-0.5 rounded border border-[var(--lm-color-border-subtle)]" role="group" aria-label="Observer Mast Height Preset">
          {([1.0, 2.0, 5.0, 10.0] as const).map((h) => {
            const isSelected = state.observerMastHeightM === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setMastHeight(h)}
                aria-pressed={isSelected}
                data-testid={`mast-${h}m`}
                title={MAST_TIPS[h]}
                className={`px-2 py-1 text-[11px] rounded transition-colors min-h-[32px] min-w-[32px] font-semibold focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] ${
                  isSelected ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)] shadow' : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-secondary)] hover:bg-[var(--lm-color-surface-strong)]'
                }`}
              >
                {h}m
              </button>
            );
          })}
        </div>
        <span
          data-testid="active-mast-badge"
          className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] font-semibold hidden sm:inline"
          title={`Active Vehicle Configuration: ${MAST_TIPS[state.observerMastHeightM]}`}
        >
          {MAST_VEHICLE_SHORT[state.observerMastHeightM]}
        </span>
      </div>

      {/* Launch Slip Scrubber */}
      <div
        className="flex items-center gap-2 bg-[var(--lm-color-canvas)] px-2.5 py-1 rounded border border-[var(--lm-color-border-subtle)] min-h-[32px]"
        title={state.launchSlipOffsetDays > 0
          ? `Launch Slip: +${state.launchSlipOffsetDays.toFixed(1)}d delay. Slipped landing is ${effectiveDateStr}. Evaluated in ANALYZE and COMPARE.`
          : 'Launch Slip (Δt): Simulates rocket launch delays (0–28d) to test whether your site keeps geometric sunlight and Earth line-of-sight in ANALYZE and COMPARE.'}
      >
        <label htmlFor="cfg-slip-slider" className="text-[var(--lm-color-text-muted)] font-semibold flex items-center gap-1 text-[11px]">
          <span>SLIP:</span>
          <span className="text-[var(--lm-color-warning)] font-bold">+{state.launchSlipOffsetDays.toFixed(1)}d</span>
        </label>
        <input
          id="cfg-slip-slider"
          type="range"
          min="0"
          max="28"
          step="0.5"
          value={state.launchSlipOffsetDays}
          onChange={(e) => setLaunchSlip(parseFloat(e.target.value))}
          aria-label="Launch Slip Window Offset in Days (0 to 28 days)"
          data-testid="scenario-slip-slider"
          className="w-24 accent-[var(--lm-color-info)] cursor-pointer h-2 bg-[var(--lm-color-surface-strong)] rounded min-h-[32px]"
        />
        {state.launchSlipOffsetDays > 0 && (
          <button
            type="button"
            onClick={() => setLaunchSlip(0)}
            title="Reset Launch Slip to Nominal (0.0d)"
            aria-label="Reset Launch Slip to 0 days"
            className="text-[11px] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-danger)] min-w-[32px] min-h-[32px] flex items-center justify-center font-bold focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
          >
            ✕
          </button>
        )}
      </div>

      {/* Export Mission Dossier Trigger */}
      {onOpenDossier && (
        <button
          type="button"
          onClick={onOpenDossier}
          data-testid="scenario-export-dossier"
          title="Export Aerospace Mission Dossier for Active Target"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md border border-[var(--lm-color-series-b)]/50 bg-[var(--lm-color-series-b-surface-strong)] text-[var(--lm-color-series-b)] hover:bg-[var(--lm-color-series-b-surface-strong)] hover:text-[var(--lm-color-text-primary)] transition-all shadow-sm focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] cursor-pointer min-h-[32px]"
        >
          <IconDossier size={14} />
          <span>Dossier</span>
        </button>
      )}
    </div>
  );
};
