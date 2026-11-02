import { z } from 'zod';

export const windowFeasibilityVerdictEnum = z.enum([
  'optimal',
  'acceptable',
  'constrained',
]);

export const windowFeasibilityVerdictSchema = windowFeasibilityVerdictEnum;
export type WindowFeasibilityVerdict = z.infer<typeof windowFeasibilityVerdictSchema>;

export const rankedLandingWindowSchema = z.object({
  rank: z.number().int(),
  startDateIso: z.string(),
  endDateIso: z.string(),
  startEpochMs: z.number(),
  endEpochMs: z.number(),
  durationDays: z.number(),
  sunlightPercentage: z.number(),
  continuousSunlightHours: z.number(),
  maxShadowHours: z.number(),
  dteAvailabilityPercentage: z.number(),
  minEarthElevationDeg: z.number(),
  paretoScore: z.number(),
  feasibilityVerdict: windowFeasibilityVerdictSchema,
});

export type RankedLandingWindow = z.infer<typeof rankedLandingWindowSchema>;

export const MAX_WINDOW_SEARCH_SPAN_MS = 365 * 86400 * 1000;

export const windowQuerySchema = z
  .object({
    siteId: z.string().min(1),
    startEpochMs: z.number().int(),
    endEpochMs: z.number().int(),
    stayDurationDays: z.number().int().min(3).max(60).optional(),
    minSunlightPct: z.number().min(0).max(100).optional(),
    maxContinuousShadowHours: z.number().min(0).max(1000).optional(),
    minEarthElevationDeg: z.number().min(-90).max(90).optional(),
    topN: z.number().int().min(1).max(20).optional(),
    numWindows: z.number().int().min(1).max(100).optional(),
  })
  .refine(
    (data) => data.endEpochMs >= data.startEpochMs,
    {
      message: 'endEpochMs must be greater than or equal to startEpochMs',
      path: ['endEpochMs'],
    }
  )
  .refine(
    (data) => data.endEpochMs - data.startEpochMs <= MAX_WINDOW_SEARCH_SPAN_MS,
    {
      message: 'Search span cannot exceed 365 days (31,536,000,000 ms) to prevent event-loop DoS starvation',
      path: ['endEpochMs'],
    }
  );

export const paretoWindowRequestSchema = windowQuerySchema;
export const WindowOptimizationSchema = windowQuerySchema;
export const ParetoWindowRequestSchema = windowQuerySchema;

export type WindowQuery = z.infer<typeof windowQuerySchema>;
export type ParetoWindowRequest = WindowQuery;
export type ParetoWindowInput = WindowQuery;
export type WindowOptimizationRequest = WindowQuery;

export const paretoOptimizationResultSchema = z.object({
  siteId: z.string(),
  siteName: z.string(),
  totalWindowsEvaluated: z.number(),
  topWindows: z.array(rankedLandingWindowSchema),
  searchRange: z.object({
    startIso: z.string(),
    endIso: z.string(),
  }),
  source: z.string().optional(),
});

export const WindowOptimizationResponseSchema = paretoOptimizationResultSchema;
export const ParetoOptimizationResponseSchema = paretoOptimizationResultSchema;

export type ParetoOptimizationResult = z.infer<typeof paretoOptimizationResultSchema>;
export type WindowOptimizationResponse = ParetoOptimizationResult;
