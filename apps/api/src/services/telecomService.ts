import {
  calculateRfLinkBudget,
  calculateDsnStationVisibilities,
  determineActiveDsnStation,
  type FrequencyBandKey,
} from './telecom/linkBudget';
import { ephemerisService } from './ephemerisService';

export interface TelecomQueryInput {
  siteId: string;
  epochMs: number;
  band?: FrequencyBandKey;
  transmitterPowerWatts?: number;
  dataRateMbps?: number;
}

export class TelecomService {
  computeLinkBudget(input: TelecomQueryInput) {
    const conditions = ephemerisService.getConditions({
      siteId: input.siteId,
      epochMs: input.epochMs,
    });

    if (!conditions) return null;

    const band: FrequencyBandKey = input.band || 'xBandDownlink';
    const transmitterPowerWatts = input.transmitterPowerWatts ?? 15;
    const dataRateMbps = input.dataRateMbps ?? 2.0;

    const earthDistanceKm = conditions.earthDistanceKm;
    const earthElevationDeg = conditions.earthElevationDeg ?? -90;
    const isTerrainObstructed = earthElevationDeg <= 0;

    const linkBudget = calculateRfLinkBudget({
      earthDistanceKm,
      earthElevationDeg,
      isTerrainObstructed,
      band,
      transmitterPowerWatts,
      dataRateMbps,
    });

    const stations = calculateDsnStationVisibilities(input.epochMs);
    const activeStation = determineActiveDsnStation(stations);

    return {
      siteId: conditions.siteId,
      siteName: conditions.siteName,
      epochMs: input.epochMs,
      earthElevationDeg,
      earthDistanceKm,
      linkBudget,
      dsnTracking: {
        stations,
        activeStation,
      },
    };
  }
}

export const telecomService = new TelecomService();
