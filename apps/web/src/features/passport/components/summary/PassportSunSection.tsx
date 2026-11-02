import React, { useState } from 'react';
import { Sun, ChevronDown, ChevronUp } from 'lucide-react';
import { MetricBlock } from '@/features/passport/components/summary/MetricBlock';
import { Badge } from '@/shared/ui/Badge';
import { useScenario, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import type { IlluminationState } from '@/domain/celestial/observationStates';

/** Sun geometry metrics and the power-relevance explanation they feed. */

const ILLUMINATION_BADGES: Record<IlluminationState, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  illuminated: { label: 'Fully Illuminated', variant: 'success' },
  'partial-penumbra': { label: 'Grazing Penumbra', variant: 'warning' },
  shadowed: { label: 'Shadowed / Sub-horizon', variant: 'danger' },
  indeterminate: { label: 'Indeterminate', variant: 'warning' },
};

export function PassportSunSection() {
  const { calculationMode } = useScenario();
  const { conditions } = useScenarioModel();
  const [showExplanation, setShowExplanation] = useState(false);

  const badge = ILLUMINATION_BADGES[conditions.solarIllumination] ?? ILLUMINATION_BADGES.shadowed;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-[var(--lm-color-sun)]" />
          <span className="text-xs font-semibold text-[var(--lm-color-sun)] uppercase tracking-wider font-mono">
            Sun Geometry
          </span>
        </div>
        <Badge variant={badge.variant}>
          {badge.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricBlock
          label="Sun Elevation"
          result={conditions.sunElevationDeg}
          accentColor="var(--lm-color-sun)"
          definition="Angle of solar center above (+) or below (-) the reference horizon plane."
          qualifier={calculationMode === 'terrain-aware' ? 'Mean horizon basis' : 'Spherical model'}
        />
        <MetricBlock
          label="Sun Azimuth"
          result={conditions.sunAzimuthDeg}
          definition="Clockwise angle measured from Lunar North (0° = North, 90° = East, 180° = South, 270° = West)."
          qualifier="IAU Polar Axis reference"
        />
      </div>

      {/* Sun Illumination Explanation Toggle */}
      <button
        type="button"
        onClick={() => setShowExplanation(!showExplanation)}
        className="flex items-center justify-between text-left px-2.5 py-1.5 rounded-[var(--lm-radius-xs)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border-subtle)] text-[11px] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] transition-colors"
      >
        <span>What this solar angle means for mission power</span>
        {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showExplanation && (
        <div className="text-[11px] leading-relaxed text-[var(--lm-color-text-secondary)] bg-[var(--lm-color-canvas)] p-2.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] space-y-1">
          <p>
            At the lunar south pole, solar elevation stays within approx. <strong>-1.5° to +1.5°</strong> relative to the mean horizon due to the Moon's 1.54° obliquity. Elevated crater rims (such as Shackleton at +4.2 km) lower the local geometric horizon dip angle, creating extended periods of continuous grazing sunlight.
          </p>
          <p className="text-[var(--lm-color-text-muted)]">
            Visible solar-disk fraction (approximate chord model, geometric — not an irradiance-weighted
            fraction and not generated electrical power):{' '}
            <strong>
              {conditions.solarIlluminationFraction.kind === 'available'
                ? `${(conditions.solarIlluminationFraction.value * 100).toFixed(0)}% visible`
                : `unavailable (${conditions.solarIlluminationFraction.reason})`}
            </strong>
            .
          </p>
        </div>
      )}
    </section>
  );
}
