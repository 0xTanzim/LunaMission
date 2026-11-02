import React from 'react';

interface Tier2RankBadgeProps {
  rank: number;
}

export const Tier2RankBadge: React.FC<Tier2RankBadgeProps> = ({ rank }) => {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-[var(--lm-color-warning)] bg-[var(--lm-color-warning-surface-strong)] border border-[var(--lm-color-warning-border)] px-2 py-0.5 rounded-full shadow-sm">
        🥇 #{rank}
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-[var(--lm-color-text-secondary)] bg-[var(--lm-color-surface-strong)] border border-[var(--lm-color-border-strong)] px-2 py-0.5 rounded-full">
        🥈 #{rank}
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-[var(--lm-color-warning)] bg-[var(--lm-color-warning-surface)] border border-[var(--lm-color-warning-border)] px-2 py-0.5 rounded-full">
        🥉 #{rank}
      </span>
    );
  }
  return <span className="font-semibold text-[var(--lm-color-text-muted)] pl-1.5">#{rank}</span>;
};
