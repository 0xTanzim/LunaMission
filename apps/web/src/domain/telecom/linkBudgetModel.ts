import {
  FREQUENCY_BANDS,
  DSN_COMPLEXES,
  type FrequencyBandKey,
  type LinkBudgetInput,
  type RfLinkBudgetResult,
  type DsnStationVisibility,
  type DsnComplex,
} from '@luna/contracts';

export function calculateFreeSpacePathLoss(distanceKm: number, frequencyGhz: number): number {
  if (distanceKm <= 0 || frequencyGhz <= 0) return 0;
  return 20 * Math.log10(distanceKm) + 20 * Math.log10(frequencyGhz) + 92.45;
}

export function calculateRfLinkBudget(input: LinkBudgetInput): RfLinkBudgetResult {
  const bandConfig = FREQUENCY_BANDS[input.band] ?? FREQUENCY_BANDS.xBandDownlink;
  const fsplDb = calculateFreeSpacePathLoss(input.earthDistanceKm, bandConfig.frequencyGhz);

  if (input.earthElevationDeg <= 0 || input.isTerrainObstructed) {
    return {
      linkState: 'loss_of_signal',
      frequencyGhz: bandConfig.frequencyGhz,
      fsplDb: Math.round(fsplDb * 100) / 100,
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

  const ptDbw = 10 * Math.log10(Math.max(0.1, input.transmitterPowerWatts));
  const cableLossDb = 1.5;
  const eirpDbw = ptDbw + bandConfig.landerAntennaGainDbi - cableLossDb;

  const isGrazing = input.earthElevationDeg < 2.0;
  const multipathLossDb = isGrazing ? 2.5 : 0.0;
  const atmLossDb = 0.3;

  const prxDbw = eirpDbw - fsplDb + bandConfig.dsnAntennaGainDbi - multipathLossDb - atmLossDb;
  const receivedPowerDbm = prxDbw + 30.0;

  const tSysK = input.band === 'kaBandDownlink' ? 35.0 : 25.0;
  const noiseSpectralDensityDbwHz = -228.6 + 10 * Math.log10(tSysK);
  const carrierToNoiseDensityDbHz = prxDbw - noiseSpectralDensityDbwHz;

  const dataRateBps = Math.max(1000, input.dataRateMbps * 1e6);
  const dataRateDbHz = 10 * Math.log10(dataRateBps);
  const ebN0Db = carrierToNoiseDensityDbHz - dataRateDbHz;
  const linkMarginDb = ebN0Db - bandConfig.requiredEbN0Db;

  return {
    linkState: linkMarginDb >= 3.0 ? 'locked' : linkMarginDb >= 0.0 ? 'marginal' : 'loss_of_signal',
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

export function calculateDsnStationVisibilities(epochMs: number): DsnStationVisibility[] {
  const jd = epochMs / 86400000 + 2440587.5;
  const d = jd - 2451545.0;
  const gmstHours = (18.697374558 + 24.06570982441908 * d) % 24;
  const gmstDeg = (gmstHours * 15) % 360;

  return DSN_COMPLEXES.map((complex) => {
    let localHourAngleDeg = (gmstDeg + complex.longitudeDeg) % 360;
    if (localHourAngleDeg > 180) localHourAngleDeg -= 360;
    if (localHourAngleDeg < -180) localHourAngleDeg += 360;

    const latRad = (complex.latitudeDeg * Math.PI) / 180;
    const haRad = (localHourAngleDeg * Math.PI) / 180;
    const decRad = (5.14 * Math.PI) / 180;

    const sinEl = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const elevDeg = (Math.asin(Math.max(-1, Math.min(1, sinEl))) * 180) / Math.PI;

    return {
      stationId: complex.id,
      name: complex.name,
      country: complex.country,
      station: complex,
      isVisible: elevDeg >= 10.0,
      elevationDeg: Math.round(elevDeg * 10) / 10,
      azimuthDeg: 180.0,
      distanceKm: 384400,
      dishName: complex.primary70mDish,
    };
  });
}

export function determineActiveDsnStation(
  stations: DsnStationVisibility[],
): DsnStationVisibility | null {
  const visible = stations.filter((s) => s.isVisible);
  if (visible.length === 0) return null;
  return visible.reduce((best, curr) => (curr.elevationDeg > best.elevationDeg ? curr : best));
}
