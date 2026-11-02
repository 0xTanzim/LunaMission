/**
 * The comparison matrix's columns: which candidate sites are side by side, the
 * limits on that set, and the geometry each column reports.
 *
 * Conditions are computed here rather than in the view, so the matrix renders
 * results and never performs science.
 */

import { CandidateSite } from '@/domain/sites/candidateSite';
import {
  getSiteById,
  getAllAvailableSites,
  isEvaluableSiteId,
  DEFAULT_COMPARISON_SITE_IDS as CATALOG_DEFAULT_COMPARISON_SITE_IDS,
} from '@/domain/sites/catalog';
import { CalculationMode } from '@/domain/celestial/calculationMode';
import { CelestialGeometryResult } from '@/domain/celestial/geometryResult';
import { calculateSiteConditions } from '@/domain/celestial/siteConditions';

/** Opening comparison: the three south-pole rim/ridge sites. */
export const DEFAULT_COMPARISON_SITE_IDS: string[] = [...CATALOG_DEFAULT_COMPARISON_SITE_IDS];

/** One column still yields a readable record; four is the widest legible side-by-side. */
export const MIN_COMPARISON_SITES = 1;
export const MAX_COMPARISON_SITES = 4;

/**
 * Adds a column, or returns the same array when the comparison is already full or the id
 * names a catalogue-only region.
 *
 * A catalogue-only region has no registered candidate site and no horizon profile, so the
 * comparison API would answer 404 for it. Refusing the add here keeps every picker — the
 * header dropdown, the catalogue cards and the funnel cohort bar — honest.
 */
export function addComparisonSite(selectedIds: string[], siteId: string): string[] {
  if (selectedIds.length >= MAX_COMPARISON_SITES) return selectedIds;
  if (!isEvaluableSiteId(siteId)) return selectedIds;
  return [...selectedIds, siteId];
}

/** Removes a column, or returns the same array when only one would remain. */
export function removeComparisonSite(selectedIds: string[], siteId: string): string[] {
  if (selectedIds.length <= MIN_COMPARISON_SITES) return selectedIds;
  return selectedIds.filter((id) => id !== siteId);
}

/** Catalog entries for the selected ids, in selection order. */
export function resolveComparisonSites(selectedIds: readonly string[]): CandidateSite[] {
  return selectedIds
    .map((id) => getSiteById(id))
    .filter((s): s is CandidateSite => s !== undefined);
}

/** Catalog entries not yet in the comparison, in catalog order. */
export function comparisonSitesToAdd(selectedIds: readonly string[]): CandidateSite[] {
  return getAllAvailableSites().filter((s) => !selectedIds.includes(s.id));
}

/** One candidate site and the geometry measured for it at the shared epoch. */
export interface ComparisonColumn {
  site: CandidateSite;
  conditions: CelestialGeometryResult;
}

/** Every compared site evaluated at the same instant and under the same calculation mode. */
export function buildComparisonColumns(
  selectedIds: readonly string[],
  epochMs: number,
  mode: CalculationMode
): ComparisonColumn[] {
  const date = new Date(epochMs);
  return resolveComparisonSites(selectedIds).map((site) => ({
    site,
    conditions: calculateSiteConditions(site, date, mode),
  }));
}
