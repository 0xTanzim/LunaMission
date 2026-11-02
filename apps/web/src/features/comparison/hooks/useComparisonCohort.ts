import { useState, useEffect } from 'react';
import { isEvaluableSiteId } from '@/domain/sites/catalog';
import { MAX_COHORT_SITES, MIN_COHORT_SITES } from '../model/cohort';

const INITIAL_BENCHMARK_COHORT = [
  'connecting-ridge',
  'shackleton-rim',
  'malapert-massif',
  'peak-near-shackleton',
  'nobile-rim-1',
  'de-gerlache-rim-2',
  'nobile-rim-2',
];

export function useComparisonCohort(primaryId?: string) {
  const [cohortSiteIds, setCohortSiteIds] = useState<string[]>(() => {
    if (primaryId && !INITIAL_BENCHMARK_COHORT.includes(primaryId)) {
      return [primaryId, ...INITIAL_BENCHMARK_COHORT];
    }
    return INITIAL_BENCHMARK_COHORT;
  });

  // Automatically synchronize active primary site into comparison cohort
  useEffect(() => {
    if (primaryId && !cohortSiteIds.includes(primaryId)) {
      setCohortSiteIds((prev) =>
        [primaryId, ...prev.filter((id) => id !== primaryId)].slice(0, MAX_COHORT_SITES),
      );
    }
  }, [primaryId, cohortSiteIds]);

  /**
   * Adds a site to the evaluation cohort. Catalogue-only regions are refused: they have no
   * registered candidate site, so there is nothing for the trade study to score.
   */
  const addSite = (siteId: string) => {
    if (!isEvaluableSiteId(siteId)) return;
    if (!cohortSiteIds.includes(siteId) && cohortSiteIds.length < MAX_COHORT_SITES) {
      setCohortSiteIds((prev) => [...prev, siteId]);
    }
  };

  /** A cohort never drops below the two sites a pairwise study needs. */
  const removeSite = (siteId: string) => {
    if (cohortSiteIds.length > MIN_COHORT_SITES && siteId !== primaryId) {
      setCohortSiteIds((prev) => prev.filter((id) => id !== siteId));
    }
  };

  return { cohortSiteIds, addSite, removeSite };
}
