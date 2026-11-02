import React from 'react';
import type { ScientificMapLayerMode } from '../../model/spatialPreferences';

/**
 * Task 5.1: legend for the active scientific map layer — its semantics, units
 * and thresholds, with honest provenance for every derived/model surface.
 * 'none' (natural regolith) renders nothing; 'topography' keeps the dedicated
 * SVS hypsometry legend. Analytical hillshade uses the sampler's fixed artificial
 * sun (elev 1.5°, azimuth 45°) and is never presented as lunar illumination.
 */

export interface ScientificLayerLegendProps {
  mode: ScientificMapLayerMode | undefined;
}

interface Bin {
  swatch: string;
  label: string;
}

const SLOPE_BINS: Bin[] = [
  { swatch: 'rgb(16, 185, 129)', label: '<5° Safe' },
  { swatch: 'rgb(132, 204, 22)', label: '5–12° Moderate' },
  { swatch: 'rgb(245, 158, 11)', label: '12–15° Caution' },
  { swatch: 'rgb(220, 38, 38)', label: '≥15° Hazard (Artemis tip-over threshold)' },
];

const GEOLOGY_CLASSES: Bin[] = [
  { swatch: 'rgb(120, 113, 108)', label: 'pNb — pure norite' },
  { swatch: 'rgb(180, 83, 9)', label: 'Nb — norite' },
  { swatch: 'rgb(37, 99, 235)', label: 'Im — impact melt' },
  { swatch: 'rgb(251, 191, 36)', label: 'Cc — crater contiguous ejecta' },
  { swatch: 'rgb(30, 27, 75)', label: 'PSR — permanently shadowed' },
];

function LegendPanel({ title, note, bins, ramp }: {
  title: string;
  note: string;
  bins?: Bin[];
  ramp?: { from: string; to: string; min: string; max: string };
}) {
  return (
    <div
      role="region"
      aria-label={`${title} legend`}
      data-testid="scientific-layer-legend"
      className="absolute right-3 top-16 z-20 w-[240px] pointer-events-auto select-none bg-[var(--lm-color-surface)]/95 backdrop-blur-sm border border-[var(--lm-color-border)] rounded-[var(--lm-radius-sm)] p-2.5 text-[11px] font-mono text-[var(--lm-color-text-muted)] shadow-md flex flex-col gap-1.5"
    >
      <span className="font-semibold uppercase tracking-wide text-[var(--lm-color-text-primary)]">{title}</span>
      {ramp && (
        <div className="flex items-center gap-1.5">
          <span className="text-[length:var(--lm-text-micro)]">{ramp.min}</span>
          <span
            className="h-2 flex-1 rounded-xs border border-[var(--lm-color-border-subtle)]"
            style={{ background: `linear-gradient(to right, ${ramp.from}, ${ramp.to})` }}
            aria-hidden="true"
          />
          <span className="text-[length:var(--lm-text-micro)]">{ramp.max}</span>
        </div>
      )}
      {bins?.map((bin) => (
        <div key={bin.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs inline-block shrink-0 border border-black/30" style={{ backgroundColor: bin.swatch }} aria-hidden="true" />
          <span>{bin.label}</span>
        </div>
      ))}
      <span className="text-[length:var(--lm-text-micro)] leading-snug border-t border-[var(--lm-color-border-subtle)] pt-1">{note}</span>
    </div>
  );
}

export function ScientificLayerLegend({ mode }: ScientificLayerLegendProps) {
  switch (mode) {
    case 'slope':
      return (
        <LegendPanel
          title="Slope Hazard (deg)"
          note="Horn-style 8-cell finite difference of the polar surface — DERIVED, not a LOLA slope product. LOLA-derived slope carries a 1.5–2.5° RMS error (Barker et al. 2021)."
          bins={SLOPE_BINS}
        />
      );
    case 'hillshade':
      return (
        <LegendPanel
          title="Analytical Hillshade"
          note="Fixed analytical sun at 1.5° elevation, 45° azimuth — a relief-reading affordance, NOT illumination from the Sun. Time-dependent lighting lives in the separate illumination mode."
        />
      );
    case 'geology':
      return (
        <LegendPanel
          title="Geology Units (model)"
          note="Analytic unit classification of the polar surface — DERIVED for orientation, not a geological map product."
          bins={GEOLOGY_CLASSES}
        />
      );
    case 'illumination':
      return (
        <LegendPanel
          title="Annual Illumination (%)"
          note="Static analytic model of annual illumination fraction — NOT time-dependent illumination and not measured light. PSR class shown in deep indigo."
          ramp={{ from: 'rgb(15, 23, 42)', to: 'rgb(245, 158, 11)', min: '0%', max: '100%' }}
          bins={[{ swatch: 'rgb(20, 14, 60)', label: 'PSR — cryogenic shadow' }]}
        />
      );
    case 'temperature':
      return (
        <LegendPanel
          title="Temperature (K)"
          note="Diviner-modelled surface temperature — evaluative model, not a measured raster. Below 110 K water ice is perennially stable (cold trap)."
          ramp={{ from: 'rgb(30, 58, 138)', to: 'rgb(248, 113, 113)', min: '45 K', max: '230 K' }}
        />
      );
    case 'volatiles':
      return (
        <LegendPanel
          title="Volatiles (LEND model)"
          note="Modelled epithermal-neutron flux (cps) and hydrogen weight fraction — a composition proxy derived from a suppressed-neutron model, not a measured abundance."
          ramp={{ from: 'rgb(8, 47, 73)', to: 'rgb(103, 232, 249)', min: '6.2 cps', max: '12.8 cps' }}
        />
      );
    case 'none':
    case 'topography':
    default:
      return null;
  }
}
