import { useEffect, useState } from 'react';
import { missionServerClient } from '@/domain/services/missionServerClient';
import { VolatileProspectingResult } from '@/domain/volatiles/types';
import { Droplets, Thermometer, Sparkles, Pickaxe, Server } from 'lucide-react';
import { ApiStateView } from '@/shared/ui/ApiStateView';

interface VolatileProspectingCardProps {
  latDeg: number;
  lonDeg: number;
  siteName?: string;
  className?: string;
}

export function VolatileProspectingCard({
  latDeg,
  lonDeg,
  siteName = 'Target Coordinates',
  className = '',
}: VolatileProspectingCardProps) {
  const [data, setData] = useState<
    (VolatileProspectingResult & { source: 'nextrush_server' }) | null
  >(null);
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
      <ApiStateView
        status="loading"
        message="Evaluating LEND/Diviner Volatiles..."
        className={className}
        compact
      />
    );
  }

  if (status === 'unsupported') {
    return (
      <ApiStateView
        status="unsupported"
        title="Non-Polar Coordinates"
        message="LEND/Diviner volatile prospecting models require south-polar coordinates (≤ -60°S)."
        className={className}
        compact
      />
    );
  }

  if (status === 'failed' || !data) {
    return (
      <ApiStateView
        status="failed"
        title="Volatiles Telemetry Offline"
        message="Authoritative LEND/Diviner server data unavailable. Zero synthetic fallback numbers."
        className={className}
        compact
      />
    );
  }

  return (
    <div
      className={`bg-[var(--lm-color-surface)]/95 backdrop-blur-md border border-[var(--lm-color-border)] rounded-xl p-3.5 flex flex-col gap-3 font-mono text-xs shadow-lg ${className}`}
      aria-label="Volatile Water-Ice Prospecting Intelligence"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-2">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-[var(--lm-color-info)]" />
          <span className="font-semibold uppercase tracking-wider text-[var(--lm-color-text-primary)]">
            ISRU Volatile Prospector
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)]">
          <Server className="w-3 h-3" />
          NextRush :3001
        </div>
      </div>

      {/* Target & Feasibility Score */}
      <div className="flex items-center justify-between bg-[var(--lm-color-canvas)] p-2.5 rounded-lg border border-[var(--lm-color-border-subtle)]">
        <div>
          <span className="text-[11px] text-[var(--lm-color-text-muted)] block">Inspection Target</span>
          <span className="font-bold text-[var(--lm-color-text-primary)] truncate block max-w-[170px]">
            {siteName}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-[var(--lm-color-text-muted)] block">ISRU Feasibility</span>
          <span className={`text-sm font-black ${data.isruFeasibilityScore >= 60 ? 'text-[var(--lm-color-info)]' : data.isruFeasibilityScore >= 35 ? 'text-[var(--lm-color-warning)]' : 'text-[var(--lm-color-text-muted)]'}`}>
            {data.isruFeasibilityScore} / 100
          </span>
        </div>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Diviner Thermal */}
        <div className="bg-[var(--lm-color-canvas)]/70 p-2 rounded border border-[var(--lm-color-border-subtle)] flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[var(--lm-color-text-muted)] text-[11px]">
            <Thermometer className="w-3 h-3 text-[var(--lm-color-danger)]" />
            <span>Diviner Temp</span>
          </div>
          <span className={`text-xs font-bold ${data.divinerTempKelvin < 110 ? 'text-[var(--lm-color-series-b)]' : 'text-[var(--lm-color-warning)]'}`}>
            {data.divinerTempKelvin} K
          </span>
          <span className="text-[11px] text-[var(--lm-color-text-muted)]">
            {data.sublimationStability === 'perennially_stable' ? 'Perennial Cold Trap' : 'Sublimates'}
          </span>
        </div>

        {/* LEND Hydrogen Wt% */}
        <div className="bg-[var(--lm-color-canvas)]/70 p-2 rounded border border-[var(--lm-color-border-subtle)] flex flex-col gap-0.5">
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

        {/* Ice Yield Density */}
        <div className="bg-[var(--lm-color-canvas)]/70 p-2 rounded border border-[var(--lm-color-border-subtle)] flex flex-col gap-0.5">
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

        {/* Recommended Extraction Architecture */}
        <div className="bg-[var(--lm-color-canvas)]/70 p-2 rounded border border-[var(--lm-color-border-subtle)] flex flex-col gap-0.5">
          <span className="text-[11px] text-[var(--lm-color-text-muted)]">Architecture</span>
          <span className="text-xs font-bold text-[var(--lm-color-data-demo)] truncate">
            {data.extractionMethod === 'sublimation_tent' ? 'Sublimation Canopy' : data.extractionMethod === 'deep_thermal_coring' ? 'Thermal Core Drill' : 'Unviable'}
          </span>
          <span className="text-[11px] text-[var(--lm-color-text-muted)] truncate">
            {data.isPsr ? 'Permanently Shadowed' : 'Illuminated Terrain'}
          </span>
        </div>
      </div>
    </div>
  );
}
