import { useCallback, useMemo, useState } from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import { getFilteredCandidateSites, type SiteCatalogFilter } from '@/domain/sites/catalog';
import { useScenario, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import { useScenarioState } from '@/app/state/useScenarioState';
import {
  DEFAULT_COMPARISON_SITE_IDS,
  MAX_COMPARISON_SITES,
  buildComparisonColumns,
  comparisonSitesToAdd,
  removeComparisonSite,
  addComparisonSite,
} from '@/features/comparison/model/comparisonColumns';
import { generateComparisonCsv } from '@/features/comparison/model/generateComparisonCsv';
import { CandidateCatalogue } from '@/features/comparison/components/CandidateCatalogue';
import { ComparisonHeader } from '@/features/comparison/components/ComparisonHeader';
import { DecisionMatrix } from '@/features/comparison/components/DecisionMatrix';
import { ComparisonPolicyNotice } from '@/features/comparison/components/ComparisonPolicyNotice';
import { MissionDateWindowSelector } from '@/features/comparison/components/MissionDateWindowSelector';
import { ParetoLandingWindowModal } from '@/features/comparison/components/ParetoLandingWindowModal';

interface ComparisonMatrixProps {
  onSelectSiteForExplore: (site: CandidateSite) => void;
}

/**
 * Side-by-side site matrix at one instant: every compared site is evaluated with the same
 * epoch and calculation mode, which is what makes the columns comparable.
 *
 * The catalogue is a compact rail beside the comparison on a wide screen and a closed
 * disclosure above it otherwise — browsing candidates must never be the price of admission to
 * the comparison itself.
 */
export function ComparisonMatrix({ onSelectSiteForExplore }: ComparisonMatrixProps) {
  const { calculationMode } = useScenario();
  const { epochMs, epochIsoUtc } = useScenarioModel();
  const { state, setMissionEpoch, setPrimarySite } = useScenarioState();

  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([...DEFAULT_COMPARISON_SITE_IDS]);
  const [catalogTab, setCatalogTab] = useState<SiteCatalogFilter>('artemis-2024');
  const [isParetoModalOpen, setIsParetoModalOpen] = useState(false);

  const columns = useMemo(
    () => buildComparisonColumns(selectedSiteIds, epochMs, calculationMode),
    [selectedSiteIds, epochMs, calculationMode],
  );

  const catalogueEntries = useMemo(() => getFilteredCandidateSites(catalogTab), [catalogTab]);

  const sitesToAdd = useMemo(() => {
    const inTab = new Set(catalogueEntries.map((s) => s.id));
    return comparisonSitesToAdd(selectedSiteIds).filter((s) => inTab.has(s.id));
  }, [catalogueEntries, selectedSiteIds]);

  const activeSites = useMemo(() => columns.map((column) => column.site), [columns]);

  const durationDays = state.missionEpoch.durationDays;

  const commitWindow = useCallback(
    (startUtc: string, days: number) => {
      const startMs = Date.parse(startUtc);
      if (!Number.isFinite(startMs)) return;
      setMissionEpoch(startUtc, new Date(startMs + days * 86400000).toISOString(), days);
    },
    [setMissionEpoch],
  );

  /** One entry point for cohort additions, so every picker obeys the same catalog guard. */
  const addToCohort = useCallback((siteId: string) => {
    setSelectedSiteIds((prev) => addComparisonSite(prev, siteId));
  }, []);

  const removeFromCohort = useCallback((siteId: string) => {
    setSelectedSiteIds((prev) => removeComparisonSite(prev, siteId));
  }, []);

  const handleExportCsv = useCallback(() => {
    const encodedUri = encodeURI(generateComparisonCsv(columns));
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LunaMission_Landing_Site_Matrix_${epochIsoUtc.slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [columns, epochIsoUtc]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 py-2">
      <MissionDateWindowSelector
        selectedDate={new Date(epochMs)}
        durationDays={durationDays}
        onSelectDate={(date) => commitWindow(date.toISOString(), durationDays)}
        onSelectDuration={(days) => commitWindow(state.missionEpoch.startUtc, days)}
        onOpenParetoSolver={() => setIsParetoModalOpen(true)}
      />

      <ParetoLandingWindowModal
        isOpen={isParetoModalOpen}
        onClose={() => setIsParetoModalOpen(false)}
        siteId={activeSites[0]?.id ?? state.primarySiteId}
        siteName={activeSites[0]?.name ?? state.primarySiteId}
        onSelectWindow={(win) => commitWindow(win.startDateIso, win.durationDays)}
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-4 2xl:col-span-3">
          <CandidateCatalogue
            entries={catalogueEntries}
            cohortSiteIds={selectedSiteIds}
            canAddSite={selectedSiteIds.length < MAX_COMPARISON_SITES}
            activeTab={catalogTab}
            onTabChange={setCatalogTab}
            onAddSite={addToCohort}
            onInspectSite={onSelectSiteForExplore}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8 2xl:col-span-9">
          <ComparisonHeader
            formattedEpoch={epochIsoUtc.replace('T', ' ').replace('Z', ' UTC')}
            sitesToAdd={sitesToAdd}
            canAddSite={selectedSiteIds.length < MAX_COMPARISON_SITES}
            onAddSite={addToCohort}
            onExportCsv={handleExportCsv}
          />

          <DecisionMatrix
            columns={columns}
            primarySiteId={state.primarySiteId}
            canRemoveSite={selectedSiteIds.length > 1}
            onSetPrimary={setPrimarySite}
            onInspectSite={onSelectSiteForExplore}
            onRemoveSite={removeFromCohort}
          />
        </div>
      </div>

      <ComparisonPolicyNotice />
    </div>
  );
}
