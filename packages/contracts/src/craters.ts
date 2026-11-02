export interface CraterMorphologyDatum {
  id: string;
  name: string;
  centerLatDeg: number;
  centerLonDeg: number;
  diameterKm: number;
  rimElevationMeters: number;
  floorElevationMeters: number;
  innerWallSlopeDeg: number;
  hasCentralPeak?: boolean;
  centralPeakHeightMeters?: number;
  isDeepPsr: boolean;
}

export const LOLA_POLAR_CRATER_MORPHOLOGIES: CraterMorphologyDatum[] = [
  {
    id: 'shackleton',
    name: 'Shackleton',
    centerLatDeg: -89.68,
    centerLonDeg: 125.0,
    diameterKm: 21.0,
    rimElevationMeters: 4250,
    floorElevationMeters: -4200,
    innerWallSlopeDeg: 32.5,
    isDeepPsr: true,
  },
  {
    id: 'de-gerlache',
    name: 'de Gerlache',
    centerLatDeg: -88.48,
    centerLonDeg: 271.4,
    diameterKm: 32.4,
    rimElevationMeters: 3610,
    floorElevationMeters: -1800,
    innerWallSlopeDeg: 26.0,
    isDeepPsr: true,
  },
  {
    id: 'shoemaker',
    name: 'Shoemaker',
    centerLatDeg: -88.14,
    centerLonDeg: 44.9,
    diameterKm: 50.9,
    rimElevationMeters: 2800,
    floorElevationMeters: -3100,
    innerWallSlopeDeg: 22.0,
    isDeepPsr: true,
  },
  {
    id: 'faustini',
    name: 'Faustini',
    centerLatDeg: -87.28,
    centerLonDeg: 84.3,
    diameterKm: 39.0,
    rimElevationMeters: 2200,
    floorElevationMeters: -2900,
    innerWallSlopeDeg: 24.0,
    isDeepPsr: true,
  },
  {
    id: 'haworth',
    name: 'Haworth',
    centerLatDeg: -87.40,
    centerLonDeg: 354.5,
    diameterKm: 51.4,
    rimElevationMeters: 1950,
    floorElevationMeters: -3600,
    innerWallSlopeDeg: 28.0,
    isDeepPsr: true,
  },
  {
    id: 'amundsen',
    name: 'Amundsen',
    centerLatDeg: -84.44,
    centerLonDeg: 82.8,
    diameterKm: 105.0,
    rimElevationMeters: 3200,
    floorElevationMeters: -2800,
    innerWallSlopeDeg: 18.0,
    hasCentralPeak: true,
    centralPeakHeightMeters: 1850,
    isDeepPsr: false,
  },
  {
    id: 'nobile',
    name: 'Nobile',
    centerLatDeg: -85.28,
    centerLonDeg: 53.5,
    diameterKm: 73.0,
    rimElevationMeters: 2400,
    floorElevationMeters: -1200,
    innerWallSlopeDeg: 16.5,
    isDeepPsr: false,
  },
  {
    id: 'cabeus',
    name: 'Cabeus',
    centerLatDeg: -85.33,
    centerLonDeg: 321.9,
    diameterKm: 98.0,
    rimElevationMeters: 2900,
    floorElevationMeters: -2400,
    innerWallSlopeDeg: 20.0,
    isDeepPsr: true,
  },
];
