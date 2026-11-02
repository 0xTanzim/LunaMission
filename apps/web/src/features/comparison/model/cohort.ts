import type { CandidateSite } from '@/domain/sites/candidateSite';
import { getAllAvailableSites, isEvaluableSiteId } from '@/domain/sites/catalog';

/** A pairwise trade study needs two sites; the API answers for at most twenty. */
export const MIN_COHORT_SITES = 2;
export const MAX_COHORT_SITES = 20;

/**
 * Sites that can still join the cohort.
 *
 * Only registered candidate sites carry a LOLA horizon profile, so only they can be scored.
 * Catalogue-only regions are withheld here rather than offered and then rejected.
 */
export function availableCohortCandidates(cohortSiteIds: readonly string[]): CandidateSite[] {
  return getAllAvailableSites().filter(
    (site) => !cohortSiteIds.includes(site.id) && isEvaluableSiteId(site.id),
  );
}

export function isCohortTooSmall(cohortSiteIds: readonly string[]): boolean {
  return cohortSiteIds.length < MIN_COHORT_SITES;
}
