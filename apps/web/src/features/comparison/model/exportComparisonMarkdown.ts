import type { ScenarioCompareResponse } from '@luna/contracts';
import { calculateLunarGeodesicDistance } from './geodesicDistance';

/**
 * Builds an executive-ready Markdown Trade Study Dossier suitable for
 * PDR/CDR review boards, technical memos, and flight planning.
 */
export function buildComparisonMarkdown(data: ScenarioCompareResponse): string {
  const parts: string[] = [];

  // Title
  parts.push('# Lunar South Pole Landing Site Trade Study Dossier');
  parts.push(`Generated: ${new Date().toISOString()} | Engine: LunaMission v2.0.0 | Status: **${data.status.toUpperCase()}**\n`);

  // Section 1: Scenario Context & Physical Datum
  parts.push('## 1. Scenario Context & Physical Datum');
  parts.push(`- **Evaluation Interval:** \`${data.scenarioConfig.startUtc}\` to \`${data.scenarioConfig.stopUtc}\` (${data.scenarioConfig.totalEvaluationHours.toFixed(1)} h)`);
  parts.push(`- **Observer Mast Height:** ${data.scenarioConfig.observerMastHeightM.toFixed(1)} m above LOLA terrain datum`);
  parts.push(`- **Sun Visibility Criterion:** \`${data.scenarioConfig.sunVisibilityCriterion}\` (Finite Solar Limb)`);
  parts.push(`- **Earth Visibility Criterion:** \`${data.scenarioConfig.earthVisibilityCriterion}\` (Topocentric Line-of-Sight)`);
  parts.push(`- **Ephemeris Dataset:** JPL Horizons DE421 / DE440 (\`coord@301\`)`);
  parts.push(`- **Terrain Source:** NASA LRO LOLA 20m DEM (\`LDEM_85S_20M\`) | Reference Sphere $R_{MOON} = 1,737,400\\text{ m}$\n`);

  // Section 2: Tier 1 Vehicle Gating Audit
  parts.push('## 2. Tier 1 Vehicle Gating Audit');
  parts.push(`- **Total Sites Evaluated:** ${data.tier1Gating.totalEvaluatedSites}`);
  parts.push(`- **Feasible Survivors:** ${data.tier1Gating.feasibleSitesCount} sites passed all hard vehicle constraints.`);
  parts.push(`- **Disqualified Candidates:** ${data.tier1Gating.disqualifiedSitesCount} sites culled.\n`);

  if (data.tier1Gating.disqualifiedCandidates.length > 0) {
    parts.push('| Disqualified Site | Entity Type | Failure Constraint | Threshold | Observed | Margin | Narrative |');
    parts.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const c of data.tier1Gating.disqualifiedCandidates) {
      for (const r of c.rejectionReasons) {
        parts.push(`| **${c.siteName}** | \`${c.entityType}\` | ${r.constraintName} | ${r.thresholdValue.toFixed(1)} ${r.unit} | ${r.observedValue.toFixed(1)} ${r.unit} | +${r.marginOfFailure.toFixed(1)} ${r.unit} | ${r.narrative} |`);
      }
    }
    parts.push('');
  }

  // Section 3: Tier 2 Lexicographic Priority Ranking
  parts.push('## 3. Tier 2 Lexicographic Priority Ranking');
  parts.push(`*Hierarchy:* ${data.tier2Ranking.priorityHierarchy.join(' → ')}\n`);
  parts.push('| Rank | Candidate Site | Entity Type | Coordinates | Cont. Sun | Max Dark | Earth LoS (geom.) | Slope | Terrain Sensitivity |');
  parts.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const c of data.tier2Ranking.rankedCandidates) {
    const coords = `${c.coordinates.latitudeDeg.toFixed(2)}°S, ${c.coordinates.longitudeEastDeg.toFixed(1)}°E (${c.coordinates.elevationMeters}m)`;
    parts.push(
      `| **#${c.rank}** | **${c.siteName}** | \`${c.entityType}\` | ${coords} | ${c.metrics.longestContinuousSunlightHours.toFixed(1)}h | ${c.metrics.maxContinuousDarknessHours.toFixed(1)}h | ${c.metrics.cumulativeDteHours.toFixed(1)}h | ${c.metrics.landingSlopeDeg.toFixed(1)}° | ±${c.metrics.terrainUncertaintySpanHours.toFixed(1)}h |`,
    );
  }
  parts.push('');

  // Section 4: Tier 3 Focused Pairwise Trade Study
  if (data.tier3Pairwise) {
    const { siteA, siteB, deltas, terrainSensitivityComparison, objectiveTradeOffNarrative } = data.tier3Pairwise;
    parts.push('## 4. Tier 3 Focused Pairwise Trade Study');
    parts.push(`Comparing **${siteA.siteName}** (Site A) vs **${siteB.siteName}** (Site B).\n`);

    // Geodesic Separation
    const cA = data.tier2Ranking.rankedCandidates.find((c) => c.siteId === siteA.siteId)?.coordinates;
    const cB = data.tier2Ranking.rankedCandidates.find((c) => c.siteId === siteB.siteId)?.coordinates;
    if (cA && cB) {
      const geoDist = calculateLunarGeodesicDistance(cA, cB);
      parts.push(`### Geodesic Surface Separation`);
      parts.push(`- **Great-Circle Distance:** **${geoDist.distanceKm.toFixed(2)} km** (${geoDist.distanceMeters.toFixed(0)} m) across the lunar south pole.\n`);
    }

    // Delta Table
    parts.push('### Head-to-Head Operational Delta Matrix');
    parts.push('| Operational Metric | Site A Value | Site B Value | Delta (A − B) | Favored Candidate | Operational Significance |');
    parts.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const d of deltas) {
      const sign = d.absoluteDelta > 0 ? '+' : '';
      parts.push(`| **${d.metricLabel}** | ${d.valueA.toFixed(1)} ${d.unit} | ${d.valueB.toFixed(1)} ${d.unit} | ${sign}${d.absoluteDelta.toFixed(1)} ${d.unit} (${sign}${d.percentDelta.toFixed(1)}%) | **${d.favoredSite.toUpperCase()}** | ${d.operationalSignificance} |`);
    }
    parts.push('');

    // Deterministic terrain sensitivity envelope (not a statistical interval)
    parts.push(
      '### Terrain Sensitivity Whiskers (deterministic LOLA DEM perturbation envelope — not a statistical confidence interval)',
    );
    parts.push(`- **Site A Sensitivity Span:** ±${terrainSensitivityComparison.uncertaintySpanHoursA.toFixed(1)} h`);
    parts.push(`- **Site B Sensitivity Span:** ±${terrainSensitivityComparison.uncertaintySpanHoursB.toFixed(1)} h`);
    parts.push(`- **Whisker Ratio:** ${terrainSensitivityComparison.whiskerRatio.toFixed(2)}×`);
    parts.push(`- **Topographically Safer Candidate:** **${terrainSensitivityComparison.lowerRiskSite.toUpperCase()}**\n`);

    // Synthesis Narrative
    parts.push('### Objective Flight Dynamics Synthesis');
    parts.push(`> "${objectiveTradeOffNarrative}"\n`);
  }

  return parts.join('\n');
}
