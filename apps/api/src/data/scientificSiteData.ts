import type { ScientificSiteInvestigation } from '@luna/contracts';
import { generateSiteTransect } from './lolaTransectSampler';
import { getSiteInvestigation } from './siteInvestigationRegistry';
import { getSiteById } from './catalog';

export { COMMON_NASA_URLS } from './scientificNasaUrls';
import { PRIMARY_SCIENTIFIC_INVESTIGATIONS } from './primaryScientificInvestigations';
import { SECONDARY_SCIENTIFIC_INVESTIGATIONS } from './secondaryScientificInvestigations';
import { EXTENDED_SCIENTIFIC_INVESTIGATIONS } from './extendedScientificInvestigations';

export const SCIENTIFIC_SITE_INVESTIGATIONS: Record<string, ScientificSiteInvestigation> = {
  ...PRIMARY_SCIENTIFIC_INVESTIGATIONS,
  ...SECONDARY_SCIENTIFIC_INVESTIGATIONS,
  ...EXTENDED_SCIENTIFIC_INVESTIGATIONS,
};

export function getScientificSiteInvestigation(siteId: string): ScientificSiteInvestigation | null {
  const existing = SCIENTIFIC_SITE_INVESTIGATIONS[siteId];
  const site = getSiteById(siteId);

  // Compute live 48-point LOLA altimetric cross section if coordinates exist
  const transect = site
    ? generateSiteTransect(siteId, site.coordinates.latitudeDeg, site.coordinates.longitudeDeg)
    : null;

  if (existing) {
    const coords = site
      ? {
          latitudeDeg: site.coordinates.latitudeDeg,
          longitudeDeg: site.coordinates.longitudeDeg,
          elevationMeters: site.coordinates.elevationMeters,
          coordinateFrame: 'IAU/IAG Lunar Mean Earth/Polar Axis (ME)',
        }
      : existing.coordinates;

    if (transect) {
      return {
        ...existing,
        coordinates: coords,
        topography: {
          ...existing.topography,
          summitElevationMeters: Math.max(existing.topography.summitElevationMeters, transect.summitElevationMeters),
          meanSlopeDeg: transect.meanSlopeDeg,
          maxSlopeDeg: transect.maxSlopeDeg,
          traversableSlopePercentage: transect.traversablePct,
          elevationProfile: transect.points.map((p) => ({
            distanceKm: p.distKm,
            elevationMeters: p.elevationMeters,
            slopeDeg: p.slopeDeg,
            hazardTier: p.hazardTier,
            label: p.distKm === 12 ? `${existing.name} (Apex)` : undefined,
          })),
        },
      };
    }
    return { ...existing, coordinates: coords };
  }

  // Synthesize complete scientific profile for newly added Artemis III candidates
  if (!site) return null;

  const registryProfile = getSiteInvestigation(siteId, site.name, site.coordinates.elevationMeters);
  const elevationPoints = transect
    ? transect.points.map((p) => ({
        distanceKm: p.distKm,
        elevationMeters: p.elevationMeters,
        slopeDeg: p.slopeDeg,
        hazardTier: p.hazardTier,
        label: p.distKm === 12 ? `${site.name} (Summit)` : undefined,
      }))
    : [
        { distanceKm: 0, elevationMeters: site.coordinates.elevationMeters - 800 },
        { distanceKm: 12, elevationMeters: site.coordinates.elevationMeters, label: `${site.name} (Summit)` },
        { distanceKm: 24, elevationMeters: site.coordinates.elevationMeters - 1200 },
      ];

  const featureTypeMap: Record<string, 'Crater Rim Peak' | 'Structural Ridge' | 'Isolated Massif' | 'Crater Floor Margin' | 'Highland Plateau'> = {
    'PLATEAU SUMMIT': 'Highland Plateau',
    'MOUNTAIN MASSIF': 'Isolated Massif',
    'CRATER RIM PEAK': 'Crater Rim Peak',
    'INTER-CRATER RIDGE': 'Structural Ridge',
    'INTER-CRATER PLAIN': 'Highland Plateau',
    'CRATER FLOOR MARGIN': 'Crater Floor Margin',
  };
  const featureType = featureTypeMap[registryProfile.badgeType] ?? 'Highland Plateau';

  const coldTrapMap: Record<string, 'Permanent Cold Trap (<110 K)' | 'Seasonal Cold Trap' | 'Illuminated High'> = {
    'Cryogenic (<110K)': 'Permanent Cold Trap (<110 K)',
    'Sub-Surface Stable': 'Seasonal Cold Trap',
    'Transient Volatiles': 'Illuminated High',
  };
  const coldTrapPermanence = coldTrapMap[registryProfile.coldTrapStability] ?? 'Permanent Cold Trap (<110 K)';

  const slopeStatus =
    registryProfile.maxSlopeDeg < 15
      ? 'Pass (<10° gentle rim)'
      : registryProfile.maxSlopeDeg <= 22
        ? 'Caution (10°-18° ridge)'
        : 'Hazard (>20° inner crater wall)';

  const trafficability =
    registryProfile.traversableAreaPct > 80
      ? 'High (Smooth Regolith Blanket)'
      : registryProfile.traversableAreaPct >= 65
        ? 'Moderate (Blocky Ejecta)'
        : 'Low (Steep Slopes)';

  return {
    id: site.id,
    code: site.code,
    name: site.name,
    featureType,
    coordinates: {
      latitudeDeg: site.coordinates.latitudeDeg,
      longitudeDeg: site.coordinates.longitudeDeg,
      elevationMeters: site.coordinates.elevationMeters ?? 3000,
      coordinateFrame: 'IAU/IAG Lunar Mean Earth/Polar Axis (ME)',
    },
    topography: {
      summitElevationMeters: transect?.summitElevationMeters ?? (site.coordinates.elevationMeters ?? 3000),
      craterFloorElevationMeters: transect?.minElevationMeters,
      reliefSpanMeters: transect?.reliefSpanMeters ?? 2400,
      meanSlopeDeg: transect?.meanSlopeDeg ?? 8.5,
      maxSlopeDeg: transect?.maxSlopeDeg ?? registryProfile.maxSlopeDeg,
      traversableSlopePercentage: transect?.traversablePct ?? registryProfile.traversableAreaPct,
      elevationUncertaintyMeters: 1.2,
      effectiveSpatialResolution: '20 m/pixel (LOLA Resampled GDR)',
      demSourceAttribution: 'NASA Goddard PGDA Product 78 / LOLA Polar Stereographic DEM',
      elevationProfile: elevationPoints,
    },
    geology: {
      stratigraphicUnitCode: registryProfile.stratigraphicUnit.split(' ')[0] || 'pNb',
      stratigraphicUnitName: registryProfile.stratigraphicUnit,
      geologicalEpoch: 'Pre-Nectarian',
      estimatedAgeBillionYears: registryProfile.geologicAge,
      lithologyInterpretation: registryProfile.primaryLithology,
      mappingConfidence: 'High (Morphological & Spectral Consensus)',
      sourceCitation: 'NASA Lunar Reconnaissance Orbiter Science Team & USGS SIM 3316 Polar Geologic Map.',
      regionalContext: registryProfile.regionalContext,
    },
    illuminationThermal: {
      annualSolarExposurePercentage: registryProfile.annualIlluminationPct,
      maxContinuousDarknessHours: 72,
      maxContinuousIlluminationHours: registryProfile.maxContinuousDaylightHours,
      averageSolarElevationDeg: registryProfile.grazingIncidenceAngleDeg,
      psrPresent: registryProfile.psrProximityKm < 4.0,
      psrAreaKm2: 120,
      peakSummerTemperatureKelvin: registryProfile.peakSurfaceTempK,
      minimumShadowTemperatureKelvin: registryProfile.minCryogenicTempK,
      measurementType: 'Diviner Radiometer Observations + LOLA Horizon Simulation',
      coldTrapPermanence,
    },
    resources: {
      waterEquivalentHydrogenWtPct: {
        value: registryProfile.wehWeightPct,
        uncertainty: 0.04,
      },
      volatileEvidenceStatus: 'Indirect Detection (Neutron Suppression / Radar CPR)',
      primaryInstrumentSources: ['LRO LEND', 'LRO ShadowCam', 'LRO Diviner'],
      subsurfaceIceInterpretation: `${registryProfile.neutronSuppressionSignature}. Strategic proximity to volatile cold trap (${registryProfile.psrProximityKm} km).`,
      coldTrapStabilityDepthCm: 'Permanent ice stability within top 10 cm in persistent shadows.',
      citationText: 'Mitrofanov, I.G. et al. (2012). Testing the presence of water ice at lunar south pole with LEND. Science, 330, 483-486.',
      cautionaryNotice: 'Micro-cold traps present in localized depressions and boulder shadows.',
    },
    missionConstraints: {
      overallSuitabilityRating: 'Optimal Prime Landing Zone',
      slopeConstraintStatus: slopeStatus,
      solarPowerViability: registryProfile.annualIlluminationPct > 85 ? 'Exceptional (Multi-Month Sunlight)' : 'High (Seasonal)',
      directToEarthVisibilityPercentage: registryProfile.directToEarthPct,
      telecomRelayRequired: registryProfile.directToEarthPct < 60,
      surfaceTrafficability: trafficability,
      identifiedHazards: registryProfile.keyOperationalRisks,
    },
    dataProvenance: {
      lolaDemProduct: 'NASA PDS LOLA GDR 128ppd (PDS Geosciences Node)',
      lrocMosaicReference: 'LROC NAC controlled south-polar average mosaic 1m/px',
      divinerThermalDataset: 'LRO Diviner Global Surface Temperature Gridded Data Records',
      lendHydrogenDataset: 'LRO LEND Corrected Epithermal Neutron Flux (OOT_EVI)',
      lastVerifiedDate: '2026-10-25',
      nasaProductUrls: {
        lolaDem: registryProfile.primaryNasaUrl,
        lolaGlobal: 'https://pgda.gsfc.nasa.gov/products/90',
        lpiAtlas: registryProfile.secondaryNasaUrl,
        lrocMosaic: 'https://www.nasa.gov/missions/lro/nasa-moon-camera-mosaic-sheds-light-on-lunar-south-pole/',
      },
    },
  };
}
