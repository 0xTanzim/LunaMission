import React from 'react';
import { ArrowUpDown, Sun, Radio, ShieldCheck, CircleHelp } from 'lucide-react';
import { isSiteIndividuallyCharacterized } from '@/domain/sites/siteInvestigationRegistry';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { DecoratedSiteCandidate } from './SiteComparisonToolbar';

export type SortField = 'sunlight' | 'dte' | 'traversable' | 'elevation' | 'code';

export interface SiteComparisonMatrixTableProps {
  candidateList: DecoratedSiteCandidate[];
  selectedSiteId: string;
  onSelectSite: (site: CandidateSite) => void;
  onClose: () => void;
  onSort: (field: SortField) => void;
}

/** L-02: marks cells whose values would come from the template fallback. */
function NotCharacterizedChip() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-sans italic text-[var(--lm-color-text-muted)]"
      title="No site-specific investigation is registered for this entity — its metrics are not individually characterized. The registry entry shown elsewhere in this row is a generic template."
    >
      <CircleHelp className="w-3 h-3" aria-hidden="true" />
      Not individually characterized
    </span>
  );
}

export function SiteComparisonMatrixTable({
  candidateList,
  selectedSiteId,
  onSelectSite,
  onClose,
  onSort,
}: SiteComparisonMatrixTableProps) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="w-full text-left text-xs font-mono border-collapse">
        <thead>
          <tr className="border-b border-[var(--lm-color-border)] text-[var(--lm-color-text-muted)] text-[11px] uppercase">
            <th className="pb-2 pl-2">Site / Entity</th>
            <th className="pb-2">Coordinates</th>
            <th className="pb-2 cursor-pointer hover:text-[var(--lm-color-text-primary)]" onClick={() => onSort('elevation')}>
              <div className="flex items-center gap-1">
                <span>Elevation</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="pb-2 cursor-pointer hover:text-[var(--lm-color-text-primary)]" onClick={() => onSort('sunlight')}>
              <div className="flex items-center gap-1 text-[var(--lm-color-warning)]">
                <Sun className="w-3 h-3 text-[var(--lm-color-warning)]" />
                <span>Sunlight %</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="pb-2 cursor-pointer hover:text-[var(--lm-color-text-primary)]" onClick={() => onSort('dte')}>
              <div className="flex items-center gap-1 text-[var(--lm-color-info)]">
                <Radio className="w-3 h-3 text-[var(--lm-color-info)]" />
                <span>Earth LoS %</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="pb-2 cursor-pointer hover:text-[var(--lm-color-text-primary)]" onClick={() => onSort('traversable')}>
              <div className="flex items-center gap-1 text-[var(--lm-color-success)]">
                <ShieldCheck className="w-3 h-3 text-[var(--lm-color-success)]" />
                <span>Traversable</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="pb-2">Artemis Status</th>
            <th className="pb-2 pr-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--lm-color-border-subtle)]/80">
          {candidateList.map(({ site, inv }) => {
            const isSelected = site.id === selectedSiteId;
            // L-02: template investigations carry no per-site science — metric cells
            // must say so instead of presenting identical template numbers per row.
            const characterized = isSiteIndividuallyCharacterized(site.id);
            return (
              <tr
                key={site.id}
                className={`hover:bg-[var(--lm-color-surface-strong)]/40 transition-colors ${
                  isSelected ? 'bg-[var(--lm-color-info-surface)] border-l-2 border-[var(--lm-color-info)]' : ''
                }`}
              >
                <td className="py-2.5 pl-2 font-sans">
                  <div className="font-semibold text-[var(--lm-color-text-primary)] flex items-center gap-1.5">
                    <span className="font-mono text-[var(--lm-color-info)] text-[11px]">{site.code}</span>
                    <span>{site.name}</span>
                    {isSelected && (
                      <span className="text-[11px] font-mono text-[var(--lm-color-info)] bg-[var(--lm-color-info-surface)] px-1.5 py-0.2 rounded border border-[var(--lm-color-info-border)]">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--lm-color-text-muted)] font-mono">
                    {inv.badgeType} • {inv.stratigraphicUnit.split(' ')[0]}
                  </div>
                </td>
                <td className="py-2.5 text-[var(--lm-color-text-secondary)]">
                  <div>{site.coordinates.latitudeDeg.toFixed(3)}°S</div>
                  <div className="text-[var(--lm-color-text-muted)] text-[11px]">{site.coordinates.longitudeDeg.toFixed(1)}°E</div>
                </td>
                <td className="py-2.5 font-semibold text-[var(--lm-color-info)]">
                  +{site.coordinates.elevationMeters?.toLocaleString() ?? '—'} m
                </td>
                {characterized ? (
                  <>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[var(--lm-color-warning)]">{inv.annualIlluminationPct.toFixed(1)}%</span>
                        <div className="w-12 h-1.5 bg-[var(--lm-color-surface-strong)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--lm-color-warning)]"
                            style={{ width: `${inv.annualIlluminationPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-[var(--lm-color-text-muted)] font-sans">
                        Peak: {(inv.maxContinuousDaylightHours / 24).toFixed(0)}d continuous
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[var(--lm-color-info)]">{inv.directToEarthPct.toFixed(1)}%</span>
                        <div className="w-12 h-1.5 bg-[var(--lm-color-surface-strong)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--lm-color-info)]"
                            style={{ width: `${inv.directToEarthPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-[var(--lm-color-text-muted)] font-sans">
                        {inv.directToEarthPct > 75 ? 'High LoS fraction' : 'Intermittent LoS'}
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[var(--lm-color-success)]">{inv.traversableAreaPct}%</span>
                        <span
                          className="text-[11px] text-[var(--lm-color-text-muted)]"
                          title="Traversable fraction counts terrain cells with local slope below 15°"
                        >
                          cells &lt;15°
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--lm-color-text-muted)] font-sans">
                        Site peak slope: {inv.maxSlopeDeg.toFixed(1)}° (steep cells excluded from the fraction)
                      </div>
                    </td>
                  </>
                ) : (
                  <td className="py-2.5" colSpan={3}>
                    <NotCharacterizedChip />
                  </td>
                )}
                <td className="py-2.5 font-sans">
                  {characterized ? (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                        inv.hlsLandingRating.includes('Primary')
                          ? 'bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border-[var(--lm-color-success)]/40'
                          : 'bg-[var(--lm-color-series-b-surface-strong)] text-[var(--lm-color-series-b)] border-[var(--lm-color-series-b)]/40'
                      }`}
                    >
                      {inv.hlsLandingRating}
                    </span>
                  ) : (
                    <NotCharacterizedChip />
                  )}
                </td>
                <td className="py-2.5 pr-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSite(site);
                      onClose();
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-sans font-medium transition-colors ${
                      isSelected
                        ? 'bg-[var(--lm-color-info)]/20 text-[var(--lm-color-info)] border border-[var(--lm-color-info)]/40 cursor-default'
                        : 'bg-[var(--lm-color-info-fill)] hover:bg-[var(--lm-color-info-fill-hover)] text-[var(--lm-color-text-primary)]'
                    }`}
                  >
                    {isSelected ? 'Viewing' : 'Inspect 3D'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
