import React from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';

export interface ScientificProvenanceBadgeProps {
  mode: ScientificMapLayerMode;
  className?: string;
}

interface ProvenanceRecord {
  instrument: string;
  resolution: string;
  coordinateFrame: string;
  datum: string;
  credits: string[];
}

const PROVENANCE_BY_MODE: Record<ScientificMapLayerMode, ProvenanceRecord> = {
  topography: {
    instrument: 'LRO LOLA Laser Altimeter',
    resolution: '20m DEM / 128 ppd (~240m)',
    coordinateFrame: 'IAU 2000 ME',
    datum: 'R = 1737.4 km (NASA SVS 3727)',
    credits: ['NASA', 'GSFC', 'PDS'],
  },
  slope: {
    instrument: 'LOLA Altimetric Slope (GDR)',
    resolution: '240m Baseline Gradient',
    coordinateFrame: 'IAU 2000 ME',
    datum: 'Tip-Over Hazard: ≥15°',
    credits: ['NASA', 'GSFC', 'Artemis III'],
  },
  volatiles: {
    instrument: 'LRO LEND Neutron Detector',
    resolution: 'Epithermal Neutron Flux (<0.8 cps)',
    coordinateFrame: 'IAU 2000 ME',
    datum: 'Water-Equivalent Hydrogen (WEH wt%)',
    credits: ['NASA', 'IKI', 'PDS'],
  },
  temperature: {
    instrument: 'LRO Diviner Radiometer (DLRE)',
    resolution: '240 m/px T_max / T_min',
    coordinateFrame: 'IAU 2000 ME',
    datum: '<110 K Cold Trap Stability',
    credits: ['NASA', 'JPL', 'UCLA'],
  },
  illumination: {
    instrument: 'LRO LOLA Horizon Climatology',
    resolution: '29.5-Day Synodic Cycle',
    coordinateFrame: 'IAU 2000 ME',
    datum: '0% Sunlight PSR Cold Traps',
    credits: ['NASA', 'GSFC', 'SVS 5127'],
  },
  geology: {
    instrument: 'LPI South Pole Atlas Stratigraphy',
    resolution: 'Chrono-Sequence Units',
    coordinateFrame: 'IAU 2000 ME',
    datum: 'Pre-Nectarian to Copernican',
    credits: ['LPI', 'USRA', 'USGS'],
  },
  hillshade: {
    instrument: 'LOLA Analytical Shaded Relief',
    resolution: '20m Micro-Relief',
    coordinateFrame: 'IAU 2000 ME',
    datum: '0.5°-2.0° Grazing Sunlight',
    credits: ['NASA', 'GSFC'],
  },
  none: {
    instrument: 'LROC Narrow Angle Camera (NAC)',
    resolution: '0.5–2.0 m/px Orthomosaic',
    coordinateFrame: 'IAU 2000 ME',
    datum: 'Controlled Optical Base',
    credits: ['NASA', 'ASU', 'GSFC'],
  },
};

export function ScientificProvenanceBadge({ mode, className = '' }: ScientificProvenanceBadgeProps) {
  const meta = PROVENANCE_BY_MODE[mode];
  if (!meta) return null;

  return (
    <div
      data-testid="layer-provenance-badge"
      className={`border-t border-[var(--lm-color-border-subtle)] pt-1.5 flex flex-col gap-1 font-mono text-[11px] ${className}`}
      aria-label={`Scientific Provenance for ${meta.instrument}`}
    >
      <div className="flex items-center justify-between text-[var(--lm-color-text-muted)] gap-1">
        <span className="flex items-center gap-1 font-semibold text-[var(--lm-color-text-secondary)] truncate">
          <Database className="w-2.5 h-2.5 text-[var(--lm-color-info)] shrink-0" />
          <span className="truncate">{meta.instrument}</span>
        </span>
        <span className="flex items-center gap-0.5 text-[var(--lm-color-success)] shrink-0 font-medium">
          <ShieldCheck className="w-2.5 h-2.5 text-[var(--lm-color-success)]" />
          <span>{meta.coordinateFrame}</span>
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--lm-color-text-muted)]">
        <span className="text-[var(--lm-color-text-muted)] truncate">{meta.resolution}</span>
        <span className="text-[var(--lm-color-text-muted)] truncate text-right">{meta.datum}</span>
      </div>

      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[11px] uppercase tracking-wider text-[var(--lm-color-text-muted)] font-semibold">Credits:</span>
        <div className="flex items-center gap-1 flex-wrap">
          {meta.credits.map((credit) => (
            <span
              key={credit}
              className="px-1 py-0.2 rounded-xs bg-[var(--lm-color-surface)]/90 text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] text-[11px] font-semibold"
            >
              {credit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
