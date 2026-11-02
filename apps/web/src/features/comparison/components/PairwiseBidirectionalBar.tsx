import React from 'react';

interface PairwiseBidirectionalBarProps {
  favoredSite: 'siteA' | 'siteB' | 'tie';
  percentDelta: number;
}

export const PairwiseBidirectionalBar: React.FC<PairwiseBidirectionalBarProps> = ({
  favoredSite,
  percentDelta,
}) => {
  // Clamp width to max 100% of half-width
  const normalizedMagnitude = Math.min(Math.abs(percentDelta), 100);
  const barWidthPercent = Math.max(8, (normalizedMagnitude / 100) * 100);

  return (
    <div className="w-28 sm:w-36 h-3 bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-full flex relative overflow-hidden">
      {/* Center Dividing Axis */}
      <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-[var(--lm-color-surface-strong)] z-10 -translate-x-1/2" />

      {/* Left side: Site A advantage */}
      <div className="w-1/2 h-full flex justify-end relative">
        {favoredSite === 'siteA' && (
          <div
            className="h-full bg-gradient-to-l from-[var(--lm-color-info)] to-[var(--lm-color-info-fill)] rounded-l-full shadow-sm"
            style={{ width: `${barWidthPercent}%` }}
          />
        )}
      </div>

      {/* Right side: Site B advantage */}
      <div className="w-1/2 h-full flex justify-start relative">
        {favoredSite === 'siteB' && (
          <div
            className="h-full bg-gradient-to-r from-[var(--lm-color-series-b)] to-[var(--lm-color-series-b-fill)] rounded-r-full shadow-sm"
            style={{ width: `${barWidthPercent}%` }}
          />
        )}
      </div>
    </div>
  );
};
