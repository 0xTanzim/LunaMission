/**
 * Official Lunar Data and Asset Manifest for LunaMission
 * Grounded in NASA SVS CGI Moon Kit, LROC NAC Mosaics, and LOLA Topography datasets.
 * Establishes explicit boundaries between aesthetic visual context and analytic scientific elevation.
 */

export interface SpatialAssetEntry {
  id: string;
  label: string;
  provider: string;
  sourceUrl: string;
  productId: string;
  productVersion: string;
  visualPurpose: 'visual-context' | 'scientific-analysis' | 'both';
  coordinateFrame: string;
  projection: string;
  bounds: {
    minLatDeg: number;
    maxLatDeg: number;
    minLonDeg: number;
    maxLonDeg: number;
  };
  spatialResolution: {
    value: number;
    unit: 'm/px' | 'px/degree' | 'ppd';
  };
  verticalUnits: string;
  noDataPolicy: string;
  attribution: string;
  coverageStatus: 'verified' | 'partial' | 'unknown';
  notes: string;
}

export const LUNAR_ASSET_MANIFEST: Record<string, SpatialAssetEntry> = {
  lroc_color_global: {
    id: 'lroc_color_global',
    label: 'NASA LROC WAC Global Color Mosaic',
    provider: 'NASA / GSFC / Arizona State University (SVS Moon Kit)',
    sourceUrl: 'https://svs.gsfc.nasa.gov/4720/',
    productId: 'lroc_color_2k',
    productVersion: '2025 SVS CGI Moon Kit Release',
    visualPurpose: 'visual-context',
    coordinateFrame: 'IAU/IAG Lunar Mean Earth/Polar Axis',
    projection: 'Equirectangular (Plate Carrée)',
    bounds: {
      minLatDeg: -90,
      maxLatDeg: 90,
      minLonDeg: 0,
      maxLonDeg: 360,
    },
    spatialResolution: {
      value: 64,
      unit: 'ppd',
    },
    verticalUnits: 'None (Albedo/Color RGB)',
    noDataPolicy: 'High-latitude illumination blend fill; not for photometric analysis',
    attribution: 'NASA/GSFC/SVS/Arizona State University',
    coverageStatus: 'verified',
    notes: 'Optimized for visual context. Per NASA SVS documentation, color textures are aesthetic representations; analytic operations use primary LOLA GDR rasters.',
  },

  lola_dem_global_relief: {
    id: 'lola_dem_global_relief',
    label: 'LOLA Global Digital Elevation Model Topography',
    provider: 'NASA / GSFC / LOLA Science Team',
    sourceUrl: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
    productId: 'ldem_topo',
    productVersion: 'LOLA GDR 128ppd Elevation',
    visualPurpose: 'both',
    coordinateFrame: 'IAU/IAG Lunar Mean Earth/Polar Axis',
    projection: 'Equirectangular (Cylindrical)',
    bounds: {
      minLatDeg: -90,
      maxLatDeg: 90,
      minLonDeg: 0,
      maxLonDeg: 360,
    },
    spatialResolution: {
      value: 128,
      unit: 'ppd',
    },
    verticalUnits: 'Meters relative to 1737.4 km reference lunar radius',
    noDataPolicy: 'Interpolated via spherical harmonics where track spacing allows',
    attribution: 'NASA/GSFC/LOLA Science Team',
    coverageStatus: 'verified',
    notes: 'Provides global normal and bump shading. Applied at calibrated 1x physical scale equivalent without spiky vertex distortion.',
  },

  lola_polar_stereo_128: {
    id: 'lola_polar_stereo_128',
    label: 'LOLA South Pole Polar Stereographic DEM (83°S–90°S)',
    provider: 'NASA Planetary Geology, Geophysics and Geochemistry Laboratory',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    productId: 'LOLA_SOUTH_POLE_128PPD',
    productVersion: 'LRO LOLA Polar Gridded Data Record',
    visualPurpose: 'scientific-analysis',
    coordinateFrame: 'IAU/IAG Lunar Mean Earth / Polar Axis (ME)',
    projection: 'South Polar Stereographic (Center: 90°S, 0°E)',
    bounds: {
      minLatDeg: -90,
      maxLatDeg: -83,
      minLonDeg: 0,
      maxLonDeg: 360,
    },
    spatialResolution: {
      value: 20,
      unit: 'm/px',
    },
    verticalUnits: 'Meters relative to 1737.4 km reference sphere',
    noDataPolicy: 'Zero-filled outside coverage; explicit coverage boundary enforced at 83°S',
    attribution: 'NASA/GSFC/PGDA',
    coverageStatus: 'verified',
    notes: 'Authoritative data source for 2D polar stereographic map, candidate coordinates, and horizon profile analysis.',
  },
};
