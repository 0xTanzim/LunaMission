/**
 * Horizon profile API schemas (task 4.1).
 *
 * POST /api/v1/horizons serves the offline-derived curated horizon asset with
 * additive per-bin blocker metadata. No compute-on-demand path: every value is
 * read from data/curated-horizons.json produced by the offline LOLA ray-marcher.
 */

import { z } from 'zod';
import { evaluationStatusEnum } from '@luna/contracts';

/** Mast heights must sit inside the curated 1–10 m bracket (1/2/5/10 m profiles). */
export const horizonProfileQuerySchema = z.object({
  siteId: z.string().min(1),
  mastHeightMeters: z.number().min(1.0, 'Mast height below the curated 1 m bracket').max(10.0, 'Mast height above the curated 10 m bracket').default(2.0),
});

export const horizonBlockerSchema = z.object({
  /** Bin center azimuth in degrees [0, 360). */
  azimuthDeg: z.number(),
  /** Inclusive-exclusive sector covered by this bin: [start, end). */
  azimuthSectorDeg: z.tuple([z.number(), z.number()]),
  /** Terrain mask elevation (nominal) in degrees from the local tangent plane. */
  maskElevationDeg: z.number(),
  /** Great-circle surface distance from the observer to the blocking terrain sample. */
  ridgeDistanceKm: z.number(),
  /** Elevation of the blocking terrain sample relative to the 1737.4 km reference sphere. */
  blockerElevationMeters: z.number(),
  binStatus: z.enum(['valid', 'incomplete_range_truncated', 'nodata']),
});

export const horizonProfileResponseSchema = z.object({
  siteId: z.string(),
  mastHeightMeters: z.number(),
  azimuthBinsCount: z.number().int(),
  stepDeg: z.number(),
  bins: z.array(horizonBlockerSchema),
  provenance: z.object({
    dataset: z.string(),
    z0ObserverMeters: z.number(),
    rMaxMeters: z.number(),
    note: z.string().optional(),
  }),
  status: evaluationStatusEnum,
});

export type HorizonProfileQueryInput = z.infer<typeof horizonProfileQuerySchema>;
export type HorizonProfileResponse = z.infer<typeof horizonProfileResponseSchema>;
export type HorizonBlocker = z.infer<typeof horizonBlockerSchema>;
