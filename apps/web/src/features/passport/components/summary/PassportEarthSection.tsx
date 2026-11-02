import React from 'react';
import { Globe as EarthIcon, Radio } from 'lucide-react';
import { MetricBlock } from '@/features/passport/components/summary/MetricBlock';
import { Badge } from '@/shared/ui/Badge';
import { useScenarioModel } from '@/app/scenario/context/scenarioContext';
import type { EarthVisibilityState } from '@/domain/celestial/observationStates';

/** Earth geometry, geometric line-of-sight range/light time, and the RF link caveat that qualifies them. */

const VISIBILITY_BADGES: Record<EarthVisibilityState, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  visible: { label: 'Geometric Line-of-Sight', variant: 'success' },
  'sub-horizon': { label: 'Sub-Horizon (Obscured)', variant: 'danger' },
  indeterminate: { label: 'Limb Grazing (Indeterminate)', variant: 'warning' },
  unavailable: { label: 'Unavailable', variant: 'danger' },
};

export function PassportEarthSection() {
  const { conditions } = useScenarioModel();

  const badge = VISIBILITY_BADGES[conditions.earthVisibility] ?? VISIBILITY_BADGES['sub-horizon'];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <EarthIcon className="w-4 h-4 text-[var(--lm-color-earth)]" />
          <span className="text-xs font-semibold text-[var(--lm-color-earth)] uppercase tracking-wider font-mono">
            Earth Geometry &amp; Line-of-Sight
          </span>
        </div>
        <Badge variant={badge.variant}>
          {badge.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricBlock
          label="Earth Elevation"
          result={conditions.earthElevationDeg}
          accentColor="var(--lm-color-earth)"
          definition="Apparent elevation angle of the center of Earth above the local horizon."
          qualifier="Subject to +/- 6.7° libration"
        />
        <MetricBlock
          label="Earth Range"
          result={conditions.rangeKm}
          definition="Instantaneous center-to-center distance between Earth and Moon."
          qualifier="Perigee/Apogee variation"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricBlock
          label="One-Way Light Time"
          result={conditions.theoreticalOneWayLightTimeSeconds}
          definition="Theoretical vacuum light-travel time (t = distance / c). Does not include operational ground station routing or network overhead."
          qualifier="Speed of light c = 299,792 km/s"
        />
        <MetricBlock
          label="Earth Azimuth"
          result={conditions.earthAzimuthDeg}
          definition="Azimuth angle pointing toward Earth's disk center."
          qualifier="IAU Polar Axis frame"
        />
      </div>

      {/* RF Guarantee Disclaimer (Strict Scientific Requirement from Spec) */}
      <div className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-sm)] p-2.5 text-[11px] leading-relaxed text-[var(--lm-color-text-secondary)] flex items-start gap-2">
        <Radio className="w-4 h-4 text-[var(--lm-color-earth)] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[var(--lm-color-text-primary)]">Communication Constraint:</strong>{' '}
          Geometric line-of-sight does not prove radio link success. Operational RF communications require RF link budget margin, high-gain antenna pointing, and scheduled Deep Space Network (DSN) ground station contact windows.
        </div>
      </div>
    </section>
  );
}
