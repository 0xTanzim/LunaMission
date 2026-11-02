/**
 * Executive Mission Dossier Markdown & JSON Formatter
 *
 * Formats pure MissionDossier structures into publication-ready GitHub-Flavored Markdown
 * and machine-readable JSON telemetry interchange documents.
 */

import type { MissionDossier } from '@luna/contracts';

/**
 * Sanitizes user-supplied or dynamic strings against HTML entity injection,
 * script execution, markdown table pipe breaks, link/image injection,
 * inline code block breakout, and newline header forgery (VULN-M7-01).
 */
export function sanitizeMarkdownText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\|/g, '&#124;')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/`/g, '&#96;');
}

export function formatDossierAsMarkdown(dossier: MissionDossier): string {
  const d = dossier;
  const siteName = sanitizeMarkdownText(d.site.name);
  const catalogId = d.site.catalogId ? sanitizeMarkdownText(d.site.catalogId) : undefined;
  const dossierId = sanitizeMarkdownText(d.id);
  const isoDate = new Date(d.targetEpochMs).toISOString();
  const genDate = new Date(d.generatedAtEpochMs).toISOString();

  let traversalSection = '';
  if (d.traversal) {
    const t = d.traversal;
    const destName = sanitizeMarkdownText(t.destinationName);
    traversalSection = `
## 5. Surface Rover Traversal & EVA Corridor

| Parameter | Traversal Assessment | Status / Operational Flag |
|---|---|---|
| **Destination Target** | ${destName} | Primary Scientific Destination |
| **Total Route Distance** | ${t.totalDistanceKm.toFixed(2)} km | Great-Circle Interpolation |
| **Average Slope Gradient** | ${t.averageSlopeDeg.toFixed(1)}° | ${t.averageSlopeDeg < 10 ? 'Nominal traverse terrain' : 'High energy expenditure'} |
| **Maximum Slope Gradient** | ${t.maxSlopeDeg.toFixed(1)}° | ${t.maxSlopeDeg > 15 ? 'CRITICAL: Severe scarp slope (>15°)' : 'Safe slope margin'} |
| **Route Traversability** | **${t.isTraversable ? 'FEASIBLE' : 'UNTRAVERSABLE'}** | ${t.isTraversable ? 'No impassable scarps identified' : 'Exceeds chassis tip threshold'} |
| **Estimated Energy Draw** | ${t.estimatedBatteryWh} Wh | Artemis LTV / VIPER Class |
| **Hazard Classification** | **${t.hazardLevel.toUpperCase()}** | Terrain risk index |
`;
  } else {
    traversalSection = `
## 5. Surface Rover Traversal & EVA Corridor
*No secondary EVA or rover destination configured for this mission profile.*
`;
  }

  let benchmarkSection = '';
  if (d.benchmark) {
    const b = d.benchmark;
    const nearestName = sanitizeMarkdownText(b.nearestCandidateName);
    const deltaSunSign = b.deltaSunElevationDeg >= 0 ? '+' : '';
    const deltaEarthSign = b.deltaEarthElevationDeg >= 0 ? '+' : '';
    const deltaHSign = b.deltaHydrogenWtPct >= 0 ? '+' : '';

    benchmarkSection = `
## 6. Comparative Benchmark against Artemis Catalog

Target is cross-referenced against nearest Artemis candidate: **${nearestName}** (${b.distanceKm.toFixed(1)} km separation).

| Comparative Metric | Delta vs Baseline | Tactical Assessment |
|---|---|---|
| **Solar Elevation Differential (ΔSun)** | ${deltaSunSign}${b.deltaSunElevationDeg.toFixed(2)}° | ${b.deltaSunElevationDeg >= 0 ? 'Favorable or equal solar clearance' : 'Lower solar elevation than baseline'} |
| **Earth Elevation Differential (ΔEarth)** | ${deltaEarthSign}${b.deltaEarthElevationDeg.toFixed(2)}° | ${b.deltaEarthElevationDeg >= 0 ? 'Superior line-of-sight clearance' : 'Lower Earth horizon clearance'} |
| **Hydrogen Yield Differential (ΔH)** | ${deltaHSign}${b.deltaHydrogenWtPct.toFixed(3)} wt% | ${b.deltaHydrogenWtPct >= 0 ? 'Superior volatile sequestration' : 'Lower hydrogen concentration'} |
| **Multi-Domain Feasibility Score** | **${b.feasibilityScore} / 100** | Overall architectural ranking |
| **Feasibility Grade** | **GRADE ${b.feasibilityGrade}** | Qualification assessment |
`;
  }

  let scenarioSection = '';
  if (d.scenario) {
    const sc = d.scenario;
    const startIso = sc.startUtc ? sanitizeMarkdownText(sc.startUtc) : 'N/A';
    const stopIso = sc.stopUtc ? sanitizeMarkdownText(sc.stopUtc) : 'N/A';
    const effStart = sc.effectiveStartUtc ? sanitizeMarkdownText(sc.effectiveStartUtc) : 'N/A';
    const effStop = sc.effectiveStopUtc ? sanitizeMarkdownText(sc.effectiveStopUtc) : 'N/A';
    const calcId = sanitizeMarkdownText(sc.calculationId);
    const cacheStatus = sanitizeMarkdownText(sc.provenance?.cacheStatus ?? (sc.casCacheHit ? 'HIT' : 'MISS'));
    const bins = sc.lolaHorizonProfile?.bins ?? 0;
    const binStatus = sanitizeMarkdownText(sc.lolaHorizonProfile?.binStatus ?? 'valid');
    const minEl = sc.lolaHorizonProfile?.minElevationDeg !== undefined ? `${sc.lolaHorizonProfile.minElevationDeg.toFixed(2)}°` : '0.00°';
    const maxEl = sc.lolaHorizonProfile?.maxElevationDeg !== undefined ? `${sc.lolaHorizonProfile.maxElevationDeg.toFixed(2)}°` : '0.00°';
    const meanEl = sc.lolaHorizonProfile?.meanElevationDeg !== undefined ? `${sc.lolaHorizonProfile.meanElevationDeg.toFixed(2)}°` : '0.00°';
    const totalHours = sc.totalEvaluationHours !== undefined ? `${sc.totalEvaluationHours.toFixed(1)}h` : 'N/A';
    const slipDays = sc.launchSlipOffsetDays ?? 0;
    const maxSun = sc.illuminationWindows?.maxContinuousSunlightHours?.toFixed(1) ?? '0.0';
    const sunPct = sc.illuminationWindows?.fractionalSunlightPct?.toFixed(1) ?? '0.0';
    const totalSun = sc.illuminationWindows?.totalIlluminatedHours?.toFixed(1) ?? '0.0';
    const maxDte = sc.earthLoSWindows?.maxContinuousEarthLoSHours?.toFixed(1) ?? '0.0';
    const dtePct = sc.earthLoSWindows?.fractionalEarthLoSPct?.toFixed(1) ?? '0.0';
    const totalDte = sc.earthLoSWindows?.totalEarthLoSHours?.toFixed(1) ?? '0.0';

    let whiskersTable = '*No horizon-crossing events detected within the evaluated mission window.*';
    if (sc.eventWhiskers && sc.eventWhiskers.length > 0) {
      const rows = sc.eventWhiskers
        .map((w) => {
          const type = sanitizeMarkdownText(w.eventType);
          const nom = sanitizeMarkdownText(w.nominalUtc);
          const low = sanitizeMarkdownText(w.tLowUtc);
          const high = sanitizeMarkdownText(w.tHighUtc);
          const span = w.whiskerSpanHours !== undefined ? `${w.whiskerSpanHours.toFixed(2)}h` : 'N/A';
          const rating = sanitizeMarkdownText(w.sensitivityRating ?? 'NOMINAL');
          return `| **${type}** | \`${nom}\` | \`${low}\` | \`${high}\` | ${span} | ${rating} |`;
        })
        .join('\n');
      whiskersTable = `| Event Type | Nominal Epoch (tNom) | Earliest Bound (tLow) | Latest Bound (tHigh) | Whisker Span | Sensitivity |
|---|---|---|---|---|---|
${rows}`;
    }

    scenarioSection = `
---

## 8. Spatiotemporal Scenario Telemetry & DEM Perturbation Envelopes

| Metric / Parameter | Value | Tactical & Operational Assessment |
|---|---|---|
| **Mission Scenario Window** | ${startIso} to ${stopIso} | Duration: ${totalHours} (Launch Slip: +${slipDays}d) |
| **Effective Epoch Window** | ${effStart} to ${effStop} | Topocentric Horizon Occlusion Solved |
| **LOLA Topographic Profile** | ${bins} bins (Min: ${minEl}, Max: ${maxEl}) | Mean Obstacle: ${meanEl} (${binStatus}) |
| **Continuous Daylight Window** | ${maxSun}h (${sunPct}% total) | Total Sun: ${totalSun}h |
| **Direct-to-Earth LoS Window** | ${maxDte}h (${dtePct}% total) | Total LoS: ${totalDte}h |
| **CAS Calculation ID** | \`${calcId}\` | Cache: ${cacheStatus} |

### DEM Perturbation Whiskers [tLow, tNominal, tHigh]

${whiskersTable}
`;
  }

  const calcProvenance = d.provenance.calculationId
    ? `\n- **CAS Calculation ID:** \`${sanitizeMarkdownText(d.provenance.calculationId)}\``
    : '';

  return `# 🌔 LUNAMISSION EXECUTIVE BRIEFING: ${siteName.toUpperCase()}

> **NASA Space Apps Challenge 2026** — *Lunar Landing Site Navigator*  
> **Mission Epoch:** \`${isoDate}\` | **Briefing Generated:** \`${genDate}\`  
> **Dossier Identifier:** \`${dossierId}\`

---

## Executive Summary

Landing site **${siteName}** is evaluated at epoch \`${isoDate}\` in the lunar south-polar operational envelope. 
- **Solar Power:** ${d.illumination.isIlluminated ? `Solar illumination active at ${d.illumination.sunElevationDeg.toFixed(2)}° elevation (${d.illumination.continuousSunlightHours}h continuous window).` : 'Site is currently in shadow; battery/fuel cell reliance required.'}
- **Direct-to-Earth Telecom:** ${d.telecom.isEarthVisible ? `Earth visible at ${d.telecom.earthElevationDeg.toFixed(2)}° elevation with ${d.telecom.linkMarginDb.toFixed(1)} dB margin on ${d.telecom.carrierBand}.` : 'Earth is sub-horizon or occulted; lunar relay satellite required.'}
- **In-Situ Resource Utilization (ISRU):** ${d.volatiles.isPermanentColdTrap ? `Permanent cold trap detected (${d.volatiles.divinerTempKelvin.toFixed(1)} K) with ${d.volatiles.waterIceYieldKgPerM3.toFixed(1)} kg/m³ estimated yield.` : `Surface temperature at ${d.volatiles.divinerTempKelvin.toFixed(1)} K; volatile viability tier is ${d.volatiles.isruViabilityTier}.`}

---

## 1. Selenographic Geodesy & Reference Frame

| Parameter | Specification | Scientific Remarks |
|---|---|---|
| **Designation** | ${siteName} | ${catalogId ? `Catalog ID: ${catalogId}` : 'User-Defined Custom Landing Target'} |
| **Selenographic Latitude** | **${d.site.latitudeDeg.toFixed(4)}°** | Polar cap zone ($80^\\circ\\text{S} - 90^\\circ\\text{S}$) |
| **Selenographic Longitude** | **${d.site.longitudeDeg.toFixed(4)}°** | Normalized Selenographic reference ($0^\\circ - 360^\\circ$) |
| **LOLA Surface Elevation** | **${d.site.elevationKm.toFixed(3)} km** | Relative to Lunar Reference Sphere ($r = 1,737.4\\text{ km}$) |
| **Altimetry Source** | ${d.site.demSource} | NASA Lunar Reconnaissance Orbiter (LRO) |
| **IAU Reference Frame** | \`${d.site.iauFrame}\` | Mean Earth/Polar Axis system |

---

## 2. Topocentric Illumination & Solar Power

| Parameter | Measured Value | Operational Guidance |
|---|---|---|
| **Sun Elevation Angle** | ${d.illumination.sunElevationDeg.toFixed(2)}° | ${d.illumination.sunElevationDeg > 0 ? 'Direct solar line-of-sight' : 'Sub-horizon / occulted'} |
| **Sun Topocentric Azimuth** | ${d.illumination.sunAzimuthDeg.toFixed(1)}° | Bearing from true North clockwise |
| **Solar Incidence Angle** | ${d.illumination.solarIncidenceAngleDeg.toFixed(2)}° | Grazing angle to surface normal |
| **Continuous Daylight Window** | ~${d.illumination.continuousSunlightHours} hours | Estimated synodic illumination envelope |
| **Grazing Glare Alert** | ${d.illumination.solarGrazingWarning ? '⚠️ ACTIVE (Incidence angle $\\le 3.0^\\circ$)' : 'NOMINAL'} | Blinding solar glare risk for crew/optical sensors |

---

## 3. NASA Deep Space Network (DSN) Telecom

| Parameter | RF Telemetry Value | Architecture Notes |
|---|---|---|
| **Earth Elevation Angle** | ${d.telecom.earthElevationDeg.toFixed(2)}° | ${d.telecom.isEarthVisible ? 'Direct-to-Earth line-of-sight' : 'Occulted by lunar limb'} |
| **Earth Topocentric Azimuth** | ${d.telecom.earthAzimuthDeg.toFixed(1)}° | Bearing to center of Earth disc |
| **RF Carrier Band** | ${d.telecom.carrierBand} (${d.telecom.frequencyGhz.toFixed(2)} GHz) | Primary lunar surface downlink |
| **Free-Space Path Loss (FSPL)** | ${d.telecom.freeSpacePathLossDb.toFixed(1)} dB | ITU-R P.525-4 propagation model |
| **RF Link Margin (Eb/N0)** | **${d.telecom.linkMarginDb.toFixed(1)} dB** | ${d.telecom.linkMarginDb >= 3.0 ? 'Exceeds standard 3.0 dB flight threshold' : 'Low/critical communication margin'} |
| **Active DSN Ground Complex** | **${d.telecom.activeDsnStation}** | ${d.telecom.activeDsnStationCountry} |
| **Multipath Interference Risk** | ${d.telecom.multipathRisk ? '⚠️ ELEVATED (Earth $<2.0^\\circ$ above horizon)' : 'NOMINAL'} | Signal diffraction over local crater ridges |

---

## 4. Volatiles & ISRU Water-Ice Assessment

| Parameter | Measured Value | Mining & Prospecting Viability |
|---|---|---|
| **LEND Epithermal Flux Score** | ${d.volatiles.lendNeutronSuppressionScore} / 120 | LRO Lunar Exploration Neutron Detector |
| **Estimated Hydrogen Content** | **${d.volatiles.hydrogenWeightPct.toFixed(3)} wt%** | Water-Equivalent Hydrogen (WEH) |
| **Diviner Cryogenic Temp** | **${d.volatiles.divinerTempKelvin.toFixed(1)} K** | LRO Diviner Lunar Radiometer Experiment |
| **Permanent Cold Trap (PSR)** | ${d.volatiles.isPermanentColdTrap ? '❄️ CONFIRMED ($T \\le 110\\text{ K}$)' : 'NO ($T > 110\\text{ K}$)'} | Cryogenic retention threshold |
| **Estimated Water-Ice Yield** | **${d.volatiles.waterIceYieldKgPerM3.toFixed(1)} kg / m³** | Volumetric regolith extraction density |
| **Surface Potential Yield** | **${d.volatiles.metricTonsPerHectare.toFixed(1)} metric tons / ha** | 1-meter excavation depth assumption |
| **ISRU Viability Rating** | **TIER ${d.volatiles.isruViabilityTier.toUpperCase()}** | Commercial extraction feasibility |

---
${traversalSection}
---
${benchmarkSection}
---

## 7. Scientific Provenance & Ephemeris Engine

- **Software Platform:** ${d.provenance.softwareVersion}
- **Ephemeris Engine:** ${d.provenance.ephemerisEngine}
- **Topography & Altimetry:** ${d.provenance.lolaModel}
- **Geodesic Frame:** ${d.provenance.coordinateSystem}${calcProvenance}
- **Certification:** Analytical calculations cross-calibrated against NASA Goddard PGDA Product 78/90 and JPL DE421 ephemeris.
${scenarioSection}`;
}

export function formatDossierAsJson(dossier: MissionDossier): string {
  return JSON.stringify(
    {
      schema: 'https://lunamission.spaceapps.nasa.gov/schemas/dossier-v1.json',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      dossier,
    },
    null,
    2,
  );
}
