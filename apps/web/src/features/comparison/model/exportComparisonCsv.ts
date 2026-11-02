import type { ScenarioCompareResponse } from '@luna/contracts';

/**
 * Builds an RFC 4180 compliant CSV string containing the complete
 * 3-Tier Comparison Decision Audit Trail.
 */
export function buildComparisonCsvString(data: ScenarioCompareResponse): string {
  const lines: string[] = [];

  // 1. Scenario Metadata Section
  lines.push('# SCENARIO METADATA');
  lines.push('Calculation_ID,Start_UTC,Stop_UTC,Total_Evaluation_Hours,Mast_Height_m,Sun_Criterion,Earth_Criterion,Status');
  lines.push(
    [
      `"${data.calculationId}"`,
      `"${data.scenarioConfig.startUtc}"`,
      `"${data.scenarioConfig.stopUtc}"`,
      data.scenarioConfig.totalEvaluationHours.toFixed(1),
      data.scenarioConfig.observerMastHeightM.toFixed(1),
      `"${data.scenarioConfig.sunVisibilityCriterion}"`,
      `"${data.scenarioConfig.earthVisibilityCriterion}"`,
      `"${data.status}"`,
    ].join(','),
  );
  lines.push('');

  // 2. Tier 1 Gating Audit
  lines.push('# TIER 1 GATING AUDIT');
  lines.push('Site_ID,Site_Name,Entity_Type,Gating_Status,Rejection_Constraint,Margin_Of_Failure,Unit,Narrative');

  // Culled sites
  for (const c of data.tier1Gating.disqualifiedCandidates) {
    for (const r of c.rejectionReasons) {
      lines.push(
        [
          `"${c.siteId}"`,
          `"${c.siteName}"`,
          `"${c.entityType}"`,
          '"DISQUALIFIED"',
          `"${r.constraintName}"`,
          r.marginOfFailure.toFixed(2),
          `"${r.unit}"`,
          `"${r.narrative.replace(/"/g, '""')}"`,
        ].join(','),
      );
    }
  }

  // Feasible sites
  for (const id of data.tier1Gating.feasibleSiteIds) {
    const candidate = data.tier2Ranking.rankedCandidates.find((rc) => rc.siteId === id);
    lines.push(
      [
        `"${id}"`,
        `"${candidate?.siteName ?? id}"`,
        `"${candidate?.entityType ?? 'unknown'}"`,
        '"FEASIBLE"',
        '"NONE"',
        '0.00',
        '""',
        '"Passed all vehicle constraints."',
      ].join(','),
    );
  }
  lines.push('');

  // 3. Tier 2 Lexicographic Ranking
  lines.push('# TIER 2 LEXICOGRAPHIC RANKING');
  lines.push(
    'Rank,Site_ID,Site_Name,Entity_Type,Latitude_deg,Longitude_deg,Elevation_m,Continuous_Sun_h,Max_Dark_h,Cumulative_Sun_h,Solar_Access_Pct,Cumulative_Earth_LoS_h,Earth_LoS_Access_Pct,Cumulative_Overlap_h,Slope_deg,Terrain_Sensitivity_Span_h',
  );
  for (const c of data.tier2Ranking.rankedCandidates) {
    lines.push(
      [
        c.rank,
        `"${c.siteId}"`,
        `"${c.siteName}"`,
        `"${c.entityType}"`,
        c.coordinates.latitudeDeg.toFixed(3),
        c.coordinates.longitudeEastDeg.toFixed(3),
        c.coordinates.elevationMeters.toFixed(0),
        c.metrics.longestContinuousSunlightHours.toFixed(1),
        c.metrics.maxContinuousDarknessHours.toFixed(1),
        c.metrics.cumulativeSunlitHours.toFixed(1),
        c.metrics.solarAccessPercentage.toFixed(1),
        c.metrics.cumulativeDteHours.toFixed(1),
        c.metrics.dteAccessPercentage.toFixed(1),
        c.metrics.cumulativeOverlapHours.toFixed(1),
        c.metrics.landingSlopeDeg.toFixed(1),
        c.metrics.terrainUncertaintySpanHours.toFixed(1),
      ].join(','),
    );
  }
  lines.push('');

  // 4. Tier 3 Pairwise Delta Matrix (if available)
  if (data.tier3Pairwise) {
    const { siteA, siteB, deltas, terrainSensitivityComparison, objectiveTradeOffNarrative } = data.tier3Pairwise;
    lines.push('# TIER 3 PAIRWISE DELTA MATRIX');
    lines.push(`Site_A,"${siteA.siteName}",Site_B,"${siteB.siteName}"`);
    lines.push('Metric_Key,Metric_Label,Value_A,Value_B,Unit,Absolute_Delta,Percent_Delta,Favored_Site,Operational_Significance');
    for (const d of deltas) {
      lines.push(
        [
          `"${d.metricKey}"`,
          `"${d.metricLabel}"`,
          d.valueA.toFixed(1),
          d.valueB.toFixed(1),
          `"${d.unit}"`,
          d.absoluteDelta.toFixed(1),
          d.percentDelta.toFixed(1),
          `"${d.favoredSite}"`,
          `"${d.operationalSignificance.replace(/"/g, '""')}"`,
        ].join(','),
      );
    }
    lines.push('');
    lines.push('# TERRAIN SENSITIVITY WHISKERS (deterministic DEM perturbation envelope, not a confidence interval)');
    lines.push('Site_A_Sensitivity_h,Site_B_Sensitivity_h,Whisker_Ratio,Lower_Risk_Site');
    lines.push(
      [
        terrainSensitivityComparison.uncertaintySpanHoursA.toFixed(1),
        terrainSensitivityComparison.uncertaintySpanHoursB.toFixed(1),
        terrainSensitivityComparison.whiskerRatio.toFixed(2),
        `"${terrainSensitivityComparison.lowerRiskSite}"`,
      ].join(','),
    );
    lines.push('');
    lines.push('# FLIGHT DYNAMICS NARRATIVE');
    lines.push(`"${objectiveTradeOffNarrative.replace(/"/g, '""')}"`);
  }

  return lines.join('\n');
}
