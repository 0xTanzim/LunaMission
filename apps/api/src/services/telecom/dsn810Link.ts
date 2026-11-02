/**
 * NASA Deep Space Network (DSN) 810-005 Link Budget Engine
 *
 * Implements specifications from DSN 810-005:
 * - Module 101: 70-m Subnet Telecommunications Interfaces
 * - Module 104: 34-m Beam Waveguide (BWG) Subnet Interfaces
 *
 * Calculates:
 * 1. Elevation-dependent system operating noise temperature T_op(theta_el)
 * 2. Downlink Carrier-to-Noise Density Ratio (C/N_0)
 * 3. Link margin taking into account ITU-R P.526-16 knife-edge terrain diffraction
 */

export const BOLTZMANN_CONSTANT_DBW_PER_HZ_K = -228.6; // 10 * log10(1.380649e-23)
export const SPEED_OF_LIGHT_M_PER_S = 299792458;

export type DsnStationType = '34m-bwg' | '70m';
export type TelecomRfBand = 'x-band' | 'ka-band';

export interface DsnAntennaProfile {
  readonly diameterMeters: number;
  readonly gainXbandDbi: number;
  readonly gainKabandDbi: number;
  readonly zenithTopXbandK: number;
  readonly zenithTopKabandK: number;
}

export const DSN_STATION_ANTENNAS: Record<DsnStationType, DsnAntennaProfile> = {
  '34m-bwg': {
    diameterMeters: 34.0,
    gainXbandDbi: 68.3,
    gainKabandDbi: 78.8,
    zenithTopXbandK: 20.0,
    zenithTopKabandK: 35.0,
  },
  '70m': {
    diameterMeters: 70.0,
    gainXbandDbi: 74.4,
    gainKabandDbi: 84.0,
    zenithTopXbandK: 17.5,
    zenithTopKabandK: 30.0,
  },
};

export interface DsnLinkBudgetInput {
  readonly stationType: DsnStationType;
  readonly band: TelecomRfBand;
  readonly earthElevationDeg: number;
  readonly transmitterPowerWatts: number;
  readonly txAntennaGainDbi: number;
  readonly diffractionLossDb: number;
  readonly dataRateBps: number;
  readonly earthDistanceKm: number;
}

export interface DsnLinkBudgetOutput {
  readonly eirpDbw: number;
  readonly freeSpacePathLossDb: number;
  readonly operatingNoiseTempK: number;
  readonly groundAntennaGainDbi: number;
  readonly gainOverTemperatureGtDbK: number;
  readonly carrierToNoiseRatioC_N0: number;
  readonly requiredEbN0Db: number;
  readonly linkMarginDb: number;
  readonly isLinkViable: boolean;
}

/**
 * Computes elevation-dependent system operating noise temperature T_op in Kelvin per DSN 810-005.
 */
export function calculateDsnOperatingNoiseTemperature(
  stationType: DsnStationType,
  band: TelecomRfBand,
  earthElevationDeg: number
): number {
  const profile = DSN_STATION_ANTENNAS[stationType];
  const zenithBase = band === 'ka-band' ? profile.zenithTopKabandK : profile.zenithTopXbandK;

  // Clamp elevation angle to valid operational limits (min 5.0°)
  const elDeg = Math.max(5.0, Math.min(90.0, earthElevationDeg));
  const elRad = (elDeg * Math.PI) / 180;
  const sinEl = Math.sin(elRad);

  // Atmospheric absorption contribution (higher at Ka-band ~12K vs X-band ~2.5K)
  const atmContribution = (band === 'ka-band' ? 12.0 : 2.5) / sinEl;

  // Ground spillover pickup contribution
  const spilloverContribution = 1.5 / Math.sqrt(sinEl);

  const totalTop = zenithBase + atmContribution + spilloverContribution;
  return Math.round(totalTop * 10) / 10;
}

/**
 * Calculates complete DSN downlink RF link budget and C/N0.
 */
export function calculateDsnLinkBudget810(input: DsnLinkBudgetInput): DsnLinkBudgetOutput {
  const {
    stationType,
    band,
    earthElevationDeg,
    transmitterPowerWatts,
    txAntennaGainDbi,
    diffractionLossDb,
    dataRateBps,
    earthDistanceKm,
  } = input;

  const frequencyHz = band === 'ka-band' ? 26.0e9 : 8.45e9;
  const wavelengthM = SPEED_OF_LIGHT_M_PER_S / frequencyHz;
  const distanceM = Math.max(1000, earthDistanceKm * 1000);

  // EIRP = P_tx (dBW) + G_tx (dBi) - LineLoss (1.0 dB)
  const pTxDbw = 10.0 * Math.log10(Math.max(0.1, transmitterPowerWatts));
  const eirpDbw = pTxDbw + txAntennaGainDbi - 1.0;

  // Free Space Path Loss (FSPL) = 20 * log10(4 * pi * d / lambda)
  const fsplDb = 20.0 * Math.log10((4.0 * Math.PI * distanceM) / wavelengthM);

  // DSN Ground Station Parameters
  const profile = DSN_STATION_ANTENNAS[stationType];
  const gRxDbi = band === 'ka-band' ? profile.gainKabandDbi : profile.gainXbandDbi;
  const topK = calculateDsnOperatingNoiseTemperature(stationType, band, earthElevationDeg);
  const gtDbK = gRxDbi - 10.0 * Math.log10(topK);

  // Carrier-to-Noise Density: C/N0 = EIRP - FSPL - L_diffraction + G/T - k
  const lossTerrain = Math.max(0.0, diffractionLossDb);
  const cN0 = eirpDbw - fsplDb - lossTerrain + gtDbK - BOLTZMANN_CONSTANT_DBW_PER_HZ_K;

  // Required Eb/N0 for QPSK Rate 1/2 LDPC FEC = 4.5 dB (+3.0 dB aerospace flight margin threshold)
  const reqEbN0Db = 4.5;
  const rateDbHz = 10.0 * Math.log10(Math.max(1000, dataRateBps));
  const marginDb = cN0 - reqEbN0Db - rateDbHz;

  return {
    eirpDbw: Math.round(eirpDbw * 10) / 10,
    freeSpacePathLossDb: Math.round(fsplDb * 10) / 10,
    operatingNoiseTempK: topK,
    groundAntennaGainDbi: gRxDbi,
    gainOverTemperatureGtDbK: Math.round(gtDbK * 10) / 10,
    carrierToNoiseRatioC_N0: Math.round(cN0 * 10) / 10,
    requiredEbN0Db: reqEbN0Db,
    linkMarginDb: Math.round(marginDb * 10) / 10,
    isLinkViable: marginDb >= 3.0,
  };
}
