import { z } from 'zod';

/**
 * Standard UI lifecycle status enum for API requests and UI state rendering.
 * Required for explicit 5-state UI rendering in Gate 2.
 */
export const apiStatusEnum = z.enum([
  'loading',
  'empty',
  'incomplete',
  'unsupported',
  'failed',
]);

export const ApiStatusEnum = apiStatusEnum;
export type ApiStatus = z.infer<typeof apiStatusEnum>;

/**
 * Standard six-state scientific result status enum as mandated by AGENTS.md § 8.
 */
export const evaluationStatusEnum = z.enum([
  'valid',
  'valid-with-limitations',
  'approximate',
  'incomplete',
  'unsupported',
  'failed',
]);

export const EvaluationStatusEnum = evaluationStatusEnum;
export type EvaluationStatus = z.infer<typeof evaluationStatusEnum>;

/**
 * Standard structured API error response schema.
 */
export const apiErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  status: apiStatusEnum,
  details: z.record(z.string(), z.unknown()).optional(),
  issues: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

export const ApiErrorResponseSchema = apiErrorResponseSchema;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type ApiErrorResponseDto = ApiErrorResponse;

/**
 * Canonical lunar coordinate schema strictly enforcing:
 * - latitude in [-90.0, -80.0] (South Polar region)
 * - longitude in [0.0, 360.0) East-positive (IAU/NASA standard)
 */
export const lunarCoordinateSchema = z.object({
  latitudeDeg: z
    .number()
    .min(-90.0, 'Latitude must be >= -90.0°')
    .max(-80.0, 'Latitude must be in the South Pole region (<= -80.0°)'),
  longitudeDeg: z
    .number()
    .min(0.0, 'Longitude must be >= 0.0°')
    .lt(360.0, 'Longitude must be < 360.0° (East-positive [0, 360))'),
  elevationMeters: z.number().optional(),
  convention: z.string().optional(),
});

export const LunarCoordinateSchema = lunarCoordinateSchema;
export type LunarCoordinate = z.infer<typeof lunarCoordinateSchema>;

