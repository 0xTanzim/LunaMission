/**
 * RFC 7807 Error Code Classification & UI Narrative Mapper
 * Governed by docs/phase-3/API_CONTRACT.md § 5 and FRONTEND_ARCHITECTURE.md § 3.3.
 */

export interface ClassifiedApiError {
  code: string;
  title: string;
  detail: string;
  guidance: string;
  field?: string;
  isRetryable: boolean;
}

export function classifyApiError(rawError: unknown): ClassifiedApiError {
  if (typeof rawError === 'object' && rawError !== null && 'code' in rawError) {
    const err = rawError as { code: string; title?: string; detail?: string; invalidParams?: { name?: string }[] };
    const code = err.code;
    const title = err.title ?? 'Flight Operations Error';
    const detail = err.detail ?? 'An operational error occurred while evaluating lunar geometry.';
    const field = err.invalidParams?.[0]?.name;

    switch (code) {
      case 'E_SITE_NOT_FOUND':
        return {
          code,
          title: 'Candidate Site Not Found',
          detail,
          guidance: 'The requested landing site is not present in the curated registry. Select a valid candidate from the 5-tier catalog.',
          field,
          isRetryable: false,
        };
      case 'E_INVALID_DATE_RANGE':
        return {
          code,
          title: 'Invalid Mission Interval',
          detail,
          guidance: 'Ensure stop date is strictly greater than start date. Review timeline parameters in the cockpit header.',
          field: field ?? 'stopUtc',
          isRetryable: false,
        };
      case 'E_WINDOW_EXCEEDS_MAX':
        return {
          code,
          title: 'Scenario Window Exceeds Limit',
          detail,
          guidance: 'Scenario duration cannot exceed 28 days (672 hours) for high-resolution topocentric ephemeris evaluation.',
          field: field ?? 'stopUtc',
          isRetryable: false,
        };
      case 'E_UNSUPPORTED_MAST_HEIGHT':
        return {
          code,
          title: 'Uncalibrated Mast Height',
          detail,
          guidance: 'Observer height must match a precomputed LOLA DEM horizon anchor (1.0m, 2.0m, 5.0m, or 10.0m).',
          field: field ?? 'observerMastHeightM',
          isRetryable: false,
        };
      case 'E_INSUFFICIENT_SITES':
        return {
          code,
          title: 'Insufficient Comparison Sites',
          detail,
          guidance: 'Multi-site comparative trade-off evaluation requires at least 2 candidate landing sites.',
          field: field ?? 'siteIds',
          isRetryable: false,
        };
      case 'E_TERRAIN_TRUNCATED':
        return {
          code,
          title: 'Terrain Boundary Truncation',
          detail,
          guidance: 'Horizon ray exited 20m LOLA DEM bounds before reaching closed-form stopping distance. Results marked valid-with-limitations.',
          isRetryable: false,
        };
      default:
        return {
          code: code || 'E_UNKNOWN',
          title,
          detail,
          guidance: 'Inspect network connection and backend flight-deck service status.',
          field,
          isRetryable: true,
        };
    }
  }

  return {
    code: 'E_NETWORK_OFFLINE',
    title: 'Service Connectivity Offline',
    detail: rawError instanceof Error ? rawError.message : 'Failed to communicate with LunaMission flight-deck API.',
    guidance: 'Verify that the local backend service (apps/api) is running and reachable.',
    isRetryable: true,
  };
}
