import React from 'react';
import { Sun, Radio, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * Per-body clearance status (task 4.5): same shape the scenario model's
 * `conditions` provides, declared locally so the horizon path stays decoupled
 * from the retired frontend radar module.
 */
export interface CelestialBodyClearanceStatus {
  azimuthDeg: number;
  elevationDeg: number;
  horizonElevationDeg: number;
  clearanceDeg: number;
  isObstructed: boolean;
}

interface HorizonClearanceTelemetryProps {
  currentSun: CelestialBodyClearanceStatus;
  currentEarth: CelestialBodyClearanceStatus;
}

export function HorizonClearanceTelemetry({ currentSun, currentEarth }: HorizonClearanceTelemetryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      {/* Sun Telemetry Card */}
      <div className="p-3 bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-md)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[var(--lm-color-warning)]/10 text-[var(--lm-color-warning)]">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono font-semibold text-[var(--lm-color-text-primary)]">
              Sun Telemetry
            </div>
            <div className="text-xs font-mono text-[var(--lm-color-text-muted)]">
              Elev: {currentSun.elevationDeg}° • Az: {currentSun.azimuthDeg}°
            </div>
          </div>
        </div>
        <div className="text-right font-mono">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
              currentSun.isObstructed
                ? 'bg-[var(--lm-color-danger)]/15 border border-[var(--lm-color-danger)]/40 text-[var(--lm-color-danger)]'
                : 'bg-[var(--lm-color-success)]/15 border border-[var(--lm-color-success)]/40 text-[var(--lm-color-success)]'
            }`}
          >
            {currentSun.isObstructed ? (
              <>
                <AlertTriangle className="w-3 h-3" />
                Obstructed ({currentSun.clearanceDeg}°)
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3" />
                Clear (+{currentSun.clearanceDeg}°)
              </>
            )}
          </span>
        </div>
      </div>

      {/* Earth Telemetry Card */}
      <div className="p-3 bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-md)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[var(--lm-color-info)]/10 text-[var(--lm-color-info)]">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono font-semibold text-[var(--lm-color-text-primary)]">
              Earth — Geometric Line of Sight
            </div>
            <div className="text-xs font-mono text-[var(--lm-color-text-muted)]">
              Elev: {currentEarth.elevationDeg}° • Az: {currentEarth.azimuthDeg}°
            </div>
          </div>
        </div>
        <div className="text-right font-mono">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
              currentEarth.isObstructed
                ? 'bg-[var(--lm-color-danger)]/15 border border-[var(--lm-color-danger)]/40 text-[var(--lm-color-danger)]'
                : 'bg-[var(--lm-color-success)]/15 border border-[var(--lm-color-success)]/40 text-[var(--lm-color-success)]'
            }`}
          >
            {currentEarth.isObstructed ? (
              <>
                <AlertTriangle className="w-3 h-3" />
                Blocked by Terrain ({currentEarth.clearanceDeg}°)
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3" />
                Geometric LoS (+{currentEarth.clearanceDeg}°)
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
