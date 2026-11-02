import { z } from 'zod';

export const frequencyBandKeyEnum = z.enum([
  'sBandUplink',
  'sBandDownlink',
  'xBandUplink',
  'xBandDownlink',
  'kaBandDownlink',
]);

export const frequencyBandKeySchema = frequencyBandKeyEnum;
export type FrequencyBandKey = z.infer<typeof frequencyBandKeySchema>;

export interface FrequencyBandConfig {
  name: string;
  frequencyGhz: number;
  direction: 'uplink' | 'downlink';
  requiredEbN0Db: number;
  landerAntennaGainDbi: number;
  dsnAntennaGainDbi: number;
}

export const FREQUENCY_BANDS: Record<FrequencyBandKey, FrequencyBandConfig> = {
  sBandUplink: {
    name: 'S-Band Uplink (2.1 GHz)',
    frequencyGhz: 2.1,
    direction: 'uplink',
    requiredEbN0Db: 4.0,
    landerAntennaGainDbi: 12.0,
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
    landerAntennaGainDbi: 27.0,
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

export const telecomQuerySchema = z.object({
  siteId: z.string().min(1, 'siteId is required'),
  epochMs: z.number().finite('epochMs must be a finite number'),
  band: frequencyBandKeyEnum.default('xBandDownlink'),
  transmitterPowerWatts: z
    .number()
    .positive('transmitterPowerWatts must be > 0')
    .default(15),
  dataRateMbps: z.number().positive('dataRateMbps must be > 0').default(2.0),
});

export const TelecomQuerySchema = telecomQuerySchema;
export type TelecomQuery = z.infer<typeof telecomQuerySchema>;
export type TelecomQueryPayload = TelecomQuery;

export const linkStateEnum = z.enum(['nominal', 'marginal', 'loss_of_signal', 'locked']);
export type LinkState = z.infer<typeof linkStateEnum>;

export interface LinkBudgetInput {
  earthDistanceKm: number;
  earthElevationDeg: number;
  isTerrainObstructed: boolean;
  band: FrequencyBandKey;
  transmitterPowerWatts: number;
  dataRateMbps: number;
}

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

export const rfLinkBudgetSchema = z.object({
  linkState: linkStateEnum,
  frequencyGhz: z.number(),
  fsplDb: z.number(),
  eirpDbw: z.number(),
  receivedPowerDbm: z.number().nullable().or(z.number()),
  carrierToNoiseDensityDbHz: z.number().nullable().or(z.number()),
  ebN0Db: z.number().nullable().or(z.number()),
  requiredEbN0Db: z.number(),
  linkMarginDb: z.number().nullable().or(z.number()),
  multipathWarning: z.boolean(),
  dataRateMbps: z.number(),
});

export type RfLinkBudget = z.infer<typeof rfLinkBudgetSchema>;

export * from './dsnComplexes';
import { dsnComplexSchema, type DsnComplex } from './dsnComplexes';

export const dsnStationVisibilitySchema = z.object({
  stationId: z.enum(['goldstone', 'madrid', 'canberra']).optional(),
  name: z.string().optional(),
  country: z.string().optional(),
  station: dsnComplexSchema,
  isVisible: z.boolean(),
  elevationDeg: z.number(),
  azimuthDeg: z.number(),
  distanceKm: z.number().optional(),
  dishName: z.string().optional(),
});

export type DsnStationVisibility = {
  stationId?: 'goldstone' | 'madrid' | 'canberra';
  name?: string;
  country?: string;
  station: DsnComplex;
  isVisible: boolean;
  elevationDeg: number;
  azimuthDeg: number;
  distanceKm?: number;
  dishName?: string;
};

export const dsnTrackingSummarySchema = z.object({
  stations: z.array(dsnStationVisibilitySchema),
  activeStation: z
    .object({
      stationId: z.enum(['goldstone', 'madrid', 'canberra']).optional(),
      name: z.string().optional(),
      country: z.string().optional(),
      station: dsnComplexSchema,
      elevationDeg: z.number(),
      azimuthDeg: z.number(),
      dishName: z.string().optional(),
    })
    .nullable(),
});

export type DsnTrackingSummary = z.infer<typeof dsnTrackingSummarySchema>;

export const telecomLinkBudgetResponseSchema = z.object({
  siteId: z.string(),
  siteName: z.string(),
  epochMs: z.number(),
  earthElevationDeg: z.number().nullable(),
  earthDistanceKm: z.number(),
  linkBudget: rfLinkBudgetSchema,
  dsnTracking: dsnTrackingSummarySchema,
  source: z.string().optional(),
});

export const LinkBudgetSchema = telecomLinkBudgetResponseSchema;
export const TelecomResponseSchema = telecomLinkBudgetResponseSchema;
export type TelecomLinkBudgetResponse = z.infer<typeof telecomLinkBudgetResponseSchema>;
export type LinkBudget = TelecomLinkBudgetResponse;

export const SPEED_OF_LIGHT_M_PER_S = 299792458;
export const NOMINAL_EARTH_DISTANCE_METERS = 384400000;
