/**
 * Radio Frequency (RF) Link Budget & NASA Deep Space Network (DSN) Engine.
 *
 * Models telecommunications between lunar surface assets (landers, rovers) and
 * Earth ground stations. Computes Free-Space Path Loss (FSPL), received carrier power,
 * Eb/N0 spectral efficiency, link margin, and DSN ground station handover tracking.
 *
 * Physical references:
 * - ITU-R P.525-4: Calculation of free-space attenuation.
 * - NASA DSN 810-005: Deep Space Network Telecommunications Link Design Handbook.
 * - ECSS-E-ST-50-05C: Radio frequency and modulation standards.
 */

export type FrequencyBandKey = 'sBandUplink' | 'sBandDownlink' | 'xBandUplink' | 'xBandDownlink' | 'kaBandDownlink';

export interface FrequencyBandConfig {
  name: string;
  frequencyGhz: number;
  direction: 'uplink' | 'downlink';
  requiredEbN0Db: number; // e.g. LDPC rate 1/2 or Turbo code requirement
  landerAntennaGainDbi: number;
  dsnAntennaGainDbi: number; // 70-meter dish equivalent
}

export const FREQUENCY_BANDS: Record<FrequencyBandKey, FrequencyBandConfig> = {
  sBandUplink: {
    name: 'S-Band Uplink (2.1 GHz)',
    frequencyGhz: 2.1,
    direction: 'uplink',
    requiredEbN0Db: 4.0,
    landerAntennaGainDbi: 12.0, // Low-gain / Medium-gain antenna
    dsnAntennaGainDbi: 62.0,
  },
  sBandDownlink: {
    name: 'S-Band Downlink (2.3 GHz)',
    frequencyGhz: 2.3,
    direction: 'downlink',
    requiredEbN0Db: 4.0,
    landerAntennaGainDbi: 12.0,
    dsnAntennaGainDbi: 63.5,
  },
  xBandUplink: {
    name: 'X-Band Uplink (7.2 GHz)',
    frequencyGhz: 7.19,
    direction: 'uplink',
    requiredEbN0Db: 4.5,
    landerAntennaGainDbi: 27.0, // High-gain parabolic / phased array
    dsnAntennaGainDbi: 72.5,
  },
  xBandDownlink: {
    name: 'X-Band Downlink (8.4 GHz)',
    frequencyGhz: 8.45,
    direction: 'downlink',
    requiredEbN0Db: 4.5,
    landerAntennaGainDbi: 28.5,
    dsnAntennaGainDbi: 74.0,
  },
  kaBandDownlink: {
    name: 'Ka-Band Downlink (32.0 GHz)',
    frequencyGhz: 32.0,
    direction: 'downlink',
    requiredEbN0Db: 5.5,
    landerAntennaGainDbi: 38.0,
    dsnAntennaGainDbi: 84.5,
  },
};

export interface DsnComplex {
  id: 'goldstone' | 'madrid' | 'canberra';
  name: string;
  country: string;
  latitudeDeg: number;
  longitudeDeg: number;
  primary70mDish: string;
}

export const DSN_COMPLEXES: DsnComplex[] = [
  {
    id: 'goldstone',
    name: 'Goldstone Deep Space Communications Complex',
    country: 'United States (California)',
    latitudeDeg: 35.4266,
    longitudeDeg: -116.89,
    primary70mDish: 'DSS-14 (Mars antenna)',
  },
  {
    id: 'madrid',
    name: 'Madrid Deep Space Communications Complex',
    country: 'Spain (Robledo de Chavela)',
    latitudeDeg: 40.4273,
    longitudeDeg: -4.2497,
    primary70mDish: 'DSS-63 (70m)',
  },
  {
    id: 'canberra',
    name: 'Canberra Deep Space Communication Complex',
    country: 'Australia (Tidbinbilla)',
    latitudeDeg: -35.4014,
    longitudeDeg: 148.9817,
    primary70mDish: 'DSS-43 (Southern Hemisphere 70m)',
  },
];

export interface LinkBudgetInput {
  earthDistanceKm: number;
  earthElevationDeg: number;
  isTerrainObstructed: boolean;
  band: FrequencyBandKey;
  transmitterPowerWatts: number;
  dataRateMbps: number;
}

export type LinkState = 'locked' | 'marginal' | 'loss_of_signal';

export interface RfLinkBudgetResult {
  linkState: LinkState;
  frequencyGhz: number;
  fsplDb: number;
  eirpDbw: number;
  receivedPowerDbm: number;
  carrierToNoiseDensityDbHz: number;
  ebN0Db: number;
  requiredEbN0Db: number;
  linkMarginDb: number;
  multipathWarning: boolean;
  dataRateMbps: number;
}

/**
 * Calculates Free Space Path Loss (FSPL) in decibels (ITU-R P.525-4).
 * FSPL(dB) = 20 * log10(d_km) + 20 * log10(f_GHz) + 92.45
 */
export function calculateFreeSpacePathLoss(distanceKm: number, frequencyGhz: number): number {
  if (distanceKm <= 0 || frequencyGhz <= 0) return 0;
  return 20 * Math.log10(distanceKm) + 20 * Math.log10(frequencyGhz) + 92.45;
}

/**
 * Computes complete end-to-end RF link budget for lunar lander / rover.
 */
export function calculateRfLinkBudget(input: LinkBudgetInput): RfLinkBudgetResult {
  const bandConfig = FREQUENCY_BANDS[input.band];
  const fsplDb = calculateFreeSpacePathLoss(input.earthDistanceKm, bandConfig.frequencyGhz);

  // If Earth is below horizon or blocked by crater rim -> complete loss of signal
  if (input.earthElevationDeg <= 0 || input.isTerrainObstructed) {
    return {
      linkState: 'loss_of_signal',
      frequencyGhz: bandConfig.frequencyGhz,
      fsplDb,
      eirpDbw: 0,
      receivedPowerDbm: -Infinity,
      carrierToNoiseDensityDbHz: -Infinity,
      ebN0Db: -Infinity,
      requiredEbN0Db: bandConfig.requiredEbN0Db,
      linkMarginDb: -Infinity,
      multipathWarning: false,
      dataRateMbps: input.dataRateMbps,
    };
  }

  // Transmitter EIRP: Pt(dBW) + Gt(dBi) - L_cable(1.5 dB)
  const ptDbw = 10 * Math.log10(Math.max(0.1, input.transmitterPowerWatts));
  const cableLossDb = 1.5;
  const eirpDbw = ptDbw + bandConfig.landerAntennaGainDbi - cableLossDb;

  // Multipath & lunar rim diffraction penalty when Earth is <2.0 deg above terrain
  const isGrazing = input.earthElevationDeg < 2.0;
  const multipathLossDb = isGrazing ? 2.5 : 0.0;
  const atmLossDb = 0.3; // Earth atmospheric loss (X/Ka band near zenith)

  // Received power at DSN dish (dBW)
  const prxDbw = eirpDbw - fsplDb + bandConfig.dsnAntennaGainDbi - multipathLossDb - atmLossDb;
  const receivedPowerDbm = prxDbw + 30.0;

  // DSN cryogenic receiver noise temperature (Tsys ~ 25K at X-band, 35K at Ka-band)
  const tSysK = input.band === 'kaBandDownlink' ? 35.0 : 25.0;
  // Boltzmann constant k = -228.6 dBW / (Hz * K)
  const boltzmannDbw = -228.6;
  const noiseSpectralDensityDbwHz = boltzmannDbw + 10 * Math.log10(tSysK);

  // Carrier-to-noise density C/N0 (dB-Hz)
  const carrierToNoiseDensityDbHz = prxDbw - noiseSpectralDensityDbwHz;

  // Bit rate in dB-Hz: 10 * log10(dataRate in bps)
  const dataRateBps = Math.max(1000, input.dataRateMbps * 1e6);
  const dataRateDbHz = 10 * Math.log10(dataRateBps);

  // Energy per bit to noise power density Eb/N0 (dB)
  const ebN0Db = carrierToNoiseDensityDbHz - dataRateDbHz;

  // Link Margin (dB)
  const linkMarginDb = ebN0Db - bandConfig.requiredEbN0Db;

  const linkState: LinkState = linkMarginDb >= 3.0 ? 'locked' : linkMarginDb >= 0.0 ? 'marginal' : 'loss_of_signal';

  return {
    linkState,
    frequencyGhz: bandConfig.frequencyGhz,
    fsplDb: Math.round(fsplDb * 100) / 100,
    eirpDbw: Math.round(eirpDbw * 100) / 100,
    receivedPowerDbm: Math.round(receivedPowerDbm * 100) / 100,
    carrierToNoiseDensityDbHz: Math.round(carrierToNoiseDensityDbHz * 100) / 100,
    ebN0Db: Math.round(ebN0Db * 100) / 100,
    requiredEbN0Db: bandConfig.requiredEbN0Db,
    linkMarginDb: Math.round(linkMarginDb * 100) / 100,
    multipathWarning: isGrazing,
    dataRateMbps: input.dataRateMbps,
  };
}

export interface DsnStationVisibility {
  stationId: 'goldstone' | 'madrid' | 'canberra';
  name: string;
  country: string;
  elevationDeg: number;
  azimuthDeg: number;
  isVisible: boolean;
  dishName: string;
}

/**
 * Calculates local elevation and azimuth from each DSN ground station towards the Moon.
 * DSN stations have a standard 10.0-degree horizon mask.
 */
export function calculateDsnStationVisibilities(
  epochMs: number,
  moonSubEarthLonDeg = 0.0,
  moonSubEarthLatDeg = 0.0,
): DsnStationVisibility[] {
  // Greenwich Mean Sidereal Time (GMST) angle in degrees from epoch
  const jd = epochMs / 86400000 + 2440587.5;
  const d = jd - 2451545.0;
  const gmstDeg = ((280.46061837 + 360.98564736629 * d) % 360 + 360) % 360;

  return DSN_COMPLEXES.map((station) => {
    // Hour angle of Moon relative to ground station
    const stationGhaDeg = ((gmstDeg + station.longitudeDeg) % 360 + 360) % 360;
    const hourAngleDeg = ((stationGhaDeg - moonSubEarthLonDeg) % 360 + 360) % 360;
    const haRad = (hourAngleDeg * Math.PI) / 180;
    const latRad = (station.latitudeDeg * Math.PI) / 180;
    const decRad = (moonSubEarthLatDeg * Math.PI) / 180;

    // Local topocentric elevation formula: sin(el) = sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(ha)
    const sinEl = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const elevationDeg = Math.asin(Math.max(-1, Math.min(1, sinEl))) * (180 / Math.PI);

    // Azimuth calculation
    const y = -Math.sin(haRad);
    const x = Math.tan(decRad) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(haRad);
    const azimuthDeg = ((Math.atan2(y, x) * (180 / Math.PI)) % 360 + 360) % 360;

    const isVisible = elevationDeg >= 10.0;

    return {
      stationId: station.id,
      name: station.name,
      country: station.country,
      elevationDeg: Math.round(elevationDeg * 10) / 10,
      azimuthDeg: Math.round(azimuthDeg * 10) / 10,
      isVisible,
      dishName: station.primary70mDish,
    };
  });
}

/**
 * Selects the optimal active DSN station (highest elevation angle above the 10-degree mask).
 */
export function determineActiveDsnStation(visibilities: DsnStationVisibility[]): DsnStationVisibility | null {
  const visibleStations = visibilities.filter((v) => v.isVisible);
  if (visibleStations.length === 0) return null;
  return visibleStations.reduce((best, curr) => (curr.elevationDeg > best.elevationDeg ? curr : best), visibleStations[0]);
}
