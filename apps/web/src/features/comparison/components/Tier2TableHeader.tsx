import React from 'react';

export const Tier2TableHeader: React.FC = () => {
  return (
    <thead className="bg-[var(--lm-color-surface)]/80 text-[var(--lm-color-text-muted)] uppercase text-[11px] tracking-wider border-b border-[var(--lm-color-border-subtle)]">
      <tr>
        <th scope="col" className="py-2.5 px-3">Rank</th>
        <th scope="col" className="py-2.5 px-3">Candidate Site</th>
        <th scope="col" className="py-2.5 px-3 text-[var(--lm-color-warning)] font-semibold">Continuous Sun</th>
        <th scope="col" className="py-2.5 px-3 text-[var(--lm-color-danger)] font-semibold">Max Dark</th>
        <th scope="col" className="py-2.5 px-3 text-[var(--lm-color-success)] font-semibold">Earth LoS (geom.)</th>
        <th scope="col" className="py-2.5 px-3 text-[var(--lm-color-text-secondary)] font-semibold">Slope</th>
        <th scope="col" className="py-2.5 px-3 text-[var(--lm-color-text-muted)] font-semibold">Sorting Trace & Ties</th>
        <th scope="col" className="py-2.5 px-3 text-right font-semibold">Head-to-Head Select</th>
      </tr>
    </thead>
  );
};
