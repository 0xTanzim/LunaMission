import React from 'react';
import type { SummaryMetrics, UncertaintyEnvelope } from '@luna/contracts';
import { KpiCard } from './KpiCard';

interface ExecutiveKpiStripProps {
  metrics: SummaryMetrics;
  uncertaintyEnvelopes?: UncertaintyEnvelope;
  className?: string;
}

export const ExecutiveKpiStrip: React.FC<ExecutiveKpiStripProps> = ({
  metrics,
  uncertaintyEnvelopes,
  className = '',
}) => {
  const avgWhiskerHours = uncertaintyEnvelopes?.eventWhiskers?.length
    ? (
        uncertaintyEnvelopes.eventWhiskers.reduce((acc, w) => acc + w.whiskerSpanHours, 0) /
        uncertaintyEnvelopes.eventWhiskers.length
      ).toFixed(1)
    : null;

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 ${className}`}>
      {/* 1. Cumulative Solar Access */}
      <KpiCard
        label="Sunlit Duration (geom.)"
        value={`${metrics.solarAccessPercentage.toFixed(1)}%`}
        subValue={`${metrics.cumulativeSunlitHours.toFixed(1)} / ${metrics.totalEvaluationHours.toFixed(1)} h`}
        status={metrics.solarAccessPercentage >= 50 ? 'nominal' : 'warning'}
      />

      {/* 2. Longest Sunlit Window */}
      <KpiCard
        label="Longest Sunlit Window"
        value={metrics.longestContinuousSunlitWindowHours.toFixed(1)}
        unit="h"
        subValue={`Longest unbroken geometric sunlit run`}
        status={metrics.longestContinuousSunlitWindowHours >= 72 ? 'nominal' : 'warning'}
      />

      {/* 3. Max Continuous Darkness */}
      <KpiCard
        label="Max Cold-Soak Darkness"
        value={metrics.longestContinuousDarkWindowHours.toFixed(1)}
        unit="h"
        subValue={`Compare with the vehicle's own darkness limit`}
        status={metrics.longestContinuousDarkWindowHours <= 48 ? 'nominal' : 'alert'}
      />

      {/* 4. Earth geometric line-of-sight (not an RF link budget) */}
      <KpiCard
        label="Earth LoS Access (geom.)"
        value={`${metrics.dteAccessPercentage.toFixed(1)}%`}
        subValue={`${metrics.cumulativeDteHours.toFixed(1)} h geometric line-of-sight`}
        status={metrics.dteAccessPercentage >= 60 ? 'nominal' : 'warning'}
      />

      {/* 5. Concurrent geometric overlap */}
      <KpiCard
        label="Sun∩Earth LoS Overlap"
        value={metrics.cumulativeOverlapHours.toFixed(1)}
        unit="h"
        subValue={`${metrics.overlapPercentage.toFixed(1)}% concurrent geometric visibility`}
        status={metrics.cumulativeOverlapHours >= 24 ? 'nominal' : 'warning'}
      />

      {/* 6. Deterministic terrain sensitivity envelope (not a confidence interval) */}
      <KpiCard
        label="Terrain Sensitivity Envelope"
        value={avgWhiskerHours === null ? '—' : `±${avgWhiskerHours}`}
        unit={avgWhiskerHours === null ? undefined : 'h'}
        subValue={
          avgWhiskerHours === null
            ? 'No event whiskers returned'
            : 'LOLA 20m DEM perturbation span · not a confidence interval'
        }
        status={avgWhiskerHours !== null && parseFloat(avgWhiskerHours) <= 3.0 ? 'nominal' : 'warning'}
      />
    </div>
  );
};
