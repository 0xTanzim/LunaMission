import React from 'react';
import type { ScenarioCompareResponse } from '@luna/contracts';
import { Download, FileText } from 'lucide-react';
import { ComparisonIcon } from './ComparisonIcon';
import { buildComparisonCsvString } from '../model/exportComparisonCsv';
import { buildComparisonMarkdown } from '../model/exportComparisonMarkdown';

export interface ComparisonWorkspaceHeroProps {
  comparisonData?: ScenarioCompareResponse | null;
  className?: string;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ComparisonWorkspaceHero: React.FC<ComparisonWorkspaceHeroProps> = ({
  comparisonData,
  className = '',
}) => {
  const handleExportCsv = () => {
    if (comparisonData) {
      const csv = buildComparisonCsvString(comparisonData);
      triggerDownload(csv, `lunamission-trade-study-${comparisonData.calculationId.slice(0, 8)}.csv`, 'text/csv;charset=utf-8;');
    }
  };

  const handleExportMarkdown = () => {
    if (comparisonData) {
      const md = buildComparisonMarkdown(comparisonData);
      triggerDownload(md, `lunamission-trade-study-${comparisonData.calculationId.slice(0, 8)}.md`, 'text/markdown;charset=utf-8;');
    }
  };

  return (
    <div
      role="banner"
      aria-label="Comparison Workspace Hero"
      className={`flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-xl shadow-lg ${className}`}
    >
      <div className="flex flex-col gap-1 min-w-[280px]">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[var(--lm-color-text-primary)] uppercase tracking-wider font-mono">
            Lunar South-Pole Landing Site Trade Study
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] font-bold">
            3-TIER FUNNEL
          </span>
        </div>
        <p className="text-xs text-[var(--lm-color-text-muted)] font-mono">
          <span className="font-semibold text-[var(--lm-color-text-secondary)]">How the funnel works: </span>
          vehicle limits remove the sites that cannot survive the mission, the survivors are ranked
          on sunlight, darkness, Earth line-of-sight and landing slope, and the first two are then
          compared metric by metric.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
        <span className="px-2 py-1 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)]">
          LOLA 20m DEM
        </span>
        <span className="px-2 py-1 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)]">
          JPL Horizons Ephemeris
        </span>

        {comparisonData && (
          <div className="inline-flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={handleExportCsv}
              title="Download RFC 4180 CSV trade study matrix"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--lm-color-surface)] hover:bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] hover:border-[var(--lm-color-info-border)] font-bold transition-colors cursor-pointer"
            >
              <ComparisonIcon icon={Download} size={13} />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportMarkdown}
              title="Download formatted Markdown trade study dossier"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--lm-color-surface)] hover:bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-series-b)] border border-[var(--lm-color-series-b-border)] hover:border-[var(--lm-color-series-b-border)] font-bold transition-colors cursor-pointer"
            >
              <ComparisonIcon icon={FileText} size={13} />
              Export Dossier
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
