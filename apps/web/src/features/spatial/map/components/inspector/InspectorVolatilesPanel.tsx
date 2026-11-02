import React, { useEffect, useState } from 'react';
import { Pickaxe, Server, Sparkles, Thermometer } from 'lucide-react';
import { missionServerClient } from '@/domain/services/missionServerClient';
import type { VolatileProspectingResult } from '@/domain/volatiles/types';
import { ApiStateView } from '@/shared/ui/ApiStateView';

export interface InspectorVolatilesPanelProps {
  latDeg: number;
  lonDeg: number;
  siteName?: string;
  className?: string;
}

type VolatileData = VolatileProspectingResult & {
  source: 'nextrush_server';
};

/**
 * Docked readout panel for multi-spectral volatile and water-ice prospecting.
 * Directly integrates LEND epithermal neutron flux, Diviner surface temperature,
 * ISRU feasibility scoring, and extraction architecture evaluation.
 */
export function InspectorVolatilesPanel({
  latDeg,
  lonDeg,
  siteName = 'Target Coordinates',
  className = '',
}: InspectorVolatilesPanelProps) {
  const [data, setData] = useState<VolatileData | null>(null);
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'failed' | 'valid'>('loading');

  useEffect(() => {
    let cancelled = false;
    if (latDeg > -60) {
      setStatus('unsupported');
      setData(null);
      return;
    }

    setStatus('loading');
    missionServerClient
      .getVolatileProspect({ latDeg, lonDeg })
      .then((res) => {
        if (!cancelled) {
          if (res) {
            setData(res);
            setStatus('valid');
          } else {
            setData(null);
            setStatus('failed');
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setStatus('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [latDeg, lonDeg]);

  if (status === 'loading') {
    return (
      <div data-testid="inspector-volatiles-panel">
        <ApiStateView
          status="loading"
          message={`Evaluating LEND/Diviner Volatiles (${latDeg.toFixed(2)}°, ${lonDeg.toFixed(2)}°)...`}
          className={className}
          compact
        />
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div data-testid="inspector-volatiles-panel">
        <ApiStateView
          status="unsupported"
          title="Non-Polar Coordinates"
          message="LEND/Diviner volatile prospecting requires south-polar coordinates (≤ -60°S)."
          className={className}
          compact
        />
      </div>
    );
  }

  if (status === 'failed' || !data) {
    return (
      <div data-testid="inspector-volatiles-panel">
        <ApiStateView
          status="failed"
          title="Volatiles Telemetry Offline"
          message="Failed to retrieve LEND/Diviner volatiles telemetry. Zero synthetic fallback numbers."
          className={className}
          compact
        />
      </div>
    );
  }

  return (
    <div
      data-testid="inspector-volatiles-panel"
      className={`flex flex-col gap-2 font-mono text-xs ${className}`}
    >
      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        {/* Diviner Thermal */}
        <div className="bg-[var(--lm-color-canvas)]/80 p-2 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--lm-color-text-muted)]">
            <span className="flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-[var(--lm-color-danger)]" />
              <span>Diviner Temp</span>
            </span>
            <span className={`text-[11px] font-bold ${data.isruFeasibilityScore >= 60 ? 'text-[var(--lm-color-info)]' : 'text-[var(--lm-color-warning)]'}`}>
              ISRU {data.isruFeasibilityScore}/100
            </span>
          </div>
          <span className={`text-xs font-bold ${data.divinerTempKelvin < 110 ? 'text-[var(--lm-color-series-b)]' : 'text-[var(--lm-color-warning)]'}`}>
            {data.divinerTempKelvin} K
          </span>
          <span className="text-[11px] text-[var(--lm-color-text-muted)]">
            {data.sublimationStability === 'perennially_stable' ? 'Perennial Cold Trap' : 'Sublimates'}
          </span>
        </div>

        {/* LEND Hydrogen Wt% */}
        <div className="bg-[var(--lm-color-canvas)]/80 p-2 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[var(--lm-color-text-muted)] text-[11px]">
            <Sparkles className="w-3 h-3 text-[var(--lm-color-info)]" />
            <span>Hydrogen wt%</span>
          </div>
          <span className="text-xs font-bold text-[var(--lm-color-info)]">
            {data.hydrogenWeightPct}% <span className="text-[11px] font-normal text-[var(--lm-color-text-muted)]">({data.waterEquivalentHydrogenPct}% WEH)</span>
          </span>
          <span className="text-[11px] text-[var(--lm-color-text-muted)]">
            Flux: {data.epithermalNeutronFluxCps} cps
          </span>
        </div>

        {/* Ice Density Yield */}
        <div className="bg-[var(--lm-color-canvas)]/80 p-2 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[var(--lm-color-text-muted)] text-[11px]">
            <Pickaxe className="w-3 h-3 text-[var(--lm-color-success)]" />
            <span>Ice Density</span>
          </div>
          <span className="text-xs font-bold text-[var(--lm-color-success)]">
            {data.estimatedIceDensityKgPerM3} kg/m³
          </span>
          <span className="text-[11px] text-[var(--lm-color-text-muted)]">
            ~{data.iceYieldMetricTonsPerHectare} t / ha (1m depth)
          </span>
        </div>

        {/* Extraction Architecture */}
        <div className="bg-[var(--lm-color-canvas)]/80 p-2 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--lm-color-text-muted)]">
            <span>Architecture</span>
            <span className="flex items-center gap-0.5 text-[11px] text-[var(--lm-color-info)]">
              <Server className="w-2.5 h-2.5" />
              :3001
            </span>
          </div>
          <span className="text-xs font-bold text-[var(--lm-color-data-demo)] truncate">
            {data.extractionMethod === 'sublimation_tent'
              ? 'Sublimation Canopy'
              : data.extractionMethod === 'deep_thermal_coring'
              ? 'Thermal Core Drill'
              : 'Unviable'}
          </span>
          <span className="text-[11px] text-[var(--lm-color-text-muted)] truncate">
            {data.isPsr ? 'Permanently Shadowed' : 'Illuminated Terrain'}
          </span>
        </div>
      </div>
    </div>
  );
}
