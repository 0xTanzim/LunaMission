import React from 'react';
import { formatCoordinate, formatElevation } from '@/shared/formatting/formatters';
import { useScenario, useScenarioCommands, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import { useScenarioState } from '@/app/state/useScenarioState';
import { VEHICLE_ARCHETYPES } from '@/shared/mission/scenarioConfigTips';
import type { CalculationMode } from '@/domain/celestial/calculationMode';

/**
 * Passport identity block: which point is selected, how it is described, the
 * reference coordinates, and the terrain-aware/geometry-only switch.
 */

const MODE_BUTTON_BASE =
  'px-2 py-0.5 text-[11px] font-mono rounded-[var(--lm-radius-xs)] transition-colors';
const MODE_BUTTON_ACTIVE =
  'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border border-[var(--lm-color-selected-site)]/50 font-semibold';
const MODE_BUTTON_IDLE = 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]';

function ModeButton({
  mode,
  label,
  title,
  activeMode,
  onSelect,
}: {
  mode: CalculationMode;
  label: string;
  title: string;
  activeMode: CalculationMode;
  onSelect: (mode: CalculationMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      title={title}
      className={`${MODE_BUTTON_BASE} ${activeMode === mode ? MODE_BUTTON_ACTIVE : MODE_BUTTON_IDLE}`}
    >
      {label}
    </button>
  );
}

export function PassportSiteHeader() {
  const { calculationMode } = useScenario();
  const { setCalculationMode } = useScenarioCommands();
  const { site } = useScenarioModel();
  const { state: globalState } = useScenarioState();

  const mastHeight = globalState?.observerMastHeightM ?? 2.0;
  const vehicle = VEHICLE_ARCHETYPES[mastHeight] ?? VEHICLE_ARCHETYPES[2.0];
  const baseElev = site?.coordinates?.elevationMeters ?? 0;
  const totalElev = baseElev + mastHeight;

  return (
    <div className="flex flex-col gap-2 pb-3.5 border-b border-[var(--lm-color-border-subtle)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-mono text-[var(--lm-color-selected-site)] font-semibold bg-[var(--lm-color-surface-strong)] px-1.5 py-0.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-selected-site)]/30">
              {site.code}
            </span>
            <span className="text-xs text-[var(--lm-color-text-muted)] font-mono">
              {site.priority}
            </span>
            {site.catalogVersion && (
              <span
                className="text-[11px] text-[var(--lm-color-text-muted)] font-mono bg-[var(--lm-color-surface-strong)]/60 px-1.5 py-0.5 rounded border border-[var(--lm-color-border)]/50"
                title={site.missionContextNote || 'Catalog provenance: NASA polar study series'}
              >
                {site.catalogVersion}
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--lm-color-text-primary)] tracking-tight">
            {site.name}
          </h2>
        </div>

        {/* Mode Switcher: Terrain-aware vs Geometry-only */}
        <div className="flex items-center gap-1 bg-[var(--lm-color-surface-raised)] p-0.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)]">
          <ModeButton
            mode="terrain-aware"
            label="Terrain-Aware"
            title="Terrain-aware calculation using LRO LOLA DEM"
            activeMode={calculationMode}
            onSelect={setCalculationMode}
          />
          <ModeButton
            mode="geometry-only"
            label="Geometry-Only"
            title="Geometry-only calculation against mathematical sphere"
            activeMode={calculationMode}
            onSelect={setCalculationMode}
          />
        </div>
      </div>

      {/* Site Description */}
      <p className="text-xs text-[var(--lm-color-text-secondary)] leading-relaxed">
        {site.description}
      </p>

      {/* Lineage & Provenance Note */}
      {site.missionContextNote && (
        <div className="text-[11px] text-[var(--lm-color-text-muted)] bg-[var(--lm-color-surface-raised)]/60 px-2 py-1 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] flex items-start gap-1.5">
          <span className="text-[var(--lm-color-selected-site)] font-semibold text-[11px] uppercase tracking-wider shrink-0 mt-0.5">
            Lineage:
          </span>
          <span className="leading-tight">{site.missionContextNote}</span>
        </div>
      )}

      {/* Coordinates and Reference Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono-num text-xs bg-[var(--lm-color-surface-raised)] p-2.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)]">
        <div>
          <div className="text-[11px] text-[var(--lm-color-text-muted)] uppercase">Latitude</div>
          <div className="font-semibold text-[var(--lm-color-text-primary)]">
            {formatCoordinate(site?.coordinates?.latitudeDeg, 'latitude', 3)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--lm-color-text-muted)] uppercase">Longitude</div>
          <div className="font-semibold text-[var(--lm-color-text-primary)]">
            {formatCoordinate(site?.coordinates?.longitudeDeg, 'longitude', 3)}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="text-[11px] text-[var(--lm-color-text-muted)] uppercase">Elevation (DEM)</div>
          <div className="font-semibold text-[var(--lm-color-text-primary)]">
            {formatElevation(site?.coordinates?.elevationMeters)}
          </div>
        </div>
      </div>

      {/* Observer Mast Height & Vehicle Clearance Strip */}
      <div
        data-testid="passport-mast-profile"
        className="flex items-center justify-between px-2.5 py-1.5 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface)]/90 border border-[var(--lm-color-info-border)] text-xs font-mono shadow-sm"
        title={`Observer Mast: +${mastHeight.toFixed(1)}m. Depresses local horizon obstacles by ~${vehicle.gainDeg.toFixed(2)}°, extending sunlight and comms windows.`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm" aria-hidden="true">{vehicle.icon}</span>
          <div>
            <span className="text-[var(--lm-color-info)] font-bold">{vehicle.label} ({mastHeight.toFixed(0)}m)</span>
            <span className="text-[11px] text-[var(--lm-color-text-muted)] block sm:inline sm:ml-1">[{vehicle.vehicle}]</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-[var(--lm-color-warning)] font-semibold block">
            +{vehicle.gainDeg.toFixed(2)}° Horizon Gain
          </span>
          <span className="text-[11px] text-[var(--lm-color-text-muted)] block">Focal: +{totalElev.toLocaleString()} m</span>
        </div>
      </div>
    </div>
  );
}
