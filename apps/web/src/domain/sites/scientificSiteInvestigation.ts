/**
 * Scientific Site Investigation Data Model
 *
 * Grounded in peer-reviewed planetary datasets:
 * - NASA LOLA (Lunar Orbiter Laser Altimeter): Topography, slope, roughness
 * - NASA LROC (Lunar Reconnaissance Orbiter Camera): High-resolution morphology & ShadowCam mosaics
 * - NASA Diviner Lunar Radiometer Experiment: Surface brightness temperatures & bolometric cold traps
 * - NASA LEND (Lunar Exploration Neutron Detector): Epithermal neutron suppression (hydrogen/volatile proxy)
 * - LPI Lunar South Pole Atlas (Spudis et al., 2008; Lemelin et al., 2014): South Pole-Aitken basin geology
 */

export interface ElevationProfilePoint {
  distanceKm: number;
  elevationMeters: number;
  label?: string;
  slopeDeg?: number;
  hazardTier?: 'safe' | 'caution' | 'hazard';
}

export interface SiteTopographyData {
  summitElevationMeters: number;
  craterFloorElevationMeters?: number;
  reliefSpanMeters: number;
  meanSlopeDeg: number;
  maxSlopeDeg: number;
  traversableSlopePercentage: number; // Percentage of local terrain with slope < 15°
  elevationUncertaintyMeters: number; // e.g. ±1.2m from LOLA GDR
  effectiveSpatialResolution: string; // e.g. "20 m/pixel (LOLA Resampled)"
  demSourceAttribution: string;
  elevationProfile: ElevationProfilePoint[];
}

export interface SiteGeologyData {
  stratigraphicUnitCode: string; // e.g. "pNb" (Pre-Nectarian basin floor)
  stratigraphicUnitName: string;
  geologicalEpoch: 'Pre-Nectarian' | 'Nectarian' | 'Lower Imbrian' | 'Upper Imbrian' | 'Eratosthenian' | 'Copernican' | string;
  estimatedAgeBillionYears: string; // e.g. "4.2 - 3.9 Ga"
  lithologyInterpretation: string; // e.g. "Anorthositic norite, shocked impact melt sheet, polymict impact breccia"
  mappingConfidence: 'High (Morphological & Spectral Consensus)' | 'Moderate (Interpolated Unit)' | 'Preliminary' | string;
  sourceCitation: string;
  regionalContext: string;
}

export interface SiteIlluminationThermalData {
  annualSolarExposurePercentage: number; // e.g. 86.4%
  maxContinuousDarknessHours: number; // e.g. 54 hours
  maxContinuousIlluminationHours: number; // e.g. 2100 hours (lunar summer)
  averageSolarElevationDeg: number;
  psrPresent: boolean;
  psrAreaKm2?: number;
  peakSummerTemperatureKelvin: number;
  minimumShadowTemperatureKelvin: number; // e.g. 40 K inside deep PSR
  measurementType: string;
  coldTrapPermanence: 'Permanent Cold Trap (<110 K)' | 'Seasonal Cold Trap' | 'Illuminated High' | string;
}

export type VolatileEvidenceTier =
  | 'Direct Measurement (Impact Plume / Spectroscopy)'
  | 'Indirect Detection (Neutron Suppression / Radar CPR)'
  | 'Inferred Potential (Thermal Cold Trap Climatology)'
  | 'Unconfirmed / Low Probability'
  | string;

export interface SiteResourcesData {
  waterEquivalentHydrogenWtPct?: {
    value: number; // e.g. 0.55%
    uncertainty: number; // e.g. ±0.15%
  };
  volatileEvidenceStatus: VolatileEvidenceTier;
  primaryInstrumentSources: string[];
  subsurfaceIceInterpretation: string;
  coldTrapStabilityDepthCm: string; // e.g. "Stable within 5-10 cm of surface in permanent shadow"
  scientificCitationUrl?: string;
  citationText: string;
  cautionaryNotice: string;
}

export interface SiteMissionConstraintsData {
  overallSuitabilityRating: 'Optimal Prime Landing Zone' | 'High-Priority Science Site' | 'Challenging Traverse Target' | 'Specialized Communications Relayer' | string;
  slopeConstraintStatus: 'Pass (<10° gentle rim)' | 'Caution (10°-18° ridge)' | 'Hazard (>20° inner crater wall)' | string;
  solarPowerViability: 'Exceptional (Multi-Month Sunlight)' | 'High (Seasonal)' | 'Restricted' | string;
  directToEarthVisibilityPercentage: number; // e.g. 58.2% (dependent on lunar libration)
  telecomRelayRequired: boolean;
  surfaceTrafficability: 'High (Smooth Regolith Blanket)' | 'Moderate (Blocky Ejecta)' | 'Low (Steep Slopes)' | string;
  identifiedHazards: string[];
}

export interface ScientificSiteInvestigation {
  id: string;
  code: string;
  name: string;
  featureType: 'Crater Rim Peak' | 'Structural Ridge' | 'Isolated Massif' | 'Crater Floor Margin' | 'Highland Plateau' | string;
  coordinates: {
    latitudeDeg: number;
    longitudeDeg: number;
    elevationMeters: number;
    coordinateFrame: string;
  };
  topography: SiteTopographyData;
  geology: SiteGeologyData;
  illuminationThermal: SiteIlluminationThermalData;
  resources: SiteResourcesData;
  missionConstraints: SiteMissionConstraintsData;
  dataProvenance: {
    lolaDemProduct: string;
    lrocMosaicReference: string;
    divinerThermalDataset: string;
    lendHydrogenDataset: string;
    lastVerifiedDate: string;
    nasaProductUrls?: {
      lolaDem?: string;
      lolaGlobal?: string;
      lpiAtlas?: string;
      lrocMosaic?: string;
    };
  };
}
