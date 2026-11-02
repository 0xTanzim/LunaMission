/**
 * Telemetry & NASA DSN Data Schemas and Types
 */

import { z } from 'zod';

export const dsnSignalSchema = z.object({
  active: z.boolean(),
  signalType: z.string(),
  dataRateBps: z.number(),
  frequencyHz: z.number(),
  band: z.string(),
  powerDbmOrKw: z.number(),
  spacecraft: z.string(),
  spacecraftId: z.string(),
});

export type DsnSignal = z.infer<typeof dsnSignalSchema>;

export const dsnTargetSchema = z.object({
  name: z.string(),
  id: z.string(),
  uplegRangeKm: z.number(),
  downlegRangeKm: z.number(),
  roundTripLightTimeSec: z.number(),
});

export type DsnTarget = z.infer<typeof dsnTargetSchema>;

export const dsnDishSchema = z.object({
  dishName: z.string(),
  azimuthDeg: z.number(),
  elevationDeg: z.number(),
  windSpeedKmh: z.number().nullable(),
  isMspa: z.boolean(),
  isArray: z.boolean(),
  isDdor: z.boolean(),
  activity: z.string(),
  upSignals: z.array(dsnSignalSchema),
  downSignals: z.array(dsnSignalSchema),
  targets: z.array(dsnTargetSchema),
});

export type DsnDish = z.infer<typeof dsnDishSchema>;

export const dsnTopocentricCoordsSchema = z.object({
  elevationDeg: z.number(),
  azimuthDeg: z.number(),
  isVisible: z.boolean(),
  horizonMaskDeg: z.number().default(10.0),
});

export const topocentricVectorSchema = dsnTopocentricCoordsSchema;

export type DsnTopocentricCoords = z.infer<typeof dsnTopocentricCoordsSchema>;
export type TopocentricVector = DsnTopocentricCoords;

export const dsnStationSchema = z.object({
  id: z.enum(['gdscc', 'mdscc', 'cdscc']),
  friendlyName: z.string(),
  timeUtcMs: z.number(),
  timeZoneOffsetMs: z.number(),
  dishes: z.array(dsnDishSchema),
  topocentric: dsnTopocentricCoordsSchema,
});

export type DsnStation = z.infer<typeof dsnStationSchema>;

export const lunarTrackingSummarySchema = z.object({
  activeLunarDishes: z.number(),
  trackedSpacecraft: z.array(z.string()),
  primaryTrackingDish: z.string().nullable(),
  downlinkBand: z.string(),
  linkMarginDb: z.number(),
  linkState: z.enum(['locked', 'marginal', 'loss_of_signal']),
});

export type LunarTrackingSummary = z.infer<typeof lunarTrackingSummarySchema>;

export const dsnTelemetryResponseSchema = z.object({
  status: z.enum(['live_feed', 'cached_valid', 'offline_fallback']),
  timestampIso: z.string(),
  feedTimestampMs: z.number(),
  latencyMs: z.number(),
  stations: z.array(dsnStationSchema),
  activeStationId: z.enum(['gdscc', 'mdscc', 'cdscc']).nullable(),
  lunarTrackingSummary: lunarTrackingSummarySchema,
  provenance: z.object({
    source: z.string(),
    endpoint: z.string(),
    cached: z.boolean(),
    cacheTtlSeconds: z.number(),
  }),
});

export type DsnTelemetryResponse = z.infer<typeof dsnTelemetryResponseSchema>;
